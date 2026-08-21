import { NextResponse } from 'next/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { sendOwnerSummary, sendMemberReminder } from '@/utils/whatsapp';
import { sendMembershipExpiryEmail } from '@/utils/email';


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
            phone,
            email
          )
        `)
        .eq('organization_id', org.id)
        .in('status', ['pending', 'overdue'])
        .lte('due_date', today);

      if (invoiceError || !invoices || invoices.length === 0) continue;

      let overdueCount = 0;
      let totalAmount = 0;

      for (const invoice of invoices) {
        const memberRaw = invoice.members as { name?: string; phone?: string; email?: string } | { name?: string; phone?: string; email?: string }[] | null;
        const member = Array.isArray(memberRaw) ? memberRaw[0] : memberRaw;
        if (!member) continue;

        if (invoice.status === 'pending' && invoice.due_date < today) {
          await supabase
            .from('invoices')
            .update({ status: 'overdue' })
            .eq('id', invoice.id);
        }

        if (member.email && member.name) {
          await sendMembershipExpiryEmail({
            memberEmail: member.email,
            memberName: member.name,
            gymName: org.name,
            dueDate: invoice.due_date,
            amount: Number(invoice.amount),
          });
        }

        if (member.phone && member.name) {
          await sendMemberReminder(
            member.phone,
            member.name,
            org.name,
            invoice.amount,
            invoice.due_date
          );
        }
        
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
