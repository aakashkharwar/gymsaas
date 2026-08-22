'use client';
import { Button } from '@/components/ui/button';


import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import Link from 'next/link';
import { ArrowLeft, Download, Printer, RefreshCw, Save, Trash2, QrCode } from 'lucide-react';
import { useMembers } from '@/hooks/useGymQueries';

type QRToken = {
  token: string;
  label?: string;
  createdAt: string;
  memberId?: string;
};

type Member = {
  id: string;
  name: string;
  username?: string;
  phone?: string;
};

const STORAGE_KEY = 'gymos-qr-tokens';

export default function QRGeneratorPage() {
  const [token, setToken] = useState('GYM-000');
  const [label, setLabel] = useState('Main Entrance');
  const [size, setSize] = useState(280);
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [saved, setSaved] = useState<QRToken[]>([]);

  const { data: members = [] } = useMembers();
  const [assocMemberId, setAssocMemberId] = useState<string | undefined>(undefined);
  const [gymName, setGymName] = useState('GYM NAME');
  const [orgId, setOrgId] = useState('');

  useEffect(() => {
    setToken(`GYM-${Math.floor(100 + Math.random() * 900)}`);
  }, []);

  useEffect(() => {
    import('@/app/actions/dashboard').then((m) => {
      m.getCheckInContext().then((ctx) => {
        setGymName(ctx.gymName);
        setOrgId(ctx.orgId);
      });
    });
  }, []);

  useEffect(() => {
    let mounted = true;
    import('@/utils/storage').then(async (m) => {
      try {
        const tok = await m.getQRTokens();
        if (mounted && Array.isArray(tok)) setSaved(tok);
      } catch {}
    });
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    generate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, size, orgId]);

  const getTargetUrl = () => {
    const origin = typeof window === 'undefined' ? '' : window.location.origin;
    const params = new URLSearchParams({ qr: token });
    if (orgId) params.set('org', orgId);
    return `${origin}/check-in?${params.toString()}`;
  };

  async function generate() {
    try {
      const data = await QRCode.toDataURL(getTargetUrl(), { margin: 1, width: size, errorCorrectionLevel: 'H', color: { dark: '#111827', light: '#ffffff' } });
      setQrDataUrl(data);
    } catch (err) {
      setQrDataUrl('');
    }
  }

  async function saveToken() {
    const entry: QRToken = { token: token.trim(), label: label.trim(), createdAt: new Date().toISOString(), memberId: assocMemberId };
    const next = [entry, ...saved.filter((s) => s.token !== entry.token)];
    setSaved(next);
    try {
      const m = await import('@/utils/storage');
      await m.saveQRTokens(next);
    } catch {
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch {}
    }
  }

  function downloadPng() {
    if (!qrDataUrl) return;
    const link = document.createElement('a');
    link.href = qrDataUrl;
    link.download = `${token}.png`;
    document.body.appendChild(link);
    link.click();
    link.remove();
  }

  function printPreview() {
    const w = window.open('', '_blank');
    if (!w) return;
    w.document.write(`<!doctype html>
<html>
<head>
  <title>Print QR - ${token}</title>
  <style>
    body { display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background: #f1f5f9; }
    .card { background: #fff; color: #0f172a; width: min(340px, 92vw); min-height: 480px; display: flex; flex-direction: column; align-items: center; box-sizing: border-box; padding: 28px 24px; box-shadow: 0 10px 25px rgba(15,23,42,0.12); border: 1px solid #e2e8f0; }
    h1 { margin: 8px 0 0; font-size: clamp(22px, 8vw, 36px); font-weight: 900; text-transform: uppercase; line-height: 1; text-align: center; word-break: break-word; color: #0f172a; }
    h2 { margin: 6px 0 0; font-size: clamp(14px, 5vw, 22px); font-weight: 700; text-transform: uppercase; line-height: 1.1; text-align: center; color: #d97706; }
    p.desc { text-align: center; font-size: 13px; color: #475569; margin: 16px 0; line-height: 1.4; }
    .qr-container { margin: 10px 0; display: flex; justify-content: center; width: 100%; }
    img { width: min(${size}px, 70vw); height: auto; display: block; background: #fff; padding: 8px; border: 1px solid #e2e8f0; }
    .footer { margin-top: 25px; text-align: center; font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #334155; }
    .footer div { margin: 4px 0; }
  </style>
</head>
<body>
  <div class="card">
    <h1>${gymName}</h1>
    <h2>ATTENDANCE SCANNER</h2>
    <p class="desc">Phone Camera se QR scan karein.<br/>Mobile number daalein aur<br/>Mark attendance dabayein.</p>
    <div class="qr-container">
      <img src="${qrDataUrl}" alt="qr" />
    </div>
    <div class="footer">
      <div>ID : ${token}</div>
      <div>LABEL : ${label || 'N/A'}</div>
    </div>
  </div>
  <script>setTimeout(()=>window.print(), 300);</script>
</body>
</html>`);
    w.document.close();
    w.focus();
  }

  async function removeToken(t: string) {
    const next = saved.filter((s) => s.token !== t);
    setSaved(next);
    try {
      const m = await import('@/utils/storage');
      await m.saveQRTokens(next);
    } catch {
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch {}
    }
  }

  return (
    <div className="mx-auto max-w-5xl min-w-0 space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">Generate QR</h1>
          {!orgId && (
            <p className="mt-2 text-sm text-amber-600 dark:text-amber-400">Gym link load ho rahi hai. Print se pehle wait karo, warna QR is gym pe nahi khulega.</p>
          )}
        </div>
        <Link href="/dashboard/attendance" className="inline-flex items-center gap-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-5 py-2.5 text-sm font-semibold text-slate-700 dark:text-slate-300 shadow-sm transition-colors hover:bg-slate-50 dark:hover:bg-slate-800">
          <ArrowLeft className="h-4 w-4" />
          Back to Attendance
        </Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-2 min-w-0">
        {/* Left Column: Form */}
        <div className="flex flex-col gap-6 min-w-0">
          <div className="w-full min-w-0 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-8 shadow-sm transition-colors">
            <h2 className="mb-6 text-xl font-bold text-slate-900 dark:text-white">QR Configuration</h2>
            
            <div className="space-y-6">
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-300">Label</label>
                <input 
                  value={label} 
                  onChange={(e) => setLabel(e.target.value)} 
                  className="w-full min-w-0 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 px-4 py-3 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-colors"
                  placeholder="e.g. Main Entrance"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-300">Token ID</label>
                <div className="flex min-w-0 gap-2">
                  <input 
                    value={token} 
                    onChange={(e) => setToken(e.target.value)} 
                    className="flex-1 min-w-0 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 px-4 py-3 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-colors"
                    placeholder="GYM-XXX"
                  />
                  <Button 
                    type="button"
                    variant="outline"
                    onClick={() => setToken(`GYM-${Math.floor(100 + Math.random() * 900)}`)} 
                    className="shrink-0 rounded-xl px-3 sm:px-4 py-3 text-sm font-semibold"
                  >
                    <RefreshCw className="h-4 w-4" />
                    <span className="hidden sm:inline">Random</span>
                  </Button>
                </div>
              </div>

              <div className="grid gap-6 sm:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-300">Size (px)</label>
                  <input 
                    type="number" 
                    value={size} 
                    onChange={(e) => setSize(Number(e.target.value || 280))} 
                    className="w-full min-w-0 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 px-4 py-3 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-colors"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-300">Associate member</label>
                  <select 
                    value={assocMemberId || ''} 
                    onChange={(e) => setAssocMemberId(e.target.value || undefined)} 
                    className="w-full min-w-0 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 px-4 py-3 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-colors"
                  >
                    <option value="">-- Optional --</option>
                    {members.map((m) => (
                      <option key={m.id} value={m.id}>{m.name}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-800">
              <div className="flex flex-wrap gap-3">
                <Button onClick={generate} className="inline-flex shrink-0 items-center gap-2 transition-colors">
                  <QrCode className="h-4 w-4" />
                  Generate
                </Button>
                <Button onClick={saveToken} className="inline-flex shrink-0 items-center gap-2 transition-colors">
                  <Save className="h-4 w-4" />
                  Save Configuration
                </Button>
              </div>
              <div className="mt-5 w-full min-w-0 rounded-xl bg-slate-50 dark:bg-slate-800/30 p-4 border border-slate-100 dark:border-slate-800/50">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">Member scan link</p>
                <code className="block w-full text-sm text-slate-700 dark:text-slate-300 break-all">{getTargetUrl()}</code>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Preview & Saved */}
        <div className="flex flex-col gap-6 min-w-0">
          <div className="w-full min-w-0 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 sm:p-6 shadow-sm transition-colors text-center">
            <h2 className="mb-4 text-xl font-bold text-slate-900 dark:text-white text-left">Live Preview</h2>
            
            <div className="flex w-full min-w-0 items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/30 p-2 sm:p-3">
              {qrDataUrl ? (
                <div className="w-full max-w-[280px] mx-auto bg-white px-4 py-6 sm:px-5 sm:py-8 text-slate-900 shadow-xl box-border border border-slate-200">
                  <h1 className="text-slate-900 text-2xl sm:text-3xl font-black text-center uppercase leading-tight break-words">
                    {gymName}
                  </h1>
                  <h2 className="text-amber-600 text-base sm:text-xl font-bold text-center uppercase leading-tight mt-1 break-words">
                    Attendance Scanner
                  </h2>
                  
                  <p className="text-slate-600 text-center text-xs sm:text-sm mt-4 leading-relaxed">
                    Phone Camera se QR scan karein. Mobile number daalein aur Mark attendance dabayein.
                  </p>
                  
                  <div className="mt-4 flex justify-center w-full">
                    <img
                      src={qrDataUrl}
                      alt="QR Preview"
                      className="block w-[70%] max-w-[200px] aspect-square object-contain bg-white p-2 border border-slate-200"
                    />
                  </div>

                  <div className="mt-5 text-center text-slate-700 text-[11px] sm:text-xs font-semibold uppercase tracking-wider space-y-1 break-words">
                    <p>ID : {token}</p>
                    <p>LABEL : {label || 'N/A'}</p>
                  </div>
                </div>
              ) : (
                <div className="py-16 text-sm text-slate-400 dark:text-slate-500">Click Generate to preview</div>
              )}
            </div>
            
            <div className="mt-6 hidden">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">{label || 'Untitled QR'}</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{token}</p>
            </div>

            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Button variant="outline" onClick={downloadPng} disabled={!qrDataUrl || !orgId} className="inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold disabled:opacity-50">
                <Download className="h-4 w-4" />
                Download
              </Button>
              <Button variant="outline" onClick={printPreview} disabled={!qrDataUrl || !orgId} className="inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold disabled:opacity-50">
                <Printer className="h-4 w-4" />
                Print
              </Button>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-8 shadow-sm transition-colors">
            <h2 className="mb-4 text-xl font-bold text-slate-900 dark:text-white">Saved Tokens</h2>
            {saved.length === 0 ? (
              <p className="text-sm text-slate-500 dark:text-slate-400">No tokens saved yet.</p>
            ) : (
              <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
                {saved.map((s) => (
                  <div key={s.token} className="group rounded-2xl border border-slate-200 dark:border-slate-700/60 bg-slate-50 dark:bg-slate-800/30 p-4 transition-colors hover:bg-slate-100 dark:hover:bg-slate-800/60">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-semibold text-slate-900 dark:text-white">{s.label || s.token}</p>
                        <p className="truncate text-sm text-slate-500 dark:text-slate-400 mt-0.5">{s.token}</p>
                        {s.memberId && (
                          <p className="truncate text-xs text-indigo-600 dark:text-indigo-400 mt-1.5 font-medium">
                            👤 {members.find((m) => m.id === s.memberId)?.name || 'Linked Member'}
                          </p>
                        )}
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <Button 
                          onClick={() => { setToken(s.token); setLabel(s.label || ''); setAssocMemberId(s.memberId); }} 
                          className="rounded-lg bg-white dark:bg-slate-700 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 shadow-sm border border-slate-200 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-600 transition-colors"
                        >
                          Load
                        </Button>
                        <Button 
                          onClick={() => removeToken(s.token)} 
                          className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20 dark:hover:text-red-400 transition-colors"
                          title="Delete token"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
