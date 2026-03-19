import { app, BrowserWindow } from "electron";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log("[main] __dirname =", __dirname);
console.log("[main] preload path =", path.join(__dirname, "preload.cjs"));

require("./db.cjs");

const { registerAuthHandlers } = require("./ipc/auth.cjs");
const { registerProductHandlers } = require("./ipc/products.cjs");
const { registerCheckoutHandlers } = require("./ipc/checkout.cjs");
const { registerReceiptHandlers } = require("./ipc/receipts.cjs");
const { registerDevToolHandlers } = require("./ipc/dev-tools.cjs");
const { registerSalesHandlers } = require("./ipc/sales.cjs");
const { registerDashboardHandlers } = require("./ipc/dashboard.cjs");
const { registerAuditHandlers } = require("./ipc/audit.cjs");

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (process.env.VITE_DEV_SERVER_URL) {
    win.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else {
    win.loadFile(path.join(__dirname, "../dist/index.html"));
  }
}

app.setName("WigsnStyle POS");

app.whenReady().then(() => {
  registerAuthHandlers();
  registerProductHandlers();
  registerCheckoutHandlers();
  registerReceiptHandlers();
  registerDevToolHandlers();
  registerSalesHandlers();
  registerDashboardHandlers();
  registerAuditHandlers();
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
