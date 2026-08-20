'use server'

import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';

// Helper to ensure only super admins can run these actions
async function verifySuperAdmin() {
  const supabase = await createClient();
  const { data: userData, error: authError } = await supabase.auth.getUser();

  if (authError || !userData?.user) {
    throw new Error('Unauthorized');
  }

  const { data: adminData } = await supabase
    .from('admin_users')
    .select('is_super_admin')
    .eq('id', userData.user.id)
    .single();

  if (!adminData?.is_super_admin) {
    throw new Error('Forbidden: Super Admin access required');
  }

  return supabase;
}

export async function getSuperAdminStats() {
  try {
    const supabase = await verifySuperAdmin();
    
    const { data: organizations, error } = await supabase
      .from('organizations')
      .select('plan, subscription_status');

    if (error) {
      console.error('Error fetching organizations for stats:', error);
      return { totalGyms: 0, activeTrials: 0, suspendedAccounts: 0, mrr: 0 };
    }

    let totalGyms = organizations.length;
    let activeTrials = 0;
    let suspendedAccounts = 0;
    let mrr = 0;

    organizations.forEach(org => {
      if (org.subscription_status === 'trial') {
        activeTrials++;
      } else if (org.subscription_status === 'past_due' || org.subscription_status === 'cancelled') {
        suspendedAccounts++;
      }
      
      // Compute MRR assuming active basic is 499 and active pro is 999
      if (org.subscription_status === 'active') {
        if (org.plan === 'basic') mrr += 499;
        if (org.plan === 'pro') mrr += 999;
      }
    });

    return {
      totalGyms,
      activeTrials,
      suspendedAccounts,
      mrr
    };
  } catch (err) {
    console.error(err);
    return { totalGyms: 0, activeTrials: 0, suspendedAccounts: 0, mrr: 0 };
  }
}

export async function getOrganizations() {
  try {
    const supabase = await verifySuperAdmin();
    
    const { data: organizations, error } = await supabase
      .from('organizations')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching organizations:', error);
      return [];
    }

    return organizations;
  } catch (err) {
    console.error(err);
    return [];
  }
}

export async function updateOrganizationStatus(organizationId: string, newStatus: string) {
  try {
    const supabase = await verifySuperAdmin();
    
    const { error } = await supabase
      .from('organizations')
      .update({ subscription_status: newStatus })
      .eq('id', organizationId);

    if (error) {
      return { error: error.message };
    }

    revalidatePath('/super-admin');
    return { success: true };
  } catch (err: any) {
    return { error: err.message };
  }
}
