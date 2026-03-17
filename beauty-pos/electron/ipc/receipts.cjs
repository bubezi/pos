const { ipcMain } = require('electron')
const db = require('../db.cjs')

function registerReceiptHandlers() {
  ipcMain.handle('receipts:getBySaleId', (_, saleId) => {
    const saleStmt = db.prepare(`
      SELECT id, receipt_number, subtotal, discount, total, amount_paid, change_due,
             payment_method, cashier_name, notes, created_at
      FROM sales
      WHERE id = ?
    `)

    const itemsStmt = db.prepare(`
      SELECT product_id, product_name_snapshot, unit_price, quantity, line_total
      FROM sale_items
      WHERE sale_id = ?
      ORDER BY id ASC
    `)

    const receiptStmt = db.prepare(`
      SELECT sale_id, printed_at, print_count
      FROM receipts
      WHERE sale_id = ?
    `)

    return {
      sale: saleStmt.get(saleId) || null,
      items: itemsStmt.all(saleId),
      receipt: receiptStmt.get(saleId) || null,
    }
  })

  ipcMain.handle('receipts:markPrinted', (_, saleId) => {
    const stmt = db.prepare(`
      UPDATE receipts
      SET printed_at = CURRENT_TIMESTAMP,
          print_count = print_count + 1
      WHERE sale_id = ?
    `)

    stmt.run(saleId)
    return { success: true }
  })
}

module.exports = { registerReceiptHandlers }
