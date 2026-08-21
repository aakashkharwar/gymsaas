import Link from 'next/link';
import { getDashboardStats } from '@/app/actions/dashboard';

export default async function DashboardPage() {
  const stats = await getDashboardStats();

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">Overview</h1>
      
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm transition-colors hover:shadow-md">
          <p className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Active Members</p>
          <p className="mt-4 text-5xl font-extrabold text-slate-900 dark:text-white tracking-tight">{stats.members}</p>
        </div>
        <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-200 dark:border-red-900/20 shadow-sm transition-colors hover:shadow-md">
          <p className="text-sm font-semibold text-slate-500 dark:text-red-400 uppercase tracking-wider">Fees Overdue</p>
          <p className="mt-4 text-5xl font-extrabold text-red-600 dark:text-red-500 tracking-tight">{stats.overdue}</p>
        </div>
        <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-200 dark:border-emerald-900/20 shadow-sm transition-colors hover:shadow-md">
          <p className="text-sm font-semibold text-slate-500 dark:text-emerald-400 uppercase tracking-wider">Monthly Profit</p>
          <p className="mt-4 text-5xl font-extrabold text-emerald-600 dark:text-emerald-500 tracking-tight">₹{stats.profit.toLocaleString('en-IN')}</p>
        </div>
      </div>

      {/* Quick Actions & Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.5fr] gap-6 mt-8">
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm p-8 transition-colors hover:shadow-md">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-6">Quick Actions</h2>
          <div className="space-y-4">
            <Link href="/dashboard/members" className="w-full text-left px-6 py-4 rounded-2xl border border-slate-200 dark:border-slate-700/60 bg-slate-50 dark:bg-slate-800/30 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between group block">
              <span>Add New Member</span>
              <span className="text-xl font-light text-slate-400 group-hover:text-indigo-500 transition-colors">+</span>
            </Link>
            <Link href="/dashboard/fees" className="w-full text-left px-6 py-4 rounded-2xl border border-slate-200 dark:border-slate-700/60 bg-slate-50 dark:bg-slate-800/30 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between group block">
              <span>Record Fee Payment</span>
              <span className="text-xl font-light text-slate-400 group-hover:text-indigo-500 transition-colors">+</span>
            </Link>
            <Link href="/dashboard/expenses" className="w-full text-left px-6 py-4 rounded-2xl border border-slate-200 dark:border-slate-700/60 bg-slate-50 dark:bg-slate-800/30 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between group block">
              <span>Log Expense</span>
              <span className="text-xl font-light text-slate-400 group-hover:text-indigo-500 transition-colors">+</span>
            </Link>
          </div>
        </div>
        
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm p-8 transition-colors hover:shadow-md">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-6">Monthly Insights</h2>
          <div className="space-y-6">
            <div className="flex justify-between items-center text-sm p-4 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors border border-slate-100 dark:border-slate-800">
              <span className="text-slate-700 dark:text-slate-300 font-semibold text-base">New Members</span>
              <span className="text-indigo-600 dark:text-indigo-400 font-bold text-lg">+{stats.newMembers}</span>
            </div>
            <div className="flex justify-between items-center text-sm p-4 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors border border-slate-100 dark:border-slate-800">
              <span className="text-slate-700 dark:text-slate-300 font-semibold text-base">Total Revenue</span>
              <span className="text-emerald-600 dark:text-emerald-500 font-bold text-lg">₹{stats.totalRevenue.toLocaleString('en-IN')}</span>
            </div>
            <div className="flex justify-between items-center text-sm p-4 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors border border-slate-100 dark:border-slate-800">
              <span className="text-slate-700 dark:text-slate-300 font-semibold text-base">Total Expenses</span>
              <span className="text-red-600 dark:text-red-500 font-bold text-lg">₹{stats.totalExpenses.toLocaleString('en-IN')}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm p-8">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Expiring in 3 days</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">Members whose unpaid membership invoice is due within the next 3 days.</p>
        {(stats.expiring ?? []).length === 0 ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">Nobody is expiring in the next 3 days.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {(stats.expiring ?? []).map((item) => (
              <div key={item.id} className="rounded-2xl border border-amber-200 dark:border-amber-900/40 bg-amber-50/70 dark:bg-amber-950/20 p-4">
                <p className="font-semibold text-slate-900 dark:text-white">{item.name}</p>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">Due {item.dueDate} · ₹{item.amount.toLocaleString('en-IN')}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">{[item.phone, item.email].filter(Boolean).join(' · ') || 'No contact saved'}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
