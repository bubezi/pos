const { ipcMain } = require('electron');
const db = require('../db.cjs');

function generateReceiptNumber() {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const hh = String(now.getHours()).padStart(2, '0');
  const mi = String(now.getMinutes()).padStart(2, '0');
  const ss = String(now.getSeconds()).padStart(2, '0');
  return `R-${yyyy}${mm}${dd}-${hh}${mi}${ss}`;
}

function registerCheckoutHandlers() {
  ipcMain.handle('checkout:completeSale', (_, payload) => {
    const { items, paymentMethod, amountPaid, cashierName, discount = 0, notes = '' } = payload;

    if (!Array.isArray(items) || items.length === 0) {
      throw new Error('Cart is empty.');
    }

    const tx = db.transaction(() => {
      let subtotal = 0;

      const getProductStmt = db.prepare(`
        SELECT id, name, price, stock_qty
        FROM products
        WHERE id = ? AND is_active = 1
      `);

      for (const item of items) {
        const product = getProductStmt.get(item.productId);

        if (!product) {
          throw new Error(`Product not found: ${item.productId}`);
        }

        if (item.quantity <= 0) {
          throw new Error(`Invalid quantity for ${product.name}`);
        }

        if (product.stock_qty < item.quantity) {
          throw new Error(`Insufficient stock for ${product.name}`);
        }

        subtotal += Number(product.price) * Number(item.quantity);
      }

      const total = Math.max(0, subtotal - Number(discount));

      if (Number(amountPaid) < total) {
        throw new Error('Amount paid is less than total.');
      }

      const changeDue = Number(amountPaid) - total;
      const receiptNumber = generateReceiptNumber();

      const insertSaleStmt = db.prepare(`
        INSERT INTO sales (
          receipt_number, subtotal, discount, total, amount_paid, change_due,
          payment_method, cashier_name, notes
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      const saleResult = insertSaleStmt.run(
        receiptNumber,
        subtotal,
        discount,
        total,
        amountPaid,
        changeDue,
        paymentMethod,
        cashierName || null,
        notes || null
      );

      const saleId = saleResult.lastInsertRowid;

      const insertSaleItemStmt = db.prepare(`
        INSERT INTO sale_items (
          sale_id, product_id, product_name_snapshot, unit_price, quantity, line_total
        )
        VALUES (?, ?, ?, ?, ?, ?)
      `);

      const updateStockStmt = db.prepare(`
        UPDATE products
        SET stock_qty = stock_qty - ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `);

      for (const item of items) {
        const product = getProductStmt.get(item.productId);
        const lineTotal = Number(product.price) * Number(item.quantity);

        insertSaleItemStmt.run(
          saleId,
          product.id,
          product.name,
          product.price,
          item.quantity,
          lineTotal
        );

        updateStockStmt.run(item.quantity, product.id);
      }

      const insertReceiptStmt = db.prepare(`
        INSERT INTO receipts (sale_id, printed_at, print_count)
        VALUES (?, NULL, 0)
      `);

      insertReceiptStmt.run(saleId);

      return {
        success: true,
        saleId,
        receiptNumber,
        subtotal,
        discount,
        total,
        amountPaid: Number(amountPaid),
        changeDue,
      };
    });

    return tx();
  });
}

module.exports = { registerCheckoutHandlers };
