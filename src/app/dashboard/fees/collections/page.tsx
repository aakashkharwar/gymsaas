'use client';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

import Link from 'next/link';
import { useState } from 'react';
import { ArrowLeft, CreditCard, IndianRupee, FileText, CalendarDays } from 'lucide-react';
import CustomDropdown from '@/components/CustomDropdown';
import { useQueryClient } from '@tanstack/react-query';
import { addPayment } from '@/app/actions/fees';
import { useFeePlans, useInvoices, useMembers } from '@/hooks/useGymQueries';
import { queryKeys } from '@/lib/query-keys';
import { useSave } from '@/components/SaveProvider';
import { SavingButton } from '@/components/SavingButton';
import { addCalendarMonths, formatDueDate, istToday, nextInvoiceDueDate } from '@/lib/membership-access';

type Invoice = {
  id: string;
  member_id: string;
  fee_plan_id?: string;
  plan_name?: string;
  amount: number;
  due_date: string;
  status: 'pending' | 'partial' | 'paid' | 'overdue';
};

function defaultDueDate(months = 1) {
  return nextInvoiceDueDate(istToday(), months);
}

export default function CollectionsPage() {
  const queryClient = useQueryClient();
  const runSave = useSave();
  const { data: members = [], isPending: membersLoading } = useMembers();
  const { data: invoices = [], isPending: invoicesLoading } = useInvoices();
  const { data: feePlans = [] } = useFeePlans();
  const [selectedMemberId, setSelectedMemberId] = useState('');
  const [selectedInvoiceId, setSelectedInvoiceId] = useState('');
  
  const [formData, setFormData] = useState({
    amount: '',
    payment_mode: 'UPI',
    receipt_no: '',
    notes: '',
    due_date: defaultDueDate(),
  });

  const [formErrors, setFormErrors] = useState<{ member?: string; amount?: string; due_date?: string }>({});
  
  const [isSubmitting, setIsSubmitting] = useState(false);


  const pendingInvoices = invoices.filter(
    inv => inv.member_id === selectedMemberId && (inv.status === 'pending' || inv.status === 'partial' || inv.status === 'overdue')
  );

  const planMonthsForMember = (memberId: string) => {
    const member = members.find((m) => m.id === memberId);
    const plan = feePlans.find((p) => p.id === member?.fee_plan_id);
    return Number(plan?.duration_months) || 1;
  };

  const selectedInvoice = invoices.find((inv) => inv.id === selectedInvoiceId);
  const payingOverdue = selectedInvoice && selectedInvoice.status !== 'paid' && (
    selectedInvoice.status === 'overdue' || String(selectedInvoice.due_date) <= istToday()
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const errors: { member?: string; amount?: string; due_date?: string } = {};
    if (!selectedMemberId) errors.member = 'Please select a member.';
    if (!formData.amount) errors.amount = 'Amount is required.';
    if (!formData.due_date) errors.due_date = 'Due date is required.';

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    setIsSubmitting(true);
    await runSave(async () => {
      const fd = new FormData();
      fd.append('member_id', selectedMemberId);
      if (selectedInvoiceId) fd.append('invoice_id', selectedInvoiceId);
      fd.append('amount', formData.amount);
      fd.append('payment_mode', formData.payment_mode);
      fd.append('receipt_no', formData.receipt_no);
      fd.append('notes', formData.notes);
      fd.append('due_date', formData.due_date);

      const res = await addPayment(fd);
      setIsSubmitting(false);

      if ('error' in res && res.error) {
        toast.error(res.error);
        return;
      }

      if ('paidInvoiceId' in res) {
        queryClient.setQueryData(queryKeys.invoices, (prev: Invoice[] | undefined) => {
          const current = prev || [];
          const paid = res.paidInvoice as Invoice | null;
          if (paid?.id && !current.some((inv) => inv.id === paid.id)) {
            return [paid, ...current];
          }
          return current.map((inv) => {
            if (inv.id !== res.paidInvoiceId) return inv;
            return {
              ...inv,
              status: (res.paidStatus as Invoice['status']) || inv.status,
              due_date: paid?.due_date || inv.due_date,
            };
          });
        });
        queryClient.setQueryData(queryKeys.members, (prev: Array<{ id: string; status?: string }> | undefined) =>
          (prev || []).map((member) => member.id === res.memberId ? { ...member, status: 'active' } : member)
        );
      }

      toast.success(
        res.paidStatus === 'paid'
          ? `Payment collected. Invoice marked Paid.`
          : 'Partial payment saved.'
      );
      setFormData({ amount: '', payment_mode: 'UPI', receipt_no: '', notes: '', due_date: defaultDueDate() });
      setSelectedMemberId('');
      setSelectedInvoiceId('');
    });
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <div className="mb-4"><Link href="/dashboard/fees" className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors"><ArrowLeft className="h-4 w-4" /> Back to Dashboard</Link></div>
        <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white">Collect Payment</h1>
        <p className="mt-2 text-lg text-slate-500 dark:text-slate-400">Record a new fee payment from a member.</p>
      </div>

      
                    <form onSubmit={handleSubmit} className="space-y-8">
        {/* 1. Select Member */}
        <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-8 shadow-sm">
          <h2 className="mb-6 flex items-center text-xl font-bold text-slate-900 dark:text-white tracking-tight">
            1. Select Member <span className="ml-1 text-red-500">*</span>
          </h2>
          <div className="max-w-xl">
            <CustomDropdown
              value={selectedMemberId}
              onChange={(val) => {
                setSelectedMemberId(val);
                const pending = invoices
                  .filter((inv) => inv.member_id === val && inv.status !== 'paid')
                  .sort((a, b) => String(a.due_date).localeCompare(String(b.due_date)));
                const next = pending[0];
                const months = planMonthsForMember(val);
                if (next) {
                  setSelectedInvoiceId(next.id);
                  setFormData((prev) => ({
                    ...prev,
                    amount: String(next.amount),
                    due_date: next.due_date,
                  }));
                } else {
                  const member = members.find((m) => m.id === val);
                  const plan = feePlans.find((p) => p.id === member?.fee_plan_id);
                  const lastPaid = invoices
                    .filter((inv) => inv.member_id === val && inv.status === 'paid')
                    .sort((a, b) => String(b.due_date).localeCompare(String(a.due_date)))[0];
                  setSelectedInvoiceId('');
                  setFormData((prev) => ({
                    ...prev,
                    amount: plan ? String(plan.amount) : prev.amount,
                    due_date: lastPaid?.due_date
                      ? addCalendarMonths(lastPaid.due_date, months)
                      : defaultDueDate(months),
                  }));
                }
                setFormErrors((prev) => ({ ...prev, member: undefined, amount: undefined, due_date: undefined }));
              }}
              options={[
                { value: '', label: 'Select a member...' },
                ...members.map(m => ({ value: m.id, label: m.name + (m.phone ? ` - ${m.phone}` : '') }))
              ]}
              hasError={!!formErrors.member}
              loading={membersLoading}
            />
            {formErrors.member && <p className="mt-2 text-sm text-red-500">{formErrors.member}</p>}
          </div>
        </div>

        {/* 2. Select Invoice */}
        <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-8 shadow-sm">
          <h2 className="mb-6 flex items-center text-xl font-bold text-slate-900 dark:text-white tracking-tight">
            2. Select Invoice (Optional)
          </h2>
          <div className="max-w-xl">
            <CustomDropdown
              value={selectedInvoiceId}
              onChange={(val) => {
                setSelectedInvoiceId(val);
                const inv = invoices.find(i => i.id === val);
                if (inv) {
                  setFormData((prev) => ({
                    ...prev,
                    amount: inv.amount.toString(),
                    due_date: inv.due_date,
                  }));
                  setFormErrors((prev) => ({ ...prev, amount: undefined, due_date: undefined }));
                }
              }}
              options={[
                { value: '', label: 'No invoice (Direct payment)' },
                ...invoices.filter(i => i.member_id === selectedMemberId && i.status !== 'paid').map(i => {
                  const plan = feePlans.find(p => p.id === i.fee_plan_id);
                  return {
                    value: i.id,
                    label: `${i.plan_name || plan?.name || 'Invoice'} - ₹${i.amount} · due ${formatDueDate(i.due_date)}`
                  };
                })
              ]}
              placeholder={selectedMemberId ? "Select an unpaid invoice..." : "Select a member first..."}
              loading={invoicesLoading}
            />
          </div>
        </div>

        {/* 3. Payment Details */}
        <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-8 shadow-sm">
          <h2 className="mb-6 flex items-center text-xl font-bold text-slate-900 dark:text-white tracking-tight">
            3. Payment Details
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-300">Amount (₹) <span className="text-red-500">*</span></label>
              <div className="relative">
                <IndianRupee className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                <input
                  type="number"
                  value={formData.amount}
                  onChange={e => {
                    setFormData({ ...formData, amount: e.target.value });
                    setFormErrors(prev => ({ ...prev, amount: undefined }));
                  }}
                  className={`w-full rounded-xl border bg-slate-50 dark:bg-slate-800/50 py-3 pl-11 pr-4 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 ${formErrors.amount ? 'border-red-400 focus:border-red-500' : 'border-slate-200 dark:border-slate-700'}`}
                  placeholder="0.00"
                />
              </div>
              {formErrors.amount && <p className="mt-2 text-sm text-red-500">{formErrors.amount}</p>}
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-300">Payment Mode <span className="text-red-500">*</span></label>
              <CustomDropdown
                value={formData.payment_mode}
                onChange={v => setFormData({ ...formData, payment_mode: v })}
                options={[
                      { value: 'UPI', label: 'UPI' },
                      { value: 'Cash', label: 'Cash' },
                      { value: 'Card', label: 'Card' },
                      { value: 'Bank Transfer', label: 'Bank Transfer' },
                    ]}
                    icon={<CreditCard className="h-5 w-5" />}
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-300">Due Date <span className="text-red-500">*</span></label>
                  <div className="relative">
                    <CalendarDays className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                    <input
                      type="date"
                      value={formData.due_date}
                      readOnly={!!selectedInvoiceId}
                      onChange={e => {
                        setFormData({ ...formData, due_date: e.target.value });
                        setFormErrors(prev => ({ ...prev, due_date: undefined }));
                      }}
                      className={`w-full rounded-xl border bg-slate-50 dark:bg-slate-800/50 py-3 pl-11 pr-4 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 ${formErrors.due_date ? 'border-red-400 focus:border-red-500' : 'border-slate-200 dark:border-slate-700'} ${selectedInvoiceId ? 'cursor-default' : ''}`}
                    />
                  </div>
                  {formErrors.due_date && <p className="mt-2 text-sm text-red-500">{formErrors.due_date}</p>}
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    {payingOverdue
                      ? `Same as the invoice above (${formatDueDate(selectedInvoice?.due_date)}). It will be marked Paid.`
                      : 'Same date as the selected invoice.'}
                  </p>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-300">Receipt No (Optional)</label>
                  <div className="relative">
                    <FileText className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                    <input
                      value={formData.receipt_no}
                      onChange={e => setFormData({ ...formData, receipt_no: e.target.value })}
                      className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 py-3 pl-11 pr-4 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-300">Notes (Optional)</label>
                  <input
                    value={formData.notes}
                    onChange={e => setFormData({ ...formData, notes: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 py-3 px-4 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-4">
                <SavingButton type="submit" saving={isSubmitting} savingLabel="Saving payment..." className="text-base">
                  Save Payment
                </SavingButton>
              </div>
            </div>
        </form>
    </div>
  );
}
