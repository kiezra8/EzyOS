import { z } from 'zod';

// ─── Product Schema ───────────────────────────────────────────────────────────
export const productSchema = z.object({
  name: z.string().min(1, 'Product name is required'),
  sku: z.string().optional(),
  barcode: z.string().optional(),
  description: z.string().optional(),
  unit: z.string().min(1, 'Unit is required'),
  retail_price: z.coerce.number().min(0, 'Price must be positive'),
  wholesale_price: z.coerce.number().min(0),
  cost_price: z.coerce.number().min(0),
  min_wholesale_qty: z.coerce.number().int().min(1),
  low_stock_threshold: z.coerce.number().int().min(0),
  category_id: z.string().optional(),
  is_active: z.boolean().default(true),
  track_expiry: z.boolean().default(false),
});
export type ProductFormData = z.infer<typeof productSchema>;

// ─── Batch Schema ─────────────────────────────────────────────────────────────
export const batchSchema = z.object({
  product_id: z.string().min(1, 'Product is required'),
  batch_number: z.string().min(1, 'Batch number is required'),
  quantity: z.coerce.number().int().min(1, 'Quantity must be at least 1'),
  cost_price: z.coerce.number().min(0),
  expiry_date: z.string().optional(),
  manufacture_date: z.string().optional(),
  supplier: z.string().optional(),
  notes: z.string().optional(),
});
export type BatchFormData = z.infer<typeof batchSchema>;

// ─── Sale Schema ──────────────────────────────────────────────────────────────
export const saleSchema = z.object({
  sale_type: z.enum(['retail', 'wholesale']),
  customer_name: z.string().optional(),
  customer_phone: z.string().optional(),
  discount_amount: z.coerce.number().min(0).default(0),
  discount_type: z.enum(['amount', 'percent']).default('amount'),
  payment_method: z.enum(['cash', 'card', 'mobile', 'credit']),
  payment_status: z.enum(['paid', 'partial', 'credit']).default('paid'),
  amount_paid: z.coerce.number().min(0),
  notes: z.string().optional(),
});
export type SaleFormData = z.infer<typeof saleSchema>;

// ─── Purchase Schema ──────────────────────────────────────────────────────────
export const purchaseSchema = z.object({
  supplier: z.string().optional(),
  notes: z.string().optional(),
  payment_method: z.enum(['cash', 'card', 'mobile', 'credit']).default('cash'),
  payment_status: z.enum(['paid', 'partial', 'credit']).default('paid'),
});
export type PurchaseFormData = z.infer<typeof purchaseSchema>;

// ─── Expense Schema ───────────────────────────────────────────────────────────
export const expenseSchema = z.object({
  category: z.string().min(1, 'Category is required'),
  description: z.string().min(1, 'Description is required'),
  amount: z.coerce.number().min(0.01, 'Amount must be positive'),
  payment_method: z.enum(['cash', 'card', 'mobile']).default('cash'),
  reference: z.string().optional(),
  notes: z.string().optional(),
  expense_date: z.string().min(1, 'Date is required'),
});
export type ExpenseFormData = z.infer<typeof expenseSchema>;

// ─── Category Schema ──────────────────────────────────────────────────────────
export const categorySchema = z.object({
  name: z.string().min(1, 'Category name is required'),
  color: z.string().default('#6366f1'),
  icon: z.string().optional(),
});
export type CategoryFormData = z.infer<typeof categorySchema>;

// ─── Auth Schema ──────────────────────────────────────────────────────────────
export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});
export type LoginFormData = z.infer<typeof loginSchema>;

export const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  business_name: z.string().min(1, 'Business name is required'),
  business_type: z.enum(['retail', 'wholesale', 'hybrid']).default('hybrid'),
});
export type RegisterFormData = z.infer<typeof registerSchema>;
