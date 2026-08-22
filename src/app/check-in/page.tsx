'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { CheckCircle2, Loader2, Smartphone } from 'lucide-react';
import { toast } from 'sonner';
import { useSave } from '@/components/SaveProvider';
import { cacheGymName, flushCheckInQueue, queueCheckIn, readCachedGymName } from '@/lib/check-in-offline';

function CheckInForm() {
  const searchParams = useSearchParams();
  const org = searchParams.get('org') || '';
  const phoneFromQr = searchParams.get('phone') || '';
  const runSave = useSave();
  const [gymName, setGymName] = useState('');
  const [phone, setPhone] = useState(phoneFromQr);
  const [loadingGym, setLoadingGym] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [offlineSaved, setOfflineSaved] = useState(false);
  const [done, setDone] = useState<{
    memberName: string;
    action: 'in' | 'out';
    time: string;
    duration?: string;
  } | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  }, []);

  useEffect(() => {
    flushCheckInQueue().catch(() => {});
    const onOnline = () => { flushCheckInQueue().catch(() => {}); };
    window.addEventListener('online', onOnline);
    return () => window.removeEventListener('online', onOnline);
  }, []);

  useEffect(() => {
    if (!org) {
      setLoadingGym(false);
      toast.error('This QR is incomplete. Ask reception for the gym attendance poster.');
      return;
    }

    const cached = readCachedGymName(org);
    if (cached) setGymName(cached);

    let mounted = true;
    fetch(`/api/attendance/check-in?org=${encodeURIComponent(org)}`)
      .then(async (res) => {
        const data = await res.json();
        if (!mounted) return;
        if (!res.ok) {
          if (cached) return;
          toast.error(data.error || 'Gym not found');
          return;
        }
        const name = data.gymName || 'Gym';
        setGymName(name);
        cacheGymName(org, name);
      })
      .catch(() => {
        if (!mounted) return;
        if (cached) return;
        toast.error('Could not load gym. Check your internet and try again.');
      })
      .finally(() => {
        if (mounted) setLoadingGym(false);
      });

    return () => {
      mounted = false;
    };
  }, [org]);

  const markAttendance = async (event: React.FormEvent) => {
    event.preventDefault();
    const digits = phone.replace(/\D/g, '').slice(-10);
    if (digits.length !== 10) {
      toast.error('Enter a valid 10-digit mobile number.');
      return;
    }

    setSubmitting(true);
    try {
      if (!navigator.onLine) {
        queueCheckIn(org, phone);
        setOfflineSaved(true);
        setDone({
          memberName: 'Saved on this phone',
          action: 'in',
          time: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata' }),
        });
        return;
      }

      const res = await runSave(() => fetch('/api/attendance/check-in', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ org, phone }),
      }));
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Could not mark attendance');
        return;
      }
      const stamp = data.action === 'out' ? data.checkOutTime : data.checkInTime;
      const time = stamp
        ? new Date(stamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata' })
        : '';
      setOfflineSaved(false);
      setDone({
        memberName: data.memberName || 'Member',
        action: data.action === 'out' ? 'out' : 'in',
        time,
        duration: data.duration,
      });
    } catch {
      queueCheckIn(org, phone);
      setOfflineSaved(true);
      setDone({
        memberName: 'Saved on this phone',
        action: 'in',
        time: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata' }),
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-4">
      <div className="w-full max-w-md rounded-3xl border border-slate-800 bg-slate-900 p-6 sm:p-8 shadow-2xl">
        {loadingGym ? (
          <div className="flex flex-col items-center py-12 text-slate-400">
            <Loader2 className="h-8 w-8 animate-spin" />
            <p className="mt-3 text-sm">Opening attendance...</p>
          </div>
        ) : done ? (
          <div className="text-center py-6">
            <CheckCircle2 className="mx-auto h-16 w-16 text-emerald-400" />
            <h1 className="mt-4 text-2xl font-extrabold">{offlineSaved ? 'Attendance saved' : done.action === 'out' ? 'Exit marked' : 'Entry marked'}</h1>
            <p className="mt-2 text-lg text-slate-200">{done.memberName}</p>
            <p className="mt-1 text-sm text-slate-400">
              {gymName}{done.time ? ` · ${done.time}` : ''}
              {done.duration ? ` · ${done.duration}` : ''}
            </p>
            <p className="mt-6 text-sm text-slate-500">
              {offlineSaved
                ? 'Internet aate hi gym record update ho jayega. Aap page band kar sakte ho.'
                : done.action === 'out' ? 'You can close this page.' : 'Scan the same QR again when you leave to mark exit.'}
            </p>
          </div>
        ) : (
          <>
            <p className="text-xs font-semibold uppercase tracking-wider text-amber-400">Member check-in</p>
            <h1 className="mt-2 text-3xl font-extrabold tracking-tight">{gymName || 'Gym attendance'}</h1>

            <form onSubmit={markAttendance} className="mt-8 space-y-5">
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-300">Mobile number</label>
                <div className="relative">
                  <Smartphone className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" />
                  <input
                    inputMode="numeric"
                    autoComplete="tel"
                    maxLength={14}
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="10-digit number"
                    className="w-full rounded-xl border border-slate-600 bg-slate-800 py-3.5 pl-11 pr-4 text-lg text-white placeholder:text-slate-500 focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-400/30"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting || !org}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-amber-500 px-5 py-3.5 text-base font-bold text-slate-950 shadow-lg shadow-amber-500/20 hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting && <Loader2 className="h-5 w-5 animate-spin" />}
                {submitting ? 'Marking...' : 'Mark attendance'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}

export default function PublicCheckInPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-950" />}>
      <CheckInForm />
    </Suspense>
  );
}
