import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../lib/AuthContext";

const CONTRACT_LABEL = { clt: "CLT", pj: "PJ", estagio: "Estágio", temporario: "Temporário", terceirizado: "Terceirizado" };
const POSITIONS = ["gerente", "coordenador", "supervisor", "lider", "colaborador"];
const POSITION_LABEL = { gerente: "Gerente", coordenador: "Coordenador", supervisor: "Supervisor", lider: "Líder", colaborador: "Colaborador" };
const ACCESS_ROLES = ["employee", "gestor", "rh", "dp", "admin"];
const ACCESS_LABEL = { employee: "Colaborador", gestor: "Gestor", rh: "RH", dp: "DP", admin: "Administrador" };

function readableFunctionError(error, data) {
  if (data?.error) return data.error;
  if (!error) return "";
  if (error.message && error.message !== "Edge Function returned a non-2xx status code") return error.message;
  return "Não foi possível criar o acesso. Verifique a sessão e os dados do colaborador.";
}

export default function ColaboradoresPage() {
  const { company, profile } = useAuth();
  const [employees, setEmployees] = useState([]);
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [accountSaving, setAccountSaving] = useState("");
  const emptyForm = { full_name: "", role: "", hierarchy_position: "colaborador", department: "", hire_date: "", contract_type: "clt", cpf: "", rg: "", email: "", phone: "", manager_ids: [], team_id: "", access_role: "employee", base_salary: "", dependents_count: "", password: "" };
  const [form, setForm] = useState(emptyForm);
  const canAdminister = ["rh", "dp", "admin", "master"].includes(profile?.access_role);

  async function loadAll() {
    setLoading(true); setError("");
    try {
      const [{ data: emp, error: ee }, { data: tm, error: te }] = await Promise.all([
        supabase.from("employees").select("id, full_name, role, hierarchy_position, department, status, hire_date, contract_type, manager_id, email, profile_id, access_status, access_role, team_id").order("full_name"),
        supabase.from("hr_teams").select("id, name, description").order("name")
      ]);
      if (ee) throw ee;
      if (te) throw te;
      setEmployees(emp ?? []); setTeams(tm ?? []);
    } catch (err) { setError("Não foi possível carregar: " + (err.message ?? "erro desconhecido")); }
    finally { setLoading(false); }
  }
  useEffect(() => { if (company?.id) loadAll(); }, [company?.id]);

  const managers = useMemo(() => employees.filter(e => ["gerente", "coordenador", "supervisor", "lider"].includes(e.hierarchy_position)), [employees]);

  function toggleManager(id) { setForm(p => ({ ...p, manager_ids: p.manager_ids.includes(id) ? p.manager_ids.filter(x => x !== id) : [...p.manager_ids, id] })); }

  async function handleCreate(e) {
    e.preventDefault(); setError("");
    if (!canAdminister) { setError("Somente RH, DP ou administradores podem cadastrar colaboradores."); return; }
    if (!form.full_name) { setError("Informe o nome completo."); return; }
    if (form.password && form.password.length < 8) { setError("A senha deve ter pelo menos 8 caracteres."); return; }
    if (form.password && !form.email) { setError("Para criar acesso, informe o e-mail do colaborador."); return; }
    setSaving(true);
    const { data: newEmployee, error: insertError } = await supabase.from("employees").insert({
      company_id: company.id, full_name: form.full_name, role: form.role || null, hierarchy_position: form.hierarchy_position,
      department: form.department || null, team_id: form.team_id || null, access_role: form.access_role,
      hire_date: form.hire_date || null, contract_type: form.contract_type, cpf: form.cpf || null, rg: form.rg || null,
      email: form.email || null, phone: form.phone || null, manager_id: form.manager_ids[0] || null, status: "ativo"
    }).select("id").single();
    if (insertError) { setError(insertError.message); setSaving(false); return; }

    if (form.manager_ids.length) {
      const rows = form.manager_ids.map((manager_id, i) => ({ company_id: company.id, employee_id: newEmployee.id, manager_id, is_primary: i === 0, can_approve: true, can_evaluate: true }));
      const { error: managerError } = await supabase.from("hr_employee_managers").insert(rows);
      if (managerError) setError("Colaborador criado, mas os gestores não foram vinculados: " + managerError.message);
    }
    if (form.team_id) {
      const { error: teamError } = await supabase.from("hr_team_members").insert({ company_id: company.id, team_id: form.team_id, employee_id: newEmployee.id });
      if (teamError) setError("Colaborador criado, mas não foi possível vincular à equipe: " + teamError.message);
    }
    if (form.base_salary) await supabase.from("hr_employee_compensation").insert({ company_id: company.id, employee_id: newEmployee.id, base_salary: Number(form.base_salary), dependents_count: Number(form.dependents_count) || 0, effective_date: form.hire_date || new Date().toISOString().slice(0, 10) });
    if (form.password) {
      const { data: accountData, error: accountError } = await supabase.functions.invoke("create-employee-account", { body: { employeeId: newEmployee.id, email: form.email, password: form.password, fullName: form.full_name, accessRole: form.access_role } });
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
    const { data, error: e } = await supabase.functions.invoke("create-employee-account", { body: { employeeId: emp.id, email: emp.email, password, fullName: emp.full_name, accessRole: emp.access_role || "employee" } });
    if (e || data?.error) setError(readableFunctionError(e, data)); else await loadAll();
    setAccountSaving("");
  }

  async function toggleStatus(emp) { const next = emp.status === "ativo" ? "inativo" : "ativo"; await supabase.from("employees").update({ status: next }).eq("id", emp.id); await loadAll(); }
  function managerName(managerId) { return employees.find((e) => e.id === managerId)?.full_name ?? "—"; }
  function teamName(teamId) { return teams.find(t => t.id === teamId)?.name ?? "—"; }

  return <div>
    <header style={{ marginBottom: 20 }}><h1 style={styles.title}>Colaboradores</h1><p style={styles.subtitle}>Cadastro profissional, hierarquia, equipe, gestores e acesso ao Portal.</p></header>
    {error && <div style={styles.error}>{error}</div>}
    {canAdminister && <button style={styles.newBtn} onClick={() => setShowForm(s => !s)} type="button">{showForm ? "Cancelar" : "+ Novo colaborador"}</button>}
    {showForm && <form onSubmit={handleCreate} style={styles.form}>
      <div style={styles.sectionTitle}>Dados pessoais</div>
      <div style={styles.row}><input style={styles.input} placeholder="Nome completo" value={form.full_name} onChange={e => setForm(p => ({...p,full_name:e.target.value}))} required/><input style={styles.input} placeholder="CPF" value={form.cpf} onChange={e => setForm(p => ({...p,cpf:e.target.value}))}/><input style={styles.input} placeholder="RG" value={form.rg} onChange={e => setForm(p => ({...p,rg:e.target.value}))}/></div>
      <div style={styles.row}><input style={styles.input} type="email" placeholder="E-mail" value={form.email} onChange={e => setForm(p => ({...p,email:e.target.value}))}/><input style={styles.input} placeholder="Telefone" value={form.phone} onChange={e => setForm(p => ({...p,phone:e.target.value}))}/><input style={styles.input} type="date" value={form.hire_date} onChange={e => setForm(p => ({...p,hire_date:e.target.value}))}/></div>
      <div style={styles.sectionTitle}>Estrutura profissional</div>
      <div style={styles.row}><input style={styles.input} placeholder="Cargo (ex.: Coordenador de PCP)" value={form.role} onChange={e => setForm(p => ({...p,role:e.target.value}))}/><select style={styles.input} value={form.hierarchy_position} onChange={e => setForm(p => ({...p,hierarchy_position:e.target.value}))}>{POSITIONS.map(v => <option key={v} value={v}>{POSITION_LABEL[v]}</option>)}</select><input style={styles.input} placeholder="Departamento" value={form.department} onChange={e => setForm(p => ({...p,department:e.target.value}))}/></div>
      <div style={styles.row}><select style={styles.input} value={form.contract_type} onChange={e => setForm(p => ({...p,contract_type:e.target.value}))}>{Object.entries(CONTRACT_LABEL).map(([v,l])=><option key={v} value={v}>{l}</option>)}</select><select style={styles.input} value={form.team_id} onChange={e => setForm(p => ({...p,team_id:e.target.value}))}><option value="">Equipe (opcional)</option>{teams.map(t=><option key={t.id} value={t.id}>{t.name}</option>)}</select></div>
      <div style={styles.managerBox}><div style={styles.label}>Gestores diretos <span>— selecione um ou vários</span></div>{managers.length===0 ? <p style={styles.note}>Cadastre primeiro os gestores da empresa.</p> : <div style={styles.checkGrid}>{managers.map(m=><label key={m.id} style={styles.check}><input type="checkbox" checked={form.manager_ids.includes(m.id)} onChange={()=>toggleManager(m.id)}/><span><b>{m.full_name}</b><small>{POSITION_LABEL[m.hierarchy_position] || "Gestor"}{m.role ? ` • ${m.role}` : ""}</small></span></label>)}</div>}</div>
      <div style={styles.sectionTitle}>Perfil de acesso</div>
      <div style={styles.row}><select style={styles.input} value={form.access_role} onChange={e => setForm(p => ({...p,access_role:e.target.value}))}>{ACCESS_ROLES.map(v=><option key={v} value={v}>{ACCESS_LABEL[v]}</option>)}</select><input style={styles.input} type="password" minLength={8} placeholder="Senha inicial (opcional)" value={form.password} onChange={e=>setForm(p=>({...p,password:e.target.value}))}/></div>
      <p style={styles.note}>O perfil de acesso é diferente da posição hierárquica. Um Coordenador pode ter perfil Gestor + ser Colaborador no próprio portal.</p>
      <div style={styles.sectionTitle}>Dados administrativos</div>
      <div style={styles.row}><input style={styles.input} type="number" step="0.01" placeholder="Salário base (opcional)" value={form.base_salary} onChange={e=>setForm(p=>({...p,base_salary:e.target.value}))}/><input style={styles.input} type="number" placeholder="Dependentes" value={form.dependents_count} onChange={e=>setForm(p=>({...p,dependents_count:e.target.value}))}/></div>
      <button style={styles.saveBtn} type="submit" disabled={saving}>{saving ? "Salvando..." : "Cadastrar colaborador"}</button>
    </form>}
    {loading ? <p style={styles.dim}>Carregando...</p> : employees.length===0 ? <p style={styles.dim}>Nenhum colaborador cadastrado ainda.</p> : <div style={styles.tableWrap}><table style={styles.table}><thead><tr><th style={styles.th}>Nome</th><th style={styles.th}>Cargo / posição</th><th style={styles.th}>Equipe</th><th style={styles.th}>Gestor principal</th><th style={styles.th}>Acesso</th><th style={styles.th}>Status</th></tr></thead><tbody>{employees.map(e=><tr key={e.id}><td style={styles.td}><Link to={`/colaboradores/${e.id}`} style={styles.link}>{e.full_name}</Link></td><td style={styles.td}>{e.role || "—"}<small style={styles.subcell}>{POSITION_LABEL[e.hierarchy_position] || "Colaborador"}</small></td><td style={styles.td}>{teamName(e.team_id)}</td><td style={styles.td}>{managerName(e.manager_id)}</td><td style={styles.td}>{e.access_status === "ativo" ? <span style={styles.ok}>● {ACCESS_LABEL[e.access_role] || "Acesso ativo"}</span> : canAdminister ? <button type="button" onClick={()=>createAccount(e)} style={styles.accessBtn} disabled={accountSaving===e.id}>{accountSaving===e.id ? "Criando..." : "Criar acesso"}</button> : <span style={styles.dim}>Sem acesso</span>}</td><td style={styles.td}><button style={{...styles.statusBtn,color:e.status==="ativo"?"var(--green)":"var(--text-dim)"}} onClick={()=>toggleStatus(e)} type="button" disabled={!canAdminister}>{e.status==="ativo"?"Ativo":"Inativo"}</button></td></tr>)}</tbody></table></div>}
  </div>;
}
const styles={title:{fontFamily:"var(--font-display)",fontSize:22,margin:0},subtitle:{color:"var(--text-dim)",fontSize:13,margin:"6px 0 0"},dim:{color:"var(--text-dim)",fontSize:13},newBtn:{background:"var(--amber)",color:"#fff",border:"none",borderRadius:"var(--radius)",padding:"9px 18px",fontWeight:700,fontSize:13,cursor:"pointer",marginBottom:16},form:{display:"flex",flexDirection:"column",gap:12,background:"var(--panel)",border:"1px solid var(--line)",borderRadius:"var(--radius)",padding:20,marginBottom:28,maxWidth:980},sectionTitle:{fontSize:12,fontWeight:800,textTransform:"uppercase",letterSpacing:".05em",color:"var(--text-dim)",marginTop:4},row:{display:"flex",gap:10,flexWrap:"wrap"},input:{flex:1,minWidth:180,background:"var(--panel-2)",border:"1px solid var(--line)",borderRadius:"var(--radius)",padding:"9px 10px",color:"var(--text)",fontSize:13},saveBtn:{background:"var(--green)",color:"#fff",border:"none",borderRadius:"var(--radius)",padding:"10px 0",fontWeight:700,fontSize:13,cursor:"pointer"},note:{fontSize:11.5,color:"var(--text-dim)",margin:0},managerBox:{border:"1px solid var(--line)",borderRadius:10,padding:12,background:"var(--panel-2)"},label:{fontSize:12,fontWeight:800,color:"var(--text)"},checkGrid:{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(230px,1fr))",gap:8,marginTop:10},check:{display:"flex",alignItems:"center",gap:9,padding:9,border:"1px solid var(--line)",borderRadius:8,cursor:"pointer"},checkGridLabel:{fontSize:12},tableWrap:{border:"1px solid var(--line)",borderRadius:"var(--radius)",overflow:"hidden",overflowX:"auto"},table:{width:"100%",borderCollapse:"collapse"},th:{textAlign:"left",fontSize:11,textTransform:"uppercase",letterSpacing:".04em",color:"var(--text-dim)",padding:"10px 14px",background:"var(--panel)",borderBottom:"1px solid var(--line)"},td:{padding:"10px 14px",fontSize:13.5,background:"var(--panel)",borderBottom:"1px solid var(--line)"},subcell:{display:"block",fontSize:10,color:"var(--text-dim)",marginTop:3},link:{color:"var(--amber)",fontWeight:700,textDecoration:"none"},statusBtn:{background:"transparent",border:"none",fontWeight:700,fontSize:12.5,cursor:"pointer"},accessBtn:{background:"var(--panel-2)",border:"1px solid var(--line)",borderRadius:"var(--radius)",padding:"6px 10px",color:"var(--text)",fontWeight:700,fontSize:12,cursor:"pointer"},ok:{color:"var(--green)",fontWeight:700,fontSize:12},error:{background:"rgba(217,105,95,.12)",border:"1px solid var(--red)",color:"var(--red)",borderRadius:"var(--radius)",padding:"10px 12px",fontSize:13,marginBottom:16,maxWidth:980}};
