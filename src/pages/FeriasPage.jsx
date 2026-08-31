import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../lib/AuthContext";
import { calcularFerias } from "../lib/calculosCLT";
import { openPrintWindow, brandHeader, currency, formatDate } from "../lib/printDocument";
import VacationDashboard from "../components/VacationDashboard";

const STATUS_LABEL = { agendada: "Agendada", em_gozo: "Em gozo", concluida: "Concluída" };
const STATUS_COLOR = { agendada: "var(--amber)", em_gozo: "#2563EB", concluida: "var(--green)" };
const ADMIN_ROLES = ["rh","dp","hr","admin","administrator","master"];

export default function FeriasPage() {
  const { company, profile } = useAuth();
  const [employees, setEmployees] = useState([]); const [vacations, setVacations] = useState([]); const [loading, setLoading] = useState(true); const [error, setError] = useState("");
  const [employeeId, setEmployeeId] = useState(""); const [periodStart, setPeriodStart] = useState(""); const [daysTaken, setDaysTaken] = useState(30); const [daysSold, setDaysSold] = useState(0); const [saving, setSaving] = useState(false);
  const role = String(profile?.access_role || profile?.role || "employee").toLowerCase();
  const isAdmin = ADMIN_ROLES.includes(role);
  const isManager = ["manager","gestor","supervisor","coordinator","coordenador","gerente","leader","lider"].includes(role);

  async function loadAll() {
    setLoading(true); setError("");
    try {
      const [{ data: emp, error: e1 }, { data: vac, error: e2 }] = await Promise.all([
        supabase.from("employees").select("id, full_name").eq("status", "ativo").order("full_name"),
        supabase.from("hr_vacations").select("id, employee_id, period_start, period_end, days_taken, days_sold, vacation_pay, constitutional_bonus, status, employees:employee_id (full_name)").order("period_start", { ascending: false }).limit(200),
      ]);
      if (e1 || e2) throw (e1 || e2);
      setEmployees(emp ?? []); setVacations(vac ?? []);
    } catch (err) { setError("Não foi possível carregar: " + (err.message ?? "erro desconhecido")); } finally { setLoading(false); }
  }
  useEffect(() => { if (company?.id) loadAll(); }, [company?.id]);

  const dashboardRows = useMemo(() => vacations.map(v => ({ ...v, employee_name: v.employees?.full_name, active_now: v.status === "em_gozo", overdue: false })), [vacations]);
  const scopedRows = useMemo(() => isAdmin ? dashboardRows : (isManager ? dashboardRows : dashboardRows.filter(v => v.employee_id === profile?.employee_id)), [dashboardRows, isAdmin, isManager, profile?.employee_id]);

  async function createVacation(e) {
    e.preventDefault(); setError(""); if (!employeeId || !periodStart) { setError("Escolha o colaborador e a data de início."); return; } setSaving(true);
    const { data: comp } = await supabase.from("hr_employee_compensation").select("base_salary").eq("employee_id", employeeId).order("effective_date", { ascending: false }).limit(1).maybeSingle();
    const calc = calcularFerias(Number(comp?.base_salary ?? 0), Number(daysTaken), Number(daysSold)); const start = new Date(periodStart); const end = new Date(start); end.setDate(end.getDate() + Number(daysTaken) - 1);
    const { error: insertError } = await supabase.from("hr_vacations").insert({ company_id: company.id, employee_id: employeeId, period_start: periodStart, period_end: end.toISOString().slice(0, 10), acquisition_start: periodStart, acquisition_end: periodStart, days_taken: Number(daysTaken), days_sold: Number(daysSold), vacation_pay: calc.valorFerias + calc.valorAbonoPecuniario, constitutional_bonus: calc.tercoConstitucional });
    if (insertError) { setError(insertError.message); setSaving(false); return; } setEmployeeId(""); setPeriodStart(""); setDaysTaken(30); setDaysSold(0); setSaving(false); await loadAll();
  }
  async function updateStatus(id, status) { const { error } = await supabase.from("hr_vacations").update({ status }).eq("id", id); if (error) setError(error.message); else await loadAll(); }
  function printReceipt(v) { const total = Number(v.vacation_pay) + Number(v.constitutional_bonus); const html = `${brandHeader(company,"Recibo de Férias",[["Colaborador",v.employees?.full_name??""],["Período",`${formatDate(v.period_start)} a ${formatDate(v.period_end)}`],["Dias de gozo",v.days_taken]])}<table style="width:100%;border-collapse:collapse;margin-top:20px"><tr><td>Valor das férias</td><td style="text-align:right">${currency(v.vacation_pay)}</td></tr><tr><td>1/3 constitucional</td><td style="text-align:right">${currency(v.constitutional_bonus)}</td></tr><tr><td><strong>Total</strong></td><td style="text-align:right"><strong>${currency(total)}</strong></td></tr></table><div style="margin-top:60px;border-top:1px solid #000;width:300px;padding-top:6px;font-size:12px">Assinatura do colaborador</div>`; openPrintWindow(`Recibo de Férias - ${v.employees?.full_name}`, html); }

  return <div className="ferias-page">
    <style>{`.ferias-page{display:grid;gap:18px}.vacation-actions{display:flex;gap:8px;align-items:center}.vacation-dashboard-wrap{margin-top:2px}.vacation-form{background:var(--panel);border:1px solid var(--line);border-radius:var(--radius);padding:18px;display:grid;gap:12px}.vacation-form-grid{display:grid;grid-template-columns:2fr 1fr 1fr 1fr auto;gap:10px}.vacation-input{width:100%;box-sizing:border-box;background:var(--panel-2);border:1px solid var(--line);border-radius:var(--radius);padding:9px 10px;color:var(--text);font-size:13px}.vacation-save{background:var(--amber);color:#fff;border:0;border-radius:var(--radius);padding:9px 14px;font-weight:700;cursor:pointer}.vacation-list{display:grid;gap:10px}.vacation-card{background:var(--panel);border:1px solid var(--line);border-radius:var(--radius);padding:14px;display:grid;gap:8px}.vacation-card-head{display:flex;justify-content:space-between;align-items:center;gap:10px}.vacation-status{background:var(--panel-2);border:1px solid var(--line);border-radius:var(--radius);padding:5px 8px;font-size:12px;font-weight:700}.vacation-print{background:transparent;color:var(--text);border:1px solid var(--line);border-radius:var(--radius);padding:6px 10px;cursor:pointer}@media(max-width:900px){.vacation-form-grid{grid-template-columns:1fr 1fr}.vacation-save{grid-column:1/-1}}@media(max-width:600px){.vacation-form-grid{grid-template-columns:1fr}.vacation-card-head{align-items:flex-start;flex-direction:column}.vacation-dashboard{overflow:hidden}}@media print{.ferias-page>.vacation-form,.ferias-page>.vacation-list{display:none!important}.ferias-page{display:block}.no-print{display:none!important}}`}</style>
    <header className="no-print"><h1 style={styles.title}>Controle de Férias</h1><p style={styles.subtitle}>{isAdmin ? "Central de férias do RH/DP: programação, acompanhamento e controle." : isManager ? "Painel da equipe: acompanhe programação e períodos de férias." : "Acompanhe seus períodos de férias."}</p></header>
    {error && <div style={styles.error}>{error}</div>}
    <div className="vacation-dashboard-wrap"><VacationDashboard role={isAdmin ? role : isManager ? "manager" : "employee"} rows={scopedRows}/></div>
    {(isAdmin || isManager) && <form onSubmit={createVacation} className="vacation-form no-print"><strong>Agendar férias</strong><div className="vacation-form-grid"><select className="vacation-input" value={employeeId} onChange={e=>setEmployeeId(e.target.value)} required><option value="">Colaborador...</option>{employees.map(e=><option key={e.id} value={e.id}>{e.full_name}</option>)}</select><input className="vacation-input" type="date" value={periodStart} onChange={e=>setPeriodStart(e.target.value)} required/><input className="vacation-input" type="number" value={daysTaken} onChange={e=>setDaysTaken(e.target.value)} min="1" max="30"/><input className="vacation-input" type="number" value={daysSold} onChange={e=>setDaysSold(e.target.value)} min="0" max="10"/><button className="vacation-save" disabled={saving}>{saving?"Calculando...":"Agendar e calcular"}</button></div></form>}
    {!loading && scopedRows.length>0 && <div className="vacation-list no-print">{scopedRows.map(v=><div className="vacation-card" key={v.id}><div className="vacation-card-head"><div><strong>{v.employee_name}</strong><div style={styles.dim}>{formatDate(v.period_start)} a {formatDate(v.period_end)} · {v.days_taken} dias</div></div>{(isAdmin||isManager)?<select className="vacation-status" style={{color:STATUS_COLOR[v.status]}} value={v.status} onChange={e=>updateStatus(v.id,e.target.value)}>{Object.entries(STATUS_LABEL).map(([s,l])=><option key={s} value={s}>{l}</option>)}</select>:<span className="vacation-status">{STATUS_LABEL[v.status]||v.status}</span>}</div><div style={styles.dim}>Total: {currency(Number(v.vacation_pay)+Number(v.constitutional_bonus))}</div><button className="vacation-print" onClick={()=>printReceipt(v)} type="button">🖨 Recibo</button></div>)}</div>}
    {!loading && !scopedRows.length && <p className="no-print" style={styles.dim}>Nenhum período de férias encontrado.</p>}
  </div>;
}
const styles={title:{fontFamily:"var(--font-display)",fontSize:22,margin:0},subtitle:{color:"var(--text-dim)",fontSize:13,margin:"6px 0 0"},dim:{color:"var(--text-dim)",fontSize:12.5},error:{background:"rgba(217,105,95,.12)",border:"1px solid var(--red)",color:"var(--red)",borderRadius:"var(--radius)",padding:"10px 12px",fontSize:13}};
