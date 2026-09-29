import React, { useEffect, useMemo, useState, useCallback } from 'react';
import {
  ShoppingCart, Search, X, Plus, Minus, Trash2, ChevronRight,
  CreditCard, Banknote, Smartphone, CheckCircle2, Tag, User,
  Package, AlertCircle, Percent,
} from 'lucide-react';
import clsx from 'clsx';
import { useAuthStore } from '../stores/authStore';
import { useInventoryStore, usePOSStore } from '../stores/inventoryStore';
import { useSalesStore } from '../stores/salesStore';
import { Button, Badge, Input, Modal } from '../components/ui';
import type { Product } from '../lib/db';
import { format } from 'date-fns';

const PAYMENT_METHODS = [
  { id: 'cash', label: 'Cash', icon: Banknote },
  { id: 'card', label: 'Card', icon: CreditCard },
  { id: 'mobile', label: 'Mobile', icon: Smartphone },
];

// ─── Receipt Modal ────────────────────────────────────────────────────────────
const ReceiptModal: React.FC<{
  sale: { id: string; sale_number: string; total: number; amount_paid: number; change_given: number; payment_method: string } | null;
  onClose: () => void;
  profile: { business_name: string; currency: string } | null;
}> = ({ sale, onClose, profile }) => {
  if (!sale) return null;
  const currency = profile?.currency ?? 'USD';
  const fmt = (n: number) => `${currency} ${n.toFixed(2)}`;

  return (
    <Modal isOpen={!!sale} onClose={onClose} title="Sale Complete!" size="sm">
      <div className="text-center space-y-4">
        <div className="w-16 h-16 bg-emerald-600/20 border border-emerald-600/30 rounded-full flex items-center justify-center mx-auto">
          <CheckCircle2 className="w-9 h-9 text-emerald-400" />
        </div>
        <div>
          <p className="text-slate-400 text-xs uppercase tracking-widest mb-1">Receipt #{sale.sale_number}</p>
          <p className="text-3xl font-black text-white">{fmt(sale.total)}</p>
        </div>
        <div className="bg-slate-900/60 rounded-xl p-4 text-sm space-y-2 text-left">
          <div className="flex justify-between text-slate-400">
            <span>Payment Method</span>
            <span className="capitalize text-white font-medium">{sale.payment_method}</span>
          </div>
          <div className="flex justify-between text-slate-400">
            <span>Amount Paid</span>
            <span className="text-white font-medium">{fmt(sale.amount_paid)}</span>
          </div>
          {sale.change_given > 0 && (
            <div className="flex justify-between text-emerald-400 font-bold">
              <span>Change</span>
              <span>{fmt(sale.change_given)}</span>
            </div>
          )}
        </div>
        <p className="text-xs text-slate-500">{format(new Date(), 'PPpp')}</p>
        <div className="flex gap-2">
          <Button variant="ghost" className="flex-1" onClick={() => window.print()}>Print Receipt</Button>
          <Button variant="primary" className="flex-1" onClick={onClose}>New Sale</Button>
        </div>
      </div>
    </Modal>
  );
};

// ─── Product Card ─────────────────────────────────────────────────────────────
const ProductCard: React.FC<{ product: Product; onAdd: (p: Product) => void; currency: string }> = ({
  product, onAdd, currency,
}) => {
  const stock = product.stock_quantity ?? 0;
  const isOutOfStock = stock <= 0;
  const isLow = stock > 0 && stock <= product.low_stock_threshold;

  return (
    <button
      onClick={() => !isOutOfStock && onAdd(product)}
      disabled={isOutOfStock}
      className={clsx(
        'flex flex-col p-3 rounded-xl border transition-all duration-200 text-left w-full group',
        isOutOfStock
          ? 'bg-slate-800/30 border-slate-700/30 opacity-50 cursor-not-allowed'
          : 'bg-slate-800/60 border-slate-700/50 hover:border-indigo-500/60 hover:bg-slate-800 hover:shadow-lg hover:shadow-indigo-500/10 active:scale-[0.98]'
      )}
    >
      <div className="flex items-start justify-between mb-2">
        <div className="w-9 h-9 bg-indigo-600/20 border border-indigo-600/30 rounded-lg flex items-center justify-center flex-shrink-0">
          <Package className="w-4 h-4 text-indigo-400" />
        </div>
        {isLow && <Badge variant="warning">Low</Badge>}
        {isOutOfStock && <Badge variant="danger">Out</Badge>}
      </div>
      <p className="text-xs font-bold text-slate-100 leading-tight mb-1 group-hover:text-white line-clamp-2">
        {product.name}
      </p>
      <p className="text-[10px] text-slate-500 mb-1.5">{product.unit} · Stock: {stock}</p>
      <p className="text-sm font-black text-indigo-400">
        {currency} {product.retail_price.toFixed(2)}
      </p>
    </button>
  );
};

// ─── Cart Item Row ─────────────────────────────────────────────────────────────
const CartItemRow: React.FC<{
  item: ReturnType<typeof usePOSStore.getState>['cart'][0];
  currency: string;
  onQty: (id: string, qty: number) => void;
  onRemove: (id: string) => void;
  onPriceEdit: (id: string, price: number) => void;
}> = ({ item, currency, onQty, onRemove, onPriceEdit }) => {
  const [editingPrice, setEditingPrice] = useState(false);
  const [priceInput, setPriceInput] = useState(item.unit_price.toString());

  return (
    <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-800/40 border border-slate-700/30 animate-slide-in group">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-slate-100 truncate">{item.product.name}</p>
        <div className="flex items-center gap-1 mt-0.5">
          {editingPrice ? (
            <input
              type="number"
              value={priceInput}
              autoFocus
              className="w-20 bg-slate-700 border border-indigo-500 rounded-lg px-2 py-0.5 text-xs text-white focus:outline-none"
              onChange={(e) => setPriceInput(e.target.value)}
              onBlur={() => {
                const p = parseFloat(priceInput);
                if (!isNaN(p) && p >= 0) onPriceEdit(item.product.id, p);
                setEditingPrice(false);
              }}
              onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
            />
          ) : (
            <button
              onClick={() => { setPriceInput(item.unit_price.toString()); setEditingPrice(true); }}
              className="text-xs text-indigo-400 hover:text-indigo-300 font-medium"
            >
              {currency} {item.unit_price.toFixed(2)}
            </button>
          )}
        </div>
      </div>

      {/* Quantity control */}
      <div className="flex items-center gap-1">
        <button
          onClick={() => onQty(item.product.id, item.quantity - 1)}
          className="w-6 h-6 rounded-lg bg-slate-700 hover:bg-slate-600 flex items-center justify-center transition-colors"
        >
          <Minus className="w-3 h-3 text-slate-300" />
        </button>
        <input
          type="number"
          value={item.quantity}
          onChange={(e) => { const v = parseInt(e.target.value); if (!isNaN(v)) onQty(item.product.id, v); }}
          className="w-10 bg-slate-700 border border-slate-600 rounded-lg text-center text-sm font-bold text-white focus:outline-none focus:border-indigo-500 py-0.5"
          min={1}
        />
        <button
          onClick={() => onQty(item.product.id, item.quantity + 1)}
          className="w-6 h-6 rounded-lg bg-slate-700 hover:bg-slate-600 flex items-center justify-center transition-colors"
        >
          <Plus className="w-3 h-3 text-slate-300" />
        </button>
      </div>

      <div className="text-right min-w-[60px]">
        <p className="text-sm font-bold text-white">
          {currency} {(item.unit_price * item.quantity).toFixed(2)}
        </p>
      </div>

      <button
        onClick={() => onRemove(item.product.id)}
        className="opacity-0 group-hover:opacity-100 p-1 text-slate-500 hover:text-red-400 transition-all rounded-lg hover:bg-red-900/20"
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  );
};

// ─── Main POS Screen ──────────────────────────────────────────────────────────
const POSScreen: React.FC = () => {
  const { user, profile } = useAuthStore();
  const { products, loadAll, categories } = useInventoryStore();
  const {
    cart, saleType, discountAmount, discountType, customerName, searchQuery,
    setSaleType, setSearchQuery, setCustomer, setDiscount,
    addToCart, removeFromCart, updateQuantity, updateItemPrice, clearCart,
    getSubtotal, getDiscountValue, getTotal,
  } = usePOSStore();
  const { createSale } = useSalesStore();

  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'mobile'>('cash');
  const [amountPaid, setAmountPaid] = useState('');
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [completedSale, setCompletedSale] = useState<Parameters<typeof ReceiptModal>[0]['sale']>(null);
  const [showDiscount, setShowDiscount] = useState(false);
  const [showCustomer, setShowCustomer] = useState(false);

  const currency = profile?.currency ?? 'USD';
  const taxRate = profile?.tax_rate ?? 0;

  useEffect(() => {
    if (user) loadAll(user.id);
  }, [user, loadAll]);

  // Filter products for display
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      if (!p.is_active) return false;
      if (selectedCategory && p.category_id !== selectedCategory) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return (
          p.name.toLowerCase().includes(q) ||
          (p.barcode ?? '').includes(q) ||
          (p.sku ?? '').toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [products, selectedCategory, searchQuery]);

  const subtotal = getSubtotal();
  const discountVal = getDiscountValue();
  const taxable = subtotal - discountVal;
  const taxAmount = (taxable * taxRate) / 100;
  const total = taxable + taxAmount;
  const paid = parseFloat(amountPaid) || 0;
  const change = Math.max(0, paid - total);

  const handleCheckout = async () => {
    if (cart.length === 0 || !user) return;
    setIsCheckingOut(true);
    try {
      const sale = await createSale(
        user.id,
        {
          sale_type: saleType,
          customer_name: customerName || undefined,
          customer_phone: undefined,
          subtotal,
          discount_amount: discountVal,
          discount_type: discountType,
          tax_amount: taxAmount,
          total,
          amount_paid: paymentMethod === 'cash' ? paid : total,
          change_given: paymentMethod === 'cash' ? change : 0,
          payment_method: paymentMethod,
          payment_status: 'paid',
        },
        cart.map((item) => ({
          product_id: item.product.id,
          batch_id: item.batch_id,
          product_name: item.product.name,
          quantity: item.quantity,
          unit_price: item.unit_price,
          cost_price: item.product.cost_price,
          discount: item.discount,
          total: item.unit_price * item.quantity - item.discount,
        }))
      );

      setCompletedSale({
        id: sale.id,
        sale_number: sale.sale_number,
        total,
        amount_paid: paymentMethod === 'cash' ? paid : total,
        change_given: change,
        payment_method: paymentMethod,
      });
      clearCart();
      setAmountPaid('');
      // Refresh products for updated stock
      loadAll(user.id);
    } catch (error) {
      console.error('Checkout failed:', error);
      alert('Checkout failed. Please try again.');
    } finally {
      setIsCheckingOut(false);
    }
  };

  return (
    <div className="flex h-full">
      {/* ── Left: Product Grid ─────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 border-r border-slate-700/50">
        {/* Search & Filters */}
        <div className="p-4 space-y-3 border-b border-slate-700/50 bg-slate-900/30">
          <div className="flex items-center gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search products, barcode, SKU..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-800/80 border border-slate-700 text-slate-100 rounded-xl pl-9 pr-4 py-2.5 text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white">
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Sale Type Toggle */}
            <div className="flex bg-slate-800 border border-slate-700 rounded-xl p-1 gap-1">
              {(['retail', 'wholesale'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setSaleType(t)}
                  className={clsx(
                    'px-3 py-1.5 rounded-lg text-xs font-bold capitalize transition-all',
                    saleType === t
                      ? 'bg-indigo-600 text-white shadow'
                      : 'text-slate-400 hover:text-white'
                  )}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Category Filters */}
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            <button
              onClick={() => setSelectedCategory(null)}
              className={clsx(
                'px-3 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-all',
                !selectedCategory ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white border border-slate-700'
              )}
            >
              All ({products.filter((p) => p.is_active).length})
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(selectedCategory === cat.id ? null : cat.id)}
                className={clsx(
                  'px-3 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-all',
                  selectedCategory === cat.id
                    ? 'text-white'
                    : 'bg-slate-800 text-slate-400 hover:text-white border border-slate-700'
                )}
                style={selectedCategory === cat.id ? { backgroundColor: cat.color } : {}}
              >
                {cat.name}
              </button>
            ))}
          </div>
        </div>

        {/* Product Grid */}
        <div className="flex-1 overflow-y-auto p-4">
          {filteredProducts.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <Package className="w-12 h-12 text-slate-600 mb-3" />
              <p className="text-slate-400 font-medium">No products found</p>
              <p className="text-slate-500 text-sm mt-1">Try a different search or category</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
              {filteredProducts.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  currency={currency}
                  onAdd={addToCart}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Right: Cart ────────────────────────────────────────────────────── */}
      <div className="w-96 flex flex-col flex-shrink-0 bg-slate-900/50">
        {/* Cart Header */}
        <div className="p-4 border-b border-slate-700/50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShoppingCart className="w-5 h-5 text-indigo-400" />
            <span className="font-bold text-white">Cart</span>
            {cart.length > 0 && (
              <span className="bg-indigo-600 text-white text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center">
                {cart.length}
              </span>
            )}
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowCustomer(!showCustomer)}
              className={clsx('p-1.5 rounded-lg transition-all text-sm', showCustomer ? 'bg-indigo-600/20 text-indigo-400' : 'text-slate-400 hover:bg-slate-800 hover:text-white')}
              title="Customer"
            >
              <User className="w-4 h-4" />
            </button>
            <button
              onClick={() => setShowDiscount(!showDiscount)}
              className={clsx('p-1.5 rounded-lg transition-all', showDiscount ? 'bg-amber-600/20 text-amber-400' : 'text-slate-400 hover:bg-slate-800 hover:text-white')}
              title="Discount"
            >
              <Tag className="w-4 h-4" />
            </button>
            {cart.length > 0 && (
              <button
                onClick={clearCart}
                className="p-1.5 rounded-lg text-slate-400 hover:bg-red-900/20 hover:text-red-400 transition-all"
                title="Clear cart"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Customer & Discount Panels */}
        {showCustomer && (
          <div className="px-4 py-3 bg-slate-800/40 border-b border-slate-700/50 space-y-2 animate-slide-in">
            <Input
              placeholder="Customer name"
              value={customerName}
              onChange={(e) => setCustomer(e.target.value, '')}
              className="text-sm py-2"
            />
          </div>
        )}

        {showDiscount && (
          <div className="px-4 py-3 bg-slate-800/40 border-b border-slate-700/50 animate-slide-in">
            <div className="flex gap-2">
              <div className="flex bg-slate-800 border border-slate-700 rounded-xl p-0.5 gap-0.5">
                {(['amount', 'percent'] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setDiscount(discountAmount, t)}
                    className={clsx(
                      'p-1.5 rounded-lg transition-all',
                      discountType === t ? 'bg-amber-600 text-white' : 'text-slate-400'
                    )}
                  >
                    {t === 'percent' ? <Percent className="w-3.5 h-3.5" /> : <span className="text-xs font-bold">$</span>}
                  </button>
                ))}
              </div>
              <input
                type="number"
                placeholder={discountType === 'percent' ? 'e.g. 10' : 'e.g. 5.00'}
                value={discountAmount || ''}
                onChange={(e) => setDiscount(parseFloat(e.target.value) || 0, discountType)}
                className="flex-1 bg-slate-800/80 border border-slate-700 text-slate-100 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500"
                min={0}
                max={discountType === 'percent' ? 100 : undefined}
              />
            </div>
          </div>
        )}

        {/* Cart Items */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {cart.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center py-12">
              <ShoppingCart className="w-12 h-12 text-slate-700 mb-3" />
              <p className="text-slate-500 text-sm font-medium">Cart is empty</p>
              <p className="text-slate-600 text-xs mt-1">Click on products to add them</p>
            </div>
          ) : (
            cart.map((item) => (
              <CartItemRow
                key={item.product.id}
                item={item}
                currency={currency}
                onQty={updateQuantity}
                onRemove={removeFromCart}
                onPriceEdit={updateItemPrice}
              />
            ))
          )}
        </div>

        {/* Totals & Payment */}
        {cart.length > 0 && (
          <div className="p-4 border-t border-slate-700/50 space-y-4 bg-slate-900/60">
            {/* Totals */}
            <div className="space-y-1.5 text-sm">
              <div className="flex justify-between text-slate-400">
                <span>Subtotal</span>
                <span>{currency} {subtotal.toFixed(2)}</span>
              </div>
              {discountVal > 0 && (
                <div className="flex justify-between text-amber-400">
                  <span>Discount</span>
                  <span>- {currency} {discountVal.toFixed(2)}</span>
                </div>
              )}
              {taxRate > 0 && (
                <div className="flex justify-between text-slate-400">
                  <span>Tax ({taxRate}%)</span>
                  <span>{currency} {taxAmount.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-white font-black text-lg pt-1.5 border-t border-slate-700">
                <span>Total</span>
                <span>{currency} {total.toFixed(2)}</span>
              </div>
            </div>

            {/* Payment Method */}
            <div className="grid grid-cols-3 gap-2">
              {PAYMENT_METHODS.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => setPaymentMethod(id as typeof paymentMethod)}
                  className={clsx(
                    'flex flex-col items-center gap-1 p-2 rounded-xl border text-xs font-semibold transition-all',
                    paymentMethod === id
                      ? 'bg-indigo-600/30 border-indigo-500 text-indigo-300'
                      : 'bg-slate-800/60 border-slate-700 text-slate-400 hover:border-slate-500'
                  )}
                >
                  <Icon className="w-4 h-4" />
                  {label}
                </button>
              ))}
            </div>

            {/* Cash amount paid */}
            {paymentMethod === 'cash' && (
              <div className="space-y-1">
                <Input
                  type="number"
                  placeholder={`Amount received (${currency})`}
                  value={amountPaid}
                  onChange={(e) => setAmountPaid(e.target.value)}
                  className="text-center font-bold"
                />
                {paid > 0 && paid >= total && (
                  <div className="flex justify-between text-emerald-400 font-bold text-sm px-1">
                    <span>Change</span>
                    <span>{currency} {change.toFixed(2)}</span>
                  </div>
                )}
                {paid > 0 && paid < total && (
                  <div className="flex items-center gap-1 text-red-400 text-xs px-1">
                    <AlertCircle className="w-3.5 h-3.5" />
                    <span>Insufficient: need {currency} {(total - paid).toFixed(2)} more</span>
                  </div>
                )}
              </div>
            )}

            {/* Checkout Button */}
            <Button
              variant="success"
              size="lg"
              className="w-full"
              isLoading={isCheckingOut}
              disabled={
                cart.length === 0 ||
                (paymentMethod === 'cash' && (paid <= 0 || paid < total))
              }
              onClick={handleCheckout}
              rightIcon={<ChevronRight className="w-5 h-5" />}
            >
              Complete Sale · {currency} {total.toFixed(2)}
            </Button>
          </div>
        )}
      </div>

      {/* Receipt Modal */}
      <ReceiptModal
        sale={completedSale}
        onClose={() => setCompletedSale(null)}
        profile={profile}
      />
    </div>
  );
};

export default POSScreen;
