import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../lib/AuthContext";

const MOODS = [
  { value: 5, emoji: "😄", label: "Ótimo", tone: "#18B77A" },
  { value: 4, emoji: "🙂", label: "Bem", tone: "#52C85A" },
  { value: 3, emoji: "😐", label: "Neutro", tone: "#F3B63F" },
  { value: 2, emoji: "🙁", label: "Mal", tone: "#F0833C" },
  { value: 1, emoji: "😣", label: "Péssimo", tone: "#D95A62" },
];

export default function ClimaPage() {
  const { company, profile } = useAuth();
  const role = profile?.access_role || "employee";
  const [employees, setEmployees] = useState([]);
  const [checkins, setCheckins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadDashboard() {
    if (!company?.id) return;
    setLoading(true); setError("");
    try {
      let empQuery = supabase.from("employees").select("id, full_name, profile_id, manager_id").eq("company_id", company.id).eq("status", "ativo").order("full_name");
      if (role === "gestor") empQuery = empQuery.eq("manager_id", profile.id);
      const { data: emp, error: empError } = await empQuery;
      if (empError) throw empError;
      const ids = (emp || []).map(e => e.id);
      if (!ids.length) { setEmployees([]); setCheckins([]); setLoading(false); return; }
      const { data: ci, error: ciError } = await supabase.from("hr_climate_checkins").select("id, employee_id, mood, checkin_date").in("employee_id", ids).order("checkin_date", { ascending: false });
      if (ciError) throw ciError;
      setEmployees(emp || []); setCheckins(ci || []);
    } catch (err) {
      setError("Não foi possível carregar o painel de clima: " + (err.message || "erro desconhecido"));
    } finally { setLoading(false); }
  }

  useEffect(() => { loadDashboard(); }, [company?.id, profile?.id, role]);

  const latestByEmployee = useMemo(() => {
    const map = new Map();
    [...checkins].sort((a,b) => String(b.checkin_date).localeCompare(String(a.checkin_date))).forEach(c => { if (!map.has(c.employee_id)) map.set(c.employee_id, c); });
    return map;
  }, [checkins]);
  const total = employees.length;
  const responded = latestByEmployee.size;
  const pending = Math.max(total - responded, 0);
  const participation = total ? Math.round((responded / total) * 100) : 0;
  const moodCounts = MOODS.map(m => ({ ...m, count: [...latestByEmployee.values()].filter(c => c.mood === m.value).length }));
  const positive = moodCounts.filter(m => m.value >= 4).reduce((a,m) => a+m.count, 0);
  const average = responded ? ([...latestByEmployee.values()].reduce((a,c) => a + Number(c.mood || 0), 0) / responded).toFixed(1) : "—";
  const recentDays = useMemo(() => {
    const days = [];
    for (let i = 6; i >= 0; i--) { const d = new Date(); d.setDate(d.getDate() - i); const key = d.toISOString().slice(0,10); const values = checkins.filter(c => c.checkin_date === key); days.push({ label: d.toLocaleDateString("pt-BR", { weekday:"short" }).replace(".",""), value: values.length ? values.reduce((a,c)=>a+Number(c.mood||0),0)/values.length : 0 }); }
    return days;
  }, [checkins]);

  return <div>
    <header style={styles.header}><div><div style={styles.eyebrow}>GESTÃO DE PESSOAS</div><h1 style={styles.title}>Clima Organizacional</h1><p style={styles.subtitle}>Visão consolidada do bem-estar e da percepção dos colaboradores. O check-in é opcional.</p></div><div style={styles.period}>Últimos 7 dias</div></header>
    {error && <div style={styles.error}>{error}</div>}
    {loading ? <div style={styles.loading}>Carregando indicadores...</div> : <>
      <section style={styles.kpis}><Kpi icon="👥" label="Total de colaboradores" value={total} helper="ativos no escopo" /><Kpi icon="✓" label="Responderam" value={`${responded} de ${total}`} helper={`${participation}% de participação`} accent="green" /><Kpi icon="◷" label="Não responderam" value={`${pending} de ${total}`} helper="preenchimento não obrigatório" accent="amber" /><Kpi icon="♥" label="Índice positivo" value={responded ? `${Math.round((positive/responded)*100)}%` : "—"} helper={`média de humor ${average}`} accent="blue" /></section>
      <section style={styles.grid}>
        <Card title="Como todos estão se sentindo?" subtitle="Último registro disponível por colaborador"><div style={styles.moodLayout}><div style={styles.donut}><div style={styles.donutInner}><strong>{participation}%</strong><span>participaram</span></div></div><div style={styles.moodList}>{moodCounts.map(m => <div key={m.value} style={styles.moodRow}><span style={styles.moodName}>{m.emoji} {m.label}</span><div style={styles.barTrack}><div style={{...styles.barFill,width:responded?`${(m.count/responded)*100}%`:"0%",background:m.tone}} /></div><b>{m.count}</b></div>)}</div></div></Card>
        <Card title="Evolução do clima" subtitle="Média de humor nos últimos 7 dias"><div style={styles.chart}>{recentDays.map((d,i)=><div key={i} style={styles.chartCol}><div style={styles.chartValue}>{d.value ? d.value.toFixed(1) : "—"}</div><div style={styles.chartTrack}><div style={{...styles.chartBar,height:d.value?`${Math.max(8,(d.value/5)*100)}%`:"4%"}} /></div><span>{d.label}</span></div>)}</div></Card>
        <Card title="Leitura executiva" subtitle="Indicadores para acompanhamento do RH e gestão"><div style={styles.insight}><span>Participação</span><b>{participation}%</b><small>{pending ? `${pending} ainda não responderam` : "Todos já responderam"}</small></div><div style={styles.insight}><span>Sentimento predominante</span><b>{moodCounts.slice().sort((a,b)=>b.count-a.count)[0]?.label || "Sem dados"}</b><small>com base nos registros disponíveis</small></div><div style={{...styles.insight,borderBottom:"none"}}><span>Humor médio</span><b>{average}/5</b><small>quanto maior, melhor a percepção</small></div></Card>
      </section>
      <section style={styles.notice}><span style={styles.noticeIcon}>🔒</span><div><strong>Visão agregada e respeitosa</strong><p>O painel apresenta resultados consolidados. O preenchimento não é obrigatório e a ausência de resposta não é utilizada como indicador negativo.</p></div></section>
    </>}
  </div>;
}
function Kpi({icon,label,value,helper,accent}){return <div style={styles.kpi}><div style={{...styles.kpiIcon,...(accent?styles[`kpi${accent}`]:{})}}>{icon}</div><div><span style={styles.kpiLabel}>{label}</span><strong style={styles.kpiValue}>{value}</strong><small style={styles.kpiHelper}>{helper}</small></div></div>}
function Card({title,subtitle,children}){return <section style={styles.card}><div style={styles.cardHead}><h2 style={styles.cardTitle}>{title}</h2><p style={styles.cardSubtitle}>{subtitle}</p></div>{children}</section>}
const styles={header:{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:20,marginBottom:20},eyebrow:{fontSize:10,fontWeight:800,letterSpacing:".1em",color:"var(--text-dim)",marginBottom:5},title:{fontFamily:"var(--font-display)",fontSize:26,margin:0},subtitle:{color:"var(--text-dim)",fontSize:13,margin:"6px 0 0",maxWidth:700},period:{border:"1px solid var(--line)",background:"var(--panel)",borderRadius:999,padding:"8px 12px",fontSize:11.5,fontWeight:700,color:"var(--text-dim)"},kpis:{display:"grid",gridTemplateColumns:"repeat(4,minmax(0,1fr))",gap:12,marginBottom:14},kpi:{display:"flex",gap:12,alignItems:"center",background:"var(--panel)",border:"1px solid var(--line)",borderRadius:16,padding:16,boxShadow:"0 6px 20px rgba(8,43,89,.05)"},kpiIcon:{width:38,height:38,borderRadius:12,display:"grid",placeItems:"center",background:"#EAF4FF",color:"#1267E8",fontSize:18,fontWeight:800},kpigreen:{background:"#E9FAF3",color:"#15966A"},kpiamber:{background:"#FFF7E5",color:"#B87A0A"},kpiblue:{background:"#EEF0FF",color:"#5A46C7"},kpiLabel:{display:"block",fontSize:10.5,color:"var(--text-dim)"},kpiValue:{display:"block",fontFamily:"var(--font-display)",fontSize:20,marginTop:2},kpiHelper:{display:"block",fontSize:9.5,color:"var(--text-dim)",marginTop:2},grid:{display:"grid",gridTemplateColumns:"1.1fr 1.1fr .9fr",gap:14},card:{background:"var(--panel)",border:"1px solid var(--line)",borderRadius:18,padding:18,minWidth:0},cardHead:{marginBottom:14},cardTitle:{fontFamily:"var(--font-display)",fontSize:14,margin:0},cardSubtitle:{fontSize:10.5,color:"var(--text-dim)",margin:"4px 0 0"},moodLayout:{display:"grid",gridTemplateColumns:"150px 1fr",gap:18,alignItems:"center"},donut:{width:142,height:142,borderRadius:"50%",background:"conic-gradient(#18B77A 0 48%, #52C85A 48% 70%, #F3B63F 70% 86%, #F0833C 86% 94%, #D95A62 94% 100%)",display:"grid",placeItems:"center",position:"relative"},donutInner:{width:100,height:100,borderRadius:"50%",background:"var(--panel)",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center"},moodList:{display:"flex",flexDirection:"column",gap:9},moodRow:{display:"grid",gridTemplateColumns:"105px 1fr 24px",gap:7,alignItems:"center",fontSize:11.5},moodName:{whiteSpace:"nowrap"},barTrack:{height:7,background:"var(--panel-2)",borderRadius:99,overflow:"hidden"},barFill:{height:"100%",borderRadius:99},chart:{height:190,display:"flex",alignItems:"stretch",gap:10,padding:"6px 4px 0"},chartCol:{flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"flex-end",gap:6},chartValue:{fontSize:10,fontWeight:800,color:"var(--text-dim)"},chartTrack:{height:135,width:"100%",display:"flex",alignItems:"flex-end",justifyContent:"center",background:"linear-gradient(to top, var(--line) 1px, transparent 1px) 0 100%/100% 33%",borderRadius:8},chartBar:{width:"70%",maxWidth:30,minHeight:4,borderRadius:"8px 8px 2px 2px",background:"linear-gradient(180deg,#1267E8,#18B7D7)"},insight:{padding:"12px 0",borderBottom:"1px solid var(--line)",display:"flex",flexDirection:"column",gap:3},insight span:{},notice:{display:"flex",gap:12,alignItems:"flex-start",marginTop:14,padding:14,background:"#F5F9FF",border:"1px solid #DCEBFA",borderRadius:16},noticeIcon:{fontSize:18},loading:{padding:40,textAlign:"center",color:"var(--text-dim)"},error:{padding:12,background:"#FFF0F0",border:"1px solid #F4C4C4",color:"#A33A3A",borderRadius:12,marginBottom:14,fontSize:12.5}};