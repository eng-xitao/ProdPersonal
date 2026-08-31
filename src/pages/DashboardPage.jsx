import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../lib/AuthContext";

const MOODS = [
  { value: 5, emoji: "😄", label: "Ótimo" },
  { value: 4, emoji: "🙂", label: "Bem" },
  { value: 3, emoji: "😐", label: "Neutro" },
  { value: 2, emoji: "🙁", label: "Mal" },
  { value: 1, emoji: "😣", label: "Péssimo" },
];

function Stat({ value, label, helper }) {
  return <div style={styles.card}><strong style={styles.cardValue}>{value}</strong><span style={styles.cardLabel}>{label}</span>{helper && <span style={styles.helper}>{helper}</span>}</div>;
}

function ProgressBar({ label, value, detail }) {
  const safe = Math.max(0, Math.min(100, Number(value) || 0));
  return <div style={styles.progressItem}><div style={styles.progressHead}><span>{label}</span><strong>{Math.round(safe)}%</strong></div><div style={styles.track}><div style={{ ...styles.fill, width: `${safe}%` }} /></div>{detail && <span style={styles.helper}>{detail}</span>}</div>;
}

function MiniChart({ label, value, caption }) {
  const safe = Math.max(0, Math.min(100, Number(value) || 0));
  return <div style={styles.chartBox}><div style={styles.chartTrack}><div style={{ ...styles.chartBar, height: `${Math.max(8, safe)}%` }}><span>{Math.round(safe)}%</span></div></div><strong style={styles.chartLabel}>{label}</strong><small style={styles.helper}>{caption}</small></div>;
}

export default function DashboardPage() {
  const { company, profile, session } = useAuth();
  const role = profile?.access_role || "employee";
  if (role === "employee") return <EmployeePortal company={company} profile={profile} session={session} />;
  return <ManagementDashboard company={company} />;
}

function EmployeePortal({ company, profile, session }) {
  const [employee, setEmployee] = useState(null);
  const [pending, setPending] = useState([]);
  const [metrics, setMetrics] = useState({ evaluations: 0, evaluationAvg: 0, goals: 0, goalPct: 0, trainings: 0, trainingsDone: 0, pdi: 0, pdiPct: 0, feedbacks: 0 });
  const [mood, setMood] = useState(null);
  const [savingMood, setSavingMood] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadPortal() {
    if (!company?.id || !profile?.id) return;
    setLoading(true); setError("");
    try {
      let emp = null;
      const byProfile = await supabase.from("employees").select("id,full_name,role,hire_date,status").eq("profile_id", profile.id).eq("company_id", company.id).maybeSingle();
      if (byProfile.error) throw byProfile.error;
      emp = byProfile.data;
      if (!emp && session?.user?.email) {
        const byEmail = await supabase.from("employees").select("id,full_name,role,hire_date,status").eq("email", session.user.email).eq("company_id", company.id).maybeSingle();
        if (byEmail.error) throw byEmail.error;
        emp = byEmail.data;
      }
      if (!emp) throw new Error("Seu cadastro de colaborador ainda não está vinculado ao Portal.");
      setEmployee(emp);
      const today = new Date().toISOString().slice(0, 10);
      const [recipients, evaluations, goals, participants, pdi, feedbacks, checkin] = await Promise.all([
        supabase.from("hr_communication_recipients").select("id,status,viewed_at,responded_at,communication_id,hr_communications:communication_id (title,communication_type,due_at,file_name)").eq("employee_id", emp.id).in("status", ["pending", "visualizado", "pendente"]),
        supabase.from("hr_performance_evaluations").select("id,status,overall_score").eq("employee_id", emp.id),
        supabase.from("hr_goals").select("id,status,target_value,current_value").eq("employee_id", emp.id),
        supabase.from("hr_training_participants").select("id,attended").eq("employee_id", emp.id),
        supabase.from("hr_pdi").select("id,status").eq("employee_id", emp.id),
        supabase.from("hr_feedbacks").select("id").eq("employee_id", emp.id),
        supabase.from("hr_climate_checkins").select("mood,checkin_date").eq("employee_id", emp.id).eq("checkin_date", today).maybeSingle(),
      ]);
      const firstError = [recipients, evaluations, goals, participants, pdi, feedbacks, checkin].find((r) => r.error)?.error;
      if (firstError) throw firstError;
      const evaluationRows = evaluations.data ?? [];
      const goalRows = goals.data ?? [];
      const participantRows = participants.data ?? [];
      const pdiRows = pdi.data ?? [];
      const scoredGoals = goalRows.filter((g) => Number(g.target_value) > 0);
      const goalPct = scoredGoals.length ? scoredGoals.reduce((sum, g) => sum + Math.min(100, (Number(g.current_value || 0) / Number(g.target_value)) * 100), 0) / scoredGoals.length : (goalRows.length ? 50 : 0);
      const pdiPct = pdiRows.length ? (pdiRows.filter((x) => x.status === "concluido").length / pdiRows.length) * 100 : 0;
      const scores = evaluationRows.map((x) => Number(x.overall_score)).filter((x) => Number.isFinite(x));
      setPending(recipients.data ?? []);
      setMetrics({ evaluations: evaluationRows.length, evaluationAvg: scores.length ? (scores.reduce((a, b) => a + b, 0) / scores.length / 10) * 100 : 0, goals: goalRows.length, goalPct, trainings: participantRows.length, trainingsDone: participantRows.filter((x) => x.attended).length, pdi: pdiRows.filter((x) => x.status !== "concluido").length, pdiPct, feedbacks: (feedbacks.data ?? []).length });
      setMood(checkin.data?.mood ?? null);
    } catch (err) { setError(err.message || "Não foi possível carregar seu portal."); }
    finally { setLoading(false); }
  }

  useEffect(() => { loadPortal(); }, [company?.id, profile?.id, session?.user?.email]);

  async function saveMood(value) {
    if (!employee || !company) return;
    setSavingMood(true); setError("");
    const { error: e } = await supabase.from("hr_climate_checkins").upsert({ company_id: company.id, employee_id: employee.id, mood: value, checkin_date: new Date().toISOString().slice(0, 10) }, { onConflict: "employee_id,checkin_date" });
    if (e) setError(e.message); else setMood(value);
    setSavingMood(false);
  }

  const pendingCount = pending.length;
  const trainingPct = metrics.trainings ? (metrics.trainingsDone / metrics.trainings) * 100 : 0;
  if (loading) return <p style={styles.dim}>Preparando seu portal...</p>;
  if (!employee) return <div style={styles.error}>{error || "Colaborador não encontrado."}</div>;

  return <div>
    <header style={styles.portalHero}><div><span style={styles.eyebrow}>Meu Portal</span><h1 style={styles.portalTitle}>Olá, {employee.full_name.split(" ")[0]} 👋</h1><p style={styles.subtitle}>{employee.role || "Colaborador"} · acompanhe aqui suas pendências e desenvolvimento.</p></div><div style={styles.moodBadge}>{mood ? `${MOODS.find((m) => m.value === mood)?.emoji} ${MOODS.find((m) => m.value === mood)?.label}` : "Check-in pendente"}</div></header>
    {error && <div style={styles.error}>{error}</div>}
    <section style={styles.moodCard}><div><strong>Como você está se sentindo hoje?</strong><p style={styles.helper}>Seu check-in fica registrado no Clima Organizacional.</p></div><div style={styles.moodRow}>{MOODS.map((m) => <button key={m.value} type="button" disabled={savingMood} title={m.label} onClick={() => saveMood(m.value)} style={{ ...styles.moodButton, ...(mood === m.value ? styles.moodSelected : {}) }}>{m.emoji}<small>{m.label}</small></button>)}</div></section>
    <div style={styles.grid}><Stat value={pendingCount} label="Pendências de leitura" helper="Documentos/comunicados aguardando sua ação" /><Stat value={metrics.evaluations} label="Avaliações" helper="Seu histórico disponível" /><Stat value={metrics.feedbacks} label="Feedbacks" helper="Registros disponíveis" /><Stat value={metrics.pdi} label="Ações de PDI" helper="Em andamento" /></div>
    <div style={styles.twoCol}><section style={styles.panel}><div style={styles.sectionHead}><div><h2 style={styles.title2}>📢 O que precisa da sua atenção</h2><p style={styles.helper}>Priorize os itens enviados pelo RH.</p></div><span style={styles.count}>{pendingCount}</span></div>{pending.length === 0 ? <p style={styles.dim}>Você não possui documentos pendentes no momento.</p> : pending.slice(0, 5).map((item) => <div key={item.id} style={styles.notice}><div><strong>{item.hr_communications?.title || "Documento"}</strong><span style={styles.helper}>{item.hr_communications?.communication_type || "Comunicado"}{item.hr_communications?.file_name ? ` · ${item.hr_communications.file_name}` : ""}</span></div><span style={styles.pending}>Pendente</span></div>)}</section><section style={styles.panel}><h2 style={styles.title2}>📈 Meu desenvolvimento</h2><ProgressBar label="Treinamentos concluídos" value={trainingPct} detail={`${metrics.trainingsDone} de ${metrics.trainings} registrados`} /><ProgressBar label="Metas acompanhadas" value={metrics.goalPct} detail={`${metrics.goals} meta(s) cadastrada(s)`} /><ProgressBar label="PDI concluído" value={metrics.pdiPct} detail={metrics.pdi ? `${metrics.pdi} ação(ões) ainda em andamento` : "Nenhuma ação pendente"} /></section></div>
    <section style={styles.panel}><h2 style={styles.title2}>📊 Indicadores do seu desenvolvimento</h2><div style={styles.chartRow}><MiniChart label="Avaliações" value={metrics.evaluationAvg} caption={metrics.evaluations ? `${metrics.evaluations} avaliação(ões)` : "Sem avaliação"} /><MiniChart label="Metas" value={metrics.goalPct} caption={`${metrics.goals} cadastrada(s)`} /><MiniChart label="Treinamentos" value={trainingPct} caption={`${metrics.trainingsDone}/${metrics.trainings} concluídos`} /><MiniChart label="PDI" value={metrics.pdiPct} caption={metrics.pdi ? "Em desenvolvimento" : "Concluído"} /></div></section>
    <section style={styles.panel}><h2 style={styles.title2}>🧭 Seus próximos passos</h2><div style={styles.quickGrid}><div style={styles.quick}><strong>Minhas Avaliações</strong><span>Veja seus gráficos, resultados e histórico.</span></div><div style={styles.quick}><strong>Minha Caixa de Entrada</strong><span>Leia comunicados e envie documentos ao RH.</span></div><div style={styles.quick}><strong>Meu PDI</strong><span>Acompanhe seu desenvolvimento.</span></div><div style={styles.quick}><strong>Meus Treinamentos</strong><span>Consulte seus treinamentos e presença.</span></div></div></section>
  </div>;
}

function ManagementDashboard({ company }) {
  const [stats, setStats] = useState(null); const [birthdays, setBirthdays] = useState([]); const [loading, setLoading] = useState(true);
  useEffect(() => { if (!company?.id) return; (async () => { const [{ count: totalEmployees }, { count: openEvaluations }, { count: pendingPdi }, { count: upcomingVacations }, { count: openVacancies }, { data: lastRun }, { data: allEmployees }] = await Promise.all([supabase.from("employees").select("id", { count: "exact", head: true }).eq("status", "ativo"), supabase.from("hr_performance_evaluations").select("id", { count: "exact", head: true }).eq("status", "aberta"), supabase.from("hr_pdi").select("id", { count: "exact", head: true }).eq("status", "pendente"), supabase.from("hr_vacations").select("id", { count: "exact", head: true }).eq("status", "agendada"), supabase.from("hr_vacancies").select("id", { count: "exact", head: true }).eq("status", "aberta"), supabase.from("hr_payroll_runs").select("competencia, status").order("competencia", { ascending: false }).limit(1).maybeSingle(), supabase.from("employees").select("full_name, birth_date").eq("status", "ativo").not("birth_date", "is", null)]); setStats({ totalEmployees, openEvaluations, pendingPdi, upcomingVacations, openVacancies, lastRun }); const currentMonth = new Date().getMonth(); setBirthdays((allEmployees ?? []).filter((e) => new Date(e.birth_date + "T00:00:00").getMonth() === currentMonth).sort((a, b) => new Date(a.birth_date).getDate() - new Date(b.birth_date).getDate())); setLoading(false); })(); }, [company?.id]);
  if (loading || !stats) return <p style={styles.dim}>Carregando...</p>;
  const cards = [{ label: "Colaboradores ativos", value: stats.totalEmployees ?? 0 }, { label: "Avaliações em aberto", value: stats.openEvaluations ?? 0 }, { label: "PDIs pendentes", value: stats.pendingPdi ?? 0 }, { label: "Férias agendadas", value: stats.upcomingVacations ?? 0 }, { label: "Vagas abertas", value: stats.openVacancies ?? 0 }];
  return <div><header style={{ marginBottom: 20 }}><h1 style={styles.title}>Dashboard</h1><p style={styles.subtitle}>Visão geral da gestão de pessoas.</p></header><div style={styles.grid}>{cards.map((c) => <Stat key={c.label} value={c.value} label={c.label} />)}</div>{stats.lastRun && <p style={{ ...styles.dim, marginTop: 20 }}>Última folha: {new Date(stats.lastRun.competencia + "T00:00:00").toLocaleDateString("pt-BR", { month: "long", year: "numeric" })} — {stats.lastRun.status === "aberta" ? "aberta" : "fechada"}</p>}{birthdays.length > 0 && <div style={styles.panel}><h2 style={styles.title2}>🎂 Aniversariantes do mês</h2>{birthdays.map((b) => <div key={b.full_name} style={styles.notice}><strong>{new Date(b.birth_date + "T00:00:00").getDate().toString().padStart(2, "0")} — {b.full_name}</strong></div>)}</div>}</div>;
}

const styles = {
  title: { fontFamily: "var(--font-display)", fontSize: 22, margin: 0 }, portalHero: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 20, marginBottom: 18, flexWrap: "wrap" }, portalTitle: { fontFamily: "var(--font-display)", fontSize: 28, margin: "5px 0 0" }, eyebrow: { color: "var(--amber)", fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: ".08em" }, subtitle: { color: "var(--text-dim)", fontSize: 13, margin: "6px 0 0" }, dim: { color: "var(--text-dim)", fontSize: 13 }, grid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 12, marginBottom: 16 }, card: { background: "var(--panel)", border: "1px solid var(--line)", borderRadius: "var(--radius)", padding: "17px 16px", display: "flex", flexDirection: "column", gap: 4 }, cardValue: { fontFamily: "var(--font-display)", fontSize: 28, fontWeight: 800 }, cardLabel: { fontSize: 12, fontWeight: 700 }, helper: { color: "var(--text-dim)", fontSize: 11.5 }, moodBadge: { background: "var(--panel)", border: "1px solid var(--line)", borderRadius: 999, padding: "8px 13px", fontSize: 12, fontWeight: 700 }, moodCard: { background: "var(--panel)", border: "1px solid var(--line)", borderRadius: "var(--radius)", padding: 18, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 20, flexWrap: "wrap", marginBottom: 16 }, moodRow: { display: "flex", gap: 8 }, moodButton: { display: "flex", flexDirection: "column", alignItems: "center", gap: 2, background: "var(--panel-2)", border: "1px solid var(--line)", borderRadius: "var(--radius)", padding: "7px 9px", cursor: "pointer", fontSize: 23 }, moodSelected: { outline: "2px solid var(--amber)" }, twoCol: { display: "grid", gridTemplateColumns: "minmax(0,1.2fr) minmax(300px,.8fr)", gap: 16, marginBottom: 16 }, panel: { background: "var(--panel)", border: "1px solid var(--line)", borderRadius: "var(--radius)", padding: 18, marginBottom: 16 }, sectionHead: { display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start" }, title2: { fontFamily: "var(--font-display)", fontSize: 15, margin: "0 0 5px" }, count: { minWidth: 26, height: 26, display: "grid", placeItems: "center", borderRadius: 999, background: "var(--amber)", color: "#fff", fontSize: 11, fontWeight: 800 }, notice: { display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", padding: "11px 0", borderBottom: "1px solid var(--line)" }, pending: { color: "var(--amber)", fontSize: 11, fontWeight: 800 }, progressItem: { marginTop: 15 }, progressHead: { display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 6 }, track: { height: 8, borderRadius: 999, background: "var(--panel-2)", overflow: "hidden", border: "1px solid var(--line)" }, fill: { height: "100%", background: "var(--amber)", borderRadius: 999 }, chartRow: { display: "grid", gridTemplateColumns: "repeat(4, minmax(90px,1fr))", gap: 14, alignItems: "end", marginTop: 14 }, chartBox: { minHeight: 170, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-end", gap: 5 }, chartTrack: { height: 115, width: 48, display: "flex", alignItems: "flex-end", justifyContent: "center", background: "var(--panel-2)", border: "1px solid var(--line)", borderRadius: "10px 10px 4px 4px", overflow: "hidden" }, chartBar: { width: "100%", minHeight: 8, background: "var(--amber)", display: "flex", alignItems: "flex-start", justifyContent: "center", borderRadius: "8px 8px 0 0", paddingTop: 4, boxSizing: "border-box" }, chartBar span: { color: "#fff", fontSize: 10, fontWeight: 800 }, chartLabel: { fontSize: 11.5 }, quickGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 10 }, quick: { padding: 14, border: "1px solid var(--line)", borderRadius: "var(--radius)", display: "flex", flexDirection: "column", gap: 5 }, error: { background: "rgba(217,105,95,.12)", border: "1px solid var(--red)", color: "var(--red)", borderRadius: "var(--radius)", padding: "10px 12px", fontSize: 13, marginBottom: 16 },
};
