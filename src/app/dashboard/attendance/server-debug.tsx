'use client';


import { useCallback, useEffect, useState } from 'react';

type Stored = Record<string, unknown>;

export default function AttendanceServerDebug() {
  const [rows, setRows] = useState<Stored[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [orgId, setOrgId] = useState(() => {
    try { return localStorage.getItem('gymos_admin_org') || 'default'; } catch { return 'default'; }
  });
  const [token, setToken] = useState(() => {
    try { return localStorage.getItem('gymos_admin_token') || ''; } catch { return ''; }
  });
  const [authStatus, setAuthStatus] = useState<'unknown' | 'valid' | 'invalid'>('unknown');

  useEffect(() => {
    try {
      localStorage.setItem('gymos_admin_org', orgId || '');
    } catch {}
  }, [orgId]);

  useEffect(() => {
    try {
      localStorage.setItem('gymos_admin_token', token || '');
    } catch {}
  }, [token]);

  const fetchRows = useCallback(async () => {
    setLoading(true);
    try {
      const headers: Record<string, string> = {};
      if (orgId) headers['x-org-id'] = orgId;
      if (token) {
        headers['authorization'] = 'Bearer ' + token;
        headers['x-api-key'] = token;
      }

      const params = new URLSearchParams({ debug: '1' });
      if (orgId) params.set('org', orgId);

      const res = await fetch(`/api/attendance/sync?${params.toString()}`, {
        method: 'GET',
        headers,
      });

      if (!res.ok) {
        console.error('Failed to fetch server rows', res.status);
        setRows([]);
        if (res.status === 401) setAuthStatus('invalid');
        return;
      }

      const data = await res.json();
      setRows(data.rows || []);
      setAuthStatus('valid');
    } catch (error) {
      console.error(error);
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [orgId, token]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void fetchRows();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [fetchRows]);

  const testAuth = async () => {
    setLoading(true);
    try {
      const headers: Record<string, string> = {};
      if (orgId) headers['x-org-id'] = orgId;
      if (token) {
        headers['authorization'] = 'Bearer ' + token;
        headers['x-api-key'] = token;
      }

      const params = new URLSearchParams({ debug: '1' });
      if (orgId) params.set('org', orgId);

      const res = await fetch(`/api/attendance/sync?${params.toString()}`, { method: 'GET', headers });
      if (res.ok) setAuthStatus('valid');
      else setAuthStatus('invalid');
    } catch (error) {
      console.error('Auth test failed', error);
      setAuthStatus('invalid');
    } finally {
      setLoading(false);
    }
  };

  const filtered = rows.filter((r) => {
    const q = filter.trim().toLowerCase();
    if (q) {
      const hay = `${String(r.memberName ?? '')} ${String(r.username ?? '')} ${String(r.qrCode ?? '')}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    if (dateFilter) {
      if (String(r.date ?? '').indexOf(dateFilter) !== 0) return false;
    }
    return true;
  });

  function exportCsv() {
    const headers = ['id', 'memberName', 'username', 'qrCode', 'date', 'entryTime', 'exitTime', 'status', 'createdAt', 'serverReceivedAt'];
    const lines = [headers.join(',')];
    for (const r of filtered) {
      const row = headers
        .map((h) => {
          const v = r[h] ?? '';
          const s = String(v).replace(/"/g, '""');
          return `"${s}"`;
        })
        .join(',');
      lines.push(row);
    }

    const blob = new Blob([lines.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = orgId ? `attendance-server-${orgId}.csv` : 'attendance-server.csv';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="mx-auto max-w-6xl p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Server Attendance Store (Debug)</h1>
          <p className="text-sm text-slate-500">Lists attendance records persisted on the server (.data/attendance.json)</p>
        </div>
        <div className="flex items-center gap-2">
          <input value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="Search name, username or qr" className="rounded-md border px-3 py-2" />
          <input type="date" value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} className="rounded-md border px-3 py-2" />
          <input value={orgId} onChange={(e) => setOrgId(e.target.value)} placeholder="Org ID" className="rounded-md border px-3 py-2" />
          <div className="flex items-center gap-2">
            <input value={token} onChange={(e) => setToken(e.target.value)} placeholder="Demo token (optional)" className="rounded-md border px-3 py-2" />
            <Button onClick={testAuth} className="rounded-md bg-indigo-600 px-3 py-2 text-white">Test token</Button>
            <div className="text-sm">
              {authStatus === 'valid' && <span className="text-emerald-600">● Valid</span>}
              {authStatus === 'invalid' && <span className="text-amber-600">● Invalid</span>}
              {authStatus === 'unknown' && <span className="text-slate-400">● Unknown</span>}
            </div>
          </div>
          <Button onClick={fetchRows} className="rounded-md bg-slate-900 px-3 py-2 text-white">Refresh</Button>
          <Button onClick={exportCsv} className="rounded-md bg-emerald-600 px-3 py-2 text-white">Export CSV</Button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border p-2">
        {loading ? (
          <div className="p-6 text-center">Loading…</div>
        ) : (
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-left text-slate-600">
              <tr>
                <th className="p-2">ID</th>
                <th className="p-2">Member</th>
                <th className="p-2">Username</th>
                <th className="p-2">QR</th>
                <th className="p-2">Date</th>
                <th className="p-2">Entry</th>
                <th className="p-2">Exit</th>
                <th className="p-2">Status</th>
                <th className="p-2">Received</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={String(r.id)} className="border-t">
                  <td className="p-2 align-top">
                    <div className="w-40 truncate">{String(r.id ?? '')}</div>
                  </td>
                  <td className="p-2 align-top">{String(r.memberName ?? '')}</td>
                  <td className="p-2 align-top">{String(r.username ?? '')}</td>
                  <td className="p-2 align-top">{String(r.qrCode ?? '')}</td>
                  <td className="p-2 align-top">{String(r.date ?? '')}</td>
                  <td className="p-2 align-top">{String(r.entryTime ?? '')}</td>
                  <td className="p-2 align-top">{String(r.exitTime ?? '')}</td>
                  <td className="p-2 align-top">{String(r.status ?? '')}</td>
                  <td className="p-2 align-top">{String(r.serverReceivedAt ?? r.createdAt ?? '')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
