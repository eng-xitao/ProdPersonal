import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../lib/AuthContext";

const STATUS_LABEL = { nova: "Nova", em_analise: "Em análise", implementada: "Implementada", recusada: "Recusada" };
const STATUS_COLOR = { nova: "var(--text-dim)", em_analise: "var(--amber)", implementada: "var(--green)", recusada: "var(--red)" };

export default function SugestoesPage() {
  const { company } = useAuth();
  const [employees, setEmployees] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [employeeId, setEmployeeId] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);

  async function loadAll() {
    setLoading(true);
    setError("");
    try {
      const [{ data: emp, error: e1 }, { data: sg, error: e2 }] = await Promise.all([
        supabase.from("employees").select("id, full_name").eq("status", "ativo").order("full_name"),
        supabase.from("hr_suggestions").select("id, title, description, status, created_at, employees:employee_id (full_name)").order("created_at", { ascending: false }),
      ]);
      const firstError = e1 || e2;
      if (firstError) throw firstError;
      setEmployees(emp ?? []);
      setSuggestions(sg ?? []);
    } catch (err) {
      setError("Não foi possível carregar: " + (err.message ?? "erro desconhecido"));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { if (company?.id) loadAll(); }, [company?.id]);

  async function submit(e) {
    e.preventDefault();
    if (!title) { setError("Dê um título à sugestão."); return; }
    setError("");
    setSaving(true);
    const { error: insertError } = await supabase.from("hr_suggestions").insert({ company_id: company.id, employee_id: employeeId || null, title, description: description || null });
    if (insertError) { setError(insertError.message); setSaving(false); return; }
    setEmployeeId(""); setTitle(""); setDescription("");
    setSaving(false);
    await loadAll();
  }

  async function updateStatus(id, status) {
    await supabase.from("hr_suggestions").update({ status }).eq("id", id);
    await loadAll();
  }

  return (
    <div>
      <header style={{ marginBottom: 20 }}>
        <h1 style={styles.title}>Caixa de Sugestões</h1>
        <p style={styles.subtitle}>Ideias dos colaboradores pra melhorar a empresa.</p>
      </header>

      {error && <div style={styles.error}>{error}</div>}

      <form onSubmit={submit} style={styles.form}>
        <p style={styles.formTitle}>Nova sugestão</p>
        <select style={styles.input} value={employeeId} onChange={(e) => setEmployeeId(e.target.value)}>
          <option value="">Colaborador (opcional, pode ser anônima)...</option>
          {employees.map((e) => <option key={e.id} value={e.id}>{e.full_name}</option>)}
        </select>
        <input style={styles.input} placeholder="Título da sugestão" value={title} onChange={(e) => setTitle(e.target.value)} required />
        <textarea style={{ ...styles.input, minHeight: 70 }} placeholder="Descrição (opcional)" value={description} onChange={(e) => setDescription(e.target.value)} />
        <button style={styles.saveBtn} type="submit" disabled={saving}>{saving ? "Enviando..." : "Enviar sugestão"}</button>
      </form>

      <h2 style={styles.title2}>Sugestões recebidas</h2>
      {loading ? (
        <p style={styles.dim}>Carregando...</p>
      ) : suggestions.length === 0 ? (
        <p style={styles.dim}>Nenhuma sugestão ainda.</p>
      ) : (
        <div style={styles.list}>
          {suggestions.map((s) => (
            <div key={s.id} style={styles.card}>
              <div style={styles.cardHeader}>
                <strong>{s.title}</strong>
                <select style={{ ...styles.select, color: STATUS_COLOR[s.status] }} value={s.status} onChange={(e) => updateStatus(s.id, e.target.value)}>
                  {Object.entries(STATUS_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </div>
              <p style={styles.dim}>{s.employees?.full_name ?? "Anônima"} · {new Date(s.created_at).toLocaleDateString("pt-BR")}</p>
              {s.description && <p style={styles.desc}>{s.description}</p>}
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
  dim: { color: "var(--text-dim)", fontSize: 12.5 },
  desc: { fontSize: 13, margin: "6px 0 0" },
  form: { display: "flex", flexDirection: "column", gap: 12, background: "var(--panel)", border: "1px solid var(--line)", borderRadius: "var(--radius)", padding: 20, marginBottom: 28, maxWidth: 680 },
  formTitle: { fontSize: 13, fontWeight: 700, color: "var(--text-dim)", textTransform: "uppercase", letterSpacing: "0.04em", margin: "0 0 4px" },
  input: { background: "var(--panel-2)", border: "1px solid var(--line)", borderRadius: "var(--radius)", padding: "9px 10px", color: "var(--text)", fontSize: 13, fontFamily: "inherit" },
  saveBtn: { background: "var(--amber)", color: "#FFFFFF", border: "none", borderRadius: "var(--radius)", padding: "10px 0", fontWeight: 700, fontSize: 13, cursor: "pointer" },
  list: { display: "flex", flexDirection: "column", gap: 12, maxWidth: 680 },
  card: { background: "var(--panel)", border: "1px solid var(--line)", borderRadius: "var(--radius)", padding: 16 },
  cardHeader: { display: "flex", justifyContent: "space-between", alignItems: "center" },
  select: { background: "var(--panel-2)", border: "1px solid var(--line)", borderRadius: "var(--radius)", padding: "4px 8px", fontSize: 11.5, fontWeight: 700 },
  error: { background: "rgba(217,105,95,0.12)", border: "1px solid var(--red)", color: "var(--red)", borderRadius: "var(--radius)", padding: "10px 12px", fontSize: 13, marginBottom: 16, maxWidth: 680 },
};
