export {};

declare global {
  interface Window {
    posAPI: {
      ping: () => string;
      products: {
        list: () => Promise<Product[]>;
        getAll: () => Promise<Product[]>;
        getById: (productId: number) => Promise<Product | null>;
        create: (
          product: Partial<Product>,
        ) => Promise<{ success: boolean; id: number }>;
        update: (
          product: Partial<Product> & { id: number },
        ) => Promise<{ success: boolean }>;
        deactivate: (productId: number) => Promise<{ success: boolean }>;
        activate: (productId: number) => Promise<{ success: boolean }>;
        updateStock: (payload: {
          productId: number;
          stockQty: number;
        }) => Promise<{ success: boolean }>;
        findBySku: (sku: string) => Promise<Product | null>;
        search: (term: string) => Promise<Product[]>;
      };
      checkout: {
        completeSale: (payload: CheckoutPayload) => Promise<CheckoutResult>;
      };
      receipts: {
        getBySaleId: (saleId: number) => Promise<ReceiptInfo | null>;
        markPrinted: (saleId: number) => Promise<{ success: boolean }>;
      };
      sales: {
        list: (filters?: SalesListFilters) => Promise<SalesListResponse>;
        getById: (saleId: number) => Promise<SaleDetails | null>;
      };
      dev: {
        seedProducts: () => Promise<{ success: boolean }>;
      };
    };
  }

  interface Product {
    id: number;
    sku?: string;
    name: string;
    category?: string;
    price: number;
    stock_qty: number;
    reorder_level: number;
    is_active: number;
  }

  interface CartItem {
    productId: number;
    name: string;
    price: number;
    quantity: number;
    sku?: string;
  }

  interface CheckoutPayload {
    items: Array<{ productId: number; quantity: number }>;
    paymentMethod: string;
    amountPaid: number;
    cashierName?: string;
    discount?: number;
    notes?: string;
  }

  interface CheckoutResult {
    success: boolean;
    saleId: number;
    receiptNumber: string;
    subtotal: number;
    discount: number;
    total: number;
    amountPaid: number;
    changeDue: number;
  }

  interface Sale {
    id: number;
    receipt_number: string;
    subtotal: number;
    discount: number;
    total: number;
    amount_paid: number;
    change_due: number;
    payment_method: string;
    cashier_name?: string | null;
    notes?: string | null;
    created_at: string;
  }

  interface SaleItem {
    id: number;
    sale_id: number;
    product_id: number;
    product_name_snapshot: string;
    unit_price: number;
    quantity: number;
    line_total: number;
  }

  interface ReceiptInfo {
    id: number;
    sale_id: number;
    printed_at?: string | null;
    print_count: number;
  }

  interface SaleDetails extends Sale {
    items: SaleItem[];
    receipt: ReceiptInfo | null;
  }

  interface SalesListFilters {
    page?: number;
    pageSize?: number;
    search?: string;
    paymentMethod?: string;
    dateFrom?: string;
    dateTo?: string;
  }

  interface SalesListResponse {
    data: Sale[];
    pagination: {
      page: number;
      pageSize: number;
      total: number;
      totalPages: number;
    };
  }
}
