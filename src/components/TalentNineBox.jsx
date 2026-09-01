import React, { useMemo } from "react";

export default function TalentNineBox({ employees = [] }) {
  const points = useMemo(() => employees.map((e) => ({
    id: e.id,
    name: e.full_name || e.name || "Colaborador",
    performance: Math.max(1, Math.min(3, Number(e.performance_score || e.performance || 2))),
    potential: Math.max(1, Math.min(3, Number(e.potential_score || e.potential || 2))),
  })), [employees]);
  const labels = { 1: "Baixo", 2: "Médio", 3: "Alto" };
  return <section className="card" style={{ marginTop: 20 }}>
    <div className="section-header"><div><h2 style={{ margin: 0 }}>Matriz 9 Box</h2><p style={{ margin: "4px 0 0", opacity: .7 }}>Desempenho × potencial</p></div></div>
    <div style={{ display: "grid", gridTemplateColumns: "44px repeat(3, 1fr)", gap: 6, marginTop: 18, minHeight: 330 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", writingMode: "vertical-rl", transform: "rotate(180deg)", fontWeight: 600 }}>Potencial</div>
      {[3,2,1].map((p) => <div key={`h-${p}`} style={{ textAlign: "center", fontSize: 12, fontWeight: 600 }}>{labels[p]}</div>)}
      {[3,2,1].map((performance) => <React.Fragment key={performance}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 600, writingMode: "vertical-rl", transform: "rotate(180deg)" }}>{labels[performance]}</div>
        {[3,2,1].map((potential) => <div key={`${performance}-${potential}`} style={{ minHeight: 76, border: "1px solid var(--border, #d9dee8)", borderRadius: 8, padding: 6, background: "var(--surface-muted, #f8fafc)" }}>
          {points.filter((p) => p.performance === performance && p.potential === potential).map((p) => <span key={p.id} title={p.name} style={{ display: "inline-block", padding: "3px 6px", margin: 2, borderRadius: 999, background: "var(--primary, #2563eb)", color: "#fff", fontSize: 10 }}>{p.name.split(" ")[0]}</span>)}
        </div>)}
      </React.Fragment>)}
    </div>
    <div style={{ textAlign: "center", fontWeight: 600, marginTop: 8 }}>Desempenho</div>
  </section>;
}
