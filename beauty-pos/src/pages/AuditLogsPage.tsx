import { useEffect, useState } from "react";
import "../styles/audit-logs.css";

const PAGE_SIZE = 20;

function formatDateTime(value: string) {
  return new Date(value).toLocaleString();
}

function prettyDetails(details: unknown) {
  if (details == null) return "No details";
  try {
    return JSON.stringify(details, null, 2);
  } catch {
    return "Unable to display details";
  }
}

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [selectedLog, setSelectedLog] = useState<AuditLogEntry | null>(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const [actions, setActions] = useState<string[]>([]);
  const [entityTypes, setEntityTypes] = useState<string[]>([]);

  const [username, setUsername] = useState("");
  const [action, setAction] = useState("");
  const [entityType, setEntityType] = useState("");

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRows, setTotalRows] = useState(0);

  async function loadFilters() {
    try {
      const result = await window.posAPI.audit.getFilters();
      setActions(result.actions);
      setEntityTypes(result.entityTypes);
    } catch (error) {
      console.error(error);
    }
  }

  async function loadLogs(targetPage = page) {
    try {
      setLoading(true);
      setMessage("");

      const result = await window.posAPI.audit.list({
        page: targetPage,
        pageSize: PAGE_SIZE,
        username,
        action,
        entityType,
      });

      setLogs(result.data);
      setPage(result.pagination.page);
      setTotalPages(result.pagination.totalPages || 1);
      setTotalRows(result.pagination.total);

      if (result.data.length > 0) {
        const selectedStillExists = result.data.some(
          (entry) => entry.id === selectedLog?.id,
        );

        if (!selectedStillExists) {
          setSelectedLog(result.data[0]);
        }
      } else {
        setSelectedLog(null);
      }
    } catch (error) {
      console.error(error);
      setMessage(
        error instanceof Error ? error.message : "Failed to load audit logs.",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadFilters();
    void loadLogs(1);
  }, []);

  function applyFilters() {
    void loadLogs(1);
  }

  function resetFilters() {
    setUsername("");
    setAction("");
    setEntityType("");

    setTimeout(() => {
      void loadLogs(1);
    }, 0);
  }

  return (
    <div className="audit-logs-page">
      <header className="page-header">
        <div>
          <h1>Audit Logs</h1>
          <p>Review who did what, when, and to which record.</p>
        </div>
      </header>

      {message ? <div className="alert">{message}</div> : null}

      <div className="audit-filters">
        <input
          className="input"
          placeholder="Username..."
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />

        <select
          className="input"
          value={action}
          onChange={(e) => setAction(e.target.value)}
        >
          <option value="">All actions</option>
          {actions.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>

        <select
          className="input"
          value={entityType}
          onChange={(e) => setEntityType(e.target.value)}
        >
          <option value="">All entity types</option>
          {entityTypes.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>

        <button className="button" onClick={applyFilters}>
          Apply
        </button>

        <button className="button secondary" onClick={resetFilters}>
          Reset
        </button>
      </div>

      <div className="audit-layout">
        <section className="panel audit-list-panel">
          <div className="panel-header">
            <h2>Logs</h2>
            <span>{totalRows} record(s)</span>
          </div>

          {loading ? (
            <div className="panel-empty">Loading logs...</div>
          ) : logs.length === 0 ? (
            <div className="panel-empty">No audit logs found.</div>
          ) : (
            <>
              <div className="audit-log-list">
                {logs.map((log) => (
                  <button
                    key={log.id}
                    className={`audit-log-row ${
                      selectedLog?.id === log.id ? "active" : ""
                    }`}
                    onClick={() => setSelectedLog(log)}
                  >
                    <div className="audit-log-top">
                      <strong>{log.action}</strong>
                      <span>{formatDateTime(log.created_at)}</span>
                    </div>

                    <div className="audit-log-meta">
                      <span>{log.username || "System"}</span>
                      <span>{log.entity_type}</span>
                      <span>{log.entity_id || "—"}</span>
                    </div>
                  </button>
                ))}
              </div>

              <div className="pagination-bar">
                <button
                  disabled={page <= 1}
                  onClick={() => void loadLogs(page - 1)}
                >
                  Prev
                </button>

                <span>
                  Page {page} of {totalPages}
                </span>

                <button
                  disabled={page >= totalPages}
                  onClick={() => void loadLogs(page + 1)}
                >
                  Next
                </button>
              </div>
            </>
          )}
        </section>

        <section className="panel audit-details-panel">
          <div className="panel-header">
            <h2>Log Details</h2>
          </div>

          {!selectedLog ? (
            <div className="panel-empty">
              Select a log entry to view details.
            </div>
          ) : (
            <div className="audit-details">
              <div className="detail-grid">
                <div>
                  <label>ID</label>
                  <div>{selectedLog.id}</div>
                </div>
                <div>
                  <label>Date</label>
                  <div>{formatDateTime(selectedLog.created_at)}</div>
                </div>
                <div>
                  <label>User</label>
                  <div>{selectedLog.username || "System"}</div>
                </div>
                <div>
                  <label>Action</label>
                  <div>{selectedLog.action}</div>
                </div>
                <div>
                  <label>Entity Type</label>
                  <div>{selectedLog.entity_type}</div>
                </div>
                <div>
                  <label>Entity ID</label>
                  <div>{selectedLog.entity_id || "—"}</div>
                </div>
              </div>

              <div className="audit-json-card">
                <label>Details JSON</label>
                <pre>{prettyDetails(selectedLog.details)}</pre>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
