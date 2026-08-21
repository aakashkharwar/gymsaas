import Link from 'next/link';
import ThemeToggle from '../components/ThemeToggle';
import { Button } from '@/components/ui/button';

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen bg-transparent transition-colors duration-300">
      <header className="px-6 py-4 flex items-center justify-between border-b border-slate-200/70 dark:border-slate-800 bg-white/70 dark:bg-slate-900/70 backdrop-blur-md sticky top-0 z-50">
        <div className="text-2xl font-bold tracking-tighter text-slate-900 dark:text-white">GymOS</div>
        <nav className="flex gap-3 sm:gap-4 items-center">
          <Link href="/login" className="text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors hidden sm:block">
            Log in
          </Link>
          <Link href="/signup">
            <Button className="rounded-lg shadow-sm">
              Start Free Trial
            </Button>
          </Link>
          <div className="ml-2 sm:ml-4">
            <ThemeToggle />
          </div>
        </nav>
      </header>

      <main className="flex-1 flex flex-col items-center text-center px-4 sm:px-6 py-20 sm:py-32">
        <h1 className="reveal text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white sm:text-6xl max-w-3xl">
          Run your entire gym from one simple platform
        </h1>
        <p className="reveal reveal-delay-1 mt-6 text-lg leading-8 text-slate-600 dark:text-slate-400 max-w-2xl">
          GymOS gives independent gym owners a branded landing page, automated fee reminders via WhatsApp, attendance tracking, and profit visibility — all without the enterprise price tag.
        </p>
        
        <div className="reveal reveal-delay-2 mt-10 flex items-center justify-center">
          <Link href="/signup">
            <Button className="w-full sm:w-auto text-base py-6 px-8 rounded-xl shadow-lg border-none bg-slate-900 dark:bg-indigo-600 text-white hover:bg-slate-800 dark:hover:bg-indigo-500 transition-all hover:-translate-y-0.5">
              Start your 14-day free trial
            </Button>
          </Link>
        </div>

        <div className="mt-24 grid grid-cols-1 sm:grid-cols-3 gap-6 sm:gap-8 max-w-5xl mx-auto w-full text-left">
          <div className="reveal reveal-delay-2 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm p-8 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300">
            <h3 className="text-xl font-bold text-slate-900 dark:text-white">Automated Reminders</h3>
            <p className="mt-3 text-slate-600 dark:text-slate-400 leading-relaxed">Send WhatsApp fee reminders to members automatically, branded with your gym's name.</p>
          </div>
          <div className="reveal reveal-delay-3 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm p-8 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300">
            <h3 className="text-xl font-bold text-slate-900 dark:text-white">Your Own Website</h3>
            <p className="mt-3 text-slate-600 dark:text-slate-400 leading-relaxed">Get a beautiful, SEO-optimized landing page for your gym to capture new leads instantly.</p>
          </div>
          <div className="reveal reveal-delay-4 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm p-8 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300">
            <h3 className="text-xl font-bold text-slate-900 dark:text-white">Track Profits</h3>
            <p className="mt-3 text-slate-600 dark:text-slate-400 leading-relaxed">Log expenses and track your monthly P&L in real-time. Know exactly how much you're making.</p>
          </div>
        </div>
      </main>
      
      <footer className="py-8 text-center text-slate-500 dark:text-slate-500 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950">
        <p className="text-sm">&copy; 2026 GymOS. All rights reserved.</p>
      </footer>
    </div>
  );
}
