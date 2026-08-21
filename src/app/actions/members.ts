'use server'

import { createClient } from '@/utils/supabase/server';
import { createPrivilegedClient } from '@/utils/supabase/admin';
import { revalidatePath } from 'next/cache';

export async function getMembers() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return [];

  let orgId = null;
  const { data: admin } = await supabase
    .from('admin_users')
    .select('organization_id')
    .eq('id', user.id)
    .single();

  if (admin?.organization_id) {
    orgId = admin.organization_id;
  } else {
    const { data: orgByEmail } = await supabase
      .from('organizations')
      .select('id')
      .eq('owner_email', user.email)
      .limit(1)
      .single();
    if (orgByEmail?.id) {
      orgId = orgByEmail.id;
    } else {
      const { data: anyOrg } = await supabase
        .from('organizations')
        .select('id')
        .limit(1);
      if (anyOrg && anyOrg.length > 0) orgId = anyOrg[0].id;
    }
  }

  if (!orgId) return [];

  const adminSupabase = await createPrivilegedClient();
  const { data: members, error } = await adminSupabase
    .from('members')
    .select('*')
    .eq('organization_id', orgId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching members:', error);
    return [];
  }

  return members;
}

export async function addMember(formData: FormData) {
  const supabase = await createClient();
  
  // First, we need the user's organization_id. We can fetch this from the admin_users table
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  let orgId = null;

  const { data: admin } = await supabase
    .from('admin_users')
    .select('organization_id')
    .eq('id', user.id)
    .single();

  if (admin?.organization_id) {
    orgId = admin.organization_id;
  } else {
    const { data: orgByEmail } = await supabase
      .from('organizations')
      .select('id')
      .eq('owner_email', user.email)
      .limit(1)
      .single();
    if (orgByEmail?.id) {
      orgId = orgByEmail.id;
    } else {
      const { data: anyOrg } = await supabase
        .from('organizations')
        .select('id')
        .limit(1);
      if (anyOrg && anyOrg.length > 0) orgId = anyOrg[0].id;
    }
  }

  if (!orgId) return { error: 'No organization found' };

  const name = formData.get('name') as string;
  const phone = formData.get('phone') as string;
  const email = formData.get('email') as string;
  const fee_plan_id = formData.get('fee_plan_id') as string;
  const status = formData.get('status') as string;
  const enrollment_date = formData.get('enrollment_date') as string;
  const notes = formData.get('notes') as string;
  const plan_type = formData.get('plan_type') as string;

  const adminSupabase = await createPrivilegedClient();
  const { error } = await adminSupabase.from('members').insert([
      {
        organization_id: orgId,
        name,
        phone,
        email: email || null,
        fee_plan_id: fee_plan_id || null,
        status,
        enrollment_date: enrollment_date || null,
        notes: notes || null,
        plan_type,
      }
    ]);

  if (error) {
    return { error: error.message };
  }

  revalidatePath('/dashboard/members');
  return { success: true };
}

export async function updateMember(id: string, formData: FormData) {
  const supabase = await createClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  const name = formData.get('name') as string;
  const phone = formData.get('phone') as string;
  const email = formData.get('email') as string;
  const fee_plan_id = formData.get('fee_plan_id') as string;
  const status = formData.get('status') as string;
  const enrollment_date = formData.get('enrollment_date') as string;
  const notes = formData.get('notes') as string;
  const plan_type = formData.get('plan_type') as string;

  const { error } = await supabase
    .from('members')
    .update({
      name,
      phone,
      email: email || null,
      fee_plan_id: fee_plan_id || null,
      status,
      enrollment_date: enrollment_date || null,
      notes: notes || null,
      plan_type,
    })
    .eq('id', id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath('/dashboard/members');
  return { success: true };
}


export async function submitAdmissionForm(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { error: 'Unauthorized' };

  let orgId = null;

  const { data: admin } = await supabase
    .from('admin_users')
    .select('organization_id')
    .eq('id', user.id)
    .single();

  if (admin?.organization_id) {
    orgId = admin.organization_id;
  } else {
    const { data: orgByEmail } = await supabase
      .from('organizations')
      .select('id')
      .eq('owner_email', user.email)
      .limit(1)
      .single();
    if (orgByEmail?.id) {
      orgId = orgByEmail.id;
    } else {
      const { data: anyOrg } = await supabase
        .from('organizations')
        .select('id')
        .limit(1);
      if (anyOrg && anyOrg.length > 0) orgId = anyOrg[0].id;
    }
  }

  if (!orgId) return { error: 'No organization found' };

  const name = formData.get('name') as string;
  const phone = formData.get('phone') as string;
  const address = formData.get('address') as string;
  
  // Format all fitness assessment data into the notes field
  const admissionDate = formData.get('admissionDate') as string;
  const age = formData.get('age') as string;
  const sex = formData.get('sex') as string;
  const batch = formData.get('batch') as string;
  const weight = formData.get('weight') as string;
  const occupation = formData.get('occupation') as string;
  
  const primaryGoals = formData.getAll('primaryGoal');
  const secondaryGoals = formData.getAll('secondaryGoal');
  const healthIssues = formData.getAll('healthIssue');

  let formattedNotes = `[NEW ADMISSION]\n`;
  formattedNotes += `Date: ${admissionDate}\n`;
  if (address) formattedNotes += `Address: ${address}\n`;
  formattedNotes += `Age: ${age} | Sex: ${sex} | Batch: ${batch} | Weight: ${weight}\n`;
  formattedNotes += `Occupation: ${occupation}\n\n`;
  
  if (primaryGoals.length > 0) formattedNotes += `Primary Goals: ${primaryGoals.join(', ')}\n`;
  if (secondaryGoals.length > 0) formattedNotes += `Secondary Goals: ${secondaryGoals.join(', ')}\n`;
  if (healthIssues.length > 0) formattedNotes += `Health Profile: ${healthIssues.join(', ')}\n`;

  const adminSupabase = await createPrivilegedClient();
  const { error } = await adminSupabase.from('members').insert([
      {
        organization_id: orgId,
        name,
        phone,
        status: 'active',
        plan_type: 'monthly',
        enrollment_date: admissionDate || new Date().toISOString().split('T')[0],
        notes: formattedNotes,
      }
    ]);

  if (error) {
    console.error('Error submitting admission:', error);
    return { error: error.message };
  }

  revalidatePath('/dashboard/members');
  return { success: true };
}
