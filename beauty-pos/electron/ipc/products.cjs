const { ipcMain } = require("electron");
const db = require("../db.cjs");

function normalizeSku(value) {
  return String(value || "").trim();
}

function normalizeSearch(value) {
  return String(value || "").trim();
}

function registerProductHandlers() {
  ipcMain.handle("products:list", () => {
    const stmt = db.prepare(`
      SELECT id, sku, name, category, price, stock_qty, reorder_level, is_active
      FROM products
      WHERE is_active = 1
      ORDER BY name ASC
    `);
    return stmt.all();
  });

  ipcMain.handle("products:create", (_, product) => {
    const sku = normalizeSku(product.sku) || null;

    const stmt = db.prepare(`
      INSERT INTO products (sku, name, category, price, stock_qty, reorder_level)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      sku,
      product.name,
      product.category || null,
      product.price,
      product.stock_qty ?? 0,
      product.reorder_level ?? 0,
    );

    return { success: true, id: result.lastInsertRowid };
  });

  ipcMain.handle("products:updateStock", (_, { productId, stockQty }) => {
    const stmt = db.prepare(`
      UPDATE products
      SET stock_qty = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);

    stmt.run(stockQty, productId);
    return { success: true };
  });

  ipcMain.handle("products:findBySku", (_, rawSku) => {
    const sku = normalizeSku(rawSku);

    if (!sku) return null;

    const stmt = db.prepare(`
      SELECT id, sku, name, category, price, stock_qty, reorder_level, is_active
      FROM products
      WHERE is_active = 1
        AND TRIM(LOWER(sku)) = TRIM(LOWER(?))
      LIMIT 1
    `);

    return stmt.get(sku) || null;
  });

  ipcMain.handle("products:search", (_, rawTerm) => {
    const term = normalizeSearch(rawTerm);

    if (!term) return [];

    const likeTerm = `%${term.toLowerCase()}%`;

    const stmt = db.prepare(`
      SELECT id, sku, name, category, price, stock_qty, reorder_level, is_active
      FROM products
      WHERE is_active = 1
        AND (
          LOWER(COALESCE(name, '')) LIKE ?
          OR LOWER(COALESCE(sku, '')) LIKE ?
          OR LOWER(COALESCE(category, '')) LIKE ?
        )
      ORDER BY
        CASE
          WHEN LOWER(COALESCE(sku, '')) = LOWER(?) THEN 0
          WHEN LOWER(COALESCE(name, '')) = LOWER(?) THEN 1
          WHEN LOWER(COALESCE(sku, '')) LIKE LOWER(?) THEN 2
          WHEN LOWER(COALESCE(name, '')) LIKE LOWER(?) THEN 3
          ELSE 4
        END,
        name ASC
      LIMIT 8
    `);

    return stmt.all(
      likeTerm,
      likeTerm,
      likeTerm,
      term,
      term,
      `${term}%`,
      `${term}%`,
    );
  });
}

module.exports = { registerProductHandlers };
