import React from "react";

const onboarding = ["Dados cadastrais", "Documentos", "Integração", "Treinamento", "Acompanhamento"];
const offboarding = ["Solicitação", "Devoluções", "Entrevista", "Documentos", "Encerramento de acessos"];

export default function OnboardingLifecycle({ employee, mode = "onboarding", completed = [] }) {
  const steps = mode === "offboarding" ? offboarding : onboarding;
  const done = new Set(completed);
  const percent = Math.round((steps.filter((s) => done.has(s)).length / steps.length) * 100);
  return <section className="card" style={{ marginTop: 20 }}>
    <div className="section-header"><div><h2 style={{ margin: 0 }}>{mode === "offboarding" ? "Offboarding" : "Onboarding"}</h2><p style={{ margin: "4px 0 0", opacity: .7 }}>{employee?.full_name || employee?.name || "Ciclo do colaborador"}</p></div><strong>{percent}%</strong></div>
    <div style={{ margin: "14px 0", height: 8, borderRadius: 999, background: "var(--surface-muted, #e5e7eb)", overflow: "hidden" }}><div style={{ width: `${percent}%`, height: "100%", background: "var(--primary, #2563eb)" }} /></div>
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 10 }}>
      {steps.map((step, i) => <div key={step} style={{ border: "1px solid var(--border, #e2e8f0)", borderRadius: 10, padding: 12 }}><div style={{ fontSize: 11, opacity: .6 }}>Etapa {i + 1}</div><strong style={{ fontSize: 13 }}>{step}</strong><div style={{ marginTop: 7, fontSize: 11 }}>{done.has(step) ? "✓ Concluída" : "○ Pendente"}</div></div>)}
    </div>
  </section>;
}
