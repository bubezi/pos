import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import "../styles/login.css";

export default function LoginPage() {
  const { login } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: { preventDefault: () => void; }) {
    event.preventDefault();
    setMessage("");
    setLoading(true);

    try {
      await login(username, password);
    } catch (error) {
      console.error(error);
      setMessage(error instanceof Error ? error.message : "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-page">
      <div className="login-shell">
        <section className="login-hero">
          <div className="login-brand-badge">W</div>
          <h1>WigsnStyle POS</h1>
          <p>
            Fast checkout, stock control, receipts, and staff access management.
          </p>
        </section>

        <form className="login-card" onSubmit={handleSubmit}>
          <div className="login-card-head">
            <h2>Sign in</h2>
            <p>Enter your account details to continue.</p>
          </div>

          <label className="login-field">
            <span>Username</span>
            <input
              className="login-input"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoFocus
              placeholder="Enter username"
            />
          </label>

          <label className="login-field">
            <span>Password</span>
            <input
              className="login-input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
            />
          </label>

          {message ? <div className="login-alert">{message}</div> : null}

          <button className="login-submit" type="submit" disabled={loading}>
            {loading ? "Signing in..." : "Login"}
          </button>

          <div className="login-hint">
            Ask an admin if you do not have an account.
          </div>
        </form>
      </div>
    </div>
  );
}