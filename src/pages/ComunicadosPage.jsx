import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../lib/AuthContext";

const STATUS_LABEL = { pending: "Pendente", visualizado: "Visualizado", ciente: "Ciente", aceito: "Aceito", recusado: "Recusado" };

export default function ComunicadosPage() {
  const { company, profile, session } = useAuth();
  const role = profile?.access_role || "employee";
  if (role === "employee") return <EmployeeInbox company={company} profile={profile} session={session} />;
  return <AdminCommunications company={company} profile={profile} />;
}

function EmployeeInbox({ company, profile, session }) {
  const [employee, setEmployee] = useState(null);
  const [received, setReceived] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [type, setType] = useState("documento_pessoal");
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [file, setFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function load() {
    if (!company?.id || !profile?.id) return;
    setLoading(true); setError("");
    try {
      let emp = (await supabase.from("employees").select("id,full_name,role").eq("profile_id", profile.id).eq("company_id", company.id).maybeSingle()).data;
      if (!emp && session?.user?.email) emp = (await supabase.from("employees").select("id,full_name,role").eq("email", session.user.email).eq("company_id", company.id).maybeSingle()).data;
      if (!emp) throw new Error("Seu usuário ainda não está vinculado a um colaborador.");
      setEmployee(emp);
      const [r, s] = await Promise.all([
        supabase.from("hr_communication_recipients").select("id,status,viewed_at,responded_at,response_note,communication_id,hr_communications:communication_id (title,content,communication_type,file_path,file_name,due_at,requires_ack,version,created_at)").eq("employee_id", emp.id).order("created_at", { ascending: false }),
        supabase.from("hr_employee_document_submissions").select("id,document_type,title,file_path,file_name,notes,status,submitted_at,reviewed_at").eq("employee_id", emp.id).order("submitted_at", { ascending: false }),
      ]);
      if (r.error) throw r.error;
      if (s.error) throw s.error;
      setReceived(r.data ?? []); setSubmissions(s.data ?? []);
    } catch (err) { setError(err.message || "Não foi possível carregar sua caixa de entrada."); }
    finally { setLoading(false); }
  }

  useEffect(() => { load(); }, [company?.id, profile?.id, session?.user?.email]);

  async function openReceived(item) {
    if (item.status === "pending" || item.status === "pendente") {
      await supabase.from("hr_communication_recipients").update({ status: "visualizado", viewed_at: new Date().toISOString() }).eq("id", item.id);
      await load();
    }
    const path = item.hr_communications?.file_path;
    if (path) {
      const { data } = await supabase.storage.from("prodpersonal-documents").createSignedUrl(path, 300);
      if (data?.signedUrl) window.open(data.signedUrl, "_blank", "noopener,noreferrer");
    }
  }

  async function respond(item, accepted) {
    let responseNote = "";
    if (!accepted) {
      responseNote = window.prompt("Informe o motivo da recusa:") || "";
      if (!responseNote.trim()) return;
    }
    const next = accepted ? "aceito" : "recusado";
    const { error: e } = await supabase.from("hr_communication_recipients").update({ status: next, responded_at: new Date().toISOString(), response_note: responseNote || null }).eq("id", item.id);
    if (e) setError(e.message); else await load();
  }

  async function submitDocument(e) {
    e.preventDefault();
    if (!employee || !file || !title.trim()) { setError("Informe o título e selecione o arquivo."); return; }
    setSaving(true); setError("");
    try {
      const path = `${company.id}/${employee.id}/${crypto.randomUUID()}-${file.name}`;
      const upload = await supabase.storage.from("prodpersonal-documents").upload(path, file);
      if (upload.error) throw upload.error;
      const { error: insertError } = await supabase.from("hr_employee_document_submissions").insert({ company_id: company.id, employee_id: employee.id, document_type: type, title: title.trim(), file_path: path, file_name: file.name, notes: notes.trim() || null, status: "pendente" });
      if (insertError) throw insertError;
      setTitle(""); setNotes(""); setFile(null);
      const input = document.getElementById("employee-document-file"); if (input) input.value = "";
      await load();
    } catch (err) { setError(err.message || "Não foi possível enviar o documento ao RH."); }
    finally { setSaving(false); }
  }

  async function openSubmission(item) {
    if (!item.file_path) return;
    const { data } = await supabase.storage.from("prodpersonal-documents").createSignedUrl(item.file_path, 300);
    if (data?.signedUrl) window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  }

  const pendingCount = received.filter((x) => ["pending", "pendente", "visualizado"].includes(x.status)).length;

  return (
    <div>
      <header style={styles.header}>
        <span style={styles.eyebrow}>Portal do Colaborador</span>
        <h1 style={styles.title}>Minha Caixa de Entrada</h1>
        <p style={styles.sub}>Tudo o que o RH enviou para você e os documentos que você precisa encaminhar ao RH ficam aqui.</p>
      </header>
      {error && <div style={styles.error}>{error}</div>}
      {loading ? <p style={styles.dim}>Carregando...</p> : (
        <>
          <section style={styles.summary}>
            <div><strong>{pendingCount}</strong><span>pendência(s) de leitura/ação</span></div>
            <div><strong>{submissions.length}</strong><span>documento(s) enviados ao RH</span></div>
          </section>

          <div style={styles.grid}>
            <section style={styles.card}>
              <div style={styles.cardHead}><div><h2 style={styles.sectionTitle}>📥 Recebidos do RH</h2><p style={styles.dim}>Leia os comunicados e responda quando houver aceite obrigatório.</p></div></div>
              {received.length === 0 ? <p style={styles.dim}>Nenhum comunicado ou documento recebido.</p> : received.map((item) => {
                const c = item.hr_communications;
                const actionable = ["pending", "pendente", "visualizado"].includes(item.status) && c?.requires_ack;
                return <article key={item.id} style={styles.notice}>
                  <div style={{ flex: 1 }}><div style={styles.noticeTop}><strong>{c?.title || "Comunicado"}</strong><span style={item.status === "aceito" || item.status === "ciente" ? styles.ok : item.status === "recusado" ? styles.bad : styles.pending}>{STATUS_LABEL[item.status] || item.status}</span></div><p style={styles.noticeText}>{c?.content || "Documento enviado pelo RH."}</p><small style={styles.dim}>{c?.communication_type || "comunicado"}{c?.file_name ? ` · ${c.file_name}` : ""}{c?.due_at ? ` · prazo ${new Date(c.due_at).toLocaleDateString("pt-BR")}` : ""}</small></div>
                  <div style={styles.actions}><button type="button" style={styles.secondaryBtn} onClick={() => openReceived(item)}>{c?.file_path ? "Abrir documento" : "Marcar como lido"}</button>{actionable && <><button type="button" style={styles.acceptBtn} onClick={() => respond(item, true)}>✓ Ciente/Aceito</button><button type="button" style={styles.rejectBtn} onClick={() => respond(item, false)}>Recusar</button></>}</div>
                </article>;
              })}
            </section>

            <section style={styles.card}>
              <h2 style={styles.sectionTitle}>📤 Enviar documento ao RH</h2>
              <p style={styles.dim}>Envie atestados, comprovantes, documentos pessoais ou qualquer arquivo solicitado pelo RH/DP.</p>
              <form onSubmit={submitDocument} style={styles.form}>
                <select style={styles.input} value={type} onChange={(e) => setType(e.target.value)}><option value="documento_pessoal">Documento pessoal</option><option value="comprovante">Comprovante</option><option value="atestado">Atestado</option><option value="certificado">Certificado</option><option value="outro">Outro</option></select>
                <input style={styles.input} placeholder="Título do documento" value={title} onChange={(e) => setTitle(e.target.value)} required />
                <textarea style={{ ...styles.input, minHeight: 90 }} placeholder="Observação para o RH (opcional)" value={notes} onChange={(e) => setNotes(e.target.value)} />
                <input id="employee-document-file" type="file" onChange={(e) => setFile(e.target.files?.[0] || null)} required />
                <button type="submit" style={styles.primaryBtn} disabled={saving}>{saving ? "Enviando..." : "Enviar ao RH"}</button>
              </form>
              <h3 style={styles.subTitle}>Meus envios</h3>
              {submissions.length === 0 ? <p style={styles.dim}>Você ainda não enviou documentos.</p> : submissions.slice(0, 8).map((s) => <div key={s.id} style={styles.submission}><div><strong>{s.title}</strong><small>{s.file_name} · {new Date(s.submitted_at).toLocaleDateString("pt-BR")}</small></div><span style={s.status === "aprovado" ? styles.ok : s.status === "rejeitado" ? styles.bad : styles.pending}>{s.status === "pendente" ? "Em análise" : s.status}</span><button type="button" style={styles.linkBtn} onClick={() => openSubmission(s)}>Abrir</button></div>)}
            </section>
          </div>
        </>
      )}
    </div>
  );
}

function AdminCommunications({ company, profile }) {
  const [employees, setEmployees] = useState([]), [items, setItems] = useState([]), [submissions, setSubmissions] = useState([]), [title, setTitle] = useState(""), [content, setContent] = useState(""), [type, setType] = useState("comunicado"), [requiresAck, setRequiresAck] = useState(true), [due, setDue] = useState(""), [file, setFile] = useState(null), [targets, setTargets] = useState([]), [all, setAll] = useState(false), [saving, setSaving] = useState(false), [error, setError] = useState("");
  async function load() { if (!company?.id) return; const [{ data: e }, { data: c }, { data: s }] = await Promise.all([supabase.from("employees").select("id,full_name,role").eq("status", "ativo").order("full_name"), supabase.from("hr_communications").select("id,title,communication_type,requires_ack,due_at,version,status,created_at").order("created_at", { ascending: false }), supabase.from("hr_employee_document_submissions").select("id,employee_id,title,file_name,document_type,status,submitted_at,employees:employee_id(full_name)").order("submitted_at", { ascending: false }).limit(30)]); setEmployees(e || []); setItems(c || []); setSubmissions(s || []); }
  useEffect(() => { load(); }, [company?.id]);
  function toggle(id) { setTargets((v) => v.includes(id) ? v.filter((x) => x !== id) : [...v, id]); }
  async function publish(e) { e.preventDefault(); setError(""); if (!title) return setError("Informe o título."); if (!all && !targets.length) return setError("Selecione os destinatários ou marque Todos."); setSaving(true); try { let path = null; if (file) { path = `${company.id}/${crypto.randomUUID()}-${file.name}`; const { error } = await supabase.storage.from("prodpersonal-documents").upload(path, file); if (error) throw error; } const { data: comm, error: ce } = await supabase.from("hr_communications").insert({ company_id: company.id, title, content, communication_type: type, file_path: path, file_name: file?.name || null, requires_ack: requiresAck, due_at: due ? new Date(due).toISOString() : null, created_by: profile?.id, published_at: new Date().toISOString(), status: "published" }).select("id").single(); if (ce) throw ce; const ids = all ? employees.map((x) => x.id) : targets; const { error: re } = await supabase.from("hr_communication_recipients").insert(ids.map((employee_id) => ({ company_id: company.id, communication_id: comm.id, employee_id, status: "pending" }))); if (re) throw re; setTitle(""); setContent(""); setFile(null); setTargets([]); setAll(false); setDue(""); await load(); } catch (err) { setError(err.message || "Não foi possível publicar."); } finally { setSaving(false); } }
  async function review(id, status) { await supabase.from("hr_employee_document_submissions").update({ status, reviewed_at: new Date().toISOString(), reviewed_by: profile?.id }).eq("id", id); await load(); }
  async function openSubmission(id) { const { data: row } = await supabase.from("hr_employee_document_submissions").select("file_path").eq("id", id).single(); if (row?.file_path) { const { data } = await supabase.storage.from("prodpersonal-documents").createSignedUrl(row.file_path, 300); if (data?.signedUrl) window.open(data.signedUrl, "_blank", "noopener,noreferrer"); } }
  return <div><header style={styles.header}><h1 style={styles.title}>Comunicados e Documentos</h1><p style={styles.sub}>Envie informações para os colaboradores e acompanhe ciência, aceite e documentos recebidos.</p></header>{error && <div style={styles.error}>{error}</div>}<div style={styles.grid}><form onSubmit={publish} style={styles.card}><h2 style={styles.sectionTitle}>Novo comunicado</h2><input style={styles.input} placeholder="Título" value={title} onChange={(e) => setTitle(e.target.value)} /><textarea style={styles.input} placeholder="Mensagem / instruções" value={content} onChange={(e) => setContent(e.target.value)} /><div style={styles.row}><select style={styles.input} value={type} onChange={(e) => setType(e.target.value)}><option value="comunicado">Comunicado</option><option value="documento">Documento</option><option value="politica">Política</option><option value="termo">Termo</option></select><input style={styles.input} type="datetime-local" value={due} onChange={(e) => setDue(e.target.value)} /></div><label style={styles.check}><input type="checkbox" checked={requiresAck} onChange={(e) => setRequiresAck(e.target.checked)} /> Exigir ciência/aceite</label><input type="file" onChange={(e) => setFile(e.target.files?.[0] || null)} /><div style={styles.targetHeader}><strong>Destinatários</strong><label><input type="checkbox" checked={all} onChange={(e) => { setAll(e.target.checked); if (e.target.checked) setTargets([]); }} /> Todos</label></div><div style={styles.targets}>{employees.map((x) => <label key={x.id}><input type="checkbox" checked={targets.includes(x.id)} disabled={all} onChange={() => toggle(x.id)} /> {x.full_name} <small>{x.role}</small></label>)}</div><button style={styles.primaryBtn} disabled={saving}>{saving ? "Publicando..." : "Publicar comunicado"}</button></form><section style={styles.card}><h2 style={styles.sectionTitle}>Publicados</h2>{items.length ? items.map((x) => <div key={x.id} style={styles.item}><div><strong>{x.title}</strong><small>{x.communication_type} · v{x.version}{x.requires_ack ? " · exige ciência" : ""}</small></div><span>{new Date(x.created_at).toLocaleDateString("pt-BR")}</span></div>) : <p style={styles.dim}>Nenhum comunicado publicado.</p>}<p style={styles.note}>Cada destinatário possui seu próprio status: Pendente, Visualizado, Ciente/Aceito ou Recusado.</p></section></div><section style={styles.card}><h2 style={styles.sectionTitle}>📥 Documentos recebidos dos colaboradores</h2>{submissions.length === 0 ? <p style={styles.dim}>Nenhum documento recebido.</p> : submissions.map((s) => <div key={s.id} style={styles.submission}><div><strong>{s.title}</strong><small>{s.employees?.full_name || "Colaborador"} · {s.file_name} · {new Date(s.submitted_at).toLocaleDateString("pt-BR")}</small></div><select style={styles.statusSelect} value={s.status} onChange={(e) => review(s.id, e.target.value)}><option value="pendente">Pendente</option><option value="em_analise">Em análise</option><option value="aprovado">Aprovado</option><option value="rejeitado">Rejeitado</option></select><button type="button" style={styles.linkBtn} onClick={() => openSubmission(s.id)}>Abrir</button></div>)}</section></div>;
}

const styles = {
  header: { marginBottom: 20 },
  eyebrow: { color: "var(--amber)", fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: ".08em" },
  title: { fontFamily: "var(--font-display)", fontSize: 24, margin: "3px 0 5px" },
  sub: { color: "var(--text-dim)", fontSize: 13, margin: 0 },
  summary: { display: "grid", gridTemplateColumns: "repeat(2,minmax(180px,1fr))", gap: 12, marginBottom: 16 },
  summaryBox: {},
  summary: { display: "grid", gridTemplateColumns: "repeat(2,minmax(180px,1fr))", gap: 12, marginBottom: 16 },
  grid: { display: "grid", gridTemplateColumns: "minmax(0,1.15fr) minmax(340px,.85fr)", gap: 16, alignItems: "start" },
  card: { background: "var(--panel)", border: "1px solid var(--line)", borderRadius: "var(--radius)", padding: 18, marginBottom: 16 },
  sectionTitle: { fontFamily: "var(--font-display)", fontSize: 15, margin: "0 0 5px" },
  dim: { color: "var(--text-dim)", fontSize: 12.5 },
  notice: { padding: "14px 0", borderBottom: "1px solid var(--line)", display: "flex", gap: 14, alignItems: "center" },
  noticeTop: { display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" },
  noticeText: { fontSize: 13, lineHeight: 1.5, margin: "6px 0" },
  pending: { color: "var(--amber)", fontSize: 11, fontWeight: 800 },
  ok: { color: "var(--green)", fontSize: 11, fontWeight: 800 },
  bad: { color: "var(--red)", fontSize: 11, fontWeight: 800 },
  actions: { display: "flex", flexDirection: "column", gap: 6, minWidth: 130 },
  secondaryBtn: { background: "var(--panel-2)", border: "1px solid var(--line)", borderRadius: "var(--radius)", padding: "7px 10px", color: "var(--text)", fontSize: 11.5, fontWeight: 700, cursor: "pointer" },
  acceptBtn: { background: "var(--green)", color: "#fff", border: 0, borderRadius: "var(--radius)", padding: "7px 10px", fontSize: 11.5, fontWeight: 700, cursor: "pointer" },
  rejectBtn: { background: "transparent", color: "var(--red)", border: "1px solid var(--red)", borderRadius: "var(--radius)", padding: "7px 10px", fontSize: 11.5, fontWeight: 700, cursor: "pointer" },
  form: { display: "flex", flexDirection: "column", gap: 10, marginTop: 14 },
  input: { width: "100%", boxSizing: "border-box", background: "var(--panel-2)", border: "1px solid var(--line)", borderRadius: "var(--radius)", padding: "9px 10px", color: "var(--text)", fontSize: 13 },
  primaryBtn: { background: "var(--amber)", color: "#fff", border: 0, borderRadius: "var(--radius)", padding: "10px 14px", fontWeight: 700, cursor: "pointer" },
  subTitle: { fontSize: 13, margin: "22px 0 8px" },
  submission: { display: "flex", alignItems: "center", gap: 10, padding: "10px 0", borderBottom: "1px solid var(--line)" },
  submission: { display: "grid", gridTemplateColumns: "1fr auto auto", gap: 10, alignItems: "center", padding: "10px 0", borderBottom: "1px solid var(--line)" },
  linkBtn: { background: "transparent", border: "1px solid var(--line)", borderRadius: "var(--radius)", padding: "5px 9px", color: "var(--text)", fontSize: 11, cursor: "pointer" },
  statusSelect: { background: "var(--panel-2)", border: "1px solid var(--line)", borderRadius: "var(--radius)", padding: "5px 8px", color: "var(--text)", fontSize: 11 },
  item: { display: "flex", justifyContent: "space-between", gap: 10, padding: "12px 0", borderBottom: "1px solid var(--line)", fontSize: 13 },
  note: { color: "var(--text-dim)", fontSize: 12 },
  row: { display: "flex", gap: 10 },
  check: { fontSize: 13, color: "var(--text-dim)" },
  targetHeader: { display: "flex", justifyContent: "space-between", marginTop: 8 },
  targets: { maxHeight: 220, overflowY: "auto", display: "flex", flexDirection: "column", gap: 7, padding: 10, background: "var(--panel-2)", borderRadius: "var(--radius)" },
  error: { background: "rgba(217,105,95,.12)", border: "1px solid var(--red)", color: "var(--red)", borderRadius: "var(--radius)", padding: "10px 12px", fontSize: 13, marginBottom: 16 },
};
