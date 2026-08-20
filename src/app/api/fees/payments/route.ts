import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: userData, error: authError } = await supabase.auth.getUser();

    let orgId = null;

    if (authError || !userData?.user) {
      if (process.env.NODE_ENV === 'development') {
        // Dev mode bypass: just grab the first organization
        const { data: firstOrg } = await supabase.from('organizations').select('id').limit(1).single();
        if (firstOrg) orgId = firstOrg.id;
      }
      
      if (!orgId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    } else {
      const { data: adminData } = await supabase
        .from('admin_users')
        .select('organization_id')
        .eq('id', userData.user.id)
        .single();
        
      orgId = adminData?.organization_id;
    }

    if (!orgId) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    const body = await request.json();
    const paymentsToProcess = Array.isArray(body) ? body : [body];
    const successIds = [];

    for (const p of paymentsToProcess) {
      const { member_id, invoice_id, amount, payment_mode, receipt_no, notes, id: localId } = p;

      if (!member_id || amount === undefined || !payment_mode) {
        continue;
      }

      // Capture payment
      const { data: payment, error } = await supabase
        .from('payments')
        .insert({
          organization_id: orgId,
          member_id,
          invoice_id,
          amount,
          payment_mode,
          receipt_no,
          notes
        })
        .select()
        .single();

      if (error) continue;

      // Update invoice status if linked
      if (invoice_id) {
        const { data: invoice } = await supabase
          .from('invoices')
          .select('amount, status')
          .eq('id', invoice_id)
          .single();
        
        if (invoice) {
          const newStatus = amount >= invoice.amount ? 'paid' : 'partial';
          await supabase
            .from('invoices')
            .update({ status: newStatus })
            .eq('id', invoice_id);
        }
      }

      // Update Ledger (credit)
      await supabase.from('ledgers').insert({
          organization_id: orgId,
          member_id,
          type: 'credit',
          amount: amount,
          balance_after: -amount,
          reference_id: payment.id
      });

      if (localId) successIds.push(localId);
    }

    return NextResponse.json({ successIds, message: 'Processed payments' }, { status: 201 });
  } catch (error) {
    console.error('Error recording payment:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
