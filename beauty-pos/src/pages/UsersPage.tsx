import { useEffect, useState } from "react";
import "../styles/users.css";

type UserFormState = {
  fullName: string;
  username: string;
  password: string;
  role: UserRole;
};

const emptyForm: UserFormState = {
  fullName: "",
  username: "",
  password: "",
  role: "cashier",
};

export default function UsersPage() {
  const [users, setUsers] = useState<AuthUser[]>([]);
  const [form, setForm] = useState<UserFormState>(emptyForm);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [resetPasswords, setResetPasswords] = useState<Record<number, string>>(
    {},
  );

  async function loadUsers() {
    try {
      const data = await window.posAPI.users.list();
      setUsers(data);
    } catch (error) {
      console.error(error);
      setMessage(
        error instanceof Error ? error.message : "Failed to load users",
      );
    }
  }

  useEffect(() => {
    void loadUsers();
  }, []);

  async function handleCreateUser(event: { preventDefault: () => void; }) {
    event.preventDefault();
    setMessage("");
    setLoading(true);

    try {
      await window.posAPI.users.create({
        fullName: form.fullName,
        username: form.username,
        password: form.password,
        role: form.role,
      });

      setForm(emptyForm);
      setMessage("User created successfully.");
      await loadUsers();
    } catch (error) {
      console.error(error);
      setMessage(
        error instanceof Error ? error.message : "Failed to create user",
      );
    } finally {
      setLoading(false);
    }
  }

  async function toggleUser(user: AuthUser) {
    try {
      await window.posAPI.users.update({
        id: user.id,
        fullName: user.full_name,
        username: user.username,
        role: user.role,
        isActive: !Boolean(user.is_active),
      });

      setMessage(
        `${user.full_name} has been ${user.is_active ? "deactivated" : "activated"}.`,
      );
      await loadUsers();
    } catch (error) {
      console.error(error);
      setMessage(
        error instanceof Error ? error.message : "Failed to update user",
      );
    }
  }

  async function resetUserPassword(userId: number) {
    const newPassword = resetPasswords[userId]?.trim();

    if (!newPassword) {
      setMessage("Enter a new password before resetting.");
      return;
    }

    try {
      await window.posAPI.users.changePassword({
        id: userId,
        newPassword,
      });

      setResetPasswords((prev) => ({ ...prev, [userId]: "" }));
      setMessage("Password reset successfully.");
    } catch (error) {
      console.error(error);
      setMessage(
        error instanceof Error ? error.message : "Failed to reset password",
      );
    }
  }

  return (
    <div className="users-page">
      <header className="page-header">
        <div>
          <h1>Users</h1>
          <p className="muted">Create and manage admin and cashier accounts.</p>
        </div>
      </header>

      {message ? <div className="alert">{message}</div> : null}

      <div className="users-grid">
        <section className="panel">
          <div className="panel-header">
            <h2>Add User</h2>
          </div>

          <form className="users-form" onSubmit={handleCreateUser}>
            <label>
              <span>Full name</span>
              <input
                className="input"
                value={form.fullName}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, fullName: e.target.value }))
                }
              />
            </label>

            <label>
              <span>Username</span>
              <input
                className="input"
                value={form.username}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, username: e.target.value }))
                }
              />
            </label>

            <label>
              <span>Password</span>
              <input
                className="input"
                type="password"
                value={form.password}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, password: e.target.value }))
                }
              />
            </label>

            <label>
              <span>Role</span>
              <select
                className="input"
                value={form.role}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    role: e.target.value as UserRole,
                  }))
                }
              >
                <option value="cashier">Cashier</option>
                <option value="admin">Admin</option>
              </select>
            </label>

            <button className="button" type="submit" disabled={loading}>
              {loading ? "Saving..." : "Create User"}
            </button>
          </form>
        </section>

        <section className="panel">
          <div className="panel-header">
            <h2>Manage Users</h2>
          </div>

          <div className="users-list">
            {users.length === 0 ? (
              <p className="empty">No users found.</p>
            ) : null}

            {users.map((user) => (
              <article className="user-card" key={user.id}>
                <div className="user-card-top">
                  <div>
                    <strong>{user.full_name}</strong>
                    <div className="muted">
                      @{user.username} · {user.role}
                    </div>
                  </div>

                  <span
                    className={`user-status ${user.is_active ? "active" : "inactive"}`}
                  >
                    {user.is_active ? "Active" : "Inactive"}
                  </span>
                </div>

                <div className="user-card-actions">
                  <button
                    className="button secondary"
                    onClick={() => void toggleUser(user)}
                  >
                    {user.is_active ? "Deactivate" : "Activate"}
                  </button>

                  <input
                    className="input"
                    type="password"
                    placeholder="New password"
                    value={resetPasswords[user.id] || ""}
                    onChange={(e) =>
                      setResetPasswords((prev) => ({
                        ...prev,
                        [user.id]: e.target.value,
                      }))
                    }
                  />

                  <button
                    className="button"
                    onClick={() => void resetUserPassword(user.id)}
                  >
                    Reset Password
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
