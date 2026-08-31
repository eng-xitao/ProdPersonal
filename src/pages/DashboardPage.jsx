import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../lib/AuthContext";

export default function DashboardPage() {
  const { company } = useAuth();
  const [stats, setStats] = useState(null);
  const [birthdays, setBirthdays] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!company?.id) return;
    (async () => {
      const [
        { count: totalEmployees },
        { count: openEvaluations },
        { count: pendingPdi },
        { count: upcomingVacations },
        { count: openVacancies },
        { data: lastRun },
        { data: allEmployees },
      ] = await Promise.all([
        supabase.from("employees").select("id", { count: "exact", head: true }).eq("status", "ativo"),
        supabase.from("hr_performance_evaluations").select("id", { count: "exact", head: true }).eq("status", "aberta"),
        supabase.from("hr_pdi").select("id", { count: "exact", head: true }).eq("status", "pendente"),
        supabase.from("hr_vacations").select("id", { count: "exact", head: true }).eq("status", "agendada"),
        supabase.from("hr_vacancies").select("id", { count: "exact", head: true }).eq("status", "aberta"),
        supabase.from("hr_payroll_runs").select("competencia, status").order("competencia", { ascending: false }).limit(1).maybeSingle(),
        supabase.from("employees").select("full_name, birth_date").eq("status", "ativo").not("birth_date", "is", null),
      ]);
      setStats({ totalEmployees, openEvaluations, pendingPdi, upcomingVacations, openVacancies, lastRun });

      const currentMonth = new Date().getMonth();
      const monthBirthdays = (allEmployees ?? [])
        .filter((e) => new Date(e.birth_date + "T00:00:00").getMonth() === currentMonth)
        .sort((a, b) => new Date(a.birth_date).getDate() - new Date(b.birth_date).getDate());
      setBirthdays(monthBirthdays);

      setLoading(false);
    })();
  }, [company?.id]);

  if (loading || !stats) return <p style={styles.dim}>Carregando...</p>;

  const cards = [
    { label: "Colaboradores ativos", value: stats.totalEmployees ?? 0 },
    { label: "Avaliações em aberto", value: stats.openEvaluations ?? 0 },
    { label: "PDIs pendentes", value: stats.pendingPdi ?? 0 },
    { label: "Férias agendadas", value: stats.upcomingVacations ?? 0 },
    { label: "Vagas abertas", value: stats.openVacancies ?? 0 },
  ];

  return (
    <div>
      <header style={{ marginBottom: 20 }}>
        <h1 style={styles.title}>Dashboard</h1>
        <p style={styles.subtitle}>Visão geral da gestão de pessoas.</p>
      </header>

      <div style={styles.grid}>
        {cards.map((c) => (
          <div key={c.label} style={styles.card}>
            <span style={styles.cardValue}>{c.value}</span>
            <span style={styles.cardLabel}>{c.label}</span>
          </div>
        ))}
      </div>

      {stats.lastRun && (
        <p style={{ ...styles.dim, marginTop: 20 }}>
          Última folha de pagamento: {new Date(stats.lastRun.competencia + "T00:00:00").toLocaleDateString("pt-BR", { month: "long", year: "numeric" })} — {stats.lastRun.status === "aberta" ? "aberta" : "fechada"}
        </p>
      )}

      {birthdays.length > 0 && (
        <div style={styles.birthdayBox}>
          <p style={styles.birthdayTitle}>🎂 Aniversariantes do mês</p>
          <ul style={styles.birthdayList}>
            {birthdays.map((b) => (
              <li key={b.full_name} style={styles.birthdayItem}>
                {new Date(b.birth_date + "T00:00:00").getDate().toString().padStart(2, "0")} — {b.full_name}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

const styles = {
  title: { fontFamily: "var(--font-display)", fontSize: 22, margin: 0 },
  subtitle: { color: "var(--text-dim)", fontSize: 13, margin: "6px 0 0" },
  dim: { color: "var(--text-dim)", fontSize: 13 },
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 14, maxWidth: 900 },
  card: { background: "var(--panel)", border: "1px solid var(--line)", borderRadius: "var(--radius)", padding: "18px 16px", display: "flex", flexDirection: "column", gap: 4 },
  cardValue: { fontFamily: "var(--font-display)", fontSize: 28, fontWeight: 800 },
  cardLabel: { fontSize: 12, color: "var(--text-dim)" },
  birthdayBox: { marginTop: 24, background: "var(--panel)", border: "1px solid var(--line)", borderRadius: "var(--radius)", padding: 18, maxWidth: 420 },
  birthdayTitle: { fontFamily: "var(--font-display)", fontSize: 14, fontWeight: 800, margin: "0 0 10px" },
  birthdayList: { listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 6 },
  birthdayItem: { fontSize: 13 },
};
