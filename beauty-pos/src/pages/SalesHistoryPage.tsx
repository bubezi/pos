import { useEffect, useState } from "react";
import "../styles/sales-history.css";

const PAGE_SIZE = 10;

function formatCurrency(value: number) {
  return `KES ${Number(value || 0).toFixed(2)}`;
}

function formatDateTime(value: string) {
  const date = new Date(value);
  return date.toLocaleString();
}

export default function SalesHistoryPage() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [selectedSale, setSelectedSale] = useState<SaleDetails | null>(null);
  const [loading, setLoading] = useState(false);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [message, setMessage] = useState("");

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRows, setTotalRows] = useState(0);

  const [search, setSearch] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  async function loadSales(targetPage = page) {
    try {
      setLoading(true);
      setMessage("");

      const result = await window.posAPI.sales.list({
        page: targetPage,
        pageSize: PAGE_SIZE,
        search,
        paymentMethod,
        dateFrom,
        dateTo,
      });

      setSales(result.data);
      setPage(result.pagination.page);
      setTotalPages(result.pagination.totalPages || 1);
      setTotalRows(result.pagination.total);

      if (result.data.length > 0) {
        const currentSelectedStillExists = result.data.some(
          (sale) => sale.id === selectedSale?.id,
        );

        if (!currentSelectedStillExists) {
          loadSaleDetails(result.data[0].id);
        }
      } else {
        setSelectedSale(null);
      }
    } catch (error) {
      console.error(error);
      setMessage("Failed to load sales history.");
    } finally {
      setLoading(false);
    }
  }

  async function loadSaleDetails(saleId: number) {
    try {
      setDetailsLoading(true);
      const sale = await window.posAPI.sales.getById(saleId);
      setSelectedSale(sale);
    } catch (error) {
      console.error(error);
      setMessage("Failed to load sale details.");
    } finally {
      setDetailsLoading(false);
    }
  }

  useEffect(() => {
    loadSales(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleApplyFilters() {
    loadSales(1);
  }

  function handleResetFilters() {
    setSearch("");
    setPaymentMethod("");
    setDateFrom("");
    setDateTo("");

    setTimeout(() => {
      loadSales(1);
    }, 0);
  }

  async function handleViewReceipt() {
    if (!selectedSale) return;

    try {
      setMessage("");
      await window.posAPI.receipts.preview(selectedSale.id);
    } catch (error: any) {
      setMessage(error.message || "Failed to preview receipt");
    }
  }

  async function handlePrintReceipt() {
    if (!selectedSale) return;

    try {
      setMessage("");
      await window.posAPI.receipts.print(selectedSale.id);
      setMessage(`Printing receipt ${selectedSale.receipt_number}...`);
    } catch (error: any) {
      setMessage(error.message || "Failed to print receipt");
    }
  }

  async function handleSavePdf() {
    if (!selectedSale) return;

    try {
      setMessage("");
      const result = await window.posAPI.receipts.savePdf(selectedSale.id);

      if (result.success) {
        setMessage(
          `Receipt saved as PDF${result.filePath ? `: ${result.filePath}` : ""}`,
        );
      }
    } catch (error: any) {
      setMessage(error.message || "Failed to save receipt as PDF");
    }
  }

  return (
    <div className="sales-history-page">
      <div className="page-header">
        <div>
          <h1>Sales History</h1>
          <p>Track completed sales and inspect receipt details.</p>
        </div>
      </div>

      {message && <div className="page-message">{message}</div>}

      <div className="sales-filters">
        <input
          type="text"
          placeholder="Search receipt, cashier, payment..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <select
          value={paymentMethod}
          onChange={(e) => setPaymentMethod(e.target.value)}
        >
          <option value="">All payments</option>
          <option value="cash">Cash</option>
          <option value="mpesa">M-Pesa</option>
          <option value="card">Card</option>
        </select>

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

        <button onClick={handleApplyFilters}>Apply</button>
        <button className="secondary" onClick={handleResetFilters}>
          Reset
        </button>
      </div>

      <div className="sales-history-layout">
        <section className="sales-list-panel">
          <div className="panel-header">
            <h2>Sales</h2>
            <span>{totalRows} record(s)</span>
          </div>

          {loading ? (
            <div className="panel-empty">Loading sales...</div>
          ) : sales.length === 0 ? (
            <div className="panel-empty">No sales found.</div>
          ) : (
            <>
              <div className="sales-list">
                {sales.map((sale) => (
                  <button
                    key={sale.id}
                    className={`sale-row ${
                      selectedSale?.id === sale.id ? "active" : ""
                    }`}
                    onClick={() => loadSaleDetails(sale.id)}
                  >
                    <div className="sale-row-top">
                      <strong>{sale.receipt_number}</strong>
                      <span>{formatCurrency(sale.total)}</span>
                    </div>

                    <div className="sale-row-meta">
                      <span>{sale.payment_method}</span>
                      <span>{sale.cashier_name || "No cashier"}</span>
                      <span>{formatDateTime(sale.created_at)}</span>
                    </div>
                  </button>
                ))}
              </div>

              <div className="pagination-bar">
                <button
                  disabled={page <= 1}
                  onClick={() => loadSales(page - 1)}
                >
                  Prev
                </button>

                <span>
                  Page {page} of {totalPages}
                </span>

                <button
                  disabled={page >= totalPages}
                  onClick={() => loadSales(page + 1)}
                >
                  Next
                </button>
              </div>
            </>
          )}
        </section>

        <section className="sale-details-panel">
          <div className="panel-header">
            <h2>Sale Details</h2>
          </div>

          {detailsLoading ? (
            <div className="panel-empty">Loading details...</div>
          ) : !selectedSale ? (
            <div className="panel-empty">Select a sale to view details.</div>
          ) : (
            <div className="sale-details">
              <div className="detail-grid">
                <div>
                  <label>Receipt</label>
                  <div>{selectedSale.receipt_number}</div>
                </div>
                <div>
                  <label>Date</label>
                  <div>{formatDateTime(selectedSale.created_at)}</div>
                </div>
                <div>
                  <label>Payment</label>
                  <div>{selectedSale.payment_method}</div>
                </div>
                <div>
                  <label>Cashier</label>
                  <div>{selectedSale.cashier_name || "—"}</div>
                </div>
              </div>

              <div className="totals-card">
                <div>
                  <span>Subtotal</span>
                  <strong>{formatCurrency(selectedSale.subtotal)}</strong>
                </div>
                <div>
                  <span>Discount</span>
                  <strong>{formatCurrency(selectedSale.discount)}</strong>
                </div>
                <div>
                  <span>Total</span>
                  <strong>{formatCurrency(selectedSale.total)}</strong>
                </div>
                <div>
                  <span>Paid</span>
                  <strong>{formatCurrency(selectedSale.amount_paid)}</strong>
                </div>
                <div>
                  <span>Change</span>
                  <strong>{formatCurrency(selectedSale.change_due)}</strong>
                </div>
              </div>

              <div className="sale-items-table-wrap">
                <table className="sale-items-table">
                  <thead>
                    <tr>
                      <th>Item</th>
                      <th>Unit Price</th>
                      <th>Qty</th>
                      <th>Line Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedSale.items.map((item) => (
                      <tr key={item.id}>
                        <td>{item.product_name_snapshot}</td>
                        <td>{formatCurrency(item.unit_price)}</td>
                        <td>{item.quantity}</td>
                        <td>{formatCurrency(item.line_total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="receipt-meta">
                <div>
                  <label>Printed</label>
                  <div>
                    {selectedSale.receipt?.printed_at || "Not yet printed"}
                  </div>
                </div>
                <div>
                  <label>Print Count</label>
                  <div>{selectedSale.receipt?.print_count ?? 0}</div>
                </div>
              </div>

              <div className="receipt-actions">
                <button
                  className="button secondary"
                  onClick={() => void handleViewReceipt()}
                  disabled={!selectedSale}
                >
                  Preview Receipt
                </button>

                <button
                  className="button"
                  onClick={() => void handlePrintReceipt()}
                  disabled={!selectedSale}
                >
                  Print Receipt
                </button>

                <button
                  className="button secondary"
                  onClick={() => void handleSavePdf()}
                  disabled={!selectedSale}
                >
                  Save PDF
                </button>
              </div>

              {selectedSale.notes && (
                <div className="notes-card">
                  <label>Notes</label>
                  <p>{selectedSale.notes}</p>
                </div>
              )}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
