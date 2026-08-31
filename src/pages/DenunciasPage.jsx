import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../lib/AuthContext";

const STATUS_LABEL = { aberta: "Aberta", em_analise: "Em análise", resolvida: "Resolvida" };
const STATUS_COLOR = { aberta: "var(--red)", em_analise: "var(--amber)", resolvida: "var(--green)" };

export default function DenunciasPage() {
  const { company } = useAuth();
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);

  async function loadAll() {
    setLoading(true);
    setError("");
    try {
      const { data, error: e } = await supabase.from("hr_complaints").select("id, category, description, status, created_at").order("created_at", { ascending: false });
      if (e) throw e;
      setComplaints(data ?? []);
    } catch (err) {
      setError("Não foi possível carregar: " + (err.message ?? "erro desconhecido"));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { if (company?.id) loadAll(); }, [company?.id]);

  async function submit(e) {
    e.preventDefault();
    if (!description) { setError("Descreva a denúncia."); return; }
    setError("");
    setSaving(true);
    const { error: insertError } = await supabase.from("hr_complaints").insert({ company_id: company.id, category: category || null, description, anonymous: true });
    if (insertError) { setError(insertError.message); setSaving(false); return; }
    setCategory(""); setDescription("");
    setSaving(false);
    await loadAll();
  }

  async function updateStatus(id, status) {
    await supabase.from("hr_complaints").update({ status }).eq("id", id);
    await loadAll();
  }

  return (
    <div>
      <header style={{ marginBottom: 20 }}>
        <h1 style={styles.title}>Canal de Denúncias</h1>
        <p style={styles.subtitle}>Anônimo por padrão — ninguém precisa se identificar pra registrar.</p>
      </header>

      {error && <div style={styles.error}>{error}</div>}

      <form onSubmit={submit} style={styles.form}>
        <p style={styles.formTitle}>Nova denúncia</p>
        <input style={styles.input} placeholder="Categoria (opcional, ex: assédio, segurança, ética)" value={category} onChange={(e) => setCategory(e.target.value)} />
        <textarea style={{ ...styles.input, minHeight: 90 }} placeholder="Descreva o que aconteceu" value={description} onChange={(e) => setDescription(e.target.value)} required />
        <button style={styles.saveBtn} type="submit" disabled={saving}>{saving ? "Enviando..." : "Enviar denúncia"}</button>
      </form>

      <h2 style={styles.title2}>Denúncias registradas</h2>
      {loading ? (
        <p style={styles.dim}>Carregando...</p>
      ) : complaints.length === 0 ? (
        <p style={styles.dim}>Nenhuma denúncia registrada.</p>
      ) : (
        <div style={styles.list}>
          {complaints.map((c) => (
            <div key={c.id} style={styles.card}>
              <div style={styles.cardHeader}>
                <span>{c.category || "Sem categoria"} · {new Date(c.created_at).toLocaleDateString("pt-BR")}</span>
                <select style={{ ...styles.select, color: STATUS_COLOR[c.status] }} value={c.status} onChange={(e) => updateStatus(c.id, e.target.value)}>
                  {Object.entries(STATUS_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </div>
              <p style={styles.desc}>{c.description}</p>
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
  dim: { color: "var(--text-dim)", fontSize: 13 },
  desc: { fontSize: 13, margin: "8px 0 0" },
  form: { display: "flex", flexDirection: "column", gap: 12, background: "var(--panel)", border: "1px solid var(--line)", borderRadius: "var(--radius)", padding: 20, marginBottom: 28, maxWidth: 680 },
  formTitle: { fontSize: 13, fontWeight: 700, color: "var(--text-dim)", textTransform: "uppercase", letterSpacing: "0.04em", margin: "0 0 4px" },
  input: { background: "var(--panel-2)", border: "1px solid var(--line)", borderRadius: "var(--radius)", padding: "9px 10px", color: "var(--text)", fontSize: 13, fontFamily: "inherit" },
  saveBtn: { background: "var(--amber)", color: "#FFFFFF", border: "none", borderRadius: "var(--radius)", padding: "10px 0", fontWeight: 700, fontSize: 13, cursor: "pointer" },
  list: { display: "flex", flexDirection: "column", gap: 12, maxWidth: 680 },
  card: { background: "var(--panel)", border: "1px solid var(--line)", borderRadius: "var(--radius)", padding: 16 },
  cardHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 12, color: "var(--text-dim)" },
  select: { background: "var(--panel-2)", border: "1px solid var(--line)", borderRadius: "var(--radius)", padding: "4px 8px", fontSize: 11.5, fontWeight: 700 },
  error: { background: "rgba(217,105,95,0.12)", border: "1px solid var(--red)", color: "var(--red)", borderRadius: "var(--radius)", padding: "10px 12px", fontSize: 13, marginBottom: 16, maxWidth: 680 },
};
