import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../lib/AuthContext";

export default function MuralPage() {
  const { company, profile } = useAuth();
  const role = profile?.access_role || "employee";
  const isEmployee = role === "employee";
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);

  async function loadAll() {
    setLoading(true);
    setError("");
    try {
      const { data, error: e } = await supabase.from("hr_mural_posts").select("id, title, content, pinned, created_at").order("pinned", { ascending: false }).order("created_at", { ascending: false });
      if (e) throw e;
      setPosts(data ?? []);
    } catch (err) {
      setError("Não foi possível carregar: " + (err.message ?? "erro desconhecido"));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { if (company?.id) loadAll(); }, [company?.id]);

  async function createPost(e) {
    e.preventDefault();
    setError("");
    if (!title) { setError("Dê um título ao aviso."); return; }
    setSaving(true);
    const { error: insertError } = await supabase.from("hr_mural_posts").insert({ company_id: company.id, title, content: content || null, created_by: profile?.id });
    if (insertError) { setError(insertError.message); setSaving(false); return; }
    setTitle(""); setContent("");
    setSaving(false);
    await loadAll();
  }

  async function togglePin(id, current) {
    await supabase.from("hr_mural_posts").update({ pinned: !current }).eq("id", id);
    await loadAll();
  }

  async function remove(id) {
    await supabase.from("hr_mural_posts").delete().eq("id", id);
    await loadAll();
  }

  return (
    <div>
      <header style={{ marginBottom: 20 }}>
        <h1 style={styles.title}>Mural</h1>
        <p style={styles.subtitle}>{isEmployee ? "Avisos e comunicados publicados pela empresa." : "Avisos e comunicados pra toda a empresa."}</p>
      </header>

      {error && <div style={styles.error}>{error}</div>}

      {!isEmployee && <form onSubmit={createPost} style={styles.form}>
        <input style={styles.input} placeholder="Título do aviso" value={title} onChange={(e) => setTitle(e.target.value)} required />
        <textarea style={{ ...styles.input, minHeight: 70 }} placeholder="Conteúdo (opcional)" value={content} onChange={(e) => setContent(e.target.value)} />
        <button style={styles.saveBtn} type="submit" disabled={saving}>{saving ? "Publicando..." : "Publicar"}</button>
      </form>}

      {loading ? (
        <p style={styles.dim}>Carregando...</p>
      ) : posts.length === 0 ? (
        <p style={styles.dim}>Nenhum aviso publicado ainda.</p>
      ) : (
        <div style={styles.list}>
          {posts.map((p) => (
            <div key={p.id} style={styles.card}>
              <div style={styles.cardHeader}>
                <strong>{p.pinned && "📌 "}{p.title}</strong>
                {!isEmployee && <div style={styles.cardActions}>
                  <button style={styles.smallBtn} onClick={() => togglePin(p.id, p.pinned)} type="button">{p.pinned ? "Desafixar" : "Fixar"}</button>
                  <button style={{ ...styles.smallBtn, color: "var(--red)" }} onClick={() => remove(p.id)} type="button">Excluir</button>
                </div>}
              </div>
              {p.content && <p style={styles.dim}>{p.content}</p>}
              <p style={styles.date}>{new Date(p.created_at).toLocaleDateString("pt-BR")}</p>
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
  dim: { color: "var(--text-dim)", fontSize: 13 },
  date: { fontSize: 11, color: "var(--text-dim)", margin: "8px 0 0" },
  form: { display: "flex", flexDirection: "column", gap: 12, background: "var(--panel)", border: "1px solid var(--line)", borderRadius: "var(--radius)", padding: 20, marginBottom: 28, maxWidth: 680 },
  input: { background: "var(--panel-2)", border: "1px solid var(--line)", borderRadius: "var(--radius)", padding: "9px 10px", color: "var(--text)", fontSize: 13, fontFamily: "inherit" },
  saveBtn: { background: "var(--amber)", color: "#FFFFFF", border: "none", borderRadius: "var(--radius)", padding: "10px 0", fontWeight: 700, fontSize: 13, cursor: "pointer" },
  list: { display: "flex", flexDirection: "column", gap: 12, maxWidth: 680 },
  card: { background: "var(--panel)", border: "1px solid var(--line)", borderRadius: "var(--radius)", padding: 16 },
  cardHeader: { display: "flex", justifyContent: "space-between", alignItems: "center" },
  cardActions: { display: "flex", gap: 8 },
  smallBtn: { background: "transparent", border: "1px solid var(--line)", color: "var(--text-dim)", borderRadius: "var(--radius)", padding: "3px 10px", fontSize: 11, cursor: "pointer" },
  error: { background: "rgba(217,105,95,0.12)", border: "1px solid var(--red)", color: "var(--red)", borderRadius: "var(--radius)", padding: "10px 12px", fontSize: 13, marginBottom: 16, maxWidth: 680 },
};
