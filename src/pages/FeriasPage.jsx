import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../lib/AuthContext";
import { calcularFerias } from "../lib/calculosCLT";
import { openPrintWindow, brandHeader, currency, formatDate } from "../lib/printDocument";
import VacationDashboard from "../components/VacationDashboard";

const STATUS_LABEL = { agendada: "Agendada", em_gozo: "Em gozo", concluida: "Concluída" };
const STATUS_COLOR = { agendada: "var(--amber)", em_gozo: "#2563EB", concluida: "var(--green)" };
const ADMIN_ROLES = ["rh","dp","hr","admin","administrator","master"];
const MANAGER_ROLES = ["manager","gestor","supervisor","coordinator","coordenador","gerente","leader","lider"];

export default function FeriasPage() {
  const { company, profile } = useAuth();
  const [employees,setEmployees]=useState([]),[vacations,setVacations]=useState([]),[loading,setLoading]=useState(true),[error,setError]=useState("");
  const [employeeId,setEmployeeId]=useState(""),[periodStart,setPeriodStart]=useState(""),[daysTaken,setDaysTaken]=useState(30),[daysSold,setDaysSold]=useState(0),[saving,setSaving]=useState(false);
  const role=String(profile?.access_role||profile?.role||"employee").toLowerCase();
  const isAdmin=ADMIN_ROLES.includes(role),isManager=MANAGER_ROLES.includes(role);

  async function loadAll(){
    setLoading(true);setError("");
    try{
      let scopedEmployeeIds=null;
      if(isAdmin){
        const {data,error:e}=await supabase.from("employees").select("id,full_name").eq("status","ativo").order("full_name");
        if(e)throw e; setEmployees(data??[]);
      }else if(isManager){
        // A estrutura real do ProdPersonal usa employees.manager_id e também hr_employee_managers.
        const {data:me,error:e0}=await supabase.from("employees").select("id").eq("profile_id",profile?.id).maybeSingle();
        if(e0)throw e0;
        if(!me){setEmployees([]);setVacations([]);setLoading(false);return;}
        const [{data:direct,error:e1},{data:delegated,error:e2}]=await Promise.all([
          supabase.from("employees").select("id,full_name").eq("status","ativo").eq("manager_id",me.id).order("full_name"),
          supabase.from("hr_employee_managers").select("employee_id,can_approve").eq("manager_id",me.id).eq("can_approve",true)
        ]);
        if(e1||e2)throw(e1||e2);
        const map=new Map((direct??[]).map(e=>[e.id,e]));
        const delegatedIds=(delegated??[]).map(x=>x.employee_id);
        if(delegatedIds.length){const {data:extra,error:e3}=await supabase.from("employees").select("id,full_name").eq("status","ativo").in("id",delegatedIds);if(e3)throw e3;(extra??[]).forEach(e=>map.set(e.id,e));}
        const list=[...map.values()];setEmployees(list);scopedEmployeeIds=list.map(e=>e.id);
      }else{
        let q=supabase.from("employees").select("id,full_name").eq("status","ativo");
        if(profile?.employee_id)q=q.eq("id",profile.employee_id);else if(profile?.id)q=q.eq("profile_id",profile.id);
        const {data,error:e}=await q.limit(1);if(e)throw e;setEmployees(data??[]);scopedEmployeeIds=(data??[]).map(e=>e.id);
      }
      let vq=supabase.from("hr_vacations").select("id,employee_id,period_start,period_end,days_taken,days_sold,vacation_pay,constitutional_bonus,status,employees:employee_id(full_name)").order("period_start",{ascending:false}).limit(200);
      if(scopedEmployeeIds)vq=vq.in("employee_id",scopedEmployeeIds);
      const {data:vac,error:e2}=await vq;if(e2)throw e2;setVacations(vac??[]);
    }catch(err){setError("Não foi possível carregar: "+(err.message??"erro desconhecido"));}
    finally{setLoading(false)}
  }
  useEffect(()=>{if(company?.id)loadAll()},[company?.id,profile?.id,role]);

  const today=new Date();today.setHours(0,0,0,0);const soon=new Date(today);soon.setDate(soon.getDate()+30);
  const dashboardRows=useMemo(()=>vacations.map(v=>{const start=new Date(`${v.period_start}T00:00:00`),end=new Date(`${v.period_end}T23:59:59`);return {...v,employee_name:v.employees?.full_name,active_now:v.status==="em_gozo"||((v.status==="agendada")&&start<=today&&end>=today),overdue:v.status!=="concluida"&&end<today,expiring_soon:v.status!=="concluida"&&start>=today&&start<=soon}}),[vacations]);
  const scopedRows=dashboardRows;
  const metrics=useMemo(()=>({pending:scopedRows.filter(v=>String(v.status).toLowerCase()==="pendente").length,scheduled:scopedRows.filter(v=>["agendada","programado","agendado"].includes(String(v.status).toLowerCase())).length,active:scopedRows.filter(v=>v.active_now).length,overdue:scopedRows.filter(v=>v.overdue).length}),[scopedRows]);

  async function createVacation(e){e.preventDefault();setError("");if(!employeeId||!periodStart){setError("Escolha o colaborador e a data de início.");return}setSaving(true);const {data:comp}=await supabase.from("hr_employee_compensation").select("base_salary").eq("employee_id",employeeId).order("effective_date",{ascending:false}).limit(1).maybeSingle();const calc=calcularFerias(Number(comp?.base_salary??0),Number(daysTaken),Number(daysSold));const start=new Date(`${periodStart}T00:00:00`),end=new Date(start);end.setDate(end.getDate()+Number(daysTaken)-1);const {error:e}=await supabase.from("hr_vacations").insert({company_id:company.id,employee_id:employeeId,period_start:periodStart,period_end:end.toISOString().slice(0,10),acquisition_start:periodStart,acquisition_end:periodStart,days_taken:Number(daysTaken),days_sold:Number(daysSold),vacation_pay:calc.valorFerias+calc.valorAbonoPecuniario,constitutional_bonus:calc.tercoConstitucional});if(e)setError(e.message);else{setEmployeeId("");setPeriodStart("");setDaysTaken(30);setDaysSold(0);await loadAll()}setSaving(false)}
  async function updateStatus(id,status){const {error:e}=await supabase.from("hr_vacations").update({status}).eq("id",id);if(e)setError(e.message);else loadAll()}
  function printReceipt(v){const total=Number(v.vacation_pay)+Number(v.constitutional_bonus);const html=`${brandHeader(company,"Recibo de Férias",[["Colaborador",v.employees?.full_name??""],["Período",`${formatDate(v.period_start)} a ${formatDate(v.period_end)}`],["Dias de gozo",v.days_taken]])}<table style="width:100%;border-collapse:collapse;margin-top:20px"><tr><td>Valor das férias</td><td style="text-align:right">${currency(v.vacation_pay)}</td></tr><tr><td>1/3 constitucional</td><td style="text-align:right">${currency(v.constitutional_bonus)}</td></tr><tr><td><strong>Total</strong></td><td style="text-align:right"><strong>${currency(total)}</strong></td></tr></table><div style="margin-top:60px;border-top:1px solid #000;width:300px;padding-top:6px;font-size:12px">Assinatura do colaborador</div>`;openPrintWindow(`Recibo de Férias - ${v.employees?.full_name}`,html)}

  return <div className="ferias-page"><style>{`.ferias-page{display:grid;gap:18px}.vacation-dashboard-wrap{margin-top:2px}.vacation-form{background:var(--panel);border:1px solid var(--line);border-radius:var(--radius);padding:18px;display:grid;gap:12px}.vacation-form-grid{display:grid;grid-template-columns:2fr 1fr 1fr 1fr auto;gap:10px}.vacation-input{width:100%;box-sizing:border-box;background:var(--panel-2);border:1px solid var(--line);border-radius:var(--radius);padding:9px 10px;color:var(--text);font-size:13px}.vacation-save{background:var(--amber);color:#fff;border:0;border-radius:var(--radius);padding:9px 14px;font-weight:700;cursor:pointer}.vacation-alerts{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.vacation-alert{border:1px solid var(--line);background:var(--panel);border-radius:var(--radius);padding:14px}.vacation-alert strong{display:block;margin-bottom:4px}.vacation-list{display:grid;gap:10px}.vacation-card{background:var(--panel);border:1px solid var(--line);border-radius:var(--radius);padding:14px;display:grid;gap:8px}.vacation-card-head{display:flex;justify-content:space-between;align-items:center;gap:10px}.vacation-status{background:var(--panel-2);border:1px solid var(--line);border-radius:var(--radius);padding:5px 8px;font-size:12px;font-weight:700}.vacation-print{background:transparent;color:var(--text);border:1px solid var(--line);border-radius:var(--radius);padding:6px 10px;cursor:pointer}@media(max-width:900px){.vacation-form-grid{grid-template-columns:1fr 1fr}.vacation-save{grid-column:1/-1}.vacation-alerts{grid-template-columns:1fr}}@media(max-width:600px){.vacation-form-grid{grid-template-columns:1fr}.vacation-card-head{align-items:flex-start;flex-direction:column}}@media print{.ferias-page>.vacation-form,.ferias-page>.vacation-list,.no-print{display:none!important}.ferias-page{display:block}}`}</style>
    <header className="no-print"><h1 style={styles.title}>Controle de Férias</h1><p style={styles.subtitle}>{isAdmin?"Central de férias do RH/DP: programação, acompanhamento e controle.":isManager?"Painel da equipe: programação, aprovações e alertas.":"Acompanhe seus períodos de férias."}</p></header>
    {error&&<div style={styles.error}>{error}</div>}
    <div className="vacation-dashboard-wrap"><VacationDashboard role={isAdmin?role:isManager?"manager":"employee"} rows={scopedRows}/></div>
    {(metrics.overdue>0||scopedRows.some(v=>v.expiring_soon))&&<div className="vacation-alerts no-print">{metrics.overdue>0&&<div className="vacation-alert"><strong>⚠️ Férias vencidas</strong><span style={styles.dim}>{metrics.overdue} período(s) com data final ultrapassada.</span></div>}{scopedRows.some(v=>v.expiring_soon)&&<div className="vacation-alert"><strong>🔔 Próximas férias</strong><span style={styles.dim}>{scopedRows.filter(v=>v.expiring_soon).length} período(s) começam nos próximos 30 dias.</span></div>}</div>}
    {(isAdmin||isManager)&&<form onSubmit={createVacation} className="vacation-form no-print"><strong>Agendar férias</strong><div className="vacation-form-grid"><select className="vacation-input" value={employeeId} onChange={e=>setEmployeeId(e.target.value)} required><option value="">Colaborador...</option>{employees.map(e=><option key={e.id} value={e.id}>{e.full_name}</option>)}</select><input className="vacation-input" type="date" value={periodStart} onChange={e=>setPeriodStart(e.target.value)} required/><input className="vacation-input" type="number" value={daysTaken} onChange={e=>setDaysTaken(e.target.value)} min="1" max="30"/><input className="vacation-input" type="number" value={daysSold} onChange={e=>setDaysSold(e.target.value)} min="0" max="10"/><button className="vacation-save" disabled={saving}>{saving?"Calculando...":"Agendar e calcular"}</button></div></form>}
    {!loading&&scopedRows.length>0&&<div className="vacation-list no-print">{scopedRows.map(v=><div className="vacation-card" key={v.id}><div className="vacation-card-head"><div><strong>{v.employee_name}</strong><div style={styles.dim}>{formatDate(v.period_start)} a {formatDate(v.period_end)} · {v.days_taken} dias</div></div>{(isAdmin||isManager)?<select className="vacation-status" style={{color:STATUS_COLOR[v.status]}} value={v.status} onChange={e=>updateStatus(v.id,e.target.value)}>{Object.entries(STATUS_LABEL).map(([s,l])=><option key={s} value={s}>{l}</option>)}</select>:<span className="vacation-status">{STATUS_LABEL[v.status]||v.status}</span>}</div><div style={styles.dim}>Total: {currency(Number(v.vacation_pay)+Number(v.constitutional_bonus))}</div><button className="vacation-print" onClick={()=>printReceipt(v)} type="button">🖨 Recibo</button></div>)}</div>}
    {!loading&&!scopedRows.length&&<p className="no-print" style={styles.dim}>Nenhum período de férias encontrado para seu nível de acesso.</p>}
  </div>
}
const styles={title:{fontFamily:"var(--font-display)",fontSize:22,margin:0},subtitle:{color:"var(--text-dim)",fontSize:13,margin:"6px 0 0"},dim:{color:"var(--text-dim)",fontSize:12.5},error:{background:"rgba(217,105,95,.12)",border:"1px solid var(--red)",color:"var(--red)",borderRadius:"var(--radius)",padding:"10px 12px",fontSize:13}};
