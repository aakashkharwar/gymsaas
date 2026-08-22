'use client'

import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

type SavingButtonProps = React.ComponentProps<typeof Button> & {
  saving?: boolean
  savingLabel?: string
}

export function SavingButton({
  saving = false,
  savingLabel = 'Saving...',
  children,
  disabled,
  className,
  ...props
}: SavingButtonProps) {
  return (
    <Button
      disabled={disabled || saving}
      className={`cursor-pointer disabled:opacity-70 ${className || ''}`}
      {...props}
    >
      {saving && <Loader2 className="h-4 w-4 animate-spin" />}
      {saving ? savingLabel : children}
    </Button>
  )
}
