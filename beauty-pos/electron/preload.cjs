const { contextBridge, ipcRenderer } = require("electron");

async function invoke(channel, payload) {
  try {
    return await ipcRenderer.invoke(channel, payload);
  } catch (error) {
    const message =
      error instanceof Error
        ? cleanIpcErrorMessage(error.message)
        : "Request failed";
    throw new Error(message);
  }
}

function cleanIpcErrorMessage(message) {
  if (!message) return "Request failed";

  return String(message).replace(
    /^Error invoking remote method '.*?':\s*/i,
    "",
  );
}

contextBridge.exposeInMainWorld("posAPI", {
  ping: () => "pong",
  products: {
    list: () => invoke("products:list"),
    getAll: () => invoke("products:getAll"),
    getById: (productId) => invoke("products:getById", productId),
    create: (product) => invoke("products:create", product),
    update: (product) => invoke("products:update", product),
    deactivate: (productId) => invoke("products:deactivate", productId),
    activate: (productId) => invoke("products:activate", productId),
    updateStock: (payload) => invoke("products:updateStock", payload),
    findBySku: (sku) => invoke("products:findBySku", sku),
    search: (term) => invoke("products:search", term),
  },
  checkout: {
    completeSale: (payload) => invoke("checkout:completeSale", payload),
  },
  receipts: {
    getBySaleId: (saleId) => invoke("receipts:getBySaleId", saleId),
    markPrinted: (saleId) => invoke("receipts:markPrinted", saleId),
    preview: (saleId) => invoke("receipts:preview", saleId),
    print: (saleId) => invoke("receipts:print", saleId),
    savePdf: (saleId) => invoke("receipts:savePdf", saleId),
  },
  sales: {
    list: (filters) => invoke("sales:list", filters),
    getById: (saleId) => invoke("sales:getById", saleId),
  },
  auth: {
    login: (payload) => invoke("auth:login", payload),
    logout: () => invoke("auth:logout"),
    getSession: () => invoke("auth:get-session"),
    changePassword: (payload) => invoke("auth:change-password", payload),
  },
  users: {
    list: () => invoke("users:list"),
    create: (payload) => invoke("users:create", payload),
    update: (payload) => invoke("users:update", payload),
    changePassword: (payload) => invoke("users:change-password", payload),
    setMustChangePassword: (payload) =>
      invoke("users:set-must-change-password", payload),
  },
  dashboard: {
    getSummary: () => invoke("dashboard:get-summary"),
  },
  settings: {
    getSessionTimeout: () => invoke("settings:get-session-timeout"),
    setSessionTimeout: (payload) =>
      invoke("settings:set-session-timeout", payload),
  },
  audit: {
    list: (payload) => invoke("audit:list", payload),
    getFilters: () => invoke("audit:get-filters"),
  },
  dev: {
    seedProducts: () => invoke("dev:seedProducts"),
  },
});
