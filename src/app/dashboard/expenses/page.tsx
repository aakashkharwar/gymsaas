'use client';

import { useQuery } from '@tanstack/react-query';
import { getExpenses } from '@/app/actions/expenses';
import { getDashboardStats } from '@/app/actions/dashboard';
import { Receipt } from 'lucide-react';
import LogExpenseModal from './LogExpenseModal';
import { queryKeys } from '@/lib/query-keys';

export default function ExpensesPage() {
  const { data: expenses = [] } = useQuery({
    queryKey: queryKeys.expenses,
    queryFn: getExpenses,
  });
  const { data: stats } = useQuery({
    queryKey: queryKeys.dashboard,
    queryFn: getDashboardStats,
  });

  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();
  
  const thisMonthExpenses = expenses.filter((e: { expense_date: string; amount: number }) => {
    const d = new Date(e.expense_date);
    return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
  });

  const totalExpenseThisMonth = thisMonthExpenses.reduce((sum: number, e: { amount: number }) => sum + Number(e.amount), 0);
  const totalRevenueThisMonth = stats?.totalRevenue || 0;
  const netProfit = totalRevenueThisMonth - totalExpenseThisMonth;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Expenses & Profit</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">Track your operational costs and view profitability.</p>
        </div>
        <LogExpenseModal />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Revenue (This Month)</p>
          <p className="mt-2 text-3xl font-bold text-slate-900 dark:text-white">₹{totalRevenueThisMonth.toLocaleString()}</p>
        </div>
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Expenses (This Month)</p>
          <p className="mt-2 text-3xl font-bold text-red-600 dark:text-red-400">₹{totalExpenseThisMonth.toLocaleString()}</p>
        </div>
        <div className="bg-slate-900 dark:bg-indigo-600 p-6 rounded-2xl border border-transparent shadow-sm">
          <p className="text-sm font-medium text-slate-300 dark:text-indigo-100">Net Profit</p>
          <p className="mt-2 text-3xl font-bold text-white">₹{netProfit.toLocaleString()}</p>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 px-5 py-4 flex justify-between items-center">
          <h3 className="font-semibold text-slate-900 dark:text-white text-sm">All Expenses</h3>
        </div>
        
        {expenses.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-sm text-slate-500 dark:text-slate-400 bg-slate-50/50 dark:bg-slate-800/30">
                  <th className="px-5 py-4 font-semibold">Date</th>
                  <th className="px-5 py-4 font-semibold">Category</th>
                  <th className="px-5 py-4 font-semibold">Notes</th>
                  <th className="px-5 py-4 font-semibold text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="text-sm divide-y divide-slate-100 dark:divide-slate-800/50">
                {expenses.map((e: { id: string; expense_date: string; category: string; notes?: string; amount: number }) => (
                  <tr key={e.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <td className="px-5 py-4 text-slate-600 dark:text-slate-400">{new Date(e.expense_date).toLocaleDateString()}</td>
                    <td className="px-5 py-4 font-medium text-slate-900 dark:text-slate-200 capitalize">{e.category}</td>
                    <td className="px-5 py-4 text-slate-500 dark:text-slate-400">{e.notes || '-'}</td>
                    <td className="px-5 py-4 text-right font-medium text-slate-900 dark:text-slate-200">₹{e.amount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-12 flex flex-col items-center justify-center text-center">
            <div className="w-12 h-12 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-3">
              <Receipt className="w-6 h-6 text-slate-400 dark:text-slate-500" />
            </div>
            <p className="text-slate-900 dark:text-slate-200 font-medium">No expenses yet</p>
            <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">When you log expenses, they will appear here.</p>
          </div>
        )}
      </div>
    </div>
  );
}
