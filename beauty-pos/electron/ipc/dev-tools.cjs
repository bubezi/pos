const { ipcMain } = require("electron");
const db = require("../db.cjs");

function registerDevToolHandlers() {
  ipcMain.handle("dev:seedProducts", () => {
    const insert = db.prepare(`
      INSERT OR IGNORE INTO products
      (sku, name, category, price, stock_qty, reorder_level)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    const mockProducts = [
      ["616110000001", "Brazilian Wig 10 inch", "Wigs", 3500, 8, 2],
      ["616110000002", "Brazilian Wig 14 inch", "Wigs", 4800, 10, 3],
      ["616110000003", "Brazilian Wig 18 inch", "Wigs", 6200, 6, 2],
      ["616110000004", "Bone Straight Wig 12 inch", "Wigs", 5200, 5, 2],
      ["616110000005", "Bone Straight Wig 16 inch", "Wigs", 6800, 4, 2],
      ["616110000006", "Curly Wig 14 inch", "Wigs", 5400, 7, 2],
      ["616110000007", "Pixie Wig", "Wigs", 2600, 9, 3],
      ["616110000008", "Full Frontal Wig 20 inch", "Wigs", 9200, 3, 1],

      ["616110000009", "Closure 10 inch", "Closures", 1800, 12, 4],
      ["616110000010", "Closure 14 inch", "Closures", 2400, 9, 3],
      ["616110000011", "Frontal 13x4 16 inch", "Frontals", 3800, 6, 2],
      ["616110000012", "Frontal 13x6 18 inch", "Frontals", 4700, 5, 2],

      ["616110000013", "Body Wave Bundle 10 inch", "Bundles", 1300, 20, 5],
      ["616110000014", "Body Wave Bundle 14 inch", "Bundles", 1800, 18, 5],
      ["616110000015", "Body Wave Bundle 18 inch", "Bundles", 2400, 12, 4],
      ["616110000016", "Deep Wave Bundle 20 inch", "Bundles", 3200, 9, 3],
      ["616110000017", "Straight Bundle 22 inch", "Bundles", 3500, 7, 3],

      ["616110000018", "Hair Oil 100ml", "Haircare", 500, 25, 6],
      ["616110000019", "Hair Serum", "Haircare", 650, 18, 5],
      ["616110000020", "Wig Shampoo", "Haircare", 850, 15, 4],
      ["616110000021", "Wig Conditioner", "Haircare", 900, 14, 4],
      ["616110000022", "Heat Protect Spray", "Haircare", 780, 16, 4],
      ["616110000023", "Lace Tint Spray", "Haircare", 950, 11, 3],
      ["616110000024", "Edge Control", "Haircare", 400, 22, 6],
      ["616110000025", "Mousse Foam", "Haircare", 700, 17, 5],

      ["616110000026", "Hair Brush Small", "Accessories", 250, 30, 8],
      ["616110000027", "Hair Brush Large", "Accessories", 450, 18, 5],
      ["616110000028", "Wig Cap Black", "Accessories", 150, 40, 10],
      ["616110000029", "Wig Cap Brown", "Accessories", 150, 36, 10],
      ["616110000030", "Elastic Band", "Accessories", 120, 50, 12],
      ["616110000031", "T-Pins Pack", "Accessories", 180, 24, 6],
      ["616110000032", "Mannequin Head", "Accessories", 1600, 8, 2],
      ["616110000033", "Hot Comb", "Accessories", 2100, 5, 2],
      ["616110000034", "Curling Wand", "Accessories", 2800, 4, 2],

      ["616110000035", "Lip Gloss Nude", "Beauty", 350, 28, 8],
      ["616110000036", "Lip Gloss Clear", "Beauty", 300, 32, 8],
      ["616110000037", "Foundation Shade 1", "Beauty", 950, 10, 3],
      ["616110000038", "Foundation Shade 2", "Beauty", 950, 11, 3],
      ["616110000039", "Foundation Shade 3", "Beauty", 950, 9, 3],
      ["616110000040", "Face Powder", "Beauty", 700, 14, 4],
      ["616110000041", "Setting Spray", "Beauty", 850, 13, 4],
      ["616110000042", "Mascara", "Beauty", 600, 20, 5],
      ["616110000043", "Lashes Premium", "Beauty", 450, 26, 6],
      ["616110000044", "Brow Pencil", "Beauty", 250, 34, 8],

      ["616110000045", "Satin Bonnet Small", "Bonnets", 400, 19, 5],
      ["616110000046", "Satin Bonnet Large", "Bonnets", 550, 14, 4],
      ["616110000047", "Silk Scarf", "Bonnets", 650, 13, 4],
      ["616110000048", "Durag Black", "Bonnets", 300, 21, 6],
      ["616110000049", "Durag Red", "Bonnets", 300, 17, 5],
      ["616110000050", "Bonnet and Scarf Set", "Bonnets", 850, 10, 3],
    ];

    const tx = db.transaction(() => {
      for (const product of mockProducts) {
        insert.run(...product);
      }
    });

    tx();
    return { success: true, count: mockProducts.length };
  });
}

module.exports = { registerDevToolHandlers };