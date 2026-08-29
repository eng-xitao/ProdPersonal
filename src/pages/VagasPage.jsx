import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../lib/AuthContext";

const VACANCY_STATUS_LABEL = { aberta: "Aberta", em_andamento: "Em andamento", fechada: "Fechada", cancelada: "Cancelada" };
const CANDIDATE_STATUS_LABEL = { triagem: "Triagem", entrevista: "Entrevista", aprovado: "Aprovado", reprovado: "Reprovado", contratado: "Contratado" };
const CANDIDATE_STATUS_COLOR = { triagem: "var(--text-dim)", entrevista: "#2563EB", aprovado: "var(--green)", reprovado: "var(--red)", contratado: "var(--green)" };

export default function VagasPage() {
  const { company } = useAuth();
  const [vacancies, setVacancies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [title, setTitle] = useState("");
  const [department, setDepartment] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);

  const [expandedId, setExpandedId] = useState(null);
  const [candidates, setCandidates] = useState([]);
  const [newCandidate, setNewCandidate] = useState({ full_name: "", email: "", phone: "" });

  async function loadAll() {
    setLoading(true);
    setError("");
    try {
      const { data, error: e } = await supabase.from("hr_vacancies").select("id, title, department, description, status").order("created_at", { ascending: false }).limit(50);
      if (e) throw e;
      setVacancies(data ?? []);
    } catch (err) {
      setError("Não foi possível carregar: " + (err.message ?? "erro desconhecido"));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { if (company?.id) loadAll(); }, [company?.id]);

  async function createVacancy(e) {
    e.preventDefault();
    setError("");
    if (!title) { setError("Dê um título à vaga."); return; }
    setSaving(true);

    const { error: insertError } = await supabase.from("hr_vacancies").insert({
      company_id: company.id, title, department: department || null, description: description || null,
    });

    if (insertError) { setError(insertError.message); setSaving(false); return; }
    setTitle(""); setDepartment(""); setDescription("");
    setSaving(false);
    await loadAll();
  }

  async function loadCandidates(vacancyId) {
    const { data } = await supabase.from("hr_candidates").select("id, full_name, email, phone, status").eq("vacancy_id", vacancyId).order("created_at", { ascending: false });
    setCandidates(data ?? []);
  }

  function toggleExpand(vacancy) {
    if (expandedId === vacancy.id) { setExpandedId(null); return; }
    setExpandedId(vacancy.id);
    loadCandidates(vacancy.id);
  }

  async function addCandidate(vacancyId) {
    if (!newCandidate.full_name) { setError("Informe o nome do candidato."); return; }
    setError("");
    await supabase.from("hr_candidates").insert({
      company_id: company.id, vacancy_id: vacancyId,
      full_name: newCandidate.full_name, email: newCandidate.email || null, phone: newCandidate.phone || null,
    });
    setNewCandidate({ full_name: "", email: "", phone: "" });
    await loadCandidates(vacancyId);
  }

  async function updateCandidateStatus(candidateId, status, vacancyId) {
    await supabase.from("hr_candidates").update({ status }).eq("id", candidateId);
    await loadCandidates(vacancyId);
  }

  async function updateVacancyStatus(vacancyId, status) {
    await supabase.from("hr_vacancies").update({ status }).eq("id", vacancyId);
    await loadAll();
  }

  return (
    <div>
      <header style={{ marginBottom: 20 }}>
        <h1 style={styles.title}>Recrutamento e Seleção</h1>
        <p style={styles.subtitle}>Abra a vaga, adicione candidatos e acompanhe o pipeline até a contratação.</p>
      </header>

      {error && <div style={styles.error}>{error}</div>}

      <form onSubmit={createVacancy} style={styles.form}>
        <p style={styles.formTitle}>Nova vaga</p>
        <div style={styles.row}>
          <input style={styles.input} placeholder="Título da vaga" value={title} onChange={(e) => setTitle(e.target.value)} required />
          <input style={styles.input} placeholder="Departamento (opcional)" value={department} onChange={(e) => setDepartment(e.target.value)} />
        </div>
        <input style={styles.input} placeholder="Descrição (opcional)" value={description} onChange={(e) => setDescription(e.target.value)} />
        <button style={styles.saveBtn} type="submit" disabled={saving}>{saving ? "Criando..." : "Abrir vaga"}</button>
      </form>

      {loading ? (
        <p style={styles.dim}>Carregando...</p>
      ) : vacancies.length === 0 ? (
        <p style={styles.dim}>Nenhuma vaga aberta ainda.</p>
      ) : (
        <div style={styles.list}>
          {vacancies.map((v) => (
            <div key={v.id} style={styles.card}>
              <div style={styles.cardHeader}>
                <div>
                  <strong>{v.title}</strong>
                  {v.department && <span style={styles.dim}> · {v.department}</span>}
                </div>
                <select style={styles.statusSelect} value={v.status} onChange={(e) => updateVacancyStatus(v.id, e.target.value)}>
                  {Object.entries(VACANCY_STATUS_LABEL).map(([val, l]) => <option key={val} value={val}>{l}</option>)}
                </select>
              </div>
              {v.description && <p style={styles.dim}>{v.description}</p>}
              <button style={styles.expandBtn} onClick={() => toggleExpand(v)} type="button">
                {expandedId === v.id ? "Fechar" : "Ver candidatos"}
              </button>

              {expandedId === v.id && (
                <div style={styles.detailsBox}>
                  {candidates.length === 0 ? (
                    <p style={styles.dim}>Nenhum candidato ainda.</p>
                  ) : (
                    <div style={styles.candidateList}>
                      {candidates.map((c) => (
                        <div key={c.id} style={styles.candidateRow}>
                          <div>
                            <span>{c.full_name}</span>
                            {c.email && <span style={styles.dim}> · {c.email}</span>}
                          </div>
                          <select
                            style={{ ...styles.statusSelectSmall, color: CANDIDATE_STATUS_COLOR[c.status] }}
                            value={c.status}
                            onChange={(e) => updateCandidateStatus(c.id, e.target.value, v.id)}
                          >
                            {Object.entries(CANDIDATE_STATUS_LABEL).map(([val, l]) => <option key={val} value={val}>{l}</option>)}
                          </select>
                        </div>
                      ))}
                    </div>
                  )}
                  <div style={styles.addCandidateForm}>
                    <input style={styles.input} placeholder="Nome" value={newCandidate.full_name} onChange={(e) => setNewCandidate((p) => ({ ...p, full_name: e.target.value }))} />
                    <input style={styles.input} placeholder="E-mail (opcional)" value={newCandidate.email} onChange={(e) => setNewCandidate((p) => ({ ...p, email: e.target.value }))} />
                    <button style={styles.addBtn} onClick={() => addCandidate(v.id)} type="button">+ Candidato</button>
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
  form: { display: "flex", flexDirection: "column", gap: 12, background: "var(--panel)", border: "1px solid var(--line)", borderRadius: "var(--radius)", padding: 20, marginBottom: 28, maxWidth: 680 },
  formTitle: { fontSize: 13, fontWeight: 700, color: "var(--text-dim)", textTransform: "uppercase", letterSpacing: "0.04em", margin: "0 0 4px" },
  row: { display: "flex", gap: 10 },
  input: { flex: 1, background: "var(--panel-2)", border: "1px solid var(--line)", borderRadius: "var(--radius)", padding: "9px 10px", color: "var(--text)", fontSize: 13 },
  saveBtn: { background: "var(--amber)", color: "#FFFFFF", border: "none", borderRadius: "var(--radius)", padding: "10px 0", fontWeight: 700, fontSize: 13, cursor: "pointer" },
  list: { display: "flex", flexDirection: "column", gap: 12, maxWidth: 680 },
  card: { background: "var(--panel)", border: "1px solid var(--line)", borderRadius: "var(--radius)", padding: 16 },
  cardHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 6 },
  statusSelect: { background: "var(--panel-2)", border: "1px solid var(--line)", borderRadius: "var(--radius)", padding: "4px 8px", fontSize: 12, fontWeight: 700 },
  statusSelectSmall: { background: "var(--panel-2)", border: "1px solid var(--line)", borderRadius: "var(--radius)", padding: "3px 8px", fontSize: 11, fontWeight: 700 },
  expandBtn: { marginTop: 8, background: "transparent", border: "1px solid var(--line)", color: "var(--text-dim)", borderRadius: "var(--radius)", padding: "6px 14px", fontSize: 12, cursor: "pointer" },
  detailsBox: { marginTop: 12, paddingTop: 12, borderTop: "1px solid var(--line)" },
  candidateList: { display: "flex", flexDirection: "column", gap: 8, marginBottom: 12 },
  candidateRow: { display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 13 },
  addCandidateForm: { display: "flex", gap: 8 },
  addBtn: { background: "var(--panel-2)", border: "1px solid var(--line)", color: "var(--text)", borderRadius: "var(--radius)", padding: "9px 14px", fontSize: 12, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap" },
  error: { background: "rgba(217,105,95,0.12)", border: "1px solid var(--red)", color: "var(--red)", borderRadius: "var(--radius)", padding: "10px 12px", fontSize: 13, marginBottom: 16, maxWidth: 680 },
};
