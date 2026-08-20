import { NextResponse } from 'next/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { sendOwnerSummary, sendMemberReminder } from '@/utils/whatsapp';


export async function GET(req: Request) {
  try {
    const authHeader = req.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createAdminClient();
    const today = new Date().toISOString().split('T')[0];

    // 1. Fetch active organizations
    const { data: organizations, error: orgError } = await supabase
      .from('organizations')
      .select('id, name, owner_phone')
      .in('subscription_status', ['active', 'trial']);

    if (orgError) throw orgError;
    
    let totalRemindersSent = 0;

    // 2. Process each organization
    for (const org of (organizations || [])) {
      // Find invoices that are pending and due today or earlier
      const { data: invoices, error: invoiceError } = await supabase
        .from('invoices')
        .select(`
          id,
          amount,
          due_date,
          status,
          members (
            id,
            name,
            phone
          )
        `)
        .eq('organization_id', org.id)
        .in('status', ['pending', 'overdue'])
        .lte('due_date', today);

      if (invoiceError || !invoices || invoices.length === 0) continue;

      let overdueCount = 0;
      let totalAmount = 0;

      for (const invoice of invoices) {
        const member = invoice.members as any;
        if (!member) continue;

        // Auto-mark pending as overdue if due_date is in the past (before today)
        if (invoice.status === 'pending' && invoice.due_date < today) {
          await supabase
            .from('invoices')
            .update({ status: 'overdue' })
            .eq('id', invoice.id);
        }

        // Send Member Reminder
        await sendMemberReminder(
          member.phone,
          member.name,
          org.name,
          invoice.amount,
          invoice.due_date
        );
        
        overdueCount++;
        totalAmount += Number(invoice.amount);
        totalRemindersSent++;
      }

      // Send Summary to Gym Owner
      if (overdueCount > 0 && org.owner_phone) {
        await sendOwnerSummary(
          org.owner_phone,
          org.name,
          overdueCount,
          totalAmount
        );
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: `Processed ${totalRemindersSent} fee reminders successfully.` 
    });
  } catch (error: any) {
    console.error('Cron job error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
