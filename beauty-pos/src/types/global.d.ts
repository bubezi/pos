export {};

declare global {
  interface Window {
    posAPI: {
      ping: () => string;
      products: {
        list: () => Promise<Product[]>;
        create: (
          product: Partial<Product>,
        ) => Promise<{ success: boolean; id: number }>;
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
        getBySaleId: (saleId: number) => Promise<any>;
        markPrinted: (saleId: number) => Promise<any>;
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
}
