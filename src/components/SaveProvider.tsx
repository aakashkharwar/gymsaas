'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { flushSync } from 'react-dom'

type SaveContextValue = {
  saving: boolean
  setSaving: (value: boolean) => void
  runSave: <T>(fn: () => Promise<T>) => Promise<T>
}

const SaveContext = createContext<SaveContextValue | null>(null)

export function SaveProvider({ children }: { children: React.ReactNode }) {
  const [saving, setSaving] = useState(false)

  const runSave = useCallback(async <T,>(fn: () => Promise<T>) => {
    flushSync(() => setSaving(true))
    try {
      return await fn()
    } finally {
      flushSync(() => setSaving(false))
    }
  }, [])

  const value = useMemo(() => ({ saving, setSaving, runSave }), [saving, runSave])

  return (
    <SaveContext.Provider value={value}>
      {children}
    </SaveContext.Provider>
  )
}

export function useSave() {
  const context = useContext(SaveContext)
  if (!context) {
    return async <T,>(fn: () => Promise<T>) => fn()
  }
  return context.runSave
}

export function SaveBusy({ active }: { active: boolean }) {
  const context = useContext(SaveContext)

  useEffect(() => {
    context?.setSaving(active)
    return () => context?.setSaving(false)
  }, [active, context])

  return null
}
