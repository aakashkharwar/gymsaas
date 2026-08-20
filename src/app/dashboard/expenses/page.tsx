import { getExpenses } from '@/app/actions/expenses';
import { Receipt } from 'lucide-react';
import LogExpenseModal from './LogExpenseModal';
import { createClient } from '@/utils/supabase/server';

export default async function ExpensesPage() {
  const expenses = await getExpenses();

  // Basic calculation for the current month
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();
  
  const thisMonthExpenses = expenses.filter((e: any) => {
    const d = new Date(e.expense_date);
    return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
  });

  const totalExpenseThisMonth = thisMonthExpenses.reduce((sum: number, e: any) => sum + Number(e.amount), 0);

  // Fetch real revenue from payments table
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  let totalRevenueThisMonth = 0;
  if (user) {
    const { data: admin } = await supabase.from('admin_users').select('organization_id').eq('id', user.id).single();
    if (admin?.organization_id) {
      // Start and end of current month
      const startOfMonth = new Date(currentYear, currentMonth, 1).toISOString();
      const endOfMonth = new Date(currentYear, currentMonth + 1, 0, 23, 59, 59).toISOString();
      
      const { data: payments } = await supabase
        .from('payments')
        .select('amount')
        .eq('organization_id', admin.organization_id)
        .gte('paid_at', startOfMonth)
        .lte('paid_at', endOfMonth);
        
      if (payments) {
        totalRevenueThisMonth = payments.reduce((sum, p) => sum + Number(p.amount), 0);
      }
    }
  }

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
                {expenses.map((e: any) => (
                  <tr key={e.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
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
            <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">When you log expenses, they'll appear here.</p>
          </div>
        )}
      </div>
    </div>
  );
}
