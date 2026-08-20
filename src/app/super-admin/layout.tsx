import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import { ShieldCheck, LogOut } from 'lucide-react';
import ThemeToggle from '@/components/ThemeToggle';

export const dynamic = 'force-dynamic';

export default async function SuperAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: userData, error: authError } = await supabase.auth.getUser();

  if (authError || !userData?.user) {
    redirect('/login');
  }

  const { data: adminData } = await supabase
    .from('admin_users')
    .select('is_super_admin')
    .eq('id', userData.user.id)
    .single();

  if (!adminData?.is_super_admin) {
    redirect('/dashboard');
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 transition-colors flex flex-col">
      <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex">
              <div className="flex-shrink-0 flex items-center gap-2">
                <ShieldCheck className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
                <span className="text-xl font-bold text-slate-900 dark:text-white">GymOS Admin</span>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <ThemeToggle />
              <form action="/api/auth/signout" method="post">
                <button
                  type="submit"
                  className="inline-flex items-center gap-2 px-3 py-1.5 border border-transparent text-sm font-medium rounded-md text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 focus:outline-none"
                >
                  <LogOut className="h-4 w-4" />
                  Sign out
                </button>
              </form>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {children}
        </div>
      </main>
    </div>
  );
}
