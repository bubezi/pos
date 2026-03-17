const Database = require('better-sqlite3')
const path = require('path')
const { app } = require('electron')
const fs = require('fs')

const userDataPath = app.getPath('userData')
const dbPath = path.join(userDataPath, 'beauty-pos.sqlite')
const schemaPath = path.join(__dirname, 'sql', 'schema.sql')

if (!fs.existsSync(userDataPath)) {
  fs.mkdirSync(userDataPath, { recursive: true })
}

const db = new Database(dbPath)
db.pragma('journal_mode = WAL')
db.pragma('foreign_keys = ON')

const schemaSql = fs.readFileSync(schemaPath, 'utf8')
db.exec(schemaSql)

module.exports = db
