import { useState } from "react";
import CheckoutPage from "./pages/CheckoutPage";
import ProductsPage from "./pages/ProductsPage";
import SalesHistoryPage from "./pages/SalesHistoryPage";
import "./App.css";

type Page = "checkout" | "products" | "sales";

function App() {
  const [page, setPage] = useState<Page>("checkout");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <div className={`app-shell ${sidebarCollapsed ? "sidebar-collapsed" : ""}`}>
      <aside className="sidebar">
        <div className="sidebar-top">
          <div className="brand-row">
            <button
              className="sidebar-toggle"
              onClick={() => setSidebarCollapsed((prev) => !prev)}
              aria-label={
                sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"
              }
              title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              <span />
              <span />
              <span />
            </button>

            <div className="brand">{sidebarCollapsed ? "" : "WigsnStyle"}</div>
          </div>
        </div>

        <nav className="sidebar-nav">
          <button
            className={`nav-button ${page === "checkout" ? "active" : ""}`}
            onClick={() => setPage("checkout")}
            title="Checkout"
          >
            <span className="nav-icon">🛒</span>
            {!sidebarCollapsed && <span className="nav-label">Checkout</span>}
          </button>

          <button
            className={`nav-button ${page === "products" ? "active" : ""}`}
            onClick={() => setPage("products")}
            title="Products"
          >
            <span className="nav-icon">📦</span>
            {!sidebarCollapsed && <span className="nav-label">Products</span>}
          </button>

          <button
            className={`nav-button ${page === "sales" ? "active" : ""}`}
            onClick={() => setPage("sales")}
            title="Sales History"
          >
            <span className="nav-icon">🧾</span>
            {!sidebarCollapsed && (
              <span className="nav-label">Sales History</span>
            )}
          </button>
        </nav>
      </aside>

      <main className="main-content">
        {page === "checkout" && <CheckoutPage />}
        {page === "products" && <ProductsPage />}
        {page === "sales" && <SalesHistoryPage />}
      </main>
    </div>
  );
}

export default App;
