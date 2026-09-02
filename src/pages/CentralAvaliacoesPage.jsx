import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../lib/AuthContext";
import { openPrintDocument, formatDate, infoGrid, section, kpis, table } from "../lib/printDocument";

const TABS = [
  ["desempenho", "Desempenho"], ["360", "Avaliação 360°"], ["comportamental", "Comportamental"],
  ["experiencia", "Experiência"], ["competencias", "Competências"], ["metas", "Metas"],
  ["feedbacks", "Feedbacks"], ["pdi", "PDI"], ["historico", "Histórico"],
];
const TYPE_LABEL = { gestor: "Gestor", autoavaliacao: "Autoavaliação", pares: "Pares", subordinados: "Subordinados" };
const DISC = [["dominance", "D", "Dominância"], ["influence", "I", "Influência"], ["steadiness", "S", "Estabilidade"], ["compliance", "C", "Conformidade"]];

function polar(cx, cy, radius, angle) {
  const a = angle - Math.PI / 2;
  return [cx + radius * Math.cos(a), cy + radius * Math.sin(a)];
}
function polygonPoints(values, max = 10, size = 230, radius = 78) {
  return values.map((v, i) => polar(size / 2, size / 2, Math.max(0, Math.min(max, Number(v || 0))) / max * radius, i * Math.PI * 2 / values.length).join(" ");
}
function RadarChart({ items = [], max = 10, title = "Perfil" }) {
  const safe = items.filter(x => Number.isFinite(Number(x.value)));
  if (safe.length < 3) return <div className="chart-empty">Dados insuficientes para o gráfico.</div>;
  const size = 250, cx = size / 2, cy = size / 2, radius = 82;
  const values = safe.map(x => Number(x.value));
  return <div className="chart-card"><div className="chart-title-row"><strong>{title}</strong><span>Perfil comparativo</span></div><div className="radar-wrap"><svg viewBox={`0 0 ${size} ${size}`} role="img" aria-label={title}>
    {[25, 50, 75, 100].map(l => <polygon key={l} points={polygonPoints(safe.map(() => l), 100, size, radius)} fill="none" className="radar-grid" />)}
    {safe.map((x, i) => { const [x1, y1] = polar(cx, cy, radius + 20, i * Math.PI * 2 / safe.length); const [x2, y2] = polar(cx, cy, radius, i * Math.PI * 2 / safe.length); return <g key={x.name + i}><line x1={cx} y1={cy} x2={x2} y2={y2} className="radar-axis"/><text x={x1} y={y1} textAnchor="middle" className="radar-label">{String(x.name).slice(0, 15)}</text></g>; })}
    <polygon points={polygonPoints(values, max, size, radius)} className="radar-area" />
    {safe.map((x, i) => { const [px, py] = polar(cx, cy, Math.max(0, Math.min(max, Number(x.value))) / max * radius, i * Math.PI * 2 / safe.length); return <circle key={i} cx={px} cy={py} r="4" className="radar-dot"/>; })}
  </svg></div></div>;
}
function DonutChart({ items = [], title = "Distribuição" }) {
  const safe = items.filter(x => Number(x.value) > 0);
  const total = safe.reduce((s, x) => s + Number(x.value), 0);
  if (!total) return <div className="chart-empty">Ainda não existem dados para este gráfico.</div>;
  let offset = 0;
  const r = 48, c = 2 * Math.PI * r;
  const palette = ["#2563EB", "#2F9E68", "#D97706", "#7C3AED", "#C9483D", "#0891B2"];
  return <div className="chart-card"><div className="chart-title-row"><strong>{title}</strong><span>{total} registro(s)</span></div><div className="donut-layout"><svg viewBox="0 0 120 120" className="donut-svg"><circle cx="60" cy="60" r={r} fill="none" stroke="var(--line)" strokeWidth="16"/>{safe.map((x, i) => { const len = Number(x.value) / total * c; const dash = `${len} ${c - len}`; const el = <circle key={i} cx="60" cy="60" r={r} fill="none" stroke={palette[i % palette.length]} strokeWidth="16" strokeDasharray={dash} strokeDashoffset={-offset} transform="rotate(-90 60 60)"/>; offset += len; return el; })}<text x="60" y="57" textAnchor="middle" className="donut-total">{total}</text><text x="60" y="70" textAnchor="middle" className="donut-sub">registros</text></svg><div className="chart-legend">{safe.map((x, i) => <div key={i}><i style={{background:palette[i % palette.length]}}/><span>{x.label}</span><b>{Number(x.value)}</b></div>)}</div></div></div>;
}
function GoalRings({ goals }) {
  if (!goals.length) return <div className="chart-empty">Nenhuma meta cadastrada para o colaborador.</div>;
  return <div className="rings-grid">{goals.map((g, i) => { const cur = Number(g.current_value || 0), target = Number(g.target_value || 0); const pct = target > 0 ? Math.max(0, Math.min(100, cur / target * 100)) : 0; const r = 28, c = 2 * Math.PI * r; return <div className="ring-card" key={g.id || i}><svg viewBox="0 0 70 70"><circle cx="35" cy="35" r={r} fill="none" stroke="var(--line)" strokeWidth="7"/><circle cx="35" cy="35" r={r} fill="none" stroke="var(--green)" strokeWidth="7" strokeDasharray={`${pct / 100 * c} ${c}`} transform="rotate(-90 35 35)" strokeLinecap="round"/><text x="35" y="39" textAnchor="middle" className="ring-value">{Math.round(pct)}%</text></svg><strong>{g.description || "Meta"}</strong><span>{cur} / {target}</span></div>; })}</div>;
}
function Timeline({ items = [], empty = "Sem registros." }) {
  if (!items.length) return <div className="chart-empty">{empty}</div>;
  return <div className="timeline">{items.map((x, i) => <div className="timeline-item" key={x.id || i}><div className="timeline-dot"/><div><strong>{x.title}</strong><span>{x.date}</span>{x.detail && <p>{x.detail}</p>}</div></div>)}</div>;
}

function printSvgRadar(items, title) {
  const safe = items.filter(x => Number.isFinite(Number(x.value))).slice(0, 12); if (safe.length < 3) return "";
  const size = 420, c = 210, r = 125;
  const pts = vals => vals.map((v, i) => { const [x, y] = polar(c, c, Math.max(0, Math.min(10, Number(v))) / 10 * r, i * Math.PI * 2 / vals.length); return `${x.toFixed(1)},${y.toFixed(1)}`; }).join(" ");
  return `<div class="chart-wrap"><div class="chart-title">${title}</div><svg viewBox="0 0 ${size} ${size}" width="420" height="420">${[2.5,5,7.5,10].map(v => `<polygon points="${pts(safe.map(() => v))}" fill="none" stroke="#dfe4eb"/>`).join("")}<polygon points="${pts(safe.map(x => x.value))}" fill="#2563EB" fill-opacity=".18" stroke="#2563EB" stroke-width="3"/>${safe.map((x,i)=>{const [px,py]=polar(c,c,Math.max(0,Math.min(10,Number(x.value)))/10*r,i*Math.PI*2/safe.length);return `<circle cx="${px}" cy="${py}" r="5" fill="#2563EB"/><text x="${px}" y="${py-9}" text-anchor="middle" font-size="11" font-weight="700">${Number(x.value).toFixed(1)}</text>`}).join("")}</svg></div>`;
}

export default function CentralAvaliacoesPage() {
  const { company, profile } = useAuth();
  const role = String(profile?.access_role || "employee").toLowerCase();
  const isEmployee = role === "employee";
  const [employees, setEmployees] = useState([]), [employeeId, setEmployeeId] = useState("");
  const [evaluations, setEvaluations] = useState([]), [scores, setScores] = useState([]), [behavior, setBehavior] = useState([]);
  const [experience, setExperience] = useState([]), [goals, setGoals] = useState([]), [pdi, setPdi] = useState([]), [feedbacks, setFeedbacks] = useState([]);
  const [tab, setTab] = useState("desempenho"), [loading, setLoading] = useState(true), [error, setError] = useState(""), [printing, setPrinting] = useState(false);

  async function load() {
    if (!company?.id || !profile?.id) return;
    setLoading(true); setError("");
    try {
      let eq = supabase.from("employees").select("id,full_name,role,manager_id,profile_id").eq("company_id", company.id).eq("status", "ativo").order("full_name");
      if (isEmployee) eq = eq.eq("profile_id", profile.id);
      else if (role === "gestor") { const me = await supabase.from("employees").select("id").eq("company_id", company.id).eq("profile_id", profile.id).maybeSingle(); if (me.error) throw me.error; if (me.data) eq = eq.eq("manager_id", me.data.id); }
      const results = await Promise.all([
        eq,
        supabase.from("hr_performance_evaluations").select("id,employee_id,cycle_name,evaluation_type,status,overall_score,created_at").eq("company_id", company.id).order("created_at", {ascending:false}),
        supabase.from("hr_behavioral_assessments").select("id,employee_id,assessment_date,dominance,influence,steadiness,compliance,notes").eq("company_id", company.id).order("assessment_date", {ascending:false}),
        supabase.from("hr_experience_evaluations").select("id,employee_id,admission_date,first_result,second_result,final_decision").eq("company_id", company.id),
        supabase.from("hr_goals").select("id,employee_id,description,target_value,current_value,due_date,status").eq("company_id", company.id),
        supabase.from("hr_pdi").select("id,employee_id,action_description,target_date,status").eq("company_id", company.id),
        supabase.from("hr_feedbacks").select("id,employee_id,feedback_type,context,strengths,development_points,action_plan,comment,feedback_date,status").eq("company_id", company.id).order("feedback_date", {ascending:false}),
      ]);
      const bad = results.find(x => x.error); if (bad) throw bad.error;
      setEmployees(results[0].data || []); setEvaluations(results[1].data || []); setBehavior(results[2].data || []); setExperience(results[3].data || []); setGoals(results[4].data || []); setPdi(results[5].data || []); setFeedbacks(results[6].data || []);
      if (results[0].data?.length) setEmployeeId(prev => isEmployee || !prev ? results[0].data[0].id : prev); else setEmployeeId("");
    } catch (e) { setError(e.message || "Não foi possível carregar as avaliações."); } finally { setLoading(false); }
  }
  useEffect(() => { load(); }, [company?.id, profile?.id, role]);
  useEffect(() => { (async () => { if (!employeeId) { setScores([]); return; } const ids = evaluations.filter(x => x.employee_id === employeeId).map(x => x.id); if (!ids.length) { setScores([]); return; } const {data,error} = await supabase.from("hr_evaluation_scores").select("id,evaluation_id,competency_id,score,comments,hr_competencies:competency_id(id,name,category)").in("evaluation_id", ids); if (error) setError(error.message); else setScores(data || []); })(); }, [employeeId, evaluations]);

  const employee = employees.find(x => x.id === employeeId);
  const ev = evaluations.filter(x => x.employee_id === employeeId), bh = behavior.filter(x => x.employee_id === employeeId), ex = experience.filter(x => x.employee_id === employeeId), gm = goals.filter(x => x.employee_id === employeeId), pd = pdi.filter(x => x.employee_id === employeeId), fb = feedbacks.filter(x => x.employee_id === employeeId);
  const comps = useMemo(() => { const m = {}; scores.forEach(x => { const c = x.hr_competencies; if (!c) return; (m[c.id] ??= {id:c.id,name:c.name,category:c.category,values:[]}).values.push(Number(x.score || 0)); }); return Object.values(m).map(x => ({...x,value:x.values.reduce((a,b)=>a+b,0)/x.values.length})); }, [scores]);
  const overall = comps.length ? comps.reduce((a,b)=>a+b.value,0)/comps.length : Number(ev[0]?.overall_score || 0);
  const latestDisc = bh[0];
  const chart360 = useMemo(() => Object.keys(TYPE_LABEL).map(t => { const a = ev.filter(x => x.evaluation_type === t && x.overall_score != null); return {label:TYPE_LABEL[t],value:a.length ? a.reduce((s,x)=>s+Number(x.overall_score),0)/a.length : 0}; }).filter(x => x.value > 0), [ev]);
  const trend = useMemo(() => ev.filter(x => x.overall_score != null).slice().reverse().slice(-8), [ev]);
  const feedbackDist = useMemo(() => { const m={}; fb.forEach(x => { const k=x.feedback_type || "Outros"; m[k]=(m[k]||0)+1; }); return Object.entries(m).map(([label,value])=>({label,value})); }, [fb]);
  const discItems = latestDisc ? DISC.map(([key,short,label]) => ({name:short,value:Number(latestDisc[key] || 0)})) : [];

  async function printFullEvaluation() {
    if (!employee || printing) return; setPrinting(true); setError("");
    try {
      const scoreRows = scores.map(x => [x.hr_competencies?.name || "Competência", x.hr_competencies?.category || "—", x.score ?? "—", x.comments || "—"]);
      const evalRows = ev.map(x => [x.cycle_name || "—", TYPE_LABEL[x.evaluation_type] || x.evaluation_type || "—", x.status || "—", x.overall_score != null ? Number(x.overall_score).toFixed(1) : "—", formatDate(x.created_at)]);
      const behaviorRows = bh.map(x => [formatDate(x.assessment_date), x.dominance, x.influence, x.steadiness, x.compliance, x.notes || "—"]);
      const expRows = ex.map(x => [formatDate(x.admission_date), x.first_result || "—", x.second_result || "—", x.final_decision || "—"]);
      const goalRows = gm.map(x => [x.description || "—", x.current_value ?? "—", x.target_value ?? "—", formatDate(x.due_date), x.status || "—"]);
      const feedbackRows = fb.map(x => [x.feedback_type || "—", formatDate(x.feedback_date), x.context || "—", x.strengths || "—", x.development_points || "—", x.action_plan || x.comment || "—"]);
      const pdiRows = pd.map(x => [x.action_description || "—", formatDate(x.target_date), x.status || "—"]);
      const trendRows = trend.map(x => [x.cycle_name || formatDate(x.created_at), TYPE_LABEL[x.evaluation_type] || "—", Number(x.overall_score).toFixed(1)]);
      const content = [
        section("Identificação", infoGrid([{label:"Colaborador",value:employee.full_name},{label:"Cargo",value:employee.role || "—"},{label:"Empresa",value:company?.name || "—"},{label:"Data do relatório",value:new Date().toLocaleDateString("pt-BR")}]) + kpis([{label:"Nota geral",value:overall ? overall.toFixed(1) : "—"},{label:"Avaliações",value:ev.length},{label:"Feedbacks",value:fb.length},{label:"Metas",value:gm.length}])),
        section("Desempenho por competências", printSvgRadar(comps.map(x=>({name:x.name,value:x.value})), "Perfil de competências") + table(["Competência","Categoria","Nota","Comentários"],scoreRows)),
        section("Avaliações realizadas", table(["Ciclo","Tipo","Status","Nota","Data"],evalRows) + (trendRows.length ? table(["Ciclo","Tipo","Nota"],trendRows) : "")),
        section("Avaliação 360°", table(["Tipo","Média"],chart360.map(x=>[x.label,Number(x.value).toFixed(1)]))),
        section("Avaliação comportamental — DISC", latestDisc ? printSvgRadar(discItems,"Perfil DISC") + table(["Data","D","I","S","C","Observações"],behaviorRows) : "Sem avaliação DISC registrada."),
        section("Avaliação de experiência", table(["Data de admissão","1ª avaliação","2ª avaliação","Decisão final"],expRows)),
        section("Metas", table(["Meta","Atual","Alvo","Prazo","Status"],goalRows)),
        section("Feedbacks", table(["Tipo","Data","Contexto","Pontos fortes","Desenvolvimento","Plano/Ação"],feedbackRows)),
        section("PDI", table(["Ação de desenvolvimento","Prazo","Status"],pdiRows)),
        section("Histórico", table(["Ciclo","Tipo","Nota"],trendRows)),
      ].join("");
      openPrintDocument({title:"Relatório completo de avaliações",subtitle:employee.full_name,company:{name:company?.name},content,documentCode:"PP-AV-001"});
    } catch (e) { setError(e.message || "Não foi possível gerar a impressão."); } finally { setPrinting(false); }
  }

  if (loading) return <div className="page-state">Carregando Central de Avaliações...</div>;
  return <div className="evaluation-page">
    <header className="page-header-row"><div><h1 className="page-title">Central de Avaliações</h1><p className="page-subtitle">Uma visão completa do colaborador, com o gráfico adequado para cada método de avaliação.</p></div><button className="pp-btn pp-btn-primary" onClick={printFullEvaluation} disabled={!employee || printing}>{printing ? "Preparando impressão..." : "🖨 Imprimir relatório completo"}</button></header>
    {error && <div className="alert-error">{error}</div>}
    <div className="evaluation-toolbar"><div><label>Colaborador</label><select value={employeeId} onChange={e=>setEmployeeId(e.target.value)} disabled={isEmployee}>{employees.map(e=><option key={e.id} value={e.id}>{e.full_name} — {e.role || "Colaborador"}</option>)}</select></div><div className="employee-summary">{employee ? <><strong>{employee.full_name}</strong><span>{employee.role || "Cargo não informado"}</span></> : "Selecione um colaborador"}</div></div>
    <div className="eval-tabs">{TABS.map(([key,label])=><button key={key} className={tab===key ? "active" : ""} onClick={()=>setTab(key)} type="button">{label}</button>)}</div>

    {tab === "desempenho" && <div className="eval-section"><div className="section-heading"><div><h2>Desempenho</h2><p>Resultado geral e evolução das avaliações formais.</p></div><span className="score-badge">Nota geral: {overall ? overall.toFixed(1) : "—"}</span></div><div className="chart-grid">{comps.length >= 3 ? <RadarChart title="Perfil de competências" items={comps.map(x=>({name:x.name,value:x.value}))}/> : <div className="chart-card"><div className="chart-empty">Avalie pelo menos 3 competências para gerar o perfil.</div></div>}<div className="chart-card"><div className="chart-title-row"><strong>Evolução da nota</strong><span>por ciclo</span></div>{trend.length < 2 ? <div className="chart-empty">É necessário ter duas avaliações com nota para mostrar a evolução.</div> : <svg viewBox="0 0 720 260" className="line-chart"><line x1="42" y1="220" x2="690" y2="220" className="chart-axis"/><line x1="42" y1="25" x2="42" y2="220" className="chart-axis"/><polyline points={trend.map((x,i)=>`${42+i*(648/Math.max(1,trend.length-1))},${220-(Number(x.overall_score)/10)*180}`).join(" ")} className="line-path"/>{trend.map((x,i)=>{const px=42+i*(648/Math.max(1,trend.length-1)),py=220-(Number(x.overall_score)/10)*180;return <g key={x.id}><circle cx={px} cy={py} r="5" className="line-dot"/><text x={px} y={py-10} textAnchor="middle" className="line-value">{Number(x.overall_score).toFixed(1)}</text><text x={px} y="244" textAnchor="middle" className="line-label">{String(x.cycle_name||formatDate(x.created_at)).slice(0,12)}</text></g>})}</svg>}</div></div><div className="data-card"><h3>Notas por competência</h3>{comps.length ? <div className="data-table"><table><thead><tr><th>Competência</th><th>Categoria</th><th>Nota</th></tr></thead><tbody>{comps.map(c=><tr key={c.id}><td>{c.name}</td><td>{c.category || "—"}</td><td><strong>{c.value.toFixed(1)}</strong></td></tr>)}</tbody></table></div> : <p className="empty">Nenhuma competência avaliada.</p>}</div></div>}

    {tab === "360" && <div className="eval-section"><div className="section-heading"><div><h2>Avaliação 360°</h2><p>Comparação das percepções por fonte de avaliação.</p></div></div><div className="chart-grid">{chart360.length >= 3 ? <RadarChart title="Visão 360°" items={chart360}/> : <div className="chart-card"><div className="chart-empty">Registre pelo menos 3 tipos de avaliador para formar o comparativo 360°.</div></div>}<div className="data-card"><h3>Resultado por avaliador</h3><table><thead><tr><th>Tipo</th><th>Média</th></tr></thead><tbody>{chart360.map(x=><tr key={x.label}><td>{x.label}</td><td><strong>{Number(x.value).toFixed(1)}</strong></td></tr>)}</tbody></table></div></div></div>}

    {tab === "comportamental" && <div className="eval-section"><div className="section-heading"><div><h2>Comportamental — DISC</h2><p>O DISC deve ser lido como perfil, por isso a visualização é radial.</p></div></div>{latestDisc ? <><div className="chart-grid"><RadarChart title="Perfil DISC" max={100} items={DISC.map(([key,short,label])=>({name:short,value:Number(latestDisc[key]||0)}))}/><div className="data-card"><h3>Interpretação</h3><div className="disc-list">{DISC.map(([key,short,label])=><div key={key}><span>{short}</span><strong>{label}</strong><b>{Number(latestDisc[key]||0)}</b></div>)}</div><p className="note">{latestDisc.notes || "Sem observações registradas."}</p></div></div></> : <div className="chart-card"><div className="chart-empty">Nenhuma avaliação DISC registrada.</div></div>}</div>}

    {tab === "experiencia" && <div className="eval-section"><div className="section-heading"><div><h2>Avaliação de Experiência</h2><p>Acompanhamento das etapas de experiência do colaborador.</p></div></div><Timeline items={ex.map(x=>({id:x.id,title:x.final_decision||"Avaliação de experiência",date:formatDate(x.admission_date),detail:`1ª avaliação: ${x.first_result||"—"} • 2ª avaliação: ${x.second_result||"—"}`}))} empty="Nenhuma avaliação de experiência registrada."/></div>}

    {tab === "competencias" && <div className="eval-section"><div className="section-heading"><div><h2>Competências</h2><p>Perfil consolidado das competências avaliadas.</p></div></div>{comps.length >= 3 ? <RadarChart title="Mapa de competências" items={comps.map(x=>({name:x.name,value:x.value}))}/> : <div className="chart-card"><div className="chart-empty">Avalie pelo menos 3 competências para visualizar o mapa.</div></div>}<div className="data-card"><table><thead><tr><th>Competência</th><th>Categoria</th><th>Média</th></tr></thead><tbody>{comps.map(c=><tr key={c.id}><td>{c.name}</td><td>{c.category||"—"}</td><td>{c.value.toFixed(1)}</td></tr>)}</tbody></table></div></div>}

    {tab === "metas" && <div className="eval-section"><div className="section-heading"><div><h2>Metas</h2><p>Acompanhe o atingimento por indicadores circulares, sem barras.</p></div></div><GoalRings goals={gm}/><div className="data-card"><table><thead><tr><th>Meta</th><th>Atual</th><th>Alvo</th><th>Prazo</th><th>Status</th></tr></thead><tbody>{gm.map(g=><tr key={g.id}><td>{g.description}</td><td>{g.current_value}</td><td>{g.target_value}</td><td>{formatDate(g.due_date)}</td><td>{g.status||"—"}</td></tr>)}</tbody></table></div></div>}

    {tab === "feedbacks" && <div className="eval-section"><div className="section-heading"><div><h2>Feedbacks</h2><p>Distribuição dos feedbacks e histórico detalhado.</p></div></div><div className="chart-grid"> <DonutChart title="Feedbacks por tipo" items={feedbackDist}/><div className="data-card"><h3>Histórico</h3><Timeline items={fb.slice(0,8).map(x=>({id:x.id,title:x.feedback_type||"Feedback",date:formatDate(x.feedback_date),detail:x.context||x.comment||"Sem descrição"}))} empty="Nenhum feedback registrado."/></div></div></div>}

    {tab === "pdi" && <div className="eval-section"><div className="section-heading"><div><h2>PDI</h2><p>Plano de desenvolvimento individual e seus prazos.</p></div></div><Timeline items={pd.map(x=>({id:x.id,title:x.action_description||"Ação de desenvolvimento",date:formatDate(x.target_date),detail:`Status: ${x.status||"—"}`}))} empty="Nenhuma ação de PDI registrada."/></div>}

    {tab === "historico" && <div className="eval-section"><div className="section-heading"><div><h2>Histórico</h2><p>Todos os ciclos, notas e registros consolidados do colaborador.</p></div></div><div className="chart-card">{trend.length >= 2 ? <svg viewBox="0 0 720 260" className="line-chart"><line x1="42" y1="220" x2="690" y2="220" className="chart-axis"/><line x1="42" y1="25" x2="42" y2="220" className="chart-axis"/><polyline points={trend.map((x,i)=>`${42+i*(648/Math.max(1,trend.length-1))},${220-(Number(x.overall_score)/10)*180}`).join(" ")} className="line-path"/>{trend.map((x,i)=>{const px=42+i*(648/Math.max(1,trend.length-1)),py=220-(Number(x.overall_score)/10)*180;return <g key={x.id}><circle cx={px} cy={py} r="5" className="line-dot"/><text x={px} y={py-10} textAnchor="middle" className="line-value">{Number(x.overall_score).toFixed(1)}</text><text x={px} y="244" textAnchor="middle" className="line-label">{String(x.cycle_name||formatDate(x.created_at)).slice(0,12)}</text></g>})}</svg> : <div className="chart-empty">Ainda não há histórico suficiente para a evolução.</div>}</div><div className="data-card"><table><thead><tr><th>Ciclo</th><th>Tipo</th><th>Status</th><th>Nota</th><th>Data</th></tr></thead><tbody>{ev.map(x=><tr key={x.id}><td>{x.cycle_name}</td><td>{TYPE_LABEL[x.evaluation_type]||x.evaluation_type}</td><td>{x.status}</td><td>{x.overall_score!=null?Number(x.overall_score).toFixed(1):"—"}</td><td>{formatDate(x.created_at)}</td></tr>)}</tbody></table></div></div>}
  </div>;
}
