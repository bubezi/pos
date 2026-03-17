const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('posAPI', {
  ping: () => 'pong',
  products: {
    list: () => ipcRenderer.invoke('products:list'),
    create: (product) => ipcRenderer.invoke('products:create', product),
    updateStock: (payload) => ipcRenderer.invoke('products:updateStock', payload),
  },
  checkout: {
    completeSale: (payload) => ipcRenderer.invoke('checkout:completeSale', payload),
  },
  receipts: {
    getBySaleId: (saleId) => ipcRenderer.invoke('receipts:getBySaleId', saleId),
    markPrinted: (saleId) => ipcRenderer.invoke('receipts:markPrinted', saleId),
  },
  dev: {
    seedProducts: () => ipcRenderer.invoke('dev:seedProducts'),
  },
});
