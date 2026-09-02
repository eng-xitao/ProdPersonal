import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../lib/AuthContext";

const QUADRANT_INFO = {
  "3-3": { name: "Estrela", color: "#4FAE7E", action: "Aceleração de carreira, retenção e plano de sucessão." },
  "3-2": { name: "Forte Desempenho", color: "#4FAE7E", action: "Manter motivado, novos desafios e bonificação." },
  "3-1": { name: "Especialista", color: "#2563EB", action: "Reconhecer a entrega, avaliar se cargo é o ideal." },
  "2-3": { name: "Enigma / Promissor", color: "#E8A33D", action: "Mentoria de liderança pra transformar potencial em resultado." },
  "2-2": { name: "Mantenedor", color: "#E8A33D", action: "Desenvolvimento contínuo, manter engajamento." },
  "2-1": { name: "Efetivo", color: "#E8A33D", action: "Reforçar treinamento técnico e acompanhamento." },
  "1-3": { name: "Diamante Bruto", color: "#E8A33D", action: "Investir em desenvolvimento — potencial não convertido ainda." },
  "1-2": { name: "Questionável", color: "#D9695F", action: "Plano de ação com prazo definido." },
  "1-1": { name: "Risco / Insuficiente", color: "#D9695F", action: "Plano de Ação Imediato (PIP) ou readequação de função." },
};

export default function NineBoxPage() {
  const { company } = useAuth();
  const [employees, setEmployees] = useState([]);
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [employeeId, setEmployeeId] = useState("");
  const [cycleName, setCycleName] = useState("");
  const [performanceLevel, setPerformanceLevel] = useState(2);
  const [potentialLevel, setPotentialLevel] = useState(2);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  async function loadAll() {
    setLoading(true);
    setError("");
    try {
      const [{ data: emp, error: e1 }, { data: nb, error: e2 }] = await Promise.all([
        supabase.from("employees").select("id, full_name, role").eq("status", "ativo").order("full_name"),
        supabase.from("hr_nine_box").select("id, cycle_name, performance_level, potential_level, notes, employees:employee_id (full_name, role)").order("created_at", { ascending: false }),
      ]);
      const firstError = e1 || e2;
      if (firstError) throw firstError;
      setEmployees(emp ?? []);
      setEntries(nb ?? []);
    } catch (err) {
      setError("Não foi possível carregar: " + (err.message ?? "erro desconhecido"));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { if (company?.id) loadAll(); }, [company?.id]);

  async function createEntry(e) {
    e.preventDefault();
    setError("");
    if (!employeeId || !cycleName) { setError("Escolha o colaborador e dê um nome ao ciclo."); return; }
    setSaving(true);
    const { error: insertError } = await supabase.from("hr_nine_box").insert({
      company_id: company.id, employee_id: employeeId, cycle_name: cycleName,
      performance_level: performanceLevel, potential_level: potentialLevel, notes: notes || null,
    });
    if (insertError) { setError(insertError.message); setSaving(false); return; }
    setEmployeeId(""); setCycleName(""); setPerformanceLevel(2); setPotentialLevel(2); setNotes("");
    setSaving(false);
    await loadAll();
  }

  const latestByEmployee = {};
  entries.forEach((e) => { if (!latestByEmployee[e.employees?.full_name]) latestByEmployee[e.employees?.full_name] = e; });
  const grid = Object.values(latestByEmployee);

  return (
    <div>
      <header style={{ marginBottom: 20 }}>
        <h1 style={styles.title}>Matriz Nine Box</h1>
        <p style={styles.subtitle}>Cruza Desempenho x Potencial — mapeia sucessão, retenção e risco de saída.</p>
      </header>

      {error && <div style={styles.error}>{error}</div>}

      <form onSubmit={createEntry} style={styles.form}>
        <p style={styles.formTitle}>Novo posicionamento</p>
        <div style={styles.row}>
          <select style={styles.input} value={employeeId} onChange={(e) => setEmployeeId(e.target.value)} required>
            <option value="">Colaborador...</option>
            {employees.map((e) => <option key={e.id} value={e.id}>{e.full_name}</option>)}
          </select>
          <input style={styles.input} placeholder="Ciclo (ex: 2026 - 2º semestre)" value={cycleName} onChange={(e) => setCycleName(e.target.value)} required />
        </div>
        <div style={styles.row}>
          <div style={styles.selectGroup}>
            <span style={styles.selectLabel}>Desempenho</span>
            <select style={styles.input} value={performanceLevel} onChange={(e) => setPerformanceLevel(Number(e.target.value))}>
              <option value={1}>Baixo</option><option value={2}>Médio</option><option value={3}>Alto</option>
            </select>
          </div>
          <div style={styles.selectGroup}>
            <span style={styles.selectLabel}>Potencial</span>
            <select style={styles.input} value={potentialLevel} onChange={(e) => setPotentialLevel(Number(e.target.value))}>
              <option value={1}>Baixo</option><option value={2}>Médio</option><option value={3}>Alto</option>
            </select>
          </div>
        </div>
        <input style={styles.input} placeholder="Observações (opcional)" value={notes} onChange={(e) => setNotes(e.target.value)} />
        <button style={styles.saveBtn} type="submit" disabled={saving}>{saving ? "Salvando..." : "Posicionar na matriz"}</button>
      </form>

      {loading ? (
        <p style={styles.dim}>Carregando...</p>
      ) : (
        <div style={styles.matrixWrap}>
          <div style={styles.matrixAxisY}>Potencial ↑</div>
          <div style={styles.matrix}>
            {[3, 2, 1].map((pot) =>
              [1, 2, 3].map((perf) => {
                const key = `${perf}-${pot}`;
                const info = QUADRANT_INFO[key];
                const people = grid.filter((g) => g.performance_level === perf && g.potential_level === pot);
                return (
                  <div key={key} style={{ ...styles.cell, borderColor: info.color }}>
                    <span style={{ ...styles.cellName, color: info.color }}>{info.name}</span>
                    <div style={styles.cellPeople}>
                      {people.length === 0 ? <span style={styles.dim}>—</span> : people.map((p) => (
                        <span key={p.id} style={styles.personChip}>{p.employees?.full_name}</span>
                      ))}
                    </div>
                  </div>
                );
              })
            )}
          </div>
          <div style={styles.matrixAxisX}>Desempenho →</div>
        </div>
      )}
    </div>
  );
}

const styles = {
  title: { fontFamily: "var(--font-display)", fontSize: 22, margin: 0 },
  subtitle: { color: "var(--text-dim)", fontSize: 13, margin: "6px 0 0" },
  dim: { color: "var(--text-dim)", fontSize: 11.5 },
  form: { display: "flex", flexDirection: "column", gap: 12, background: "var(--panel)", border: "1px solid var(--line)", borderRadius: "var(--radius)", padding: 20, marginBottom: 28, maxWidth: 680 },
  formTitle: { fontSize: 13, fontWeight: 700, color: "var(--text-dim)", textTransform: "uppercase", letterSpacing: "0.04em", margin: "0 0 4px" },
  row: { display: "flex", gap: 10, flexWrap: "wrap" },
  selectGroup: { flex: 1, minWidth: 140, display: "flex", flexDirection: "column", gap: 4 },
  selectLabel: { fontSize: 11, color: "var(--text-dim)" },
  input: { flex: 1, minWidth: 140, background: "var(--panel-2)", border: "1px solid var(--line)", borderRadius: "var(--radius)", padding: "9px 10px", color: "var(--text)", fontSize: 13 },
  saveBtn: { background: "var(--amber)", color: "#FFFFFF", border: "none", borderRadius: "var(--radius)", padding: "10px 0", fontWeight: 700, fontSize: 13, cursor: "pointer" },
  matrixWrap: { display: "flex", flexDirection: "column", gap: 6, maxWidth: 760 },
  matrixAxisY: { fontSize: 12, fontWeight: 700, color: "var(--text-dim)" },
  matrix: { display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 },
  cell: { border: "2px solid", borderRadius: "var(--radius)", padding: 12, minHeight: 100, display: "flex", flexDirection: "column", gap: 8, background: "var(--panel)" },
  cellName: { fontSize: 12, fontWeight: 800 },
  cellPeople: { display: "flex", flexDirection: "column", gap: 4 },
  personChip: { fontSize: 11.5, background: "var(--panel-2)", borderRadius: 6, padding: "3px 8px" },
  matrixAxisX: { fontSize: 12, fontWeight: 700, color: "var(--text-dim)", textAlign: "right" },
  error: { background: "rgba(217,105,95,0.12)", border: "1px solid var(--red)", color: "var(--red)", borderRadius: "var(--radius)", padding: "10px 12px", fontSize: 13, marginBottom: 16, maxWidth: 680 },
};
