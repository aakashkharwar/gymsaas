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

/** Block check-in when dues are unpaid, or the last paid period has already ended. */
export function membershipExpired(
  invoices: Array<{ due_date?: string | null; status?: string | null }>,
  today: string,
) {
  if (hasUnpaidDueInvoice(invoices, today)) return true;
  const paid = invoices.filter((invoice) => (
    (invoice.status || '').toLowerCase() === 'paid' && dateOnly(invoice.due_date)
  ));
  if (!paid.length) return false;
  const latest = paid.reduce((best, row) => (
    dateOnly(row.due_date) > dateOnly(best.due_date) ? row : best
  ));
  return dateOnly(latest.due_date) < today;
}

export function formatDueDate(value: string | null | undefined) {
  const due = dateOnly(value);
  const [year, month, day] = due.split('-');
  if (!year || !month || !day) return due;
  return `${day}-${month}-${year}`;
}

export function addCalendarMonths(dateStr: string, months: number) {
  const due = dateOnly(dateStr);
  if (!due) return '';
  const [year, month, day] = due.split('-').map(Number);
  const next = new Date(year, month - 1 + Math.max(1, months || 1), day);
  const yyyy = next.getFullYear();
  const mm = String(next.getMonth() + 1).padStart(2, '0');
  const dd = String(next.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

/** Next membership expiry. Past/today dates are advanced from today. */
export function nextInvoiceDueDate(formDue: string | null | undefined, months: number, today = istToday()) {
  const due = dateOnly(formDue);
  if (due && due > today) return due;
  return addCalendarMonths(today, months);
}

export function invoiceDisplayStatus(
  status: string | null | undefined,
  dueDate: string | null | undefined,
  today = istToday(),
) {
  const current = (status || 'pending').toLowerCase();
  if (current === 'paid') return 'paid';
  if (dateOnly(dueDate) === today && current !== 'overdue') return 'due_today';
  if (current === 'overdue' || invoiceDueOnOrBefore(dueDate, today)) return 'overdue';
  return current;
}
