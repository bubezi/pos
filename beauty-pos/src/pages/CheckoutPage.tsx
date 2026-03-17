import { useEffect, useMemo, useState } from "react";

export default function CheckoutPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [amountPaid, setAmountPaid] = useState<number>(0);
  const [message, setMessage] = useState<string>("");

  async function loadProducts() {
    try {
      const data = await window.posAPI.products.list();
      setProducts(data);
    } catch (error) {
      console.error(error);
      setMessage("Failed to load products.");
    }
  }

  useEffect(() => {
    loadProducts();
  }, []);

  const total = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  }, [cart]);

  function addToCart(product: Product) {
    const existing = cart.find((x) => x.productId === product.id);
    const nextQty = existing ? existing.quantity + 1 : 1;

    if (nextQty > product.stock_qty) {
      setMessage(`Not enough stock for ${product.name}`);
      return;
    }

    setMessage("");
    setCart((prev) => {
      if (existing) {
        return prev.map((x) =>
          x.productId === product.id ? { ...x, quantity: x.quantity + 1 } : x,
        );
      }

      return [
        ...prev,
        {
          productId: product.id,
          name: product.name,
          price: Number(product.price),
          quantity: 1,
        },
      ];
    });
  }

  function changeQty(productId: number, qty: number) {
    const product = products.find((p) => p.id === productId);
    if (!product) return;

    if (qty <= 0) {
      setCart((prev) => prev.filter((x) => x.productId !== productId));
      return;
    }

    if (qty > product.stock_qty) {
      setMessage(`Only ${product.stock_qty} left for ${product.name}`);
      return;
    }

    setMessage("");
    setCart((prev) =>
      prev.map((x) =>
        x.productId === productId ? { ...x, quantity: qty } : x,
      ),
    );
  }

  async function handleSeed() {
    try {
      await window.posAPI.dev.seedProducts();
      await loadProducts();
      setMessage("Sample products added.");
    } catch (error: any) {
      setMessage(error.message || "Seeding failed");
    }
  }

  async function handleCheckout() {
    try {
      const result = await window.posAPI.checkout.completeSale({
        items: cart.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
        })),
        paymentMethod: "cash",
        amountPaid,
        cashierName: "Bubezi",
        discount: 0,
      });

      setMessage(
        `Sale complete. Receipt: ${result.receiptNumber}. Change: ${result.changeDue}`,
      );
      setCart([]);
      setAmountPaid(0);
      await loadProducts();
    } catch (error: any) {
      setMessage(error.message || "Checkout failed");
    }
  }

  return (
    <div style={{ padding: 20 }}>
      <h1>Checkout</h1>

      <div style={{ marginBottom: 16 }}>
        <button onClick={handleSeed}>Seed Sample Products</button>
      </div>

      <div style={{ display: "flex", gap: 24 }}>
        <div style={{ flex: 1 }}>
          <h2>Products</h2>
          {products.length === 0 && <p>No products yet.</p>}

          {products.map((product) => (
            <div
              key={product.id}
              style={{
                border: "1px solid #ccc",
                marginBottom: 8,
                padding: 10,
                borderRadius: 8,
              }}
            >
              <strong>{product.name}</strong>
              <div>Category: {product.category || "-"}</div>
              <div>Price: {product.price}</div>
              <div>Stock: {product.stock_qty}</div>
              <button
                onClick={() => addToCart(product)}
                disabled={product.stock_qty <= 0}
              >
                Add
              </button>
            </div>
          ))}
        </div>

        <div style={{ flex: 1 }}>
          <h2>Cart</h2>
          {cart.length === 0 && <p>Cart is empty.</p>}

          {cart.map((item) => (
            <div key={item.productId} style={{ marginBottom: 10 }}>
              <strong>{item.name}</strong>
              <div>Price: {item.price}</div>
              <div>
                Qty:
                <input
                  type="number"
                  value={item.quantity}
                  min={1}
                  onChange={(e) =>
                    changeQty(item.productId, Number(e.target.value))
                  }
                  style={{ marginLeft: 8, width: 70 }}
                />
              </div>
              <div>Line total: {item.price * item.quantity}</div>
            </div>
          ))}

          <hr />
          <div>Total: {total}</div>

          <div style={{ marginTop: 10 }}>
            <label>
              Amount paid:
              <input
                type="number"
                value={amountPaid}
                onChange={(e) => setAmountPaid(Number(e.target.value))}
                style={{ marginLeft: 8 }}
              />
            </label>
          </div>

          <button
            onClick={handleCheckout}
            disabled={cart.length === 0}
            style={{ marginTop: 16 }}
          >
            Complete Sale
          </button>

          {message && <p style={{ marginTop: 16 }}>{message}</p>}
        </div>
      </div>
    </div>
  );
}
