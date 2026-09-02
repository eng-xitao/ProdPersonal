import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../lib/AuthContext";

const TRAITS = [
  { key: "dominance", label: "Dominância", short: "D", desc: "Foco em resultado, decisão rápida, gosta de desafio" },
  { key: "influence", label: "Influência", short: "I", desc: "Comunicativo, sociável, entusiasta" },
  { key: "steadiness", label: "Estabilidade", short: "S", desc: "Paciente, colaborativo, constante" },
  { key: "compliance", label: "Conformidade", short: "C", desc: "Detalhista, analítico, segue regras" },
];

const PROFILE_INFO = {
  dominance: {
    name: "Executor (Dominante)",
    communication: "Direta, objetiva e focada em metas.",
    environment: "Desafiador, com autonomia e rapidez.",
    attention: "Impaciência e pouca escuta ativa.",
  },
  influence: {
    name: "Comunicador (Influente)",
    communication: "Entusiasta, persuasiva e amigável.",
    environment: "Colaborativo, social e dinâmico.",
    attention: "Dificuldade com detalhes e rotina.",
  },
  steadiness: {
    name: "Planejador (Estável)",
    communication: "Calma, paciente e ponderada.",
    environment: "Com processos claros e ritmo constante.",
    attention: "Resistência a mudanças bruscas.",
  },
  compliance: {
    name: "Analista (Conforme)",
    communication: "Lógica, focada em fatos e dados.",
    environment: "Com processos claros e definidos.",
    attention: "Evitar centralizar tarefas pra checar detalhes.",
  },
};

// Gráfico radar (roda) em SVG puro — 4 eixos, um por traço DISC.
function RadarChart({ scores }) {
  const size = 260;
  const center = size / 2;
  const maxRadius = 95;
  const angleStep = (Math.PI * 2) / 4;

  function pointFor(index, value) {
    const angle = angleStep * index - Math.PI / 2;
    const r = (value / 100) * maxRadius;
    return [center + r * Math.cos(angle), center + r * Math.sin(angle)];
  }

  const points = TRAITS.map((t, i) => pointFor(i, scores[t.key])).map((p) => p.join(",")).join(" ");
  const gridLevels = [25, 50, 75, 100];

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {gridLevels.map((lvl) => {
        const pts = TRAITS.map((_, i) => pointFor(i, lvl)).map((p) => p.join(",")).join(" ");
        return <polygon key={lvl} points={pts} fill="none" stroke="var(--line)" strokeWidth="1" />;
      })}
      {TRAITS.map((t, i) => {
        const [x, y] = pointFor(i, 105);
        return <text key={t.key} x={x} y={y} textAnchor="middle" fontSize="11" fontWeight="700" fill="var(--text-dim)">{t.short}</text>;
      })}
      <polygon points={points} fill="var(--amber)" fillOpacity="0.25" stroke="var(--amber)" strokeWidth="2" />
      {TRAITS.map((t, i) => {
        const [x, y] = pointFor(i, scores[t.key]);
        return <circle key={t.key} cx={x} cy={y} r="3.5" fill="var(--amber)" />;
      })}
    </svg>
  );
}

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

  function dominantKey(a) {
    return Object.entries({ dominance: a.dominance, influence: a.influence, steadiness: a.steadiness, compliance: a.compliance })
      .sort((x, y) => y[1] - x[1])[0][0];
  }

  return (
    <div>
      <header style={{ marginBottom: 20 }}>
        <h1 style={styles.title}>Avaliação Comportamental (DISC)</h1>
        <p style={styles.subtitle}>Perfil de comportamento — ajuda a entender como cada pessoa trabalha e se comunica melhor.</p>
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
          {assessments.map((a) => {
            const dKey = dominantKey(a);
            const info = PROFILE_INFO[dKey];
            return (
              <div key={a.id} style={styles.card}>
                <div style={styles.cardTop}>
                  <RadarChart scores={a} />
                  <div style={styles.cardInfo}>
                    <strong>{a.employees?.full_name}</strong>
                    <span style={styles.profileName}>{info.name}</span>
                    <div style={styles.infoRow}><span style={styles.infoLabel}>Comunicação</span><span>{info.communication}</span></div>
                    <div style={styles.infoRow}><span style={styles.infoLabel}>Ambiente ideal</span><span>{info.environment}</span></div>
                    <div style={styles.infoRow}><span style={styles.infoLabel}>Ponto de atenção</span><span>{info.attention}</span></div>
                  </div>
                </div>
              </div>
            );
          })}
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
  list: { display: "flex", flexDirection: "column", gap: 12, maxWidth: 700 },
  card: { background: "var(--panel)", border: "1px solid var(--line)", borderRadius: "var(--radius)", padding: 16 },
  cardTop: { display: "flex", gap: 20, alignItems: "center", flexWrap: "wrap" },
  cardInfo: { display: "flex", flexDirection: "column", gap: 4, flex: 1, minWidth: 200 },
  profileName: { fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 15, color: "var(--amber)" },
  infoRow: { display: "flex", gap: 6, fontSize: 12.5 },
  infoLabel: { fontWeight: 700, color: "var(--text-dim)", minWidth: 100 },
  error: { background: "rgba(217,105,95,0.12)", border: "1px solid var(--red)", color: "var(--red)", borderRadius: "var(--radius)", padding: "10px 12px", fontSize: 13, marginBottom: 16, maxWidth: 680 },
};
