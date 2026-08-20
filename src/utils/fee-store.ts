import localforage from 'localforage';

const PENDING_PAYMENTS_KEY = 'gymos-pending-payments';
const FEE_PLANS_KEY = 'gymos-fee-plans';
const INVOICES_KEY = 'gymos-invoices';

const store = localforage.createInstance({
  name: 'gymos',
  storeName: 'gymos_fees_store',
});

export type FeePlan = {
  id: string;
  name: string;
  amount: number;
  duration_months: number;
};

export type Invoice = {
  id: string;
  member_id: string;
  fee_plan_id: string;
  amount: number;
  due_date: string;
  status: 'paid' | 'pending' | 'partial' | 'overdue';
  created_at?: string;
  plan_name?: string;
};

export type PendingPayment = {
  id: string; // local uuid
  member_id: string;
  invoice_id?: string;
  amount: number;
  payment_mode: string;
  receipt_no: string;
  notes: string;
  paid_at: string;
  synced: boolean;
};

export async function getPendingPayments(): Promise<PendingPayment[]> {
  try {
    const v = await store.getItem<PendingPayment[]>(PENDING_PAYMENTS_KEY);
    if (Array.isArray(v)) return v;
    return [];
  } catch (e) {
    try {
      const raw = localStorage.getItem(PENDING_PAYMENTS_KEY);
      if (raw) return JSON.parse(raw);
    } catch {}
    return [];
  }
}

export async function savePendingPayments(records: PendingPayment[]) {
  try {
    await store.setItem(PENDING_PAYMENTS_KEY, records);
  } catch (e) {
    try {
      localStorage.setItem(PENDING_PAYMENTS_KEY, JSON.stringify(records));
    } catch {}
  }
}

export async function addPendingPayment(record: PendingPayment) {
  const current = await getPendingPayments();
  const next = [record, ...current];
  await savePendingPayments(next);
  return next;
}

export async function removePendingPayment(id: string) {
  const current = await getPendingPayments();
  const next = current.filter(p => p.id !== id);
  await savePendingPayments(next);
  return next;
}

export async function clearSyncedPayments() {
  const current = await getPendingPayments();
  const next = current.filter(p => !p.synced);
  await savePendingPayments(next);
  return next;
}

export async function getFeePlans(): Promise<FeePlan[]> {
  try {
    const v = await store.getItem<FeePlan[]>(FEE_PLANS_KEY);
    if (Array.isArray(v)) return v;
    return [];
  } catch (e) {
    try {
      const raw = localStorage.getItem(FEE_PLANS_KEY);
      if (raw) return JSON.parse(raw);
    } catch {}
    return [];
  }
}

export async function saveFeePlans(records: FeePlan[]) {
  try {
    await store.setItem(FEE_PLANS_KEY, records);
  } catch (e) {
    try {
      localStorage.setItem(FEE_PLANS_KEY, JSON.stringify(records));
    } catch {}
  }
}

export async function addFeePlan(record: FeePlan) {
  const current = await getFeePlans();
  const next = [record, ...current];
  await saveFeePlans(next);
  return next;
}

export async function getInvoices(): Promise<Invoice[]> {
  try {
    const v = await store.getItem<Invoice[]>(INVOICES_KEY);
    if (Array.isArray(v)) return v;
    return [];
  } catch (e) {
    try {
      const raw = localStorage.getItem(INVOICES_KEY);
      if (raw) return JSON.parse(raw);
    } catch {}
    return [];
  }
}

export async function saveInvoices(records: Invoice[]) {
  try {
    await store.setItem(INVOICES_KEY, records);
  } catch (e) {
    try {
      localStorage.setItem(INVOICES_KEY, JSON.stringify(records));
    } catch {}
  }
}

export async function addInvoice(record: Invoice) {
  const current = await getInvoices();
  const next = [record, ...current];
  await saveInvoices(next);
  return next;
}

export async function updateInvoiceStatus(id: string, status: Invoice['status']) {
  const current = await getInvoices();
  const next = current.map(inv => inv.id === id ? { ...inv, status } : inv);
  await saveInvoices(next);
  return next;
}
