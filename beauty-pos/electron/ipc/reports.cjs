const { ipcMain, dialog, BrowserWindow } = require("electron");
const { requireAuth } = require("./auth.cjs");
const db = require("../db.cjs");
const fs = require("fs");

function normalizeText(value) {
  return String(value || "").trim();
}

function normalizeDateStart(value) {
  const v = normalizeText(value);
  return v ? `${v} 00:00:00` : null;
}

function normalizeDateEnd(value) {
  const v = normalizeText(value);
  return v ? `${v} 23:59:59` : null;
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

function getLowStockRows() {
  return db
    .prepare(
      `
    SELECT
      id,
      sku,
      name,
      category,
      price,
      stock_qty,
      reorder_level,
      is_active,
      updated_at
    FROM products
    WHERE is_active = 1
      AND stock_qty > 0
      AND stock_qty <= reorder_level
    ORDER BY stock_qty ASC, name ASC
  `,
    )
    .all();
}

function getZeroStockRows() {
  return db
    .prepare(
      `
    SELECT
      id,
      sku,
      name,
      category,
      price,
      stock_qty,
      reorder_level,
      is_active,
      updated_at
    FROM products
    WHERE is_active = 1
      AND stock_qty = 0
    ORDER BY name ASC
  `,
    )
    .all();
}

function getStockListRows() {
  return db
    .prepare(
      `
    SELECT
      id,
      sku,
      name,
      category,
      price,
      stock_qty,
      reorder_level,
      is_active,
      updated_at
    FROM products
    ORDER BY is_active DESC, name ASC
  `,
    )
    .all();
}

function getSalesReportData(payload = {}) {
  const dateFrom = normalizeDateStart(payload.dateFrom);
  const dateTo = normalizeDateEnd(payload.dateTo);
  const cashier = normalizeText(payload.cashier);

  const where = [];
  const params = [];

  if (dateFrom) {
    where.push("s.created_at >= ?");
    params.push(dateFrom);
  }

  if (dateTo) {
    where.push("s.created_at <= ?");
    params.push(dateTo);
  }

  if (cashier) {
    where.push("LOWER(COALESCE(s.cashier_name, '')) LIKE ?");
    params.push(`%${cashier.toLowerCase()}%`);
  }

  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

  const rows = db
    .prepare(
      `
    SELECT
      s.id,
      s.receipt_number,
      s.subtotal,
      s.discount,
      s.total,
      s.amount_paid,
      s.change_due,
      s.payment_method,
      s.cashier_name,
      s.notes,
      s.created_at
    FROM sales s
    ${whereSql}
    ORDER BY s.created_at DESC, s.id DESC
  `,
    )
    .all(...params);

  const summary = db
    .prepare(
      `
    SELECT
      COUNT(*) AS total_sales,
      COALESCE(SUM(s.subtotal), 0) AS subtotal_sum,
      COALESCE(SUM(s.discount), 0) AS discount_sum,
      COALESCE(SUM(s.total), 0) AS total_sum
    FROM sales s
    ${whereSql}
  `,
    )
    .get(...params);

  return { rows, summary };
}

function buildProductRowsHtml(rows) {
  if (!rows.length) {
    return `<tr><td colspan="7">No records found.</td></tr>`;
  }

  return rows
    .map(
      (item) => `
    <tr>
      <td>${escapeHtml(item.sku || "")}</td>
      <td>${escapeHtml(item.name)}</td>
      <td>${escapeHtml(item.category || "—")}</td>
      <td>KES ${formatMoney(item.buying_price)}</td>
      <td>${item.stock_qty}</td>
      <td>${item.reorder_level}</td>
      <td>${item.is_active ? "Active" : "Inactive"}</td>
    </tr>
  `,
    )
    .join("");
}

function buildSalesRowsHtml(rows) {
  if (!rows.length) {
    return `<tr><td colspan="7">No sales found.</td></tr>`;
  }

  return rows
    .map(
      (sale) => `
    <tr>
      <td>${escapeHtml(sale.receipt_number)}</td>
      <td>${escapeHtml(new Date(sale.created_at).toLocaleString())}</td>
      <td>${escapeHtml(sale.cashier_name || "—")}</td>
      <td>${escapeHtml(sale.payment_method)}</td>
      <td>KES ${formatMoney(sale.total)}</td>
      <td>KES ${formatMoney(sale.amount_paid)}</td>
      <td>KES ${formatMoney(sale.change_due)}</td>
    </tr>
  `,
    )
    .join("");
}

function buildReportsPdfHtml({ tab, dateFrom, dateTo, cashier }) {
  const generatedAt = new Date().toLocaleString();

  if (tab === "low-stock") {
    const rows = getLowStockRows();
    return {
      fileLabel: "Low-Stock-Report",
      html: `
        <!doctype html>
        <html>
          <head>
            <meta charset="UTF-8" />
            <title>Low Stock Report</title>
            <style>
              body {
                font-family: Arial, sans-serif;
                color: #111;
                padding: 24px;
                font-size: 12px;
              }
              h1 { margin: 0 0 8px; }
              .meta { margin-bottom: 16px; color: #555; }
              table {
                width: 100%;
                border-collapse: collapse;
              }
              th, td {
                border: 1px solid #ccc;
                padding: 8px;
                text-align: left;
              }
              th {
                background: #f3f3f3;
              }
            </style>
          </head>
          <body>
            <h1>Low Stock Report</h1>
            <div class="meta">Generated: ${escapeHtml(generatedAt)}</div>
            <table>
              <thead>
                <tr>
                  <th>SKU</th>
                  <th>Name</th>
                  <th>Category</th>
                  <th>Price</th>
                  <th>Stock</th>
                  <th>Reorder Level</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                ${buildProductRowsHtml(rows)}
              </tbody>
            </table>
          </body>
        </html>
      `,
    };
  }

  if (tab === "zero-stock") {
    const rows = getZeroStockRows();
    return {
      fileLabel: "Zero-Stock-Report",
      html: `
        <!doctype html>
        <html>
          <head>
            <meta charset="UTF-8" />
            <title>Zero Stock Report</title>
            <style>
              body {
                font-family: Arial, sans-serif;
                color: #111;
                padding: 24px;
                font-size: 12px;
              }
              h1 { margin: 0 0 8px; }
              .meta { margin-bottom: 16px; color: #555; }
              table {
                width: 100%;
                border-collapse: collapse;
              }
              th, td {
                border: 1px solid #ccc;
                padding: 8px;
                text-align: left;
              }
              th {
                background: #f3f3f3;
              }
            </style>
          </head>
          <body>
            <h1>Zero Stock Report</h1>
            <div class="meta">Generated: ${escapeHtml(generatedAt)}</div>
            <table>
              <thead>
                <tr>
                  <th>SKU</th>
                  <th>Name</th>
                  <th>Category</th>
                  <th>Price</th>
                  <th>Stock</th>
                  <th>Reorder Level</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                ${buildProductRowsHtml(rows)}
              </tbody>
            </table>
          </body>
        </html>
      `,
    };
  }

  if (tab === "stock-list") {
    const rows = getStockListRows();
    return {
      fileLabel: "Stock-List-Report",
      html: `
        <!doctype html>
        <html>
          <head>
            <meta charset="UTF-8" />
            <title>Stock List</title>
            <style>
              body {
                font-family: Arial, sans-serif;
                color: #111;
                padding: 24px;
                font-size: 12px;
              }
              h1 { margin: 0 0 8px; }
              .meta { margin-bottom: 16px; color: #555; }
              table {
                width: 100%;
                border-collapse: collapse;
              }
              th, td {
                border: 1px solid #ccc;
                padding: 8px;
                text-align: left;
              }
              th {
                background: #f3f3f3;
              }
            </style>
          </head>
          <body>
            <h1>Stock List</h1>
            <div class="meta">Generated: ${escapeHtml(generatedAt)}</div>
            <table>
              <thead>
                <tr>
                  <th>SKU</th>
                  <th>Name</th>
                  <th>Category</th>
                  <th>Price</th>
                  <th>Stock</th>
                  <th>Reorder Level</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                ${buildProductRowsHtml(rows)}
              </tbody>
            </table>
          </body>
        </html>
      `,
    };
  }

  const { rows, summary } = getSalesReportData({ dateFrom, dateTo, cashier });

  return {
    fileLabel: "Sales-Report",
    html: `
      <!doctype html>
      <html>
        <head>
          <meta charset="UTF-8" />
          <title>Sales Report</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              color: #111;
              padding: 24px;
              font-size: 12px;
            }
            h1 { margin: 0 0 8px; }
            .meta { margin-bottom: 8px; color: #555; }
            .summary {
              display: grid;
              grid-template-columns: repeat(4, 1fr);
              gap: 10px;
              margin: 18px 0;
            }
            .card {
              border: 1px solid #ccc;
              padding: 10px;
            }
            .card strong {
              display: block;
              margin-top: 6px;
              font-size: 16px;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 16px;
            }
            th, td {
              border: 1px solid #ccc;
              padding: 8px;
              text-align: left;
            }
            th {
              background: #f3f3f3;
            }
          </style>
        </head>
        <body>
          <h1>Sales Report</h1>
          <div class="meta">Generated: ${escapeHtml(generatedAt)}</div>
          <div class="meta">Date From: ${escapeHtml(dateFrom || "Any")}</div>
          <div class="meta">Date To: ${escapeHtml(dateTo || "Any")}</div>
          <div class="meta">Cashier: ${escapeHtml(cashier || "All")}</div>

          <div class="summary">
            <div class="card">Total Sales<strong>${summary.total_sales}</strong></div>
            <div class="card">Subtotal Sum<strong>KES ${formatMoney(summary.subtotal_sum)}</strong></div>
            <div class="card">Discount Sum<strong>KES ${formatMoney(summary.discount_sum)}</strong></div>
            <div class="card">Total Sum<strong>KES ${formatMoney(summary.total_sum)}</strong></div>
          </div>

          <table>
            <thead>
              <tr>
                <th>Receipt</th>
                <th>Date</th>
                <th>Cashier</th>
                <th>Payment</th>
                <th>Total</th>
                <th>Paid</th>
                <th>Change</th>
              </tr>
            </thead>
            <tbody>
              ${buildSalesRowsHtml(rows)}
            </tbody>
          </table>
        </body>
      </html>
    `,
  };
}

function registerReportHandlers() {
  ipcMain.handle("reports:low-stock", () => {
    requireAuth();
    return getLowStockRows();
  });

  ipcMain.handle("reports:zero-stock", () => {
    requireAuth();
    return getZeroStockRows();
  });

  ipcMain.handle("reports:stock-list", () => {
    requireAuth();
    return getStockListRows();
  });

  ipcMain.handle("reports:sales", (_, payload) => {
    requireAuth();
    return getSalesReportData(payload || {});
  });

  ipcMain.handle("reports:sales-filters", () => {
    requireAuth();

    const cashiers = db
      .prepare(
        `
      SELECT DISTINCT cashier_name
      FROM sales
      WHERE cashier_name IS NOT NULL
        AND TRIM(cashier_name) != ''
      ORDER BY cashier_name ASC
    `,
      )
      .all()
      .map((row) => row.cashier_name);

    return { cashiers };
  });

  ipcMain.handle("reports:savePdf", async (_, payload) => {
    requireAuth();

    const { html, fileLabel } = buildReportsPdfHtml(payload || {});
    const parentWindow = BrowserWindow.getFocusedWindow();

    const win = new BrowserWindow({
      width: 1000,
      height: 800,
      show: false,
      autoHideMenuBar: true,
      webPreferences: {
        sandbox: false,
      },
    });

    try {
      await win.loadURL(
        `data:text/html;charset=utf-8,${encodeURIComponent(html)}`,
      );

      const saveResult = await dialog.showSaveDialog(parentWindow || win, {
        title: "Save Report as PDF",
        defaultPath: `${fileLabel}.pdf`,
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

module.exports = { registerReportHandlers };
