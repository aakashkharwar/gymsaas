export const MEMBERSHIP_EXPIRED_MESSAGE =
  'Membership expired. Please pay your fee at reception to mark attendance.';

export function invoiceDueOnOrBefore(dueDate: string | null | undefined, today: string) {
  if (!dueDate) return false;
  return String(dueDate).slice(0, 10) <= today;
}

export function hasUnpaidDueInvoice(
  invoices: Array<{ due_date?: string | null; status?: string | null }>,
  today: string,
) {
  return invoices.some((invoice) => {
    if ((invoice.status || '').toLowerCase() === 'paid') return false;
    return invoiceDueOnOrBefore(invoice.due_date, today);
  });
}
