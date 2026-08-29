import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../lib/AuthContext";

const STATUS_LABEL = { planejado: "Planejado", realizado: "Realizado", cancelado: "Cancelado" };
const STATUS_COLOR = { planejado: "var(--amber)", realizado: "var(--green)", cancelado: "var(--red)" };

export default function TreinamentosPage() {
  const { company } = useAuth();
  const [employees, setEmployees] = useState([]);
  const [trainings, setTrainings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [trainingDate, setTrainingDate] = useState("");
  const [saving, setSaving] = useState(false);

  const [expandedId, setExpandedId] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [addingEmployeeId, setAddingEmployeeId] = useState("");

  async function loadAll() {
    setLoading(true);
    setError("");
    try {
      const [{ data: emp, error: e1 }, { data: tr, error: e2 }] = await Promise.all([
        supabase.from("employees").select("id, full_name").eq("status", "ativo").order("full_name"),
        supabase.from("hr_trainings").select("id, title, description, training_date, status").order("created_at", { ascending: false }).limit(50),
      ]);
      const firstError = e1 || e2;
      if (firstError) throw firstError;
      setEmployees(emp ?? []);
      setTrainings(tr ?? []);
    } catch (err) {
      setError("Não foi possível carregar: " + (err.message ?? "erro desconhecido"));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { if (company?.id) loadAll(); }, [company?.id]);

  async function createTraining(e) {
    e.preventDefault();
    setError("");
    if (!title) { setError("Dê um título ao treinamento."); return; }
    setSaving(true);

    const { error: insertError } = await supabase.from("hr_trainings").insert({
      company_id: company.id, title, description: description || null, training_date: trainingDate || null,
    });

    if (insertError) { setError(insertError.message); setSaving(false); return; }
    setTitle(""); setDescription(""); setTrainingDate("");
    setSaving(false);
    await loadAll();
  }

  async function loadParticipants(trainingId) {
    const { data } = await supabase.from("hr_training_participants").select("id, employee_id, attended, employees:employee_id (full_name)").eq("training_id", trainingId);
    setParticipants(data ?? []);
  }

  function toggleExpand(training) {
    if (expandedId === training.id) { setExpandedId(null); return; }
    setExpandedId(training.id);
    loadParticipants(training.id);
  }

  async function addParticipant(trainingId) {
    if (!addingEmployeeId) return;
    await supabase.from("hr_training_participants").insert({ company_id: company.id, training_id: trainingId, employee_id: addingEmployeeId });
    setAddingEmployeeId("");
    await loadParticipants(trainingId);
  }

  async function toggleAttended(participantId, current, trainingId) {
    await supabase.from("hr_training_participants").update({ attended: !current }).eq("id", participantId);
    await loadParticipants(trainingId);
  }

  async function updateStatus(trainingId, status) {
    await supabase.from("hr_trainings").update({ status }).eq("id", trainingId);
    await loadAll();
  }

  const availableEmployees = employees.filter((e) => !participants.some((p) => p.employee_id === e.id));

  return (
    <div>
      <header style={{ marginBottom: 20 }}>
        <h1 style={styles.title}>Treinamentos</h1>
        <p style={styles.subtitle}>Crie o treinamento, adicione participantes e marque presença.</p>
      </header>

      {error && <div style={styles.error}>{error}</div>}

      <form onSubmit={createTraining} style={styles.form}>
        <p style={styles.formTitle}>Novo treinamento</p>
        <input style={styles.input} placeholder="Título" value={title} onChange={(e) => setTitle(e.target.value)} required />
        <div style={styles.row}>
          <input style={styles.input} placeholder="Descrição (opcional)" value={description} onChange={(e) => setDescription(e.target.value)} />
          <input style={styles.input} type="date" value={trainingDate} onChange={(e) => setTrainingDate(e.target.value)} />
        </div>
        <button style={styles.saveBtn} type="submit" disabled={saving}>{saving ? "Criando..." : "Criar treinamento"}</button>
      </form>

      {loading ? (
        <p style={styles.dim}>Carregando...</p>
      ) : trainings.length === 0 ? (
        <p style={styles.dim}>Nenhum treinamento criado ainda.</p>
      ) : (
        <div style={styles.list}>
          {trainings.map((t) => (
            <div key={t.id} style={styles.card}>
              <div style={styles.cardHeader}>
                <strong>{t.title}</strong>
                <select style={{ ...styles.statusSelect, color: STATUS_COLOR[t.status] }} value={t.status} onChange={(e) => updateStatus(t.id, e.target.value)}>
                  {Object.entries(STATUS_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </div>
              {t.description && <p style={styles.dim}>{t.description}</p>}
              {t.training_date && <p style={styles.dim}>{new Date(t.training_date + "T00:00:00").toLocaleDateString("pt-BR")}</p>}
              <button style={styles.expandBtn} onClick={() => toggleExpand(t)} type="button">
                {expandedId === t.id ? "Fechar" : "Ver participantes"}
              </button>

              {expandedId === t.id && (
                <div style={styles.detailsBox}>
                  {participants.length === 0 ? (
                    <p style={styles.dim}>Nenhum participante ainda.</p>
                  ) : (
                    <ul style={styles.participantList}>
                      {participants.map((p) => (
                        <li key={p.id} style={styles.participantItem}>
                          <span>{p.employees?.full_name}</span>
                          <button
                            style={{ ...styles.attendBtn, ...(p.attended ? styles.attendedTrue : styles.attendedFalse) }}
                            onClick={() => toggleAttended(p.id, p.attended, t.id)}
                            type="button"
                          >
                            {p.attended ? "Presente" : "Ausente"}
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                  <div style={styles.addRow}>
                    <select style={styles.input} value={addingEmployeeId} onChange={(e) => setAddingEmployeeId(e.target.value)}>
                      <option value="">Adicionar colaborador...</option>
                      {availableEmployees.map((e) => <option key={e.id} value={e.id}>{e.full_name}</option>)}
                    </select>
                    <button style={styles.addBtn} onClick={() => addParticipant(t.id)} type="button">+ Adicionar</button>
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
  cardHeader: { display: "flex", justifyContent: "space-between", alignItems: "center" },
  statusSelect: { background: "var(--panel-2)", border: "1px solid var(--line)", borderRadius: "var(--radius)", padding: "4px 8px", fontSize: 12, fontWeight: 700 },
  expandBtn: { marginTop: 8, background: "transparent", border: "1px solid var(--line)", color: "var(--text-dim)", borderRadius: "var(--radius)", padding: "6px 14px", fontSize: 12, cursor: "pointer" },
  detailsBox: { marginTop: 12, paddingTop: 12, borderTop: "1px solid var(--line)" },
  participantList: { listStyle: "none", padding: 0, margin: "0 0 10px", display: "flex", flexDirection: "column", gap: 6 },
  participantItem: { display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 13 },
  attendBtn: { border: "none", borderRadius: "var(--radius)", padding: "3px 10px", fontSize: 11, fontWeight: 700, cursor: "pointer" },
  attendedTrue: { background: "rgba(79,174,126,0.15)", color: "var(--green)" },
  attendedFalse: { background: "var(--panel-2)", color: "var(--text-dim)" },
  addRow: { display: "flex", gap: 8 },
  addBtn: { background: "var(--panel-2)", border: "1px solid var(--line)", color: "var(--text)", borderRadius: "var(--radius)", padding: "9px 14px", fontSize: 12, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap" },
  error: { background: "rgba(217,105,95,0.12)", border: "1px solid var(--red)", color: "var(--red)", borderRadius: "var(--radius)", padding: "10px 12px", fontSize: 13, marginBottom: 16, maxWidth: 680 },
};
