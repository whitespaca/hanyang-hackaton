export function StatCard({ label, value, helper }: { label: string; value: string; helper?: string }) {
  return <article className="card" style={{ padding: 22 }}><span className="muted" style={{ fontWeight: 700 }}>{label}</span><strong style={{ display: "block", fontSize: 32, marginTop: 8 }}>{value}</strong>{helper && <small className="muted">{helper}</small>}</article>;
}
