export default function DashboardLoading() {
  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="h-9 w-48 rounded-lg bg-slate-200 dark:bg-slate-800 animate-shimmer" />
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="h-32 rounded-2xl bg-slate-200 dark:bg-slate-800 animate-shimmer" />
        <div className="h-32 rounded-2xl bg-slate-200 dark:bg-slate-800 animate-shimmer" />
        <div className="h-32 rounded-2xl bg-slate-200 dark:bg-slate-800 animate-shimmer" />
      </div>
      <div className="h-72 rounded-2xl bg-slate-200 dark:bg-slate-800 animate-shimmer" />
    </div>
  )
}
