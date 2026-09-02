import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../lib/AuthContext";

function classify(pct) {
  if (pct >= 100) return { label: "Superação", color: "#4FAE7E" };
  if (pct >= 90) return { label: "Meta Atingida", color: "#4FAE7E" };
  if (pct >= 70) return { label: "Parcial", color: "#E8A33D" };
  return { label: "Insuficiente", color: "#D9695F" };
}

function GoalCard({ x }) {
  const target = Number(x.target_value);
  const current = Number(x.current_value);
  const pct = target ? Math.max(0, (current / target) * 100) : 0;
  const nota = Math.min(10, pct / 10);
  const info = classify(pct);
  return (
    <article style={styles.card}>
      <div style={styles.head}>
        <strong>{x.description}</strong>
        <span style={{ ...styles.notaBadge, color: info.color }}>{nota.toFixed(1)} / 10</span>
      </div>
      <div style={styles.track}><div style={{ ...styles.fill, width: `${Math.min(100, pct)}%`, background: info.color }} /></div>
      <div style={styles.metaRow}>
        <span>Atual: {x.current_value ?? "—"} · Alvo: {x.target_value ?? "—"}</span>
        <span style={{ color: info.color, fontWeight: 700 }}>{pct.toFixed(0)}% — {info.label}</span>
      </div>
      <p style={styles.dim}>Prazo: {x.due_date ? new Date(x.due_date + "T00:00:00").toLocaleDateString("pt-BR") : "—"}</p>
    </article>
  );
}

export default function MetasPage() {
  const { company, profile } = useAuth();
  const role = profile?.access_role || "employee";
  const canManage = ["rh", "dp", "admin", "master"].includes(role);

  const [options, setOptions] = useState([]);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);

  const emptyForm = { employee_id: "", description: "", target_value: "", current_value: "0", due_date: "" };
  const [form, setForm] = useState(emptyForm);

  async function loadOptions() {
    let q = supabase.from("employees").select("id, full_name, profile_id, manager_id").eq("company_id", company.id).eq("status", "ativo").order("full_name");
    if (role === "gestor") q = q.eq("manager_id", profile.id);
    if (role === "employee") q = q.eq("profile_id", profile.id);
    const { data, error: e } = await q;
    if (e) setError(e.message);
    else setOptions((data ?? []).map((emp) => ({ value: emp.id, label: emp.full_name })));
  }

  async function loadGoals() {
    setLoading(true);
    setError("");
    const ids = options.map((o) => o.value);
    if (ids.length === 0) { setRows([]); setLoading(false); return; }
    const { data, error: e } = await supabase.from("hr_goals").select("id, description, target_value, current_value, due_date, status, employee_id, employees:employee_id (full_name)").eq("company_id", company.id).in("employee_id", ids).order("due_date", { ascending: true });
    if (e) setError(e.message);
    else setRows(data ?? []);
    setLoading(false);
  }

  useEffect(() => { if (company?.id && profile?.id) loadOptions(); }, [company?.id, profile?.id, role]);
  useEffect(() => { if (options.length) loadGoals(); else setLoading(false); }, [options]);

  async function handleCreate(e) {
    e.preventDefault();
    setError("");
    if (!form.employee_id || !form.description) { setError("Escolha o colaborador e descreva a meta."); return; }
    setSaving(true);
    const { error: insertError } = await supabase.from("hr_goals").insert({
      company_id: company.id, employee_id: form.employee_id, description: form.description,
      target_value: form.target_value || null, current_value: form.current_value || 0, due_date: form.due_date || null,
    });
    if (insertError) { setError(insertError.message); setSaving(false); return; }
    setForm(emptyForm); setShowForm(false); setSaving(false);
    await loadGoals();
  }

  return (
    <div>
      <header style={{ marginBottom: 20 }}>
        <h1 style={styles.title}>{canManage ? "Metas e KPIs (OKRs)" : "Minhas Metas e KPIs"}</h1>
        <p style={styles.subtitle}>Cada meta mostra o % de atingimento e a nota derivada automaticamente (0 a 10).</p>
      </header>

      {error && <div style={styles.error}>{error}</div>}

      {canManage && (
        <>
          <button style={styles.newBtn} onClick={() => setShowForm((s) => !s)} type="button">{showForm ? "Cancelar" : "+ Nova meta"}</button>
          {showForm && (
            <form onSubmit={handleCreate} style={styles.form}>
              <select style={styles.input} value={form.employee_id} onChange={(e) => setForm((p) => ({ ...p, employee_id: e.target.value }))} required>
                <option value="">Colaborador...</option>
                {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
              <input style={styles.input} placeholder="Descrição da meta (objetivo)" value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} required />
              <div style={styles.row}>
                <input style={styles.input} type="number" placeholder="Valor alvo (Key Result)" value={form.target_value} onChange={(e) => setForm((p) => ({ ...p, target_value: e.target.value }))} />
                <input style={styles.input} type="number" placeholder="Valor atual" value={form.current_value} onChange={(e) => setForm((p) => ({ ...p, current_value: e.target.value }))} />
                <input style={styles.input} type="date" value={form.due_date} onChange={(e) => setForm((p) => ({ ...p, due_date: e.target.value }))} />
              </div>
              <button style={styles.saveBtn} type="submit" disabled={saving}>{saving ? "Salvando..." : "Criar meta"}</button>
            </form>
          )}
        </>
      )}

      {loading ? (
        <p style={styles.dim}>Carregando...</p>
      ) : rows.length === 0 ? (
        <p style={styles.dim}>Nenhuma meta registrada.</p>
      ) : (
        <div style={styles.list}>
          {rows.map((x) => (
            <div key={x.id}>
              {canManage && <p style={styles.employeeLabel}>{x.employees?.full_name}</p>}
              <GoalCard x={x} />
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
  newBtn: { background: "var(--amber)", color: "#FFFFFF", border: "none", borderRadius: "var(--radius)", padding: "9px 18px", fontWeight: 700, fontSize: 13, cursor: "pointer", marginBottom: 16 },
  form: { display: "flex", flexDirection: "column", gap: 12, background: "var(--panel)", border: "1px solid var(--line)", borderRadius: "var(--radius)", padding: 20, marginBottom: 28, maxWidth: 680 },
  row: { display: "flex", gap: 10, flexWrap: "wrap" },
  input: { flex: 1, minWidth: 130, background: "var(--panel-2)", border: "1px solid var(--line)", borderRadius: "var(--radius)", padding: "9px 10px", color: "var(--text)", fontSize: 13 },
  saveBtn: { background: "var(--green)", color: "#FFFFFF", border: "none", borderRadius: "var(--radius)", padding: "10px 0", fontWeight: 700, fontSize: 13, cursor: "pointer" },
  list: { display: "grid", gap: 14, maxWidth: 700 },
  employeeLabel: { fontSize: 11, fontWeight: 700, color: "var(--text-dim)", textTransform: "uppercase", letterSpacing: "0.03em", margin: "0 0 4px" },
  card: { background: "var(--panel)", border: "1px solid var(--line)", borderRadius: "var(--radius)", padding: 18 },
  head: { display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" },
  notaBadge: { fontWeight: 800, fontSize: 14, whiteSpace: "nowrap" },
  track: { height: 8, background: "var(--panel-2)", borderRadius: 4, overflow: "hidden", margin: "12px 0" },
  fill: { height: "100%" },
  metaRow: { display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 6, fontSize: 12.5 },
  error: { background: "rgba(217,105,95,0.12)", border: "1px solid var(--red)", color: "var(--red)", borderRadius: "var(--radius)", padding: "10px 12px", fontSize: 13, marginBottom: 16, maxWidth: 680 },
};
