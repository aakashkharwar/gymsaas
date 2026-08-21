'use client';

import { Button } from '@/components/ui/button';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'motion/react';
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

  // Register offline cache so attendance scanner still works without network
  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  }, []);
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

  const navItems = [
    { href: '/dashboard', label: 'Overview', icon: Home, active: pathname === '/dashboard' },
    { href: '/dashboard/members', label: 'Members', icon: Users, active: pathname === '/dashboard/members' },
    { href: '/dashboard/admission', label: 'Admission', icon: Clipboard, active: pathname.includes('/admission') },
    { href: '/dashboard/attendance', label: 'Attendance', icon: CheckSquare, active: pathname.includes('/attendance') },
    { href: '/dashboard/fees', label: 'Fee Collection', icon: CreditCard, active: pathname.includes('/fees') && !pathname.includes('/fees/plans') },
    { href: '/dashboard/expenses', label: 'Expenses', icon: Receipt, active: pathname.includes('/expenses') },
    { href: '/dashboard/fees/plans', label: 'Fee Plans', icon: Settings, active: pathname.includes('/fees/plans') },
  ];

  return (
    <div className="min-h-screen bg-slate-50/80 dark:bg-slate-950/80 flex transition-colors duration-300">
      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/50 dark:bg-slate-950/80 z-40 md:hidden backdrop-blur-sm"
          onClick={closeMobileMenu}
        />
      )}

      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-r border-slate-200/80 dark:border-slate-800 flex flex-col transform transition-transform duration-300 ease-in-out md:relative md:translate-x-0 ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="h-16 flex items-center justify-between px-6 border-b border-slate-200 dark:border-slate-800">
          <span className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">GymOS</span>
            <Button
              variant="ghost"
              size="icon"
              onClick={closeMobileMenu}
              className="md:hidden text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
            >
            <X className="w-5 h-5" />
          </Button>
        </div>
        <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={closeMobileMenu}
                className={`relative flex items-center px-3 py-2.5 text-sm font-medium rounded-lg group transition-colors ${item.active ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50/80 dark:hover:bg-slate-800/40 hover:text-slate-900 dark:hover:text-white'}`}
              >
                {item.active && (
                  <motion.span
                    layoutId="nav-active"
                    className="absolute inset-0 rounded-lg bg-slate-100 dark:bg-slate-800"
                    transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                  />
                )}
                <Icon className={`relative mr-3 h-5 w-5 transition-colors ${item.active ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400 group-hover:text-slate-500 dark:group-hover:text-slate-300'}`} />
                <span className="relative">{item.label}</span>
              </Link>
            );
          })}
        </nav>
        <div className="p-4 border-t border-slate-200 dark:border-slate-800">
          <Link href="/dashboard/settings" onClick={closeMobileMenu} className={`relative flex items-center px-3 py-2.5 text-sm font-medium rounded-lg group transition-colors ${pathname.includes('/settings') ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-white'}`}>
            {pathname.includes('/settings') && (
              <motion.span
                layoutId="nav-active"
                className="absolute inset-0 rounded-lg bg-slate-100 dark:bg-slate-800"
                transition={{ type: 'spring', stiffness: 380, damping: 30 }}
              />
            )}
            <Settings className={`relative mr-3 h-5 w-5 transition-colors ${pathname.includes('/settings') ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400 group-hover:text-slate-500 dark:group-hover:text-slate-300'}`} />
            <span className="relative">Settings</span>
          </Link>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar for mobile */}
        <header className="h-16 flex items-center justify-between px-4 sm:px-6 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-b border-slate-200/80 dark:border-slate-800 md:hidden z-30">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleMobileMenu}
              className="text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white -ml-2"
            >
              <Menu className="w-6 h-6" />
            </Button>
            <span className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">GymOS</span>
          </div>
          <ThemeToggle />
        </header>

        {/* Desktop topbar */}
        <div className="hidden md:flex h-16 items-center justify-end px-6 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-b border-slate-200/80 dark:border-slate-800 z-30">
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
