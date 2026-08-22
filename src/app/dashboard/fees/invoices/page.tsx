'use client';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

import { useState } from 'react';
import { Plus, Search, FileText, CheckCircle, AlertTriangle, ChevronDown, Download, ArrowLeft, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import CustomDropdown from '@/components/CustomDropdown';
import type { Invoice } from '@/utils/fee-store';
import { addInvoice, triggerFeeReminders } from '@/app/actions/fees';
import { useFeePlans, useInvoices, useMembers, useOrganizationDetails } from '@/hooks/useGymQueries';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';
import { useSave } from '@/components/SaveProvider';
import { SavingButton } from '@/components/SavingButton';
import { invoiceDisplayStatus } from '@/lib/membership-access';

function statusBadge(status: string, dueDate: string, today: string) {
  const display = invoiceDisplayStatus(status, dueDate, today);
  if (display === 'paid') {
    return { label: 'Paid', className: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400' };
  }
  if (display === 'overdue') {
    return { label: 'Overdue', className: 'bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-400', icon: true };
  }
  if (display === 'due_today') {
    return { label: 'Due Today', className: 'bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400' };
  }
  return {
    label: display.charAt(0).toUpperCase() + display.slice(1),
    className: 'bg-slate-100 text-slate-700 dark:bg-slate-500/10 dark:text-slate-400',
  };
}

export default function InvoicesPage() {
  const queryClient = useQueryClient();
  const runSave = useSave();
  const { data: invoices = [] } = useInvoices();
  const { data: members = [], isPending: membersLoading } = useMembers();
  const { data: feePlans = [], isPending: plansLoading } = useFeePlans();
  const { data: orgDetails = null } = useOrganizationDetails();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isTriggering, setIsTriggering] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState({
    member_id: '',
    fee_plan_id: '',
    due_date: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
  });
    const [formErrors, setFormErrors] = useState<{ member_id?: string; fee_plan_id?: string; due_date?: string }>({});

  
  const handleTriggerReminders = async () => {
    setIsTriggering(true);
    await runSave(async () => {
      try {
        const data = await triggerFeeReminders();
        if (data.success) {
          toast.success(data.message || 'Reminders sent.');
          queryClient.invalidateQueries({ queryKey: queryKeys.invoices });
        } else {
          toast.error(data.error || 'Failed to send reminders');
        }
      } catch (e: any) {
        toast.error(e.message || 'Error sending reminders');
      } finally {
        setIsTriggering(false);
      }
    });
  };

  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
  const handleGenerateInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const errors: { member_id?: string; fee_plan_id?: string; due_date?: string } = {};
    if (!formData.member_id) errors.member_id = 'Please select a member.';
    if (!formData.fee_plan_id) errors.fee_plan_id = 'Please select a fee plan.';
    if (!formData.due_date) errors.due_date = 'Due date is required.';
    
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    setIsCreating(true);
    await runSave(async () => {
      const fd = new FormData();
      fd.append('member_id', formData.member_id);
      fd.append('fee_plan_id', formData.fee_plan_id);
      fd.append('due_date', formData.due_date);

      const res = await addInvoice(fd);
      if ('error' in res && res.error) {
        toast.error(res.error);
        return;
      }

      if ('invoice' in res && res.invoice) {
        queryClient.setQueryData(queryKeys.invoices, (prev: Invoice[] | undefined) => [res.invoice as Invoice, ...(prev || [])]);
      }

      setIsModalOpen(false);
      setFormData({
        member_id: '',
        fee_plan_id: '',
        due_date: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
      });
      toast.success('Invoice generated successfully!');
    });
    setIsCreating(false);
  };

  const handleMemberSelect = (memberId: string) => {
    const member = members.find(m => m.id === memberId);
    let planId = '';
    
    if (member) {
      if (member.fee_plan_id) {
        planId = member.fee_plan_id;
      } else if (member.plan_type) {
        const fallback = feePlans.find(p => p.name.toLowerCase() === member.plan_type.toLowerCase());
        if (fallback) planId = fallback.id;
      }
    }
    
    setFormData(prev => ({ ...prev, member_id: memberId, fee_plan_id: planId }));
  };

  const filteredInvoices = invoices.filter(inv => {
    const member = members.find(m => m.id === inv.member_id);
    const matchesSearch = !search || member?.name.toLowerCase().includes(search.toLowerCase());
    const display = invoiceDisplayStatus(inv.status, inv.due_date, today);
    const matchesStatus = statusFilter === 'all'
      || inv.status === statusFilter
      || (statusFilter === 'overdue' && display === 'overdue')
      || (statusFilter === 'pending' && display === 'due_today');
    return matchesSearch && matchesStatus;
  });

  const totalPages = Math.ceil(filteredInvoices.length / ITEMS_PER_PAGE);
  const paginatedInvoices = filteredInvoices.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  const handleDownloadPdf = async (inv: Invoice) => {
    const member = members.find(m => m.id === inv.member_id);
    const plan = feePlans.find(p => p.id === inv.fee_plan_id);

    const receiptNo = Math.floor(1000 + Math.random() * 9000);
    const receiptDate = new Date(inv.created_at || Date.now()).toLocaleDateString('en-IN');
    const orgName = orgDetails?.name || 'Gym Name';
    const orgAddress = orgDetails?.address || 'Gym Address';
    const amount = Number(inv.amount || plan?.amount || 0).toFixed(2);
    const memberName = member?.name || 'Unknown';
    const memberPhone = member?.phone || '';
    const planName = plan?.name || 'Gym Membership Fee';
    const dueDate = inv.due_date || '';

    try {
      const { jsPDF } = await import('jspdf');
      const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });

      const pageW = doc.internal.pageSize.getWidth();
      const pageH = doc.internal.pageSize.getHeight();
      const margin = 15;
      const contentW = pageW - margin * 2;

      // Header
      doc.setFillColor(255, 193, 7);
      doc.rect(margin, margin, contentW, 14, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(16);
      doc.setTextColor(0, 0, 0);
      doc.text('GYM RECEIPT', pageW / 2, margin + 10, { align: 'center' });

      // Org info
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text(orgName, margin, margin + 24);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.text(orgAddress, margin, margin + 30);

      // Receipt info box
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.text('Receipt No:', pageW - margin - 60, margin + 24);
      doc.text('Date:', pageW - margin - 60, margin + 30);
      doc.setFont('helvetica', 'normal');
      doc.text(String(receiptNo), pageW - margin - 20, margin + 24);
      doc.text(receiptDate, pageW - margin - 20, margin + 30);

      // Divider
      let y = margin + 38;
      doc.setDrawColor(0, 0, 0);
      doc.line(margin, y, pageW - margin, y);
      y += 6;

      // Member & Seller section
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.text('SELLER', margin, y);
      doc.text('CUSTOMER', pageW / 2 + 10, y);
      y += 5;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);

      const sellerLines = [
        ['Company:', orgName],
        ['Address:', orgAddress],
      ];
      const customerLines = [
        ['Name:', memberName],
        ['Phone:', memberPhone],
        ['Due Date:', dueDate],
      ];

      const maxLines = Math.max(sellerLines.length, customerLines.length);
      for (let i = 0; i < maxLines; i++) {
        if (sellerLines[i]) {
          doc.setFont('helvetica', 'bold');
          doc.text(sellerLines[i][0], margin, y);
          doc.setFont('helvetica', 'normal');
          doc.text(sellerLines[i][1], margin + 25, y);
        }
        if (customerLines[i]) {
          doc.setFont('helvetica', 'bold');
          doc.text(customerLines[i][0], pageW / 2 + 10, y);
          doc.setFont('helvetica', 'normal');
          doc.text(customerLines[i][1], pageW / 2 + 35, y);
        }
        y += 6;
      }

      y += 4;
      doc.line(margin, y, pageW - margin, y);
      y += 8;

      // Items table header
      doc.setFillColor(240, 240, 240);
      doc.rect(margin, y - 5, contentW, 9, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.text('Description', margin + 2, y);
      doc.text('Qty', margin + contentW * 0.55, y);
      doc.text('Unit Price', margin + contentW * 0.68, y);
      doc.text('Amount', margin + contentW * 0.85, y);
      y += 5;

      doc.line(margin, y - 1, pageW - margin, y - 1);

      // Item row
      doc.setFont('helvetica', 'normal');
      doc.text(planName, margin + 2, y + 6);
      doc.text('1', margin + contentW * 0.55, y + 6);
      doc.text('Rs. ' + amount, margin + contentW * 0.65, y + 6);
      doc.text('Rs. ' + amount, margin + contentW * 0.83, y + 6);
      y += 14;

      doc.line(margin, y, pageW - margin, y);
      y += 6;

      // Totals
      const totalsX = margin + contentW * 0.65;
      doc.setFont('helvetica', 'normal');
      doc.text('Subtotal:', totalsX, y);
      doc.text('Rs. ' + amount, margin + contentW * 0.83, y);
      y += 6;
      doc.text('Tax (0%):', totalsX, y);
      doc.text('Rs. 0.00', margin + contentW * 0.83, y);
      y += 2;
      doc.line(totalsX, y, pageW - margin, y);
      y += 5;

      doc.setFillColor(255, 193, 7);
      doc.rect(totalsX - 2, y - 4, pageW - margin - totalsX + 2, 9, 'F');
      doc.setFont('helvetica', 'bold');
      doc.text('Total:', totalsX, y + 1);
      doc.text('Rs. ' + amount, margin + contentW * 0.83, y + 1);
      y += 12;

      doc.line(margin, y, pageW - margin, y);
      y += 8;

      // Footer
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(9);
      doc.setTextColor(100, 100, 100);
      doc.text('Thank you for your business!', pageW / 2, y, { align: 'center' });

      doc.save('Receipt_' + receiptNo + '.pdf');
      toast.success('PDF downloaded successfully!');
    } catch (err: any) {
      console.error('PDF error:', err);
      toast.error('Failed to generate PDF.');
    }
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="mb-4"><Link href="/dashboard/fees" className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors"><ArrowLeft className="h-4 w-4" /> Back to Dashboard</Link></div>
  

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white">Invoices</h1>
          <p className="mt-2 text-lg text-slate-500 dark:text-slate-400">Manage member fee invoices and track statuses.</p>
        </div>

        
          <div className="flex gap-2 sm:gap-3 w-full sm:w-auto">
            <Button variant="outline"
              onClick={handleTriggerReminders}
              disabled={isTriggering}
              className="inline-flex items-center justify-center gap-1.5 sm:gap-2 rounded-xl bg-white dark:bg-slate-800 px-3 sm:px-5 py-2 sm:py-3 text-sm sm:text-base font-semibold text-slate-700 dark:text-slate-300 shadow-sm transition hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 disabled:opacity-50 cursor-pointer flex-1 sm:flex-none whitespace-nowrap"
            >
              <FileText className="h-5 w-5" />
              {isTriggering ? 'Triggering...' : 'Trigger'}
            </Button>
            <Button
              onClick={() => setIsModalOpen(true)}
              className="inline-flex items-center justify-center gap-1.5 sm:gap-2 rounded-xl bg-slate-900 dark:bg-indigo-600 px-3 sm:px-5 py-2 sm:py-3 text-sm sm:text-base font-semibold text-white shadow-sm transition hover:bg-slate-800 dark:hover:bg-indigo-500 cursor-pointer flex-1 sm:flex-none whitespace-nowrap"
            >
              <Plus className="h-5 w-5" />
              New Invoice
            </Button>
          </div>

      </div>

      <div className="w-full rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm transition-colors">
        <div className="flex flex-col gap-3 rounded-t-3xl border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/50 p-4 sm:p-5 md:flex-row">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
            <input
              value={search}
              onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
              placeholder="Search invoices by member name..."
              className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 py-2.5 pl-10 pr-4 text-sm text-slate-700 dark:text-slate-200 focus:border-indigo-500 dark:focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:focus:ring-indigo-400"
            />
          </div>

          <div className="relative min-w-[180px]">
            <CustomDropdown
              value={statusFilter}
              onChange={val => setStatusFilter(val)}
              options={[
                { value: 'all', label: 'All Status' },
                { value: 'pending', label: 'Pending' },
                { value: 'partial', label: 'Partial' },
                { value: 'paid', label: 'Paid' },
                { value: 'overdue', label: 'Overdue' }
              ]}
              className="border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus:border-indigo-500 dark:focus:border-indigo-400 py-2 text-sm text-slate-700 dark:text-slate-200"
            />
          </div>
        </div>

        {filteredInvoices.length === 0 ? (
          <div className="flex min-h-[420px] flex-col items-center justify-center px-6 py-12 text-center">
            <div className="mb-4 rounded-full bg-slate-100 dark:bg-slate-800 p-4 text-slate-400 dark:text-slate-500">
              <FileText className="h-12 w-12" />
            </div>
            <h3 className="text-2xl font-bold text-slate-900 dark:text-white">No invoices found</h3>
            <p className="mt-2 text-slate-500 dark:text-slate-400">Generate invoices to get started.</p>
          </div>
        ) : (
          <>
          <div className="md:hidden space-y-3 p-4">
            {paginatedInvoices.map((inv) => {
              const member = members.find(m => m.id === inv.member_id);
              const plan = feePlans.find(p => p.id === inv.fee_plan_id);
              const badge = statusBadge(inv.status, inv.due_date, today);
              return (
                <div key={inv.id} className="rounded-2xl border border-slate-200 dark:border-slate-800 p-4 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-900 dark:text-white truncate">{member?.name || 'Unknown member'}</p>
                      <p className="text-sm text-slate-500 dark:text-slate-400">{plan?.name || 'Plan'} · ₹{inv.amount}</p>
                      <p className="text-sm text-slate-500 dark:text-slate-400">Due {inv.due_date}</p>
                    </div>
                    <span className={`shrink-0 inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${badge.className}`}>
                      {badge.label}
                    </span>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => handleDownloadPdf(inv)} className="w-full">
                    <Download className="h-4 w-4" />
                    PDF
                  </Button>
                </div>
              );
            })}
          </div>
          <div className="hidden md:block w-full overflow-x-auto">
            <table className="min-w-full text-left">
              <thead className="bg-slate-50/50 dark:bg-slate-800/30 text-sm text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="px-6 py-4 font-semibold">Member</th>
                  <th className="px-6 py-4 font-semibold">Plan</th>
                  <th className="px-6 py-4 font-semibold">Amount</th>
                  <th className="px-6 py-4 font-semibold">Due Date</th>
                  <th className="px-6 py-4 font-semibold">Status</th>
                  <th className="px-6 py-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50 text-sm">
                {paginatedInvoices.map((inv) => {
                  const member = members.find(m => m.id === inv.member_id);
                  const plan = feePlans.find(p => p.id === inv.fee_plan_id);
                  const badge = statusBadge(inv.status, inv.due_date, today);
                  return (
                    <tr key={inv.id} className="bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                      <td className="px-6 py-4 font-medium text-slate-900 dark:text-slate-200">{member?.name || 'Unknown'}</td>
                      <td className="px-6 py-4 text-slate-600 dark:text-slate-400">{plan?.name || 'Unknown'}</td>
                      <td className="px-6 py-4 font-semibold text-slate-900 dark:text-slate-200">₹{inv.amount}</td>
                      <td className="px-6 py-4 text-slate-600 dark:text-slate-400">{inv.due_date}</td>
                      <td className="px-6 py-4">
                        
                          <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${badge.className}`}>
                            {badge.icon && <AlertCircle className="h-3.5 w-3.5" />}
                            {badge.label}
                          </span>

                      </td>
                      <td className="px-6 py-4 text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDownloadPdf(inv)}
                          className="inline-flex items-center gap-1.5 font-medium text-sm"
                          title="Download PDF"
                        >
                          <Download className="h-4 w-4" />
                          PDF
                        </Button>
                      </td>
                    </tr>
                    )
                  })}
              </tbody>
            
              </table>
            </div>
          </>
          )}

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-3 sm:px-6 rounded-b-3xl">
              <div className="flex flex-1 justify-between sm:hidden">
                <Button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="relative inline-flex items-center rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50 cursor-pointer"
                >
                  Previous
                </Button>
                <Button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="relative ml-3 inline-flex items-center rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50 cursor-pointer"
                >
                  Next
                </Button>
              </div>
              <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm text-slate-700 dark:text-slate-300">
                    Showing <span className="font-semibold">{(currentPage - 1) * ITEMS_PER_PAGE + 1}</span> to <span className="font-semibold">{Math.min(currentPage * ITEMS_PER_PAGE, filteredInvoices.length)}</span> of <span className="font-semibold">{filteredInvoices.length}</span> results
                  </p>
                </div>
                <div>
                  <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
                    <Button
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="relative inline-flex items-center rounded-l-md px-2 py-2 text-slate-400 dark:text-slate-500 ring-1 ring-inset ring-slate-300 dark:ring-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 focus:z-20 focus:outline-offset-0 disabled:opacity-50 cursor-pointer"
                    >
                      <span className="sr-only">Previous</span>
                      <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                        <path fillRule="evenodd" d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z" clipRule="evenodd" />
                      </svg>
                    </Button>
                    
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                      <Button
                        key={page}
                        onClick={() => setCurrentPage(page)}
                        aria-current={currentPage === page ? 'page' : undefined}
                        className={`relative inline-flex items-center px-4 py-2 text-sm font-semibold focus:z-20 focus:outline-offset-0 cursor-pointer ${
                          currentPage === page
                            ? 'z-10 bg-indigo-600 text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600'
                            : 'text-slate-900 dark:text-slate-300 ring-1 ring-inset ring-slate-300 dark:ring-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'
                        }`}
                      >
                        {page}
                      </Button>
                    ))}
                    
                    <Button
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                      className="relative inline-flex items-center rounded-r-md px-2 py-2 text-slate-400 dark:text-slate-500 ring-1 ring-inset ring-slate-300 dark:ring-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 focus:z-20 focus:outline-offset-0 disabled:opacity-50 cursor-pointer"
                    >
                      <span className="sr-only">Next</span>
                      <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                        <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
                      </svg>
                    </Button>
                  </nav>
                </div>
              </div>
            </div>
          )}

      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 dark:bg-slate-950/80 p-4 backdrop-blur-sm transition-all">
          <div className="w-full max-w-lg rounded-3xl bg-white dark:bg-slate-900 p-6 sm:p-8 shadow-2xl border border-slate-100 dark:border-slate-800">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Generate Invoice</h2>
              <Button onClick={() => setIsModalOpen(false)} className="rounded-full p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-700">
                <ChevronDown className="h-5 w-5 rotate-90" />
              </Button>
            </div>

            <form onSubmit={handleGenerateInvoice} noValidate className="space-y-6">
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-300">Select Member <span className="text-red-500">*</span></label>
                <CustomDropdown
                  value={formData.member_id}
                  onChange={val => { handleMemberSelect(val); if (formErrors.member_id) setFormErrors(p => ({...p, member_id: undefined})); }}
                  options={members.map(m => ({ value: m.id, label: `${m.name} (${m.phone})` }))}
                  placeholder="Choose a member..."
                  hasError={!!formErrors.member_id}
                  loading={membersLoading}
                />
                {formErrors.member_id && <p className="mt-1 text-sm text-red-500">{formErrors.member_id}</p>}
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-300">Fee Plan <span className="text-red-500">*</span></label>
                <CustomDropdown
                  value={formData.fee_plan_id}
                  onChange={val => { setFormData({ ...formData, fee_plan_id: val }); if (formErrors.fee_plan_id) setFormErrors(p => ({...p, fee_plan_id: undefined})); }}
                  options={feePlans.map(p => ({ value: p.id, label: `${p.name} (₹${p.amount})` }))}
                  placeholder="Choose a fee plan..."
                  hasError={!!formErrors.fee_plan_id}
                  loading={plansLoading}
                />
                {formErrors.fee_plan_id && <p className="mt-1 text-sm text-red-500">{formErrors.fee_plan_id}</p>}
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-300">Due Date</label>
                <input
                  type="date"
                  required
                  value={formData.due_date}
                  onChange={e => setFormData({ ...formData, due_date: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 px-4 py-3 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 pt-4">
                <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)} className="w-full sm:w-auto rounded-xl px-6 py-2.5 text-sm font-semibold">Cancel</Button>
                <SavingButton type="submit" saving={isCreating} savingLabel="Creating..." className="w-full sm:w-auto rounded-xl px-6 py-2.5">
                  Create Invoice
                </SavingButton>
              </div>
            </form>
            </div>
          </div>
        )}
    </div>
  );
}
