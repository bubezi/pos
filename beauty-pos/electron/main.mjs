import { app, BrowserWindow, dialog, Menu } from "electron";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import electronUpdater from "electron-updater";
const { autoUpdater } = electronUpdater;

const require = createRequire(import.meta.url);
const { globalShortcut } = require("electron");

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let mainWindow;

require("./db.cjs");

const { registerAuthHandlers } = require("./ipc/auth.cjs");
const { registerProductHandlers } = require("./ipc/products.cjs");
const { registerCheckoutHandlers } = require("./ipc/checkout.cjs");
const { registerReceiptHandlers } = require("./ipc/receipts.cjs");
const { registerDevToolHandlers } = require("./ipc/dev-tools.cjs");
const { registerSalesHandlers } = require("./ipc/sales.cjs");
const { registerDashboardHandlers } = require("./ipc/dashboard.cjs");
const { registerAuditHandlers } = require("./ipc/audit.cjs");
const { registerReportHandlers } = require("./ipc/reports.cjs");

function setupAutoUpdater() {
  autoUpdater.autoDownload = false;
  autoUpdater.autoInstallOnAppQuit = true;

  autoUpdater.on("checking-for-update", () => {
    console.log("[updater] Checking for updates...");
  });

  autoUpdater.on("update-available", async (info) => {
    console.log("[updater] Update available:", info.version);

    const result = await dialog.showMessageBox({
      type: "info",
      buttons: ["Download", "Later"],
      defaultId: 0,
      cancelId: 1,
      title: "Update available",
      message: `Version ${info.version} is available.`,
      detail: "Do you want to download the update now?",
    });

    if (result.response === 0) {
      autoUpdater.downloadUpdate();
    }
  });

  autoUpdater.on("update-not-available", () => {
    console.log("[updater] No update available.");
  });

  autoUpdater.on("download-progress", (progress) => {
    console.log(
      `[updater] Download speed: ${progress.bytesPerSecond} - ${progress.percent.toFixed(1)}%`,
    );

    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.setProgressBar(progress.percent / 100);
    }
  });

  autoUpdater.on("update-downloaded", async (info) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.setProgressBar(-1);
    }

    const result = await dialog.showMessageBox({
      type: "question",
      buttons: ["Install and Restart", "Later"],
      defaultId: 0,
      cancelId: 1,
      title: "Install update",
      message: `Version ${info.version} has been downloaded.`,
      detail: "The app will restart to complete the update.",
    });

    if (result.response === 0) {
      autoUpdater.quitAndInstall();
    }
  });

  autoUpdater.on("error", (error) => {
    console.error("[updater] Error:", error);
    dialog.showMessageBox({
      type: "error",
      title: "Update error",
      message: "Failed to check or download updates.",
      detail: error == null ? "Unknown error" : String(error),
    });
  });
}

function getWindowIcon() {
  if (process.platform === "win32") {
    return path.join(__dirname, "../build/icon.ico");
  }

  return path.join(__dirname, "../build/icon.png");
}

function createAppMenu() {
  const template = [
    {
      label: "File",
      submenu: [{ role: "quit" }],
    },
    {
      label: "Edit",
      submenu: [
        { role: "undo" },
        { role: "redo" },
        { type: "separator" },
        { role: "cut" },
        { role: "copy" },
        { role: "paste" },
        { role: "delete" },
        { type: "separator" },
        { role: "selectAll" },
      ],
    },
    {
      label: "View",
      submenu: [
        { role: "reload" },
        { type: "separator" },
        { role: "resetZoom" },
        { role: "zoomIn" },
        { role: "zoomOut" },
        { type: "separator" },
        { role: "togglefullscreen" },
      ],
    },
    {
      label: "Window",
      submenu: [
        { role: "minimize" },
        { type: "separator" },
        { role: "zoom" },
        { role: "close" },
      ],
    },
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 1100,
    minHeight: 700,
    title: "WigsnStyle POS",
    icon: getWindowIcon(),
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(path.join(__dirname, "../dist/index.html"));
  }

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

app.setName("WigsnStyle Point of Sale System");

app.whenReady().then(() => {
  createAppMenu();

  globalShortcut.register("Control+Shift+I", () => {
    BrowserWindow.getFocusedWindow()?.webContents.openDevTools();
  });

  registerAuthHandlers();
  registerProductHandlers();
  registerCheckoutHandlers();
  registerReceiptHandlers();
  registerDevToolHandlers();
  registerSalesHandlers();
  registerDashboardHandlers();
  registerAuditHandlers();
  registerReportHandlers();

  createWindow();

  if (app.isPackaged) {
    setupAutoUpdater();

    setTimeout(() => {
      autoUpdater.checkForUpdates();
    }, 5000);
  }

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("will-quit", () => {
  globalShortcut.unregisterAll();
});
