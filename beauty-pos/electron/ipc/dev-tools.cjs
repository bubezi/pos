const { ipcMain } = require('electron')
const db = require('../db.cjs')

function registerDevToolHandlers() {
  ipcMain.handle('dev:seedProducts', () => {
    const insert = db.prepare(`
      INSERT OR IGNORE INTO products
      (sku, name, category, price, stock_qty, reorder_level)
      VALUES (?, ?, ?, ?, ?, ?)
    `)

    const tx = db.transaction(() => {
      insert.run('LIP001', 'Lip Gloss', 'Makeup', 350, 20, 5)
      insert.run('CRE001', 'Face Cream', 'Skincare', 850, 15, 4)
      insert.run('SHA001', 'Shampoo', 'Haircare', 600, 30, 8)
      insert.run('OIL001', 'Hair Oil', 'Haircare', 500, 12, 4)
    })

    tx()
    return { success: true }
  })
}

module.exports = { registerDevToolHandlers }