import { useEffect, useState } from "react";
import "../styles/dashboard.css";

function formatCurrency(value: number) {
  return `KES ${Number(value || 0).toFixed(2)}`;
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString();
}

export default function DashboardPage() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [timeoutMinutes, setTimeoutMinutes] = useState("10");
  const [savingTimeout, setSavingTimeout] = useState(false);

  async function loadDashboard() {
    try {
      setLoading(true);
      setMessage("");

      const data = await window.posAPI.dashboard.getSummary();
      setSummary(data);
      setTimeoutMinutes(String(data.settings.sessionTimeoutMinutes));
    } catch (error) {
      console.error(error);
      setMessage(
        error instanceof Error ? error.message : "Failed to load dashboard.",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadDashboard();
  }, []);

  async function saveTimeoutSetting() {
    const value = Number(timeoutMinutes);

    if (!Number.isFinite(value) || value < 1 || value > 240) {
      setMessage("Timeout must be between 1 and 240 minutes.");
      return;
    }

    try {
      setSavingTimeout(true);
      setMessage("");

      await window.posAPI.settings.setSessionTimeout({
        sessionTimeoutMinutes: value,
      });

      setMessage("Session timeout updated successfully.");
      await loadDashboard();
    } catch (error) {
      console.error(error);
      setMessage(
        error instanceof Error
          ? error.message
          : "Failed to save timeout setting.",
      );
    } finally {
      setSavingTimeout(false);
    }
  }

  return (
    <div className="dashboard-page">
      <header className="page-header">
        <div>
          <h1>Dashboard</h1>
          <p>Overview of inventory, sales, and session security settings.</p>
        </div>
      </header>

      {message ? <div className="alert">{message}</div> : null}

      {loading || !summary ? (
        <div className="panel-empty">Loading dashboard...</div>
      ) : (
        <>
          <section className="dashboard-section">
            <div className="section-header">
              <h2>Inventory Summary</h2>
            </div>

            <div className="dashboard-cards">
              <div className="dashboard-card">
                <span>Total Products</span>
                <strong>{summary.inventory.totalProducts}</strong>
              </div>

              <div className="dashboard-card">
                <span>Active Products</span>
                <strong>{summary.inventory.activeProducts}</strong>
              </div>

              <div className="dashboard-card">
                <span>Inactive Products</span>
                <strong>{summary.inventory.inactiveProducts}</strong>
              </div>

              <div className="dashboard-card warning">
                <span>Low Stock</span>
                <strong>{summary.inventory.lowStockProducts}</strong>
              </div>

              <div className="dashboard-card danger">
                <span>Out of Stock</span>
                <strong>{summary.inventory.outOfStockProducts}</strong>
              </div>

              <div className="dashboard-card">
                <span>Total Units</span>
                <strong>{summary.inventory.totalUnits}</strong>
              </div>

              <div className="dashboard-card wide">
                <span>Inventory Value</span>
                <strong>
                  {formatCurrency(summary.inventory.inventoryValue)}
                </strong>
              </div>
            </div>
          </section>

          <section className="dashboard-section">
            <div className="section-header">
              <h2>Sales Summary</h2>
            </div>

            <div className="dashboard-cards">
              <div className="dashboard-card">
                <span>Sales Today</span>
                <strong>{summary.sales.today.count}</strong>
                <small>{formatCurrency(summary.sales.today.total)}</small>
              </div>

              <div className="dashboard-card">
                <span>This Month</span>
                <strong>{summary.sales.thisMonth.count}</strong>
                <small>{formatCurrency(summary.sales.thisMonth.total)}</small>
              </div>

              <div className="dashboard-card wide">
                <span>All-Time Sales</span>
                <strong>{summary.sales.overall.count}</strong>
                <small>{formatCurrency(summary.sales.overall.total)}</small>
              </div>
            </div>
          </section>

          <div className="dashboard-two-column">
            <section className="panel">
              <div className="section-header">
                <h2>Recent Sales</h2>
              </div>

              {summary.recentSales.length === 0 ? (
                <div className="panel-empty">No sales yet.</div>
              ) : (
                <div className="recent-sales-list">
                  {summary.recentSales.map((sale) => (
                    <div className="recent-sale-item" key={sale.id}>
                      <div>
                        <strong>{sale.receipt_number}</strong>
                        <div className="muted">
                          {sale.cashier_name || "No cashier"} ·{" "}
                          {sale.payment_method}
                        </div>
                      </div>

                      <div className="recent-sale-right">
                        <strong>{formatCurrency(sale.total)}</strong>
                        <div className="muted">
                          {formatDateTime(sale.created_at)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section className="panel">
              <div className="section-header">
                <h2>Session Timeout</h2>
              </div>

              <div className="settings-block">
                <label className="settings-label">
                  <span>Timeout in minutes</span>
                  <input
                    className="input"
                    type="number"
                    min={1}
                    max={240}
                    value={timeoutMinutes}
                    onChange={(e) => setTimeoutMinutes(e.target.value)}
                  />
                </label>

                <p className="muted">
                  Users will be logged out after this period of inactivity.
                </p>

                <button
                  className="button"
                  onClick={() => void saveTimeoutSetting()}
                  disabled={savingTimeout}
                >
                  {savingTimeout ? "Saving..." : "Save Timeout Setting"}
                </button>
              </div>
            </section>
          </div>
        </>
      )}
    </div>
  );
}
