const { ipcMain } = require("electron");
const db = require("../db.cjs");

function normalizeSku(value) {
  return String(value || "").trim();
}

function normalizeSearch(value) {
  return String(value || "").trim();
}

function sanitizeText(value) {
  const text = String(value || "").trim();
  return text || null;
}

function toNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
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

  ipcMain.handle("products:getAll", () => {
    const stmt = db.prepare(`
      SELECT id, sku, name, category, price, stock_qty, reorder_level, is_active
      FROM products
      ORDER BY is_active DESC, name ASC
    `);
    return stmt.all();
  });

  ipcMain.handle("products:getById", (_, productId) => {
    const stmt = db.prepare(`
      SELECT id, sku, name, category, price, stock_qty, reorder_level, is_active
      FROM products
      WHERE id = ?
      LIMIT 1
    `);
    return stmt.get(productId) || null;
  });

  ipcMain.handle("products:create", (_, product) => {
    const sku = normalizeSku(product.sku) || null;
    const name = String(product.name || "").trim();

    if (!name) {
      throw new Error("Product name is required.");
    }

    const stmt = db.prepare(`
      INSERT INTO products (sku, name, category, price, stock_qty, reorder_level)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      sku,
      name,
      sanitizeText(product.category),
      toNumber(product.price, 0),
      toNumber(product.stock_qty, 0),
      toNumber(product.reorder_level, 0),
    );

    return { success: true, id: result.lastInsertRowid };
  });

  ipcMain.handle("products:update", (_, product) => {
    const id = Number(product.id);
    const sku = normalizeSku(product.sku) || null;
    const name = String(product.name || "").trim();

    if (!id) {
      throw new Error("Product ID is required.");
    }

    if (!name) {
      throw new Error("Product name is required.");
    }

    const stmt = db.prepare(`
      UPDATE products
      SET
        sku = ?,
        name = ?,
        category = ?,
        price = ?,
        stock_qty = ?,
        reorder_level = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);

    stmt.run(
      sku,
      name,
      sanitizeText(product.category),
      toNumber(product.price, 0),
      toNumber(product.stock_qty, 0),
      toNumber(product.reorder_level, 0),
      id,
    );

    return { success: true };
  });

  ipcMain.handle("products:deactivate", (_, productId) => {
    const stmt = db.prepare(`
      UPDATE products
      SET is_active = 0,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);

    stmt.run(productId);
    return { success: true };
  });
  ipcMain.handle("products:activate", (_, productId) => {
    const stmt = db.prepare(`
      UPDATE products
      SET is_active = 1,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);

    stmt.run(productId);
    return { success: true };
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
