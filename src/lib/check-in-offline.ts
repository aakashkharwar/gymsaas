const QUEUE_KEY = 'gymos-checkin-offline-queue';
const GYM_KEY = 'gymos-checkin-gym-name';

export type PendingCheckIn = {
  org: string;
  phone: string;
  createdAt: string;
};

function readQueue(): PendingCheckIn[] {
  try {
    const raw = localStorage.getItem(QUEUE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeQueue(items: PendingCheckIn[]) {
  try {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(items));
  } catch {}
}

export function cacheGymName(org: string, name: string) {
  try {
    localStorage.setItem(`${GYM_KEY}:${org}`, name);
  } catch {}
}

export function readCachedGymName(org: string) {
  try {
    return localStorage.getItem(`${GYM_KEY}:${org}`) || '';
  } catch {
    return '';
  }
}

export function queueCheckIn(org: string, phone: string) {
  writeQueue([...readQueue(), { org, phone, createdAt: new Date().toISOString() }]);
}

export async function flushCheckInQueue() {
  if (typeof navigator !== 'undefined' && !navigator.onLine) return;
  const items = readQueue();
  if (!items.length) return;

  const leftover: PendingCheckIn[] = [];
  for (const item of items) {
    try {
      const res = await fetch('/api/attendance/check-in', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ org: item.org, phone: item.phone }),
      });
      if (!res.ok && res.status >= 500) leftover.push(item);
    } catch {
      leftover.push(item);
    }
  }
  writeQueue(leftover);
}
