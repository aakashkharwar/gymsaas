'use client';

import { Button } from '@/components/ui/button';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Users, CheckSquare, CreditCard, Receipt, Settings, Menu, X, Clipboard } from 'lucide-react';
import ThemeToggle from '../../components/ThemeToggle';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const pathname = usePathname();

  const toggleMobileMenu = () => setIsMobileMenuOpen(!isMobileMenuOpen);
  const closeMobileMenu = () => setIsMobileMenuOpen(false);

  // Background sync for offline fees
  useEffect(() => {
    let timeout: NodeJS.Timeout;
    
    const syncFees = async () => {
      try {
        if (!navigator.onLine) return;
        
        const fStore = await import('@/utils/fee-store');
        const pending = await fStore.getPendingPayments();
        const unsynced = pending.filter(p => !p.synced);
        
        if (unsynced.length === 0) return;
        
        const res = await fetch('/api/fees/payments', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(unsynced),
        });

        if (res.ok) {
          const { successIds } = await res.json();
          if (Array.isArray(successIds)) {
            const next = pending.map(p => successIds.includes(p.id) ? { ...p, synced: true } : p);
            await fStore.savePendingPayments(next);
            console.log(`Synced ${successIds.length} payments`);
          }
        }
      } catch (err) {
        console.error('Fee sync failed', err);
      } finally {
        timeout = setTimeout(syncFees, 60000); // Check every minute
      }
    };

    const handleOnline = () => {
      clearTimeout(timeout);
      syncFees();
    };

    window.addEventListener('online', handleOnline);
    syncFees(); // Initial check

    return () => {
      window.removeEventListener('online', handleOnline);
      clearTimeout(timeout);
    };
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex transition-colors duration-300">
      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/50 dark:bg-slate-950/80 z-40 md:hidden backdrop-blur-sm"
          onClick={closeMobileMenu}
        />
      )}

      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col transform transition-transform duration-300 ease-in-out md:relative md:translate-x-0 ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="h-16 flex items-center justify-between px-6 border-b border-slate-200 dark:border-slate-800">
          <span className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">GymOS</span>
          <Button onClick={closeMobileMenu} className="md:hidden text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white p-2">
            <X className="w-5 h-5" />
          </Button>
        </div>
        <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
          <Link href="/dashboard" onClick={closeMobileMenu} className={`flex items-center px-3 py-2.5 text-sm font-medium rounded-lg group transition-colors ${pathname === '/dashboard' ? 'bg-slate-100 dark:bg-slate-800 text-indigo-600 dark:text-indigo-400' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-white'}`}>
            <Home className={`mr-3 h-5 w-5 transition-colors ${pathname === '/dashboard' ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400 group-hover:text-slate-500 dark:group-hover:text-slate-300'}`} />
            Overview
          </Link>
          <Link href="/dashboard/members" onClick={closeMobileMenu} className={`flex items-center px-3 py-2.5 text-sm font-medium rounded-lg group transition-colors ${pathname === '/dashboard/members' ? 'bg-slate-100 dark:bg-slate-800 text-indigo-600 dark:text-indigo-400' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-white'}`}>
            <Users className={`mr-3 h-5 w-5 transition-colors ${pathname === '/dashboard/members' ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400 group-hover:text-slate-500 dark:group-hover:text-slate-300'}`} />
            Members
          </Link>
          <Link href="/dashboard/admission" onClick={closeMobileMenu} className={`flex items-center px-3 py-2.5 text-sm font-medium rounded-lg group transition-colors ${pathname.includes('/admission') ? 'bg-slate-100 dark:bg-slate-800 text-indigo-600 dark:text-indigo-400' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-white'}`}>
            <Clipboard className={`mr-3 h-5 w-5 transition-colors ${pathname.includes('/admission') ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400 group-hover:text-slate-500 dark:group-hover:text-slate-300'}`} />
            Admission
          </Link>
          <Link href="/dashboard/attendance" onClick={closeMobileMenu} className={`flex items-center px-3 py-2.5 text-sm font-medium rounded-lg group transition-colors ${pathname.includes('/attendance') ? 'bg-slate-100 dark:bg-slate-800 text-indigo-600 dark:text-indigo-400' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-white'}`}>
            <CheckSquare className={`mr-3 h-5 w-5 transition-colors ${pathname.includes('/attendance') ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400 group-hover:text-slate-500 dark:group-hover:text-slate-300'}`} />
            Attendance
          </Link>
          <Link href="/dashboard/fees" onClick={closeMobileMenu} className={`flex items-center px-3 py-2.5 text-sm font-medium rounded-lg group transition-colors ${pathname.includes('/fees') ? 'bg-slate-100 dark:bg-slate-800 text-indigo-600 dark:text-indigo-400' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-white'}`}>
            <CreditCard className={`mr-3 h-5 w-5 transition-colors ${pathname.includes('/fees') ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400 group-hover:text-slate-500 dark:group-hover:text-slate-300'}`} />
            Fee Collection
          </Link>
          <Link href="/dashboard/expenses" onClick={closeMobileMenu} className={`flex items-center px-3 py-2.5 text-sm font-medium rounded-lg group transition-colors ${pathname.includes('/expenses') ? 'bg-slate-100 dark:bg-slate-800 text-indigo-600 dark:text-indigo-400' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-white'}`}>
            <Receipt className={`mr-3 h-5 w-5 transition-colors ${pathname.includes('/expenses') ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400 group-hover:text-slate-500 dark:group-hover:text-slate-300'}`} />
            Expenses
          </Link>
          <Link href="/dashboard/fees/plans" onClick={closeMobileMenu} className={`flex items-center px-3 py-2.5 text-sm font-medium rounded-lg group transition-colors ${pathname.includes('/fees/plans') ? 'bg-slate-100 dark:bg-slate-800 text-indigo-600 dark:text-indigo-400' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-white'}`}>
            <Settings className={`mr-3 h-5 w-5 transition-colors ${pathname.includes('/fees/plans') ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400 group-hover:text-slate-500 dark:group-hover:text-slate-300'}`} />
            Fee Plans
          </Link>
        </nav>
        <div className="p-4 border-t border-slate-200 dark:border-slate-800">
          <Link href="/dashboard/settings" onClick={closeMobileMenu} className={`flex items-center px-3 py-2.5 text-sm font-medium rounded-lg group transition-colors ${pathname.includes('/settings') ? 'bg-slate-100 dark:bg-slate-800 text-indigo-600 dark:text-indigo-400' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-white'}`}>
            <Settings className={`mr-3 h-5 w-5 transition-colors ${pathname.includes('/settings') ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400 group-hover:text-slate-500 dark:group-hover:text-slate-300'}`} />
            Settings
          </Link>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar for mobile */}
        <header className="h-16 flex items-center justify-between px-4 sm:px-6 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 md:hidden z-30">
          <div className="flex items-center gap-3">
            <Button onClick={toggleMobileMenu} className="text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white p-2 -ml-2 rounded-md transition-colors">
              <Menu className="w-6 h-6" />
            </Button>
            <span className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">GymOS</span>
          </div>
          <ThemeToggle />
        </header>

        {/* Desktop topbar */}
        <div className="hidden md:flex h-16 items-center justify-end px-6 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 z-30">
          <div className="ml-auto">
            <ThemeToggle />
          </div>
        </div>

        <main className="flex-1 p-4 sm:p-6 md:p-8 overflow-y-auto overflow-x-hidden">
          {children}
        </main>
      </div>
    </div>
  );
}
