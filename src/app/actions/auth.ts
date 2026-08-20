'use server'

import { Resend } from 'resend';
import { createClient } from '@/utils/supabase/server';

export type AuthState = {
  error?: string;
  success?: string;
};

export async function login(prevState: AuthState | null, formData: FormData): Promise<AuthState> {
  const email = String(formData.get('email') ?? '').trim();
  const password = String(formData.get('password') ?? '');

  if (!email || !password) {
    return { error: 'Email and password are required.' };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password
  });

  if (error) {
    return { error: error.message };
  }

  return { success: 'Logged in successfully.' };
}

export async function requestPasswordReset(_prevState: AuthState | null, formData: FormData): Promise<AuthState> {
  const email = String(formData.get('email') ?? '').trim();

  if (!email) {
    return { error: 'Please enter your email address.' };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/reset-password`,
  });

  if (error) {
    console.error('Reset password error:', error);
    // Don't leak whether the user exists
  }

  return {
    success: 'If an account exists for this email, a password reset link has been sent.',
  };
}

export async function signup(prevState: AuthState | null, formData: FormData): Promise<AuthState> {
  const email = String(formData.get('owner_email') ?? '').trim();
  const password = String(formData.get('password') ?? '');
  const gymName = String(formData.get('gym_name') ?? '').trim();
  const ownerName = String(formData.get('owner_name') ?? '').trim();
  const ownerPhone = String(formData.get('owner_phone') ?? '').trim();

  if (!email || !password || !gymName || !ownerName || !ownerPhone) {
    return { error: 'Please fill in all required fields.' };
  }

  const supabase = await createClient();

  // 1. Create Supabase Auth User
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: ownerName,
        phone: ownerPhone,
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

  // 2. Generate initial slug
  const baseSlug = gymName.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '') || `gym-${Date.now()}`;
  const slug = `${baseSlug}-${Math.random().toString(36).slice(2, 6)}`;

  // 3. Create Organization
  const { data: orgData, error: orgError } = await supabase.from('organizations').insert({
    name: gymName,
    slug,
    owner_name: ownerName,
    owner_phone: ownerPhone,
    owner_email: email,
    plan: 'trial'
  }).select('id').single();

  if (orgError) {
    console.error('Org creation failed:', orgError);
    return { error: `Workspace creation failed: ${orgError.message}` };
  }

  // 4. Create Admin User
  const { error: adminError } = await supabase.from('admin_users').insert({
    id: userId,
    organization_id: orgData.id,
    email: email
  });

  if (adminError) {
    console.error('Admin creation failed:', adminError);
  }

  // 4.5 Create default Fee Plan
  const { error: feePlanError } = await supabase.from('fee_plans').insert({
    organization_id: orgData.id,
    name: 'Standard Monthly',
    amount: 1500,
    duration_months: 1
  });

  if (feePlanError) {
    console.error('Default fee plan creation failed:', feePlanError);
  }

  // 5. Send Welcome Email
  /*
  if (process.env.RESEND_API_KEY) {
    try {
      const resend = new Resend(process.env.RESEND_API_KEY);
      await resend.emails.send({
        from: 'GymOS <onboarding@resend.dev>',
        to: [email],
        subject: 'Welcome to GymOS!',
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>Welcome to GymOS, ${ownerName}! 🎉</h2>
            <p>Your workspace for <strong>${gymName}</strong> is ready to go.</p>
            <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <p style="margin: 0 0 10px 0;">Here are your login credentials. Keep them safe!</p>
              <p style="margin: 0 0 5px 0;"><strong>User ID:</strong> ${email}</p>
              <p style="margin: 0;"><strong>Password:</strong> ${password}</p>
            </div>
            <p>You can log in anytime at <a href="https://gymos.in/login">gymos.in/login</a>.</p>
            <p>Best,<br>The GymOS Team</p>
          </div>
        `,
      });
    } catch (emailError) {
      console.error('Failed to send welcome email:', emailError);
    }
  }
  */

  return { success: 'Account created successfully. Redirecting you to onboarding...' };
}
