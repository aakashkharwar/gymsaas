"use client"

import { useTheme } from "next-themes"
import { Toaster as Sonner, type ToasterProps } from "sonner"
import { CircleCheckIcon, InfoIcon, TriangleAlertIcon, OctagonXIcon, Loader2Icon } from "lucide-react"

const Toaster = ({ ...props }: ToasterProps) => {
  const { resolvedTheme } = useTheme()

  return (
    <Sonner
      theme={(resolvedTheme === "dark" ? "dark" : "light") as ToasterProps["theme"]}
      className="toaster group"
      closeButton
      richColors
      icons={{
        success: <CircleCheckIcon className="size-4" />,
        info: <InfoIcon className="size-4" />,
        warning: <TriangleAlertIcon className="size-4" />,
        error: <OctagonXIcon className="size-4" />,
        loading: <Loader2Icon className="size-4 animate-spin" />,
      }}
      toastOptions={{
        classNames: {
          toast:
            "cn-toast !bg-white !text-slate-900 !border-slate-200 shadow-lg dark:!bg-slate-900 dark:!text-white dark:!border-slate-700",
          title: "!text-slate-900 dark:!text-white",
          description: "!text-slate-600 dark:!text-slate-300",
          closeButton:
            "!bg-slate-100 !text-slate-700 !border-slate-200 hover:!bg-slate-200 dark:!bg-slate-800 dark:!text-slate-200 dark:!border-slate-600 dark:hover:!bg-slate-700",
          success: "!bg-white !text-slate-900 dark:!bg-slate-900 dark:!text-white",
          error: "!bg-white !text-slate-900 dark:!bg-slate-900 dark:!text-white",
          warning: "!bg-white !text-slate-900 dark:!bg-slate-900 dark:!text-white",
          info: "!bg-white !text-slate-900 dark:!bg-slate-900 dark:!text-white",
          icon: "!text-current",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
