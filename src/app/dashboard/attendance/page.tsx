'use client';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

import { useEffect, useMemo, useState, type FormEvent } from 'react';
import QRCode from 'qrcode';
import { AlertTriangle, ArrowLeft, CalendarDays, Check, CheckCheck, Clock3, Filter, QrCode, Search, UserRound, X } from 'lucide-react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import CustomDropdown from '@/components/CustomDropdown';
import { markAttendanceExit } from '@/app/actions/attendance';
import { useAttendance, useMembers } from '@/hooks/useGymQueries';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';

const CameraScanner = dynamic(() => import('@/components/CameraScanner'), { ssr: false });

type AttendanceStatus = 'present' | 'absent';

type SyncStatus = 'pending' | 'synced' | 'failed';

type AttendanceRecord = {
  id: string;
  firstName: string;
  middleName: string;
  lastName: string;
  qrCode: string;
  entryTime: string;
  exitTime: string;
  status: AttendanceStatus;
  date: string;
  createdAt: string;
  syncStatus?: SyncStatus;
  lastSyncedAt?: string;
  syncResult?: string;
  checkInAt?: string;
  checkOutAt?: string;
};

type LocalMember = {
  id?: string | number;
  qrCode?: string;
  token?: string;
  username?: string;
  name?: string;
  label?: string;
  phone?: string;
};

type LocalToken = {
  token?: string;
  memberId?: string | number;
  label?: string;
  name?: string;
  username?: string;
  id?: string | number;
};

const STORAGE_KEY = 'gymos-attendance-offline-records';

function normalizeScannedQr(raw: string) {
  const val = String(raw || '').trim();
  if (!val) return '';
  try {
    const url = new URL(val);
    const qr = url.searchParams.get('qr');
    if (qr) return qr.trim();
  } catch {
    // plain token / phone from office-printed cards
  }
  return val;
}

async function resolveMemberName(val: string) {
  const mod = await import('@/utils/storage');
  const tokens = (await mod.getQRTokens()) || [];
  const members = (await mod.getMembers()) || [];

  const token = tokens.find((t: LocalToken) => String(t.token ?? '') === val || String(t.id ?? '') === val);
  if (token) {
    if (token.memberId) {
      const mm = members.find((m: LocalMember) => String(m.id ?? '') === String(token.memberId));
      if (mm?.name || mm?.label) return String(mm.name || mm.label);
    }
    if (token.label || token.name) return String(token.label || token.name);
  }

  const member = members.find((m: LocalMember) =>
    String(m.qrCode ?? '') === val ||
    String(m.token ?? '') === val ||
    String(m.username ?? '') === val ||
    String(m.phone ?? '') === val
  );
  return member ? String(member.name || member.label || '') : '';
}

const sampleRecords: AttendanceRecord[] = [];

const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });

function getCurrentTime() {
  return new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata' });
}

function formatMinutes(totalMins: number) {
  const mins = Math.max(0, totalMins);
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h === 0) return `${m}m`;
  return `${h}h ${m}m`;
}

function calculateDuration(entry: string, exit: string, checkInAt?: string, checkOutAt?: string, now = Date.now()) {
  if (checkInAt) {
    const start = new Date(checkInAt).getTime();
    const end = checkOutAt ? new Date(checkOutAt).getTime() : now;
    const label = formatMinutes(Math.round((end - start) / 60000));
    return checkOutAt ? label : `${label} in gym`;
  }
  if (!entry) return '-';
  if (!exit) return 'In Gym';

  const [eH, eM] = entry.split(':').map(Number);
  const [xH, xM] = exit.split(':').map(Number);

  let diffMins = (xH * 60 + xM) - (eH * 60 + eM);
  if (diffMins < 0) diffMins += 24 * 60;

  return formatMinutes(diffMins);
}

function parseName(fullName: string) {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 0 || !parts[0]) return { first: '', middle: '', last: '' };
  if (parts.length === 1) return { first: parts[0], middle: '', last: '' };
  if (parts.length === 2) return { first: parts[0], middle: '', last: parts[1] };
  return {
    first: parts[0],
    last: parts[parts.length - 1],
    middle: parts.slice(1, -1).join(' ')
  };
}

export default function AttendancePage() {
  const queryClient = useQueryClient();
  const { data: serverAttendance = [] } = useAttendance();
  const { data: memberList = [] } = useMembers();
  const [records, setRecords] = useState<AttendanceRecord[]>(sampleRecords);
  
  const [mode, setMode] = useState<'dashboard' | 'scanner' | 'form'>('dashboard');
  const [query, setQuery] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<'all' | AttendanceStatus>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;
  const [formErrors, setFormErrors] = useState<{firstName?: string, lastName?: string}>({});
  const [formData, setFormData] = useState(() => ({
    id: null as string | null,
    firstName: '',
    middleName: '',
    lastName: '',
    qrCode: 'GYM-QR-01',
    entryTime: '',
    exitTime: '',
    status: 'present' as AttendanceStatus,
    date: '',
  }));

  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    const initialQrParam = new URLSearchParams(window.location.search).get('qr') || '';
    if (initialQrParam) {
      setMode('form');
    }
    setSelectedDate(today);
    setFormData(prev => ({
      ...prev,
      qrCode: initialQrParam || 'GYM-QR-01',
      entryTime: getCurrentTime(),
      date: today,
    }));
  }, []);

  const [showCamera, setShowCamera] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [kioskMode, setKioskMode] = useState(true);
  const [paused, setPaused] = useState(false);
  const [kioskSilent, setKioskSilent] = useState(false);
  const [scanToast, setScanToast] = useState<{ message: string; ts: number } | null>(null);
  const [nowTick, setNowTick] = useState(Date.now());

  useEffect(() => {
    const tick = window.setInterval(() => setNowTick(Date.now()), 30000);
    return () => window.clearInterval(tick);
  }, []);

  const MAX_RECENT = 6;

  async function startCamera(mode: 'environment' | 'user' = facingMode) {
    try {
      if (cameraStream) {
        cameraStream.getTracks().forEach((t) => t.stop());
      }
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        alert('Camera not supported in this browser');
        return;
      }
      const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: mode } });
      setCameraStream(s);
      setShowCamera(true);
      setPaused(false);
      setFacingMode(mode);
    } catch (error: unknown) {
      console.error('getUserMedia error', error);
      alert('Unable to access camera. Please allow camera permission or try a different browser.');
    }
  }

  function toggleCamera() {
    startCamera(facingMode === 'environment' ? 'user' : 'environment');
  }

  function stopCamera() {
    try {
      if (cameraStream) {
        cameraStream.getTracks().forEach((t) => t.stop());
      }
    } catch {}
    setCameraStream(null);
    setShowCamera(false);
    setPaused(false);
  }

  function togglePause() {
    if (paused) {
      // resume
      startCamera();
    } else {
      // pause (stop stream but keep kiosk mode enabled)
      try {
        if (cameraStream) cameraStream.getTracks().forEach((t) => t.stop());
      } catch {}
      setCameraStream(null);
      setShowCamera(false);
      setPaused(true);
    }
  }

  // show brief toast on successful kiosk scan (honor silent mode)
  function showScanFeedback(message: string) {
    if (kioskSilent) return;
    setScanToast({ message, ts: Date.now() });
    setTimeout(() => setScanToast(null), 1800);
  }

  useEffect(() => {
    if (memberList.length) {
      import('@/utils/storage').then((m) => m.saveMembers(
        memberList.map((mem: LocalMember) => ({ ...mem, qrCode: mem.phone, username: mem.phone }))
      )).catch(() => {});
    }
  }, [memberList]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const storage = await import('@/utils/storage');
      const localSaved = await storage.getAttendance() || [];
      const unsynced = Array.isArray(localSaved) ? localSaved.filter((r) => r.syncStatus !== 'synced') : [];

      const mapped = (serverAttendance || []).map((s: any) => {
        const d = new Date(s.check_in_time);
        const pName = parseName(s.members?.name || 'Unknown');
        return {
          id: s.id,
          firstName: pName.first,
          middleName: pName.middle,
          lastName: pName.last,
          qrCode: s.members?.phone || '',
          entryTime: d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata' }),
          exitTime: s.check_out_time
            ? new Date(s.check_out_time).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata' })
            : '',
          status: 'present' as AttendanceStatus,
          date: d.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }),
          createdAt: s.check_in_time,
          syncStatus: s.sync_status as SyncStatus,
          checkInAt: s.check_in_time,
          checkOutAt: s.check_out_time || '',
        };
      });

      if (!mounted) return;
      if (!navigator.onLine && !mapped.length) {
        setRecords(Array.isArray(localSaved) ? localSaved : []);
        return;
      }
      const unsyncedFiltered = unsynced.filter((u) => !mapped.find((row) => row.id === u.id));
      setRecords([...unsyncedFiltered, ...mapped]);
    })();
    return () => { mounted = false; };
  }, [serverAttendance]);

  // If the page is opened with ?qr=... (for example when a mobile device scans the QR),
  // open the attendance form with the QR prefilled.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const qrParam = new URLSearchParams(window.location.search).get('qr') || '';
    if (!qrParam) return;

    (async () => {
      try {
        const m = await import('@/utils/storage');
        const members = await m.getMembers();
        if (Array.isArray(members)) {
          const found = members.find((mm: LocalMember) => {
            return (
              (mm.qrCode && String(mm.qrCode) === qrParam) ||
              (mm.token && String(mm.token) === qrParam) ||
              (mm.username && String(mm.username) === qrParam)
            );
          });
          if (found) {
            const parsed = parseName(found.name || found.label || '');
            setFormData((prev) => ({ ...prev, firstName: parsed.first, middleName: parsed.middle, lastName: parsed.last }));
          }
        }

        const tokens = await m.getQRTokens();
        if (Array.isArray(tokens)) {
          const t = tokens.find((x: LocalToken) => String(x.token ?? '') === qrParam);
          if (t) {
            if (t.memberId) {
              try {
                const parsedMembers = await m.getMembers();
                const mm = (parsedMembers || []).find((pm: LocalMember) => String(pm.id ?? '') === String(t.memberId));
                if (mm) {
                  const parsed = parseName(mm.name || mm.label || '');
                  setFormData((prev) => ({ ...prev, firstName: parsed.first, middleName: parsed.middle, lastName: parsed.last }));
                }
              } catch {}
            }

            const parsedT = parseName(t.label || '');
            setFormData((prev) => ({ 
              ...prev, 
              firstName: prev.firstName || parsedT.first, 
              middleName: prev.middleName || parsedT.middle, 
              lastName: prev.lastName || parsedT.last 
            }));
          }
        }
      } catch {
        // ignore JSON parse errors
      }
    })();

    const url = new URL(window.location.href);
    url.searchParams.delete('qr');
    window.history.replaceState({}, '', url.toString());
  }, []);

  useEffect(() => {
    // persist records to IndexedDB via storage helper
    let mounted = true;
    (async () => {
      try {
        const m = await import('@/utils/storage');
        if (!mounted) return;
        await m.saveAttendance(records);
      } catch {
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
        } catch {}
      }
    })();
    return () => { mounted = false; };
  }, [records]);

  // Auto-attempt sync when back online
  useEffect(() => {
    const onOnline = () => {
      attemptSync();
    };
    window.addEventListener('online', onOnline);
    return () => window.removeEventListener('online', onOnline);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [records]);

  async function attemptSync() {
    if (!navigator.onLine) return;
    const pending = records.filter((r) => r.syncStatus !== 'synced');
    if (pending.length === 0) return;

    try {
      const res = await fetch('/api/attendance/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ records: pending }),
      });

      if (!res.ok) throw new Error('sync failed');
      const data = await res.json();
      // data.results: { id, status, reason? }
      const results: { id: string; status: 'synced' | 'failed' | 'duplicate'; reason?: string }[] = data.results || [];

      const now = new Date().toISOString();
      setRecords((prev) =>
        prev.map((r) => {
          const found = results.find((x) => x.id === r.id);
          if (!found) return r;
          const isSynced = found.status === 'synced' || found.status === 'duplicate';
          return {
            ...r,
            syncStatus: isSynced ? 'synced' : 'failed',
            lastSyncedAt: isSynced ? now : r.lastSyncedAt,
            syncResult: found.status === 'duplicate' ? (found.reason || 'duplicate') : found.status,
          };
        })
      );
    } catch {
      // mark pending as failed temporarily
      setRecords((prev) => prev.map((r) => (r.syncStatus !== 'synced' ? { ...r, syncStatus: 'failed' } : r)));
    }
  }

  // Removed local QR image generation

  const filteredRecords = useMemo(() => {
    const q = query.trim().toLowerCase();

    return records.filter((item) => {
      const matchesDate = !selectedDate || item.date === selectedDate;
      const matchesStatus = selectedStatus === 'all' || item.status === selectedStatus;
      const matchesText =
        !q ||
        (item.firstName || '').toLowerCase().includes(q) ||
        (item.middleName || '').toLowerCase().includes(q) ||
        (item.lastName || '').toLowerCase().includes(q) ||
        item.qrCode.toLowerCase().includes(q) ||
        item.entryTime.toLowerCase().includes(q) ||
        item.date.toLowerCase().includes(q);

      return matchesDate && matchesStatus && matchesText;
    });
  }, [records, query, selectedDate, selectedStatus]);

  useEffect(() => {
    setCurrentPage(1);
  }, [query, selectedDate, selectedStatus]);

  const totalPages = Math.max(1, Math.ceil(filteredRecords.length / ITEMS_PER_PAGE));
  const paginatedRecords = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredRecords.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredRecords, currentPage]);

  const summary = useMemo(() => {
    const q = query.trim().toLowerCase();
    const relevantRecords = records.filter(item => {
      const matchesDate = !selectedDate || item.date === selectedDate;
      const matchesText = !q || (item.firstName || '').toLowerCase().includes(q) || (item.middleName || '').toLowerCase().includes(q) || (item.lastName || '').toLowerCase().includes(q) || (item.qrCode || '').toLowerCase().includes(q);
      return matchesDate && matchesText;
    });
    const present = relevantRecords.filter((item) => item.status === 'present').length;
    const absent = relevantRecords.filter((item) => item.status === 'absent').length;
    return { present, absent, total: relevantRecords.length };
  }, [records, selectedDate, query]);

  const handleScan = () => {
    setMode('form');
    setFormData((prev) => ({
      ...prev,
      qrCode: 'GYM-QR-01',
      entryTime: getCurrentTime(),
      date: today,
    }));
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const errors: {firstName?: string, lastName?: string} = {};
    if (!formData.firstName.trim()) errors.firstName = 'First name is required.';
    if (!formData.lastName.trim()) errors.lastName = 'Last name is required.';

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }
    setFormErrors({});

    setRecords((prev) => {
      if (formData.id) {
        return prev.map((r) => {
          if (r.id === formData.id) {
            return {
              ...r,
              firstName: formData.firstName.trim(),
              middleName: formData.middleName.trim(),
              lastName: formData.lastName.trim(),
              qrCode: formData.qrCode.trim(),
              entryTime: formData.entryTime,
              exitTime: formData.exitTime.trim(),
              status: formData.status,
              date: formData.date,
              syncStatus: 'pending',
              createdAt: new Date().toISOString(),
            };
          }
          return r;
        });
      }

      // Smart active session detection for manual form submissions
      const fName = formData.firstName.trim();
      const mName = formData.middleName.trim();
      const lName = formData.lastName.trim();
      const qCode = formData.qrCode.trim();

      const activeSession = prev.find(r => 
        r.date === today && 
        !r.exitTime && 
        (
          (qCode !== 'GYM-QR-01' && r.qrCode === qCode) ||
          (fName !== '' && r.firstName.toLowerCase() === fName.toLowerCase() && r.lastName.toLowerCase() === lName.toLowerCase() && r.qrCode === qCode)
        )
      );

      if (activeSession) {
        // They manually submitted what they thought was a new entry, but they are already in the gym.
        // We treat this new manual submission as their exit.
        return prev.map(r => {
          if (r.id === activeSession.id) {
             return {
               ...r,
               exitTime: formData.exitTime.trim() || formData.entryTime || getCurrentTime(),
               syncStatus: 'pending',
               createdAt: new Date().toISOString()
             };
          }
          return r;
        });
      }

      // Truly a new manual record
      const nextRecord: AttendanceRecord = {
        id: crypto.randomUUID(),
        firstName: fName,
        middleName: mName,
        lastName: lName,
        qrCode: qCode,
        entryTime: formData.entryTime,
        exitTime: formData.exitTime.trim(),
        status: formData.status,
        date: formData.date,
        createdAt: new Date().toISOString(),
        syncStatus: 'pending',
      };
      return [nextRecord, ...prev];
    });

    setFormData({
      id: null,
      firstName: '',
      middleName: '',
      lastName: '',
      qrCode: 'GYM-QR-01',
      entryTime: getCurrentTime(),
      exitTime: '',
      status: 'present',
      date: today,
    });
    toast.success('Attendance marked successfully');
  };

  const handleMarkExit = async (record: AttendanceRecord) => {
    const result = await markAttendanceExit(record.id);
    if ('error' in result && result.error) {
      toast.error(result.error);
      return;
    }
    if (!('checkOutTime' in result) || !result.checkOutTime) {
      toast.error('Could not mark exit');
      return;
    }
    const exitTime = new Date(result.checkOutTime).toLocaleTimeString('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Asia/Kolkata',
    });
    setRecords((prev) => prev.map((row) => (
      row.id === record.id ? { ...row, exitTime, checkOutAt: result.checkOutTime } : row
    )));
    toast.success('Exit marked');
    queryClient.invalidateQueries({ queryKey: queryKeys.attendance });
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white">Attendance</h1>
        </div>
        {scanToast && (
          <div className="fixed right-6 top-6 z-50 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white shadow-lg">{scanToast.message}</div>
        )}

        <div className="flex flex-wrap items-center gap-3">
          {mode === 'dashboard' && (
            <>
            <Button
              type="button"
              onClick={() => {
                setMode('scanner');
                startCamera(facingMode);
              }}
              className="inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold"
            >
              <QrCode className="h-4 w-4" />
              Scan QR Code
            </Button>
            <Link href="/dashboard/attendance/generate" className="inline-flex items-center justify-center gap-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 px-4 py-2 text-sm font-semibold text-slate-900 dark:text-white hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
              Generate QR
            </Link>
            </>
          )}
          {mode === 'scanner' && (
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setMode('dashboard');
                stopCamera();
              }}
              className="inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold"
            >
              <ArrowLeft className="h-4 w-4" />
              Close scanner
            </Button>
          )}
        </div>
      </div>

      {mode === 'scanner' && (
        <div className="max-w-2xl mx-auto">
          <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-8 shadow-sm transition-colors">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">QR Scanner</h2>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Member apna card dikhaye. Office yahin se scan kare — Google Lens ki zaroorat nahi.</p>
              </div>
              <div className="rounded-full bg-slate-100 dark:bg-slate-800 px-4 py-1.5 text-xs font-bold uppercase tracking-[0.15em] text-slate-500 dark:text-slate-400">
                Offline mode
              </div>
            </div>

            <div className="flex min-h-[360px] items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/30">
              <div className="w-full rounded-2xl p-4">
                <div className="mb-4 relative">
                  <CameraScanner
                    externalStream={cameraStream}
                    mode={kioskMode ? 'continuous' : 'single'}
                    onDetected={(raw) => {
                      const val = normalizeScannedQr(raw);
                      const existingRecord = records.find(r => 
                        (r.qrCode === val || (r.firstName + ' ' + (r.lastName || '')).trim().toLowerCase() === val.toLowerCase()) 
                        && r.date === today
                      );

                      if (kioskMode) {
                        (async () => {
                          try {
                            const resolvedName = await resolveMemberName(val);
                            const memberNameFinal = resolvedName || val || 'Unknown';
                            const parsedName = parseName(memberNameFinal);

                            const DUP_MS = 5000;
                            const now = Date.now();

                            setRecords((prev) => {
                              const existing = prev.find(r => (r.qrCode === val || r.firstName.toLowerCase() === parsedName.first.toLowerCase()) && r.date === today);
                              
                              if (existing) {
                                if (now - new Date(existing.createdAt).getTime() < DUP_MS) {
                                  showScanFeedback('Duplicate scan ignored');
                                  return prev;
                                }
                                showScanFeedback('Exit recorded');
                                return prev.map(r => r.id === existing.id ? { 
                                  ...r, 
                                  exitTime: getCurrentTime(), 
                                  syncStatus: 'pending', 
                                  createdAt: new Date().toISOString() 
                                } : r);
                              }

                              showScanFeedback('Scan accepted');
                              const nextRecord: AttendanceRecord = {
                                id: crypto.randomUUID(),
                                firstName: parsedName.first,
                                middleName: parsedName.middle,
                                lastName: parsedName.last,
                                qrCode: val,
                                entryTime: getCurrentTime(),
                                exitTime: '',
                                status: 'present',
                                date: today,
                                createdAt: new Date().toISOString(),
                                syncStatus: 'pending',
                              };
                              return [nextRecord, ...prev];
                            });
                          } catch (e) {
                            console.error('kiosk resolution error', e);
                            setRecords((prev) => {
                              const existing = prev.find(r => r.qrCode === val && r.date === today);
                              if (existing) {
                                showScanFeedback('Exit recorded');
                                return prev.map(r => r.id === existing.id ? { ...r, exitTime: getCurrentTime(), syncStatus: 'pending', createdAt: new Date().toISOString() } : r);
                              }
                              showScanFeedback('Scan accepted');
                              const fallbackParsed = parseName(val || 'Unknown');
                              return [{
                                id: crypto.randomUUID(),
                                firstName: fallbackParsed.first,
                                middleName: fallbackParsed.middle,
                                lastName: fallbackParsed.last,
                                qrCode: val,
                                entryTime: getCurrentTime(),
                                exitTime: '',
                                status: 'present',
                                date: today,
                                createdAt: new Date().toISOString(),
                                syncStatus: 'pending',
                              }, ...prev];
                            });
                          }
                        })();
                      } else {
                        (async () => {
                          const resolvedName = existingRecord
                            ? ''
                            : await resolveMemberName(val).catch(() => '');
                          if (existingRecord) {
                            setFormData({
                              id: existingRecord.id,
                              firstName: existingRecord.firstName,
                              middleName: existingRecord.middleName || '',
                              lastName: existingRecord.lastName,
                              qrCode: existingRecord.qrCode,
                              entryTime: existingRecord.entryTime,
                              exitTime: getCurrentTime(),
                              status: existingRecord.status,
                              date: existingRecord.date
                            });
                          } else {
                            const fallbackParsed = parseName(resolvedName || val);
                            setFormData({
                              id: null,
                              firstName: fallbackParsed.first,
                              middleName: fallbackParsed.middle,
                              lastName: fallbackParsed.last,
                              qrCode: val,
                              entryTime: getCurrentTime(),
                              exitTime: '',
                              status: 'present',
                              date: today
                            });
                          }
                          setMode('form');
                          stopCamera();
                        })();
                      }
                    }}
                    onError={(err) => {
                      console.error('Camera scanner error', err);
                      stopCamera();
                    }}
                  />
                  {!showCamera && !paused && (
                    <div className="absolute inset-0 flex items-center justify-center bg-slate-900/5 backdrop-blur-sm rounded-xl">
                      <Button onClick={() => startCamera(facingMode)} className="rounded-xl bg-slate-900 dark:bg-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-slate-800 transition-colors">Start Camera</Button>
                    </div>
                  )}
                </div>
                {showCamera && (
                  <div className="mt-4 flex flex-wrap justify-center gap-3">
                    <Button onClick={toggleCamera} className="rounded-xl bg-slate-900 dark:bg-indigo-600 px-4 py-2 text-sm font-medium text-white">
                      Flip Camera
                    </Button>
                    <Button onClick={togglePause} className="rounded-xl bg-slate-100 dark:bg-slate-800 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300">
                      {paused ? 'Resume Scanner' : 'Pause Scanner'}
                    </Button>
                    <Button
                      onClick={() => setKioskMode((s) => !s)}
                      className={`rounded-xl px-4 py-2 text-sm font-medium transition-colors ${kioskMode ? 'bg-amber-500 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'}`}
                    >
                      {kioskMode ? 'Kiosk: ON' : 'Kiosk Mode'}
                    </Button>
                    {kioskMode && (
                      <Button
                        onClick={() => setKioskSilent((s) => !s)}
                        className={`rounded-xl px-4 py-2 text-sm font-medium transition-colors ${kioskSilent ? 'bg-slate-900 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'}`}
                      >
                        {kioskSilent ? 'Silent: ON' : 'Silent: OFF'}
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {mode === 'form' && (
        <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 sm:p-8 shadow-sm transition-colors overflow-hidden">
          <div className="mb-6">
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Member attendance</h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400 break-all">QR code: {formData.qrCode}</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6" noValidate>
            <div className="grid gap-6 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-300">First name <span className="text-red-500">*</span></label>
                <div className="relative">
                  <UserRound className={`pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 ${formErrors.firstName ? 'text-red-400' : 'text-slate-400 dark:text-slate-500'}`} />
                  <input
                    value={formData.firstName}
                    onChange={(event) => {
                      setFormData((prev) => ({ ...prev, firstName: event.target.value }));
                      if (formErrors.firstName) setFormErrors((prev) => ({ ...prev, firstName: undefined }));
                    }}
                    className={`w-full rounded-xl border ${formErrors.firstName ? 'border-red-300 focus:ring-red-500/20' : 'border-slate-200 dark:border-slate-700 focus:ring-indigo-500/20'} bg-slate-50 dark:bg-slate-800/50 py-3 pl-11 pr-4 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 transition-colors`}
                    placeholder="e.g. Aman"
                    required
                  />
                </div>
                {formErrors.firstName && <p className="mt-1.5 text-sm font-medium text-red-500">{formErrors.firstName}</p>}
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-300">Middle name</label>
                <div className="relative">
                  <UserRound className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
                  <input
                    value={formData.middleName}
                    onChange={(event) => setFormData((prev) => ({ ...prev, middleName: event.target.value }))}
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 py-3 pl-11 pr-4 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-colors"
                    placeholder="e.g. Kumar"
                  />
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-300">Last name <span className="text-red-500">*</span></label>
                <div className="relative">
                  <UserRound className={`pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 ${formErrors.lastName ? 'text-red-400' : 'text-slate-400 dark:text-slate-500'}`} />
                  <input
                    value={formData.lastName}
                    onChange={(event) => {
                      setFormData((prev) => ({ ...prev, lastName: event.target.value }));
                      if (formErrors.lastName) setFormErrors((prev) => ({ ...prev, lastName: undefined }));
                    }}
                    className={`w-full rounded-xl border ${formErrors.lastName ? 'border-red-300 focus:ring-red-500/20' : 'border-slate-200 dark:border-slate-700 focus:ring-indigo-500/20'} bg-slate-50 dark:bg-slate-800/50 py-3 pl-11 pr-4 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 transition-colors`}
                    placeholder="e.g. Sharma"
                    required
                  />
                </div>
                {formErrors.lastName && <p className="mt-1.5 text-sm font-medium text-red-500">{formErrors.lastName}</p>}
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-300">Entry time</label>
                <div className="relative">
                  <Clock3 className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
                  <input
                    type="time"
                    value={formData.entryTime}
                    onChange={(event) => setFormData((prev) => ({ ...prev, entryTime: event.target.value }))}
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 py-3 pl-11 pr-4 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-colors"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-300">Exit time</label>
                <div className="relative">
                  <Clock3 className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
                  <input
                    type="time"
                    value={formData.exitTime}
                    onChange={(event) => setFormData((prev) => ({ ...prev, exitTime: event.target.value }))}
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 py-3 pl-11 pr-4 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-300">Date</label>
                <div className="relative">
                  <CalendarDays className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
                  <input
                    type="date"
                    value={formData.date}
                    onChange={(event) => setFormData((prev) => ({ ...prev, date: event.target.value }))}
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 py-3 pl-11 pr-4 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-colors"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-300">Status</label>
                <div className="flex gap-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 p-3">
                  {(['present', 'absent'] as AttendanceStatus[]).map((option) => (
                    <label key={option} className="flex cursor-pointer items-center gap-3 text-sm font-medium text-slate-700 dark:text-slate-300">
                      <input
                        type="radio"
                        name="attendance-status"
                        checked={formData.status === option}
                        onChange={() => setFormData((prev) => ({ ...prev, status: option }))}
                        className="h-5 w-5 accent-indigo-600 dark:accent-indigo-500"
                      />
                      <span className={option === 'present' ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}>
                        {option === 'present' ? 'Present' : 'Absent'}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-3 border-t border-slate-100 dark:border-slate-800 pt-6 mt-8">
              <Button type="button" variant="outline" onClick={() => { setMode('scanner'); startCamera(facingMode); }} className="w-full sm:w-auto rounded-xl px-6 py-2.5 text-sm font-semibold">
                Cancel
              </Button>
              <Button type="submit" className="w-full sm:w-auto rounded-xl px-6 py-2.5">
                Submit attendance
              </Button>
            </div>
          </form>
        </div>
      )}

      {mode === 'dashboard' && (
        <>
          <div className="grid gap-6 md:grid-cols-3">
            <div className="bg-white dark:bg-slate-900 p-5 sm:p-8 rounded-3xl border border-slate-200 dark:border-emerald-900/20 shadow-sm transition-colors hover:shadow-md">
              <div className="flex items-center justify-between text-sm font-semibold text-slate-500 dark:text-emerald-400 uppercase tracking-wider">
                <span>Present</span>
                <Check className="h-5 w-5" />
              </div>
              <p className="mt-4 text-5xl font-extrabold text-emerald-600 dark:text-emerald-500 tracking-tight">{summary.present}</p>
            </div>

            <div className="bg-white dark:bg-slate-900 p-5 sm:p-8 rounded-3xl border border-slate-200 dark:border-red-900/20 shadow-sm transition-colors hover:shadow-md">
              <div className="flex items-center justify-between text-sm font-semibold text-slate-500 dark:text-red-400 uppercase tracking-wider">
                <span>Absent</span>
                <X className="h-5 w-5" />
              </div>
              <p className="mt-4 text-5xl font-extrabold text-red-600 dark:text-red-500 tracking-tight">{summary.absent}</p>
            </div>

            <div className="bg-white dark:bg-slate-900 p-5 sm:p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm transition-colors hover:shadow-md">
              <div className="flex items-center justify-between text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                <span>Total</span>
                <Filter className="h-5 w-5" />
              </div>
              <p className="mt-4 text-5xl font-extrabold text-slate-900 dark:text-white tracking-tight">{summary.total}</p>
            </div>
          </div>

          <div className="w-full rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm transition-colors">
            <div className="rounded-t-[23px] border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/50 p-5">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white">Attendance records</h3>
                </div>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
                  <div className="relative h-fit">
                    <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
                    <input
                      value={query}
                      onChange={(event) => setQuery(event.target.value)}
                      placeholder="Search by name, QR, time..."
                      className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 py-2.5 pl-10 pr-4 text-sm text-slate-700 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-indigo-500 dark:focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:focus:ring-indigo-400 transition-colors sm:w-80"
                    />
                  </div>
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-2">
                    <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-row sm:items-center">
                      <input
                        type="date"
                        value={selectedDate}
                        onChange={(event) => setSelectedDate(event.target.value)}
                        className="w-full sm:w-auto min-w-0 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-2.5 text-sm text-slate-700 dark:text-slate-200 focus:border-indigo-500 dark:focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:focus:ring-indigo-400 transition-colors"
                      />
                      <div className="w-full sm:w-[140px] shrink-0 min-w-0">
                        <CustomDropdown
                          value={selectedStatus}
                          onChange={(val) => setSelectedStatus(val as 'all' | AttendanceStatus)}
                          options={[
                            { value: 'all', label: 'All status' },
                            { value: 'present', label: 'Present' },
                            { value: 'absent', label: 'Absent' }
                          ]}
                          className="border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                        />
                      </div>
                    </div>
                    <Button
                      type="button"
                      onClick={attemptSync}
                      className="w-full sm:w-auto rounded-xl bg-emerald-600 dark:bg-emerald-500 px-4 py-2.5 text-sm font-bold text-white hover:bg-emerald-500 dark:hover:bg-emerald-400 transition-colors shadow-sm cursor-pointer whitespace-nowrap shrink-0"
                    >
                      Sync now
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            {filteredRecords.length === 0 ? (
              <div className="flex min-h-[420px] flex-col items-center justify-center px-6 py-12 text-center">
                <div className="mb-4 rounded-full bg-slate-100 dark:bg-slate-800 p-4 text-slate-400 dark:text-slate-500">
                  <CalendarDays className="h-12 w-12" />
                </div>
                <h3 className="text-2xl font-bold text-slate-900 dark:text-white">No attendance records</h3>
                <p className="mt-2 text-slate-500 dark:text-slate-400">Try a different date or search filter.</p>
              </div>
            ) : (
              <div className="w-full overflow-x-auto">
                <table className="min-w-full text-left">
                  <thead className="bg-slate-50/50 dark:bg-slate-800/30 text-sm text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="px-6 py-4 font-semibold">Name</th>
                      <th className="px-6 py-4 font-semibold">QR</th>
                      <th className="px-6 py-4 font-semibold">Date</th>
                      <th className="px-6 py-4 font-semibold">Entry</th>
                      <th className="px-6 py-4 font-semibold">Exit</th>
                      <th className="px-6 py-4 font-semibold">Duration</th>
                      <th className="px-6 py-4 font-semibold">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50 text-sm">
                    {paginatedRecords.map((record) => (
                      <tr key={record.id} className="bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                        <td className="px-6 py-4 font-medium text-slate-900 dark:text-slate-200">
                          {[record.firstName, record.middleName, record.lastName].filter(Boolean).join(' ')}
                        </td>
                        <td className="px-6 py-4 text-slate-600 dark:text-slate-400">{record.qrCode}</td>
                        <td className="px-6 py-4 text-slate-600 dark:text-slate-400">{record.date}</td>
                        <td className="px-6 py-4 text-slate-600 dark:text-slate-400 font-medium">{record.entryTime || '--:--'}</td>
                        <td className="px-6 py-4 text-slate-600 dark:text-slate-400 font-medium">
                          {record.exitTime ? record.exitTime : (
                            <button
                              type="button"
                              onClick={() => handleMarkExit(record)}
                              className="rounded-lg border border-slate-200 dark:border-slate-700 px-2 py-1 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:bg-slate-50 dark:hover:bg-slate-800"
                            >
                              Mark exit
                            </button>
                          )}
                        </td>
                        <td className="px-6 py-4 text-slate-600 dark:text-slate-400 font-medium whitespace-nowrap">
                          {calculateDuration(record.entryTime, record.exitTime, record.checkInAt, record.checkOutAt, nowTick)}
                        </td>
                        <td className="px-6 py-4 flex items-center gap-3">
                          <span
                            className={`inline-flex rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wider ${
                              record.status === 'present'
                                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400'
                                : 'bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-400'
                            }`}
                          >
                            {record.status}
                          </span>
                          <span className="text-xs">
                            {record.syncStatus === 'synced' ? (
                              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 dark:bg-emerald-900/20 px-2 py-0.5 text-emerald-600 dark:text-emerald-500 font-medium border border-emerald-200 dark:border-emerald-800/30">Synced</span>
                            ) : record.syncStatus === 'failed' ? (
                              <span className="inline-flex items-center gap-1.5 rounded-full bg-yellow-50 dark:bg-yellow-900/20 px-2 py-0.5 text-yellow-700 dark:text-yellow-500 font-medium border border-yellow-200 dark:border-yellow-800/30">Pending</span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-50 dark:bg-slate-800 px-2 py-0.5 text-slate-600 dark:text-slate-400 font-medium border border-slate-200 dark:border-slate-700">Unknown</span>
                            )}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            
            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-3 sm:px-6">
                <div className="flex flex-1 justify-between sm:hidden">
                  <Button
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="relative inline-flex items-center rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50 cursor-pointer"
                  >
                    Previous
                  </Button>
                  <Button
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="relative ml-3 inline-flex items-center rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50 cursor-pointer"
                  >
                    Next
                  </Button>
                </div>
                <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm text-slate-700 dark:text-slate-300">
                      Showing <span className="font-semibold">{(currentPage - 1) * ITEMS_PER_PAGE + 1}</span> to{' '}
                      <span className="font-semibold">
                        {Math.min(currentPage * ITEMS_PER_PAGE, filteredRecords.length)}
                      </span>{' '}
                      of <span className="font-semibold">{filteredRecords.length}</span> results
                    </p>
                  </div>
                  <div>
                    <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
                      <Button
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                        className="relative inline-flex items-center rounded-l-md px-2 py-2 text-slate-400 dark:text-slate-500 ring-1 ring-inset ring-slate-300 dark:ring-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 focus:z-20 focus:outline-offset-0 disabled:opacity-50 cursor-pointer"
                      >
                        <span className="sr-only">Previous</span>
                        <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                          <path fillRule="evenodd" d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z" clipRule="evenodd" />
                        </svg>
                      </Button>
                      
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                        <Button
                          key={page}
                          onClick={() => setCurrentPage(page)}
                          aria-current={currentPage === page ? 'page' : undefined}
                          className={`relative inline-flex items-center px-4 py-2 text-sm font-semibold focus:z-20 focus:outline-offset-0 cursor-pointer ${
                            currentPage === page
                              ? 'z-10 bg-indigo-600 text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600'
                              : 'text-slate-900 dark:text-slate-200 ring-1 ring-inset ring-slate-300 dark:ring-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'
                          }`}
                        >
                          {page}
                        </Button>
                      ))}
                      
                      <Button
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                        className="relative inline-flex items-center rounded-r-md px-2 py-2 text-slate-400 dark:text-slate-500 ring-1 ring-inset ring-slate-300 dark:ring-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 focus:z-20 focus:outline-offset-0 disabled:opacity-50 cursor-pointer"
                      >
                        <span className="sr-only">Next</span>
                        <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                          <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
                        </svg>
                      </Button>
                    </nav>
                  </div>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
