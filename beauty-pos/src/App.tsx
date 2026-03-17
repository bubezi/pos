import "./App.css";

function App() {
  const hasAPI = typeof window.posAPI !== "undefined";
  const pingValue = hasAPI ? window.posAPI.ping() : "posAPI missing";

  return (
    <div style={{ padding: 24, fontFamily: "sans-serif" }}>
      <h1>Beauty POS</h1>
      <p>Electron + React is alive.</p>
      <p>Has posAPI: {String(hasAPI)}</p>
      <p>Ping from preload: {pingValue}</p>
    </div>
  );
}

export default App;
