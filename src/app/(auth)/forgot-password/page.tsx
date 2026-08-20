'use client';

import Link from 'next/link';
import { useActionState, useEffect, useState } from 'react';
import { requestPasswordReset } from '@/app/actions/auth';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Loader2 } from 'lucide-react';

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

export default function ForgotPasswordPage() {
  const [state, formAction, isPending] = useActionState(requestPasswordReset, null);
  
  const [formError, setFormError] = useState<string | null>(null);

  const validateForm = (event: React.FormEvent<HTMLFormElement>) => {
    const formData = new FormData(event.currentTarget);
    const email = String(formData.get('email') ?? '').trim();

    if (!email) {
      setFormError('Please fill out this field.');
      event.preventDefault();
      return;
    }

    if (!/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(email)) {
      setFormError('Please enter a valid email address.');
      event.preventDefault();
      return;
    }

    setFormError(null);
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
    }
  }, [state]);

  return (
    <div className="w-full text-slate-900 dark:text-white">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-extrabold tracking-tight">
          Forgot password?
        </h1>
        <p className="mt-3 text-sm text-slate-500 dark:text-slate-400 font-medium">
          Enter your work email and we'll send you a reset link.
        </p>
      </div>

      <form action={formAction} onSubmit={validateForm} noValidate className="space-y-5">
        <div>
          <label htmlFor="reset-email" className="mb-1.5 block text-sm font-semibold text-slate-700 dark:text-slate-300">
            Work Email
          </label>
          <input
            id="reset-email"
            name="email"
            type="email"
            placeholder="e.g. john@example.com"
            className={`w-full px-4 py-3 bg-slate-50/60 dark:bg-slate-800/50 border rounded-lg text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 dark:focus:border-indigo-400 transition-all duration-200 \${
              formError ? 'border-red-400 focus:border-red-500 focus:ring-red-500/20' : 'border-slate-200 dark:border-slate-700'
            }`}
          />
          {formError && (
            <div className="mt-2 flex items-center gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700 dark:bg-red-900/20 dark:border-red-800 dark:text-red-300 shadow-sm">
              <AlertTriangle className="h-4 w-4 shrink-0 text-red-500" />
              <span>{formError}</span>
            </div>
          )}
        </div>

        <div className="pt-2">
          <Button
            type="submit"
            disabled={isPending}
            className={`w-full \${isPending ? 'cursor-wait opacity-70' : ''}`}
          >
            {isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Sending...
              </>
            ) : (
              'Send reset link'
            )}
          </Button>
        </div>
      </form>

      <div className="mt-8 text-center text-sm text-slate-500 dark:text-slate-400">
        Remembered your password?{' '}
        <Link href="/login" className="font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 hover:underline">
          Back to login
        </Link>
      </div>
    </div>
  );
}
