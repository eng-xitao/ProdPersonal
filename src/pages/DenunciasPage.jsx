import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../lib/AuthContext";

const STATUS_LABEL = { aberta: "Aberta", em_analise: "Em análise", resolvida: "Resolvida" };
const STATUS_COLOR = { aberta: "#D95A62", em_analise: "#B87A0A", resolvida: "#15966A" };

export default function DenunciasPage() {
  const { company, profile } = useAuth();
  const role = profile?.access_role || "employee";
  const authorized = ["rh", "gestor", "admin", "master"].includes(role);
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadAll() {
    if (!company?.id || !authorized) return;
    setLoading(true); setError("");
    const { data, error: e } = await supabase.from("hr_complaints").select("id, category, description, status, created_at").eq("company_id", company.id).order("created_at", { ascending: false });
    if (e) setError("Não foi possível carregar o canal: " + e.message); else setComplaints(data || []);
    setLoading(false);
  }
  useEffect(() => { loadAll(); }, [company?.id, authorized]);

  if (!authorized) return <div style={styles.restricted}><div style={styles.restrictedIcon}>🔒</div><h1>Acesso restrito</h1><p>O Canal de Denúncias é reservado ao Gerente/Responsável pelo RH e à administração autorizada.</p></div>;

  return <div>
    <header style={styles.header}><div><div style={styles.eyebrow}>ACESSO RESTRITO</div><h1 style={styles.title}>Canal de Denúncias</h1><p style={styles.subtitle}>Registros anônimos para tratamento confidencial pelo responsável autorizado.</p></div><div style={styles.badge}>🔒 Anônimo</div></header>
    <section style={styles.security}><div style={styles.securityIcon}>✓</div><div><strong>Anonimato preservado</strong><p>Esta tela não exibe nome, e-mail, perfil ou colaborador relacionado à denúncia. O tratamento deve permanecer restrito aos responsáveis autorizados.</p></div></section>
    {error && <div style={styles.error}>{error}</div>}
    <section style={styles.kpis}><Kpi label="Total de registros" value={complaints.length}/><Kpi label="Abertas" value={complaints.filter(c=>c.status==="aberta").length} tone="red"/><Kpi label="Em análise" value={complaints.filter(c=>c.status==="em_analise").length} tone="amber"/><Kpi label="Resolvidas" value={complaints.filter(c=>c.status==="resolvida").length} tone="green"/></section>
    <section style={styles.listHead}><div><h2>Ocorrências registradas</h2><p>Somente informações necessárias para análise e encaminhamento.</p></div></section>
    {loading?<p style={styles.dim}>Carregando...</p>:complaints.length===0?<div style={styles.empty}>Nenhuma denúncia registrada.</div>:<div style={styles.list}>{complaints.map((c,index)=><article key={c.id} style={styles.card}><div style={styles.cardTop}><span style={styles.protocol}>Protocolo #{String(index+1).padStart(4,"0")}</span><span style={{...styles.status,color:STATUS_COLOR[c.status]}}>{STATUS_LABEL[c.status]||c.status}</span></div><div style={styles.meta}><span>{c.category||"Sem categoria"}</span><span>•</span><span>{new Date(c.created_at).toLocaleDateString("pt-BR")}</span></div><p style={styles.description}>{c.description}</p></article>)}</div>}
  </div>;
}
function Kpi({label,value,tone}){return <div style={styles.kpi}><span>{label}</span><strong style={tone?{color:STATUS_COLOR[tone]}:{}}>{value}</strong></div>}
const styles={header:{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:20,marginBottom:18},eyebrow:{fontSize:10,fontWeight:800,letterSpacing:".1em",color:"var(--text-dim)",marginBottom:5},title:{fontFamily:"var(--font-display)",fontSize:26,margin:0},subtitle:{color:"var(--text-dim)",fontSize:13,margin:"6px 0 0",maxWidth:700},badge:{background:"#F5F9FF",border:"1px solid #DCEBFA",color:"#1267E8",borderRadius:999,padding:"8px 12px",fontSize:11,fontWeight:800},security:{display:"flex",gap:12,padding:14,background:"#FFF8F8",border:"1px solid #F4D5D7",borderRadius:16,marginBottom:16},securityIcon:{width:28,height:28,borderRadius:"50%",background:"#E9FAF3",color:"#15966A",display:"grid",placeItems:"center",fontWeight:900},security p:{},kpis:{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12,marginBottom:18},kpi:{background:"var(--panel)",border:"1px solid var(--line)",borderRadius:16,padding:"14px 16px",display:"flex",flexDirection:"column",gap:5},listHead:{marginBottom:12},listHead h2:{},dim:{color:"var(--text-dim)",fontSize:12.5},empty:{padding:28,textAlign:"center",background:"var(--panel)",border:"1px solid var(--line)",borderRadius:16,color:"var(--text-dim)"},list:{display:"flex",flexDirection:"column",gap:12},card:{background:"var(--panel)",border:"1px solid var(--line)",borderRadius:16,padding:16},cardTop:{display:"flex",justifyContent:"space-between",gap:12,alignItems:"center"},protocol:{fontSize:11,fontWeight:800,color:"var(--text-dim)"},status:{fontSize:11,fontWeight:800},meta:{display:"flex",gap:7,fontSize:10.5,color:"var(--text-dim)",marginTop:8},description:{fontSize:13,lineHeight:1.6,margin:"12px 0 0"},error:{padding:12,background:"#FFF0F0",border:"1px solid #F4C4C4",color:"#A33A3A",borderRadius:12,marginBottom:14,fontSize:12.5},restricted:{maxWidth:560,margin:"80px auto",textAlign:"center",padding:30,background:"var(--panel)",border:"1px solid var(--line)",borderRadius:20},restrictedIcon:{fontSize:30,marginBottom:10}};