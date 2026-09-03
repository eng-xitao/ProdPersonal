import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../lib/AuthContext";

export default function DescricaoCargosPage() {
  const { company } = useAuth();
  const navigate = useNavigate();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [deptFilter, setDeptFilter] = useState("todos");
  const [creating, setCreating] = useState(false);

  async function loadAll() {
    setLoading(true);
    setError("");
    try {
      const { data, error: e } = await supabase
        .from("hr_job_descriptions")
        .select("id, title, department, cbo_code, hr_job_activities(count), hr_job_risks(count)")
        .order("department", { ascending: true, nullsFirst: false })
        .order("title");
      if (e) throw e;
      setJobs(data ?? []);
    } catch (err) {
      setError("Não foi possível carregar: " + (err.message ?? "erro desconhecido"));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { if (company?.id) loadAll(); }, [company?.id]);

  async function createJob() {
    setCreating(true);
    const { data, error: insertError } = await supabase.from("hr_job_descriptions").insert({ company_id: company.id, title: "Novo cargo" }).select("id").single();
    setCreating(false);
    if (insertError) { setError(insertError.message); return; }
    navigate(`/descricao-cargos/${data.id}`);
  }

  const departments = useMemo(() => [...new Set(jobs.map((j) => j.department).filter(Boolean))].sort(), [jobs]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return jobs.filter((j) => {
      const matchesSearch = !q || `${j.title} ${j.department ?? ""} ${j.cbo_code ?? ""}`.toLowerCase().includes(q);
      const matchesDept = deptFilter === "todos" || j.department === deptFilter;
      return matchesSearch && matchesDept;
    });
  }, [jobs, search, deptFilter]);

  const grouped = useMemo(() => {
    const map = {};
    filtered.forEach((j) => {
      const key = j.department || "Sem departamento";
      (map[key] ??= []).push(j);
    });
    return Object.entries(map).sort(([a], [b]) => a.localeCompare(b));
  }, [filtered]);

  return (
    <div>
      <header style={styles.header}>
        <div>
          <h1 style={styles.title}>Descrição de Cargos</h1>
          <p style={styles.subtitle}>Modelo completo com riscos ocupacionais (NR-1) e EPIs (NR-6) — usado em recrutamento, avaliação e conformidade.</p>
        </div>
        <button style={styles.newBtn} onClick={createJob} disabled={creating} type="button">{creating ? "Criando..." : "+ Novo cargo"}</button>
      </header>

      {error && <div style={styles.error}>{error}</div>}

      <div style={styles.toolbar}>
        <input style={styles.search} placeholder="Buscar por cargo, departamento ou CBO..." value={search} onChange={(e) => setSearch(e.target.value)} />
        {departments.length > 1 && (
          <select style={styles.select} value={deptFilter} onChange={(e) => setDeptFilter(e.target.value)}>
            <option value="todos">Todos os departamentos ({jobs.length})</option>
            {departments.map((d) => <option key={d} value={d}>{d} ({jobs.filter((j) => j.department === d).length})</option>)}
          </select>
        )}
      </div>

      {loading ? (
        <p style={styles.dim}>Carregando...</p>
      ) : jobs.length === 0 ? (
        <p style={styles.dim}>Nenhum cargo descrito ainda. Clique em "+ Novo cargo" pra começar.</p>
      ) : filtered.length === 0 ? (
        <p style={styles.dim}>Nenhum cargo encontrado com esse filtro.</p>
      ) : (
        <div style={styles.groups}>
          {grouped.map(([dept, items]) => (
            <div key={dept}>
              <p style={styles.deptLabel}>{dept} <span style={styles.deptCount}>({items.length})</span></p>
              <div style={styles.list}>
                {items.map((j) => (
                  <Link key={j.id} to={`/descricao-cargos/${j.id}`} style={styles.row}>
                    <div>
                      <strong>{j.title}</strong>
                      {j.cbo_code && <span style={styles.dim}> · CBO {j.cbo_code}</span>}
                    </div>
                    <div style={styles.rowBadges}>
                      {j.hr_job_activities?.[0]?.count > 0 && <span style={styles.badge}>{j.hr_job_activities[0].count} atividade(s)</span>}
                      {j.hr_job_risks?.[0]?.count > 0 && <span style={{ ...styles.badge, ...styles.badgeRisk }}>{j.hr_job_risks[0].count} risco(s)</span>}
                      <span style={styles.arrow}>→</span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const styles = {
  header: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, marginBottom: 20, flexWrap: "wrap" },
  title: { fontFamily: "var(--font-display)", fontSize: 22, margin: 0 },
  subtitle: { color: "var(--text-dim)", fontSize: 13, margin: "6px 0 0", maxWidth: 520 },
  dim: { color: "var(--text-dim)", fontSize: 12.5 },
  newBtn: { background: "var(--amber)", color: "#FFFFFF", border: "none", borderRadius: "var(--radius)", padding: "9px 18px", fontWeight: 700, fontSize: 13, cursor: "pointer", whiteSpace: "nowrap" },
  toolbar: { display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap" },
  search: { flex: 1, minWidth: 220, background: "var(--panel)", border: "1px solid var(--line)", borderRadius: "var(--radius)", padding: "10px 12px", color: "var(--text)", fontSize: 13 },
  select: { background: "var(--panel)", border: "1px solid var(--line)", borderRadius: "var(--radius)", padding: "10px 12px", color: "var(--text)", fontSize: 13, minWidth: 200 },
  groups: { display: "flex", flexDirection: "column", gap: 20, maxWidth: 760 },
  deptLabel: { fontSize: 11.5, fontWeight: 800, color: "var(--text-dim)", textTransform: "uppercase", letterSpacing: "0.04em", margin: "0 0 8px" },
  deptCount: { fontWeight: 400 },
  list: { display: "flex", flexDirection: "column", gap: 6 },
  row: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, background: "var(--panel)", border: "1px solid var(--line)", borderRadius: "var(--radius)", padding: "12px 16px", textDecoration: "none", color: "var(--text)", flexWrap: "wrap" },
  rowBadges: { display: "flex", alignItems: "center", gap: 8 },
  badge: { fontSize: 10.5, fontWeight: 700, background: "var(--panel-2)", color: "var(--text-dim)", borderRadius: 999, padding: "3px 9px" },
  badgeRisk: { color: "var(--red)" },
  arrow: { color: "var(--text-dim)" },
  error: { background: "rgba(217,105,95,0.12)", border: "1px solid var(--red)", color: "var(--red)", borderRadius: "var(--radius)", padding: "10px 12px", fontSize: 13, marginBottom: 16, maxWidth: 760 },
};
