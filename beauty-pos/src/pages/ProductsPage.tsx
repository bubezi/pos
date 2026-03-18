import { useEffect, useMemo, useState } from "react";
import "../styles/products.css";

type ProductFormState = {
  id: number | null;
  sku: string;
  name: string;
  category: string;
  price: string;
  stock_qty: string;
  reorder_level: string;
};

type StatusFilter = "all" | "active" | "inactive";

const emptyForm: ProductFormState = {
  id: null,
  sku: "",
  name: "",
  category: "",
  price: "",
  stock_qty: "",
  reorder_level: "",
};

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [message, setMessage] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [form, setForm] = useState<ProductFormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);

  async function loadProducts() {
    try {
      const data = await window.posAPI.products.getAll();
      setProducts(data);
    } catch (error) {
      console.error(error);
      setMessage("Failed to load products.");
    }
  }

  useEffect(() => {
    loadProducts();
  }, []);

  const filteredProducts = useMemo(() => {
    const term = search.trim().toLowerCase();

    return products.filter((product) => {
      const matchesSearch =
        !term ||
        String(product.name || "")
          .toLowerCase()
          .includes(term) ||
        String(product.sku || "")
          .toLowerCase()
          .includes(term) ||
        String(product.category || "")
          .toLowerCase()
          .includes(term);

      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && product.is_active === 1) ||
        (statusFilter === "inactive" && product.is_active === 0);

      return matchesSearch && matchesStatus;
    });
  }, [products, search, statusFilter]);

  function updateForm<K extends keyof ProductFormState>(
    key: K,
    value: ProductFormState[K],
  ) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function resetForm() {
    setForm(emptyForm);
  }

  function openAddForm() {
    resetForm();
    setMessage("");
    setIsFormOpen(true);
  }

  function closeForm() {
    resetForm();
    setIsFormOpen(false);
  }

  function startEdit(product: Product) {
    setForm({
      id: product.id,
      sku: product.sku || "",
      name: product.name || "",
      category: product.category || "",
      price: String(product.price ?? ""),
      stock_qty: String(product.stock_qty ?? ""),
      reorder_level: String(product.reorder_level ?? ""),
    });
    setMessage(`Editing ${product.name}`);
    setIsFormOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    try {
      setSaving(true);
      setMessage("");

      const payload = {
        sku: form.sku.trim(),
        name: form.name.trim(),
        category: form.category.trim(),
        price: Number(form.price || 0),
        stock_qty: Number(form.stock_qty || 0),
        reorder_level: Number(form.reorder_level || 0),
      };

      if (!payload.name) {
        setMessage("Product name is required.");
        return;
      }

      if (form.id) {
        await window.posAPI.products.update({
          id: form.id,
          ...payload,
        });
        setMessage("Product updated.");
      } else {
        await window.posAPI.products.create(payload);
        setMessage("Product created.");
      }

      closeForm();
      await loadProducts();
    } catch (error: any) {
      setMessage(error.message || "Failed to save product.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDeactivate(productId: number, productName: string) {
    const ok = window.confirm(`Deactivate "${productName}"?`);
    if (!ok) return;

    try {
      await window.posAPI.products.deactivate(productId);
      setMessage(`${productName} deactivated.`);
      if (form.id === productId) {
        closeForm();
      }
      await loadProducts();
    } catch (error: any) {
      setMessage(error.message || "Failed to deactivate product.");
    }
  }

  async function handleActivate(productId: number, productName: string) {
    try {
      await window.posAPI.products.activate(productId);
      setMessage(`${productName} activated.`);
      await loadProducts();
    } catch (error: any) {
      setMessage(error.message || "Failed to activate product.");
    }
  }

  return (
    <div className="products-page">
      <section className="panel">
        <div className="panel-header products-toolbar">
          <div>
            <h2>Manage Products</h2>
            <p className="toolbar-subtext">
              Add, edit, deactivate, and reactivate products.
            </p>
          </div>

          <div className="toolbar-actions">
            <button className="button" onClick={openAddForm}>
              Add Product
            </button>

            <select
              className="input filter-select"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
            >
              <option value="all">All</option>
              <option value="active">Active only</option>
              <option value="inactive">Inactive only</option>
            </select>

            <input
              className="input products-search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, SKU, category..."
            />
          </div>
        </div>

        {message && <div className="alert">{message}</div>}

        <div className="products-table-wrap">
          <table className="products-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>SKU</th>
                <th>Category</th>
                <th>Price</th>
                <th>Stock</th>
                <th>Reorder</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>

            <tbody>
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={8} className="empty-cell">
                    No products found.
                  </td>
                </tr>
              ) : (
                filteredProducts.map((product) => (
                  <tr key={product.id}>
                    <td>{product.name}</td>
                    <td>{product.sku || "-"}</td>
                    <td>{product.category || "-"}</td>
                    <td>KES {Number(product.price).toFixed(2)}</td>
                    <td>{product.stock_qty}</td>
                    <td>{product.reorder_level}</td>
                    <td>
                      <span
                        className={
                          product.is_active
                            ? "status-active"
                            : "status-inactive"
                        }
                      >
                        {product.is_active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="action-cell">
                      <button
                        className="button secondary small"
                        onClick={() => startEdit(product)}
                      >
                        Edit
                      </button>

                      {product.is_active === 1 ? (
                        <button
                          className="button danger small"
                          onClick={() =>
                            handleDeactivate(product.id, product.name)
                          }
                        >
                          Deactivate
                        </button>
                      ) : (
                        <button
                          className="button success small"
                          onClick={() =>
                            handleActivate(product.id, product.name)
                          }
                        >
                          Activate
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {isFormOpen && (
        <div className="product-drawer-backdrop" onClick={closeForm}>
          <aside
            className="product-drawer"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="drawer-header">
              <h2>{form.id ? "Edit Product" : "Add Product"}</h2>
              <button className="button secondary small" onClick={closeForm}>
                Close
              </button>
            </div>

            <form className="product-form" onSubmit={handleSubmit}>
              <div className="form-grid">
                <label>
                  <span>SKU / Barcode</span>
                  <input
                    className="input"
                    value={form.sku}
                    onChange={(e) => updateForm("sku", e.target.value)}
                    placeholder="616110000001"
                  />
                </label>

                <label>
                  <span>Name</span>
                  <input
                    className="input"
                    value={form.name}
                    onChange={(e) => updateForm("name", e.target.value)}
                    placeholder="Hair Oil"
                    required
                  />
                </label>

                <label>
                  <span>Category</span>
                  <input
                    className="input"
                    value={form.category}
                    onChange={(e) => updateForm("category", e.target.value)}
                    placeholder="Haircare"
                  />
                </label>

                <label>
                  <span>Price</span>
                  <input
                    className="input"
                    type="number"
                    min={0}
                    step="0.01"
                    value={form.price}
                    onChange={(e) => updateForm("price", e.target.value)}
                    placeholder="500"
                  />
                </label>

                <label>
                  <span>Stock Qty</span>
                  <input
                    className="input"
                    type="number"
                    min={0}
                    step="1"
                    value={form.stock_qty}
                    onChange={(e) => updateForm("stock_qty", e.target.value)}
                    placeholder="12"
                  />
                </label>

                <label>
                  <span>Reorder Level</span>
                  <input
                    className="input"
                    type="number"
                    min={0}
                    step="1"
                    value={form.reorder_level}
                    onChange={(e) =>
                      updateForm("reorder_level", e.target.value)
                    }
                    placeholder="4"
                  />
                </label>
              </div>

              <div className="form-actions">
                <button className="button" type="submit" disabled={saving}>
                  {saving
                    ? "Saving..."
                    : form.id
                      ? "Update Product"
                      : "Add Product"}
                </button>

                <button
                  className="button secondary"
                  type="button"
                  onClick={resetForm}
                >
                  Clear
                </button>
              </div>
            </form>
          </aside>
        </div>
      )}
    </div>
  );
}
