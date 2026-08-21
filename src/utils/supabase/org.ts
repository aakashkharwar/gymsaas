import type { SupabaseClient, User } from '@supabase/supabase-js'

export async function resolveOrgId(supabase: SupabaseClient, user: User) {
  const { data: admin } = await supabase
    .from('admin_users')
    .select('organization_id')
    .eq('id', user.id)
    .maybeSingle()

  if (admin?.organization_id) return admin.organization_id as string

  if (!user.email) return null

  const { data: org } = await supabase
    .from('organizations')
    .select('id')
    .eq('owner_email', user.email)
    .limit(1)
    .maybeSingle()

  return org?.id ?? null
}

export function friendlyDbError(message?: string | null, fallback = 'Something went wrong. Please try again.') {
  const text = (message || '').toLowerCase()
  if (
    text.includes('members_organization_id_phone') ||
    (text.includes('duplicate') && text.includes('phone'))
  ) {
    return 'A member with this phone number already exists.'
  }
  if (text.includes('duplicate key') || text.includes('unique constraint')) {
    return 'This record already exists.'
  }
  if (text.includes('row-level security') || text.includes('rls')) {
    return 'You do not have permission to do that.'
  }
  return message?.trim() || fallback
}
