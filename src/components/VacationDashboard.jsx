import { useMemo } from "react";

/**
 * Painel de férias reutilizável. Recebe dados já autorizados pela camada de acesso.
 * RH/DP vê a empresa; gestores recebem apenas a própria estrutura.
 */
export default function VacationDashboard({ role="employee", rows=[] }) {
  const metrics = useMemo(() => ({
    pending: rows.filter(r => String(r.status||"").toLowerCase() === "pendente").length,
    scheduled: rows.filter(r => ["aprovado","programado","agendado"].includes(String(r.status||"").toLowerCase())).length,
    active: rows.filter(r => r.active_now).length,
    overdue: rows.filter(r => r.overdue).length,
  }), [rows]);
  const admin = ["rh","dp","hr","admin","administrator","master"].includes(String(role).toLowerCase());
  return <section className="vacation-dashboard" aria-label="Painel de férias">
    <div className="vacation-kpis">
      <Kpi label="Pendentes" value={metrics.pending}/><Kpi label="Programadas" value={metrics.scheduled}/><Kpi label="Em férias hoje" value={metrics.active}/><Kpi label="Vencidas" value={metrics.overdue}/>
    </div>
    <div className="vacation-panel">
      <div className="vacation-panel-head"><div><h2>{admin?"Central de Férias":"Férias da Minha Equipe"}</h2><p>{admin?"Acompanhamento geral de solicitações, programação e alertas.":"Acompanhe as férias da estrutura sob sua gestão."}</p></div><span className="vacation-scope">{admin?"RH / DP":"GESTÃO"}</span></div>
      <div className="vacation-table-wrap"><table><thead><tr><th>Colaborador</th><th>Período</th><th>Dias</th><th>Status</th><th>Ação</th></tr></thead><tbody>{rows.length?rows.map(r=><tr key={r.id}><td><strong>{r.employee_name||r.colaborador||"Colaborador"}</strong></td><td>{r.start_date||"—"} → {r.end_date||"—"}</td><td>{r.days||"—"}</td><td><span className="vacation-badge">{r.status||"Pendente"}</span></td><td><button type="button" onClick={()=>r.onView?.(r)}>Visualizar</button></td></tr>):<tr><td colSpan="5" className="vacation-empty">Nenhuma solicitação encontrada.</td></tr>}</tbody></table></div>
    </div>
    <style>{`.vacation-dashboard{display:grid;gap:16px}.vacation-kpis{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px}.vacation-kpi{border:1px solid var(--line);background:var(--panel);border-radius:var(--radius);padding:16px}.vacation-kpi-label{font-size:11px;color:var(--text-dim);text-transform:uppercase;font-weight:700}.vacation-kpi-value{font-size:26px;font-weight:800;margin-top:5px}.vacation-panel{border:1px solid var(--line);border-radius:var(--radius);overflow:hidden;background:var(--panel)}.vacation-panel-head{padding:18px;display:flex;justify-content:space-between;gap:12px;align-items:flex-start;border-bottom:1px solid var(--line)}.vacation-panel-head h2{margin:0;font-size:17px}.vacation-panel-head p{margin:5px 0 0;color:var(--text-dim);font-size:13px}.vacation-scope{font-size:10px;font-weight:800;letter-spacing:.08em;color:var(--text-dim);padding:6px 9px;border:1px solid var(--line);border-radius:999px}.vacation-table-wrap{overflow-x:auto}.vacation-table-wrap table{width:100%;border-collapse:collapse}.vacation-table-wrap th,.vacation-table-wrap td{padding:11px 14px;text-align:left;border-bottom:1px solid var(--line);white-space:nowrap}.vacation-table-wrap th{font-size:10px;text-transform:uppercase;color:var(--text-dim)}.vacation-table-wrap td{font-size:13px}.vacation-table-wrap button{border:1px solid var(--line);background:transparent;border-radius:var(--radius);padding:6px 10px;color:var(--text);cursor:pointer}.vacation-badge{padding:4px 8px;border-radius:999px;border:1px solid var(--line);font-size:11px;font-weight:700}.vacation-empty{text-align:center!important;color:var(--text-dim)}@media(max-width:800px){.vacation-kpis{grid-template-columns:repeat(2,1fr)}.vacation-panel-head{flex-direction:column}}@media print{.vacation-dashboard{gap:10px}.vacation-kpis{grid-template-columns:repeat(4,1fr)}.vacation-panel-head{padding:10px}.vacation-table-wrap button{display:none}}`}</style>
  </section>
}
function Kpi({label,value}){return <div className="vacation-kpi"><div className="vacation-kpi-label">{label}</div><div className="vacation-kpi-value">{value}</div></div>}
