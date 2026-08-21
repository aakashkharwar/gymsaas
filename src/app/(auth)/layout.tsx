import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { BorderBeam } from '@/components/ui/border-beam';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 py-8 px-4 sm:px-6 lg:px-8 relative overflow-hidden transition-colors duration-300">
      {/* Back to Home Button */}
      <Link 
        href="/" 
        className="absolute top-6 left-6 z-20 flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white bg-white/50 dark:bg-slate-900/50 hover:bg-white dark:hover:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-800 backdrop-blur-sm transition-all shadow-sm"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Home
      </Link>

      {/* Decorative background blobs */}
      <div className="absolute top-0 -left-4 w-72 h-72 bg-indigo-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 dark:opacity-10 animate-blob"></div>
      <div className="absolute top-0 -right-4 w-72 h-72 bg-emerald-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 dark:opacity-10 animate-blob animation-delay-2000"></div>
      <div className="absolute -bottom-8 left-20 w-72 h-72 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 dark:opacity-10 animate-blob animation-delay-4000"></div>

      <div className="w-full max-w-[480px] bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl p-6 sm:p-10 rounded-[28px] border border-slate-100 dark:border-slate-800 shadow-2xl shadow-slate-200/40 dark:shadow-slate-900/50 relative z-10 overflow-hidden">
        {children}
        <BorderBeam duration={8} size={200} borderWidth={2} />
      </div>
    </div>
  );
}
