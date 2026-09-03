import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../lib/AuthContext";

const TABS = ["Identificação", "Missão", "Atividades", "Requisitos", "Riscos (NR-1)", "EPIs (NR-6)", "Competências"];
const RISK_CATEGORIES = { fisico: "Físico", quimico: "Químico", biologico: "Biológico", ergonomico: "Ergonômico", acidente: "Acidente" };

function EditableList({ table, jobId, companyId, items, onChange, placeholder }) {
  const [text, setText] = useState("");
  const [saving, setSaving] = useState(false);

  async function add() {
    if (!text.trim()) return;
    setSaving(true);
    const { error } = await supabase.from(table).insert({ company_id: companyId, job_description_id: jobId, description: text.trim(), sort_order: items.length });
    setSaving(false);
    if (!error) { setText(""); onChange(); }
  }

  async function remove(itemId) {
    await supabase.from(table).delete().eq("id", itemId);
    onChange();
  }

  return (
    <div>
      {items.length === 0 ? (
        <p style={styles.dim}>Nenhum item ainda.</p>
      ) : (
        <ul style={styles.itemList}>
          {items.map((it, i) => (
            <li key={it.id} style={styles.itemRow}>
              <span style={styles.itemNumber}>{i + 1}.</span>
              <span style={{ flex: 1 }}>{it.description}</span>
              <button style={styles.removeBtn} onClick={() => remove(it.id)} type="button">✕</button>
            </li>
          ))}
        </ul>
      )}
      <div style={styles.addRow}>
        <input style={styles.input} placeholder={placeholder} value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), add())} />
        <button style={styles.addBtn} onClick={add} disabled={saving} type="button">+ Adicionar</button>
      </div>
    </div>
  );
}

function RiskList({ jobId, companyId, items, onChange }) {
  const [category, setCategory] = useState("fisico");
  const [text, setText] = useState("");
  const [saving, setSaving] = useState(false);

  async function add() {
    if (!text.trim()) return;
    setSaving(true);
    const { error } = await supabase.from("hr_job_risks").insert({ company_id: companyId, job_description_id: jobId, category, description: text.trim(), sort_order: items.length });
    setSaving(false);
    if (!error) { setText(""); onChange(); }
  }

  async function remove(itemId) {
    await supabase.from("hr_job_risks").delete().eq("id", itemId);
    onChange();
  }

  const byCategory = Object.keys(RISK_CATEGORIES).map((cat) => ({ cat, items: items.filter((i) => i.category === cat) })).filter((g) => g.items.length > 0);

  return (
    <div>
      {byCategory.length === 0 ? (
        <p style={styles.dim}>Nenhum risco ocupacional registrado ainda.</p>
      ) : (
        byCategory.map((g) => (
          <div key={g.cat} style={{ marginBottom: 14 }}>
            <p style={styles.riskCategoryLabel}>{RISK_CATEGORIES[g.cat]}</p>
            <ul style={styles.itemList}>
              {g.items.map((it) => (
                <li key={it.id} style={styles.itemRow}>
                  <span style={{ flex: 1 }}>{it.description}</span>
                  <button style={styles.removeBtn} onClick={() => remove(it.id)} type="button">✕</button>
                </li>
              ))}
            </ul>
          </div>
        ))
      )}
      <div style={styles.addRow}>
        <select style={{ ...styles.input, maxWidth: 160 }} value={category} onChange={(e) => setCategory(e.target.value)}>
          {Object.entries(RISK_CATEGORIES).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
        <input style={styles.input} placeholder="Descreva o risco" value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), add())} />
        <button style={styles.addBtn} onClick={add} disabled={saving} type="button">+ Adicionar</button>
      </div>
    </div>
  );
}

export default function FichaCargoPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { company } = useAuth();

  const [job, setJob] = useState(null);
  const [activities, setActivities] = useState([]);
  const [trainings, setTrainings] = useState([]);
  const [risks, setRisks] = useState([]);
  const [ppe, setPpe] = useState([]);
  const [competencies, setCompetencies] = useState([]);
  const [requirements, setRequirements] = useState([]);
  const [addingCompetencyId, setAddingCompetencyId] = useState("");
  const [addingLevel, setAddingLevel] = useState(5);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("Identificação");

  async function loadAll() {
    setLoading(true);
    setError("");
    try {
      const { data: j, error: e0 } = await supabase.from("hr_job_descriptions").select("*").eq("id", id).single();
      if (e0) throw e0;
      setJob(j);

      const [{ data: act }, { data: train }, { data: risk }, { data: ppeData }, { data: comp }, { data: req }] = await Promise.all([
        supabase.from("hr_job_activities").select("id, description").eq("job_description_id", id).order("sort_order"),
        supabase.from("hr_job_trainings").select("id, description").eq("job_description_id", id).order("sort_order"),
        supabase.from("hr_job_risks").select("id, category, description").eq("job_description_id", id).order("sort_order"),
        supabase.from("hr_job_ppe").select("id, description").eq("job_description_id", id).order("sort_order"),
        supabase.from("hr_competencies").select("id, name").order("name"),
        supabase.from("hr_job_competency_requirements").select("id, competency_id, required_level, hr_competencies:competency_id (name)").eq("job_description_id", id),
      ]);
      setActivities(act ?? []); setTrainings(train ?? []); setRisks(risk ?? []); setPpe(ppeData ?? []);
      setCompetencies(comp ?? []); setRequirements(req ?? []);
    } catch (err) {
      setError("Não foi possível carregar: " + (err.message ?? "erro desconhecido"));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { if (company?.id && id) loadAll(); }, [company?.id, id]);

  function saveField(field, value) {
    setJob((j) => ({ ...j, [field]: value }));
  }

  async function persistJob() {
    setSaving(true);
    setError("");
    const { error: updateError } = await supabase.from("hr_job_descriptions").update({
      title: job.title, cbo_code: job.cbo_code, department: job.department, reports_to: job.reports_to,
      summary: job.summary, education_level: job.education_level, required_license: job.required_license,
    }).eq("id", id);
    setSaving(false);
    if (updateError) setError(updateError.message);
  }

  async function deleteJob() {
    if (!window.confirm(`Excluir o cargo "${job.title}"? Todas as atividades, riscos e EPIs vinculados também serão removidos.`)) return;
    await supabase.from("hr_job_descriptions").delete().eq("id", id);
    navigate("/descricao-cargos");
  }

  async function addCompetency() {
    if (!addingCompetencyId) return;
    await supabase.from("hr_job_competency_requirements").upsert(
      { company_id: company.id, job_description_id: id, competency_id: addingCompetencyId, required_level: addingLevel },
      { onConflict: "job_description_id,competency_id" }
    );
    setAddingCompetencyId(""); setAddingLevel(5);
    const { data } = await supabase.from("hr_job_competency_requirements").select("id, competency_id, required_level, hr_competencies:competency_id (name)").eq("job_description_id", id);
    setRequirements(data ?? []);
  }

  async function removeCompetency(reqId) {
    await supabase.from("hr_job_competency_requirements").delete().eq("id", reqId);
    const { data } = await supabase.from("hr_job_competency_requirements").select("id, competency_id, required_level, hr_competencies:competency_id (name)").eq("job_description_id", id);
    setRequirements(data ?? []);
  }

  if (loading) return <p style={styles.dim}>Carregando...</p>;
  if (error && !job) return <div style={styles.error}>{error}</div>;
  if (!job) return <p style={styles.dim}>Cargo não encontrado.</p>;

  const availableCompetencies = competencies.filter((c) => !requirements.some((r) => r.competency_id === c.id));

  return (
    <div>
      <button style={styles.backBtn} onClick={() => navigate("/descricao-cargos")} type="button">← Voltar</button>

      <header style={styles.header}>
        <div>
          <h1 style={styles.title}>{job.title || "Novo cargo"}</h1>
          <p style={styles.subtitle}>{job.department || "Sem departamento"}{job.cbo_code ? ` · CBO ${job.cbo_code}` : ""}</p>
        </div>
        <button style={styles.deleteBtn} onClick={deleteJob} type="button">Excluir cargo</button>
      </header>

      {error && <div style={styles.error}>{error}</div>}

      <div style={styles.tabBar}>
        {TABS.map((t) => (
          <button key={t} style={{ ...styles.tabBtn, ...(activeTab === t ? styles.tabBtnActive : {}) }} onClick={() => setActiveTab(t)} type="button">{t}</button>
        ))}
      </div>

      <div style={styles.tabContent}>
        {activeTab === "Identificação" && (
          <div style={styles.form}>
            <Field label="Título do cargo" value={job.title} onChange={(v) => saveField("title", v)} />
            <Field label="Código CBO" value={job.cbo_code} onChange={(v) => saveField("cbo_code", v)} placeholder="Ex: 7822-20" />
            <Field label="Departamento/Setor" value={job.department} onChange={(v) => saveField("department", v)} />
            <Field label="Cargo do superior direto" value={job.reports_to} onChange={(v) => saveField("reports_to", v)} />
            <button style={styles.saveBtn} onClick={persistJob} disabled={saving} type="button">{saving ? "Salvando..." : "Salvar"}</button>
          </div>
        )}

        {activeTab === "Missão" && (
          <div style={styles.form}>
            <FieldArea label="Missão / Objetivo do cargo" value={job.summary} onChange={(v) => saveField("summary", v)} placeholder="Resumo das responsabilidades principais" />
            <button style={styles.saveBtn} onClick={persistJob} disabled={saving} type="button">{saving ? "Salvando..." : "Salvar"}</button>
          </div>
        )}

        {activeTab === "Atividades" && (
          <>
            <p style={styles.sectionNote}>Detalhamento das tarefas diárias — importante pro eSocial (S-2240) e PPP.</p>
            <EditableList table="hr_job_activities" jobId={id} companyId={company.id} items={activities} onChange={loadAll} placeholder="Ex: Realizar checklist diário de manutenção preventiva" />
          </>
        )}

        {activeTab === "Requisitos" && (
          <div>
            <div style={styles.form}>
              <Field label="Escolaridade" value={job.education_level} onChange={(v) => saveField("education_level", v)} placeholder="Ex: Ensino Médio Completo" />
              <Field label="Habilitação" value={job.required_license} onChange={(v) => saveField("required_license", v)} placeholder="Ex: CNH Categoria B" />
              <button style={styles.saveBtn} onClick={persistJob} disabled={saving} type="button">{saving ? "Salvando..." : "Salvar"}</button>
            </div>
            <p style={{ ...styles.sectionNote, marginTop: 20 }}>Treinamentos obrigatórios (NRs)</p>
            <EditableList table="hr_job_trainings" jobId={id} companyId={company.id} items={trainings} onChange={loadAll} placeholder="Ex: Curso de Formação de Operador de Empilhadeira (NR-11)" />
          </div>
        )}

        {activeTab === "Riscos (NR-1)" && (
          <>
            <p style={styles.sectionNote}>Riscos ocupacionais por categoria — físicos, químicos, biológicos, ergonômicos ou de acidentes.</p>
            <RiskList jobId={id} companyId={company.id} items={risks} onChange={loadAll} />
          </>
        )}

        {activeTab === "EPIs (NR-6)" && (
          <>
            <p style={styles.sectionNote}>Equipamentos de Proteção Individual e Coletiva necessários pra função.</p>
            <EditableList table="hr_job_ppe" jobId={id} companyId={company.id} items={ppe} onChange={loadAll} placeholder="Ex: Protetor auricular, bota de segurança com biqueira de aço" />
          </>
        )}

        {activeTab === "Competências" && (
          <div>
            {requirements.length === 0 ? (
              <p style={styles.dim}>Nenhuma competência vinculada ainda.</p>
            ) : (
              <ul style={styles.itemList}>
                {requirements.map((r) => (
                  <li key={r.id} style={styles.itemRow}>
                    <span style={{ flex: 1 }}>{r.hr_competencies?.name} — nível exigido {r.required_level}</span>
                    <button style={styles.removeBtn} onClick={() => removeCompetency(r.id)} type="button">✕</button>
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
              <button style={styles.addBtn} onClick={addCompetency} type="button">+ Adicionar</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Field({ label, value, onChange, placeholder }) {
  return (
    <label style={styles.fieldLabel}>
      {label}
      <input style={styles.input} value={value ?? ""} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
    </label>
  );
}

function FieldArea({ label, value, onChange, placeholder }) {
  return (
    <label style={styles.fieldLabel}>
      {label}
      <textarea style={{ ...styles.input, minHeight: 90 }} value={value ?? ""} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
    </label>
  );
}

const styles = {
  backBtn: { background: "transparent", border: "none", color: "var(--text-dim)", fontSize: 13, cursor: "pointer", marginBottom: 12, padding: 0 },
  header: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, marginBottom: 20, flexWrap: "wrap" },
  title: { fontFamily: "var(--font-display)", fontSize: 24, margin: 0 },
  subtitle: { color: "var(--text-dim)", fontSize: 13, margin: "6px 0 0" },
  deleteBtn: { background: "transparent", border: "1px solid var(--red)", color: "var(--red)", borderRadius: "var(--radius)", padding: "8px 16px", fontSize: 12.5, fontWeight: 700, cursor: "pointer" },
  dim: { color: "var(--text-dim)", fontSize: 13 },
  tabBar: { display: "flex", gap: 4, borderBottom: "1px solid var(--line)", marginBottom: 20, flexWrap: "wrap" },
  tabBtn: { background: "transparent", border: "none", borderBottom: "2px solid transparent", padding: "8px 12px", fontSize: 12.5, fontWeight: 600, color: "var(--text-dim)", cursor: "pointer" },
  tabBtnActive: { color: "var(--amber)", borderBottom: "2px solid var(--amber)" },
  tabContent: { maxWidth: 700 },
  form: { display: "flex", flexDirection: "column", gap: 14 },
  fieldLabel: { display: "flex", flexDirection: "column", gap: 5, fontSize: 12, fontWeight: 700, color: "var(--text-dim)" },
  input: { background: "var(--panel-2)", border: "1px solid var(--line)", borderRadius: "var(--radius)", padding: "9px 10px", color: "var(--text)", fontSize: 13, fontWeight: 400, fontFamily: "inherit" },
  saveBtn: { alignSelf: "flex-start", background: "var(--amber)", color: "#FFFFFF", border: "none", borderRadius: "var(--radius)", padding: "9px 20px", fontWeight: 700, fontSize: 13, cursor: "pointer" },
  sectionNote: { fontSize: 12.5, color: "var(--text-dim)", margin: "0 0 14px", lineHeight: 1.5 },
  itemList: { listStyle: "none", padding: 0, margin: "0 0 14px", display: "flex", flexDirection: "column", gap: 6 },
  itemRow: { display: "flex", alignItems: "center", gap: 8, background: "var(--panel)", border: "1px solid var(--line)", borderRadius: "var(--radius)", padding: "10px 14px", fontSize: 13 },
  itemNumber: { color: "var(--text-dim)", fontWeight: 700 },
  removeBtn: { background: "transparent", border: "none", color: "var(--red)", cursor: "pointer", fontSize: 13 },
  addRow: { display: "flex", gap: 8 },
  addBtn: { background: "var(--panel-2)", border: "1px solid var(--line)", color: "var(--text)", borderRadius: "var(--radius)", padding: "9px 14px", fontSize: 12, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap" },
  riskCategoryLabel: { fontSize: 11, fontWeight: 800, color: "var(--red)", textTransform: "uppercase", letterSpacing: "0.03em", margin: "0 0 6px" },
  error: { background: "rgba(217,105,95,0.12)", border: "1px solid var(--red)", color: "var(--red)", borderRadius: "var(--radius)", padding: "10px 12px", fontSize: 13, marginBottom: 16, maxWidth: 700 },
};
