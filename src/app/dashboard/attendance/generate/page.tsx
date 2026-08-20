'use client';
import { Button } from '@/components/ui/button';


import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import Link from 'next/link';
import { ArrowLeft, Download, Printer, RefreshCw, Save, Trash2, QrCode } from 'lucide-react';

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

  const [members, setMembers] = useState<Member[]>([]);
  const [assocMemberId, setAssocMemberId] = useState<string | undefined>(undefined);
  const [gymName, setGymName] = useState('GYM NAME');

  useEffect(() => {
    setToken(`GYM-${Math.floor(100 + Math.random() * 900)}`);
  }, []);

  useEffect(() => {
    import('@/app/actions/dashboard').then((m) => {
      m.getGymName().then(setGymName);
    });
  }, []);

  useEffect(() => {
    let mounted = true;
    import('@/utils/storage').then(async (m) => {
      try {
        const tok = await m.getQRTokens();
        if (mounted && Array.isArray(tok)) setSaved(tok);
      } catch {}
      try {
        const mem = await m.getMembers();
        if (mounted && Array.isArray(mem)) setMembers(mem);
      } catch {}
    });
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    generate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, size]);

  const getTargetUrl = () => {
    if (typeof window === 'undefined') return `/dashboard/attendance?qr=${encodeURIComponent(token)}`;
    return `${window.location.origin}/dashboard/attendance?qr=${encodeURIComponent(token)}`;
  };

  async function generate() {
    try {
      const url = getTargetUrl();
      const data = await QRCode.toDataURL(url, { margin: 1, width: size, errorCorrectionLevel: 'H', color: { dark: '#f59e0b', light: '#000000' } });
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
    body { display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background: #eee; }
    .card { position: relative; background: #000; color: #fff; width: 340px; min-height: 540px; display: flex; flex-direction: column; align-items: center; box-sizing: border-box; padding: 30px; box-shadow: 0 10px 25px rgba(0,0,0,0.2); }
    .top-xs { position: absolute; top: 20px; right: 20px; font-weight: 900; font-size: 20px; letter-spacing: 2px; }
    .side-xs { position: absolute; top: 50%; right: 10px; transform: translateY(-50%); display: flex; flex-direction: column; font-weight: 900; font-size: 16px; line-height: 1; gap: 4px; }
    h1 { margin: 20px 0 0; font-size: 42px; font-weight: 900; text-transform: uppercase; line-height: 0.9; text-align: center; }
    h2 { margin: 5px 0 0; font-size: 26px; font-weight: 700; text-transform: uppercase; line-height: 1; text-align: center; }
    p.desc { text-align: center; font-size: 14px; color: #ccc; margin: 20px 0; line-height: 1.4; }
    .qr-container { position: relative; margin: 10px 0; display: flex; justify-content: center; width: 100%; }
    img { width: ${size}px; height: ${size}px; display: block; }
    .footer { margin-top: 25px; text-align: center; font-size: 13px; font-style: italic; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; color: #fff; }
    .footer div { margin: 4px 0; }
  </style>
</head>
<body>
  <div class="card">
    <div class="top-xs">XXX</div>
    <h1>${gymName}</h1>
    <h2>ATTENDANCE SCANNER</h2>
    <p class="desc">Please scan this QR code using your<br/>phone or show it to the receptionist<br/>to mark your daily attendance.</p>
    <div class="qr-container">
      <img src="${qrDataUrl}" alt="qr" />
      <div class="side-xs"><span>X</span><span>X</span><span>X</span></div>
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
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">Generate QR</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Create and manage QR tokens for member attendance.</p>
        </div>
        <Link href="/dashboard/attendance" className="inline-flex items-center gap-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-5 py-2.5 text-sm font-semibold text-slate-700 dark:text-slate-300 shadow-sm transition-colors hover:bg-slate-50 dark:hover:bg-slate-800">
          <ArrowLeft className="h-4 w-4" />
          Back to Attendance
        </Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_400px]">
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
                <div className="flex gap-3">
                  <input 
                    value={token} 
                    onChange={(e) => setToken(e.target.value)} 
                    className="flex-1 min-w-0 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 px-4 py-3 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-colors"
                    placeholder="GYM-XXX"
                  />
                  <Button 
                    type="button" 
                    onClick={() => setToken(`GYM-${Math.floor(100 + Math.random() * 900)}`)} 
                    className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-slate-100 dark:bg-slate-800 px-4 py-3 text-sm font-semibold text-slate-700 dark:text-slate-300 transition-colors hover:bg-slate-200 dark:hover:bg-slate-700"
                  >
                    <RefreshCw className="h-4 w-4" />
                    Random
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
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">Target URL</p>
                <code className="block w-full text-sm text-slate-700 dark:text-slate-300 break-all">{getTargetUrl()}</code>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Preview & Saved */}
        <div className="flex flex-col gap-6">
          <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-8 shadow-sm transition-colors text-center">
            <h2 className="mb-6 text-xl font-bold text-slate-900 dark:text-white text-left">Live Preview</h2>
            
            <div className="flex min-h-[500px] items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/30 p-4 overflow-hidden">
              {qrDataUrl ? (
                <div className="relative flex flex-col items-center bg-black p-8 shadow-2xl overflow-hidden shrink-0" style={{ width: 340, minHeight: 540 }}>
                  <div className="absolute top-4 right-4 text-white text-xl font-black tracking-widest leading-none">
                    XXX
                  </div>
                  
                  <h1 className="text-white text-[42px] font-black text-center uppercase leading-[0.9] mt-8 w-full break-words">
                    {gymName}
                  </h1>
                  <h2 className="text-white text-[26px] font-bold text-center uppercase leading-none mt-1 w-full">
                    ATTENDANCE SCANNER
                  </h2>
                  
                  <p className="text-gray-300 text-center text-sm mt-5 leading-relaxed px-2">
                    Please scan this QR code using your<br/>phone or show it to the receptionist<br/>to mark your daily attendance.
                  </p>
                  
                  <div className="relative mt-5 flex justify-center w-full">
                    <img src={qrDataUrl} alt="QR Preview" style={{ width: 200, height: 200 }} className="block" />
                    <div className="absolute top-1/2 right-2 -translate-y-1/2 flex flex-col space-y-1 text-white text-lg font-black leading-none">
                      <span>X</span><span>X</span><span>X</span>
                    </div>
                  </div>

                  <div className="mt-8 text-center text-white text-[13px] italic font-semibold uppercase tracking-wider space-y-1.5">
                    <p>ID : {token}</p>
                    <p>LABEL : {label || 'N/A'}</p>
                  </div>
                </div>
              ) : (
                <div className="text-sm text-slate-400 dark:text-slate-500">Click Generate to preview</div>
              )}
            </div>
            
            <div className="mt-6 hidden">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">{label || 'Untitled QR'}</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{token}</p>
            </div>

            <div className="mt-6 flex justify-center gap-3">
              <Button onClick={downloadPng} disabled={!qrDataUrl} className="inline-flex items-center gap-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-4 py-2.5 text-sm font-semibold text-slate-700 dark:text-slate-300 shadow-sm transition-colors hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed">
                <Download className="h-4 w-4" />
                Download
              </Button>
              <Button onClick={printPreview} disabled={!qrDataUrl} className="inline-flex items-center gap-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-4 py-2.5 text-sm font-semibold text-slate-700 dark:text-slate-300 shadow-sm transition-colors hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed">
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
