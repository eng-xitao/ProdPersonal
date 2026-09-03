import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../lib/AuthContext";

const emptyForm = { title: "", department: "", cbo_code: "", summary: "", responsibilities: "", requirements: "" };

export default function DescricaoCargosPage() {
  const { company } = useAuth();
  const [jobs, setJobs] = useState([]);
  const [competencies, setCompetencies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);

  const [expandedId, setExpandedId] = useState(null);
  const [requirements, setRequirements] = useState([]);
  const [addingCompetencyId, setAddingCompetencyId] = useState("");
  const [addingLevel, setAddingLevel] = useState(5);

  async function loadAll() {
    setLoading(true);
    setError("");
    try {
      const [{ data: j, error: e1 }, { data: c, error: e2 }] = await Promise.all([
        supabase.from("hr_job_descriptions").select("id, title, department, summary, responsibilities, requirements, cbo_code").order("title"),
        supabase.from("hr_competencies").select("id, name").order("name"),
      ]);
      const firstError = e1 || e2;
      if (firstError) throw firstError;
      setJobs(j ?? []);
      setCompetencies(c ?? []);
    } catch (err) {
      setError("Não foi possível carregar: " + (err.message ?? "erro desconhecido"));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { if (company?.id) loadAll(); }, [company?.id]);

  function startNew() {
    setEditingId(null);
    setForm(emptyForm);
    setShowForm(true);
  }

  function startEdit(job) {
    setEditingId(job.id);
    setForm({
      title: job.title ?? "", department: job.department ?? "", cbo_code: job.cbo_code ?? "",
      summary: job.summary ?? "", responsibilities: job.responsibilities ?? "", requirements: job.requirements ?? "",
    });
    setShowForm(true);
    setExpandedId(null);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    if (!form.title) { setError("Dê um nome ao cargo."); return; }
    setSaving(true);

    const payload = {
      title: form.title, department: form.department || null, cbo_code: form.cbo_code || null,
      summary: form.summary || null, responsibilities: form.responsibilities || null, requirements: form.requirements || null,
    };

    if (editingId) {
      const { error: updateError } = await supabase.from("hr_job_descriptions").update(payload).eq("id", editingId);
      if (updateError) { setError(updateError.message); setSaving(false); return; }
    } else {
      const { error: insertError } = await supabase.from("hr_job_descriptions").insert({ ...payload, company_id: company.id });
      if (insertError) { setError(insertError.message); setSaving(false); return; }
    }

    setForm(emptyForm);
    setEditingId(null);
    setShowForm(false);
    setSaving(false);
    await loadAll();
  }

  async function deleteJob(id) {
    if (!window.confirm("Excluir esse cargo? As competências exigidas vinculadas a ele também serão removidas.")) return;
    await supabase.from("hr_job_descriptions").delete().eq("id", id);
    if (expandedId === id) setExpandedId(null);
    await loadAll();
  }

  async function loadRequirements(jobId) {
    const { data } = await supabase.from("hr_job_competency_requirements").select("id, competency_id, required_level, hr_competencies:competency_id (name)").eq("job_description_id", jobId);
    setRequirements(data ?? []);
  }

  function toggleExpand(job) {
    if (expandedId === job.id) { setExpandedId(null); return; }
    setExpandedId(job.id);
    loadRequirements(job.id);
  }

  async function addRequirement(jobId) {
    if (!addingCompetencyId) return;
    await supabase.from("hr_job_competency_requirements").upsert(
      { company_id: company.id, job_description_id: jobId, competency_id: addingCompetencyId, required_level: addingLevel },
      { onConflict: "job_description_id,competency_id" }
    );
    setAddingCompetencyId(""); setAddingLevel(5);
    await loadRequirements(jobId);
  }

  async function removeRequirement(id, jobId) {
    await supabase.from("hr_job_competency_requirements").delete().eq("id", id);
    await loadRequirements(jobId);
  }

  const availableCompetencies = competencies.filter((c) => !requirements.some((r) => r.competency_id === c.id));

  return (
    <div>
      <header style={{ marginBottom: 20 }}>
        <h1 style={styles.title}>Descrição de Cargos</h1>
        <p style={styles.subtitle}>O que cada cargo exige — usado em recrutamento e no cálculo de gap na avaliação de desempenho.</p>
      </header>

      {error && <div style={styles.error}>{error}</div>}

      <button style={styles.newBtn} onClick={() => (showForm ? setShowForm(false) : startNew())} type="button">
        {showForm ? "Cancelar" : "+ Novo cargo"}
      </button>

      {showForm && (
        <form onSubmit={handleSubmit} style={styles.form}>
          <p style={styles.formTitle}>{editingId ? "Editar cargo" : "Novo cargo"}</p>
          <div style={styles.row}>
            <input style={styles.input} placeholder="Cargo (ex: Analista de Logística)" value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} required />
            <input style={styles.input} placeholder="Departamento" value={form.department} onChange={(e) => setForm((p) => ({ ...p, department: e.target.value }))} />
            <input style={{ ...styles.input, maxWidth: 160 }} placeholder="Código CBO" value={form.cbo_code} onChange={(e) => setForm((p) => ({ ...p, cbo_code: e.target.value }))} />
          </div>
          <textarea style={{ ...styles.input, minHeight: 60 }} placeholder="Resumo do cargo" value={form.summary} onChange={(e) => setForm((p) => ({ ...p, summary: e.target.value }))} />
          <textarea style={{ ...styles.input, minHeight: 80 }} placeholder="Responsabilidades" value={form.responsibilities} onChange={(e) => setForm((p) => ({ ...p, responsibilities: e.target.value }))} />
          <textarea style={{ ...styles.input, minHeight: 80 }} placeholder="Requisitos (formação, experiência, etc.)" value={form.requirements} onChange={(e) => setForm((p) => ({ ...p, requirements: e.target.value }))} />
          <button style={styles.saveBtn} type="submit" disabled={saving}>{saving ? "Salvando..." : editingId ? "Salvar alterações" : "Criar cargo"}</button>
        </form>
      )}

      {loading ? (
        <p style={styles.dim}>Carregando...</p>
      ) : jobs.length === 0 ? (
        <p style={styles.dim}>Nenhum cargo descrito ainda.</p>
      ) : (
        <div style={styles.list}>
          {jobs.map((j) => (
            <div key={j.id} style={styles.card}>
              <div style={styles.cardHeader}>
                <div>
                  <strong>{j.title}</strong>
                  {j.department && <span style={styles.dim}> · {j.department}</span>}
                  {j.cbo_code && <span style={styles.dim}> · CBO {j.cbo_code}</span>}
                </div>
                <div style={styles.cardActions}>
                  <button style={styles.smallBtn} onClick={() => startEdit(j)} type="button">Editar</button>
                  <button style={{ ...styles.smallBtn, color: "var(--red)" }} onClick={() => deleteJob(j.id)} type="button">Excluir</button>
                </div>
              </div>

              {j.summary && <p style={styles.summaryText}>{j.summary}</p>}
              {j.responsibilities && <p style={styles.fieldText}><strong>Responsabilidades:</strong> {j.responsibilities}</p>}
              {j.requirements && <p style={styles.fieldText}><strong>Requisitos:</strong> {j.requirements}</p>}

              <button style={styles.expandBtn} onClick={() => toggleExpand(j)} type="button">
                {expandedId === j.id ? "Fechar" : "Competências exigidas"}
              </button>

              {expandedId === j.id && (
                <div style={styles.detailsBox}>
                  {requirements.length === 0 ? (
                    <p style={styles.dim}>Nenhuma competência vinculada ainda.</p>
                  ) : (
                    <ul style={styles.reqList}>
                      {requirements.map((r) => (
                        <li key={r.id} style={styles.reqItem}>
                          <span>{r.hr_competencies?.name} — nível exigido {r.required_level}</span>
                          <button style={styles.removeBtn} onClick={() => removeRequirement(r.id, j.id)} type="button">✕</button>
                        </li>
                      ))}
                    </ul>
                  )}
                  <div style={styles.addRow}>
                    <select style={styles.input} value={addingCompetencyId} onChange={(e) => setAddingCompetencyId(e.target.value)}>
                      <option value="">Adicionar competência...</option>
                      {availableCompetencies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                    <select style={{ ...styles.input, maxWidth: 100 }} value={addingLevel} onChange={(e) => setAddingLevel(Number(e.target.value))}>
                      {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => <option key={n} value={n}>{n}</option>)}
                    </select>
                    <button style={styles.addBtn} onClick={() => addRequirement(j.id)} type="button">+ Adicionar</button>
                  </div>
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
  newBtn: { background: "var(--amber)", color: "#FFFFFF", border: "none", borderRadius: "var(--radius)", padding: "9px 18px", fontWeight: 700, fontSize: 13, cursor: "pointer", marginBottom: 16 },
  form: { display: "flex", flexDirection: "column", gap: 12, background: "var(--panel)", border: "1px solid var(--line)", borderRadius: "var(--radius)", padding: 20, marginBottom: 28, maxWidth: 700 },
  formTitle: { fontSize: 13, fontWeight: 700, color: "var(--text-dim)", textTransform: "uppercase", letterSpacing: "0.04em", margin: "0 0 4px" },
  row: { display: "flex", gap: 10, flexWrap: "wrap" },
  input: { flex: 1, minWidth: 140, background: "var(--panel-2)", border: "1px solid var(--line)", borderRadius: "var(--radius)", padding: "9px 10px", color: "var(--text)", fontSize: 13, fontFamily: "inherit" },
  saveBtn: { background: "var(--green)", color: "#FFFFFF", border: "none", borderRadius: "var(--radius)", padding: "10px 0", fontWeight: 700, fontSize: 13, cursor: "pointer" },
  list: { display: "flex", flexDirection: "column", gap: 12, maxWidth: 700 },
  card: { background: "var(--panel)", border: "1px solid var(--line)", borderRadius: "var(--radius)", padding: 16 },
  cardHeader: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10, flexWrap: "wrap" },
  cardActions: { display: "flex", gap: 8, flexShrink: 0 },
  summaryText: { fontSize: 13, margin: "8px 0 0" },
  fieldText: { fontSize: 12.5, color: "var(--text-dim)", margin: "6px 0 0", lineHeight: 1.5 },
  expandBtn: { marginTop: 10, background: "transparent", border: "1px solid var(--line)", color: "var(--text-dim)", borderRadius: "var(--radius)", padding: "6px 14px", fontSize: 12, cursor: "pointer" },
  detailsBox: { marginTop: 12, paddingTop: 12, borderTop: "1px solid var(--line)" },
  reqList: { listStyle: "none", padding: 0, margin: "0 0 10px", display: "flex", flexDirection: "column", gap: 6 },
  reqItem: { display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 13 },
  removeBtn: { background: "transparent", border: "none", color: "var(--red)", cursor: "pointer" },
  addRow: { display: "flex", gap: 8 },
  addBtn: { background: "var(--panel-2)", border: "1px solid var(--line)", color: "var(--text)", borderRadius: "var(--radius)", padding: "9px 14px", fontSize: 12, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap" },
  smallBtn: { background: "transparent", border: "1px solid var(--line)", color: "var(--text-dim)", borderRadius: "var(--radius)", padding: "5px 12px", fontSize: 12, cursor: "pointer" },
  error: { background: "rgba(217,105,95,0.12)", border: "1px solid var(--red)", color: "var(--red)", borderRadius: "var(--radius)", padding: "10px 12px", fontSize: 13, marginBottom: 16, maxWidth: 700 },
};
