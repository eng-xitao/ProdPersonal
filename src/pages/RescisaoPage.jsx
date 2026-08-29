import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../lib/AuthContext";
import { calcularRescisao, calcularFGTS } from "../lib/calculosCLT";
import { openPrintWindow, brandHeader, currency, formatDate } from "../lib/printDocument";

const TYPE_LABEL = {
  sem_justa_causa: "Dispensa sem justa causa",
  com_justa_causa: "Dispensa com justa causa",
  pedido_demissao: "Pedido de demissão",
  acordo: "Acordo (distrato mútuo)",
  fim_contrato: "Fim de contrato determinado",
};

export default function RescisaoPage() {
  const { company } = useAuth();
  const [employees, setEmployees] = useState([]);
  const [terminations, setTerminations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [employeeId, setEmployeeId] = useState("");
  const [terminationType, setTerminationType] = useState("sem_justa_causa");
  const [terminationDate, setTerminationDate] = useState("");
  const [noticeWorked, setNoticeWorked] = useState(false);
  const [saving, setSaving] = useState(false);
  const [preview, setPreview] = useState(null);

  async function loadAll() {
    setLoading(true);
    setError("");
    try {
      const [{ data: emp, error: e1 }, { data: term, error: e2 }] = await Promise.all([
        supabase.from("employees").select("id, full_name, hire_date").eq("status", "ativo").order("full_name"),
        supabase.from("hr_terminations").select("id, termination_type, termination_date, total_verbas, status, employees:employee_id (full_name)").order("created_at", { ascending: false }).limit(50),
      ]);
      const firstError = e1 || e2;
      if (firstError) throw firstError;
      setEmployees(emp ?? []);
      setTerminations(term ?? []);
    } catch (err) {
      setError("Não foi possível carregar: " + (err.message ?? "erro desconhecido"));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { if (company?.id) loadAll(); }, [company?.id]);

  async function handlePreview() {
    setError("");
    if (!employeeId || !terminationDate) { setError("Escolha o colaborador e a data de desligamento."); return; }

    const employee = employees.find((e) => e.id === employeeId);
    const { data: comp } = await supabase.from("hr_employee_compensation").select("base_salary").eq("employee_id", employeeId).order("effective_date", { ascending: false }).limit(1).maybeSingle();
    const salario = Number(comp?.base_salary ?? 0);
    const saldoFgts = calcularFGTS(salario) * 12; // estimativa simplificada — idealmente viria do extrato real do FGTS

    const calc = calcularRescisao({
      tipo: terminationType, salario,
      dataAdmissao: employee.hire_date, dataDesligamento: terminationDate,
      avisoTrabalhado: noticeWorked, saldoFgts,
    });

    setPreview({ ...calc, salario, employeeName: employee.full_name });
  }

  async function saveTermination() {
    if (!preview) return;
    setSaving(true);
    setError("");

    const employee = employees.find((e) => e.id === employeeId);
    const { error: insertError } = await supabase.from("hr_terminations").insert({
      company_id: company.id, employee_id: employeeId, termination_type: terminationType,
      termination_date: terminationDate, admission_date: employee.hire_date, last_salary: preview.salario,
      notice_worked: noticeWorked, saldo_salario: preview.saldoSalario, aviso_previo: preview.avisoPrevio,
      ferias_vencidas: preview.feriasVencidas, ferias_proporcionais: preview.feriasProporcionais,
      decimo_terceiro_proporcional: preview.decimoTerceiroProporcional, multa_fgts: preview.multaFgts,
      total_verbas: preview.total,
    });

    if (insertError) { setError(insertError.message); setSaving(false); return; }
    setEmployeeId(""); setTerminationDate(""); setNoticeWorked(false); setPreview(null);
    setSaving(false);
    await loadAll();
  }

  function printTerm(t) {
    const html = `
      ${brandHeader(company, "Termo de Rescisão do Contrato de Trabalho", [
        ["Colaborador", t.employees?.full_name ?? ""],
        ["Tipo", TYPE_LABEL[t.termination_type]],
        ["Data de desligamento", formatDate(t.termination_date)],
      ])}
      <table style="width:100%; border-collapse: collapse; margin-top: 20px;">
        <tr><td style="padding:6px 0;">Saldo de salário</td><td style="text-align:right;">${currency(t.saldo_salario)}</td></tr>
        <tr><td style="padding:6px 0;">Aviso prévio indenizado</td><td style="text-align:right;">${currency(t.aviso_previo)}</td></tr>
        <tr><td style="padding:6px 0;">Férias vencidas</td><td style="text-align:right;">${currency(t.ferias_vencidas)}</td></tr>
        <tr><td style="padding:6px 0;">Férias proporcionais + 1/3</td><td style="text-align:right;">${currency(t.ferias_proporcionais)}</td></tr>
        <tr><td style="padding:6px 0;">13º proporcional</td><td style="text-align:right;">${currency(t.decimo_terceiro_proporcional)}</td></tr>
        <tr><td style="padding:6px 0;">Multa FGTS</td><td style="text-align:right;">${currency(t.multa_fgts)}</td></tr>
        <tr style="border-top: 2px solid #000;"><td style="padding-top:10px;"><strong>Total</strong></td><td style="text-align:right; padding-top:10px;"><strong>${currency(t.total_verbas)}</strong></td></tr>
      </table>
      <p style="margin-top:20px; font-size:11px; color:#666;">Documento gerado pelo sistema — recomenda-se conferência com contador/departamento pessoal antes do pagamento.</p>
      <div style="margin-top: 60px; border-top: 1px solid #000; width: 300px; padding-top: 6px; font-size: 12px;">Assinatura do colaborador</div>
    `;
    openPrintWindow(`Rescisão - ${t.employees?.full_name}`, html);
  }

  return (
    <div>
      <header style={{ marginBottom: 20 }}>
        <h1 style={styles.title}>Cálculo de Rescisão</h1>
        <p style={styles.subtitle}>Calcula automaticamente as verbas conforme o tipo de desligamento.</p>
      </header>

      <div style={styles.notice}>
        Cálculo automático de referência. Confira sempre com um contador ou advogado trabalhista antes de pagar — regras de convenção coletiva, banco de horas ou situações específicas podem mudar o valor devido.
      </div>

      {error && <div style={styles.error}>{error}</div>}

      <div style={styles.form}>
        <p style={styles.formTitle}>Calcular rescisão</p>
        <div style={styles.row}>
          <select style={styles.input} value={employeeId} onChange={(e) => { setEmployeeId(e.target.value); setPreview(null); }}>
            <option value="">Colaborador...</option>
            {employees.map((e) => <option key={e.id} value={e.id}>{e.full_name}</option>)}
          </select>
          <select style={styles.input} value={terminationType} onChange={(e) => { setTerminationType(e.target.value); setPreview(null); }}>
            {Object.entries(TYPE_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </div>
        <div style={styles.row}>
          <input style={styles.input} type="date" value={terminationDate} onChange={(e) => { setTerminationDate(e.target.value); setPreview(null); }} />
          <label style={styles.checkboxLabel}>
            <input type="checkbox" checked={noticeWorked} onChange={(e) => { setNoticeWorked(e.target.checked); setPreview(null); }} />
            Aviso prévio trabalhado
          </label>
        </div>
        <button style={styles.previewBtn} onClick={handlePreview} type="button">Calcular</button>

        {preview && (
          <div style={styles.previewBox}>
            <p style={styles.previewTitle}>{preview.employeeName} — {TYPE_LABEL[terminationType]}</p>
            <div style={styles.previewRow}><span>Saldo de salário</span><span>{currency(preview.saldoSalario)}</span></div>
            <div style={styles.previewRow}><span>Aviso prévio ({preview.diasAviso} dias)</span><span>{currency(preview.avisoPrevio)}</span></div>
            <div style={styles.previewRow}><span>Férias proporcionais + 1/3</span><span>{currency(preview.feriasProporcionais)}</span></div>
            <div style={styles.previewRow}><span>13º proporcional</span><span>{currency(preview.decimoTerceiroProporcional)}</span></div>
            <div style={styles.previewRow}><span>Multa FGTS</span><span>{currency(preview.multaFgts)}</span></div>
            <div style={styles.previewTotal}><span>Total estimado</span><span>{currency(preview.total)}</span></div>
            <button style={styles.saveBtn} onClick={saveTermination} disabled={saving} type="button">{saving ? "Salvando..." : "Confirmar e salvar"}</button>
          </div>
        )}
      </div>

      {loading ? (
        <p style={styles.dim}>Carregando...</p>
      ) : terminations.length === 0 ? (
        <p style={styles.dim}>Nenhuma rescisão calculada ainda.</p>
      ) : (
        <div style={styles.tableWrap}>
          <table style={styles.table}>
            <thead><tr><th style={styles.th}>Colaborador</th><th style={styles.th}>Tipo</th><th style={styles.th}>Data</th><th style={styles.th}>Total</th><th style={styles.th}></th></tr></thead>
            <tbody>
              {terminations.map((t) => (
                <tr key={t.id}>
                  <td style={styles.td}>{t.employees?.full_name}</td>
                  <td style={styles.td}>{TYPE_LABEL[t.termination_type]}</td>
                  <td style={styles.td}>{formatDate(t.termination_date)}</td>
                  <td style={styles.td}><strong>{currency(t.total_verbas)}</strong></td>
                  <td style={{ ...styles.td, textAlign: "right" }}>
                    <button style={styles.printBtn} onClick={() => printTerm(t)} type="button">🖨 Termo</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

const styles = {
  title: { fontFamily: "var(--font-display)", fontSize: 22, margin: 0 },
  subtitle: { color: "var(--text-dim)", fontSize: 13, margin: "6px 0 0" },
  dim: { color: "var(--text-dim)", fontSize: 13 },
  notice: { background: "rgba(232,163,61,0.1)", border: "1px solid var(--amber)", borderRadius: "var(--radius)", padding: "10px 14px", fontSize: 12.5, marginBottom: 20, maxWidth: 680, lineHeight: 1.5 },
  form: { display: "flex", flexDirection: "column", gap: 12, background: "var(--panel)", border: "1px solid var(--line)", borderRadius: "var(--radius)", padding: 20, marginBottom: 28, maxWidth: 680 },
  formTitle: { fontSize: 13, fontWeight: 700, color: "var(--text-dim)", textTransform: "uppercase", letterSpacing: "0.04em", margin: "0 0 4px" },
  row: { display: "flex", gap: 10, alignItems: "center" },
  input: { flex: 1, background: "var(--panel-2)", border: "1px solid var(--line)", borderRadius: "var(--radius)", padding: "9px 10px", color: "var(--text)", fontSize: 13 },
  checkboxLabel: { display: "flex", alignItems: "center", gap: 8, fontSize: 13, whiteSpace: "nowrap" },
  previewBtn: { background: "var(--panel-2)", border: "1px solid var(--line)", color: "var(--text)", borderRadius: "var(--radius)", padding: "9px 0", fontWeight: 700, fontSize: 13, cursor: "pointer" },
  previewBox: { background: "var(--panel-2)", borderRadius: "var(--radius)", padding: 16, marginTop: 4 },
  previewTitle: { fontWeight: 700, fontSize: 13, margin: "0 0 10px" },
  previewRow: { display: "flex", justifyContent: "space-between", fontSize: 13, padding: "4px 0" },
  previewTotal: { display: "flex", justifyContent: "space-between", fontWeight: 700, fontSize: 14, borderTop: "1px solid var(--line)", paddingTop: 8, marginTop: 6, marginBottom: 12 },
  saveBtn: { width: "100%", background: "var(--amber)", color: "#FFFFFF", border: "none", borderRadius: "var(--radius)", padding: "10px 0", fontWeight: 700, fontSize: 13, cursor: "pointer" },
  tableWrap: { border: "1px solid var(--line)", borderRadius: "var(--radius)", overflow: "hidden", overflowX: "auto" },
  table: { width: "100%", borderCollapse: "collapse" },
  th: { textAlign: "left", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.04em", color: "var(--text-dim)", padding: "10px 14px", background: "var(--panel)", borderBottom: "1px solid var(--line)" },
  td: { padding: "10px 14px", fontSize: 13.5, background: "var(--panel)", borderBottom: "1px solid var(--line)" },
  printBtn: { background: "var(--panel-2)", border: "1px solid var(--line)", color: "var(--text)", borderRadius: "var(--radius)", padding: "5px 10px", fontSize: 11.5, cursor: "pointer" },
  error: { background: "rgba(217,105,95,0.12)", border: "1px solid var(--red)", color: "var(--red)", borderRadius: "var(--radius)", padding: "10px 12px", fontSize: 13, marginBottom: 16, maxWidth: 680 },
};
