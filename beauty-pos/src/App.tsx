import { useEffect, useState } from "react";
import CheckoutPage from "./pages/CheckoutPage";
import ProductsPage from "./pages/ProductsPage";
import SalesHistoryPage from "./pages/SalesHistoryPage";
import LoginPage from "./pages/LoginPage";
import UsersPage from "./pages/UsersPage";
import ChangePasswordPage from "./pages/ChangePasswordPage";
import { useAuth } from "./context/AuthContext";
import "./App.css";
import { useInactivityTimeout } from "./hooks/useInactivityTimeout";
import DashboardPage from "./pages/DashboardPage";
import AuditLogsPage from "./pages/AuditLogsPage";

type Page =
  | "checkout"
  | "products"
  | "sales"
  | "users"
  | "account"
  | "dashboard"
  | "logs";

function App() {
  const { user, loading, isAuthenticated, isAdmin, logout } = useAuth();
  const [page, setPage] = useState<Page>("checkout");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [timeoutMs, setTimeoutMs] = useState(10 * 60 * 1000);

  const mustChangePassword = Boolean(user?.must_change_password);

  useEffect(() => {
    if (mustChangePassword && page !== "account") {
      setPage("account");
    }
  }, [mustChangePassword, page]);

  useEffect(() => {
    if (!isAuthenticated) return;

    async function loadTimeout() {
      try {
        const result = await window.posAPI.settings.getSessionTimeout();
        setTimeoutMs(result.sessionTimeoutMinutes * 60 * 1000);
      } catch (error) {
        console.error(error);
      }
    }

    void loadTimeout();
  }, [isAuthenticated]);

  useInactivityTimeout({
    enabled: isAuthenticated,
    timeoutMs,
    onTimeout: async () => {
      await window.posAPI.auth.logout();
      window.location.reload();
    },
  });

  if (loading) {
    return <div className="app-loading">Loading...</div>;
  }

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  const visiblePage = mustChangePassword
    ? "account"
    : page === "products" && !isAdmin
      ? "checkout"
      : page === "sales" && !isAdmin
        ? "checkout"
        : page === "users" && !isAdmin
          ? "checkout"
          : page === "dashboard" && !isAdmin
            ? "checkout"
            : page === "logs" && !isAdmin
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
          {!mustChangePassword && (
            <>
              <button
                className={`nav-button ${visiblePage === "checkout" ? "active" : ""}`}
                onClick={() => setPage("checkout")}
                title="Checkout"
              >
                <span className="nav-icon">🛒</span>
                {!sidebarCollapsed && (
                  <span className="nav-label">Checkout</span>
                )}
              </button>

              {isAdmin && (
                <button
                  className={`nav-button ${visiblePage === "dashboard" ? "active" : ""}`}
                  onClick={() => setPage("dashboard")}
                  title="Dashboard"
                >
                  <span className="nav-icon">🖥️</span>
                  {!sidebarCollapsed && (
                    <span className="nav-label">Dashboard</span>
                  )}
                </button>
              )}

              {isAdmin && (
                <button
                  className={`nav-button ${visiblePage === "products" ? "active" : ""}`}
                  onClick={() => setPage("products")}
                  title="Products"
                >
                  <span className="nav-icon">📦</span>
                  {!sidebarCollapsed && (
                    <span className="nav-label">Products</span>
                  )}
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
                  {!sidebarCollapsed && (
                    <span className="nav-label">Users</span>
                  )}
                </button>
              )}

              {isAdmin && (
                <button
                  className={`nav-button ${visiblePage === "logs" ? "active" : ""}`}
                  onClick={() => setPage("logs")}
                  title="Audi Logs"
                >
                  <span className="nav-icon">📜</span>
                  {!sidebarCollapsed && (
                    <span className="nav-label">Audit Logs</span>
                  )}
                </button>
              )}
            </>
          )}

          <button
            className={`nav-button ${visiblePage === "account" ? "active" : ""}`}
            onClick={() => setPage("account")}
            title="Change Password"
          >
            <span className="nav-icon">🔐</span>
            {!sidebarCollapsed && (
              <span className="nav-label">
                {mustChangePassword ? "Change Required" : "Account"}
              </span>
            )}
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
                  {mustChangePassword && (
                    <div className="sidebar-user-role">
                      Default password must be changed
                    </div>
                  )}
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
        {visiblePage === "checkout" && !mustChangePassword && <CheckoutPage />}
        {visiblePage === "products" && isAdmin && !mustChangePassword && (
          <ProductsPage />
        )}
        {visiblePage === "sales" && isAdmin && !mustChangePassword && (
          <SalesHistoryPage />
        )}
        {visiblePage === "users" && isAdmin && !mustChangePassword && (
          <UsersPage />
        )}
        {visiblePage === "dashboard" && isAdmin && !mustChangePassword && (
          <DashboardPage />
        )}
        {visiblePage === "logs" && isAdmin && !mustChangePassword && (
          <AuditLogsPage />
        )}        
        {visiblePage === "account" && <ChangePasswordPage />}
      </main>
    </div>
  );
}

export default App;
