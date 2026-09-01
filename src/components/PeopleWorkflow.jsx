import React, { useMemo } from "react";

const DEFAULT_STAGES = ["Solicitado", "Gestor", "RH/DP", "Concluído"];

export default function PeopleWorkflow({ items = [], title = "Workflow de processos", stages = DEFAULT_STAGES }) {
  const grouped = useMemo(() => stages.map((stage) => ({ stage, items: items.filter((i) => String(i.status || "").toLowerCase() === stage.toLowerCase()) })), [items, stages]);
  return <section className="card" style={{ marginTop: 20 }}>
    <h2 style={{ margin: 0 }}>{title}</h2><p style={{ opacity: .7, marginTop: 4 }}>Acompanhamento visual das etapas e responsáveis</p>
    <div style={{ display: "grid", gridTemplateColumns: `repeat(${stages.length}, minmax(150px,1fr))`, gap: 12, overflowX: "auto", marginTop: 16 }}>
      {grouped.map((column) => <div key={column.stage} style={{ minHeight: 150, border: "1px solid var(--border, #e2e8f0)", borderRadius: 10, padding: 10 }}>
        <strong style={{ fontSize: 13 }}>{column.stage}</strong>
        <div style={{ marginTop: 10, display: "grid", gap: 8 }}>{column.items.map((item) => <div key={item.id} style={{ border: "1px solid var(--border, #e2e8f0)", borderRadius: 8, padding: 9, background: "var(--surface, #fff)" }}><strong style={{ fontSize: 12 }}>{item.title || item.name || "Processo"}</strong><div style={{ fontSize: 11, opacity: .7 }}>{item.responsible || "Sem responsável"}</div></div>)}</div>
      </div>)}
    </div>
  </section>;
}
