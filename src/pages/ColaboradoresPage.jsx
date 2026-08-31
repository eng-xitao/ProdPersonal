import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../lib/AuthContext";

const CONTRACT_LABEL = { clt: "CLT", pj: "PJ", estagio: "Estágio", temporario: "Temporário", terceirizado: "Terceirizado" };
function readableFunctionError(error, data) {
  if (data?.error) return data.error;
  if (!error) return "";
  if (error.message && error.message !== "Edge Function returned a non-2xx status code") return error.message;
  return "Não foi possível criar o acesso. Verifique a sessão e os dados do colaborador.";
}

export default function ColaboradoresPage() {
  const { company } = useAuth();
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [accountSaving, setAccountSaving] = useState("");
  const emptyForm = { full_name: "", role: "", hire_date: "", contract_type: "clt", cpf: "", rg: "", email: "", phone: "", manager_id: "", base_salary: "", dependents_count: "", password: "" };
  const [form, setForm] = useState(emptyForm);

  async function loadAll() {
    setLoading(true); setError("");
    try { const { data, error: e } = await supabase.from("employees").select("id, full_name, role, status, hire_date, contract_type, manager_id, email, profile_id, access_status").order("full_name"); if (e) throw e; setEmployees(data ?? []); }
    catch (err) { setError("Não foi possível carregar: " + (err.message ?? "erro desconhecido")); }
    finally { setLoading(false); }
  }
  useEffect(() => { if (company?.id) loadAll(); }, [company?.id]);

  async function handleCreate(e) {
    e.preventDefault(); setError("");
    if (!form.full_name) { setError("Informe o nome completo."); return; }
    if (form.password && form.password.length < 8) { setError("A senha deve ter pelo menos 8 caracteres."); return; }
    if (form.password && !form.email) { setError("Para criar acesso, informe o e-mail do colaborador."); return; }
    setSaving(true);
    const { data: newEmployee, error: insertError } = await supabase.from("employees").insert({ company_id: company.id, full_name: form.full_name, role: form.role || null, hire_date: form.hire_date || null, contract_type: form.contract_type, cpf: form.cpf || null, rg: form.rg || null, email: form.email || null, phone: form.phone || null, manager_id: form.manager_id || null, status: "ativo" }).select("id").single();
    if (insertError) { setError(insertError.message); setSaving(false); return; }
    if (form.base_salary) await supabase.from("hr_employee_compensation").insert({ company_id: company.id, employee_id: newEmployee.id, base_salary: Number(form.base_salary), dependents_count: Number(form.dependents_count) || 0, effective_date: form.hire_date || new Date().toISOString().slice(0, 10) });
    if (form.password) {
      const { data: accountData, error: accountError } = await supabase.functions.invoke("create-employee-account", { body: { employeeId: newEmployee.id, email: form.email, password: form.password, fullName: form.full_name } });
      if (accountError || accountData?.error) setError("Colaborador criado, mas não foi possível criar o acesso: " + readableFunctionError(accountError, accountData));
    }
    setForm(emptyForm); setShowForm(false); setSaving(false); await loadAll();
  }

  async function createAccount(emp) {
    if (!emp.email) { setError("Cadastre o e-mail do colaborador antes de criar o acesso."); return; }
    const password = window.prompt(`Defina a senha inicial de ${emp.full_name} (mínimo 8 caracteres):`);
    if (!password) return;
    if (password.length < 8) { setError("A senha deve ter pelo menos 8 caracteres."); return; }
    setAccountSaving(emp.id); setError("");
    const { data, error: e } = await supabase.functions.invoke("create-employee-account", { body: { employeeId: emp.id, email: emp.email, password, fullName: emp.full_name } });
    if (e || data?.error) setError(readableFunctionError(e, data)); else await loadAll();
    setAccountSaving("");
  }

  async function toggleStatus(emp) { const next = emp.status === "ativo" ? "inativo" : "ativo"; await supabase.from("employees").update({ status: next }).eq("id", emp.id); await loadAll(); }
  function managerName(managerId) { return employees.find((e) => e.id === managerId)?.full_name ?? "—"; }

  return <div>
    <header style={{ marginBottom: 20 }}><h1 style={styles.title}>Colaboradores</h1><p style={styles.subtitle}>Cadastro base e controle de acesso ao Portal do Colaborador.</p></header>
    {error && <div style={styles.error}>{error}</div>}
    <button style={styles.newBtn} onClick={() => setShowForm((s) => !s)} type="button">{showForm ? "Cancelar" : "+ Novo colaborador"}</button>
    {showForm && <form onSubmit={handleCreate} style={styles.form}>
      <div style={styles.sectionTitle}>Dados profissionais</div>
      <div style={styles.row}><input style={styles.input} placeholder="Nome completo" value={form.full_name} onChange={(e) => setForm((p) => ({ ...p, full_name: e.target.value }))} required /><input style={styles.input} placeholder="Cargo" value={form.role} onChange={(e) => setForm((p) => ({ ...p, role: e.target.value }))} /></div>
      <div style={styles.row}><input style={styles.input} type="date" value={form.hire_date} onChange={(e) => setForm((p) => ({ ...p, hire_date: e.target.value }))} /><select style={styles.input} value={form.contract_type} onChange={(e) => setForm((p) => ({ ...p, contract_type: e.target.value }))}>{Object.entries(CONTRACT_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select><select style={styles.input} value={form.manager_id} onChange={(e) => setForm((p) => ({ ...p, manager_id: e.target.value }))}><option value="">Gestor direto (opcional)...</option>{employees.map((e) => <option key={e.id} value={e.id}>{e.full_name}</option>)}</select></div>
      <div style={styles.row}><input style={styles.input} placeholder="CPF" value={form.cpf} onChange={(e) => setForm((p) => ({ ...p, cpf: e.target.value }))} /><input style={styles.input} placeholder="RG" value={form.rg} onChange={(e) => setForm((p) => ({ ...p, rg: e.target.value }))} /></div>
      <div style={styles.sectionTitle}>Acesso ao Portal do Colaborador</div>
      <div style={styles.row}><input style={styles.input} type="email" placeholder="E-mail de acesso" value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} /><input style={styles.input} type="password" minLength={8} placeholder="Senha inicial (mín. 8 caracteres)" value={form.password} onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))} /></div>
      <p style={styles.note}>A senha é usada somente para criar/atualizar o acesso e não é armazenada em texto aberto no banco.</p>
      <div style={styles.row}><input style={styles.input} type="number" step="0.01" placeholder="Salário base (R$)" value={form.base_salary} onChange={(e) => setForm((p) => ({ ...p, base_salary: e.target.value }))} /><input style={styles.input} type="number" placeholder="Nº de dependentes (IRRF)" value={form.dependents_count} onChange={(e) => setForm((p) => ({ ...p, dependents_count: e.target.value }))} /></div>
      <button style={styles.saveBtn} type="submit" disabled={saving}>{saving ? "Salvando..." : "Cadastrar"}</button>
    </form>}
    {loading ? <p style={styles.dim}>Carregando...</p> : employees.length === 0 ? <p style={styles.dim}>Nenhum colaborador cadastrado ainda.</p> : <div style={styles.tableWrap}><table style={styles.table}><thead><tr><th style={styles.th}>Nome</th><th style={styles.th}>Cargo</th><th style={styles.th}>Gestor</th><th style={styles.th}>Acesso</th><th style={styles.th}>Status</th></tr></thead><tbody>{employees.map((e) => <tr key={e.id}><td style={styles.td}><Link to={`/colaboradores/${e.id}`} style={styles.link}>{e.full_name}</Link></td><td style={styles.td}>{e.role ?? "—"}</td><td style={styles.td}>{managerName(e.manager_id)}</td><td style={styles.td}>{e.access_status === "ativo" ? <span style={styles.ok}>● Acesso ativo</span> : <button type="button" onClick={() => createAccount(e)} style={styles.accessBtn} disabled={accountSaving === e.id}>{accountSaving === e.id ? "Criando..." : "Criar acesso"}</button>}</td><td style={styles.td}><button style={{ ...styles.statusBtn, color: e.status === "ativo" ? "var(--green)" : "var(--text-dim)" }} onClick={() => toggleStatus(e)} type="button">{e.status === "ativo" ? "Ativo" : "Inativo"}</button></td></tr>)}</tbody></table></div>}
  </div>;
}
const styles={title:{fontFamily:"var(--font-display)",fontSize:22,margin:0},subtitle:{color:"var(--text-dim)",fontSize:13,margin:"6px 0 0"},dim:{color:"var(--text-dim)",fontSize:13},newBtn:{background:"var(--amber)",color:"#FFFFFF",border:"none",borderRadius:"var(--radius)",padding:"9px 18px",fontWeight:700,fontSize:13,cursor:"pointer",marginBottom:16},form:{display:"flex",flexDirection:"column",gap:12,background:"var(--panel)",border:"1px solid var(--line)",borderRadius:"var(--radius)",padding:20,marginBottom:28,maxWidth:760},sectionTitle:{fontSize:12,fontWeight:800,textTransform:"uppercase",letterSpacing:".05em",color:"var(--text-dim)",marginTop:4},row:{display:"flex",gap:10,flexWrap:"wrap"},input:{flex:1,minWidth:180,background:"var(--panel-2)",border:"1px solid var(--line)",borderRadius:"var(--radius)",padding:"9px 10px",color:"var(--text)",fontSize:13},saveBtn:{background:"var(--green)",color:"#FFFFFF",border:"none",borderRadius:"var(--radius)",padding:"10px 0",fontWeight:700,fontSize:13,cursor:"pointer"},note:{fontSize:11.5,color:"var(--text-dim)",margin:0},tableWrap:{border:"1px solid var(--line)",borderRadius:"var(--radius)",overflow:"hidden",overflowX:"auto"},table:{width:"100%",borderCollapse:"collapse"},th:{textAlign:"left",fontSize:11,textTransform:"uppercase",letterSpacing:".04em",color:"var(--text-dim)",padding:"10px 14px",background:"var(--panel)",borderBottom:"1px solid var(--line)"},td:{padding:"10px 14px",fontSize:13.5,background:"var(--panel)",borderBottom:"1px solid var(--line)"},link:{color:"var(--amber)",fontWeight:700,textDecoration:"none"},statusBtn:{background:"transparent",border:"none",fontWeight:700,fontSize:12.5,cursor:"pointer"},accessBtn:{background:"var(--panel-2)",border:"1px solid var(--line)",borderRadius:"var(--radius)",padding:"6px 10px",color:"var(--text)",fontWeight:700,fontSize:12,cursor:"pointer"},ok:{color:"var(--green)",fontWeight:700,fontSize:12},error:{background:"rgba(217,105,95,0.12)",border:"1px solid var(--red)",color:"var(--red)",borderRadius:"var(--radius)",padding:"10px 12px",fontSize:13,marginBottom:16,maxWidth:760}};