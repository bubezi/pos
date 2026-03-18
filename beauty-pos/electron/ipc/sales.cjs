const { ipcMain } = require("electron");
const db = require("../db.cjs");

function normalizeText(value) {
  return String(value || "").trim();
}

function toPositiveInt(value, fallback) {
  const n = Number(value);
  return Number.isInteger(n) && n > 0 ? n : fallback;
}

function registerSalesHandlers() {
  ipcMain.handle("sales:list", (_, filters = {}) => {
    const page = toPositiveInt(filters.page, 1);
    const pageSize = toPositiveInt(filters.pageSize, 10);

    const search = normalizeText(filters.search);
    const paymentMethod = normalizeText(filters.paymentMethod);
    const dateFrom = normalizeText(filters.dateFrom);
    const dateTo = normalizeText(filters.dateTo);

    const where = [];
    const params = [];

    if (search) {
      where.push(`
        (
          LOWER(COALESCE(receipt_number, '')) LIKE ?
          OR LOWER(COALESCE(cashier_name, '')) LIKE ?
          OR LOWER(COALESCE(payment_method, '')) LIKE ?
        )
      `);
      const searchLike = `%${search.toLowerCase()}%`;
      params.push(searchLike, searchLike, searchLike);
    }

    if (paymentMethod) {
      where.push(`LOWER(payment_method) = ?`);
      params.push(paymentMethod.toLowerCase());
    }

    if (dateFrom) {
      where.push(`date(created_at) >= date(?)`);
      params.push(dateFrom);
    }

    if (dateTo) {
      where.push(`date(created_at) <= date(?)`);
      params.push(dateTo);
    }

    const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

    const countStmt = db.prepare(`
      SELECT COUNT(*) AS total
      FROM sales
      ${whereSql}
    `);

    const totalRow = countStmt.get(...params);
    const total = totalRow?.total || 0;

    const offset = (page - 1) * pageSize;

    const listStmt = db.prepare(`
      SELECT
        id,
        receipt_number,
        subtotal,
        discount,
        total,
        amount_paid,
        change_due,
        payment_method,
        cashier_name,
        notes,
        created_at
      FROM sales
      ${whereSql}
      ORDER BY datetime(created_at) DESC, id DESC
      LIMIT ? OFFSET ?
    `);

    const sales = listStmt.all(...params, pageSize, offset);

    return {
      data: sales,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  });

  ipcMain.handle("sales:getById", (_, saleId) => {
    const id = Number(saleId);

    if (!id) {
      throw new Error("Valid sale ID is required.");
    }

    const saleStmt = db.prepare(`
      SELECT
        id,
        receipt_number,
        subtotal,
        discount,
        total,
        amount_paid,
        change_due,
        payment_method,
        cashier_name,
        notes,
        created_at
      FROM sales
      WHERE id = ?
      LIMIT 1
    `);

    const sale = saleStmt.get(id);

    if (!sale) {
      return null;
    }

    const itemsStmt = db.prepare(`
      SELECT
        id,
        sale_id,
        product_id,
        product_name_snapshot,
        unit_price,
        quantity,
        line_total
      FROM sale_items
      WHERE sale_id = ?
      ORDER BY id ASC
    `);

    const items = itemsStmt.all(id);

    const receiptStmt = db.prepare(`
      SELECT
        id,
        sale_id,
        printed_at,
        print_count
      FROM receipts
      WHERE sale_id = ?
      LIMIT 1
    `);

    const receipt = receiptStmt.get(id) || null;

    return {
      ...sale,
      items,
      receipt,
    };
  });
}

module.exports = { registerSalesHandlers };
