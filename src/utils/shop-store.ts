import localforage from 'localforage';

export type ShopProduct = {
  id: string;
  name: string;
  price: number;
  stock: number;
};

const KEY = 'gymos-shop-products';

const store = localforage.createInstance({
  name: 'gymos',
  storeName: 'gymos_store',
});

export async function getShopProducts(): Promise<ShopProduct[]> {
  try {
    const value = await store.getItem<ShopProduct[]>(KEY);
    if (Array.isArray(value)) return value;
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function saveShopProducts(products: ShopProduct[]) {
  try {
    await store.setItem(KEY, products);
  } catch {
    try {
      localStorage.setItem(KEY, JSON.stringify(products));
    } catch {}
  }
}
