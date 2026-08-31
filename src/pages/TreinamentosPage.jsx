import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../lib/AuthContext";

const STATUS_LABEL = { planejado: "Planejado", realizado: "Realizado", cancelado: "Cancelado" };
const STATUS_COLOR = { planejado: "var(--amber)", realizado: "Realizado", cancelado: "var(--red)" };

export default function TreinamentosPage() {
  const { company, profile } = useAuth();
  const role = profile?.access_role || "employee";
  const isEmployee = role === "employee";
  const [employees, setEmployees] = useState([]);
  const [trainings, setTrainings] = useState([]);
  const [myTrainings, setMyTrainings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [trainingDate, setTrainingDate] = useState("");
  const [saving, setSaving] = useState(false);
  const [expandedId, setExpandedId] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [addingEmployeeId, setAddingEmployeeId] = useState("");

  async function loadAll() {
    if (!company?.id || !profile?.id) return;
    setLoading(true); setError("");
    try {
      if (isEmployee) {
        const { data: me, error: meError } = await supabase.from("employees").select("id").eq("company_id", company.id).eq("profile_id", profile.id).maybeSingle();
        if (meError) throw meError;
        if (!me) { setMyTrainings([]); return; }
        const { data, error: trError } = await supabase
          .from("hr_training_participants")
          .select("id, attended, training_id, hr_trainings:training_id (id, title, description, training_date, status)")
          .eq("company_id", company.id).eq("employee_id", me.id);
        if (trError) throw trError;
        setMyTrainings((data || []).filter(x => x.hr_trainings).map(x => ({ ...x.hr_trainings, attended: x.attended, participant_id: x.id })));
        return;
      }
      const [{ data: emp, error: e1 }, { data: tr, error: e2 }] = await Promise.all([
        supabase.from("employees").select("id, full_name").eq("company_id", company.id).eq("status", "ativo").order("full_name"),
        supabase.from("hr_trainings").select("id, title, description, training_date, status").eq("company_id", company.id).order("created_at", { ascending: false }).limit(100),
      ]);
      if (e1 || e2) throw e1 || e2;
      setEmployees(emp || []); setTrainings(tr || []);
    } catch (err) { setError("Não foi possível carregar: " + (err.message || "erro desconhecido")); }
    finally { setLoading(false); }
  }
  useEffect(() => { loadAll(); }, [company?.id, profile?.id, role]);

  async function createTraining(e) {
    e.preventDefault(); if (!title) return setError("Dê um título ao treinamento.");
    setSaving(true); setError("");
    const { error } = await supabase.from("hr_trainings").insert({ company_id: company.id, title, description: description || null, training_date: trainingDate || null });
    if (error) setError(error.message); else { setTitle(""); setDescription(""); setTrainingDate(""); await loadAll(); }
    setSaving(false);
  }
  async function loadParticipants(trainingId) {
    const { data, error } = await supabase.from("hr_training_participants").select("id, employee_id, attended, employees:employee_id (full_name)").eq("training_id", trainingId);
    if (error) setError(error.message); else setParticipants(data || []);
  }
  function toggleExpand(training) { if (expandedId === training.id) return setExpandedId(null); setExpandedId(training.id); loadParticipants(training.id); }
  async function addParticipant(trainingId) { if (!addingEmployeeId) return; const { error } = await supabase.from("hr_training_participants").insert({ company_id: company.id, training_id: trainingId, employee_id: addingEmployeeId }); if (error) setError(error.message); setAddingEmployeeId(""); await loadParticipants(trainingId); }
  async function toggleAttended(participantId, current, trainingId) { const { error } = await supabase.from("hr_training_participants").update({ attended: !current }).eq("id", participantId); if (error) setError(error.message); await loadParticipants(trainingId); }
  async function updateStatus(trainingId, status) { const { error } = await supabase.from("hr_trainings").update({ status }).eq("id", trainingId); if (error) setError(error.message); await loadAll(); }

  if (isEmployee) return <div className="report-page"><header style={styles.header}><div><div style={styles.kicker}>Meu desenvolvimento</div><h1 style={styles.title}>Meus Treinamentos</h1><p style={styles.subtitle}>Consulte os treinamentos em que você foi inscrito e seu histórico de realização.</p></div></header>{error && <div style={styles.error}>{error}</div>}{loading ? <p style={styles.dim}>Carregando...</p> : myTrainings.length === 0 ? <div style={styles.empty}><strong>Nenhum treinamento registrado</strong><p style={styles.dim}>Quando o RH ou DP registrar sua participação em um treinamento, ele aparecerá aqui.</p></div> : <div style={styles.list}>{myTrainings.map(t => <article key={t.participant_id} style={styles.card}><div style={styles.cardHeader}><div><strong>{t.title}</strong>{t.training_date && <p style={styles.dim}>{new Date(t.training_date + "T00:00:00").toLocaleDateString("pt-BR")}</p>}</div><span style={{ ...styles.badge, color: STATUS_COLOR[t.status] || "var(--text)" }}>{t.status === "realizado" && t.attended ? "Realizado" : STATUS_LABEL[t.status] || "Registrado"}</span></div>{t.description && <p style={styles.dim}>{t.description}</p>}<div style={styles.attendance}>{t.attended ? "✓ Participação registrada" : "Participação ainda não registrada"}</div></article>)}</div>}</div>;

  const availableEmployees = employees.filter(e => !participants.some(p => p.employee_id === e.id));
  return <div><header style={styles.header}><div><div style={styles.kicker}>Gestão de Pessoas</div><h1 style={styles.title}>Treinamentos</h1><p style={styles.subtitle}>Cadastre treinamentos, participantes e presença.</p></div></header>{error && <div style={styles.error}>{error}</div>}<form onSubmit={createTraining} style={styles.form}><p style={styles.formTitle}>Novo treinamento</p><input style={styles.input} placeholder="Título" value={title} onChange={e => setTitle(e.target.value)} required /><div style={styles.row}><input style={styles.input} placeholder="Descrição (opcional)" value={description} onChange={e => setDescription(e.target.value)} /><input style={styles.input} type="date" value={trainingDate} onChange={e => setTrainingDate(e.target.value)} /></div><button style={styles.saveBtn} type="submit" disabled={saving}>{saving ? "Criando..." : "Criar treinamento"}</button></form>{loading ? <p style={styles.dim}>Carregando...</p> : trainings.length === 0 ? <p style={styles.dim}>Nenhum treinamento criado ainda.</p> : <div style={styles.list}>{trainings.map(t => <div key={t.id} style={styles.card}><div style={styles.cardHeader}><strong>{t.title}</strong><select style={styles.statusSelect} value={t.status} onChange={e => updateStatus(t.id, e.target.value)}>{Object.entries(STATUS_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></div>{t.description && <p style={styles.dim}>{t.description}</p>}{t.training_date && <p style={styles.dim}>{new Date(t.training_date + "T00:00:00").toLocaleDateString("pt-BR")}</p>}<button style={styles.expandBtn} onClick={() => toggleExpand(t)} type="button">{expandedId === t.id ? "Fechar" : "Ver participantes"}</button>{expandedId === t.id && <div style={styles.detailsBox}>{participants.length ? <ul style={styles.participantList}>{participants.map(p => <li key={p.id} style={styles.participantItem}><span>{p.employees?.full_name}</span><button style={styles.attendBtn} onClick={() => toggleAttended(p.id, p.attended, t.id)} type="button">{p.attended ? "Presente" : "Ausente"}</button></li>)}</ul> : <p style={styles.dim}>Nenhum participante ainda.</p>}<div style={styles.addRow}><select style={styles.input} value={addingEmployeeId} onChange={e => setAddingEmployeeId(e.target.value)}><option value="">Adicionar colaborador...</option>{availableEmployees.map(e => <option key={e.id} value={e.id}>{e.full_name}</option>)}</select><button style={styles.addBtn} onClick={() => addParticipant(t.id)} type="button">+ Adicionar</button></div></div>}</div>)}</div>}</div>;
}
const styles={header:{marginBottom:20},kicker:{fontSize:11,fontWeight:800,textTransform:"uppercase",letterSpacing:".08em",color:"var(--amber)"},title:{fontFamily:"var(--font-display)",fontSize:24,margin:0},subtitle:{color:"var(--text-dim)",fontSize:13,margin:"6px 0 0"},dim:{color:"var(--text-dim)",fontSize:12.5},form:{display:"flex",flexDirection:"column",gap:12,background:"var(--panel)",border:"1px solid var(--line)",borderRadius:"var(--radius)",padding:20,marginBottom:28,maxWidth:680},formTitle:{fontSize:13,fontWeight:700,color:"var(--text-dim)",textTransform:"uppercase",margin:0},row:{display:"flex",gap:10},input:{flex:1,background:"var(--panel-2)",border:"1px solid var(--line)",borderRadius:"var(--radius)",padding:"9px 10px",color:"var(--text)",fontSize:13},saveBtn:{background:"var(--amber)",color:"#fff",border:0,borderRadius:"var(--radius)",padding:10,fontWeight:700},list:{display:"flex",flexDirection:"column",gap:12,maxWidth:760},card:{background:"var(--panel)",border:"1px solid var(--line)",borderRadius:"var(--radius)",padding:16},cardHeader:{display:"flex",justifyContent:"space-between",alignItems:"center",gap:16},statusSelect:{background:"var(--panel-2)",border:"1px solid var(--line)",borderRadius:"var(--radius)",padding:"5px 8px",color:"var(--text)"},expandBtn:{marginTop:8,background:"transparent",border:"1px solid var(--line)",color:"var(--text-dim)",borderRadius:"var(--radius)",padding:"6px 14px",fontSize:12},detailsBox:{marginTop:12,paddingTop:12,borderTop:"1px solid var(--line)"},participantList:{listStyle:"none",padding:0,margin:"0 0 10px",display:"flex",flexDirection:"column",gap:6},participantItem:{display:"flex",justifyContent:"space-between",alignItems:"center",fontSize:13},attendBtn:{border:0,borderRadius:"var(--radius)",padding:"5px 10px",fontSize:11,fontWeight:700},addRow:{display:"flex",gap:8},addBtn:{background:"var(--panel-2)",border:"1px solid var(--line)",color:"var(--text)",borderRadius:"var(--radius)",padding:"9px 14px",fontSize:12,fontWeight:700},error:{background:"rgba(217,105,95,.12)",border:"1px solid var(--red)",color:"var(--red)",borderRadius:"var(--radius)",padding:10,marginBottom:16},empty:{background:"var(--panel)",border:"1px solid var(--line)",borderRadius:"var(--radius)",padding:28,textAlign:"center"},badge:{fontSize:12,fontWeight:800},attendance:{marginTop:12,fontSize:12,fontWeight:700,color:"var(--text-dim)"}};
