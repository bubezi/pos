import { useState } from "react";
import CheckoutPage from "./pages/CheckoutPage";
import ProductsPage from "./pages/ProductsPage";
import SalesHistoryPage from "./pages/SalesHistoryPage";
import LoginPage from "./pages/LoginPage";
import UsersPage from "./pages/UsersPage";
import ChangePasswordPage from "./pages/ChangePasswordPage";
import { useAuth } from "./context/AuthContext";
import "./App.css";

type Page = "checkout" | "products" | "sales" | "users" | "account";

function App() {
  const { user, loading, isAuthenticated, isAdmin, logout } = useAuth();
  const [page, setPage] = useState<Page>("checkout");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  if (loading) {
    return <div className="app-loading">Loading...</div>;
  }

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  const visiblePage =
    page === "products" && !isAdmin
      ? "checkout"
      : page === "sales" && !isAdmin
        ? "checkout"
        : page === "users" && !isAdmin
          ? "checkout"
          : page;

  const initials = user?.full_name
    ?.split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

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
            className={`nav-button ${visiblePage === "checkout" ? "active" : ""}`}
            onClick={() => setPage("checkout")}
            title="Checkout"
          >
            <span className="nav-icon">🛒</span>
            {!sidebarCollapsed && <span className="nav-label">Checkout</span>}
          </button>

          {isAdmin && (
            <button
              className={`nav-button ${visiblePage === "products" ? "active" : ""}`}
              onClick={() => setPage("products")}
              title="Products"
            >
              <span className="nav-icon">📦</span>
              {!sidebarCollapsed && <span className="nav-label">Products</span>}
            </button>
          )}

          {isAdmin && (
            <button
              className={`nav-button ${visiblePage === "sales" ? "active" : ""}`}
              onClick={() => setPage("sales")}
              title="Sales History"
            >
              <span className="nav-icon">🧾</span>
              {!sidebarCollapsed && (
                <span className="nav-label">Sales History</span>
              )}
            </button>
          )}

          {isAdmin && (
            <button
              className={`nav-button ${visiblePage === "users" ? "active" : ""}`}
              onClick={() => setPage("users")}
              title="Users"
            >
              <span className="nav-icon">👥</span>
              {!sidebarCollapsed && <span className="nav-label">Users</span>}
            </button>
          )}

          <button
            className={`nav-button ${visiblePage === "account" ? "active" : ""}`}
            onClick={() => setPage("account")}
            title="Change Password"
          >
            <span className="nav-icon">🔐</span>
            {!sidebarCollapsed && <span className="nav-label">Account</span>}
          </button>
        </nav>

        <div className="sidebar-footer">
          {!sidebarCollapsed ? (
            <div className="sidebar-user-card">
              <div className="sidebar-user-top">
                <div className="sidebar-avatar">{initials || "U"}</div>

                <div className="sidebar-user-text">
                  <div className="sidebar-user-name">{user?.full_name}</div>
                  <div className="sidebar-user-role">
                    {user?.role === "admin" ? "Administrator" : "Cashier"}
                  </div>
                </div>
              </div>

              <button className="sidebar-logout" onClick={() => void logout()}>
                <span>↩</span>
                <span>Logout</span>
              </button>
            </div>
          ) : (
            <div className="sidebar-footer-collapsed">
              <div
                className="sidebar-avatar sidebar-avatar-collapsed"
                title={`${user?.full_name} (${user?.role})`}
              >
                {initials || "U"}
              </div>

              <button
                className="sidebar-icon-button"
                onClick={() => void logout()}
                title="Logout"
                aria-label="Logout"
              >
                ↩
              </button>
            </div>
          )}
        </div>
      </aside>

      <main className="main-content">
        {visiblePage === "checkout" && <CheckoutPage />}
        {visiblePage === "products" && isAdmin && <ProductsPage />}
        {visiblePage === "sales" && isAdmin && <SalesHistoryPage />}
        {visiblePage === "users" && isAdmin && <UsersPage />}
        {visiblePage === "account" && <ChangePasswordPage />}
      </main>
    </div>
  );
}

export default App;
