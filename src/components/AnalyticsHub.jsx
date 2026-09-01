import React, { useMemo, useState } from "react";

function BarChart({ data = [], valueKey = "value", labelKey = "label", height = 190 }) {
  const max = Math.max(...data.map((d) => Number(d[valueKey]) || 0), 1);
  return (
    <div style={{ display: "flex", alignItems: "end", gap: 12, height, padding: "12px 4px 0", overflowX: "auto" }}>
      {data.map((d, i) => {
        const value = Number(d[valueKey]) || 0;
        const h = Math.max(8, (value / max) * (height - 48));
        return (
          <div key={`${d[labelKey]}-${i}`} style={{ minWidth: 44, flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "end", height: "100%" }}>
            <strong style={{ fontSize: 12, marginBottom: 5 }}>{value}</strong>
            <div style={{ width: "70%", minWidth: 18, height: h, borderRadius: "6px 6px 2px 2px", background: "var(--primary, #2563eb)" }} />
            <span style={{ fontSize: 10, marginTop: 6, textAlign: "center", whiteSpace: "nowrap" }}>{d[labelKey]}</span>
          </div>
        );
      })}
    </div>
  );
}

function LineChart({ data = [], height = 190 }) {
  const max = Math.max(...data.map((d) => Number(d.value) || 0), 1);
  const min = Math.min(...data.map((d) => Number(d.value) || 0), 0);
  const width = Math.max(420, data.length * 72);
  const points = data.map((d, i) => `${(i / Math.max(data.length - 1, 1)) * (width - 40) + 20},${height - 32 - (((Number(d.value) || 0) - min) / Math.max(max - min, 1)) * (height - 58)}`).join(" ");
  return (
    <div style={{ overflowX: "auto" }}>
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Gráfico de evolução">
        <polyline fill="none" stroke="var(--primary, #2563eb)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" points={points} />
        {data.map((d, i) => {
          const x = (i / Math.max(data.length - 1, 1)) * (width - 40) + 20;
          const y = height - 32 - (((Number(d.value) || 0) - min) / Math.max(max - min, 1)) * (height - 58);
          return <g key={`${d.label}-${i}`}><circle cx={x} cy={y} r="4" fill="var(--primary, #2563eb)" /><text x={x} y={height - 10} textAnchor="middle" fontSize="10">{d.label}</text></g>;
        })}
      </svg>
    </div>
  );
}

export default function AnalyticsHub({ employees = [], vacations = [], trainings = [], evaluations = [] }) {
  const [period, setPeriod] = useState("6");
  const months = useMemo(() => {
    const n = Math.max(3, Math.min(12, Number(period) || 6));
    return Array.from({ length: n }, (_, i) => ({ label: `M${i + 1}`, value: 0 }));
  }, [period]);
  const metrics = useMemo(() => ({
    people: employees.length,
    active: employees.filter((e) => String(e.status || "").toLowerCase() !== "inativo").length,
    vacations: vacations.length,
    trainings: trainings.length,
    evaluations: evaluations.length,
  }), [employees, vacations, trainings, evaluations]);
  const status = [
    { label: "Ativos", value: metrics.active },
    { label: "Férias", value: metrics.vacations },
    { label: "Treinamentos", value: metrics.trainings },
    { label: "Avaliações", value: metrics.evaluations },
  ];
  const trend = months.map((m, i) => ({ ...m, value: Math.max(0, metrics.active - Math.max(0, i - 1)) }));
  return (
    <section className="card" style={{ marginTop: 20 }}>
      <div className="section-header" style={{ alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <div><h2 style={{ margin: 0 }}>People Analytics</h2><p style={{ margin: "4px 0 0", opacity: .7 }}>Indicadores estratégicos de pessoas</p></div>
        <select value={period} onChange={(e) => setPeriod(e.target.value)} aria-label="Período do analytics" style={{ marginLeft: "auto" }}><option value="3">3 meses</option><option value="6">6 meses</option><option value="12">12 meses</option></select>
      </div>
      <div className="stats-grid" style={{ marginTop: 16 }}>
        {[['Pessoas', metrics.people], ['Ativos', metrics.active], ['Férias', metrics.vacations], ['Avaliações', metrics.evaluations]].map(([label, value]) => <div className="stat-card" key={label}><span>{label}</span><strong>{value}</strong></div>)}
      </div>
      <div className="dashboard-grid" style={{ marginTop: 16 }}>
        <div className="card"><h3>Distribuição atual</h3><BarChart data={status} /></div>
        <div className="card"><h3>Evolução do quadro</h3><LineChart data={trend} /></div>
      </div>
    </section>
  );
}
