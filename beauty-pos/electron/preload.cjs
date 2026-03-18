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
  },
  dev: {
    seedProducts: () => ipcRenderer.invoke("dev:seedProducts"),
  },
});
