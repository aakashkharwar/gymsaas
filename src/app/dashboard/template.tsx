import { PageShell } from '@/components/PageShell'

export default function DashboardTemplate({ children }: { children: React.ReactNode }) {
  return <PageShell>{children}</PageShell>
}
