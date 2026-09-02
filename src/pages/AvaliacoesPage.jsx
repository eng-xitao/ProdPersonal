import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../lib/AuthContext";

const TYPE_LABEL = { gestor: "Gestor", autoavaliacao: "Autoavaliação", pares: "Pares", subordinados: "Subordinados" };
const STATUS_LABEL = { aberta: "Aberta", concluida: "Concluída" };
const STATUS_COLOR = { aberta: "var(--amber)", concluida: "var(--green)" };

export default function AvaliacoesPage() {
  const { company, profile } = useAuth();
  const [employees, setEmployees] = useState([]);
  const [competencies, setCompetencies] = useState([]);
  const [jobRequirements, setJobRequirements] = useState({});
  const [evaluations, setEvaluations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [employeeId, setEmployeeId] = useState("");
  const [cycleName, setCycleName] = useState("");
  const [evaluationType, setEvaluationType] = useState("gestor");
  const [saving, setSaving] = useState(false);

  const [expandedId, setExpandedId] = useState(null);
  const [scores, setScores] = useState({});

  async function loadAll() {
    setLoading(true);
    setError("");
    try {
      const [{ data: emp, error: e1 }, { data: comp, error: e2 }, { data: ev, error: e3 }, { data: jobs, error: e4 }] = await Promise.all([
        supabase.from("employees").select("id, full_name, role").eq("status", "ativo").order("full_name"),
        supabase.from("hr_competencies").select("id, name, category").order("name"),
        supabase.from("hr_performance_evaluations").select("id, cycle_name, evaluation_type, status, overall_score, created_at, employee_id, employees:employee_id (full_name, role)").order("created_at", { ascending: false }),
        supabase.from("hr_job_descriptions").select("title, hr_job_competency_requirements (competency_id, required_level)"),
      ]);
      const firstError = e1 || e2 || e3 || e4;
      if (firstError) throw firstError;
      setEmployees(emp ?? []);
      setCompetencies(comp ?? []);
      setEvaluations(ev ?? []);
      const reqByTitle = {};
      (jobs ?? []).forEach((j) => { reqByTitle[j.title] = j.hr_job_competency_requirements ?? []; });
      setJobRequirements(reqByTitle);
    } catch (err) {
      setError("Não foi possível carregar: " + (err.message ?? "erro desconhecido"));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { if (company?.id) loadAll(); }, [company?.id]);

  async function createEvaluation(e) {
    e.preventDefault();
    setError("");
    if (!employeeId || !cycleName) { setError("Escolha o colaborador e dê um nome ao ciclo."); return; }
    setSaving(true);

    const { error: insertError } = await supabase.from("hr_performance_evaluations").insert({
      company_id: company.id, employee_id: employeeId, cycle_name: cycleName,
      evaluation_type: evaluationType, evaluator_profile_id: profile.id,
    });

    if (insertError) { setError(insertError.message); setSaving(false); return; }
    setEmployeeId(""); setCycleName("");
    setSaving(false);
    await loadAll();
  }

  async function loadScores(evaluationId) {
    const { data } = await supabase.from("hr_evaluation_scores").select("id, competency_id, score, comments").eq("evaluation_id", evaluationId);
    const map = {};
    (data ?? []).forEach((s) => { map[s.competency_id] = s; });
    setScores(map);
  }

  function toggleExpand(evaluation) {
    if (expandedId === evaluation.id) { setExpandedId(null); return; }
    setExpandedId(evaluation.id);
    loadScores(evaluation.id);
  }

  async function saveScore(evaluationId, competencyId, value) {
    const existing = scores[competencyId];
    if (existing) {
      await supabase.from("hr_evaluation_scores").update({ score: Number(value) }).eq("id", existing.id);
    } else {
      await supabase.from("hr_evaluation_scores").insert({ company_id: company.id, evaluation_id: evaluationId, competency_id: competencyId, score: Number(value) });
    }
    await loadScores(evaluationId);
  }

  async function concludeEvaluation(evaluationId) {
    const evalScores = Object.values(scores);
    const average = evalScores.length > 0 ? evalScores.reduce((sum, s) => sum + Number(s.score), 0) / evalScores.length : null;
    await supabase.from("hr_performance_evaluations").update({ status: "concluida", overall_score: average }).eq("id", evaluationId);
    setExpandedId(null);
    await loadAll();
  }

  function requiredLevelFor(evaluation, competencyId) {
    const role = evaluation.employees?.role;
    if (!role) return null;
    const reqs = jobRequirements[role];
    if (!reqs) return null;
    const found = reqs.find((r) => r.competency_id === competencyId);
    return found ? Number(found.required_level) : null;
  }

  return (
    <div>
      <header style={{ marginBottom: 20 }}>
        <h1 style={styles.title}>Avaliação de Desempenho</h1>
        <p style={styles.subtitle}>Crie o ciclo, avalie por competência de 0 a 10. Se o cargo tiver nível exigido cadastrado (em Descrição de Cargos), o gap aparece automático.</p>
      </header>

      {error && <div style={styles.error}>{error}</div>}

      <form onSubmit={createEvaluation} style={styles.form}>
        <p style={styles.formTitle}>Nova avaliação</p>
        <div style={styles.row}>
          <select style={styles.input} value={employeeId} onChange={(e) => setEmployeeId(e.target.value)} required>
            <option value="">Colaborador...</option>
            {employees.map((e) => <option key={e.id} value={e.id}>{e.full_name} — {e.role}</option>)}
          </select>
          <input style={styles.input} placeholder="Nome do ciclo (ex: 2026 - 1º semestre)" value={cycleName} onChange={(e) => setCycleName(e.target.value)} required />
          <select style={styles.input} value={evaluationType} onChange={(e) => setEvaluationType(e.target.value)}>
            {Object.entries(TYPE_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </div>
        <button style={styles.saveBtn} type="submit" disabled={saving}>{saving ? "Criando..." : "Criar avaliação"}</button>
      </form>

      {loading ? (
        <p style={styles.dim}>Carregando...</p>
      ) : evaluations.length === 0 ? (
        <p style={styles.dim}>Nenhuma avaliação criada ainda.</p>
      ) : (
        <div style={styles.list}>
          {evaluations.map((ev) => (
            <div key={ev.id} style={styles.card}>
              <div style={styles.cardHeader}>
                <div>
                  <strong>{ev.employees?.full_name}</strong>
                  <span style={styles.dim}> · {ev.cycle_name} · {TYPE_LABEL[ev.evaluation_type]}</span>
                </div>
                <span style={{ ...styles.statusBadge, color: STATUS_COLOR[ev.status] }}>
                  {STATUS_LABEL[ev.status]}{ev.overall_score != null && ` — ${Number(ev.overall_score).toFixed(1)}`}
                </span>
              </div>
              <button style={styles.expandBtn} onClick={() => toggleExpand(ev)} type="button">
                {expandedId === ev.id ? "Fechar" : "Avaliar competências"}
              </button>

              {expandedId === ev.id && (
                <div style={styles.detailsBox}>
                  {competencies.length === 0 ? (
                    <p style={styles.dim}>Cadastre competências primeiro, em Competências.</p>
                  ) : (
                    <div style={styles.competencyGrid}>
                      <div style={styles.competencyHeader}>
                        <span style={styles.competencyHeaderName}>Competência</span>
                        <span style={styles.competencyHeaderCol}>Nota</span>
                        <span style={styles.competencyHeaderCol}>Exigido</span>
                        <span style={styles.competencyHeaderCol}>Gap</span>
                      </div>
                      {competencies.map((c) => {
                        const required = requiredLevelFor(ev, c.id);
                        const given = scores[c.id]?.score;
                        const gap = required != null && given != null ? Number(given) - required : null;
                        return (
                          <div key={c.id} style={styles.competencyRow}>
                            <span style={styles.competencyName}>{c.name}</span>
                            <select
                              style={styles.scoreSelect}
                              value={given ?? ""}
                              onChange={(e) => saveScore(ev.id, c.id, e.target.value)}
                              disabled={ev.status === "concluida"}
                            >
                              <option value="">—</option>
                              {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => <option key={n} value={n}>{n}</option>)}
                            </select>
                            <span style={styles.competencyHeaderCol}>{required ?? "—"}</span>
                            <span style={{ ...styles.competencyHeaderCol, fontWeight: 700, color: gap == null ? "var(--text-dim)" : gap < 0 ? "var(--red)" : gap > 0 ? "var(--green)" : "var(--text)" }}>
                              {gap == null ? "—" : gap > 0 ? `+${gap}` : gap}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                  {ev.status !== "concluida" && (
                    <button style={styles.concludeBtn} onClick={() => concludeEvaluation(ev.id)} type="button">Concluir avaliação</button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const styles = {
  title: { fontFamily: "var(--font-display)", fontSize: 22, margin: 0 },
  subtitle: { color: "var(--text-dim)", fontSize: 13, margin: "6px 0 0" },
  dim: { color: "var(--text-dim)", fontSize: 12.5 },
  form: { display: "flex", flexDirection: "column", gap: 12, background: "var(--panel)", border: "1px solid var(--line)", borderRadius: "var(--radius)", padding: 20, marginBottom: 28, maxWidth: 780 },
  formTitle: { fontSize: 13, fontWeight: 700, color: "var(--text-dim)", textTransform: "uppercase", letterSpacing: "0.04em", margin: "0 0 4px" },
  row: { display: "flex", gap: 10, flexWrap: "wrap" },
  input: { flex: 1, minWidth: 150, background: "var(--panel-2)", border: "1px solid var(--line)", borderRadius: "var(--radius)", padding: "9px 10px", color: "var(--text)", fontSize: 13 },
  saveBtn: { background: "var(--amber)", color: "#FFFFFF", border: "none", borderRadius: "var(--radius)", padding: "10px 0", fontWeight: 700, fontSize: 13, cursor: "pointer" },
  list: { display: "flex", flexDirection: "column", gap: 12, maxWidth: 780 },
  card: { background: "var(--panel)", border: "1px solid var(--line)", borderRadius: "var(--radius)", padding: 16 },
  cardHeader: { display: "flex", justifyContent: "space-between", marginBottom: 4, flexWrap: "wrap", gap: 6 },
  statusBadge: { fontSize: 12, fontWeight: 700, whiteSpace: "nowrap" },
  expandBtn: { marginTop: 8, background: "transparent", border: "1px solid var(--line)", color: "var(--text-dim)", borderRadius: "var(--radius)", padding: "6px 14px", fontSize: 12, cursor: "pointer" },
  detailsBox: { marginTop: 12, paddingTop: 12, borderTop: "1px solid var(--line)" },
  competencyGrid: { display: "flex", flexDirection: "column", gap: 6, marginBottom: 12 },
  competencyHeader: { display: "grid", gridTemplateColumns: "1fr 70px 70px 60px", gap: 8, fontSize: 10.5, fontWeight: 700, color: "var(--text-dim)", textTransform: "uppercase", paddingBottom: 4 },
  competencyHeaderName: {},
  competencyHeaderCol: { textAlign: "center" },
  competencyRow: { display: "grid", gridTemplateColumns: "1fr 70px 70px 60px", gap: 8, alignItems: "center" },
  competencyName: { fontSize: 13 },
  scoreSelect: { background: "var(--panel-2)", border: "1px solid var(--line)", borderRadius: "var(--radius)", padding: "5px 6px", color: "var(--text)", fontSize: 13, textAlign: "center" },
  concludeBtn: { background: "var(--green)", color: "#FFFFFF", border: "none", borderRadius: "var(--radius)", padding: "9px 18px", fontWeight: 700, fontSize: 12.5, cursor: "pointer" },
  error: { background: "rgba(217,105,95,0.12)", border: "1px solid var(--red)", color: "var(--red)", borderRadius: "var(--radius)", padding: "10px 12px", fontSize: 13, marginBottom: 16, maxWidth: 780 },
};
