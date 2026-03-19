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
        preview: (saleId: number) => Promise<{ success: boolean }>;
        print: (saleId: number) => Promise<{ success: boolean }>;
        savePdf: (
          saleId: number,
        ) => Promise<{ success: boolean; filePath?: string }>;
      };
      sales: {
        list: (filters?: SalesListFilters) => Promise<SalesListResponse>;
        getById: (saleId: number) => Promise<SaleDetails | null>;
      };
      auth: {
        login: (payload: { username: string; password: string }) => Promise<{
          success: boolean;
          user: AuthUser;
          mustChangePassword: boolean;
        }>;
        logout: () => Promise<{ success: boolean }>;
        getSession: () => Promise<AuthUser | null>;
        changePassword: (payload: {
          currentPassword: string;
          newPassword: string;
        }) => Promise<{ success: boolean }>;
      };
      users: {
        list: () => Promise<AuthUser[]>;
        create: (payload: {
          fullName: string;
          username: string;
          password: string;
          role: UserRole;
        }) => Promise<{ success: boolean; id: number }>;
        update: (payload: {
          id: number;
          fullName: string;
          username: string;
          role: UserRole;
          isActive: boolean;
        }) => Promise<{ success: boolean }>;
        changePassword: (payload: {
          id: number;
          newPassword: string;
        }) => Promise<{ success: boolean }>;
        setMustChangePassword: (payload: {
          id: number;
          mustChangePassword: boolean;
        }) => Promise<{ success: boolean }>;
      };
      dashboard: {
        getSummary: () => Promise<DashboardSummary>;
      };
      settings: {
        getSessionTimeout: () => Promise<{
          sessionTimeoutMinutes: number;
        }>;
        setSessionTimeout: (payload: {
          sessionTimeoutMinutes: number;
        }) => Promise<{ success: boolean }>;
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

  interface ReceiptSale {
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

  interface ReceiptSaleItem {
    product_id: number;
    product_name_snapshot: string;
    unit_price: number;
    quantity: number;
    line_total: number;
  }

  interface ReceiptInfo {
    sale_id: number;
    printed_at?: string | null;
    print_count: number;
  }

  interface ReceiptData {
    sale: ReceiptSale | null;
    items: ReceiptSaleItem[];
    receipt: ReceiptInfo | null;
  }

  type UserRole = "admin" | "cashier";

  interface AuthUser {
    id: number;
    full_name: string;
    username: string;
    role: UserRole;
    is_active: number;
    created_at: string;
    updated_at: string;
    must_change_password: boolean;
  }
  interface DashboardSummary {
    inventory: {
      totalProducts: number;
      activeProducts: number;
      inactiveProducts: number;
      lowStockProducts: number;
      outOfStockProducts: number;
      totalUnits: number;
      inventoryValue: number;
    };
    sales: {
      today: {
        count: number;
        total: number;
      };
      thisMonth: {
        count: number;
        total: number;
      };
      overall: {
        count: number;
        total: number;
      };
    };
    recentSales: Array<{
      id: number;
      receipt_number: string;
      total: number;
      payment_method: string;
      cashier_name?: string | null;
      created_at: string;
    }>;
    settings: {
      sessionTimeoutMinutes: number;
    };
  }
}
