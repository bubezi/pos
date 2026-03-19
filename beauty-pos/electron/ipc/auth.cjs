const { ipcMain } = require("electron");
const db = require("../db.cjs");
const { hashPassword, verifyPassword } = require("../auth.cjs");

let currentSession = null;

function sanitizeUser(user) {
  if (!user) return null;

  return {
    id: user.id,
    full_name: user.full_name,
    username: user.username,
    role: user.role,
    is_active: user.is_active,
    must_change_password: user.must_change_password,
    created_at: user.created_at,
    updated_at: user.updated_at,
  };
}

function normalizeUsername(username) {
  return String(username || "")
    .trim()
    .toLowerCase();
}

function requireAuth() {
  if (!currentSession) {
    throw new Error("Not authenticated");
  }
  return currentSession;
}

function requireAdmin() {
  const session = requireAuth();
  if (session.role !== "admin") {
    throw new Error("Admin access required");
  }
  return session;
}

function getUserById(id) {
  return db
    .prepare(
      `
      SELECT *
      FROM users
      WHERE id = ?
      LIMIT 1
    `,
    )
    .get(id);
}

function countActiveAdminsExcludingUser(excludedUserId = null) {
  if (excludedUserId) {
    const row = db
      .prepare(
        `
        SELECT COUNT(*) AS count
        FROM users
        WHERE role = 'admin'
          AND is_active = 1
          AND id != ?
      `,
      )
      .get(excludedUserId);

    return row.count;
  }

  const row = db
    .prepare(
      `
      SELECT COUNT(*) AS count
      FROM users
      WHERE role = 'admin'
        AND is_active = 1
    `,
    )
    .get();

  return row.count;
}

function isDuplicateUsernameError(error) {
  return (
    error &&
    typeof error.message === "string" &&
    error.message.includes("UNIQUE constraint failed")
  );
}

function registerAuthHandlers() {
  ipcMain.handle("auth:login", async (_, payload) => {
    const usernameInput = String(payload?.username || "");
    const password = String(payload?.password || "");
    const normalizedUsername = normalizeUsername(usernameInput);

    if (!normalizedUsername || !password) {
      throw new Error("Username and password are required");
    }

    const user = db
      .prepare(
        `
        SELECT *
        FROM users
        WHERE LOWER(TRIM(username)) = ?
        LIMIT 1
      `,
      )
      .get(normalizedUsername);

    if (!user || !user.is_active) {
      throw new Error("Invalid username or password");
    }

    const ok = verifyPassword(password, user.password_hash);
    if (!ok) {
      throw new Error("Invalid username or password");
    }

    currentSession = sanitizeUser(user);

    return {
      success: true,
      user: currentSession,
      must_change_password: !!user.must_change_password,
    };
  });

  ipcMain.handle("auth:logout", async () => {
    currentSession = null;
    return { success: true };
  });

  ipcMain.handle("auth:get-session", async () => {
    return currentSession;
  });

  ipcMain.handle("users:list", async () => {
    requireAdmin();

    const users = db
      .prepare(
        `
        SELECT
          id,
          full_name,
          username,
          role,
          is_active,
          must_change_password,
          created_at,
          updated_at
        FROM users
        ORDER BY id DESC
      `,
      )
      .all();

    return users;
  });

  ipcMain.handle("users:create", async (_, payload) => {
    requireAdmin();

    const fullName = String(payload?.fullName || "").trim();
    const usernameRaw = String(payload?.username || "");
    const username = usernameRaw.trim();
    const normalizedUsername = normalizeUsername(usernameRaw);
    const password = String(payload?.password || "");
    const role = String(payload?.role || "").trim();

    if (!fullName || !username || !password || !role) {
      throw new Error("All fields are required");
    }

    if (!["admin", "cashier"].includes(role)) {
      throw new Error("Invalid role");
    }

    if (password.length < 4) {
      throw new Error("Password must be at least 4 characters");
    }

    const existing = db
      .prepare(
        `
        SELECT id
        FROM users
        WHERE LOWER(TRIM(username)) = ?
        LIMIT 1
      `,
      )
      .get(normalizedUsername);

    if (existing) {
      throw new Error("Username already exists");
    }

    const passwordHash = hashPassword(password);

    try {
      const result = db
        .prepare(
          `
          INSERT INTO users (
            full_name,
            username,
            password_hash,
            role,
            is_active,
            must_change_password
          )
          VALUES (?, ?, ?, ?, 1, 0)
        `,
        )
        .run(fullName, username, passwordHash, role);

      return {
        success: true,
        id: result.lastInsertRowid,
      };
    } catch (error) {
      if (isDuplicateUsernameError(error)) {
        throw new Error("Username already exists");
      }
      throw error;
    }
  });

  ipcMain.handle("users:update", async (_, payload) => {
    const session = requireAdmin();

    const id = Number(payload?.id);
    const fullName = String(payload?.fullName || "").trim();
    const usernameRaw = String(payload?.username || "");
    const username = usernameRaw.trim();
    const normalizedUsername = normalizeUsername(usernameRaw);
    const role = String(payload?.role || "").trim();
    const isActive = payload?.isActive ? 1 : 0;

    if (!id || !fullName || !username || !role) {
      throw new Error("Missing required fields");
    }

    if (!["admin", "cashier"].includes(role)) {
      throw new Error("Invalid role");
    }

    const existingUser = getUserById(id);
    if (!existingUser) {
      throw new Error("User not found");
    }

    const conflictingUser = db
      .prepare(
        `
        SELECT id
        FROM users
        WHERE LOWER(TRIM(username)) = ?
          AND id != ?
        LIMIT 1
      `,
      )
      .get(normalizedUsername, id);

    if (conflictingUser) {
      throw new Error("Username already exists");
    }

    if (session.id === id && isActive === 0) {
      throw new Error("You cannot deactivate your own account");
    }

    const willBeAdmin = role === "admin";
    const willBeActive = isActive === 1;
    const currentlyOnlyActiveAdmin =
      existingUser.role === "admin" &&
      existingUser.is_active === 1 &&
      countActiveAdminsExcludingUser(id) === 0;

    if (currentlyOnlyActiveAdmin && (!willBeAdmin || !willBeActive)) {
      throw new Error("You cannot remove or deactivate the last active admin");
    }

    try {
      db.prepare(
        `
        UPDATE users
        SET full_name = ?,
            username = ?,
            role = ?,
            is_active = ?,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `,
      ).run(fullName, username, role, isActive, id);

      if (currentSession && currentSession.id === id) {
        const freshUser = getUserById(id);
        currentSession = sanitizeUser(freshUser);
      }

      return { success: true };
    } catch (error) {
      if (isDuplicateUsernameError(error)) {
        throw new Error("Username already exists");
      }
      throw error;
    }
  });

  ipcMain.handle("users:change-password", async (_, payload) => {
    const session = requireAdmin();

    const id = Number(payload?.id);
    const newPassword = String(payload?.newPassword || "");

    if (!id || !newPassword) {
      throw new Error("User ID and new password are required");
    }

    if (newPassword.length < 4) {
      throw new Error("New password must be at least 4 characters");
    }

    const user = getUserById(id);
    if (!user) {
      throw new Error("User not found");
    }

    if (session.id === id) {
      throw new Error(
        "You cannot reset your own password from the Users page. Use the Account page instead.",
      );
    }

    if (user.role === "admin") {
      throw new Error("You cannot reset another admin's password.");
    }

    const passwordHash = hashPassword(newPassword);

    db.prepare(
      `
      UPDATE users
      SET password_hash = ?,
          must_change_password = 1,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `,
    ).run(passwordHash, id);

    return { success: true };
  });

  ipcMain.handle("auth:change-password", async (_, payload) => {
    const session = requireAuth();

    const currentPassword = String(payload?.currentPassword || "");
    const newPassword = String(payload?.newPassword || "");

    if (!currentPassword || !newPassword) {
      throw new Error("Current password and new password are required");
    }

    if (newPassword.length < 4) {
      throw new Error("New password must be at least 4 characters");
    }

    const user = db
      .prepare(
        `
        SELECT *
        FROM users
        WHERE id = ?
        LIMIT 1
      `,
      )
      .get(session.id);

    if (!user) {
      throw new Error("User not found");
    }

    const ok = verifyPassword(currentPassword, user.password_hash);
    if (!ok) {
      throw new Error("Current password is incorrect");
    }

    const passwordHash = hashPassword(newPassword);

    db.prepare(
      `
      UPDATE users
      SET password_hash = ?,
          must_change_password = 0,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `,
    ).run(passwordHash, session.id);

    const freshUser = getUserById(session.id);
    currentSession = sanitizeUser(freshUser);

    return {
      success: true,
      user: currentSession,
    };
  });

  ipcMain.handle("users:set-must-change-password", async (_, payload) => {
    const session = requireAdmin();

    const id = Number(payload?.id);
    const mustChangePassword = Boolean(payload?.mustChangePassword);

    if (!id) {
      throw new Error("User ID is required");
    }

    const user = getUserById(id);
    if (!user) {
      throw new Error("User not found");
    }

    if (session.id === id) {
      throw new Error(
        "You cannot force your own account to change password from the Users page.",
      );
    }

    db.prepare(
      `
      UPDATE users
      SET must_change_password = ?,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `,
    ).run(mustChangePassword ? 1 : 0, id);

    return { success: true };
  });
}

module.exports = {
  registerAuthHandlers,
  requireAuth,
  requireAdmin,
};
