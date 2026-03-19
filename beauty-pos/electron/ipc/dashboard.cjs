const { ipcMain } = require("electron");
const db = require("../db.cjs");
const { requireAdmin, requireAuth } = require("./auth.cjs");

function getSetting(key, fallbackValue) {
  const row = db
    .prepare(
      `
      SELECT value
      FROM app_settings
      WHERE key = ?
      LIMIT 1
    `,
    )
    .get(key);

  return row ? row.value : fallbackValue;
}

function registerDashboardHandlers() {
  ipcMain.handle("dashboard:get-summary", async () => {
    requireAdmin();

    const inventory = db
      .prepare(
        `
        SELECT
          COUNT(*) AS total_products,
          SUM(CASE WHEN is_active = 1 THEN 1 ELSE 0 END) AS active_products,
          SUM(CASE WHEN is_active = 0 THEN 1 ELSE 0 END) AS inactive_products,
          SUM(
            CASE
              WHEN is_active = 1
               AND stock_qty > 0
               AND reorder_level > 0
               AND stock_qty <= reorder_level
              THEN 1 ELSE 0
            END
          ) AS low_stock_products,
          SUM(
            CASE
              WHEN is_active = 1
               AND stock_qty <= 0
              THEN 1 ELSE 0
            END
          ) AS out_of_stock_products,
          SUM(CASE WHEN is_active = 1 THEN stock_qty ELSE 0 END) AS total_units,
          SUM(CASE WHEN is_active = 1 THEN price * stock_qty ELSE 0 END) AS inventory_value
        FROM products
      `,
      )
      .get();

    const salesToday = db
      .prepare(
        `
        SELECT
          COUNT(*) AS sales_count,
          COALESCE(SUM(total), 0) AS sales_total
        FROM sales
        WHERE DATE(created_at) = DATE('now', 'localtime')
      `,
      )
      .get();

    const salesThisMonth = db
      .prepare(
        `
        SELECT
          COUNT(*) AS sales_count,
          COALESCE(SUM(total), 0) AS sales_total
        FROM sales
        WHERE strftime('%Y-%m', created_at) = strftime('%Y-%m', 'now', 'localtime')
      `,
      )
      .get();

    const overallSales = db
      .prepare(
        `
        SELECT
          COUNT(*) AS sales_count,
          COALESCE(SUM(total), 0) AS sales_total
        FROM sales
      `,
      )
      .get();

    const recentSales = db
      .prepare(
        `
        SELECT
          id,
          receipt_number,
          total,
          payment_method,
          cashier_name,
          created_at
        FROM sales
        ORDER BY datetime(created_at) DESC
        LIMIT 8
      `,
      )
      .all();

    const timeoutMinutes = Number(getSetting("session_timeout_minutes", "10"));

    return {
      inventory: {
        totalProducts: Number(inventory.total_products || 0),
        activeProducts: Number(inventory.active_products || 0),
        inactiveProducts: Number(inventory.inactive_products || 0),
        lowStockProducts: Number(inventory.low_stock_products || 0),
        outOfStockProducts: Number(inventory.out_of_stock_products || 0),
        totalUnits: Number(inventory.total_units || 0),
        inventoryValue: Number(inventory.inventory_value || 0),
      },
      sales: {
        today: {
          count: Number(salesToday.sales_count || 0),
          total: Number(salesToday.sales_total || 0),
        },
        thisMonth: {
          count: Number(salesThisMonth.sales_count || 0),
          total: Number(salesThisMonth.sales_total || 0),
        },
        overall: {
          count: Number(overallSales.sales_count || 0),
          total: Number(overallSales.sales_total || 0),
        },
      },
      recentSales,
      settings: {
        sessionTimeoutMinutes: timeoutMinutes,
      },
    };
  });

  ipcMain.handle("settings:get-session-timeout", async () => {
    requireAuth();

    return {
      sessionTimeoutMinutes: Number(
        getSetting("session_timeout_minutes", "10"),
      ),
    };
  });

  ipcMain.handle("settings:set-session-timeout", async (_, payload) => {
    requireAdmin();

    const sessionTimeoutMinutes = Number(payload?.sessionTimeoutMinutes);

    if (
      !Number.isFinite(sessionTimeoutMinutes) ||
      sessionTimeoutMinutes < 1 ||
      sessionTimeoutMinutes > 240
    ) {
      throw new Error("Session timeout must be between 1 and 240 minutes.");
    }

    const oldValue = Number(getSetting("session_timeout_minutes", "10"));

    db.prepare(
      `
  INSERT INTO app_settings (key, value)
  VALUES ('session_timeout_minutes', ?)
  ON CONFLICT(key)
  DO UPDATE SET
    value = excluded.value
`,
    ).run(String(sessionTimeoutMinutes));
    writeAuditLog({
      session,
      action: "update_setting",
      entityType: "app_setting",
      entityId: "session_timeout_minutes",
      details: {
        before: oldValue,
        after: sessionTimeoutMinutes,
      },
    });
    return { success: true };
  });
}

module.exports = {
  registerDashboardHandlers,
};
