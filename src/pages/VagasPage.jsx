import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../lib/AuthContext";

const VACANCY_STATUS_LABEL = { aberta: "Aberta", em_andamento: "Em andamento", fechada: "Fechada", cancelada: "Cancelada" };
const CANDIDATE_STATUS_LABEL = { triagem: "Triagem", entrevista: "Entrevista", aprovado: "Aprovado", reprovado: "Reprovado", contratado: "Contratado" };
const PIPELINE = ["triagem", "entrevista", "aprovado", "contratado"];

function Card({ children, style }) { return <div style={{ ...styles.card, ...style }}>{children}</div>; }
function Metric({ icon, label, value, hint }) { return <Card style={styles.metric}><div style={styles.metricIcon}>{icon}</div><div><div style={styles.metricLabel}>{label}</div><div style={styles.metricValue}>{value}</div>{hint && <div style={styles.metricHint}>{hint}</div>}</div></Card>; }

export default function VagasPage() {
  const { company } = useAuth();
  const [vacancies, setVacancies] = useState([]);
  const [allCandidates, setAllCandidates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [view, setView] = useState("dashboard");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("todos");
  const [selectedVacancy, setSelectedVacancy] = useState(null);
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [showNewVacancy, setShowNewVacancy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ title: "", department: "", description: "" });
  const [candidateForm, setCandidateForm] = useState({ full_name: "", email: "", phone: "" });

  async function loadAll() {
    setLoading(true); setError("");
    try {
      const [vRes, cRes] = await Promise.all([
        supabase.from("hr_vacancies").select("id, title, department, description, status, created_at").order("created_at", { ascending: false }).limit(100),
        supabase.from("hr_candidates").select("id, vacancy_id, full_name, email, phone, status, created_at").order("created_at", { ascending: false }).limit(500),
      ]);
      if (vRes.error) throw vRes.error;
      if (cRes.error) throw cRes.error;
      setVacancies(vRes.data ?? []); setAllCandidates(cRes.data ?? []);
    } catch (err) { setError("Não foi possível carregar o recrutamento: " + (err.message ?? "erro desconhecido")); }
    finally { setLoading(false); }
  }

  useEffect(() => { if (company?.id) loadAll(); }, [company?.id]);

  const openVacancies = useMemo(() => vacancies.filter(v => v.status === "aberta" || v.status === "em_andamento"), [vacancies]);
  const activeCandidates = useMemo(() => allCandidates.filter(c => !["reprovado", "contratado"].includes(c.status)), [allCandidates]);
  const interviews = useMemo(() => allCandidates.filter(c => c.status === "entrevista"), [allCandidates]);
  const hired = useMemo(() => allCandidates.filter(c => c.status === "contratado"), [allCandidates]);

  const filteredVacancies = useMemo(() => vacancies.filter(v => {
    const matchesSearch = !search || `${v.title} ${v.department ?? ""}`.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === "todos" || v.status === statusFilter;
    return matchesSearch && matchesStatus;
  }), [vacancies, search, statusFilter]);

  function candidatesFor(vacancyId) { return allCandidates.filter(c => c.vacancy_id === vacancyId); }
  function count(vacancyId, status) { return allCandidates.filter(c => c.vacancy_id === vacancyId && c.status === status).length; }

  async function createVacancy(e) {
    e.preventDefault(); setError("");
    if (!form.title.trim()) { setError("Informe o cargo da vaga."); return; }
    setSaving(true);
    const { error: insertError } = await supabase.from("hr_vacancies").insert({ company_id: company.id, title: form.title.trim(), department: form.department.trim() || null, description: form.description.trim() || null });
    if (insertError) setError(insertError.message);
    else { setForm({ title: "", department: "", description: "" }); setShowNewVacancy(false); await loadAll(); }
    setSaving(false);
  }

  async function addCandidate(vacancyId) {
    if (!candidateForm.full_name.trim()) { setError("Informe o nome do candidato."); return; }
    const { error: insertError } = await supabase.from("hr_candidates").insert({ company_id: company.id, vacancy_id: vacancyId, full_name: candidateForm.full_name.trim(), email: candidateForm.email.trim() || null, phone: candidateForm.phone.trim() || null });
    if (insertError) setError(insertError.message);
    else { setCandidateForm({ full_name: "", email: "", phone: "" }); await loadAll(); }
  }

  async function updateCandidateStatus(candidateId, status) {
    const { error: updateError } = await supabase.from("hr_candidates").update({ status }).eq("id", candidateId);
    if (updateError) setError(updateError.message); else await loadAll();
  }

  async function updateVacancyStatus(vacancyId, status) {
    const { error: updateError } = await supabase.from("hr_vacancies").update({ status }).eq("id", vacancyId);
    if (updateError) setError(updateError.message); else await loadAll();
  }

  if (loading) return <div style={styles.page}><div style={styles.loading}>Carregando recrutamento...</div></div>;

  return (
    <div style={styles.page}>
      <header style={styles.hero}>
        <div><div style={styles.eyebrow}>GESTÃO DE PESSOAS</div><h1 style={styles.title}>Recrutamento & Seleção</h1><p style={styles.subtitle}>Acompanhe vagas, candidatos e o avanço de cada processo seletivo em um único lugar.</p></div>
        <button style={styles.primaryBtn} onClick={() => setShowNewVacancy(true)}>＋ Nova vaga</button>
      </header>

      {error && <div style={styles.error}>{error}</div>}

      <nav style={styles.tabs}>
        {[['dashboard','Visão geral'],['vagas','Vagas'],['candidatos','Candidatos']].map(([key,label]) => <button key={key} onClick={() => setView(key)} style={{ ...styles.tab, ...(view === key ? styles.tabActive : {}) }}>{label}</button>)}
      </nav>

      {view === "dashboard" && <>
        <div style={styles.metrics}><Metric icon="▣" label="Vagas abertas" value={openVacancies.length}/><Metric icon="◉" label="Candidatos ativos" value={activeCandidates.length}/><Metric icon="◌" label="Entrevistas" value={interviews.length}/><Metric icon="✓" label="Contratados" value={hired.length}/></div>
        <div style={styles.grid2}>
          <Card><div style={styles.sectionHead}><div><h2 style={styles.sectionTitle}>Pipeline de recrutamento</h2><p style={styles.sectionSub}>Distribuição atual dos candidatos</p></div></div><div style={styles.pipeline}>{PIPELINE.map(status => { const total = allCandidates.filter(c => c.status === status).length; return <div key={status} style={styles.pipelineItem}><div style={styles.pipelineCount}>{total}</div><div style={styles.pipelineLabel}>{CANDIDATE_STATUS_LABEL[status]}</div><div style={styles.pipelineBar}><span style={{ width: `${allCandidates.length ? Math.max(4, total / allCandidates.length * 100) : 4}%` }}/></div></div>; })}</div></Card>
          <Card><div style={styles.sectionHead}><div><h2 style={styles.sectionTitle}>Vagas em destaque</h2><p style={styles.sectionSub}>Processos que precisam de acompanhamento</p></div><button style={styles.linkBtn} onClick={() => setView("vagas")}>Ver todas</button></div>{openVacancies.slice(0,5).map(v => <div key={v.id} style={styles.compactRow} onClick={() => { setSelectedVacancy(v); setView("vagas"); }}><div><strong>{v.title}</strong><div style={styles.muted}>{v.department || "Departamento não informado"}</div></div><div style={styles.miniStat}>{candidatesFor(v.id).length} candidatos</div></div>)}{openVacancies.length === 0 && <Empty text="Nenhuma vaga aberta no momento."/>}</Card>
        </div>
        <Card style={{ marginTop: 18 }}><div style={styles.sectionHead}><div><h2 style={styles.sectionTitle}>Últimos candidatos</h2><p style={styles.sectionSub}>Movimentações mais recentes</p></div><button style={styles.linkBtn} onClick={() => setView("candidatos")}>Ver candidatos</button></div>{allCandidates.slice(0,6).map(c => <CandidateRow key={c.id} candidate={c} vacancy={vacancies.find(v => v.id === c.vacancy_id)} onClick={() => setSelectedCandidate(c)}/>)}{allCandidates.length === 0 && <Empty text="Nenhum candidato cadastrado ainda."/>}</Card>
      </>}

      {view === "vagas" && <>
        <div style={styles.toolbar}><div style={styles.searchWrap}><span>⌕</span><input style={styles.search} placeholder="Buscar cargo ou departamento..." value={search} onChange={e => setSearch(e.target.value)}/></div><select style={styles.select} value={statusFilter} onChange={e => setStatusFilter(e.target.value)}><option value="todos">Todos os status</option>{Object.entries(VACANCY_STATUS_LABEL).map(([k,l]) => <option key={k} value={k}>{l}</option>)}</select></div>
        <div style={styles.vacancyGrid}>{filteredVacancies.map(v => <Card key={v.id} style={styles.vacancyCard}><div style={styles.vacancyTop}><div><div style={styles.badge}>{VACANCY_STATUS_LABEL[v.status] || v.status}</div><h2 style={styles.vacancyTitle}>{v.title}</h2><div style={styles.muted}>{v.department || "Departamento não informado"}</div></div><select style={styles.statusSelect} value={v.status} onChange={e => updateVacancyStatus(v.id,e.target.value)}>{Object.entries(VACANCY_STATUS_LABEL).map(([k,l]) => <option key={k} value={k}>{l}</option>)}</select></div>{v.description && <p style={styles.description}>{v.description}</p>}<div style={styles.statsLine}><span>👤 {candidatesFor(v.id).length} candidatos</span><span>◌ {count(v.id,"entrevista")} entrevistas</span><span>✓ {count(v.id,"contratado")} contratados</span></div><div style={styles.miniPipeline}>{["triagem","entrevista","aprovado","contratado"].map(s => <div key={s}><span style={{ width: `${Math.min(100, Math.max(3, count(v.id,s)*18))}%` }}/></div>)}</div><div style={styles.cardActions}><button style={styles.secondaryBtn} onClick={() => setSelectedVacancy(v)}>Gerenciar processo</button></div></Card>)}{filteredVacancies.length === 0 && <Empty text="Nenhuma vaga encontrada."/>}</div>
      </>}

      {view === "candidatos" && <><div style={styles.toolbar}><div style={styles.searchWrap}><span>⌕</span><input style={styles.search} placeholder="Buscar candidato..." value={search} onChange={e => setSearch(e.target.value)}/></div></div><Card><div style={styles.tableHead}><span>Candidato</span><span>Vaga</span><span>Etapa</span><span>Ação</span></div>{allCandidates.filter(c => !search || c.full_name.toLowerCase().includes(search.toLowerCase())).map(c => <div key={c.id} style={styles.tableRow}><div><strong>{c.full_name}</strong><div style={styles.muted}>{c.email || c.phone || "Contato não informado"}</div></div><div style={styles.muted}>{vacancies.find(v => v.id === c.vacancy_id)?.title || "—"}</div><select style={styles.statusSelect} value={c.status} onChange={e => updateCandidateStatus(c.id,e.target.value)}>{Object.entries(CANDIDATE_STATUS_LABEL).map(([k,l]) => <option key={k} value={k}>{l}</option>)}</select><button style={styles.linkBtn} onClick={() => setSelectedCandidate(c)}>Ver ficha</button></div>)}{allCandidates.length === 0 && <Empty text="Nenhum candidato cadastrado ainda."/>}</Card></>}

      {showNewVacancy && <Modal title="Abrir nova vaga" onClose={() => setShowNewVacancy(false)}><form onSubmit={createVacancy}><label style={styles.label}>Cargo<input style={styles.input} value={form.title} onChange={e => setForm({...form,title:e.target.value})} placeholder="Ex.: Analista de PCP" required/></label><label style={styles.label}>Departamento<input style={styles.input} value={form.department} onChange={e => setForm({...form,department:e.target.value})} placeholder="Ex.: Produção"/></label><label style={styles.label}>Descrição<input style={styles.input} value={form.description} onChange={e => setForm({...form,description:e.target.value})} placeholder="Objetivo e principais responsabilidades"/></label><div style={styles.modalActions}><button type="button" style={styles.secondaryBtn} onClick={() => setShowNewVacancy(false)}>Cancelar</button><button style={styles.primaryBtn} disabled={saving}>{saving ? "Salvando..." : "Abrir vaga"}</button></div></form></Modal>}

      {selectedVacancy && <Modal title={selectedVacancy.title} subtitle={`${selectedVacancy.department || "Departamento não informado"} • ${VACANCY_STATUS_LABEL[selectedVacancy.status] || selectedVacancy.status}`} onClose={() => setSelectedVacancy(null)}><div style={styles.processSummary}><div><span>Candidatos</span><strong>{candidatesFor(selectedVacancy.id).length}</strong></div><div><span>Entrevistas</span><strong>{count(selectedVacancy.id,"entrevista")}</strong></div><div><span>Contratados</span><strong>{count(selectedVacancy.id,"contratado")}</strong></div></div><h3 style={styles.modalSection}>Adicionar candidato</h3><div style={styles.formGrid}><input style={styles.input} placeholder="Nome completo" value={candidateForm.full_name} onChange={e => setCandidateForm({...candidateForm,full_name:e.target.value})}/><input style={styles.input} placeholder="E-mail" value={candidateForm.email} onChange={e => setCandidateForm({...candidateForm,email:e.target.value})}/><input style={styles.input} placeholder="Telefone" value={candidateForm.phone} onChange={e => setCandidateForm({...candidateForm,phone:e.target.value})}/><button style={styles.primaryBtn} onClick={() => addCandidate(selectedVacancy.id)}>+ Candidato</button></div><h3 style={styles.modalSection}>Pipeline</h3><div style={styles.kanban}>{["triagem","entrevista","aprovado","contratado"].map(status => <div key={status} style={styles.kanbanCol}><div style={styles.kanbanHead}><span>{CANDIDATE_STATUS_LABEL[status]}</span><b>{count(selectedVacancy.id,status)}</b></div>{candidatesFor(selectedVacancy.id).filter(c => c.status === status).map(c => <div key={c.id} style={styles.candidateCard} onClick={() => setSelectedCandidate(c)}><strong>{c.full_name}</strong><span>{c.email || c.phone || "Sem contato"}</span></div>)}{candidatesFor(selectedVacancy.id).filter(c => c.status === status).length === 0 && <div style={styles.kanbanEmpty}>Nenhum candidato</div>}</div>)}</div></Modal>}

      {selectedCandidate && <Modal title={selectedCandidate.full_name} subtitle={vacancies.find(v => v.id === selectedCandidate.vacancy_id)?.title || "Candidato"} onClose={() => setSelectedCandidate(null)}><div style={styles.profileHeader}><div style={styles.avatar}>{selectedCandidate.full_name.slice(0,1).toUpperCase()}</div><div><h2 style={{margin:0}}>{selectedCandidate.full_name}</h2><div style={styles.muted}>{selectedCandidate.email || "E-mail não informado"}</div><div style={styles.muted}>{selectedCandidate.phone || "Telefone não informado"}</div></div></div><div style={styles.detailGrid}><div><span>Etapa atual</span><select style={styles.statusSelectWide} value={selectedCandidate.status} onChange={async e => { await updateCandidateStatus(selectedCandidate.id,e.target.value); setSelectedCandidate({...selectedCandidate,status:e.target.value}); }}>{Object.entries(CANDIDATE_STATUS_LABEL).map(([k,l]) => <option key={k} value={k}>{l}</option>)}</select></div><div><span>Data da candidatura</span><strong>{selectedCandidate.created_at ? new Date(selectedCandidate.created_at).toLocaleDateString("pt-BR") : "—"}</strong></div></div><div style={styles.timeline}><div style={styles.timelineTitle}>Próximos passos</div><p>Use a etapa acima para movimentar o candidato pelo processo seletivo. Entrevistas e avaliações podem ser registradas conforme as etapas do processo.</p></div></Modal>}
    </div>
  );
}

function CandidateRow({ candidate, vacancy, onClick }) { return <div style={styles.compactRow} onClick={onClick}><div style={styles.personCell}><div style={styles.avatarSmall}>{candidate.full_name.slice(0,1).toUpperCase()}</div><div><strong>{candidate.full_name}</strong><div style={styles.muted}>{vacancy?.title || "Vaga não encontrada"}</div></div></div><div style={styles.stageBadge}>{CANDIDATE_STATUS_LABEL[candidate.status] || candidate.status}</div></div>; }
function Empty({ text }) { return <div style={styles.empty}><div style={styles.emptyIcon}>○</div>{text}</div>; }
function Modal({ title, subtitle, children, onClose }) { return <div style={styles.overlay}><div style={styles.modal}><div style={styles.modalHead}><div><h2 style={styles.modalTitle}>{title}</h2>{subtitle && <p style={styles.sectionSub}>{subtitle}</p>}</div><button style={styles.close} onClick={onClose}>×</button></div>{children}</div></div>; }

const styles = {
  page:{maxWidth:1180,margin:"0 auto",padding:"4px 0 40px"}, hero:{display:"flex",justifyContent:"space-between",alignItems:"flex-end",gap:20,marginBottom:24},eyebrow:{fontSize:11,fontWeight:800,letterSpacing:".12em",color:"var(--amber)",marginBottom:7},title:{fontFamily:"var(--font-display)",fontSize:30,margin:0,letterSpacing:"-.02em"},subtitle:{color:"var(--text-dim)",fontSize:14,margin:"7px 0 0",maxWidth:700},primaryBtn:{background:"var(--amber)",color:"#fff",border:0,borderRadius:10,padding:"11px 16px",fontWeight:800,cursor:"pointer",whiteSpace:"nowrap"},secondaryBtn:{background:"var(--panel-2)",color:"var(--text)",border:"1px solid var(--line)",borderRadius:9,padding:"9px 13px",fontWeight:700,cursor:"pointer"},linkBtn:{background:"transparent",border:0,color:"var(--amber)",fontWeight:800,cursor:"pointer"},tabs:{display:"flex",gap:4,borderBottom:"1px solid var(--line)",marginBottom:20},tab:{background:"transparent",border:0,color:"var(--text-dim)",padding:"11px 15px",fontWeight:700,cursor:"pointer",borderBottom:"2px solid transparent"},tabActive:{color:"var(--text)",borderBottom:"2px solid var(--amber)"},metrics:{display:"grid",gridTemplateColumns:"repeat(4,minmax(0,1fr))",gap:12,marginBottom:18},metric:{display:"flex",alignItems:"center",gap:13,padding:17},metricIcon:{width:38,height:38,borderRadius:10,display:"grid",placeItems:"center",background:"var(--panel-2)",fontSize:18},metricLabel:{fontSize:12,color:"var(--text-dim)"},metricValue:{fontSize:24,fontWeight:800,marginTop:2},metricHint:{fontSize:10,color:"var(--text-dim)",marginTop:2},grid2:{display:"grid",gridTemplateColumns:"1.35fr 1fr",gap:18},card:{background:"var(--panel)",border:"1px solid var(--line)",borderRadius:14,padding:18},sectionHead:{display:"flex",justifyContent:"space-between",alignItems:"center",gap:10,marginBottom:16},sectionTitle:{fontSize:15,margin:0,fontWeight:800},sectionSub:{fontSize:12,color:"var(--text-dim)",margin:"4px 0 0"},pipeline:{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:14},pipelineItem:{minWidth:0},pipelineCount:{fontSize:25,fontWeight:850},pipelineLabel:{fontSize:11,color:"var(--text-dim)",margin:"2px 0 8px"},pipelineBar:{height:7,background:"var(--panel-2)",borderRadius:99,overflow:"hidden"},pipelineBarSpan:{height:"100%",background:"var(--amber)",borderRadius:99},compactRow:{display:"flex",justifyContent:"space-between",alignItems:"center",gap:12,padding:"12px 0",borderBottom:"1px solid var(--line)",cursor:"pointer"},compactRowLast:{borderBottom:0},muted:{color:"var(--text-dim)",fontSize:12,marginTop:3},miniStat:{fontSize:11,fontWeight:700,color:"var(--text-dim)"},personCell:{display:"flex",alignItems:"center",gap:10},avatarSmall:{width:30,height:30,borderRadius:9,background:"var(--panel-2)",display:"grid",placeItems:"center",fontWeight:800,fontSize:12},stageBadge:{padding:"5px 9px",borderRadius:99,background:"var(--panel-2)",fontSize:11,fontWeight:800},toolbar:{display:"flex",gap:10,marginBottom:16},searchWrap:{display:"flex",alignItems:"center",gap:8,background:"var(--panel)",border:"1px solid var(--line)",borderRadius:10,padding:"0 11px",flex:1},search:{width:"100%",background:"transparent",border:0,outline:0,padding:"11px 0",color:"var(--text)",fontSize:13},select:{background:"var(--panel)",border:"1px solid var(--line)",borderRadius:10,padding:"0 12px",color:"var(--text)",minWidth:170},vacancyGrid:{display:"grid",gridTemplateColumns:"repeat(2,minmax(0,1fr))",gap:16},vacancyCard:{minHeight:210},vacancyTop:{display:"flex",justifyContent:"space-between",gap:12},badge:{display:"inline-block",fontSize:10,fontWeight:800,textTransform:"uppercase",letterSpacing:".06em",padding:"4px 7px",borderRadius:99,background:"var(--panel-2)",color:"var(--text-dim)"},vacancyTitle:{fontSize:18,margin:"9px 0 3px"},statusSelect:{background:"var(--panel-2)",border:"1px solid var(--line)",borderRadius:8,padding:"6px 8px",fontSize:11,fontWeight:800,color:"var(--text)"},description:{fontSize:12.5,lineHeight:1.55,color:"var(--text-dim)"},statsLine:{display:"flex",gap:15,flexWrap:"wrap",fontSize:11,color:"var(--text-dim)",marginTop:14},miniPipeline:{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:4,marginTop:12},miniPipelineDiv:{height:5,background:"var(--panel-2)",borderRadius:99},miniPipelineDivSpan:{display:"block",height:"100%",background:"var(--amber)",borderRadius:99},cardActions:{display:"flex",justifyContent:"flex-end",marginTop:16},tableHead:{display:"grid",gridTemplateColumns:"1.4fr 1fr 150px 90px",gap:12,padding:"0 0 10px",borderBottom:"1px solid var(--line)",fontSize:10,fontWeight:800,textTransform:"uppercase",color:"var(--text-dim)"},tableRow:{display:"grid",gridTemplateColumns:"1.4fr 1fr 150px 90px",gap:12,alignItems:"center",padding:"13px 0",borderBottom:"1px solid var(--line)"},empty:{padding:34,textAlign:"center",color:"var(--text-dim)",fontSize:13},emptyIcon:{fontSize:24,marginBottom:7},loading:{padding:50,textAlign:"center",color:"var(--text-dim)"},error:{background:"rgba(217,105,95,.12)",border:"1px solid var(--red)",color:"var(--red)",borderRadius:10,padding:"11px 13px",fontSize:13,marginBottom:16},overlay:{position:"fixed",inset:0,background:"rgba(0,0,0,.45)",display:"flex",alignItems:"center",justifyContent:"center",padding:20,zIndex:100},modal:{width:"min(1100px,100%)",maxHeight:"90vh",overflow:"auto",background:"var(--panel)",border:"1px solid var(--line)",borderRadius:18,padding:22,boxShadow:"0 24px 80px rgba(0,0,0,.28)"},modalHead:{display:"flex",justifyContent:"space-between",gap:15,marginBottom:20},modalTitle:{margin:0,fontSize:21},close:{background:"transparent",border:0,color:"var(--text-dim)",fontSize:28,cursor:"pointer",lineHeight:1},label:{display:"flex",flexDirection:"column",gap:7,fontSize:12,fontWeight:800,marginBottom:13},input:{background:"var(--panel-2)",border:"1px solid var(--line)",borderRadius:9,padding:"10px 11px",color:"var(--text)",fontSize:13,outline:"none",width:"100%",boxSizing:"border-box"},modalActions:{display:"flex",justifyContent:"flex-end",gap:9,marginTop:18},processSummary:{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10,marginBottom:20},processSummaryDiv:{background:"var(--panel-2)",borderRadius:10,padding:12},formGrid:{display:"grid",gridTemplateColumns:"1.3fr 1fr 1fr auto",gap:8},modalSection:{fontSize:13,margin:"22px 0 10px"},kanban:{display:"grid",gridTemplateColumns:"repeat(4,minmax(0,1fr))",gap:10,overflowX:"auto"},kanbanCol:{background:"var(--panel-2)",borderRadius:12,padding:10,minHeight:180},kanbanHead:{display:"flex",justifyContent:"space-between",fontSize:11,fontWeight:800,padding:"3px 2px 9px"},candidateCard:{background:"var(--panel)",border:"1px solid var(--line)",borderRadius:9,padding:10,marginBottom:7,cursor:"pointer"},candidateCardSpan:{display:"block",fontSize:10,color:"var(--text-dim)",marginTop:4,overflow:"hidden",textOverflow:"ellipsis"},kanbanEmpty:{fontSize:10,color:"var(--text-dim)",padding:"25px 5px",textAlign:"center"},profileHeader:{display:"flex",alignItems:"center",gap:13,padding:"5px 0 20px"},avatar:{width:52,height:52,borderRadius:14,background:"var(--panel-2)",display:"grid",placeItems:"center",fontSize:20,fontWeight:900},detailGrid:{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12},detailGridDiv:{background:"var(--panel-2)",padding:13,borderRadius:10,display:"flex",flexDirection:"column",gap:7,fontSize:11,color:"var(--text-dim)"},statusSelectWide:{marginTop:5,background:"var(--panel)",border:"1px solid var(--line)",borderRadius:8,padding:8,color:"var(--text)"},timeline:{marginTop:16,padding:15,borderRadius:11,background:"var(--panel-2)",color:"var(--text-dim)",fontSize:12},timelineTitle:{fontWeight:800,color:"var(--text)",marginBottom:5}
};
