'use client';

import Link from 'next/link';
import { useActionState, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { login } from '@/app/actions/auth';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';

function normalizeMessage(value: unknown): string | null {
  if (typeof value === 'string') return value;
  if (value && typeof value === 'object') {
    if ('message' in value && typeof (value as { message?: unknown }).message === 'string') {
      return (value as { message: string }).message;
    }
    if ('error' in value && typeof (value as { error?: unknown }).error === 'string') {
      return (value as { error: string }).error;
    }
  }
  return null;
}

export default function LoginPage() {
  const [state, formAction, isPending] = useActionState(login, null);
  const router = useRouter();
    const [formErrors, setFormErrors] = useState<{ email?: string; password?: string }>({});

  const validateForm = (event: React.FormEvent<HTMLFormElement>) => {
    const formData = new FormData(event.currentTarget);
    const email = String(formData.get('email') ?? '').trim();
    const password = String(formData.get('password') ?? '').trim();
    const errors: { email?: string; password?: string } = {};

    if (!email) {
      errors.email = 'Email required.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.email = 'Please enter a valid email address.';
    }

    if (!password) {
      errors.password = 'Password required.';
    } else if (password.length < 6) {
      errors.password = 'Password must be at least 6 characters.';
    }

    setFormErrors(errors);

    if (Object.keys(errors).length > 0) {
      event.preventDefault();
    }
  };

  useEffect(() => {
    if (!state) return;

    const errorMessage = normalizeMessage(state.error);
    if (errorMessage) {
      toast.error(errorMessage);
      return;
    }

    const successMessage = normalizeMessage(state.success);
    if (successMessage) {
      toast.success(successMessage);
      const timeout = setTimeout(() => router.push('/dashboard'), 1200);
      return () => clearTimeout(timeout);
    }
  }, [state, router]);

  return (
    <div className="w-full text-slate-900 dark:text-white">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-extrabold tracking-tight">Welcome back</h2>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400 font-medium">
          New to GymOS?{' '}
          <Link href="/signup" className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 hover:underline transition-colors">
            Start your 14-day free trial
          </Link>
        </p>
      </div>

      

      <form className="space-y-5" action={formAction} onSubmit={validateForm} noValidate>
        <div>
          <label htmlFor="email-address" className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
            Work Email <span className="text-red-500">*</span>
          </label>
          <input
            id="email-address"
            name="email"
            type="email"
            autoComplete="email"
            className={`w-full px-4 py-3 bg-slate-50/60 dark:bg-slate-800/50 border rounded-lg text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 dark:focus:border-indigo-400 transition-all duration-200 ${
              formErrors.email ? 'border-red-400 focus:border-red-500 focus:ring-red-500/20' : 'border-slate-200 dark:border-slate-700'
            }`}
            placeholder="e.g. john@example.com"
            onChange={() => {
              if (formErrors.email) setFormErrors((prev) => ({ ...prev, email: undefined }));
            }}
          />
          {formErrors.email && (
            <p className="mt-1.5 text-xs text-red-600 dark:text-red-400 font-medium">{formErrors.email}</p>
          )}
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label htmlFor="password" className="block text-sm font-semibold text-slate-700 dark:text-slate-300">
              Password <span className="text-red-500">*</span>
            </label>
            <div className="text-sm">
              <Link href="/forgot-password" className="font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-500">
                Forgot password?
              </Link>
            </div>
          </div>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            className={`w-full px-4 py-3 bg-slate-50/60 dark:bg-slate-800/50 border rounded-lg text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 dark:focus:border-indigo-400 transition-all duration-200 ${
              formErrors.password ? 'border-red-400 focus:border-red-500 focus:ring-red-500/20' : 'border-slate-200 dark:border-slate-700'
            }`}
            placeholder="••••••••"
            onChange={() => {
              if (formErrors.password) setFormErrors((prev) => ({ ...prev, password: undefined }));
            }}
          />
          {formErrors.password && (
            <p className="mt-1.5 text-xs text-red-600 dark:text-red-400 font-medium">{formErrors.password}</p>
          )}
        </div>

        <div className="pt-2">
          <Button
            type="submit"
            disabled={isPending}
            className={`w-full ${isPending ? "cursor-wait opacity-70" : ""}`}
          >
            {isPending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Logging in...
              </>
            ) : (
              'Log in'
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
