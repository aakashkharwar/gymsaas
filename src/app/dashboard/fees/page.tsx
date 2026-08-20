import { IndianRupee, AlertTriangle, FileText, ArrowUpRight, CheckCircle, Clock } from 'lucide-react';
import Link from 'next/link';
import { getFeeDashboardStats, getFees } from '@/app/actions/fees';

export default async function FeesDashboard() {
  const metrics = await getFeeDashboardStats();
  // Fetch recent payments and take top 5
  const allFees = await getFees();
  const recentPayments = allFees ? allFees.slice(0, 5) : [];

  return (
    <div className="mx-auto max-w-7xl space-y-8">
      <div>
        <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white">Fees Dashboard</h1>
        <p className="mt-2 text-lg text-slate-500 dark:text-slate-400">Overview of collections, dues, and financial health.</p>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="rounded-xl bg-emerald-50 dark:bg-emerald-500/10 p-3 text-emerald-600 dark:text-emerald-400">
              <IndianRupee className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Collected Today</p>
              <h3 className="text-2xl font-bold text-slate-900 dark:text-white">₹{metrics.totalCollectedToday.toLocaleString()}</h3>
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="rounded-xl bg-blue-50 dark:bg-blue-500/10 p-3 text-blue-600 dark:text-blue-400">
              <ArrowUpRight className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Monthly Collection</p>
              <h3 className="text-2xl font-bold text-slate-900 dark:text-white">₹{metrics.totalCollectedMonth.toLocaleString()}</h3>
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="rounded-xl bg-amber-50 dark:bg-amber-500/10 p-3 text-amber-600 dark:text-amber-400">
              <FileText className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Pending Dues</p>
              <h3 className="text-2xl font-bold text-slate-900 dark:text-white">₹{metrics.totalPendingDues.toLocaleString()}</h3>
            </div>
          </div>
        </div>

        <Link href="/dashboard/fees/invoices" className="cursor-pointer rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm hover:border-red-300 dark:hover:border-red-800 transition-colors block">
          <div className="flex items-center gap-4">
            <div className="rounded-xl bg-red-50 dark:bg-red-500/10 p-3 text-red-600 dark:text-red-400">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Overdue Invoices</p>
              <h3 className="text-2xl font-bold text-slate-900 dark:text-white">{metrics.overdueCount}</h3>
            </div>
          </div>
        </Link>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4">Quick Actions</h2>
          <div className="space-y-4">
            <Link href="/dashboard/fees/collections" className="block w-full cursor-pointer rounded-xl bg-slate-50 dark:bg-slate-800/50 p-4 text-center font-semibold text-indigo-600 dark:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
              + Collect Payment
            </Link>
            <Link href="/dashboard/fees/invoices" className="block w-full cursor-pointer rounded-xl bg-slate-50 dark:bg-slate-800/50 p-4 text-center font-semibold text-indigo-600 dark:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
              Manage Invoices
            </Link>
            <Link href="/dashboard/fees/plans" className="block w-full cursor-pointer rounded-xl bg-slate-50 dark:bg-slate-800/50 p-4 text-center font-semibold text-indigo-600 dark:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
              Configure Fee Plans
            </Link>
            <Link href="/dashboard/fees/ledger" className="block w-full cursor-pointer rounded-xl bg-slate-50 dark:bg-slate-800/50 p-4 text-center font-semibold text-indigo-600 dark:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
              View Payment Ledger
            </Link>
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">Recent Payments</h2>
            <Link href="/dashboard/fees/ledger" className="text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer">View all</Link>
          </div>
          
          {recentPayments.length === 0 ? (
            <div className="flex-1 flex flex-col justify-center items-center text-center py-8">
              <Clock className="h-12 w-12 text-slate-300 dark:text-slate-600 mb-3" />
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">No recent payments</h3>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Payments you collect will appear here.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {recentPayments.map(payment => (
                <div key={payment.id} className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4 last:border-0 last:pb-0">
                  <div>
                    <p className="font-semibold text-slate-900 dark:text-white">{payment.members?.name || 'Unknown Member'}</p>
                    <p className="text-sm text-slate-500 dark:text-slate-400">{new Date(payment.paid_at).toLocaleDateString()} &middot; {payment.payment_mode}</p>
                  </div>
                  <div className="font-bold text-emerald-600 dark:text-emerald-400">
                    +₹{payment.amount.toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
