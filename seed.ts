import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function run() {
  const { data: orgs, error: orgError } = await supabase.from('organizations').select('id');
  if (orgError) {
    console.error('Error fetching orgs:', orgError);
    return;
  }
  
  for (const org of orgs) {
    const { error } = await supabase.from('fee_plans').insert({
      organization_id: org.id,
      name: 'Standard Monthly',
      amount: 1500,
      duration_months: 1
    });
    if (error) {
      console.error('Error inserting for org', org.id, error);
    } else {
      console.log('Inserted for org', org.id);
    }
  }
}

run();
