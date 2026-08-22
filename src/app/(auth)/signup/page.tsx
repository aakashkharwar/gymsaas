'use client';

import Link from 'next/link';
import { useActionState, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { signup } from '@/app/actions/auth';
import { CheckCircle2, Loader2, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SaveBusy } from '@/components/SaveProvider';

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

export default function SignupPage() {
  const [state, formAction, isPending] = useActionState(signup, null);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
    const router = useRouter();

  const clearField = (field: string) => {
    setFormErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
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
      if (state.emailWarning) {
        toast.warning(state.emailWarning, { duration: 8000 });
      }
      const href = state.redirectTo || '/onboarding';
      const timeout = setTimeout(() => router.push(href), state.emailWarning ? 2500 : 1200);
      return () => clearTimeout(timeout);
    }
  }, [state, router]);

  const validateForm = (e: React.FormEvent<HTMLFormElement>) => {
    const formData = new FormData(e.currentTarget);
    const errors: Record<string, string> = {};
    
    const gymName = formData.get('gym_name') as string;
    if (!gymName || gymName.trim() === '') {
      errors.gym_name = "Organization Name is required.";
    }

    const ownerName = formData.get('owner_name') as string;
    if (!ownerName || ownerName.trim() === '') {
      errors.owner_name = "Full Name is required.";
    } else if (ownerName.length < 2) {
      errors.owner_name = "Full Name must be at least 2 characters.";
    }

    const email = formData.get('owner_email') as string;
    if (!email || email.trim() === '') {
      errors.owner_email = "Work Email is required.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.owner_email = "Please enter a valid email address.";
    }

    const phone = formData.get('owner_phone') as string;
    if (!phone || phone.trim() === '') {
      errors.owner_phone = "Phone Number is required.";
    } else if (!/^[\d+\-\s()]{10,15}$/.test(phone)) {
      errors.owner_phone = "Please enter a valid 10-digit phone number.";
    }

    const password = formData.get('password') as string;
    if (!password || password === '') {
      errors.password = "Password is required.";
    } else if (password.length < 6) {
      errors.password = "Password must be at least 6 characters long.";
    }

    if (Object.keys(errors).length > 0) {
      e.preventDefault();
      setFormErrors(errors);
    } else {
      setFormErrors({});
    }
  };

  return (
    <div className="w-full text-slate-900 dark:text-white">
      <SaveBusy active={isPending} />
      <div className="text-center mb-8">
        <h2 className="text-3xl font-extrabold tracking-tight">
          Start your 14-day free trial
        </h2>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400 font-medium">
          Already have an account?{' '}
          <Link href="/login" className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 hover:underline transition-colors">
            Log in here
          </Link>
        </p>
      </div>
      
      {state?.error && (
        <div className="mb-6 bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 p-4 rounded-r-md">
          <p className="text-sm font-medium text-red-800 dark:text-red-300">{state.error}</p>
        </div>
      )}

      <form 
        className="space-y-5" 
        action={formAction} 
        onSubmit={validateForm}
        noValidate
      >
        <div>
          <label htmlFor="gym_name" className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
            Organization Name <span className="text-red-500">*</span>
          </label>
          <input
            id="gym_name"
            name="gym_name"
            type="text"
            className={`w-full px-4 py-2.5 bg-slate-50/50 dark:bg-slate-800/50 border rounded-lg text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 dark:focus:border-indigo-400 transition-all duration-200 ${
              formErrors.gym_name ? 'border-red-300 dark:border-red-500/50 focus:border-red-500 focus:ring-red-500/20' : 'border-slate-200 dark:border-slate-700'
            }`}
            placeholder="e.g. Acme Fitness"
            onChange={() => clearField('gym_name')}
          />
          {formErrors.gym_name && (
            <p className="mt-1.5 text-xs text-red-600 dark:text-red-400 font-medium">{formErrors.gym_name}</p>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div>
            <label htmlFor="owner_name" className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Full Name <span className="text-red-500">*</span>
            </label>
            <input
              id="owner_name"
              name="owner_name"
              type="text"
              className={`w-full px-4 py-2.5 bg-slate-50/50 dark:bg-slate-800/50 border rounded-lg text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 dark:focus:border-indigo-400 transition-all duration-200 ${
                formErrors.owner_name ? 'border-red-300 dark:border-red-500/50 focus:border-red-500 focus:ring-red-500/20' : 'border-slate-200 dark:border-slate-700'
              }`}
              placeholder="e.g. John Doe"
              onChange={() => clearField('owner_name')}
            />
            {formErrors.owner_name && (
              <p className="mt-1.5 text-xs text-red-600 dark:text-red-400 font-medium">{formErrors.owner_name}</p>
            )}
          </div>
          <div>
            <label htmlFor="owner_phone" className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Phone Number <span className="text-red-500">*</span>
            </label>
            <input
              id="owner_phone"
              name="owner_phone"
              type="tel"
              className={`w-full px-4 py-2.5 bg-slate-50/50 dark:bg-slate-800/50 border rounded-lg text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 dark:focus:border-indigo-400 transition-all duration-200 ${
                formErrors.owner_phone ? 'border-red-300 dark:border-red-500/50 focus:border-red-500 focus:ring-red-500/20' : 'border-slate-200 dark:border-slate-700'
              }`}
              placeholder="e.g. 9876543210"
              onChange={() => clearField('owner_phone')}
            />
            {formErrors.owner_phone && (
              <p className="mt-1.5 text-xs text-red-600 dark:text-red-400 font-medium">{formErrors.owner_phone}</p>
            )}
          </div>
        </div>

        <div>
          <label htmlFor="owner_email" className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
            Work Email <span className="text-red-500">*</span>
          </label>
          <input
            id="owner_email"
            name="owner_email"
            type="email"
            autoComplete="email"
            className={`w-full px-4 py-2.5 bg-slate-50/50 dark:bg-slate-800/50 border rounded-lg text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 dark:focus:border-indigo-400 transition-all duration-200 ${
              formErrors.owner_email ? 'border-red-300 dark:border-red-500/50 focus:border-red-500 focus:ring-red-500/20' : 'border-slate-200 dark:border-slate-700'
            }`}
            placeholder="e.g. john@example.com"
            onChange={() => clearField('owner_email')}
          />
          {formErrors.owner_email && (
            <p className="mt-1.5 text-xs text-red-600 dark:text-red-400 font-medium">{formErrors.owner_email}</p>
          )}
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
            Password <span className="text-red-500">*</span>
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
            className={`w-full px-4 py-2.5 bg-slate-50/50 dark:bg-slate-800/50 border rounded-lg text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 dark:focus:border-indigo-400 transition-all duration-200 ${
              formErrors.password ? 'border-red-300 dark:border-red-500/50 focus:border-red-500 focus:ring-red-500/20' : 'border-slate-200 dark:border-slate-700'
            }`}
            placeholder="••••••••"
            onChange={() => clearField('password')}
          />
          {formErrors.password && (
            <p className="mt-1.5 text-xs text-red-600 dark:text-red-400 font-medium">{formErrors.password}</p>
          )}
        </div>

        <div className="pt-4">
          <Button
            type="submit"
            disabled={isPending}
            className="group relative w-full h-11 flex justify-center items-center gap-2 py-3 px-4 rounded-lg text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-500 dark:bg-indigo-600 dark:hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {isPending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Creating Account...
              </>
            ) : (
              'Create Account'
            )}
          </Button>
        </div>
        
        <p className="text-xs text-center text-slate-500 dark:text-slate-400 mt-4">
          By signing up, you agree to our Terms of Service and Privacy Policy.
        </p>
      </form>
    </div>
  );
}
