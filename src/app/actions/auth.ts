'use server'

import { createClient } from '@/utils/supabase/server';
import { createPrivilegedClient } from '@/utils/supabase/admin';
import { getSiteUrl, getSupabaseConfigOrNull } from '@/utils/supabase/config';
import { describeEmailFailure, emailIsDelivered, sendOwnerWelcomeEmail } from '@/utils/email';

export type AuthState = {
  error?: string;
  success?: string;
  emailWarning?: string;
  redirectTo?: string;
};

function missingSupabaseConfigError(): AuthState {
  return {
    error:
      'Server is missing Supabase keys. In Vercel, add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (Production), then redeploy.',
  };
}

export async function login(prevState: AuthState | null, formData: FormData): Promise<AuthState> {
  try {
    if (!getSupabaseConfigOrNull()) {
      return missingSupabaseConfigError();
    }

    const email = String(formData.get('email') ?? '').trim();
    const password = String(formData.get('password') ?? '');

    if (!email || !password) {
      return { error: 'Email and password are required.' };
    }

    const supabase = await createClient();
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      return { error: error.message };
    }

    const user = data.user;
    if (user && !user.user_metadata?.welcome_email_sent) {
      const ownerName = String(user.user_metadata?.full_name || '').trim();
      const emailResult = await sendOwnerWelcomeEmail(email, ownerName);
      if (emailIsDelivered(emailResult)) {
        await supabase.auth.updateUser({ data: { welcome_email_sent: true } }).catch(() => {});
      }
    }

    return { success: 'Logged in successfully.' };
  } catch (err) {
    console.error('login failed:', err);
    return { error: err instanceof Error ? err.message : 'Login failed. Please try again.' };
  }
}

export async function requestPasswordReset(_prevState: AuthState | null, formData: FormData): Promise<AuthState> {
  try {
    if (!getSupabaseConfigOrNull()) {
      return missingSupabaseConfigError();
    }

    const email = String(formData.get('email') ?? '').trim();

    if (!email) {
      return { error: 'Please enter your email address.' };
    }

    const supabase = await createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${getSiteUrl()}/auth/callback?next=/reset-password`,
    });

    if (error) {
      console.error('Reset password error:', error);
    }

    return {
      success: 'If an account exists for this email, a password reset link has been sent.',
    };
  } catch (err) {
    console.error('requestPasswordReset failed:', err);
    return { error: err instanceof Error ? err.message : 'Could not send reset email. Please try again.' };
  }
}

export async function signup(prevState: AuthState | null, formData: FormData): Promise<AuthState> {
  try {
    if (!getSupabaseConfigOrNull()) {
      return missingSupabaseConfigError();
    }

    const email = String(formData.get('owner_email') ?? '').trim();
    const password = String(formData.get('password') ?? '');
    const gymName = String(formData.get('gym_name') ?? '').trim();
    const ownerName = String(formData.get('owner_name') ?? '').trim();
    const ownerPhone = String(formData.get('owner_phone') ?? '').replace(/\D/g, '').slice(0, 15);

    if (!email || !password || !gymName || !ownerName || !ownerPhone) {
      return { error: 'Please fill in all required fields.' };
    }

    const supabase = await createClient();

    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${getSiteUrl()}/login`,
        data: {
          full_name: ownerName,
          phone: ownerPhone,
          gym_name: gymName,
        }
      }
    });

    if (authError) {
      return { error: authError.message };
    }

    const userId = authData.user?.id;
    if (!userId) {
      return { error: 'Failed to create user account.' };
    }

    const baseSlug = gymName.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '') || `gym-${Date.now()}`;
    const slug = `${baseSlug}-${Math.random().toString(36).slice(2, 6)}`;
    const bootstrap = await createPrivilegedClient();
    const trialEndsAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();

    const { data: orgData, error: orgError } = await bootstrap.from('organizations').insert({
      name: gymName,
      slug,
      owner_name: ownerName,
      owner_phone: ownerPhone,
      owner_email: email,
      plan: 'trial',
      trial_ends_at: trialEndsAt,
    }).select('id').single();

    if (orgError) {
      console.error('Org creation failed:', orgError);
      return { error: `Workspace creation failed: ${orgError.message}` };
    }

    const { error: adminError } = await bootstrap.from('admin_users').upsert({
      id: userId,
      organization_id: orgData.id,
      email,
    }, { onConflict: 'id' });

    if (adminError) {
      console.error('Admin creation failed:', adminError);
    }

    const { error: feePlanError } = await bootstrap.from('fee_plans').insert({
      organization_id: orgData.id,
      name: 'Standard Monthly',
      amount: 1500,
      duration_months: 1
    });

    if (feePlanError) {
      console.error('Default fee plan creation failed:', feePlanError);
    }

    const emailResult = await sendOwnerWelcomeEmail(email, ownerName, gymName);
    let sent = emailIsDelivered(emailResult);
    let emailWarning = sent ? null : describeEmailFailure(emailResult);

    if (!sent) {
      const { error: otpError } = await supabase.auth.signInWithOtp({
        email,
        options: {
          shouldCreateUser: false,
          emailRedirectTo: `${getSiteUrl()}/auth/callback?next=/dashboard`,
          data: {
            full_name: ownerName,
            gym_name: gymName,
          },
        },
      });

      if (otpError) {
        console.error('Supabase welcome email failed:', otpError);
        emailWarning = otpError.message;
      } else {
        sent = true;
        emailWarning = null;
      }
    }

    if (sent && authData.session) {
      await supabase.auth.updateUser({
        data: { welcome_email_sent: true, full_name: ownerName, phone: ownerPhone, gym_name: gymName },
      }).catch(() => {});
    }

    if (!authData.session) {
      return {
        success: 'Account created. Check your email to confirm, then log in.',
        emailWarning: emailWarning ?? undefined,
        redirectTo: '/login',
      };
    }

    return {
      success: sent
        ? `Account created. A welcome email was sent to ${email}.`
        : 'Account created successfully. Redirecting you to onboarding...',
      emailWarning: emailWarning ?? undefined,
      redirectTo: '/onboarding',
    };
  } catch (err) {
    console.error('signup failed:', err);
    return { error: err instanceof Error ? err.message : 'Signup failed. Please try again.' };
  }
}
