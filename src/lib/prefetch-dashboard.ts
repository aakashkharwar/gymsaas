import { QueryClient } from '@tanstack/react-query'
import { getDashboardStats } from '@/app/actions/dashboard'
import { getMembers } from '@/app/actions/members'
import { getExpenses } from '@/app/actions/expenses'
import { getFeeDashboardStats, getFeePlans, getFees, getInvoices } from '@/app/actions/fees'
import { queryKeys } from '@/lib/query-keys'

export function prefetchDashboardRoute(queryClient: QueryClient, href: string) {
  if (href === '/dashboard') {
    queryClient.prefetchQuery({ queryKey: queryKeys.dashboard, queryFn: getDashboardStats })
  }
  if (href === '/dashboard/members' || href === '/dashboard/admission') {
    queryClient.prefetchQuery({ queryKey: queryKeys.members, queryFn: getMembers })
    queryClient.prefetchQuery({ queryKey: queryKeys.feePlans, queryFn: getFeePlans })
  }
  if (href === '/dashboard/fees' || href.startsWith('/dashboard/fees/')) {
    queryClient.prefetchQuery({ queryKey: queryKeys.feeStats, queryFn: getFeeDashboardStats })
    queryClient.prefetchQuery({ queryKey: queryKeys.fees, queryFn: getFees })
    queryClient.prefetchQuery({ queryKey: queryKeys.feePlans, queryFn: getFeePlans })
    queryClient.prefetchQuery({ queryKey: queryKeys.invoices, queryFn: getInvoices })
    queryClient.prefetchQuery({ queryKey: queryKeys.members, queryFn: getMembers })
  }
  if (href === '/dashboard/expenses') {
    queryClient.prefetchQuery({ queryKey: queryKeys.expenses, queryFn: getExpenses })
    queryClient.prefetchQuery({ queryKey: queryKeys.dashboard, queryFn: getDashboardStats })
  }
}
