const { ipcMain } = require('electron');
const db = require('../db.cjs');

function registerProductHandlers() {
  ipcMain.handle('products:list', () => {
    const stmt = db.prepare(`
      SELECT id, sku, name, category, price, stock_qty, reorder_level, is_active
      FROM products
      WHERE is_active = 1
      ORDER BY name ASC
    `);
    return stmt.all();
  });

  ipcMain.handle('products:create', (_, product) => {
    const stmt = db.prepare(`
      INSERT INTO products (sku, name, category, price, stock_qty, reorder_level)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      product.sku || null,
      product.name,
      product.category || null,
      product.price,
      product.stock_qty ?? 0,
      product.reorder_level ?? 0
    );

    return { success: true, id: result.lastInsertRowid };
  });

  ipcMain.handle('products:updateStock', (_, { productId, stockQty }) => {
    const stmt = db.prepare(`
      UPDATE products
      SET stock_qty = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);

    stmt.run(stockQty, productId);
    return { success: true };
  });
}

module.exports = { registerProductHandlers };
