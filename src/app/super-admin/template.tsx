import { PageShell } from '@/components/PageShell'

export default function SuperAdminTemplate({ children }: { children: React.ReactNode }) {
  return <PageShell>{children}</PageShell>
}
