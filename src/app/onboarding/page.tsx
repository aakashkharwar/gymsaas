import { getOrganizationSlug } from '@/app/actions/onboarding';
import OnboardingForm from './OnboardingForm';
import { redirect } from 'next/navigation';

export default async function OnboardingPage() {
  const initialSlug = await getOrganizationSlug();

  if (!initialSlug) {
    // If we can't find an org for this user, they need to sign up again or log in
    redirect('/login');
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center py-12 px-4 sm:px-6 lg:px-8 transition-colors duration-300">
      <OnboardingForm initialSlug={initialSlug} />
    </div>
  );
}
