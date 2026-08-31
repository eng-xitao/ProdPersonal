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

export default function ClimaPage() {
  const { company } = useAuth();
  const [employees, setEmployees] = useState([]);
  const [checkins, setCheckins] = useState([]);
  const [surveys, setSurveys] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [checkinEmployeeId, setCheckinEmployeeId] = useState("");
  const [surveyTitle, setSurveyTitle] = useState("");
  const [savingSurvey, setSavingSurvey] = useState(false);

  async function loadAll() {
    setLoading(true);
    setError("");
    try {
      const [{ data: emp, error: e1 }, { data: ci, error: e2 }, { data: sv, error: e3 }] = await Promise.all([
        supabase.from("employees").select("id, full_name").eq("status", "ativo").order("full_name"),
        supabase.from("hr_climate_checkins").select("id, mood, checkin_date, employees:employee_id (full_name)").order("checkin_date", { ascending: false }).limit(30),
        supabase.from("hr_climate_surveys").select("id, title, status, created_at").order("created_at", { ascending: false }),
      ]);
      const firstError = e1 || e2 || e3;
      if (firstError) throw firstError;
      setEmployees(emp ?? []);
      setCheckins(ci ?? []);
      setSurveys(sv ?? []);
    } catch (err) {
      setError("Não foi possível carregar: " + (err.message ?? "erro desconhecido"));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { if (company?.id) loadAll(); }, [company?.id]);

  async function doCheckin(mood) {
    if (!checkinEmployeeId) { setError("Escolha o colaborador antes de marcar o humor."); return; }
    setError("");
    const { error: upsertError } = await supabase.from("hr_climate_checkins").upsert(
      { company_id: company.id, employee_id: checkinEmployeeId, mood, checkin_date: new Date().toISOString().slice(0, 10) },
      { onConflict: "employee_id,checkin_date" }
    );
    if (upsertError) { setError(upsertError.message); return; }
    await loadAll();
  }

  async function createSurvey(e) {
    e.preventDefault();
    if (!surveyTitle) return;
    setSavingSurvey(true);
    await supabase.from("hr_climate_surveys").insert({ company_id: company.id, title: surveyTitle });
    setSurveyTitle("");
    setSavingSurvey(false);
    await loadAll();
  }

  async function closeSurvey(id) {
    await supabase.from("hr_climate_surveys").update({ status: "encerrada" }).eq("id", id);
    await loadAll();
  }

  return (
    <div>
      <header style={{ marginBottom: 20 }}>
        <h1 style={styles.title}>Clima Organizacional</h1>
        <p style={styles.subtitle}>Check-in de humor do dia + pesquisas de clima (anônimas).</p>
      </header>

      {error && <div style={styles.error}>{error}</div>}

      <div style={styles.form}>
        <p style={styles.formTitle}>Check-in de hoje</p>
        <select style={styles.input} value={checkinEmployeeId} onChange={(e) => setCheckinEmployeeId(e.target.value)}>
          <option value="">Escolha o colaborador...</option>
          {employees.map((e) => <option key={e.id} value={e.id}>{e.full_name}</option>)}
        </select>
        <div style={styles.moodRow}>
          {MOODS.map((m) => (
            <button key={m.value} style={styles.moodBtn} onClick={() => doCheckin(m.value)} type="button" title={m.label}>
              {m.emoji}
            </button>
          ))}
        </div>
      </div>

      <h2 style={styles.title2}>Últimos check-ins</h2>
      {loading ? (
        <p style={styles.dim}>Carregando...</p>
      ) : checkins.length === 0 ? (
        <p style={styles.dim}>Nenhum check-in ainda.</p>
      ) : (
        <ul style={styles.list}>
          {checkins.map((c) => (
            <li key={c.id} style={styles.listItem}>
              {MOODS.find((m) => m.value === c.mood)?.emoji} {c.employees?.full_name} — {new Date(c.checkin_date + "T00:00:00").toLocaleDateString("pt-BR")}
            </li>
          ))}
        </ul>
      )}

      <h2 style={{ ...styles.title2, marginTop: 28 }}>Pesquisas de Clima</h2>
      <form onSubmit={createSurvey} style={styles.surveyForm}>
        <input style={styles.input} placeholder="Título da pesquisa" value={surveyTitle} onChange={(e) => setSurveyTitle(e.target.value)} />
        <button style={styles.saveBtn} type="submit" disabled={savingSurvey}>+ Criar pesquisa</button>
      </form>
      {surveys.length === 0 ? (
        <p style={styles.dim}>Nenhuma pesquisa criada ainda.</p>
      ) : (
        <ul style={styles.list}>
          {surveys.map((s) => (
            <li key={s.id} style={styles.listItem}>
              {s.title} — {s.status === "aberta" ? "Aberta" : "Encerrada"}
              {s.status === "aberta" && <button style={styles.smallBtn} onClick={() => closeSurvey(s.id)} type="button">Encerrar</button>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

const styles = {
  title: { fontFamily: "var(--font-display)", fontSize: 22, margin: 0 },
  title2: { fontFamily: "var(--font-display)", fontSize: 16, margin: "0 0 12px" },
  subtitle: { color: "var(--text-dim)", fontSize: 13, margin: "6px 0 0" },
  dim: { color: "var(--text-dim)", fontSize: 13 },
  form: { display: "flex", flexDirection: "column", gap: 14, background: "var(--panel)", border: "1px solid var(--line)", borderRadius: "var(--radius)", padding: 20, marginBottom: 28, maxWidth: 680 },
  formTitle: { fontSize: 13, fontWeight: 700, color: "var(--text-dim)", textTransform: "uppercase", letterSpacing: "0.04em", margin: 0 },
  input: { background: "var(--panel-2)", border: "1px solid var(--line)", borderRadius: "var(--radius)", padding: "9px 10px", color: "var(--text)", fontSize: 13, flex: 1 },
  moodRow: { display: "flex", gap: 10, justifyContent: "center" },
  moodBtn: { fontSize: 32, background: "transparent", border: "none", cursor: "pointer", padding: 6, borderRadius: "var(--radius)" },
  list: { listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 6, maxWidth: 680 },
  listItem: { background: "var(--panel)", border: "1px solid var(--line)", borderRadius: "var(--radius)", padding: "10px 14px", fontSize: 13, display: "flex", justifyContent: "space-between", alignItems: "center" },
  surveyForm: { display: "flex", gap: 8, marginBottom: 16, maxWidth: 680 },
  saveBtn: { background: "var(--amber)", color: "#FFFFFF", border: "none", borderRadius: "var(--radius)", padding: "9px 16px", fontWeight: 700, fontSize: 12.5, cursor: "pointer", whiteSpace: "nowrap" },
  smallBtn: { background: "transparent", border: "1px solid var(--line)", color: "var(--text-dim)", borderRadius: "var(--radius)", padding: "3px 10px", fontSize: 11, cursor: "pointer" },
  error: { background: "rgba(217,105,95,0.12)", border: "1px solid var(--red)", color: "var(--red)", borderRadius: "var(--radius)", padding: "10px 12px", fontSize: 13, marginBottom: 16, maxWidth: 680 },
};
