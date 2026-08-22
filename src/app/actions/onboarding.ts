'use server'

import { createClient } from '@/utils/supabase/server';

export async function updateOrganizationSettings(formData: FormData) {
  const subdomain = String(formData.get('subdomain') ?? '').trim().toLowerCase();
  const address = String(formData.get('address') ?? '').trim();
  const timings = String(formData.get('timings') ?? '').trim();
  
  // services are checkboxes, so we get all values
  const services = formData.getAll('services').map(s => String(s));

  if (!subdomain) {
    return { error: 'Subdomain is required' };
  }

  // Basic validation: letters, numbers, hyphens
  if (!/^[a-z0-9-]+$/.test(subdomain)) {
    return { error: 'Subdomain can only contain lowercase letters, numbers, and hyphens' };
  }

  const supabase = await createClient();
  const { data: userData, error: authError } = await supabase.auth.getUser();

  if (authError || !userData?.user) {
    return { error: 'Unauthorized' };
  }

  const { data: adminData } = await supabase
    .from('admin_users')
    .select('organization_id')
    .eq('id', userData.user.id)
    .single();

  if (!adminData?.organization_id) {
    return { error: 'Organization not found' };
  }

  // Check if subdomain is taken
  const { data: existingOrg } = await supabase
    .from('organizations')
    .select('id')
    .eq('slug', subdomain)
    .single();

  if (existingOrg && existingOrg.id !== adminData.organization_id) {
    return { error: 'This subdomain is already taken. Please choose another.' };
  }

  // Update
  const { error: updateError } = await supabase
    .from('organizations')
    .update({ 
      slug: subdomain,
      address,
      timings: JSON.stringify({ display: timings }),
      services: JSON.stringify(services)
    })
    .eq('id', adminData.organization_id);

  if (updateError) {
    return { error: 'Failed to update settings. Please try again.' };
  }

  return { success: true };
}

export async function getOrganizationSlug() {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();

  if (!userData?.user) return null;

  const { data: adminData } = await supabase
    .from('admin_users')
    .select('organization_id')
    .eq('id', userData.user.id)
    .single();

  if (!adminData?.organization_id) return null;

  const { data: org } = await supabase
    .from('organizations')
    .select('slug')
    .eq('id', adminData.organization_id)
    .single();

  return org?.slug || null;
}
