import React, { useEffect, useState, useMemo } from 'react';
import {
  Package, Plus, Search, AlertTriangle, CalendarX, Filter,
  TrendingDown, Boxes, ChevronDown, ChevronUp, Edit, Trash2,
  Check, X, BarChart3, ArrowUpFromLine, Info,
} from 'lucide-react';
import clsx from 'clsx';
import { format, differenceInDays, isPast } from 'date-fns';
import { useAuthStore } from '../../stores/authStore';
import { useInventoryStore } from '../../stores/inventoryStore';
import { Button, Badge, Card, Modal, Input, Select, EmptyState, StatCard } from '../ui';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { productSchema, batchSchema, type ProductFormData, type BatchFormData } from '../../lib/schemas';
import type { Product, Batch } from '../../lib/db';

// ─── Expiry Status Helper ──────────────────────────────────────────────────────
function getExpiryStatus(expiryDate: string): { label: string; variant: 'danger' | 'warning' | 'success'; days: number } {
  const days = differenceInDays(new Date(expiryDate), new Date());
  if (days < 0) return { label: `Expired ${Math.abs(days)}d ago`, variant: 'danger', days };
  if (days <= 7) return { label: `${days}d left`, variant: 'danger', days };
  if (days <= 30) return { label: `${days}d left`, variant: 'warning', days };
  return { label: `${days}d left`, variant: 'success', days };
}

// ─── Add/Edit Product Modal ───────────────────────────────────────────────────
const ProductModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  editProduct?: Product;
  userId: string;
  categories: { id: string; name: string }[];
}> = ({ isOpen, onClose, editProduct, userId, categories }) => {
  const { addProduct, updateProduct } = useInventoryStore();
  const {
    register, handleSubmit, formState: { errors, isSubmitting }, reset,
  } = useForm<ProductFormData>({
    resolver: zodResolver(productSchema),
    defaultValues: editProduct
      ? {
          name: editProduct.name,
          sku: editProduct.sku,
          barcode: editProduct.barcode,
          unit: editProduct.unit,
          retail_price: editProduct.retail_price,
          wholesale_price: editProduct.wholesale_price,
          cost_price: editProduct.cost_price,
          min_wholesale_qty: editProduct.min_wholesale_qty,
          low_stock_threshold: editProduct.low_stock_threshold,
          category_id: editProduct.category_id,
          is_active: editProduct.is_active,
          track_expiry: editProduct.track_expiry,
        }
      : {
          unit: 'pcs',
          retail_price: 0,
          wholesale_price: 0,
          cost_price: 0,
          min_wholesale_qty: 10,
          low_stock_threshold: 10,
          is_active: true,
          track_expiry: false,
        },
  });

  const onSubmit = async (data: ProductFormData) => {
    if (editProduct) {
      await updateProduct(editProduct.id, data);
    } else {
      await addProduct(userId, data);
    }
    reset();
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={editProduct ? 'Edit Product' : 'Add Product'} size="lg">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <Input label="Product Name *" error={errors.name?.message} {...register('name')} placeholder="e.g. Coca-Cola 500ml" />
          </div>
          <Input label="SKU" {...register('sku')} placeholder="e.g. CC-500" />
          <Input label="Barcode" {...register('barcode')} placeholder="e.g. 5000112637922" />
        </div>

        <div className="grid grid-cols-3 gap-4">
          <Input label="Retail Price *" type="number" step="0.01" error={errors.retail_price?.message} {...register('retail_price')} />
          <Input label="Wholesale Price" type="number" step="0.01" {...register('wholesale_price')} />
          <Input label="Cost Price" type="number" step="0.01" {...register('cost_price')} />
        </div>

        <div className="grid grid-cols-3 gap-4">
          <Input label="Unit" {...register('unit')} placeholder="pcs / kg / ltr" />
          <Input label="Min Wholesale Qty" type="number" {...register('min_wholesale_qty')} />
          <Input label="Low Stock Alert" type="number" {...register('low_stock_threshold')} />
        </div>

        <Select
          label="Category"
          options={[
            { value: '', label: '— No Category —' },
            ...categories.map((c) => ({ value: c.id, label: c.name })),
          ]}
          {...register('category_id')}
        />

        <div className="flex gap-6">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" {...register('is_active')} className="w-4 h-4 rounded accent-indigo-500" />
            <span className="text-sm text-slate-300">Active product</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" {...register('track_expiry')} className="w-4 h-4 rounded accent-indigo-500" />
            <span className="text-sm text-slate-300">Track expiry dates</span>
          </label>
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <Button variant="ghost" type="button" onClick={onClose}>Cancel</Button>
          <Button variant="primary" type="submit" isLoading={isSubmitting}>
            {editProduct ? 'Save Changes' : 'Add Product'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

// ─── Add Batch Modal (Stock In) ───────────────────────────────────────────────
const BatchModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  product?: Product;
  userId: string;
}> = ({ isOpen, onClose, product, userId }) => {
  const { addBatch } = useInventoryStore();
  const { register, handleSubmit, formState: { errors, isSubmitting }, reset, setValue } = useForm<BatchFormData>({
    resolver: zodResolver(batchSchema),
    defaultValues: {
      product_id: product?.id ?? '',
      batch_number: `BATCH-${Date.now().toString().slice(-6)}`,
      quantity: 1,
      cost_price: product?.cost_price ?? 0,
    },
  });

  useEffect(() => {
    if (product) {
      setValue('product_id', product.id);
      setValue('cost_price', product.cost_price);
    }
  }, [product, setValue]);

  const onSubmit = async (data: BatchFormData) => {
    await addBatch(userId, data);
    reset();
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Stock In — ${product?.name ?? 'Product'}`} size="md">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <input type="hidden" {...register('product_id')} />
        <div className="grid grid-cols-2 gap-4">
          <Input label="Batch Number *" error={errors.batch_number?.message} {...register('batch_number')} />
          <Input label="Quantity *" type="number" error={errors.quantity?.message} {...register('quantity')} min={1} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Input label="Cost Price per Unit" type="number" step="0.01" {...register('cost_price')} />
          <Input label="Supplier" {...register('supplier')} placeholder="Supplier name" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Input label="Manufacture Date" type="date" {...register('manufacture_date')} />
          <Input label="Expiry Date" type="date" {...register('expiry_date')} />
        </div>
        <Input label="Notes" {...register('notes')} placeholder="Optional notes" />
        <div className="flex justify-end gap-3 pt-2">
          <Button variant="ghost" type="button" onClick={onClose}>Cancel</Button>
          <Button variant="success" type="submit" isLoading={isSubmitting} leftIcon={<ArrowUpFromLine className="w-4 h-4" />}>
            Add Stock
          </Button>
        </div>
      </form>
    </Modal>
  );
};

// ─── Product Row with Expanded Batches ────────────────────────────────────────
const ProductRow: React.FC<{
  product: Product;
  batches: Batch[];
  categories: { id: string; name: string; color: string }[];
  onEdit: (p: Product) => void;
  onDelete: (id: string) => void;
  onStockIn: (p: Product) => void;
  currency: string;
}> = ({ product, batches, categories, onEdit, onDelete, onStockIn, currency }) => {
  const [expanded, setExpanded] = useState(false);
  const stock = product.stock_quantity ?? 0;
  const isLow = stock <= product.low_stock_threshold;
  const isOut = stock === 0;
  const category = categories.find((c) => c.id === product.category_id);

  const expiringBatches = batches.filter(
    (b) => b.expiry_date && b.quantity > 0 && differenceInDays(new Date(b.expiry_date), new Date()) <= 30
  );

  return (
    <>
      <tr
        className={clsx(
          'border-b border-slate-700/30 hover:bg-slate-800/40 transition-colors cursor-pointer',
          isOut && 'opacity-60'
        )}
        onClick={() => setExpanded(!expanded)}
      >
        <td className="px-4 py-3">
          <div className="flex items-center gap-3">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 text-white text-xs font-bold"
              style={{ backgroundColor: category?.color ?? '#6366f1' + '33', border: `1px solid ${category?.color ?? '#6366f1'}44` }}
            >
              {product.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-100">{product.name}</p>
              <p className="text-xs text-slate-500">{product.sku || product.barcode || '—'}</p>
            </div>
          </div>
        </td>
        <td className="px-4 py-3">
          {category ? (
            <span className="text-xs font-semibold px-2 py-0.5 rounded-lg" style={{ backgroundColor: category.color + '22', color: category.color }}>
              {category.name}
            </span>
          ) : <span className="text-slate-600 text-xs">—</span>}
        </td>
        <td className="px-4 py-3">
          <div className="flex items-center gap-2">
            <span className={clsx('text-sm font-bold', isOut ? 'text-red-400' : isLow ? 'text-amber-400' : 'text-white')}>
              {stock} {product.unit}
            </span>
            {isOut && <span className="pulse-danger w-2 h-2 rounded-full bg-red-500 inline-block" />}
            {isLow && !isOut && <span className="pulse-warning w-2 h-2 rounded-full bg-amber-500 inline-block" />}
          </div>
          <p className="text-[10px] text-slate-500">Alert ≤ {product.low_stock_threshold}</p>
        </td>
        <td className="px-4 py-3 text-sm text-slate-300">{currency} {product.retail_price.toFixed(2)}</td>
        <td className="px-4 py-3 text-sm text-slate-400">{currency} {product.wholesale_price.toFixed(2)}</td>
        <td className="px-4 py-3">
          <div className="flex items-center gap-1">
            {expiringBatches.length > 0 && (
              <Badge variant="warning">
                <CalendarX className="w-3 h-3 mr-1" />
                {expiringBatches.length} expiring
              </Badge>
            )}
            {batches.length > 0 && <Badge variant="info">{batches.length} batch{batches.length !== 1 ? 'es' : ''}</Badge>}
          </div>
        </td>
        <td className="px-4 py-3">
          <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => onStockIn(product)}
              className="p-1.5 text-emerald-400 hover:bg-emerald-900/30 rounded-lg transition-all"
              title="Stock In"
            >
              <ArrowUpFromLine className="w-4 h-4" />
            </button>
            <button
              onClick={() => onEdit(product)}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-all"
              title="Edit"
            >
              <Edit className="w-4 h-4" />
            </button>
            <button
              onClick={() => onDelete(product.id)}
              className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-900/20 rounded-lg transition-all"
              title="Delete"
            >
              <Trash2 className="w-4 h-4" />
            </button>
            <button className="p-1.5 text-slate-500 hover:text-white hover:bg-slate-700 rounded-lg transition-all">
              {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </div>
        </td>
      </tr>

      {/* Expanded Batch Detail */}
      {expanded && batches.length > 0 && (
        <tr className="bg-slate-900/40">
          <td colSpan={7} className="px-4 pb-3 pt-1">
            <div className="ml-11 space-y-1.5">
              <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">Batch / Lot Details</p>
              <div className="grid grid-cols-1 gap-1.5">
                {batches.map((batch) => {
                  const expiryStatus = batch.expiry_date ? getExpiryStatus(batch.expiry_date) : null;
                  return (
                    <div key={batch.id} className="flex items-center gap-4 px-3 py-2 rounded-lg bg-slate-800/60 border border-slate-700/30 text-xs">
                      <span className="font-mono font-bold text-indigo-300 w-28 truncate">{batch.batch_number}</span>
                      <span className="text-slate-300"><span className="font-bold text-white">{batch.quantity}</span> {product.unit}</span>
                      {batch.supplier && <span className="text-slate-500">{batch.supplier}</span>}
                      {batch.expiry_date && (
                        <div className={clsx('flex items-center gap-1', expiryStatus?.days !== undefined && expiryStatus.days < 0 && 'animate-pulse')}>
                          <CalendarX className="w-3 h-3" />
                          <span>{format(new Date(batch.expiry_date), 'dd MMM yyyy')}</span>
                          {expiryStatus && <Badge variant={expiryStatus.variant}>{expiryStatus.label}</Badge>}
                        </div>
                      )}
                      <span className="ml-auto text-slate-500">Added {format(new Date(batch.created_at), 'dd MMM yyyy')}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
};

// ─── Main Inventory Page ──────────────────────────────────────────────────────
const InventoryPage: React.FC = () => {
  const { user, profile } = useAuthStore();
  const { products, batches, categories, isLoading, loadAll, deleteProduct, getLowStockProducts, getExpiringBatches } = useInventoryStore();

  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'low' | 'expiring' | 'out'>('all');
  const [showProductModal, setShowProductModal] = useState(false);
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | undefined>();
  const [stockInProduct, setStockInProduct] = useState<Product | undefined>();
  const [activeTab, setActiveTab] = useState<'products' | 'alerts'>('products');

  const currency = profile?.currency ?? 'USD';

  useEffect(() => {
    if (user) loadAll(user.id);
  }, [user, loadAll]);

  const lowStockProducts = getLowStockProducts();
  const expiringBatches = getExpiringBatches(30);
  const totalStockValue = products.reduce((sum, p) => sum + (p.stock_quantity ?? 0) * p.cost_price, 0);

  const filteredProducts = useMemo(() => {
    let list = products;
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          (p.sku ?? '').toLowerCase().includes(q) ||
          (p.barcode ?? '').includes(q)
      );
    }
    if (filterStatus === 'low') list = list.filter((p) => (p.stock_quantity ?? 0) <= p.low_stock_threshold && (p.stock_quantity ?? 0) > 0);
    if (filterStatus === 'out') list = list.filter((p) => (p.stock_quantity ?? 0) === 0);
    if (filterStatus === 'expiring') {
      const expiringProductIds = new Set(expiringBatches.map((b) => b.product_id));
      list = list.filter((p) => expiringProductIds.has(p.id));
    }
    return list;
  }, [products, search, filterStatus, expiringBatches]);

  const handleDeleteProduct = async (id: string) => {
    if (!confirm('Delete this product and all its batches?')) return;
    await deleteProduct(id);
  };

  const handleEditProduct = (p: Product) => {
    setEditingProduct(p);
    setShowProductModal(true);
  };

  const handleStockIn = (p: Product) => {
    setStockInProduct(p);
    setShowBatchModal(true);
  };

  return (
    <div className="p-6 space-y-6">
      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-white">Inventory</h1>
          <p className="text-slate-400 text-sm mt-0.5">{products.length} products · {batches.length} batches</p>
        </div>
        <div className="flex gap-3">
          <Button
            variant="secondary"
            size="sm"
            leftIcon={<ArrowUpFromLine className="w-4 h-4" />}
            onClick={() => { setStockInProduct(undefined); setShowBatchModal(true); }}
          >
            Stock In
          </Button>
          <Button
            variant="primary"
            size="sm"
            leftIcon={<Plus className="w-4 h-4" />}
            onClick={() => { setEditingProduct(undefined); setShowProductModal(true); }}
          >
            Add Product
          </Button>
        </div>
      </div>

      {/* ── Stat Cards ───────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Products"
          value={products.length}
          icon={<Package className="w-5 h-5" />}
          color="indigo"
          subtitle={`${products.filter((p) => p.is_active).length} active`}
        />
        <StatCard
          title="Low Stock"
          value={lowStockProducts.length}
          icon={<TrendingDown className="w-5 h-5" />}
          color={lowStockProducts.length > 0 ? 'amber' : 'emerald'}
          subtitle="Need restocking"
        />
        <StatCard
          title="Expiring Soon"
          value={expiringBatches.length}
          icon={<CalendarX className="w-5 h-5" />}
          color={expiringBatches.length > 0 ? 'red' : 'emerald'}
          subtitle="Within 30 days"
        />
        <StatCard
          title="Stock Value"
          value={`${currency} ${totalStockValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
          icon={<Boxes className="w-5 h-5" />}
          color="emerald"
          subtitle="At cost price"
        />
      </div>

      {/* ── Alerts Panel ────────────────────────────────────────────────────── */}
      {(lowStockProducts.length > 0 || expiringBatches.length > 0) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Low Stock Alert */}
          {lowStockProducts.length > 0 && (
            <Card className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <div className="p-1.5 bg-amber-900/40 rounded-lg">
                  <AlertTriangle className="w-4 h-4 text-amber-400" />
                </div>
                <h3 className="text-sm font-bold text-amber-400">Low Stock Alerts</h3>
                <Badge variant="warning">{lowStockProducts.length}</Badge>
              </div>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {lowStockProducts.slice(0, 8).map((p) => (
                  <div key={p.id} className="flex items-center justify-between px-3 py-2 bg-amber-900/10 border border-amber-800/30 rounded-xl">
                    <span className="text-sm text-slate-200 font-medium">{p.name}</span>
                    <div className="flex items-center gap-2">
                      <span className={clsx('text-xs font-bold', p.stock_quantity === 0 ? 'text-red-400' : 'text-amber-400')}>
                        {p.stock_quantity} {p.unit}
                      </span>
                      <button
                        onClick={() => handleStockIn(p)}
                        className="text-xs text-emerald-400 hover:text-emerald-300 font-semibold px-2 py-0.5 bg-emerald-900/30 rounded-lg"
                      >
                        + Stock
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Expiry Alerts */}
          {expiringBatches.length > 0 && (
            <Card className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <div className="p-1.5 bg-red-900/40 rounded-lg">
                  <CalendarX className="w-4 h-4 text-red-400" />
                </div>
                <h3 className="text-sm font-bold text-red-400">Expiry Alerts</h3>
                <Badge variant="danger">{expiringBatches.length}</Badge>
              </div>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {expiringBatches.slice(0, 8).map((batch) => {
                  const product = products.find((p) => p.id === batch.product_id);
                  const status = getExpiryStatus(batch.expiry_date!);
                  return (
                    <div key={batch.id} className="flex items-center justify-between px-3 py-2 bg-red-900/10 border border-red-800/30 rounded-xl">
                      <div>
                        <p className="text-sm text-slate-200 font-medium">{product?.name ?? '—'}</p>
                        <p className="text-[10px] text-slate-500 font-mono">{batch.batch_number} · {batch.quantity} {product?.unit}</p>
                      </div>
                      <Badge variant={status.variant}>{status.label}</Badge>
                    </div>
                  );
                })}
              </div>
            </Card>
          )}
        </div>
      )}

      {/* ── Products Table ───────────────────────────────────────────────────── */}
      <Card>
        {/* Table Controls */}
        <div className="flex items-center gap-3 p-4 border-b border-slate-700/50">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search products..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-slate-800/80 border border-slate-700 text-slate-100 rounded-xl pl-9 pr-4 py-2 text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500"
            />
          </div>

          <div className="flex gap-1 bg-slate-800/60 border border-slate-700 rounded-xl p-1">
            {([
              { id: 'all', label: 'All' },
              { id: 'low', label: 'Low Stock' },
              { id: 'out', label: 'Out of Stock' },
              { id: 'expiring', label: 'Expiring' },
            ] as const).map(({ id, label }) => (
              <button
                key={id}
                onClick={() => setFilterStatus(id)}
                className={clsx(
                  'px-3 py-1.5 rounded-lg text-xs font-semibold transition-all',
                  filterStatus === id
                    ? 'bg-indigo-600 text-white shadow'
                    : 'text-slate-400 hover:text-white'
                )}
              >
                {label}
                {id === 'low' && lowStockProducts.length > 0 && (
                  <span className="ml-1 bg-amber-500 text-white rounded-full text-[9px] px-1">{lowStockProducts.length}</span>
                )}
                {id === 'expiring' && expiringBatches.length > 0 && (
                  <span className="ml-1 bg-red-500 text-white rounded-full text-[9px] px-1">{expiringBatches.length}</span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        {isLoading ? (
          <div className="p-12 text-center text-slate-500">Loading inventory...</div>
        ) : filteredProducts.length === 0 ? (
          <EmptyState
            icon={<Package className="w-10 h-10" />}
            title="No products found"
            description={search ? 'Try a different search term.' : 'Add your first product to get started.'}
            action={
              <Button variant="primary" size="sm" leftIcon={<Plus className="w-4 h-4" />} onClick={() => setShowProductModal(true)}>
                Add Product
              </Button>
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-700/50">
                  {['Product', 'Category', 'Stock', 'Retail Price', 'Wholesale', 'Batches', 'Actions'].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredProducts.map((product) => (
                  <ProductRow
                    key={product.id}
                    product={product}
                    batches={batches.filter((b) => b.product_id === product.id)}
                    categories={categories}
                    onEdit={handleEditProduct}
                    onDelete={handleDeleteProduct}
                    onStockIn={handleStockIn}
                    currency={currency}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Modals */}
      <ProductModal
        isOpen={showProductModal}
        onClose={() => { setShowProductModal(false); setEditingProduct(undefined); }}
        editProduct={editingProduct}
        userId={user?.id ?? ''}
        categories={categories}
      />
      <BatchModal
        isOpen={showBatchModal}
        onClose={() => { setShowBatchModal(false); setStockInProduct(undefined); }}
        product={stockInProduct}
        userId={user?.id ?? ''}
      />
    </div>
  );
};

export default InventoryPage;
