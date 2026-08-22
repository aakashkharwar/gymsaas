'use client';

import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import CustomDropdown from '@/components/CustomDropdown';
import { SavingButton } from '@/components/SavingButton';
import { useSave } from '@/components/SaveProvider';
import { useMembers } from '@/hooks/useGymQueries';
import { recordShopSale, getShopSales } from '@/app/actions/shop';
import { getShopProducts, saveShopProducts, type ShopProduct } from '@/utils/shop-store';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';
import { IndianRupee, Package, Plus, ShoppingBag, Trash2 } from 'lucide-react';

function memberName(raw: unknown) {
  const member = Array.isArray(raw) ? raw[0] : raw;
  return (member as { name?: string } | null)?.name || 'Member';
}

export default function ShopPage() {
  const queryClient = useQueryClient();
  const runSave = useSave();
  const { data: members = [], isPending: membersLoading } = useMembers();
  const { data: sales = [] } = useQuery({
    queryKey: queryKeys.shopSales,
    queryFn: getShopSales,
  });

  const [products, setProducts] = useState<ShopProduct[]>([]);
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [stock, setStock] = useState('10');
  const [memberId, setMemberId] = useState('');
  const [productId, setProductId] = useState('');
  const [qty, setQty] = useState('1');
  const [paymentMode, setPaymentMode] = useState('Cash');
  const [savingProduct, setSavingProduct] = useState(false);
  const [selling, setSelling] = useState(false);

  useEffect(() => {
    getShopProducts().then(setProducts).catch(() => {});
  }, []);

  const selected = products.find((p) => p.id === productId);
  const quantity = Math.max(1, Math.floor(Number(qty) || 1));
  const saleAmount = selected ? selected.price * quantity : 0;

  const persist = async (next: ShopProduct[]) => {
    setProducts(next);
    await saveShopProducts(next);
  };

  const addProduct = async (event: FormEvent) => {
    event.preventDefault();
    const productName = name.trim();
    const amount = Number(price);
    const units = Math.max(0, Math.floor(Number(stock) || 0));
    if (!productName) {
      toast.error('Product name daalo.');
      return;
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      toast.error('Valid price daalo.');
      return;
    }
    setSavingProduct(true);
    try {
      await persist([
        { id: crypto.randomUUID(), name: productName, price: amount, stock: units },
        ...products,
      ]);
      setName('');
      setPrice('');
      setStock('10');
      toast.success('Product saved');
    } finally {
      setSavingProduct(false);
    }
  };

  const removeProduct = async (id: string) => {
    await persist(products.filter((p) => p.id !== id));
    if (productId === id) setProductId('');
  };

  const sell = async (event: FormEvent) => {
    event.preventDefault();
    if (!memberId) {
      toast.error('Member select karo.');
      return;
    }
    if (!selected) {
      toast.error('Product select karo.');
      return;
    }
    if (selected.stock < quantity) {
      toast.error(`Stock kam hai. Available: ${selected.stock}`);
      return;
    }

    setSelling(true);
    await runSave(async () => {
      const result = await recordShopSale({
        memberId,
        productName: selected.name,
        quantity,
        amount: saleAmount,
        paymentMode,
      });
      setSelling(false);
      if ('error' in result && result.error) {
        toast.error(result.error);
        return;
      }
      await persist(products.map((p) => (
        p.id === selected.id ? { ...p, stock: p.stock - quantity } : p
      )));
      queryClient.invalidateQueries({ queryKey: queryKeys.shopSales });
      queryClient.invalidateQueries({ queryKey: queryKeys.fees });
      queryClient.invalidateQueries({ queryKey: queryKeys.feeStats });
      toast.success(`${result.memberName} · ${selected.name} × ${quantity} · ₹${saleAmount}`);
      setQty('1');
    });
  };

  const productOptions = useMemo(
    () => [
      { value: '', label: 'Select product...' },
      ...products.map((p) => ({ value: p.id, label: `${p.name} · ₹${p.price} · stock ${p.stock}` })),
    ],
    [products],
  );

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white">Shop</h1>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <form onSubmit={addProduct} className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-8 shadow-sm space-y-5">
          <div className="flex items-center gap-3">
            <Package className="h-5 w-5 text-amber-500" />
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">Add product</h2>
          </div>
          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-300">Name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Protein, Creatine, Shaker..."
              className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 px-4 py-3 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-400/30"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-300">Price (₹)</label>
              <input
                type="number"
                min="1"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 px-4 py-3 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-400/30"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-300">Stock</label>
              <input
                type="number"
                min="0"
                value={stock}
                onChange={(e) => setStock(e.target.value)}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 px-4 py-3 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-400/30"
              />
            </div>
          </div>
          <SavingButton type="submit" saving={savingProduct} savingLabel="Saving...">
            <Plus className="h-4 w-4" />
            Save product
          </SavingButton>

          <div className="border-t border-slate-100 dark:border-slate-800 pt-4 space-y-2">
            {products.length === 0 ? (
              <p className="text-sm text-slate-500">Abhi koi product nahi. Protein add karke sale start karo.</p>
            ) : products.map((p) => (
              <div key={p.id} className="flex items-center justify-between rounded-xl border border-slate-200 dark:border-slate-800 px-4 py-3">
                <div>
                  <p className="font-semibold text-slate-900 dark:text-white">{p.name}</p>
                  <p className="text-sm text-slate-500">₹{p.price} · stock {p.stock}</p>
                </div>
                <Button type="button" variant="ghost" size="icon" onClick={() => removeProduct(p.id)}>
                  <Trash2 className="h-4 w-4 text-slate-400" />
                </Button>
              </div>
            ))}
          </div>
        </form>

        <form onSubmit={sell} className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-8 shadow-sm space-y-5">
          <div className="flex items-center gap-3">
            <ShoppingBag className="h-5 w-5 text-amber-500" />
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">1-tap sale</h2>
          </div>
          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-300">Member</label>
            <CustomDropdown
              value={memberId}
              onChange={setMemberId}
              loading={membersLoading}
              options={[
                { value: '', label: 'Select member...' },
                ...members.map((m) => ({ value: m.id, label: `${m.name}${m.phone ? ` · ${m.phone}` : ''}` })),
              ]}
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-300">Product</label>
            <CustomDropdown value={productId} onChange={setProductId} options={productOptions} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-300">Qty</label>
              <input
                type="number"
                min="1"
                value={qty}
                onChange={(e) => setQty(e.target.value)}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 px-4 py-3 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-400/30"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-300">Payment</label>
              <CustomDropdown
                value={paymentMode}
                onChange={setPaymentMode}
                options={[
                  { value: 'Cash', label: 'Cash' },
                  { value: 'UPI', label: 'UPI' },
                  { value: 'Card', label: 'Card' },
                ]}
              />
            </div>
          </div>
          <div className="rounded-xl bg-slate-50 dark:bg-slate-800/50 px-4 py-3 flex items-center justify-between">
            <span className="text-sm font-semibold text-slate-500">Total</span>
            <span className="text-2xl font-extrabold text-slate-900 dark:text-white inline-flex items-center gap-1">
              <IndianRupee className="h-5 w-5" />
              {saleAmount || 0}
            </span>
          </div>
          <SavingButton type="submit" saving={selling} savingLabel="Saving sale..." className="w-full bg-amber-500 text-slate-950 hover:bg-amber-400">
            Save sale
          </SavingButton>
        </form>
      </div>

      <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-8 shadow-sm">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4">Recent shop sales</h2>
        {sales.length === 0 ? (
          <p className="text-sm text-slate-500">Abhi koi sale nahi.</p>
        ) : (
          <div className="space-y-3">
            {sales.map((sale) => (
              <div key={sale.id} className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3 last:border-0">
                <div>
                  <p className="font-semibold text-slate-900 dark:text-white">{memberName(sale.members)}</p>
                  <p className="text-sm text-slate-500">{sale.notes} · {sale.payment_mode}</p>
                </div>
                <p className="font-bold text-emerald-600">+₹{Number(sale.amount).toLocaleString()}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
