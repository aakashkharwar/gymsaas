'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { updateOrganizationSettings } from '@/app/actions/onboarding';
import { Loader2 } from 'lucide-react';
import { onboardingSchema } from '@/utils/validations';

const AVAILABLE_SERVICES = [
  'Strength Training',
  'Cardio',
  'Personal Training',
  'Yoga',
  'Zumba',
  'CrossFit'
];

export default function OnboardingForm({ initialSlug }: { initialSlug: string }) {
  const [slug, setSlug] = useState(initialSlug);
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const router = useRouter();

  const validateForm = (e: React.FormEvent<HTMLFormElement> | FormData) => {
    const formData = e instanceof FormData ? e : new FormData(e.currentTarget);
    const data = Object.fromEntries(formData.entries());
    
    const result = onboardingSchema.safeParse(data);
    
    if (!result.success) {
      if (e && 'preventDefault' in e) e.preventDefault();
      
      const newErrors: Record<string, string> = {};
      result.error.issues.forEach((issue) => {
        if (issue.path[0]) {
          newErrors[issue.path[0] as string] = issue.message;
        }
      });
      setFormErrors(newErrors);
      return false;
    }
    
    setFormErrors({});
    return true;
  };

  const handleOnChange = (e: React.FormEvent<HTMLFormElement>) => {
    if (Object.keys(formErrors).length > 0) {
      validateForm(new FormData(e.currentTarget));
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    if (!validateForm(e)) return;
    
    setIsPending(true);
    setError(null);
    
    const formData = new FormData(e.currentTarget);
    const result = await updateOrganizationSettings(formData);
    
    if (result.error) {
      setError(result.error);
      setIsPending(false);
    } else {
      router.push('/dashboard');
    }
  };

  return (
    <div className="max-w-3xl w-full space-y-8 bg-white dark:bg-slate-900 p-8 sm:p-10 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl">
      <div>
        <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white text-center tracking-tight">Set up your Gym</h2>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400 text-center">
          Complete these steps to get your gym online and ready for members.
        </p>
      </div>

      <form onSubmit={handleSubmit} onChange={handleOnChange} className="mt-8 space-y-8" noValidate>
        
        {/* Step 1: Web Address */}
        <div className="bg-slate-50 dark:bg-slate-800/50 p-6 sm:p-8 rounded-xl border border-slate-200 dark:border-slate-700">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">1. Choose your web address</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-5">This is where your members will find your public landing page.</p>
          
          <div className={`flex rounded-lg shadow-sm overflow-hidden border focus-within:ring-2 focus-within:ring-indigo-500/20 focus-within:border-indigo-500 transition-all ${
            formErrors.subdomain ? 'border-red-300 dark:border-red-500/50' : 'border-slate-300 dark:border-slate-600'
          }`}>
            <span className="inline-flex items-center px-4 bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-300 sm:text-sm font-medium border-r border-slate-300 dark:border-slate-600">
              https://
            </span>
            <input
              type="text"
              name="subdomain"
              id="subdomain"
              value={slug}
              onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
              className="flex-1 min-w-0 block w-full px-4 py-3 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none sm:text-sm font-medium"
              placeholder="yourgym"
            />
            <span className="inline-flex items-center px-4 bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-300 sm:text-sm font-medium border-l border-slate-300 dark:border-slate-600">
              .gymos.in
            </span>
          </div>
          {formErrors.subdomain && (
            <p className="mt-2 text-xs text-red-600 dark:text-red-400 font-medium">{formErrors.subdomain}</p>
          )}
        </div>

        {/* Step 2: Gym Details */}
        <div className="bg-slate-50 dark:bg-slate-800/50 p-6 sm:p-8 rounded-xl border border-slate-200 dark:border-slate-700 space-y-5">
          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">2. Gym Details</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">Add information so leads can find and visit you.</p>
          </div>
          
          <div className="space-y-4">
            <div>
              <label htmlFor="address" className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Gym Address</label>
              <textarea
                id="address"
                name="address"
                rows={2}
                placeholder="123 Fitness Street, City, State"
                className={`w-full rounded-lg border bg-white dark:bg-slate-800 px-4 py-3 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 ${
                  formErrors.address ? 'border-red-300 dark:border-red-500/50' : 'border-slate-300 dark:border-slate-600'
                }`}
              />
              {formErrors.address && (
                <p className="mt-1.5 text-xs text-red-600 dark:text-red-400 font-medium">{formErrors.address}</p>
              )}
            </div>
            <div>
              <label htmlFor="timings" className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Operating Timings</label>
              <textarea
                id="timings"
                name="timings"
                rows={2}
                placeholder="e.g. Morning: 6:00 AM - 10:00 AM&#10;Evening: 4:00 PM - 9:00 PM"
                className={`w-full rounded-lg border bg-white dark:bg-slate-800 px-4 py-3 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 ${
                  formErrors.timings ? 'border-red-300 dark:border-red-500/50' : 'border-slate-300 dark:border-slate-600'
                }`}
              />
              {formErrors.timings && (
                <p className="mt-1.5 text-xs text-red-600 dark:text-red-400 font-medium">{formErrors.timings}</p>
              )}
            </div>
          </div>
        </div>

        {/* Step 3: Services */}
        <div className="bg-slate-50 dark:bg-slate-800/50 p-6 sm:p-8 rounded-xl border border-slate-200 dark:border-slate-700">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">3. Services</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-5">Select the services your gym provides.</p>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {AVAILABLE_SERVICES.map((service) => (
              <label key={service} className="relative flex cursor-pointer items-start gap-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 shadow-sm hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors focus-within:ring-2 focus-within:ring-indigo-500/20">
                <div className="flex h-5 items-center">
                  <input
                    type="checkbox"
                    name="services"
                    value={service}
                    className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  />
                </div>
                <span className="text-sm font-medium text-slate-900 dark:text-white">{service}</span>
              </label>
            ))}
          </div>
        </div>
        
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 p-4 rounded-r-md">
            <p className="text-sm text-red-600 dark:text-red-400 font-medium">{error}</p>
          </div>
        )}
        
        <div className="flex justify-center pt-4">
          <button
            type="submit"
            disabled={isPending}
            className="inline-flex justify-center items-center py-3 px-10 border border-transparent shadow-md shadow-indigo-500/20 text-sm font-bold rounded-xl text-white bg-slate-900 dark:bg-indigo-600 hover:bg-slate-800 dark:hover:bg-indigo-500 cursor-pointer focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-900 disabled:opacity-50 transition-all hover:-translate-y-0.5"
          >
            {isPending ? (
              <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Saving...</>
            ) : 'Complete Setup'}
          </button>
        </div>
      </form>
    </div>
  );
}
