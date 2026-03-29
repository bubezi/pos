ALTER TABLE products
ADD COLUMN buying_price NUMERIC NOT NULL DEFAULT 0 CHECK (buying_price >= 0);
