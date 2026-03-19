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

type EditFormState = {
  id: number | null;
  fullName: string;
  username: string;
  role: UserRole;
};

const emptyEditForm: EditFormState = {
  id: null,
  fullName: "",
  username: "",
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
  const [resetPasswordsConfirm, setResetPasswordsConfirm] = useState<
    Record<number, string>
  >({});
  const [editForm, setEditForm] = useState<EditFormState>(emptyEditForm);

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
  function startEditingUser(user: AuthUser) {
    setEditForm({
      id: user.id,
      fullName: user.full_name,
      username: user.username,
      role: user.role,
    });
    setMessage("");
  }

  function cancelEditingUser() {
    setEditForm(emptyEditForm);
    setMessage("");
  }

  useEffect(() => {
    void loadUsers();
  }, []);

  async function toggleUser(user: AuthUser) {
    const action = user.is_active ? "deactivate" : "activate";
    const confirmed = window.confirm(
      `Are you sure you want to ${action} ${user.full_name}?`,
    );

    if (!confirmed) return;

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

      if (editForm.id === user.id) {
        setEditForm((prev) => ({
          ...prev,
          role: user.role,
          fullName: user.full_name,
          username: user.username,
        }));
      }

      await loadUsers();
    } catch (error) {
      console.error(error);
      setMessage(
        error instanceof Error ? error.message : "Failed to update user",
      );
    }
  }

  async function handleSubmitUserForm(event: { preventDefault: () => void }) {
    event.preventDefault();
    setMessage("");
    setLoading(true);

    try {
      if (editForm.id !== null) {
        const existingUser = users.find((user) => user.id === editForm.id);

        if (!existingUser) {
          throw new Error("User not found");
        }

        await window.posAPI.users.update({
          id: editForm.id,
          fullName: editForm.fullName,
          username: editForm.username,
          role: editForm.role,
          isActive: Boolean(existingUser.is_active),
        });

        setMessage(`${editForm.fullName} updated successfully.`);
        setEditForm(emptyEditForm);
      } else {
        await window.posAPI.users.create({
          fullName: form.fullName,
          username: form.username,
          password: form.password,
          role: form.role,
        });

        setForm(emptyForm);
        setMessage("User created successfully.");
      }

      await loadUsers();
    } catch (error) {
      console.error(error);
      setMessage(
        error instanceof Error
          ? error.message
          : editForm.id !== null
            ? "Failed to update user"
            : "Failed to create user",
      );
    } finally {
      setLoading(false);
    }
  }

  async function resetUserPassword(user: AuthUser) {
    const newPassword = resetPasswords[user.id]?.trim();
    const newPasswordConfirm = resetPasswordsConfirm[user.id]?.trim();

    if (!newPassword) {
      setMessage("Enter a new password before resetting.");
      return;
    }

    if (!newPasswordConfirm) {
      setMessage("Enter a password twice before resetting.");
      return;
    }

    if (newPassword !== newPasswordConfirm) {
      setMessage("Passwords Must Match.");
      return;
    }

    const confirmed = window.confirm(
      `Reset password for ${user.full_name}?\n\nThey will be required to change it at next login.`,
    );

    if (!confirmed) return;

    try {
      await window.posAPI.users.changePassword({
        id: user.id,
        newPassword,
      });

      setResetPasswords((prev) => ({ ...prev, [user.id]: "" }));

      setResetPasswordsConfirm((prev) => ({ ...prev, [user.id]: "" }));
      setMessage(
        `${user.full_name}'s password was reset. They must change it on next login.`,
      );
      await loadUsers();
    } catch (error) {
      console.error(error);
      setMessage(
        error instanceof Error ? error.message : "Failed to reset password",
      );
    }
  }

  async function setMustChangePassword(
    user: AuthUser,
    mustChangePassword: boolean,
  ) {
    const actionText = mustChangePassword
      ? "force this user to change their password on next login"
      : "remove the forced password change requirement";

    const confirmed = window.confirm(
      `Are you sure you want to ${actionText} for ${user.full_name}?`,
    );

    if (!confirmed) return;

    try {
      await window.posAPI.users.setMustChangePassword({
        id: user.id,
        mustChangePassword,
      });

      setMessage(
        mustChangePassword
          ? `${user.full_name} will be required to change password on next login.`
          : `${user.full_name} is no longer required to change password on next login.`,
      );

      await loadUsers();
    } catch (error) {
      console.error(error);
      setMessage(
        error instanceof Error
          ? error.message
          : "Failed to update password-change requirement",
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
            <h2>{editForm.id !== null ? "Edit User" : "Add User"}</h2>
            {editForm.id !== null ? (
              <p className="muted">
                Editing user #{editForm.id} @{editForm.username}
              </p>
            ) : (
              <p className="muted">
                Create and manage admin and cashier accounts.
              </p>
            )}
          </div>

          <form className="users-form" onSubmit={handleSubmitUserForm}>
            <label>
              <span>Full name</span>
              <input
                className="input"
                value={editForm.id !== null ? editForm.fullName : form.fullName}
                onChange={(e) =>
                  editForm.id !== null
                    ? setEditForm((prev) => ({
                        ...prev,
                        fullName: e.target.value,
                      }))
                    : setForm((prev) => ({ ...prev, fullName: e.target.value }))
                }
              />
            </label>

            <label>
              <span>Username</span>
              <input
                className="input"
                value={editForm.id !== null ? editForm.username : form.username}
                onChange={(e) =>
                  editForm.id !== null
                    ? setEditForm((prev) => ({
                        ...prev,
                        username: e.target.value,
                      }))
                    : setForm((prev) => ({ ...prev, username: e.target.value }))
                }
              />
            </label>

            {editForm.id === null ? (
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
            ) : null}

            <label>
              <span>Role</span>
              <select
                className="input"
                value={editForm.id !== null ? editForm.role : form.role}
                onChange={(e) =>
                  editForm.id !== null
                    ? setEditForm((prev) => ({
                        ...prev,
                        role: e.target.value as UserRole,
                      }))
                    : setForm((prev) => ({
                        ...prev,
                        role: e.target.value as UserRole,
                      }))
                }
              >
                <option value="cashier">Cashier</option>
                <option value="admin">Admin</option>
              </select>
            </label>

            <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
              <button className="button" type="submit" disabled={loading}>
                {loading
                  ? editForm.id !== null
                    ? "Updating..."
                    : "Saving..."
                  : editForm.id !== null
                    ? "Update User"
                    : "Create User"}
              </button>

              {editForm.id !== null ? (
                <button
                  className="button secondary"
                  type="button"
                  onClick={cancelEditingUser}
                >
                  Cancel Edit
                </button>
              ) : null}
            </div>
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

            {users.map((user) => {
              return (
                <article className="user-card" key={user.id}>
                  <div className="user-card-top">
                    <div>
                      <strong>{user.full_name}</strong>
                      <div className="muted">
                        @{user.username} · {user.role}
                        {user.must_change_password
                          ? " · Must change password"
                          : ""}
                      </div>
                    </div>

                    <span
                      className={`user-status ${user.is_active ? "active" : "inactive"}`}
                    >
                      {user.is_active ? "Active" : "Inactive"}
                    </span>
                  </div>
                  <div className="user-card-actions">
                    <div className="user-card-row">
                      <button
                        className="button"
                        onClick={() => startEditingUser(user)}
                      >
                        Edit Details
                      </button>

                      <button
                        className="button secondary"
                        onClick={() => void toggleUser(user)}
                      >
                        {user.is_active ? "Deactivate" : "Activate"}
                      </button>

                      <button
                        className="button secondary"
                        onClick={() =>
                          void setMustChangePassword(
                            user,
                            !user.must_change_password,
                          )
                        }
                      >
                        {user.must_change_password
                          ? "Clear Forced Change"
                          : "Force Password Change"}
                      </button>
                    </div>

                    {user.role === "cashier" ? (
                      <div className="user-card-row password-row">
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

                        <input
                          className="input"
                          type="password"
                          placeholder="Confirm password"
                          value={resetPasswordsConfirm[user.id] || ""}
                          onChange={(e) =>
                            setResetPasswordsConfirm((prev) => ({
                              ...prev,
                              [user.id]: e.target.value,
                            }))
                          }
                        />

                        <button
                          className="button"
                          onClick={() => void resetUserPassword(user)}
                        >
                          Reset Password
                        </button>
                      </div>
                    ) : (
                      <div className="user-card-note">
                        Admin passwords cannot be reset here.
                      </div>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}
