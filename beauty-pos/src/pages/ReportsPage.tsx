import { useEffect, useState } from "react";
import "../styles/reports.css";

type ReportTab = "low-stock" | "zero-stock" | "stock-list" | "sales";

function formatCurrency(value: number) {
  return `KES ${Number(value || 0).toFixed(2)}`;
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString();
}

export default function ReportsPage() {
  const [tab, setTab] = useState<ReportTab>("low-stock");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const [products, setProducts] = useState<ReportProductRow[]>([]);
  const [sales, setSales] = useState<ReportSaleRow[]>([]);
  const [summary, setSummary] = useState<SalesReportSummary | null>(null);
  const [cashiers, setCashiers] = useState<string[]>([]);

  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [cashier, setCashier] = useState("");

  useEffect(() => {
    window.posAPI.reports
      .getSalesFilters()
      .then((result) => setCashiers(result.cashiers || []))
      .catch((error) => {
        console.error(error);
      });
  }, []);

  useEffect(() => {
    void loadCurrentReport();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  async function loadCurrentReport() {
    try {
      setLoading(true);
      setMessage("");

      if (tab === "low-stock") {
        const data = await window.posAPI.reports.getLowStock();
        setProducts(data);
        setSales([]);
        setSummary(null);
        return;
      }

      if (tab === "zero-stock") {
        const data = await window.posAPI.reports.getZeroStock();
        setProducts(data);
        setSales([]);
        setSummary(null);
        return;
      }

      if (tab === "stock-list") {
        const data = await window.posAPI.reports.getStockList();
        setProducts(data);
        setSales([]);
        setSummary(null);
        return;
      }

      if (tab === "sales") {
        const result = await window.posAPI.reports.getSales({
          dateFrom,
          dateTo,
          cashier,
        });
        setSales(result.rows || []);
        setSummary(result.summary || null);
        setProducts([]);
      }
    } catch (error) {
      console.error(error);
      setMessage("Failed to load report.");
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveAsPdf() {
    try {
      setMessage("");

      const result = await window.posAPI.reports.savePdf({
        tab,
        dateFrom,
        dateTo,
        cashier,
      });

      if (result.success) {
        setMessage(
          `Report saved as PDF${result.filePath ? `: ${result.filePath}` : ""}`,
        );
      }
    } catch (error: any) {
      console.error(error);
      setMessage(error.message || "Failed to save report as PDF");
    }
  }

  function renderProductTable() {
    return (
      <div className="report-table-wrap">
        <table className="report-table">
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
            {products.map((item) => (
              <tr key={item.id}>
                <td>{item.sku}</td>
                <td>{item.name}</td>
                <td>{item.category || "—"}</td>
                <td>{formatCurrency(item.price)}</td>
                <td>{item.stock_qty}</td>
                <td>{item.reorder_level}</td>
                <td>{item.is_active ? "Active" : "Inactive"}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {!loading && products.length === 0 && (
          <div className="panel-empty">No records found.</div>
        )}
      </div>
    );
  }

  function renderSalesTable() {
    return (
      <>
        <div className="sales-report-filters">
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
          />

          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
          />

          <select value={cashier} onChange={(e) => setCashier(e.target.value)}>
            <option value="">All cashiers</option>
            {cashiers.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>

          <button onClick={() => void loadCurrentReport()}>Apply</button>
          <button
            className="secondary"
            onClick={() => {
              setDateFrom("");
              setDateTo("");
              setCashier("");
              setTimeout(() => void loadCurrentReport(), 0);
            }}
          >
            Reset
          </button>
        </div>

        {summary && (
          <div className="report-summary-cards">
            <div className="summary-card-report">
              <span>Total Sales</span>
              <strong>{summary.total_sales}</strong>
            </div>
            <div className="summary-card-report">
              <span>Subtotal Sum</span>
              <strong>{formatCurrency(summary.subtotal_sum)}</strong>
            </div>
            <div className="summary-card-report">
              <span>Discount Sum</span>
              <strong>{formatCurrency(summary.discount_sum)}</strong>
            </div>
            <div className="summary-card-report">
              <span>Total Sum</span>
              <strong>{formatCurrency(summary.total_sum)}</strong>
            </div>
          </div>
        )}

        <div className="report-table-wrap">
          <table className="report-table">
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
              {sales.map((sale) => (
                <tr key={sale.id}>
                  <td>{sale.receipt_number}</td>
                  <td>{formatDateTime(sale.created_at)}</td>
                  <td>{sale.cashier_name || "—"}</td>
                  <td>{sale.payment_method}</td>
                  <td>{formatCurrency(sale.total)}</td>
                  <td>{formatCurrency(sale.amount_paid)}</td>
                  <td>{formatCurrency(sale.change_due)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {!loading && sales.length === 0 && (
            <div className="panel-empty">
              No sales found for the selected filters.
            </div>
          )}
        </div>
      </>
    );
  }

  return (
    <div className="reports-page">
      <div className="page-header">
        <div>
          <h1>Reports</h1>
          <p>View stock and sales reports.</p>
        </div>
      </div>

      {message && <div className="page-message">{message}</div>}

      <div className="report-tabs">
        <button
          className={tab === "low-stock" ? "active" : ""}
          onClick={() => setTab("low-stock")}
        >
          Low Stock
        </button>

        <button
          className={tab === "zero-stock" ? "active" : ""}
          onClick={() => setTab("zero-stock")}
        >
          Zero Stock
        </button>

        <button
          className={tab === "stock-list" ? "active" : ""}
          onClick={() => setTab("stock-list")}
        >
          Stock List
        </button>

        <button
          className={tab === "sales" ? "active" : ""}
          onClick={() => setTab("sales")}
        >
          Sales Report
        </button>
      </div>

      <section className="report-panel">
        <div className="panel-header">
          <h2>
            {tab === "low-stock" && "Low Stock Report"}
            {tab === "zero-stock" && "Zero Stock Report"}
            {tab === "stock-list" && "Stock List"}
            {tab === "sales" && "Sales Report"}
          </h2>
        </div>

        {loading ? (
          <div className="panel-empty">Loading report...</div>
        ) : (
          <>
            {tab !== "sales" && renderProductTable()}
            {tab === "sales" && renderSalesTable()}
          </>
        )}
        <div className="report-actions">
          <button className="button" onClick={handleSaveAsPdf}>
            Save as PDF
          </button>
        </div>
      </section>
    </div>
  );
}
