'use client';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { ArrowLeft, CreditCard, IndianRupee, FileText, CheckCircle, CheckCircle2, XCircle } from 'lucide-react';
import CustomDropdown from '@/components/CustomDropdown';

type Invoice = {
  id: string;
  member_id: string;
  fee_plan_id?: string;
  plan_name?: string;
  amount: number;
  due_date: string;
  status: 'pending' | 'partial' | 'paid' | 'overdue';
};

export default function CollectionsPage() {
  const [members, setMembers] = useState<{ id: string; name: string; phone: string }[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [feePlans, setFeePlans] = useState<{ id: string; name: string }[]>([]);
  const [selectedMemberId, setSelectedMemberId] = useState('');
  const [selectedInvoiceId, setSelectedInvoiceId] = useState('');
  
  const [formData, setFormData] = useState({
    amount: '',
    payment_mode: 'UPI',
    receipt_no: '',
    notes: ''
  });

  const [formErrors, setFormErrors] = useState<{member?: string, amount?: string}>({});
  
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      const m = await import('@/app/actions/fees');
      const membersData = await (await import('@/app/actions/members')).getMembers();
      const invoicesData = await m.getInvoices();
      const plansData = await m.getFeePlans();
      if (mounted) {
        setMembers(membersData);
        setInvoices(invoicesData);
        setFeePlans(plansData);
      }
    };
    load();
    return () => { mounted = false; };
  }, []);


  const pendingInvoices = invoices.filter(
    inv => inv.member_id === selectedMemberId && (inv.status === 'pending' || inv.status === 'partial' || inv.status === 'overdue')
  );

  const handleInvoiceSelect = (id: string) => {
    setSelectedInvoiceId(id);
    const inv = invoices.find(i => i.id === id);
    if (inv) {
      setFormData(prev => ({ ...prev, amount: String(inv.amount) }));
      setFormErrors(prev => ({...prev, amount: undefined}));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const errors: {member?: string, amount?: string} = {};
    if (!selectedMemberId) errors.member = 'Please select a member.';
    if (!formData.amount) errors.amount = 'Amount is required.';

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    setIsSubmitting(true);
    const fd = new FormData();
    fd.append('member_id', selectedMemberId);
    if (selectedInvoiceId) fd.append('invoice_id', selectedInvoiceId);
    fd.append('amount', formData.amount);
    fd.append('payment_mode', formData.payment_mode);
    fd.append('receipt_no', formData.receipt_no);
    fd.append('notes', formData.notes);

    const m = await import('@/app/actions/fees');
    const res = await m.addPayment(fd);

    setIsSubmitting(false);

    if (res.error) {
      toast.error(res.error);
      return;
    }

    if (selectedInvoiceId) {
      const current = await m.getInvoices();
      setInvoices(current);
    }

    toast.success('Payment collected successfully!');
    setFormData({ amount: '', payment_mode: 'UPI', receipt_no: '', notes: '' });
    setSelectedMemberId('');
    setSelectedInvoiceId('');
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
                setSelectedInvoiceId('');
                setFormErrors(prev => ({ ...prev, member: undefined }));
              }}
              options={[
                { value: '', label: 'Select a member...' },
                ...members.map(m => ({ value: m.id, label: m.name + (m.phone ? ` - ${m.phone}` : '') }))
              ]}
              hasError={!!formErrors.member}
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
                  setFormData(prev => ({ ...prev, amount: inv.amount.toString() }));
                  setFormErrors(prev => ({ ...prev, amount: undefined }));
                }
              }}
              options={[
                { value: '', label: 'No invoice (Direct payment)' },
                ...invoices.filter(i => i.member_id === selectedMemberId && i.status === 'pending').map(i => {
                  const plan = feePlans.find(p => p.id === i.fee_plan_id);
                  return {
                    value: i.id,
                    label: `${i.plan_name || plan?.name || 'Invoice'} - ₹${i.amount}`
                  };
                })
              ]}
              placeholder={selectedMemberId ? "Select an unpaid invoice..." : "Select a member first..."}
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
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="cursor-pointer text-base disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? 'Saving...' : 'Save Payment'}
                </Button>
              </div>
            </div>
        </form>
    </div>
  );
}
