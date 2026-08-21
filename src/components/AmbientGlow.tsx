export function AmbientGlow() {
  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden" aria-hidden="true">
      <div className="ambient-blob ambient-blob-a" />
      <div className="ambient-blob ambient-blob-b" />
      <div className="ambient-blob ambient-blob-c" />
      <div className="ambient-grain" />
    </div>
  )
}
