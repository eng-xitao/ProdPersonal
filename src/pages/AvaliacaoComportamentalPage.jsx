import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../lib/AuthContext";

const TRAITS = [
  { key: "dominance", label: "Dominância", desc: "Foco em resultado, decisão rápida, gosta de desafio" },
  { key: "influence", label: "Influência", desc: "Comunicativo, sociável, entusiasta" },
  { key: "steadiness", label: "Estabilidade", desc: "Paciente, colaborativo, constante" },
  { key: "compliance", label: "Conformidade", desc: "Detalhista, analítico, segue regras" },
];

export default function AvaliacaoComportamentalPage() {
  const { company } = useAuth();
  const [employees, setEmployees] = useState([]);
  const [assessments, setAssessments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [employeeId, setEmployeeId] = useState("");
  const [scores, setScores] = useState({ dominance: 50, influence: 50, steadiness: 50, compliance: 50 });
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  async function loadAll() {
    setLoading(true);
    setError("");
    try {
      const [{ data: emp, error: e1 }, { data: ass, error: e2 }] = await Promise.all([
        supabase.from("employees").select("id, full_name").eq("status", "ativo").order("full_name"),
        supabase.from("hr_behavioral_assessments").select("id, assessment_date, dominance, influence, steadiness, compliance, notes, employees:employee_id (full_name)").order("assessment_date", { ascending: false }).limit(50),
      ]);
      const firstError = e1 || e2;
      if (firstError) throw firstError;
      setEmployees(emp ?? []);
      setAssessments(ass ?? []);
    } catch (err) {
      setError("Não foi possível carregar: " + (err.message ?? "erro desconhecido"));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { if (company?.id) loadAll(); }, [company?.id]);

  async function createAssessment(e) {
    e.preventDefault();
    setError("");
    if (!employeeId) { setError("Escolha o colaborador."); return; }
    setSaving(true);

    const { error: insertError } = await supabase.from("hr_behavioral_assessments").insert({
      company_id: company.id, employee_id: employeeId, notes: notes || null, ...scores,
    });

    if (insertError) { setError(insertError.message); setSaving(false); return; }
    setEmployeeId(""); setScores({ dominance: 50, influence: 50, steadiness: 50, compliance: 50 }); setNotes("");
    setSaving(false);
    await loadAll();
  }

  function dominantTrait(a) {
    const values = { Dominância: a.dominance, Influência: a.influence, Estabilidade: a.steadiness, Conformidade: a.compliance };
    return Object.entries(values).sort((x, y) => y[1] - x[1])[0][0];
  }

  return (
    <div>
      <header style={{ marginBottom: 20 }}>
        <h1 style={styles.title}>Avaliação Comportamental</h1>
        <p style={styles.subtitle}>Perfil de comportamento (Dominância, Influência, Estabilidade, Conformidade) — ajuda a entender como cada pessoa trabalha melhor.</p>
      </header>

      {error && <div style={styles.error}>{error}</div>}

      <form onSubmit={createAssessment} style={styles.form}>
        <p style={styles.formTitle}>Nova avaliação</p>
        <select style={styles.input} value={employeeId} onChange={(e) => setEmployeeId(e.target.value)} required>
          <option value="">Colaborador...</option>
          {employees.map((e) => <option key={e.id} value={e.id}>{e.full_name}</option>)}
        </select>

        {TRAITS.map((t) => (
          <div key={t.key} style={styles.traitRow}>
            <div style={styles.traitLabel}>
              <strong>{t.label}</strong>
              <span style={styles.dim}>{t.desc}</span>
            </div>
            <input
              type="range" min="0" max="100" value={scores[t.key]}
              onChange={(e) => setScores((s) => ({ ...s, [t.key]: Number(e.target.value) }))}
              style={styles.slider}
            />
            <span style={styles.traitValue}>{scores[t.key]}</span>
          </div>
        ))}

        <input style={styles.input} placeholder="Observações (opcional)" value={notes} onChange={(e) => setNotes(e.target.value)} />
        <button style={styles.saveBtn} type="submit" disabled={saving}>{saving ? "Salvando..." : "Registrar avaliação"}</button>
      </form>

      <h2 style={styles.title2}>Avaliações registradas</h2>
      {loading ? (
        <p style={styles.dim}>Carregando...</p>
      ) : assessments.length === 0 ? (
        <p style={styles.dim}>Nenhuma avaliação registrada ainda.</p>
      ) : (
        <div style={styles.list}>
          {assessments.map((a) => (
            <div key={a.id} style={styles.card}>
              <strong>{a.employees?.full_name}</strong>
              <span style={styles.dim}> · Perfil predominante: {dominantTrait(a)}</span>
              <div style={styles.barsRow}>
                {TRAITS.map((t) => (
                  <div key={t.key} style={styles.barItem}>
                    <span style={styles.barLabel}>{t.label[0]}</span>
                    <div style={styles.barTrack}>
                      <div style={{ ...styles.barFill, width: `${a[t.key]}%` }} />
                    </div>
                  </div>
                ))}
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
  title2: { fontFamily: "var(--font-display)", fontSize: 16, margin: "0 0 12px" },
  subtitle: { color: "var(--text-dim)", fontSize: 13, margin: "6px 0 0" },
  dim: { color: "var(--text-dim)", fontSize: 12 },
  form: { display: "flex", flexDirection: "column", gap: 12, background: "var(--panel)", border: "1px solid var(--line)", borderRadius: "var(--radius)", padding: 20, marginBottom: 28, maxWidth: 680 },
  formTitle: { fontSize: 13, fontWeight: 700, color: "var(--text-dim)", textTransform: "uppercase", letterSpacing: "0.04em", margin: "0 0 4px" },
  input: { background: "var(--panel-2)", border: "1px solid var(--line)", borderRadius: "var(--radius)", padding: "9px 10px", color: "var(--text)", fontSize: 13 },
  traitRow: { display: "flex", alignItems: "center", gap: 12 },
  traitLabel: { display: "flex", flexDirection: "column", width: 160, flexShrink: 0 },
  slider: { flex: 1 },
  traitValue: { width: 30, textAlign: "right", fontSize: 13, fontWeight: 700 },
  saveBtn: { background: "var(--amber)", color: "#FFFFFF", border: "none", borderRadius: "var(--radius)", padding: "10px 0", fontWeight: 700, fontSize: 13, cursor: "pointer" },
  list: { display: "flex", flexDirection: "column", gap: 12, maxWidth: 680 },
  card: { background: "var(--panel)", border: "1px solid var(--line)", borderRadius: "var(--radius)", padding: 16 },
  barsRow: { display: "flex", gap: 12, marginTop: 10 },
  barItem: { display: "flex", flexDirection: "column", alignItems: "center", gap: 4, flex: 1 },
  barLabel: { fontSize: 11, fontWeight: 700, color: "var(--text-dim)" },
  barTrack: { width: "100%", height: 6, background: "var(--panel-2)", borderRadius: 3, overflow: "hidden" },
  barFill: { height: "100%", background: "var(--amber)" },
  error: { background: "rgba(217,105,95,0.12)", border: "1px solid var(--red)", color: "var(--red)", borderRadius: "var(--radius)", padding: "10px 12px", fontSize: 13, marginBottom: 16, maxWidth: 680 },
};
