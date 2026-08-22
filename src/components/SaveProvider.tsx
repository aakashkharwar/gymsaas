'use client'

import { createContext, useCallback, useContext, useMemo } from 'react'

type SaveContextValue = {
  saving: boolean
  setSaving: (value: boolean) => void
  runSave: <T>(fn: () => Promise<T>) => Promise<T>
}

const SaveContext = createContext<SaveContextValue | null>(null)

export function SaveProvider({ children }: { children: React.ReactNode }) {
  const runSave = useCallback(async <T,>(fn: () => Promise<T>) => fn(), [])
  const value = useMemo(
    () => ({ saving: false, setSaving: () => {}, runSave }),
    [runSave],
  )

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

export function SaveBusy({ active: _active }: { active: boolean }) {
  return null
}
