import { useEffect, useMemo, useRef, useState } from "react";
import "../styles/checkout.css";

type LastSale = {
  saleId: number;
  receiptNumber: string;
  changeDue: number;
  total: number;
  amountPaid: number;
} | null;

export default function CheckoutPage() {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [amountPaid, setAmountPaid] = useState<string>("");
  const [message, setMessage] = useState<string>("");
  const [searchInput, setSearchInput] = useState<string>("");
  const [suggestions, setSuggestions] = useState<Product[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState<number>(-1);
  const [lastSale, setLastSale] = useState<LastSale>(null);

  const searchRef = useRef<HTMLInputElement | null>(null);
  const searchBoxRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    searchRef.current?.focus();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        searchBoxRef.current &&
        !searchBoxRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
        setHighlightedIndex(-1);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const term = searchInput.trim();

    if (!term) {
      setSuggestions([]);
      setShowSuggestions(false);
      setHighlightedIndex(-1);
      return;
    }

    const timeout = setTimeout(async () => {
      try {
        const results = await window.posAPI.products.search(term);
        setSuggestions(results);
        setShowSuggestions(results.length > 0);
        setHighlightedIndex(results.length > 0 ? 0 : -1);
      } catch (error) {
        console.error(error);
      }
    }, 120);

    return () => clearTimeout(timeout);
  }, [searchInput]);

  const subtotal = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  }, [cart]);

  const totalItems = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.quantity, 0);
  }, [cart]);

  const amountPaidValue = useMemo(() => {
    const parsed = Number(amountPaid);
    return Number.isFinite(parsed) ? parsed : 0;
  }, [amountPaid]);

  const changeDue = Math.max(0, amountPaidValue - subtotal);
  const balanceDue = Math.max(0, subtotal - amountPaidValue);

  function setInfo(text: string) {
    setMessage(text);
  }

  function clearMessage() {
    setMessage("");
  }

  function addToCart(product: Product) {
    const existing = cart.find((x) => x.productId === product.id);
    const nextQty = existing ? existing.quantity + 1 : 1;

    if (nextQty > product.stock_qty) {
      setInfo(`Not enough stock for ${product.name}`);
      return;
    }

    clearMessage();

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
          sku: product.sku,
        },
      ];
    });

    setSearchInput("");
    setSuggestions([]);
    setShowSuggestions(false);
    setHighlightedIndex(-1);
    searchRef.current?.focus();
  }

  async function getLatestProduct(productId: number) {
    const all = await window.posAPI.products.getAll();
    return all.find((p) => p.id === productId) || null;
  }

  async function changeQty(productId: number, qty: number) {
    const product = await getLatestProduct(productId);
    if (!product) return;

    if (qty <= 0) {
      removeFromCart(productId);
      return;
    }

    if (qty > product.stock_qty) {
      setInfo(`Only ${product.stock_qty} left for ${product.name}`);
      return;
    }

    clearMessage();

    setCart((prev) =>
      prev.map((x) =>
        x.productId === productId ? { ...x, quantity: qty } : x,
      ),
    );
  }

  function incrementQty(productId: number) {
    const cartItem = cart.find((item) => item.productId === productId);
    if (!cartItem) return;
    void changeQty(productId, cartItem.quantity + 1);
  }

  function decrementQty(productId: number) {
    const cartItem = cart.find((item) => item.productId === productId);
    if (!cartItem) return;
    void changeQty(productId, cartItem.quantity - 1);
  }

  function removeFromCart(productId: number) {
    setCart((prev) => prev.filter((x) => x.productId !== productId));
    clearMessage();
    searchRef.current?.focus();
  }

  async function handleSearchSubmit() {
    const code = searchInput.trim();

    if (!code) return;

    try {
      const exactProduct = await window.posAPI.products.findBySku(code);

      if (exactProduct) {
        addToCart(exactProduct);
        return;
      }

      const results = await window.posAPI.products.search(code);

      if (results.length === 1) {
        addToCart(results[0]);
        return;
      }

      if (results.length > 0) {
        setSuggestions(results);
        setShowSuggestions(true);
        setHighlightedIndex(0);
        setInfo("Select a matching product from the dropdown.");
        return;
      }

      setInfo(`No product found for: ${code}`);
      setSuggestions([]);
      setShowSuggestions(false);
      setHighlightedIndex(-1);
      searchRef.current?.focus();
    } catch (error: any) {
      setInfo(error.message || "Product lookup failed");
      searchRef.current?.focus();
    }
  }

  function handleSuggestionSelect(product: Product) {
    addToCart(product);
  }

  async function handleCheckout() {
    try {
      const result = await window.posAPI.checkout.completeSale({
        items: cart.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
        })),
        paymentMethod: "cash",
        amountPaid: amountPaidValue,
        cashierName: "Bubezi",
        discount: 0,
      });

      setLastSale({
        saleId: result.saleId,
        receiptNumber: result.receiptNumber,
        changeDue: result.changeDue,
        total: result.total,
        amountPaid: result.amountPaid,
      });

      setInfo(
        `Sale complete. Receipt: ${result.receiptNumber}. Change: ${result.changeDue}`,
      );

      setCart([]);
      setAmountPaid("");
      setSearchInput("");
      setSuggestions([]);
      setShowSuggestions(false);
      setHighlightedIndex(-1);
      searchRef.current?.focus();
    } catch (error: any) {
      setInfo(error.message || "Checkout failed");
    }
  }

  async function handleViewReceipt() {
    if (!lastSale) return;

    try {
      await window.posAPI.receipts.preview(lastSale.saleId);
    } catch (error: any) {
      setInfo(error.message || "Failed to preview receipt");
    }
  }

  async function handlePrintReceipt() {
    if (!lastSale) return;

    try {
      await window.posAPI.receipts.print(lastSale.saleId);
      setInfo(`Printing receipt ${lastSale.receiptNumber}...`);
    } catch (error: any) {
      setInfo(error.message || "Failed to print receipt");
    }
  }

  async function handleSavePdf() {
    if (!lastSale) return;

    try {
      const result = await window.posAPI.receipts.savePdf(lastSale.saleId);

      if (result.success) {
        setInfo(
          `Receipt saved as PDF${result.filePath ? `: ${result.filePath}` : ""}`,
        );
      }
    } catch (error: any) {
      setInfo(error.message || "Failed to save receipt as PDF");
    }
  }

  return (
    <div className="checkout-page checkout-page-single">
      <header className="topbar">
        <div>
          <h1>WigsnStyle POS</h1>
          <p className="muted">
            Scan barcode or search by name, SKU, or category.
          </p>
        </div>
      </header>

      <section className="scan-panel">
        <div className="scan-input-wrap search-box" ref={searchBoxRef}>
          <label htmlFor="productSearch" className="label">
            Scan barcode / search product
          </label>

          <input
            id="productSearch"
            ref={searchRef}
            className="input input-lg"
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onFocus={() => {
              if (suggestions.length > 0) setShowSuggestions(true);
            }}
            onKeyDown={(e) => {
              if (!showSuggestions || suggestions.length === 0) {
                if (e.key === "Enter") {
                  e.preventDefault();
                  void handleSearchSubmit();
                }
                return;
              }

              if (e.key === "ArrowDown") {
                e.preventDefault();
                setHighlightedIndex((prev) =>
                  prev < suggestions.length - 1 ? prev + 1 : prev,
                );
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : 0));
              } else if (e.key === "Enter") {
                e.preventDefault();

                if (
                  highlightedIndex >= 0 &&
                  highlightedIndex < suggestions.length
                ) {
                  handleSuggestionSelect(suggestions[highlightedIndex]);
                } else {
                  void handleSearchSubmit();
                }
              } else if (e.key === "Escape") {
                setShowSuggestions(false);
                setHighlightedIndex(-1);
              }
            }}
            placeholder="Scan barcode or type product name"
            autoComplete="off"
          />

          {showSuggestions && suggestions.length > 0 && (
            <div className="suggestions-dropdown">
              {suggestions.map((product, index) => (
                <button
                  key={product.id}
                  type="button"
                  className={`suggestion-item ${
                    index === highlightedIndex ? "active" : ""
                  }`}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => handleSuggestionSelect(product)}
                >
                  <div className="suggestion-main">
                    <strong>{product.name}</strong>
                    <span className="suggestion-meta">
                      SKU: {product.sku || "-"} · {product.category || "-"}
                    </span>
                  </div>
                  <div className="suggestion-side">
                    <span>KES {Number(product.price).toFixed(2)}</span>
                    <span>Stock: {product.stock_qty}</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        <button className="button" onClick={() => void handleSearchSubmit()}>
          Add
        </button>
      </section>

      {message && <div className="alert">{message}</div>}

      <section className="panel cart-panel cart-panel-wide">
        <div className="panel-header">
          <h2>Cart</h2>
          <span className="badge">{totalItems} pcs</span>
        </div>

        <div className="cart-list">
          {cart.length === 0 && <p className="empty">Cart is empty.</p>}

          {cart.map((item) => (
            <article key={item.productId} className="cart-card">
              <div className="cart-main">
                <strong className="product-title">{item.name}</strong>
                <div className="product-meta">
                  <span>SKU: {item.sku || "-"}</span>
                  <span>KES {item.price.toFixed(2)} each</span>
                </div>
              </div>

              <div className="cart-controls">
                <div className="qty-control">
                  <button
                    className="qty-btn"
                    onClick={() => decrementQty(item.productId)}
                  >
                    −
                  </button>

                  <input
                    className="qty-input"
                    type="number"
                    value={item.quantity}
                    min={1}
                    onChange={(e) =>
                      void changeQty(item.productId, Number(e.target.value))
                    }
                  />

                  <button
                    className="qty-btn"
                    onClick={() => incrementQty(item.productId)}
                  >
                    +
                  </button>
                </div>

                <div className="line-total">
                  KES {(item.price * item.quantity).toFixed(2)}
                </div>

                <button
                  className="button danger"
                  onClick={() => removeFromCart(item.productId)}
                >
                  Remove
                </button>
              </div>
            </article>
          ))}
        </div>

        <div className="checkout-bottom-grid">
          <div className="summary-card">
            <div className="summary-row">
              <span>Items</span>
              <strong>{totalItems}</strong>
            </div>

            <div className="summary-row">
              <span>Total</span>
              <strong>KES {subtotal.toFixed(2)}</strong>
            </div>

            <div className="summary-row">
              <label htmlFor="amountPaid">Amount paid</label>
              <input
                id="amountPaid"
                className="input"
                type="number"
                inputMode="decimal"
                placeholder="Enter amount"
                value={amountPaid}
                onChange={(e) => setAmountPaid(e.target.value)}
                min={0}
              />
            </div>

            <div className="summary-row">
              <span>Remaining</span>
              <strong>KES {balanceDue.toFixed(2)}</strong>
            </div>

            <div className="summary-row">
              <span>Change</span>
              <strong>KES {changeDue.toFixed(2)}</strong>
            </div>

            <button
              className="button checkout-button"
              onClick={() => void handleCheckout()}
              disabled={cart.length === 0 || amountPaidValue < subtotal}
            >
              Complete Sale
            </button>
          </div>

          <div className="receipt-card">
            <div className="panel-header receipt-header">
              <h3>Receipt</h3>
              {lastSale && <span className="badge">Ready</span>}
            </div>

            <div className="receipt-details">
              <div className="summary-row">
                <span>Change</span>
                <strong>KES {changeDue.toFixed(2)}</strong>
              </div>

              <div className="summary-row">
                <span>Last receipt</span>
                <strong>{lastSale?.receiptNumber || "-"}</strong>
              </div>

              <div className="summary-row">
                <span>Paid</span>
                <strong>
                  KES {(lastSale?.amountPaid ?? amountPaidValue).toFixed(2)}
                </strong>
              </div>

              <div className="summary-row">
                <span>Sale total</span>
                <strong>KES {(lastSale?.total ?? subtotal).toFixed(2)}</strong>
              </div>
            </div>

            <div className="receipt-actions">
              <button
                className="button secondary"
                onClick={() => void handleViewReceipt()}
                disabled={!lastSale}
              >
                Preview Receipt
              </button>

              <button
                className="button"
                onClick={() => void handlePrintReceipt()}
                disabled={!lastSale}
              >
                Print Receipt
              </button>

              <button
                className="button secondary"
                onClick={() => void handleSavePdf()}
                disabled={!lastSale}
              >
                Save PDF
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
