import { create } from 'zustand';
import { db, getAllProductsWithStock, type Product, type Batch, type Category } from '../lib/db';
import { localInsert, localUpdate, localDelete } from '../lib/syncEngine';
import type { ProductFormData, BatchFormData, CategoryFormData } from '../lib/schemas';

// ─── Cart Item ────────────────────────────────────────────────────────────────
export interface CartItem {
  product: Product;
  quantity: number;
  unit_price: number;
  discount: number;
  batch_id?: string;
}

// ─── Inventory Store ──────────────────────────────────────────────────────────
interface InventoryState {
  products: Product[];
  batches: Batch[];
  categories: Category[];
  isLoading: boolean;

  loadAll: (userId: string) => Promise<void>;

  // Products
  addProduct: (userId: string, data: ProductFormData) => Promise<Product>;
  updateProduct: (id: string, data: Partial<ProductFormData>) => Promise<void>;
  deleteProduct: (id: string) => Promise<void>;

  // Batches (Stock In)
  addBatch: (userId: string, data: BatchFormData) => Promise<void>;
  updateBatch: (id: string, changes: Partial<Batch>) => Promise<void>;
  deleteBatch: (id: string) => Promise<void>;

  // Categories
  addCategory: (userId: string, data: CategoryFormData) => Promise<void>;
  updateCategory: (id: string, data: Partial<CategoryFormData>) => Promise<void>;
  deleteCategory: (id: string) => Promise<void>;

  // Computed helpers
  getProductBatches: (productId: string) => Batch[];
  getLowStockProducts: () => Product[];
  getExpiringBatches: (daysAhead?: number) => Batch[];
}

export const useInventoryStore = create<InventoryState>((set, get) => ({
  products: [],
  batches: [],
  categories: [],
  isLoading: false,

  loadAll: async (userId: string) => {
    set({ isLoading: true });
    try {
      const [products, batches, categories] = await Promise.all([
        getAllProductsWithStock(userId),
        db.batches.where('user_id').equals(userId).toArray(),
        db.categories.where('user_id').equals(userId).toArray(),
      ]);
      set({ products, batches, categories });
    } finally {
      set({ isLoading: false });
    }
  },

  // ── Products ─────────────────────────────────────────────────────────────

  addProduct: async (userId, data) => {
    const now = new Date().toISOString();
    const product: Product = {
      id: crypto.randomUUID(),
      user_id: userId,
      name: data.name,
      sku: data.sku ?? '',
      barcode: data.barcode ?? '',
      description: data.description ?? '',
      unit: data.unit,
      retail_price: data.retail_price,
      wholesale_price: data.wholesale_price,
      cost_price: data.cost_price,
      min_wholesale_qty: data.min_wholesale_qty,
      low_stock_threshold: data.low_stock_threshold,
      category_id: data.category_id,
      is_active: data.is_active ?? true,
      track_expiry: data.track_expiry ?? false,
      stock_quantity: 0,
      created_at: now,
      updated_at: now,
    };
    await localInsert('products', product);
    set((s) => ({ products: [...s.products, product] }));
    return product;
  },

  updateProduct: async (id, data) => {
    const existing = get().products.find((p) => p.id === id);
    if (!existing) return;
    const now = new Date().toISOString();
    const updated = { ...existing, ...data, updated_at: now };
    await localUpdate('products', id, data, updated);
    set((s) => ({ products: s.products.map((p) => (p.id === id ? updated : p)) }));
  },

  deleteProduct: async (id) => {
    await localDelete('products', id);
    set((s) => ({ products: s.products.filter((p) => p.id !== id) }));
  },

  // ── Batches ──────────────────────────────────────────────────────────────

  addBatch: async (userId, data) => {
    const now = new Date().toISOString();
    const batch: Batch = {
      id: crypto.randomUUID(),
      user_id: userId,
      product_id: data.product_id,
      batch_number: data.batch_number,
      quantity: data.quantity,
      cost_price: data.cost_price,
      expiry_date: data.expiry_date,
      manufacture_date: data.manufacture_date,
      supplier: data.supplier,
      notes: data.notes,
      created_at: now,
      updated_at: now,
    };
    await localInsert('batches', batch);

    // Also update the product's stock_quantity in state
    set((s) => ({
      batches: [...s.batches, batch],
      products: s.products.map((p) =>
        p.id === data.product_id
          ? { ...p, stock_quantity: (p.stock_quantity ?? 0) + data.quantity }
          : p
      ),
    }));
  },

  updateBatch: async (id, changes) => {
    const existing = get().batches.find((b) => b.id === id);
    if (!existing) return;
    const updated = { ...existing, ...changes, updated_at: new Date().toISOString() };
    await localUpdate('batches', id, changes, updated);

    const qtyDiff = (changes.quantity ?? existing.quantity) - existing.quantity;
    set((s) => ({
      batches: s.batches.map((b) => (b.id === id ? updated : b)),
      products: s.products.map((p) =>
        p.id === existing.product_id
          ? { ...p, stock_quantity: (p.stock_quantity ?? 0) + qtyDiff }
          : p
      ),
    }));
  },

  deleteBatch: async (id) => {
    const existing = get().batches.find((b) => b.id === id);
    await localDelete('batches', id);
    set((s) => ({
      batches: s.batches.filter((b) => b.id !== id),
      products: existing
        ? s.products.map((p) =>
            p.id === existing.product_id
              ? { ...p, stock_quantity: Math.max(0, (p.stock_quantity ?? 0) - existing.quantity) }
              : p
          )
        : s.products,
    }));
  },

  // ── Categories ───────────────────────────────────────────────────────────

  addCategory: async (userId, data) => {
    const now = new Date().toISOString();
    const category: Category = {
      id: crypto.randomUUID(),
      user_id: userId,
      name: data.name,
      color: data.color ?? '#6366f1',
      icon: data.icon,
      created_at: now,
      updated_at: now,
    };
    await localInsert('categories', category);
    set((s) => ({ categories: [...s.categories, category] }));
  },

  updateCategory: async (id, data) => {
    const existing = get().categories.find((c) => c.id === id);
    if (!existing) return;
    const updated = { ...existing, ...data, updated_at: new Date().toISOString() };
    await localUpdate('categories', id, data, updated);
    set((s) => ({ categories: s.categories.map((c) => (c.id === id ? updated : c)) }));
  },

  deleteCategory: async (id) => {
    await localDelete('categories', id);
    set((s) => ({ categories: s.categories.filter((c) => c.id !== id) }));
  },

  // ── Computed Helpers ─────────────────────────────────────────────────────

  getProductBatches: (productId) =>
    get().batches.filter((b) => b.product_id === productId),

  getLowStockProducts: () =>
    get().products.filter(
      (p) => p.is_active && (p.stock_quantity ?? 0) <= p.low_stock_threshold
    ),

  getExpiringBatches: (daysAhead = 30) => {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() + daysAhead);
    return get()
      .batches.filter(
        (b) => b.expiry_date && b.quantity > 0 && new Date(b.expiry_date) <= cutoff
      )
      .sort((a, b) => new Date(a.expiry_date!).getTime() - new Date(b.expiry_date!).getTime());
  },
}));

// ─── POS / Cart Store ─────────────────────────────────────────────────────────
interface POSState {
  cart: CartItem[];
  saleType: 'retail' | 'wholesale';
  discountAmount: number;
  discountType: 'amount' | 'percent';
  customerName: string;
  customerPhone: string;
  searchQuery: string;

  setSaleType: (t: 'retail' | 'wholesale') => void;
  setSearchQuery: (q: string) => void;
  setCustomer: (name: string, phone: string) => void;
  setDiscount: (amount: number, type: 'amount' | 'percent') => void;
  addToCart: (product: Product, batchId?: string) => void;
  removeFromCart: (productId: string) => void;
  updateQuantity: (productId: string, qty: number) => void;
  updateItemPrice: (productId: string, price: number) => void;
  clearCart: () => void;

  // Totals
  getSubtotal: () => number;
  getDiscountValue: () => number;
  getTotal: (taxRate?: number) => number;
}

export const usePOSStore = create<POSState>((set, get) => ({
  cart: [],
  saleType: 'retail',
  discountAmount: 0,
  discountType: 'amount',
  customerName: '',
  customerPhone: '',
  searchQuery: '',

  setSaleType: (t) => {
    set({ saleType: t });
    // Update item prices based on sale type
    set((s) => ({
      cart: s.cart.map((item) => ({
        ...item,
        unit_price: t === 'wholesale' && item.quantity >= item.product.min_wholesale_qty
          ? item.product.wholesale_price
          : item.product.retail_price,
      })),
    }));
  },

  setSearchQuery: (q) => set({ searchQuery: q }),
  setCustomer: (name, phone) => set({ customerName: name, customerPhone: phone }),
  setDiscount: (amount, type) => set({ discountAmount: amount, discountType: type }),

  addToCart: (product, batchId) => {
    const { saleType, cart } = get();
    const existing = cart.find((i) => i.product.id === product.id);

    if (existing) {
      const newQty = existing.quantity + 1;
      const unit_price =
        saleType === 'wholesale' && newQty >= product.min_wholesale_qty
          ? product.wholesale_price
          : product.retail_price;
      set((s) => ({
        cart: s.cart.map((i) =>
          i.product.id === product.id ? { ...i, quantity: newQty, unit_price } : i
        ),
      }));
    } else {
      const unit_price = saleType === 'wholesale' ? product.wholesale_price : product.retail_price;
      set((s) => ({
        cart: [...s.cart, { product, quantity: 1, unit_price, discount: 0, batch_id: batchId }],
      }));
    }
  },

  removeFromCart: (productId) =>
    set((s) => ({ cart: s.cart.filter((i) => i.product.id !== productId) })),

  updateQuantity: (productId, qty) => {
    if (qty <= 0) {
      get().removeFromCart(productId);
      return;
    }
    const { saleType } = get();
    set((s) => ({
      cart: s.cart.map((i) => {
        if (i.product.id !== productId) return i;
        const unit_price =
          saleType === 'wholesale' && qty >= i.product.min_wholesale_qty
            ? i.product.wholesale_price
            : i.product.retail_price;
        return { ...i, quantity: qty, unit_price };
      }),
    }));
  },

  updateItemPrice: (productId, price) =>
    set((s) => ({
      cart: s.cart.map((i) =>
        i.product.id === productId ? { ...i, unit_price: price } : i
      ),
    })),

  clearCart: () =>
    set({ cart: [], discountAmount: 0, discountType: 'amount', customerName: '', customerPhone: '' }),

  getSubtotal: () => get().cart.reduce((sum, i) => sum + i.unit_price * i.quantity - i.discount, 0),

  getDiscountValue: () => {
    const { discountAmount, discountType } = get();
    const subtotal = get().getSubtotal();
    return discountType === 'percent' ? (subtotal * discountAmount) / 100 : discountAmount;
  },

  getTotal: (taxRate = 0) => {
    const subtotal = get().getSubtotal();
    const discount = get().getDiscountValue();
    const taxable = subtotal - discount;
    return taxable + (taxable * taxRate) / 100;
  },
}));
