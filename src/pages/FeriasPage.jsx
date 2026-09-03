import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../lib/AuthContext";
import VacationDashboard from "../components/VacationDashboard";

const STATUS_LABEL = { solicitada: "Solicitada", aprovada: "Aprovada", reprovada: "Reprovada", em_gozo: "Em gozo", concluida: "Concluída" };
const STATUS_COLOR = { solicitada: "var(--amber)", aprovada: "#2563EB", reprovada: "var(--red)", em_gozo: "#2563EB", concluida: "var(--green)" };
const ADMIN_ROLES = ["rh", "dp", "hr", "admin", "administrator", "master"];

function formatDate(value) {
  if (!value) return "—";
  const d = new Date(`${String(value).slice(0, 10)}T00:00:00`);
  return Number.isNaN(d.getTime()) ? String(value) : d.toLocaleDateString("pt-BR");
}

export default function FeriasPage() {
  const { company, profile } = useAuth();
  const role = String(profile?.access_role || "employee").toLowerCase();
  const isAdmin = ADMIN_ROLES.includes(role);

  const [myEmployee, setMyEmployee] = useState(null);
  const [teamIds, setTeamIds] = useState([]);
  const [myVacations, setMyVacations] = useState([]);
  const [pendingApprovals, setPendingApprovals] = useState([]);
  const [allVacations, setAllVacations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [periodStart, setPeriodStart] = useState("");
  const [daysTaken, setDaysTaken] = useState(30);
  const [saving, setSaving] = useState(false);

  async function loadAll() {
    setLoading(true);
    setError("");
    try {
      let me = null;
      if (profile?.id) {
        const { data } = await supabase.from("employees").select("id, full_name").eq("company_id", company.id).eq("profile_id", profile.id).maybeSingle();
        me = data;
        if (!me && profile?.email) {
          const { data: byEmail } = await supabase.from("employees").select("id, full_name").eq("company_id", company.id).eq("email", profile.email).maybeSingle();
          me = byEmail;
        }
      }
      setMyEmployee(me);

      const vacationSelect = "id, employee_id, period_start, period_end, days_taken, status, decision_notes, employees:employee_id (full_name)";

      if (me) {
        const { data: mine } = await supabase.from("hr_vacations").select(vacationSelect).eq("employee_id", me.id).order("period_start", { ascending: false });
        setMyVacations(mine ?? []);
      }

      let approverIds = [];
      if (me) {
        const [{ data: direct }, { data: delegated }] = await Promise.all([
          supabase.from("employees").select("id").eq("company_id", company.id).eq("manager_id", me.id),
          supabase.from("hr_employee_managers").select("employee_id").eq("company_id", company.id).eq("manager_id", me.id).eq("can_approve", true),
        ]);
        approverIds = [...new Set([...(direct ?? []).map((x) => x.id), ...(delegated ?? []).map((x) => x.employee_id)])];
      }
      setTeamIds(approverIds);

      if (approverIds.length > 0) {
        const { data: pending } = await supabase.from("hr_vacations").select(vacationSelect).in("employee_id", approverIds).eq("status", "solicitada").order("period_start");
        setPendingApprovals(pending ?? []);
      } else {
        setPendingApprovals([]);
      }

      if (isAdmin) {
        const { data: all } = await supabase.from("hr_vacations").select(vacationSelect).order("period_start", { ascending: false }).limit(300);
        setAllVacations(all ?? []);
      }
    } catch (err) {
      setError("Não foi possível carregar: " + (err.message ?? "erro desconhecido"));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { if (company?.id && profile?.id) loadAll(); }, [company?.id, profile?.id, role]);

  async function requestVacation(e) {
    e.preventDefault();
    setError("");
    if (!myEmployee) { setError("Seu cadastro não está vinculado a um colaborador — fale com o RH."); return; }
    if (!periodStart) { setError("Escolha a data de início."); return; }
    setSaving(true);

    const start = new Date(`${periodStart}T00:00:00`);
    const end = new Date(start);
    end.setDate(end.getDate() + Number(daysTaken) - 1);

    const { error: insertError } = await supabase.from("hr_vacations").insert({
      company_id: company.id, employee_id: myEmployee.id, period_start: periodStart,
      period_end: end.toISOString().slice(0, 10), acquisition_start: periodStart, acquisition_end: periodStart,
      days_taken: Number(daysTaken), status: "solicitada", requested_by: profile.id,
    });

    setSaving(false);
    if (insertError) { setError(insertError.message); return; }
    setPeriodStart(""); setDaysTaken(30);
    await loadAll();
  }

  async function decide(id, status) {
    let notes = null;
    if (status === "reprovada") notes = window.prompt("Motivo da reprovação (opcional):") || null;
    const { error: updateError } = await supabase.from("hr_vacations").update({ status, decided_by: profile.id, decided_at: new Date().toISOString(), decision_notes: notes }).eq("id", id);
    if (updateError) setError(updateError.message); else await loadAll();
  }

  async function updateStatus(id, status) {
    const { error: updateError } = await supabase.from("hr_vacations").update({ status }).eq("id", id);
    if (updateError) setError(updateError.message); else await loadAll();
  }

  const today = new Date(); today.setHours(0, 0, 0, 0);
  const soon = new Date(today); soon.setDate(soon.getDate() + 30);

  const dashboardRows = useMemo(() => (isAdmin ? allVacations : [...myVacations, ...pendingApprovals]).map((v) => {
    const start = new Date(`${v.period_start}T00:00:00`);
    const end = new Date(`${v.period_end}T23:59:59`);
    return {
      ...v, employee_name: v.employees?.full_name,
      active_now: v.status === "em_gozo" || (v.status === "aprovada" && start <= today && end >= today),
      overdue: !["concluida", "reprovada"].includes(v.status) && end < today,
      expiring_soon: !["concluida", "reprovada"].includes(v.status) && start >= today && start <= soon,
    };
  }), [isAdmin, allVacations, myVacations, pendingApprovals]);

  return (
    <div>
      <header style={{ marginBottom: 20 }}>
        <h1 style={styles.title}>Controle de Férias</h1>
        <p style={styles.subtitle}>
          {isAdmin ? "Central de férias: solicitações, aprovações e acompanhamento de toda a empresa." : teamIds.length > 0 ? "Suas férias e as solicitações da sua equipe." : "Solicite suas férias e acompanhe o status."}
        </p>
      </header>

      {error && <div style={styles.error}>{error}</div>}

      {isAdmin && !loading && <VacationDashboard role="rh" rows={dashboardRows} />}

      <div style={styles.grid}>
        <section>
          <h2 style={styles.sectionTitle}>Minhas férias</h2>
          <form onSubmit={requestVacation} style={styles.form}>
            <div style={styles.row}>
              <label style={styles.field}><span>Data de início</span><input style={styles.input} type="date" value={periodStart} onChange={(e) => setPeriodStart(e.target.value)} required /></label>
              <label style={styles.field}><span>Dias de gozo</span><input style={styles.input} type="number" min="1" max="30" value={daysTaken} onChange={(e) => setDaysTaken(e.target.value)} /></label>
            </div>
            <button style={styles.saveBtn} type="submit" disabled={saving || !myEmployee}>{saving ? "Enviando..." : "Solicitar férias"}</button>
            {!myEmployee && <p style={styles.dim}>Seu usuário não está vinculado a um cadastro de colaborador — fale com o RH pra poder solicitar.</p>}
          </form>

          {loading ? <p style={styles.dim}>Carregando...</p> : myVacations.length === 0 ? <p style={styles.dim}>Nenhuma solicitação ainda.</p> : (
            <div style={styles.list}>
              {myVacations.map((v) => (
                <div key={v.id} style={styles.card}>
                  <div style={styles.cardHead}>
                    <span>{formatDate(v.period_start)} a {formatDate(v.period_end)} · {v.days_taken} dias</span>
                    <span style={{ ...styles.badge, color: STATUS_COLOR[v.status] }}>{STATUS_LABEL[v.status]}</span>
                  </div>
                  {v.decision_notes && <p style={styles.dim}>Motivo: {v.decision_notes}</p>}
                </div>
              ))}
            </div>
          )}
        </section>

        {teamIds.length > 0 && (
          <section>
            <h2 style={styles.sectionTitle}>Aprovações pendentes da equipe</h2>
            {pendingApprovals.length === 0 ? <p style={styles.dim}>Nenhuma solicitação pendente.</p> : (
              <div style={styles.list}>
                {pendingApprovals.map((v) => (
                  <div key={v.id} style={styles.card}>
                    <div style={styles.cardHead}>
                      <strong>{v.employees?.full_name}</strong>
                      <span style={{ ...styles.badge, color: STATUS_COLOR[v.status] }}>{STATUS_LABEL[v.status]}</span>
                    </div>
                    <p style={styles.dim}>{formatDate(v.period_start)} a {formatDate(v.period_end)} · {v.days_taken} dias</p>
                    <div style={styles.approveRow}>
                      <button style={styles.approveBtn} onClick={() => decide(v.id, "aprovada")} type="button">✓ Aprovar</button>
                      <button style={styles.rejectBtn} onClick={() => decide(v.id, "reprovada")} type="button">✕ Reprovar</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}
      </div>

      {isAdmin && (
        <section style={{ marginTop: 28 }}>
          <h2 style={styles.sectionTitle}>Todas as férias da empresa</h2>
          {loading ? <p style={styles.dim}>Carregando...</p> : allVacations.length === 0 ? <p style={styles.dim}>Nenhum período registrado.</p> : (
            <div style={styles.list}>
              {allVacations.map((v) => (
                <div key={v.id} style={styles.card}>
                  <div style={styles.cardHead}>
                    <strong>{v.employees?.full_name}</strong>
                    <select style={{ ...styles.statusSelect, color: STATUS_COLOR[v.status] }} value={v.status} onChange={(e) => updateStatus(v.id, e.target.value)}>
                      {Object.entries(STATUS_LABEL).map(([val, l]) => <option key={val} value={val}>{l}</option>)}
                    </select>
                  </div>
                  <p style={styles.dim}>{formatDate(v.period_start)} a {formatDate(v.period_end)} · {v.days_taken} dias</p>
                </div>
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
}

const styles = {
  title: { fontFamily: "var(--font-display)", fontSize: 22, margin: 0 },
  subtitle: { color: "var(--text-dim)", fontSize: 13, margin: "6px 0 0" },
  dim: { color: "var(--text-dim)", fontSize: 12.5 },
  sectionTitle: { fontFamily: "var(--font-display)", fontSize: 16, margin: "0 0 12px" },
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))", gap: 28, marginTop: 24 },
  form: { display: "flex", flexDirection: "column", gap: 12, background: "var(--panel)", border: "1px solid var(--line)", borderRadius: "var(--radius)", padding: 18, marginBottom: 20 },
  row: { display: "flex", gap: 10 },
  field: { display: "flex", flexDirection: "column", gap: 5, fontSize: 11, fontWeight: 700, color: "var(--text-dim)", flex: 1 },
  input: { background: "var(--panel-2)", border: "1px solid var(--line)", borderRadius: "var(--radius)", padding: "9px 10px", color: "var(--text)", fontSize: 13, fontWeight: 400 },
  saveBtn: { background: "var(--amber)", color: "#FFFFFF", border: "none", borderRadius: "var(--radius)", padding: "10px 0", fontWeight: 700, fontSize: 13, cursor: "pointer" },
  list: { display: "flex", flexDirection: "column", gap: 10 },
  card: { background: "var(--panel)", border: "1px solid var(--line)", borderRadius: "var(--radius)", padding: 14 },
  cardHead: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, fontSize: 13 },
  badge: { fontSize: 11.5, fontWeight: 700, whiteSpace: "nowrap" },
  statusSelect: { background: "var(--panel-2)", border: "1px solid var(--line)", borderRadius: "var(--radius)", padding: "4px 8px", fontSize: 11.5, fontWeight: 700 },
  approveRow: { display: "flex", gap: 8, marginTop: 10 },
  approveBtn: { flex: 1, background: "var(--green)", color: "#FFFFFF", border: "none", borderRadius: "var(--radius)", padding: "7px 0", fontWeight: 700, fontSize: 12, cursor: "pointer" },
  rejectBtn: { flex: 1, background: "transparent", border: "1px solid var(--red)", color: "var(--red)", borderRadius: "var(--radius)", padding: "7px 0", fontWeight: 700, fontSize: 12, cursor: "pointer" },
  error: { background: "rgba(217,105,95,0.12)", border: "1px solid var(--red)", color: "var(--red)", borderRadius: "var(--radius)", padding: "10px 12px", fontSize: 13, marginBottom: 16 },
};
