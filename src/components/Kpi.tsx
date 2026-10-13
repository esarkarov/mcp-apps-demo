interface KpiProps {
  label: string;
  value: string;
}

export function Kpi({ label, value }: KpiProps) {
  return (
    <div className="kpi">
      <span className="muted">{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
