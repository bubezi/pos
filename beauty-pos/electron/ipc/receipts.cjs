const { ipcMain, BrowserWindow, dialog } = require("electron");
const fs = require("fs");
const db = require("../db.cjs");

function getReceiptData(saleId) {
  const saleStmt = db.prepare(`
    SELECT id, receipt_number, subtotal, discount, total, amount_paid, change_due,
           payment_method, cashier_name, notes, created_at
    FROM sales
    WHERE id = ?
  `);

  const itemsStmt = db.prepare(`
    SELECT product_id, product_name_snapshot, unit_price, quantity, line_total
    FROM sale_items
    WHERE sale_id = ?
    ORDER BY id ASC
  `);

  const receiptStmt = db.prepare(`
    SELECT sale_id, printed_at, print_count
    FROM receipts
    WHERE sale_id = ?
  `);

  return {
    sale: saleStmt.get(saleId) || null,
    items: itemsStmt.all(saleId),
    receipt: receiptStmt.get(saleId) || null,
  };
}

function markPrintedInternal(saleId) {
  const stmt = db.prepare(`
    UPDATE receipts
    SET printed_at = CURRENT_TIMESTAMP,
        print_count = print_count + 1
    WHERE sale_id = ?
  `);

  stmt.run(saleId);
}

function formatMoney(value) {
  return Number(value || 0).toFixed(2);
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function buildReceiptHtml(data) {
  const { sale, items } = data;

  if (!sale) {
    throw new Error("Sale not found.");
  }

  const itemsHtml = items
    .map(
      (item) => `
        <div class="item">
          <div class="item-name">${escapeHtml(item.product_name_snapshot)}</div>
          <div class="item-meta">
            <span>${item.quantity} × KES ${formatMoney(item.unit_price)}</span>
            <strong>KES ${formatMoney(item.line_total)}</strong>
          </div>
        </div>
      `,
    )
    .join("");

  return `
    <!doctype html>
    <html>
      <head>
        <meta charset="UTF-8" />
        <title>Receipt ${escapeHtml(sale.receipt_number)}</title>
        <style>
          * { box-sizing: border-box; }
          html, body {
            margin: 0;
            padding: 0;
            background: #ffffff;
            color: #000000;
            font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
          }
          body {
            width: 320px;
            margin: 0 auto;
            padding: 16px;
          }
          .center { text-align: center; }
          .store-name {
            font-size: 20px;
            font-weight: 700;
            margin-bottom: 4px;
          }
          .subtitle {
            font-size: 12px;
            color: #333;
          }
          hr {
            border: none;
            border-top: 1px dashed #000;
            margin: 12px 0;
          }
          .row {
            display: flex;
            justify-content: space-between;
            gap: 10px;
            margin: 6px 0;
            font-size: 13px;
          }
          .item {
            margin: 10px 0;
          }
          .item-name {
            font-weight: 700;
            margin-bottom: 4px;
            word-break: break-word;
          }
          .item-meta {
            display: flex;
            justify-content: space-between;
            gap: 10px;
            font-size: 12px;
          }
          .footer {
            margin-top: 16px;
            text-align: center;
            font-size: 12px;
          }
          @media print {
            html, body {
              width: auto;
            }
            body {
              padding: 8px;
            }
          }
        </style>
      </head>
      <body>
        <div class="center">
          <div class="store-name">WigsnStyle</div>
          <div class="subtitle">Point of Sale Receipt</div>
        </div>

        <hr />

        <div class="row"><span>Receipt</span><strong>${escapeHtml(sale.receipt_number)}</strong></div>
        <div class="row"><span>Date</span><span>${escapeHtml(sale.created_at)}</span></div>
        <div class="row"><span>Cashier</span><span>${escapeHtml(sale.cashier_name || "N/A")}</span></div>
        <div class="row"><span>Payment</span><span>${escapeHtml(sale.payment_method)}</span></div>

        <hr />

        ${itemsHtml}

        <hr />

        <div class="row"><span>Subtotal</span><span>KES ${formatMoney(sale.subtotal)}</span></div>
        <div class="row"><span>Discount</span><span>KES ${formatMoney(sale.discount)}</span></div>
        <div class="row"><span>Total</span><strong>KES ${formatMoney(sale.total)}</strong></div>
        <div class="row"><span>Paid</span><span>KES ${formatMoney(sale.amount_paid)}</span></div>
        <div class="row"><span>Change</span><span>KES ${formatMoney(sale.change_due)}</span></div>

        ${
          sale.notes
            ? `<hr /><div style="font-size: 12px;">Notes: ${escapeHtml(sale.notes)}</div>`
            : ""
        }

        <div class="footer">Thank you for your purchase</div>
      </body>
    </html>
  `;
}

async function createReceiptWindow(saleId, { show = true } = {}) {
  const data = getReceiptData(saleId);

  if (!data.sale) {
    throw new Error("Sale not found.");
  }

  const receiptHtml = buildReceiptHtml(data);

  const win = new BrowserWindow({
    width: 420,
    height: 720,
    autoHideMenuBar: true,
    show,
    webPreferences: {
      sandbox: false,
    },
  });

  await win.loadURL(
    `data:text/html;charset=utf-8,${encodeURIComponent(receiptHtml)}`,
  );

  return { win, data };
}

function registerReceiptHandlers() {
  ipcMain.handle("receipts:getBySaleId", (_, saleId) => {
    return getReceiptData(saleId);
  });

  ipcMain.handle("receipts:markPrinted", (_, saleId) => {
    markPrintedInternal(saleId);
    return { success: true };
  });

  ipcMain.handle("receipts:preview", async (_, saleId) => {
    await createReceiptWindow(saleId, { show: true });
    return { success: true };
  });

  ipcMain.handle("receipts:print", async (_, saleId) => {
    const { win } = await createReceiptWindow(saleId, { show: true });

    win.webContents.once("did-finish-load", () => {
      win.webContents.print(
        {
          silent: false,
          printBackground: true,
        },
        (success, errorType) => {
          if (success) {
            markPrintedInternal(saleId);
          } else {
            console.error("Receipt printing failed:", errorType);
          }
        },
      );
    });

    return { success: true };
  });

  ipcMain.handle("receipts:savePdf", async (_, saleId) => {
    const { win, data } = await createReceiptWindow(saleId, { show: false });

    try {
      const defaultName = `${data.sale.receipt_number}.pdf`;

      const saveResult = await dialog.showSaveDialog(win, {
        title: "Save Receipt as PDF",
        defaultPath: defaultName,
        filters: [{ name: "PDF Files", extensions: ["pdf"] }],
      });

      if (saveResult.canceled || !saveResult.filePath) {
        if (!win.isDestroyed()) win.close();
        return { success: false };
      }

      const pdfBuffer = await win.webContents.printToPDF({
        printBackground: true,
        preferCSSPageSize: true,
      });

      fs.writeFileSync(saveResult.filePath, pdfBuffer);

      if (!win.isDestroyed()) win.close();

      return {
        success: true,
        filePath: saveResult.filePath,
      };
    } catch (error) {
      if (!win.isDestroyed()) win.close();
      throw error;
    }
  });
}

module.exports = { registerReceiptHandlers };
