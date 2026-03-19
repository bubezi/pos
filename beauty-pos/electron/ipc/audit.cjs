const { ipcMain } = require("electron");
const db = require("../db.cjs");
const { requireAdmin } = require("./auth.cjs");

function parseDetails(detailsJson) {
  if (!detailsJson) return null;

  try {
    return JSON.parse(detailsJson);
  } catch {
    return null;
  }
}

function registerAuditHandlers() {
  ipcMain.handle("audit:list", async (_, payload) => {
    requireAdmin();

    const page = Math.max(1, Number(payload?.page) || 1);
    const pageSize = Math.max(1, Math.min(100, Number(payload?.pageSize) || 20));
    const offset = (page - 1) * pageSize;

    const username = String(payload?.username || "").trim().toLowerCase();
    const action = String(payload?.action || "").trim().toLowerCase();
    const entityType = String(payload?.entityType || "").trim().toLowerCase();

    const where = [];
    const params = [];

    if (username) {
      where.push("LOWER(COALESCE(username, '')) LIKE ?");
      params.push(`%${username}%`);
    }

    if (action) {
      where.push("LOWER(action) LIKE ?");
      params.push(`%${action}%`);
    }

    if (entityType) {
      where.push("LOWER(entity_type) LIKE ?");
      params.push(`%${entityType}%`);
    }

    const whereClause = where.length ? `WHERE ${where.join(" AND ")}` : "";

    const totalRow = db
      .prepare(
        `
        SELECT COUNT(*) AS total
        FROM audit_logs
        ${whereClause}
      `,
      )
      .get(...params);

    const rows = db
      .prepare(
        `
        SELECT
          id,
          user_id,
          username,
          action,
          entity_type,
          entity_id,
          details_json,
          created_at
        FROM audit_logs
        ${whereClause}
        ORDER BY datetime(created_at) DESC, id DESC
        LIMIT ? OFFSET ?
      `,
      )
      .all(...params, pageSize, offset);

    return {
      data: rows.map((row) => ({
        id: row.id,
        user_id: row.user_id,
        username: row.username,
        action: row.action,
        entity_type: row.entity_type,
        entity_id: row.entity_id,
        details_json: row.details_json,
        details: parseDetails(row.details_json),
        created_at: row.created_at,
      })),
      pagination: {
        page,
        pageSize,
        total: Number(totalRow?.total || 0),
        totalPages: Math.max(
          1,
          Math.ceil(Number(totalRow?.total || 0) / pageSize),
        ),
      },
    };
  });

  ipcMain.handle("audit:get-filters", async () => {
    requireAdmin();

    const actions = db
      .prepare(
        `
        SELECT DISTINCT action
        FROM audit_logs
        WHERE action IS NOT NULL AND TRIM(action) != ''
        ORDER BY action ASC
      `,
      )
      .all()
      .map((row) => row.action);

    const entityTypes = db
      .prepare(
        `
        SELECT DISTINCT entity_type
        FROM audit_logs
        WHERE entity_type IS NOT NULL AND TRIM(entity_type) != ''
        ORDER BY entity_type ASC
      `,
      )
      .all()
      .map((row) => row.entity_type);

    const usernames = db
      .prepare(
        `
        SELECT DISTINCT username
        FROM audit_logs
        WHERE username IS NOT NULL AND TRIM(username) != ''
        ORDER BY username ASC
      `,
      )
      .all()
      .map((row) => row.username);

    return { actions, entityTypes, usernames };
  });
}

module.exports = {
  registerAuditHandlers,
};