'use client'

import { useQuery } from '@tanstack/react-query'
import { getMembers } from '@/app/actions/members'
import { getFeePlans, getFees, getInvoices, getOrganizationDetails } from '@/app/actions/fees'
import { getTodayAttendance } from '@/app/actions/attendance'
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

export function useAttendance() {
  return useQuery({
    queryKey: queryKeys.attendance,
    queryFn: getTodayAttendance,
    staleTime: 10_000,
    refetchInterval: 15_000,
  })
}
