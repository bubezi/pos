const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("posAPI", {
  ping: () => "pong",
  products: {
    list: () => ipcRenderer.invoke("products:list"),
    getAll: () => ipcRenderer.invoke("products:getAll"),
    getById: (productId) => ipcRenderer.invoke("products:getById", productId),
    create: (product) => ipcRenderer.invoke("products:create", product),
    update: (product) => ipcRenderer.invoke("products:update", product),
    deactivate: (productId) =>
      ipcRenderer.invoke("products:deactivate", productId),
    activate: (productId) => ipcRenderer.invoke("products:activate", productId),
    updateStock: (payload) =>
      ipcRenderer.invoke("products:updateStock", payload),
    findBySku: (sku) => ipcRenderer.invoke("products:findBySku", sku),
    search: (term) => ipcRenderer.invoke("products:search", term),
  },
  checkout: {
    completeSale: (payload) =>
      ipcRenderer.invoke("checkout:completeSale", payload),
  },
  receipts: {
    getBySaleId: (saleId) => ipcRenderer.invoke("receipts:getBySaleId", saleId),
    markPrinted: (saleId) => ipcRenderer.invoke("receipts:markPrinted", saleId),
    preview: (saleId) => ipcRenderer.invoke("receipts:preview", saleId),
    print: (saleId) => ipcRenderer.invoke("receipts:print", saleId),
    savePdf: (saleId) => ipcRenderer.invoke("receipts:savePdf", saleId),
  },
  sales: {
    list: (filters) => ipcRenderer.invoke("sales:list", filters),
    getById: (saleId) => ipcRenderer.invoke("sales:getById", saleId),
  },
  auth: {
    login: (payload) => ipcRenderer.invoke("auth:login", payload),
    logout: () => ipcRenderer.invoke("auth:logout"),
    getSession: () => ipcRenderer.invoke("auth:get-session"),
    changePassword: (payload) =>
      ipcRenderer.invoke("auth:change-password", payload),
  },
  users: {
    list: () => ipcRenderer.invoke("users:list"),
    create: (payload) => ipcRenderer.invoke("users:create", payload),
    update: (payload) => ipcRenderer.invoke("users:update", payload),
    changePassword: (payload) =>
      ipcRenderer.invoke("users:change-password", payload),
  },
  dev: {
    seedProducts: () => ipcRenderer.invoke("dev:seedProducts"),
  },
});
