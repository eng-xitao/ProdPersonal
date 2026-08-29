import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../lib/AuthContext";
import { calcularINSS, calcularIRRF, calcularFGTS } from "../lib/calculosCLT";
import { openPrintWindow, brandHeader, currency, formatDate } from "../lib/printDocument";

export default function FolhaPagamentoPage() {
  const { company } = useAuth();
  const [runs, setRuns] = useState([]);
  const [selectedRun, setSelectedRun] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [generating, setGenerating] = useState(false);

  const [competencia, setCompetencia] = useState("");

  async function loadRuns() {
    setLoading(true);
    setError("");
    try {
      const { data, error: e } = await supabase.from("hr_payroll_runs").select("id, competencia, status").order("competencia", { ascending: false });
      if (e) throw e;
      setRuns(data ?? []);
    } catch (err) {
      setError("Não foi possível carregar: " + (err.message ?? "erro desconhecido"));
    } finally {
      setLoading(false);
    }
  }

  async function loadItems(runId) {
    const { data } = await supabase
      .from("hr_payroll_items")
      .select("id, base_salary, overtime_value, other_earnings, gross_pay, inss_value, irrf_value, other_deductions, net_pay, fgts_value, employees:employee_id (full_name)")
      .eq("payroll_run_id", runId)
      .order("employees(full_name)");
    setItems(data ?? []);
  }

  useEffect(() => { if (company?.id) loadRuns(); }, [company?.id]);
  useEffect(() => { if (selectedRun) loadItems(selectedRun.id); }, [selectedRun]);

  async function createAndGenerate(e) {
    e.preventDefault();
    setError("");
    if (!competencia) { setError("Escolha o mês da competência."); return; }
    setGenerating(true);

    try {
      const competenciaDate = `${competencia}-01`;
      const { data: run, error: runError } = await supabase.from("hr_payroll_runs").insert({ company_id: company.id, competencia: competenciaDate }).select("id").single();
      if (runError) throw runError;

      const [{ data: compensations }, { data: inssBrackets }, { data: irrfBrackets }] = await Promise.all([
        supabase.from("hr_employee_compensation").select("employee_id, base_salary, dependents_count").order("effective_date", { ascending: false }),
        supabase.from("hr_inss_brackets").select("*"),
        supabase.from("hr_irrf_brackets").select("*"),
      ]);

      const latestByEmployee = {};
      (compensations ?? []).forEach((c) => { if (!latestByEmployee[c.employee_id]) latestByEmployee[c.employee_id] = c; });

      const payrollItems = Object.values(latestByEmployee).map((c) => {
        const inss = calcularINSS(Number(c.base_salary), inssBrackets ?? []);
        const baseIrrf = Number(c.base_salary) - inss;
        const irrf = calcularIRRF(baseIrrf, c.dependents_count ?? 0, irrfBrackets ?? []);
        const fgts = calcularFGTS(Number(c.base_salary));
        const grossPay = Number(c.base_salary);
        const netPay = grossPay - inss - irrf;

        return {
          company_id: company.id, payroll_run_id: run.id, employee_id: c.employee_id,
          base_salary: c.base_salary, gross_pay: grossPay,
          inss_value: inss, irrf_value: irrf, fgts_value: fgts, net_pay: netPay,
        };
      });

      if (payrollItems.length === 0) {
        setError("Nenhum colaborador com remuneração cadastrada ainda — cadastre em Remuneração primeiro.");
        await supabase.from("hr_payroll_runs").delete().eq("id", run.id);
        setGenerating(false);
        return;
      }

      const { error: itemsError } = await supabase.from("hr_payroll_items").insert(payrollItems);
      if (itemsError) throw itemsError;

      setCompetencia("");
      await loadRuns();
      setSelectedRun(run);
    } catch (err) {
      setError("Erro ao gerar a folha: " + (err.message ?? "erro desconhecido"));
    } finally {
      setGenerating(false);
    }
  }

  async function closeRun(runId) {
    await supabase.from("hr_payroll_runs").update({ status: "fechada", closed_at: new Date().toISOString() }).eq("id", runId);
    await loadRuns();
  }

  function printHolerite(item) {
    const html = `
      ${brandHeader(company, "Holerite / Contracheque", [
        ["Colaborador", item.employees?.full_name ?? ""],
        ["Competência", selectedRun ? formatDate(selectedRun.competencia) : ""],
      ])}
      <table style="width:100%; border-collapse: collapse; margin-top: 20px;">
        <thead><tr style="border-bottom: 2px solid #000;"><th style="text-align:left; padding: 8px 0;">Descrição</th><th style="text-align:right;">Proventos</th><th style="text-align:right;">Descontos</th></tr></thead>
        <tbody>
          <tr><td style="padding:6px 0;">Salário base</td><td style="text-align:right;">${currency(item.base_salary)}</td><td></td></tr>
          ${item.overtime_value > 0 ? `<tr><td>Horas extras</td><td style="text-align:right;">${currency(item.overtime_value)}</td><td></td></tr>` : ""}
          ${item.other_earnings > 0 ? `<tr><td>Outros proventos</td><td style="text-align:right;">${currency(item.other_earnings)}</td><td></td></tr>` : ""}
          <tr><td style="padding:6px 0;">INSS</td><td></td><td style="text-align:right;">${currency(item.inss_value)}</td></tr>
          <tr><td style="padding:6px 0;">IRRF</td><td></td><td style="text-align:right;">${currency(item.irrf_value)}</td></tr>
          ${item.other_deductions > 0 ? `<tr><td>Outros descontos</td><td></td><td style="text-align:right;">${currency(item.other_deductions)}</td></tr>` : ""}
        </tbody>
      </table>
      <table style="width:100%; margin-top: 20px; border-top: 2px solid #000; padding-top: 10px;">
        <tr><td><strong>Salário líquido</strong></td><td style="text-align:right;"><strong>${currency(item.net_pay)}</strong></td></tr>
        <tr><td style="color:#666; font-size:11px;">FGTS do mês (depositado, informativo)</td><td style="text-align:right; color:#666; font-size:11px;">${currency(item.fgts_value)}</td></tr>
      </table>
    `;
    openPrintWindow(`Holerite - ${item.employees?.full_name}`, html);
  }

  return (
    <div>
      <header style={{ marginBottom: 20 }}>
        <h1 style={styles.title}>Folha de Pagamento</h1>
        <p style={styles.subtitle}>Gera automaticamente com INSS, IRRF e FGTS calculados pelas tabelas configuradas.</p>
      </header>

      {error && <div style={styles.error}>{error}</div>}

      <form onSubmit={createAndGenerate} style={styles.form}>
        <p style={styles.formTitle}>Nova folha</p>
        <div style={styles.row}>
          <input style={styles.input} type="month" value={competencia} onChange={(e) => setCompetencia(e.target.value)} required />
          <button style={styles.saveBtn} type="submit" disabled={generating}>{generating ? "Gerando..." : "Gerar folha do mês"}</button>
        </div>
      </form>

      {loading ? (
        <p style={styles.dim}>Carregando...</p>
      ) : (
        <select style={{ ...styles.input, maxWidth: 320, marginBottom: 20 }} value={selectedRun?.id ?? ""} onChange={(e) => setSelectedRun(runs.find((r) => r.id === e.target.value))}>
          <option value="">Selecione uma competência...</option>
          {runs.map((r) => <option key={r.id} value={r.id}>{formatDate(r.competencia)} — {r.status === "aberta" ? "Aberta" : "Fechada"}</option>)}
        </select>
      )}

      {selectedRun && (
        <>
          {selectedRun.status === "aberta" && (
            <button style={styles.closeBtn} onClick={() => closeRun(selectedRun.id)} type="button">Fechar folha</button>
          )}
          <div style={styles.tableWrap}>
            <table style={styles.table}>
              <thead><tr><th style={styles.th}>Colaborador</th><th style={styles.th}>Bruto</th><th style={styles.th}>INSS</th><th style={styles.th}>IRRF</th><th style={styles.th}>Líquido</th><th style={styles.th}></th></tr></thead>
              <tbody>
                {items.map((it) => (
                  <tr key={it.id}>
                    <td style={styles.td}>{it.employees?.full_name}</td>
                    <td style={styles.td}>{currency(it.gross_pay)}</td>
                    <td style={styles.td}>{currency(it.inss_value)}</td>
                    <td style={styles.td}>{currency(it.irrf_value)}</td>
                    <td style={styles.td}><strong>{currency(it.net_pay)}</strong></td>
                    <td style={{ ...styles.td, textAlign: "right" }}>
                      <button style={styles.printBtn} onClick={() => printHolerite(it)} type="button">🖨 Holerite</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

const styles = {
  title: { fontFamily: "var(--font-display)", fontSize: 22, margin: 0 },
  subtitle: { color: "var(--text-dim)", fontSize: 13, margin: "6px 0 0" },
  dim: { color: "var(--text-dim)", fontSize: 13 },
  form: { background: "var(--panel)", border: "1px solid var(--line)", borderRadius: "var(--radius)", padding: 18, marginBottom: 20, maxWidth: 680 },
  formTitle: { fontSize: 13, fontWeight: 700, color: "var(--text-dim)", textTransform: "uppercase", letterSpacing: "0.04em", margin: "0 0 12px" },
  row: { display: "flex", gap: 10 },
  input: { flex: 1, background: "var(--panel-2)", border: "1px solid var(--line)", borderRadius: "var(--radius)", padding: "9px 10px", color: "var(--text)", fontSize: 13 },
  saveBtn: { background: "var(--amber)", color: "#FFFFFF", border: "none", borderRadius: "var(--radius)", padding: "9px 18px", fontWeight: 700, fontSize: 13, cursor: "pointer", whiteSpace: "nowrap" },
  closeBtn: { background: "var(--red)", color: "#FFFFFF", border: "none", borderRadius: "var(--radius)", padding: "8px 16px", fontWeight: 700, fontSize: 12.5, cursor: "pointer", marginBottom: 14 },
  tableWrap: { border: "1px solid var(--line)", borderRadius: "var(--radius)", overflow: "hidden", overflowX: "auto" },
  table: { width: "100%", borderCollapse: "collapse" },
  th: { textAlign: "left", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.04em", color: "var(--text-dim)", padding: "10px 14px", background: "var(--panel)", borderBottom: "1px solid var(--line)" },
  td: { padding: "10px 14px", fontSize: 13.5, background: "var(--panel)", borderBottom: "1px solid var(--line)" },
  printBtn: { background: "var(--panel-2)", border: "1px solid var(--line)", color: "var(--text)", borderRadius: "var(--radius)", padding: "5px 10px", fontSize: 11.5, cursor: "pointer" },
  error: { background: "rgba(217,105,95,0.12)", border: "1px solid var(--red)", color: "var(--red)", borderRadius: "var(--radius)", padding: "10px 12px", fontSize: 13, marginBottom: 16, maxWidth: 680 },
};
