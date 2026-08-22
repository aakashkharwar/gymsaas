'use client';

import { useState } from 'react';
import { IndianRupee, Search, Calendar, User, CheckCircle, ArrowDownLeft, ArrowUpRight } from 'lucide-react';
import type { PendingPayment } from '@/utils/fee-store';
import { useFees } from '@/hooks/useGymQueries';

export default function LedgerPage() {
  const { data: payments = [] } = useFees();
  const [search, setSearch] = useState('');

  const filteredPayments = payments.filter((p: any) => {
    const memberName = p.members?.name || '';
    if (!search) return true;
    return memberName.toLowerCase().includes(search.toLowerCase());
  });

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white">Payment Ledger</h1>
          <p className="mt-2 text-lg text-slate-500 dark:text-slate-400">A detailed chronological record of all fee collections.</p>
        </div>
      </div>

      <div className="w-full overflow-hidden rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm transition-colors">
        <div className="flex flex-col gap-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/50 p-4 sm:p-5 md:flex-row">
          <div className="relative flex-1 max-w-md">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by member name..."
              className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 py-2.5 pl-10 pr-4 text-sm text-slate-700 dark:text-slate-200 focus:border-indigo-500 dark:focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:focus:ring-indigo-400"
            />
          </div>
        </div>

        {filteredPayments.length === 0 ? (
          <div className="flex min-h-[420px] flex-col items-center justify-center px-6 py-12 text-center">
            <div className="mb-4 rounded-full bg-slate-100 dark:bg-slate-800 p-4 text-slate-400 dark:text-slate-500">
              <IndianRupee className="h-12 w-12" />
            </div>
            <h3 className="text-2xl font-bold text-slate-900 dark:text-white">No transactions found</h3>
            <p className="mt-2 text-slate-500 dark:text-slate-400">Record payments to see them in the ledger.</p>
          </div>
        ) : (
          <div className="w-full overflow-x-auto">
            <table className="min-w-full text-left">
              <thead className="bg-slate-50/50 dark:bg-slate-800/30 text-sm text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="px-6 py-4 font-semibold">Date & Time</th>
                  <th className="px-6 py-4 font-semibold">Member</th>
                  <th className="px-6 py-4 font-semibold">Mode</th>
                  <th className="px-6 py-4 font-semibold">Receipt No</th>
                  <th className="px-6 py-4 font-semibold">Amount</th>
                  <th className="px-6 py-4 font-semibold">Sync Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50 text-sm">
                {filteredPayments.map((p: any) => {
                  const memberName = p.members?.name || 'Unknown Member';
                  const date = new Date(p.paid_at);
                  
                  return (
                    <tr key={p.id} className="bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-slate-400" />
                          <span className="text-slate-600 dark:text-slate-400">{date.toLocaleDateString()}</span>
                          <span className="text-xs text-slate-400">{date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 font-medium text-slate-900 dark:text-slate-200">
                          <User className="h-4 w-4 text-slate-400" />
                          {memberName}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-slate-600 dark:text-slate-400 font-medium">{p.payment_mode}</td>
                      <td className="px-6 py-4 text-slate-600 dark:text-slate-400">{p.receipt_no || '-'}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1 font-bold text-emerald-600 dark:text-emerald-400">
                          <ArrowDownLeft className="h-4 w-4" />
                          ₹{p.amount}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${
                          p.synced ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400' : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400'
                        }`}>
                          {p.synced ? <CheckCircle className="h-3 w-3" /> : <div className="h-2 w-2 rounded-full bg-slate-400 animate-pulse" />}
                          {p.synced ? 'Synced' : 'Pending Sync'}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
