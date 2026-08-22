'use client'

import { useQuery } from '@tanstack/react-query'
import { getMembers } from '@/app/actions/members'
import { getFeePlans, getFees, getInvoices, getOrganizationDetails } from '@/app/actions/fees'
import { queryKeys } from '@/lib/query-keys'

const staleTime = 5 * 60_000

export function useMembers() {
  return useQuery({
    queryKey: queryKeys.members,
    queryFn: getMembers,
    staleTime,
  })
}

export function useFeePlans() {
  return useQuery({
    queryKey: queryKeys.feePlans,
    queryFn: getFeePlans,
    staleTime,
  })
}

export function useInvoices() {
  return useQuery({
    queryKey: queryKeys.invoices,
    queryFn: getInvoices,
    staleTime,
  })
}

export function useFees() {
  return useQuery({
    queryKey: queryKeys.fees,
    queryFn: getFees,
    staleTime,
  })
}

export function useOrganizationDetails() {
  return useQuery({
    queryKey: queryKeys.orgDetails,
    queryFn: getOrganizationDetails,
    staleTime,
  })
}
