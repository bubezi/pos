const { ipcMain } = require("electron");
const { requireAuth, requireAdmin } = require("./auth.cjs");
const { writeAuditLog } = require("../audit.cjs");
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

function getProductById(productId) {
  return db
    .prepare(
      `
      SELECT id, sku, name, category, price, stock_qty, reorder_level, is_active
      FROM products
      WHERE id = ?
      LIMIT 1
    `,
    )
    .get(productId);
}

function registerProductHandlers() {
  ipcMain.handle("products:list", () => {
    requireAuth();
    return db
      .prepare(
        `
        SELECT id, sku, name, category, price, stock_qty, reorder_level, is_active
        FROM products
        WHERE is_active = 1
        ORDER BY name ASC
      `,
      )
      .all();
  });

  ipcMain.handle("products:getAll", () => {
    requireAuth();
    return db
      .prepare(
        `
        SELECT id, sku, name, category, price, stock_qty, reorder_level, is_active
        FROM products
        ORDER BY is_active DESC, name ASC
      `,
      )
      .all();
  });

  ipcMain.handle("products:getById", (_, productId) => {
    requireAuth();
    return getProductById(productId) || null;
  });

  ipcMain.handle("products:create", (_, product) => {
    const session = requireAdmin();

    const sku = normalizeSku(product.sku) || null;
    const name = String(product.name || "").trim();
    const category = sanitizeText(product.category);
    const price = toNumber(product.price, 0);
    const stockQty = toNumber(product.stock_qty, 0);
    const reorderLevel = toNumber(product.reorder_level, 0);

    if (!name) {
      throw new Error("Product name is required.");
    }

    const result = db
      .prepare(
        `
        INSERT INTO products (sku, name, category, price, stock_qty, reorder_level)
        VALUES (?, ?, ?, ?, ?, ?)
      `,
      )
      .run(sku, name, category, price, stockQty, reorderLevel);

    writeAuditLog({
      session,
      action: "create_product",
      entityType: "product",
      entityId: result.lastInsertRowid,
      details: {
        after: {
          sku,
          name,
          category,
          price,
          stock_qty: stockQty,
          reorder_level: reorderLevel,
          is_active: 1,
        },
      },
    });

    return { success: true, id: result.lastInsertRowid };
  });

  ipcMain.handle("products:update", (_, product) => {
    const session = requireAdmin();

    const id = Number(product.id);
    const sku = normalizeSku(product.sku) || null;
    const name = String(product.name || "").trim();
    const category = sanitizeText(product.category);
    const price = toNumber(product.price, 0);
    const stockQty = toNumber(product.stock_qty, 0);
    const reorderLevel = toNumber(product.reorder_level, 0);

    if (!id) {
      throw new Error("Product ID is required.");
    }

    if (!name) {
      throw new Error("Product name is required.");
    }

    const existing = getProductById(id);
    if (!existing) {
      throw new Error("Product not found.");
    }

    db.prepare(
      `
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
    `,
    ).run(sku, name, category, price, stockQty, reorderLevel, id);

    writeAuditLog({
      session,
      action: "update_product",
      entityType: "product",
      entityId: id,
      details: {
        before: {
          sku: existing.sku,
          name: existing.name,
          category: existing.category,
          price: existing.price,
          stock_qty: existing.stock_qty,
          reorder_level: existing.reorder_level,
          is_active: existing.is_active,
        },
        after: {
          sku,
          name,
          category,
          price,
          stock_qty: stockQty,
          reorder_level: reorderLevel,
          is_active: existing.is_active,
        },
      },
    });

    return { success: true };
  });

  ipcMain.handle("products:deactivate", (_, productId) => {
    const session = requireAdmin();
    const existing = getProductById(productId);

    if (!existing) {
      throw new Error("Product not found.");
    }

    db.prepare(
      `
      UPDATE products
      SET is_active = 0,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `,
    ).run(productId);

    writeAuditLog({
      session,
      action: "deactivate_product",
      entityType: "product",
      entityId: productId,
      details: {
        name: existing.name,
        previous_is_active: existing.is_active,
        new_is_active: 0,
      },
    });

    return { success: true };
  });

  ipcMain.handle("products:activate", (_, productId) => {
    const session = requireAdmin();
    const existing = getProductById(productId);

    if (!existing) {
      throw new Error("Product not found.");
    }

    db.prepare(
      `
      UPDATE products
      SET is_active = 1,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `,
    ).run(productId);

    writeAuditLog({
      session,
      action: "activate_product",
      entityType: "product",
      entityId: productId,
      details: {
        name: existing.name,
        previous_is_active: existing.is_active,
        new_is_active: 1,
      },
    });

    return { success: true };
  });

  ipcMain.handle("products:updateStock", (_, { productId, stockQty }) => {
    const session = requireAdmin();
    const existing = getProductById(productId);

    if (!existing) {
      throw new Error("Product not found.");
    }

    const nextStockQty = toNumber(stockQty, existing.stock_qty);

    db.prepare(
      `
      UPDATE products
      SET stock_qty = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `,
    ).run(nextStockQty, productId);

    writeAuditLog({
      session,
      action: "update_stock",
      entityType: "product",
      entityId: productId,
      details: {
        name: existing.name,
        previous_stock_qty: existing.stock_qty,
        new_stock_qty: nextStockQty,
      },
    });

    return { success: true };
  });

  ipcMain.handle("products:findBySku", (_, rawSku) => {
    requireAuth();
    const sku = normalizeSku(rawSku);

    if (!sku) return null;

    return (
      db
        .prepare(
          `
          SELECT id, sku, name, category, price, stock_qty, reorder_level, is_active
          FROM products
          WHERE is_active = 1
            AND TRIM(LOWER(sku)) = TRIM(LOWER(?))
          LIMIT 1
        `,
        )
        .get(sku) || null
    );
  });

  ipcMain.handle("products:search", (_, rawTerm) => {
    requireAuth();
    const term = normalizeSearch(rawTerm);

    if (!term) return [];

    const likeTerm = `%${term.toLowerCase()}%`;

    return db
      .prepare(
        `
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
      `,
      )
      .all(likeTerm, likeTerm, likeTerm, term, term, `${term}%`, `${term}%`);
  });
}

module.exports = { registerProductHandlers };
