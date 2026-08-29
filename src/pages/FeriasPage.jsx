import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../lib/AuthContext";
import { calcularFerias } from "../lib/calculosCLT";
import { openPrintWindow, brandHeader, currency, formatDate } from "../lib/printDocument";

const STATUS_LABEL = { agendada: "Agendada", em_gozo: "Em gozo", concluida: "Concluída" };
const STATUS_COLOR = { agendada: "var(--amber)", em_gozo: "#2563EB", concluida: "var(--green)" };

export default function FeriasPage() {
  const { company } = useAuth();
  const [employees, setEmployees] = useState([]);
  const [vacations, setVacations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [employeeId, setEmployeeId] = useState("");
  const [periodStart, setPeriodStart] = useState("");
  const [daysTaken, setDaysTaken] = useState(30);
  const [daysSold, setDaysSold] = useState(0);
  const [saving, setSaving] = useState(false);

  async function loadAll() {
    setLoading(true);
    setError("");
    try {
      const [{ data: emp, error: e1 }, { data: vac, error: e2 }] = await Promise.all([
        supabase.from("employees").select("id, full_name").eq("status", "ativo").order("full_name"),
        supabase.from("hr_vacations").select("id, period_start, period_end, days_taken, days_sold, vacation_pay, constitutional_bonus, status, employees:employee_id (full_name)").order("period_start", { ascending: false }).limit(50),
      ]);
      const firstError = e1 || e2;
      if (firstError) throw firstError;
      setEmployees(emp ?? []);
      setVacations(vac ?? []);
    } catch (err) {
      setError("Não foi possível carregar: " + (err.message ?? "erro desconhecido"));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { if (company?.id) loadAll(); }, [company?.id]);

  async function createVacation(e) {
    e.preventDefault();
    setError("");
    if (!employeeId || !periodStart) { setError("Escolha o colaborador e a data de início."); return; }
    setSaving(true);

    const { data: comp } = await supabase.from("hr_employee_compensation").select("base_salary").eq("employee_id", employeeId).order("effective_date", { ascending: false }).limit(1).maybeSingle();
    const salario = Number(comp?.base_salary ?? 0);
    const calc = calcularFerias(salario, Number(daysTaken), Number(daysSold));

    const start = new Date(periodStart);
    const end = new Date(start);
    end.setDate(end.getDate() + Number(daysTaken) - 1);

    const { error: insertError } = await supabase.from("hr_vacations").insert({
      company_id: company.id, employee_id: employeeId,
      period_start: periodStart, period_end: end.toISOString().slice(0, 10),
      acquisition_start: periodStart, acquisition_end: periodStart,
      days_taken: Number(daysTaken), days_sold: Number(daysSold),
      vacation_pay: calc.valorFerias + calc.valorAbonoPecuniario,
      constitutional_bonus: calc.tercoConstitucional,
    });

    if (insertError) { setError(insertError.message); setSaving(false); return; }
    setEmployeeId(""); setPeriodStart(""); setDaysTaken(30); setDaysSold(0);
    setSaving(false);
    await loadAll();
  }

  async function updateStatus(id, status) {
    await supabase.from("hr_vacations").update({ status }).eq("id", id);
    await loadAll();
  }

  function printReceipt(v) {
    const total = Number(v.vacation_pay) + Number(v.constitutional_bonus);
    const html = `
      ${brandHeader(company, "Recibo de Férias", [
        ["Colaborador", v.employees?.full_name ?? ""],
        ["Período", `${formatDate(v.period_start)} a ${formatDate(v.period_end)}`],
        ["Dias de gozo", v.days_taken],
      ])}
      <table style="width:100%; border-collapse: collapse; margin-top: 20px;">
        <tr><td style="padding:6px 0;">Valor das férias</td><td style="text-align:right;">${currency(v.vacation_pay)}</td></tr>
        <tr><td style="padding:6px 0;">1/3 constitucional</td><td style="text-align:right;">${currency(v.constitutional_bonus)}</td></tr>
        <tr style="border-top: 2px solid #000;"><td style="padding-top:10px;"><strong>Total</strong></td><td style="text-align:right; padding-top:10px;"><strong>${currency(total)}</strong></td></tr>
      </table>
      <div style="margin-top: 60px; border-top: 1px solid #000; width: 300px; padding-top: 6px; font-size: 12px;">Assinatura do colaborador</div>
    `;
    openPrintWindow(`Recibo de Férias - ${v.employees?.full_name}`, html);
  }

  return (
    <div>
      <header style={{ marginBottom: 20 }}>
        <h1 style={styles.title}>Controle de Férias</h1>
        <p style={styles.subtitle}>Agende, calcule automaticamente (salário + 1/3) e imprima o recibo.</p>
      </header>

      {error && <div style={styles.error}>{error}</div>}

      <form onSubmit={createVacation} style={styles.form}>
        <p style={styles.formTitle}>Agendar férias</p>
        <div style={styles.row}>
          <select style={styles.input} value={employeeId} onChange={(e) => setEmployeeId(e.target.value)} required>
            <option value="">Colaborador...</option>
            {employees.map((e) => <option key={e.id} value={e.id}>{e.full_name}</option>)}
          </select>
          <input style={styles.input} type="date" value={periodStart} onChange={(e) => setPeriodStart(e.target.value)} required />
        </div>
        <div style={styles.row}>
          <input style={styles.input} type="number" placeholder="Dias de gozo" value={daysTaken} onChange={(e) => setDaysTaken(e.target.value)} max={30} />
          <input style={styles.input} type="number" placeholder="Dias vendidos (abono)" value={daysSold} onChange={(e) => setDaysSold(e.target.value)} max={10} />
        </div>
        <button style={styles.saveBtn} type="submit" disabled={saving}>{saving ? "Calculando..." : "Agendar e calcular"}</button>
      </form>

      {loading ? (
        <p style={styles.dim}>Carregando...</p>
      ) : vacations.length === 0 ? (
        <p style={styles.dim}>Nenhuma férias agendada ainda.</p>
      ) : (
        <div style={styles.list}>
          {vacations.map((v) => (
            <div key={v.id} style={styles.card}>
              <div style={styles.cardHeader}>
                <div>
                  <strong>{v.employees?.full_name}</strong>
                  <span style={styles.dim}> · {formatDate(v.period_start)} a {formatDate(v.period_end)}</span>
                </div>
                <select style={{ ...styles.statusSelect, color: STATUS_COLOR[v.status] }} value={v.status} onChange={(e) => updateStatus(v.id, e.target.value)}>
                  {Object.entries(STATUS_LABEL).map(([val, l]) => <option key={val} value={val}>{l}</option>)}
                </select>
              </div>
              <p style={styles.dim}>Total: {currency(Number(v.vacation_pay) + Number(v.constitutional_bonus))}</p>
              <button style={styles.printBtn} onClick={() => printReceipt(v)} type="button">🖨 Recibo</button>
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
  printBtn: { marginTop: 6, background: "var(--panel-2)", border: "1px solid var(--line)", color: "var(--text)", borderRadius: "var(--radius)", padding: "6px 12px", fontSize: 12, cursor: "pointer" },
  error: { background: "rgba(217,105,95,0.12)", border: "1px solid var(--red)", color: "var(--red)", borderRadius: "var(--radius)", padding: "10px 12px", fontSize: 13, marginBottom: 16, maxWidth: 680 },
};
