import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../lib/AuthContext";

const TABS = ["Dados", "Organograma", "Avaliações", "Comportamental", "PDI", "Metas", "Carreira", "Treinamentos", "Remuneração"];

export default function FichaColaboradorPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { company } = useAuth();

  const [employee, setEmployee] = useState(null);
  const [manager, setManager] = useState(null);
  const [reports, setReports] = useState([]);
  const [evaluations, setEvaluations] = useState([]);
  const [behavioral, setBehavioral] = useState(null);
  const [pdi, setPdi] = useState([]);
  const [goals, setGoals] = useState([]);
  const [career, setCareer] = useState([]);
  const [trainings, setTrainings] = useState([]);
  const [compensation, setCompensation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("Dados");

  async function loadAll() {
    setLoading(true);
    setError("");
    try {
      const { data: emp, error: e0 } = await supabase.from("employees").select("*").eq("id", id).single();
      if (e0) throw e0;
      setEmployee(emp);

      const [
        { data: mgr }, { data: reps }, { data: evals }, { data: beh },
        { data: pdiData }, { data: goalsData }, { data: careerData },
        { data: trainData }, { data: comp },
      ] = await Promise.all([
        emp.manager_id ? supabase.from("employees").select("id, full_name, role").eq("id", emp.manager_id).maybeSingle() : Promise.resolve({ data: null }),
        supabase.from("employees").select("id, full_name, role").eq("manager_id", id),
        supabase.from("hr_performance_evaluations").select("id, cycle_name, evaluation_type, status, overall_score, created_at").eq("employee_id", id).order("created_at", { ascending: false }),
        supabase.from("hr_behavioral_assessments").select("*").eq("employee_id", id).order("assessment_date", { ascending: false }).limit(1).maybeSingle(),
        supabase.from("hr_pdi").select("*").eq("employee_id", id).order("created_at", { ascending: false }),
        supabase.from("hr_goals").select("*").eq("employee_id", id).order("created_at", { ascending: false }),
        supabase.from("hr_career_plans").select("*").eq("employee_id", id).order("created_at", { ascending: false }),
        supabase.from("hr_training_participants").select("id, attended, hr_trainings:training_id (title, training_date, status)").eq("employee_id", id),
        supabase.from("hr_employee_compensation").select("*").eq("employee_id", id).order("effective_date", { ascending: false }).limit(1).maybeSingle(),
      ]);

      setManager(mgr ?? null);
      setReports(reps ?? []);
      setEvaluations(evals ?? []);
      setBehavioral(beh ?? null);
      setPdi(pdiData ?? []);
      setGoals(goalsData ?? []);
      setCareer(careerData ?? []);
      setTrainings(trainData ?? []);
      setCompensation(comp ?? null);
    } catch (err) {
      setError("Não foi possível carregar a ficha: " + (err.message ?? "erro desconhecido"));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { if (company?.id && id) loadAll(); }, [company?.id, id]);

  function tempoDesde(dateStr) {
    if (!dateStr) return "—";
    const start = new Date(dateStr);
    const now = new Date();
    let months = (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth());
    let years = Math.floor(months / 12);
    months = months % 12;
    return `${years > 0 ? years + " ano(s), " : ""}${months} mês(es)`;
  }

  function dominantTrait(a) {
    if (!a) return null;
    const values = { Dominância: a.dominance, Influência: a.influence, Estabilidade: a.steadiness, Conformidade: a.compliance };
    return Object.entries(values).sort((x, y) => y[1] - x[1])[0][0];
  }

  if (loading) return <p style={styles.dim}>Carregando...</p>;
  if (error) return <div style={styles.error}>{error}</div>;
  if (!employee) return <p style={styles.dim}>Colaborador não encontrado.</p>;

  return (
    <div>
      <button style={styles.backBtn} onClick={() => navigate("/colaboradores")} type="button">← Voltar</button>

      <header style={styles.header}>
        <h1 style={styles.title}>{employee.full_name}</h1>
        <p style={styles.subtitle}>{employee.role ?? "—"} · Admitido há {tempoDesde(employee.hire_date)}</p>
      </header>

      <div style={styles.badgeRow}>
        <div style={styles.badge}>
          <span style={styles.badgeLabel}>PERFIL COMPORTAMENTAL</span>
          <span style={styles.badgeValue}>{dominantTrait(behavioral) ?? "Sem avaliação"}</span>
        </div>
        <div style={styles.badge}>
          <span style={styles.badgeLabel}>ÚLTIMA AVALIAÇÃO</span>
          <span style={styles.badgeValue}>{evaluations[0]?.overall_score != null ? Number(evaluations[0].overall_score).toFixed(1) : "Sem avaliação"}</span>
        </div>
        <div style={styles.badge}>
          <span style={styles.badgeLabel}>PDI EM ABERTO</span>
          <span style={styles.badgeValue}>{pdi.filter((p) => p.status !== "concluido").length}</span>
        </div>
        <div style={styles.badge}>
          <span style={styles.badgeLabel}>METAS ATIVAS</span>
          <span style={styles.badgeValue}>{goals.filter((g) => g.status === "em_andamento").length}</span>
        </div>
      </div>

      <div style={styles.tabBar}>
        {TABS.map((t) => (
          <button key={t} style={{ ...styles.tabBtn, ...(activeTab === t ? styles.tabBtnActive : {}) }} onClick={() => setActiveTab(t)} type="button">
            {t}
          </button>
        ))}
      </div>

      <div style={styles.tabContent}>
        {activeTab === "Dados" && (
          <div style={styles.grid2}>
            <Field label="Nome completo" value={employee.full_name} />
            <Field label="Cargo" value={employee.role} />
            <Field label="CPF" value={employee.cpf} />
            <Field label="RG" value={employee.rg} />
            <Field label="Data de nascimento" value={employee.birth_date} />
            <Field label="E-mail" value={employee.email} />
            <Field label="Telefone" value={employee.phone} />
            <Field label="Endereço" value={employee.address} />
            <Field label="Tipo de contrato" value={employee.contract_type} />
            <Field label="Data de admissão" value={employee.hire_date} />
            <Field label="Status" value={employee.status} />
          </div>
        )}

        {activeTab === "Organograma" && (
          <div>
            <p style={styles.sectionLabel}>Gestor direto</p>
            <p style={styles.dim}>{manager ? `${manager.full_name} — ${manager.role ?? ""}` : "Sem gestor definido."}</p>
            <p style={{ ...styles.sectionLabel, marginTop: 20 }}>Reporta pra {employee.full_name} ({reports.length})</p>
            {reports.length === 0 ? <p style={styles.dim}>Ninguém reporta diretamente.</p> : (
              <ul style={styles.list}>{reports.map((r) => <li key={r.id} style={styles.listItem}>{r.full_name} — {r.role ?? ""}</li>)}</ul>
            )}
          </div>
        )}

        {activeTab === "Avaliações" && (
          evaluations.length === 0 ? <p style={styles.dim}>Nenhuma avaliação ainda.</p> : (
            <ul style={styles.list}>
              {evaluations.map((e) => (
                <li key={e.id} style={styles.listItem}>{e.cycle_name} — {e.evaluation_type} — {e.status === "concluida" ? `Nota ${Number(e.overall_score ?? 0).toFixed(1)}` : "Em aberto"}</li>
              ))}
            </ul>
          )
        )}

        {activeTab === "Comportamental" && (
          !behavioral ? <p style={styles.dim}>Nenhuma avaliação comportamental ainda.</p> : (
            <div style={styles.grid2}>
              <Field label="Dominância" value={behavioral.dominance} />
              <Field label="Influência" value={behavioral.influence} />
              <Field label="Estabilidade" value={behavioral.steadiness} />
              <Field label="Conformidade" value={behavioral.compliance} />
            </div>
          )
        )}

        {activeTab === "PDI" && (
          pdi.length === 0 ? <p style={styles.dim}>Nenhum PDI ainda.</p> : (
            <ul style={styles.list}>{pdi.map((x) => <li key={x.id} style={styles.listItem}>{x.action_description} — {x.status}</li>)}</ul>
          )
        )}

        {activeTab === "Metas" && (
          goals.length === 0 ? <p style={styles.dim}>Nenhuma meta ainda.</p> : (
            <ul style={styles.list}>{goals.map((g) => <li key={g.id} style={styles.listItem}>{g.description} — {g.current_value ?? 0}/{g.target_value ?? "—"} — {g.status}</li>)}</ul>
          )
        )}

        {activeTab === "Carreira" && (
          career.length === 0 ? <p style={styles.dim}>Nenhum plano de carreira ainda.</p> : (
            <ul style={styles.list}>{career.map((c) => <li key={c.id} style={styles.listItem}>{c.current_role_title ?? "—"} → {c.target_role_title ?? "—"}</li>)}</ul>
          )
        )}

        {activeTab === "Treinamentos" && (
          trainings.length === 0 ? <p style={styles.dim}>Nenhum treinamento ainda.</p> : (
            <ul style={styles.list}>{trainings.map((t) => <li key={t.id} style={styles.listItem}>{t.hr_trainings?.title} — {t.attended ? "Presente" : "Ausente"}</li>)}</ul>
          )
        )}

        {activeTab === "Remuneração" && (
          !compensation ? <p style={styles.dim}>Nenhuma remuneração cadastrada ainda.</p> : (
            <div style={styles.grid2}>
              <Field label="Salário base" value={`R$ ${Number(compensation.base_salary).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`} />
              <Field label="Dependentes" value={compensation.dependents_count} />
              <Field label="Vigente desde" value={compensation.effective_date} />
            </div>
          )
        )}
      </div>
    </div>
  );
}

function Field({ label, value }) {
  return (
    <div style={styles.field}>
      <span style={styles.fieldLabel}>{label}</span>
      <span style={styles.fieldValue}>{value || "—"}</span>
    </div>
  );
}

const styles = {
  backBtn: { background: "transparent", border: "none", color: "var(--text-dim)", fontSize: 13, cursor: "pointer", marginBottom: 12, padding: 0 },
  header: { marginBottom: 16 },
  title: { fontFamily: "var(--font-display)", fontSize: 24, margin: 0 },
  subtitle: { color: "var(--text-dim)", fontSize: 13, margin: "6px 0 0" },
  dim: { color: "var(--text-dim)", fontSize: 13 },
  badgeRow: { display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap" },
  badge: { background: "var(--panel)", border: "1px solid var(--line)", borderRadius: "var(--radius)", padding: "12px 16px", minWidth: 160, flex: 1 },
  badgeLabel: { display: "block", fontSize: 10, fontWeight: 700, color: "var(--text-dim)", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 4 },
  badgeValue: { display: "block", fontFamily: "var(--font-display)", fontSize: 18, fontWeight: 800 },
  tabBar: { display: "flex", gap: 4, borderBottom: "1px solid var(--line)", marginBottom: 20, flexWrap: "wrap" },
  tabBtn: { background: "transparent", border: "none", borderBottom: "2px solid transparent", padding: "8px 12px", fontSize: 12.5, fontWeight: 600, color: "var(--text-dim)", cursor: "pointer" },
  tabBtnActive: { color: "var(--amber)", borderBottom: "2px solid var(--amber)" },
  tabContent: { maxWidth: 780 },
  grid2: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 },
  field: { display: "flex", flexDirection: "column", gap: 2 },
  fieldLabel: { fontSize: 11, fontWeight: 700, color: "var(--text-dim)", textTransform: "uppercase", letterSpacing: "0.03em" },
  fieldValue: { fontSize: 14 },
  sectionLabel: { fontSize: 12, fontWeight: 700, color: "var(--text-dim)", textTransform: "uppercase", letterSpacing: "0.03em", margin: "0 0 8px" },
  list: { listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 8 },
  listItem: { background: "var(--panel)", border: "1px solid var(--line)", borderRadius: "var(--radius)", padding: "10px 14px", fontSize: 13 },
  error: { background: "rgba(217,105,95,0.12)", border: "1px solid var(--red)", color: "var(--red)", borderRadius: "var(--radius)", padding: "10px 12px", fontSize: 13 },
};
