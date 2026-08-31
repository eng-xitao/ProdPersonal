import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../lib/AuthContext";

const RESULT_LABEL = { pendente: "Pendente", aprovado: "Aprovado", atencao: "Atenção", reprovado: "Reprovado" };
const RESULT_COLOR = { pendente: "var(--amber)", aprovado: "var(--green)", atencao: "var(--amber)", reprovado: "var(--red)" };
const DECISION_LABEL = { pendente: "Pendente", efetivado: "Efetivado", desligado: "Desligado" };
const DECISION_COLOR = { pendente: "var(--amber)", efetivado: "var(--green)", desligado: "var(--red)" };

function addDays(dateStr, days) {
  const d = new Date(dateStr + "T00:00:00");
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export default function AvaliacaoExperienciaPage() {
  const { company } = useAuth();
  const [employees, setEmployees] = useState([]);
  const [evaluations, setEvaluations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [employeeId, setEmployeeId] = useState("");
  const [saving, setSaving] = useState(false);

  async function loadAll() {
    setLoading(true);
    setError("");
    try {
      const [{ data: emp, error: e1 }, { data: ev, error: e2 }] = await Promise.all([
        supabase.from("employees").select("id, full_name, hire_date, contract_type").eq("status", "ativo").eq("contract_type", "clt").order("full_name"),
        supabase.from("hr_experience_evaluations").select("id, admission_date, first_period_end, second_period_end, first_result, second_result, final_decision, employees:employee_id (full_name)").order("created_at", { ascending: false }),
      ]);
      const firstError = e1 || e2;
      if (firstError) throw firstError;
      setEmployees(emp ?? []);
      setEvaluations(ev ?? []);
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
    if (!employeeId) { setError("Escolha o colaborador."); return; }
    setSaving(true);

    const employee = employees.find((x) => x.id === employeeId);
    if (!employee?.hire_date) { setError("Esse colaborador não tem data de admissão cadastrada."); setSaving(false); return; }

    const { error: insertError } = await supabase.from("hr_experience_evaluations").insert({
      company_id: company.id, employee_id: employeeId, admission_date: employee.hire_date,
      first_period_end: addDays(employee.hire_date, 45), second_period_end: addDays(employee.hire_date, 90),
    });

    if (insertError) { setError(insertError.message); setSaving(false); return; }
    setEmployeeId("");
    setSaving(false);
    await loadAll();
  }

  async function updateField(id, field, value) {
    await supabase.from("hr_experience_evaluations").update({ [field]: value }).eq("id", id);
    await loadAll();
  }

  return (
    <div>
      <header style={{ marginBottom: 20 }}>
        <h1 style={styles.title}>Avaliação de Experiência</h1>
        <p style={styles.subtitle}>Período de 45+45 dias da CLT — decide se o colaborador é efetivado ou desligado antes do contrato virar prazo indeterminado.</p>
      </header>

      {error && <div style={styles.error}>{error}</div>}

      <form onSubmit={createEvaluation} style={styles.form}>
        <p style={styles.formTitle}>Iniciar acompanhamento</p>
        <div style={styles.row}>
          <select style={styles.input} value={employeeId} onChange={(e) => setEmployeeId(e.target.value)} required>
            <option value="">Colaborador CLT recém-admitido...</option>
            {employees.map((e) => <option key={e.id} value={e.id}>{e.full_name}</option>)}
          </select>
          <button style={styles.saveBtn} type="submit" disabled={saving}>{saving ? "Criando..." : "Calcular prazos"}</button>
        </div>
      </form>

      {loading ? (
        <p style={styles.dim}>Carregando...</p>
      ) : evaluations.length === 0 ? (
        <p style={styles.dim}>Nenhum acompanhamento em andamento.</p>
      ) : (
        <div style={styles.list}>
          {evaluations.map((ev) => (
            <div key={ev.id} style={styles.card}>
              <div style={styles.cardHeader}>
                <strong>{ev.employees?.full_name}</strong>
                <span style={{ ...styles.decisionBadge, color: DECISION_COLOR[ev.final_decision] }}>{DECISION_LABEL[ev.final_decision]}</span>
              </div>

              <div style={styles.periodRow}>
                <div style={styles.period}>
                  <span style={styles.periodLabel}>1º período (45 dias) — até {new Date(ev.first_period_end + "T00:00:00").toLocaleDateString("pt-BR")}</span>
                  <select style={{ ...styles.select, color: RESULT_COLOR[ev.first_result] }} value={ev.first_result} onChange={(e) => updateField(ev.id, "first_result", e.target.value)}>
                    <option value="pendente">Pendente</option>
                    <option value="aprovado">Aprovado</option>
                    <option value="atencao">Atenção</option>
                  </select>
                </div>
                <div style={styles.period}>
                  <span style={styles.periodLabel}>2º período (90 dias) — até {new Date(ev.second_period_end + "T00:00:00").toLocaleDateString("pt-BR")}</span>
                  <select style={{ ...styles.select, color: RESULT_COLOR[ev.second_result] }} value={ev.second_result} onChange={(e) => updateField(ev.id, "second_result", e.target.value)}>
                    <option value="pendente">Pendente</option>
                    <option value="aprovado">Aprovado</option>
                    <option value="reprovado">Reprovado</option>
                  </select>
                </div>
              </div>

              <div style={styles.decisionRow}>
                <span style={styles.periodLabel}>Decisão final</span>
                <select style={{ ...styles.select, color: DECISION_COLOR[ev.final_decision] }} value={ev.final_decision} onChange={(e) => updateField(ev.id, "final_decision", e.target.value)}>
                  <option value="pendente">Pendente</option>
                  <option value="efetivado">Efetivado</option>
                  <option value="desligado">Desligado</option>
                </select>
              </div>
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
  dim: { color: "var(--text-dim)", fontSize: 13 },
  form: { background: "var(--panel)", border: "1px solid var(--line)", borderRadius: "var(--radius)", padding: 18, marginBottom: 20, maxWidth: 680 },
  formTitle: { fontSize: 13, fontWeight: 700, color: "var(--text-dim)", textTransform: "uppercase", letterSpacing: "0.04em", margin: "0 0 12px" },
  row: { display: "flex", gap: 10 },
  input: { flex: 1, background: "var(--panel-2)", border: "1px solid var(--line)", borderRadius: "var(--radius)", padding: "9px 10px", color: "var(--text)", fontSize: 13 },
  saveBtn: { background: "var(--amber)", color: "#FFFFFF", border: "none", borderRadius: "var(--radius)", padding: "9px 18px", fontWeight: 700, fontSize: 13, cursor: "pointer", whiteSpace: "nowrap" },
  list: { display: "flex", flexDirection: "column", gap: 12, maxWidth: 680 },
  card: { background: "var(--panel)", border: "1px solid var(--line)", borderRadius: "var(--radius)", padding: 16 },
  cardHeader: { display: "flex", justifyContent: "space-between", marginBottom: 12 },
  decisionBadge: { fontSize: 12, fontWeight: 700 },
  periodRow: { display: "flex", gap: 16, marginBottom: 12, flexWrap: "wrap" },
  period: { flex: 1, minWidth: 200, display: "flex", flexDirection: "column", gap: 4 },
  periodLabel: { fontSize: 11.5, color: "var(--text-dim)" },
  select: { background: "var(--panel-2)", border: "1px solid var(--line)", borderRadius: "var(--radius)", padding: "6px 10px", fontSize: 13, fontWeight: 700 },
  decisionRow: { display: "flex", flexDirection: "column", gap: 4, paddingTop: 10, borderTop: "1px solid var(--line)" },
  error: { background: "rgba(217,105,95,0.12)", border: "1px solid var(--red)", color: "var(--red)", borderRadius: "var(--radius)", padding: "10px 12px", fontSize: 13, marginBottom: 16, maxWidth: 680 },
};
