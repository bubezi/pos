const db = require("./db.cjs");

function safeJson(value) {
  try {
    return value == null ? null : JSON.stringify(value);
  } catch {
    return JSON.stringify({
      error: "Failed to serialize audit log details",
    });
  }
}

function writeAuditLog({
  session = null,
  action,
  entityType,
  entityId = null,
  details = null,
}) {
  db.prepare(
    `
    INSERT INTO audit_logs (
      user_id,
      username,
      action,
      entity_type,
      entity_id,
      details_json
    )
    VALUES (?, ?, ?, ?, ?, ?)
  `,
  ).run(
    session?.id ?? null,
    session?.username ?? null,
    action,
    entityType,
    entityId != null ? String(entityId) : null,
    safeJson(details),
  );
}

module.exports = {
  writeAuditLog,
};
