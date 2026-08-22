export const MEMBERSHIP_EXPIRED_MESSAGE =
  'Membership expired. Please pay your fee at reception to mark attendance.';

export function istToday() {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
}

export function dateOnly(value: string | null | undefined) {
  return String(value || '').slice(0, 10);
}

export function invoiceDueOnOrBefore(dueDate: string | null | undefined, today: string) {
  const due = dateOnly(dueDate);
  if (!due) return false;
  return due <= today;
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
