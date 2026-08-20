import localforage from 'localforage';

const ATT_KEY = 'gymos-attendance-offline-records';
const MEMBERS_KEY = 'gymos-members';
const TOKENS_KEY = 'gymos-qr-tokens';

// Create a dedicated instance to keep keys under one store
const store = localforage.createInstance({
  name: 'gymos',
  storeName: 'gymos_store',
});

export async function getAttendance(): Promise<any[]> {
  try {
    const v = await store.getItem<any>(ATT_KEY);
    if (Array.isArray(v)) return v;
    // fallback to localStorage for migration
    try {
      const raw = localStorage.getItem(ATT_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          await store.setItem(ATT_KEY, parsed);
          return parsed;
        }
      }
    } catch {}
    return [];
  } catch (e) {
    // final fallback: localStorage
    try {
      const raw = localStorage.getItem(ATT_KEY);
      if (raw) return JSON.parse(raw);
    } catch {}
    return [];
  }
}

export async function saveAttendance(records: any[]) {
  try {
    await store.setItem(ATT_KEY, records);
  } catch (e) {
    try {
      localStorage.setItem(ATT_KEY, JSON.stringify(records));
    } catch {}
  }
}

export async function addAttendance(record: any) {
  const current = await getAttendance();
  const next = [record, ...current];
  await saveAttendance(next);
  return next;
}

export async function getMembers(): Promise<any[]> {
  try {
    const v = await store.getItem<any>(MEMBERS_KEY);
    if (Array.isArray(v)) return v;
    try {
      const raw = localStorage.getItem(MEMBERS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          await store.setItem(MEMBERS_KEY, parsed);
          return parsed;
        }
      }
    } catch {}
    return [];
  } catch (e) {
    try {
      const raw = localStorage.getItem(MEMBERS_KEY);
      if (raw) return JSON.parse(raw);
    } catch {}
    return [];
  }
}

export async function saveMembers(members: any[]) {
  try {
    await store.setItem(MEMBERS_KEY, members);
  } catch (e) {
    try {
      localStorage.setItem(MEMBERS_KEY, JSON.stringify(members));
    } catch {}
  }
}

export async function getQRTokens(): Promise<any[]> {
  try {
    const v = await store.getItem<any>(TOKENS_KEY);
    if (Array.isArray(v)) return v;
    try {
      const raw = localStorage.getItem(TOKENS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          await store.setItem(TOKENS_KEY, parsed);
          return parsed;
        }
      }
    } catch {}
    return [];
  } catch (e) {
    try {
      const raw = localStorage.getItem(TOKENS_KEY);
      if (raw) return JSON.parse(raw);
    } catch {}
    return [];
  }
}

export async function saveQRTokens(tokens: any[]) {
  try {
    await store.setItem(TOKENS_KEY, tokens);
  } catch (e) {
    try {
      localStorage.setItem(TOKENS_KEY, JSON.stringify(tokens));
    } catch {}
  }
}

export default {
  getAttendance,
  saveAttendance,
  addAttendance,
  getMembers,
  saveMembers,
  getQRTokens,
  saveQRTokens,
};
