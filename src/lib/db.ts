import Dexie, { type Table } from 'dexie';

// ─── Local Data Models ───────────────────────────────────────────────────────

export interface Profile {
  id: string;
  business_name: string;
  business_type: 'retail' | 'wholesale' | 'hybrid';
  currency: string;
  timezone: string;
  logo_url?: string;
  address?: string;
  phone?: string;
  email?: string;
  tax_rate: number;
  created_at: string;
  updated_at: string;
}

export interface Category {
  id: string;
  user_id: string;
  name: string;
  color: string;
  icon?: string;
  created_at: string;
  updated_at: string;
}

export interface Product {
  id: string;
  user_id: string;
  category_id?: string;
  name: string;
  sku?: string;
  barcode?: string;
  description?: string;
  unit: string;
  retail_price: number;
  wholesale_price: number;
  cost_price: number;
  min_wholesale_qty: number;
  low_stock_threshold: number;
  image_url?: string;
  is_active: boolean;
  track_expiry: boolean;
  // Computed locally from batches
  stock_quantity?: number;
  created_at: string;
  updated_at: string;
}

export interface Batch {
  id: string;
  user_id: string;
  product_id: string;
  batch_number: string;
  quantity: number;
  cost_price: number;
  manufacture_date?: string;
  expiry_date?: string;
  supplier?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface Sale {
  id: string;
  user_id: string;
  sale_number: string;
  sale_type: 'retail' | 'wholesale';
  customer_name?: string;
  customer_phone?: string;
  subtotal: number;
  discount_amount: number;
  discount_type: 'amount' | 'percent';
  tax_amount: number;
  total: number;
  amount_paid: number;
  change_given: number;
  payment_method: 'cash' | 'card' | 'mobile' | 'credit';
  payment_status: 'paid' | 'partial' | 'credit';
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface SaleItem {
  id: string;
  user_id: string;
  sale_id: string;
  product_id: string;
  batch_id?: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  cost_price: number;
  discount: number;
  total: number;
  created_at: string;
}

export interface Purchase {
  id: string;
  user_id: string;
  purchase_number: string;
  supplier?: string;
  notes?: string;
  total: number;
  payment_method: string;
  payment_status: string;
  created_at: string;
  updated_at: string;
}

export interface PurchaseItem {
  id: string;
  user_id: string;
  purchase_id: string;
  product_id: string;
  batch_id?: string;
  product_name: string;
  quantity: number;
  unit_cost: number;
  total: number;
  expiry_date?: string;
  batch_number?: string;
  created_at: string;
}

export interface Expense {
  id: string;
  user_id: string;
  category: string;
  description: string;
  amount: number;
  payment_method: string;
  reference?: string;
  notes?: string;
  expense_date: string;
  created_at: string;
  updated_at: string;
}

export interface SyncQueueItem {
  id: string;
  user_id: string;
  table_name: string;
  operation: 'INSERT' | 'UPDATE' | 'DELETE';
  record_id: string;
  payload: Record<string, unknown>;
  status: 'pending' | 'processing' | 'done' | 'failed';
  attempts: number;
  last_error?: string;
  created_at: string;
  processed_at?: string;
}

// ─── Dexie Database Class ────────────────────────────────────────────────────

class EzyOSDatabase extends Dexie {
  profiles!: Table<Profile>;
  categories!: Table<Category>;
  products!: Table<Product>;
  batches!: Table<Batch>;
  sales!: Table<Sale>;
  sale_items!: Table<SaleItem>;
  purchases!: Table<Purchase>;
  purchase_items!: Table<PurchaseItem>;
  expenses!: Table<Expense>;
  sync_queue!: Table<SyncQueueItem>;

  constructor() {
    super('EzyOS');

    this.version(1).stores({
      profiles: 'id, updated_at',
      categories: 'id, user_id, updated_at',
      products: 'id, user_id, category_id, barcode, sku, is_active, updated_at',
      batches: 'id, user_id, product_id, expiry_date, updated_at',
      sales: 'id, user_id, sale_number, created_at, payment_status, sale_type',
      sale_items: 'id, user_id, sale_id, product_id, created_at',
      purchases: 'id, user_id, purchase_number, created_at',
      purchase_items: 'id, user_id, purchase_id, product_id, created_at',
      expenses: 'id, user_id, expense_date, category, created_at',
      sync_queue: 'id, user_id, table_name, status, created_at',
    });
  }
}

export const db = new EzyOSDatabase();

// ─── Helper: Calculate product stock from batches ─────────────────────────

export async function getProductStock(productId: string): Promise<number> {
  const batches = await db.batches
    .where('product_id')
    .equals(productId)
    .toArray();
  return batches.reduce((sum, b) => sum + (b.quantity || 0), 0);
}

export async function getAllProductsWithStock(userId: string): Promise<Product[]> {
  const products = await db.products.where('user_id').equals(userId).toArray();
  const batches = await db.batches.where('user_id').equals(userId).toArray();

  // Group batches by product_id for O(1) lookup
  const stockMap: Record<string, number> = {};
  for (const batch of batches) {
    stockMap[batch.product_id] = (stockMap[batch.product_id] || 0) + batch.quantity;
  }

  return products.map((p) => ({
    ...p,
    stock_quantity: stockMap[p.id] || 0,
  }));
}
