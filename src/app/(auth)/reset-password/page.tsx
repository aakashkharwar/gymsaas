'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { createClient } from '@/utils/supabase/client'

export default function ResetPasswordPage() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (password.length < 6) {
      toast.error('Password must be at least 6 characters.')
      return
    }
    if (password !== confirm) {
      toast.error('Passwords do not match.')
      return
    }

    setIsSaving(true)
    try {
      const supabase = createClient()
      const { error } = await supabase.auth.updateUser({ password })
      if (error) {
        toast.error(error.message)
        return
      }
      toast.success('Password updated. You can log in now.')
      router.push('/login')
    } catch {
      toast.error('Could not update password. Open the reset link from your email again.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="w-full text-slate-900 dark:text-white">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-extrabold tracking-tight">Set a new password</h1>
        <p className="mt-3 text-sm text-slate-500 dark:text-slate-400 font-medium">
          Choose a new password for your GymOS account.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="mb-1.5 block text-sm font-semibold text-slate-700 dark:text-slate-300">
            New password
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
            className="w-full rounded-lg border border-slate-200 bg-slate-50/60 px-4 py-3 text-slate-900 dark:border-slate-700 dark:bg-slate-800/50 dark:text-white"
            placeholder="••••••••"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-semibold text-slate-700 dark:text-slate-300">
            Confirm password
          </label>
          <input
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            autoComplete="new-password"
            className="w-full rounded-lg border border-slate-200 bg-slate-50/60 px-4 py-3 text-slate-900 dark:border-slate-700 dark:bg-slate-800/50 dark:text-white"
            placeholder="••••••••"
          />
        </div>
        <Button type="submit" disabled={isSaving} className="w-full h-11">
          {isSaving ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            'Update password'
          )}
        </Button>
      </form>
    </div>
  )
}
