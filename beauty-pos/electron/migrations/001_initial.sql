PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS products (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  sku TEXT UNIQUE,
  name TEXT NOT NULL,
  category TEXT,
  price NUMERIC NOT NULL CHECK (price >= 0),
  stock_qty INTEGER NOT NULL DEFAULT 0 CHECK (stock_qty >= 0),
  reorder_level INTEGER NOT NULL DEFAULT 0 CHECK (reorder_level >= 0),
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS sales (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  receipt_number TEXT NOT NULL UNIQUE,
  subtotal NUMERIC NOT NULL CHECK (subtotal >= 0),
  discount NUMERIC NOT NULL DEFAULT 0 CHECK (discount >= 0),
  total NUMERIC NOT NULL CHECK (total >= 0),
  amount_paid NUMERIC NOT NULL CHECK (amount_paid >= 0),
  change_due NUMERIC NOT NULL DEFAULT 0 CHECK (change_due >= 0),
  payment_method TEXT NOT NULL, -- cash, mpesa, card
  cashier_name TEXT,
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS sale_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  sale_id INTEGER NOT NULL,
  product_id INTEGER NOT NULL,
  product_name_snapshot TEXT NOT NULL,
  unit_price NUMERIC NOT NULL CHECK (unit_price >= 0),
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  line_total NUMERIC NOT NULL CHECK (line_total >= 0),
  FOREIGN KEY (sale_id) REFERENCES sales(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id)
);

CREATE TABLE IF NOT EXISTS receipts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  sale_id INTEGER NOT NULL UNIQUE,
  printed_at TEXT,
  print_count INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (sale_id) REFERENCES sales(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS app_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_products_name ON products(name);
CREATE INDEX IF NOT EXISTS idx_sales_created_at ON sales(created_at);
CREATE INDEX IF NOT EXISTS idx_sale_items_sale_id ON sale_items(sale_id);
