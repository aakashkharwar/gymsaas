'use server'

import { createClient } from '@/utils/supabase/server';

export async function getTodayAttendance() {
  const supabase = await createClient();
  const today = new Date().toISOString().split('T')[0];
  const { data } = await supabase
    .from('attendance')
    .select(`
      id,
      check_in_time,
      sync_status,
      members ( id, name, phone )
    `)
    .gte('check_in_time', today + 'T00:00:00Z')
    .order('check_in_time', { ascending: false });

  return data || [];
}
