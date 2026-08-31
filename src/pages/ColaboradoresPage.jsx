import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../lib/AuthContext";

const POSITIONS = ["gerente", "coordenador", "supervisor", "lider", "colaborador"];
const POSITION_LABEL = { gerente: "Gerente", coordenador: "Coordenador", supervisor: "Supervisor", lider: "Líder", colaborador: "Colaborador" };
const ACCESS_ROLES = ["employee", "gestor", "rh", "dp", "admin"];
const ACCESS_LABEL = { employee: "Colaborador", gestor: "Gestor", rh: "RH", dp: "DP", admin: "Administrador" };
const CONTRACTS = { clt: "CLT", pj: "PJ", estagio: "Estágio", temporario: "Temporário", terceirizado: "Terceirizado" };

const emptyForm = { id: null, full_name: "", role: "", hierarchy_position: "colaborador", department: "", hire_date: "", contract_type: "clt", cpf: "", rg: "", email: "", phone: "", manager_ids: [], team_id: "", access_role: "employee", base_salary: "", dependents_count: "", password: "" };

export default function ColaboradoresPage() {
  const { company, profile } = useAuth();
  const [employees, setEmployees] = useState([]);
  const [teams, setTeams] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const canAdminister = ["rh", "dp", "admin", "master"].includes(profile?.access_role);

  async function loadAll() {
    if (!company?.id) return;
    setLoading(true); setError("");
    const [{ data: emp, error: ee }, { data: tm, error: te }] = await Promise.all([
      supabase.from("employees").select("id,full_name,role,hierarchy_position,department,status,hire_date,contract_type,manager_id,email,phone,cpf,rg,profile_id,access_status,access_role,team_id").eq("company_id", company.id).order("full_name"),
      supabase.from("hr_teams").select("id,name,description").eq("company_id", company.id).order("name")
    ]);
    if (ee) setError(ee.message); else setEmployees(emp || []);
    if (te) setError(te.message); else setTeams(tm || []);
    setLoading(false);
  }
  useEffect(() => { loadAll(); }, [company?.id]);

  const managers = useMemo(() => employees.filter(e => ["gerente", "coordenador", "supervisor", "lider"].includes(e.hierarchy_position)), [employees]);
  const managerName = id => employees.find(e => e.id === id)?.full_name || "—";
  const teamName = id => teams.find(t => t.id === id)?.name || "—";
  const setField = (key, value) => setForm(p => ({ ...p, [key]: value }));
  const toggleManager = id => setForm(p => ({ ...p, manager_ids: p.manager_ids.includes(id) ? p.manager_ids.filter(x => x !== id) : [...p.manager_ids, id] }));

  async function openEdit(emp) {
    setError("");
    let managerIds = emp.manager_id ? [emp.manager_id] : [];
    const { data } = await supabase.from("hr_employee_managers").select("manager_id,is_primary").eq("company_id", company.id).eq("employee_id", emp.id);
    if (data?.length) managerIds = data.sort((a,b) => Number(b.is_primary)-Number(a.is_primary)).map(x => x.manager_id);
    setForm({ ...emptyForm, ...emp, manager_ids: managerIds, password: "", base_salary: "", dependents_count: "" });
    setEditing(true); setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function saveEmployee(e) {
    e.preventDefault();
    if (!canAdminister) return setError("Somente RH, DP ou administradores podem alterar colaboradores.");
    if (!form.full_name.trim()) return setError("Informe o nome completo.");
    setSaving(true); setError("");
    const payload = { full_name: form.full_name.trim(), role: form.role || null, hierarchy_position: form.hierarchy_position, department: form.department || null, hire_date: form.hire_date || null, contract_type: form.contract_type, cpf: form.cpf || null, rg: form.rg || null, email: form.email || null, phone: form.phone || null, team_id: form.team_id || null, access_role: form.access_role || "employee", manager_id: form.manager_ids[0] || null };
    let employeeId = form.id;
    if (editing) {
      const { error: ue } = await supabase.from("employees").update(payload).eq("id", form.id).eq("company_id", company.id);
      if (ue) { setError(ue.message); setSaving(false); return; }
      await supabase.from("hr_employee_managers").delete().eq("company_id", company.id).eq("employee_id", form.id);
    } else {
      const { data, error: ie } = await supabase.from("employees").insert({ company_id: company.id, ...payload, status: "ativo" }).select("id").single();
      if (ie) { setError(ie.message); setSaving(false); return; }
      employeeId = data.id;
    }
    if (form.manager_ids.length) {
      const rows = form.manager_ids.map((manager_id, i) => ({ company_id: company.id, employee_id: employeeId, manager_id, is_primary: i === 0, can_approve: true, can_evaluate: true }));
      const { error: me } = await supabase.from("hr_employee_managers").insert(rows);
      if (me) setError("Dados salvos, mas os gestores não foram vinculados: " + me.message);
    }
    if (!editing && form.team_id) await supabase.from("hr_team_members").insert({ company_id: company.id, team_id: form.team_id, employee_id: employeeId });
    if (editing && form.team_id) {
      await supabase.from("hr_team_members").delete().eq("company_id", company.id).eq("employee_id", employeeId);
      await supabase.from("hr_team_members").insert({ company_id: company.id, team_id: form.team_id, employee_id: employeeId });
    }
    setForm(emptyForm); setShowForm(false); setEditing(false); setSaving(false); await loadAll();
  }

  async function toggleStatus(emp) {
    const next = emp.status === "ativo" ? "inativo" : "ativo";
    const { error: e } = await supabase.from("employees").update({ status: next }).eq("id", emp.id).eq("company_id", company.id);
    if (e) setError(e.message); else loadAll();
  }

  async function createAccount(emp) {
    if (!emp.email) return setError("Cadastre o e-mail antes de criar o acesso.");
    const password = window.prompt(`Defina a senha inicial de ${emp.full_name} (mínimo 8 caracteres):`);
    if (!password) return;
    if (password.length < 8) return setError("A senha deve ter pelo menos 8 caracteres.");
    const { data, error: e } = await supabase.functions.invoke("create-employee-account", { body: { employeeId: emp.id, email: emp.email, password, fullName: emp.full_name, accessRole: emp.access_role || "employee" } });
    if (e || data?.error) setError(data?.error || e?.message || "Não foi possível criar o acesso."); else loadAll();
  }

  return <div>
    <header style={styles.header}><div><h1 style={styles.title}>Colaboradores</h1><p style={styles.subtitle}>Cadastro profissional, hierarquia, equipes, gestores e acesso ao Portal.</p></div>{canAdminister && <button style={styles.primary} onClick={() => { setForm(emptyForm); setEditing(false); setShowForm(v => !v); }}>{showForm ? "Cancelar" : "+ Novo colaborador"}</button>}</header>
    {error && <div style={styles.error}>{error}</div>}

    {showForm && <form onSubmit={saveEmployee} style={styles.form}>
      <div style={styles.formHead}><div><h2>{editing ? "Editar colaborador" : "Novo colaborador"}</h2><p>{editing ? "Atualize os dados, equipe, gestores e permissões do usuário." : "Cadastre a pessoa e defina sua estrutura organizacional."}</p></div></div>
      <Section title="Dados pessoais"><Row><Input label="Nome completo *" value={form.full_name} onChange={v=>setField("full_name",v)} /><Input label="CPF" value={form.cpf||""} onChange={v=>setField("cpf",v)} /><Input label="RG" value={form.rg||""} onChange={v=>setField("rg",v)} /></Row><Row><Input label="E-mail" type="email" value={form.email||""} onChange={v=>setField("email",v)} /><Input label="Telefone" value={form.phone||""} onChange={v=>setField("phone",v)} /><Input label="Data de admissão" type="date" value={form.hire_date||""} onChange={v=>setField("hire_date",v)} /></Row></Section>
      <Section title="Estrutura profissional"><Row><Input label="Cargo" placeholder="Ex.: Coordenador de PCP" value={form.role||""} onChange={v=>setField("role",v)} /><Select label="Posição hierárquica" value={form.hierarchy_position} onChange={v=>setField("hierarchy_position",v)} options={POSITIONS.map(v=>[v,POSITION_LABEL[v]])} /><Input label="Departamento" value={form.department||""} onChange={v=>setField("department",v)} /></Row><Row><Select label="Tipo de vínculo" value={form.contract_type} onChange={v=>setField("contract_type",v)} options={Object.entries(CONTRACTS)} /><Select label="Equipe" value={form.team_id||""} onChange={v=>setField("team_id",v)} options={[["","Sem equipe"] ,...teams.map(t=>[t.id,t.name])]} /></Row></Section>
      <Section title="Gestores diretos"><div style={styles.managerGrid}>{managers.length ? managers.map(m=><label key={m.id} style={styles.manager}><input type="checkbox" checked={form.manager_ids.includes(m.id)} onChange={()=>toggleManager(m.id)} /><span><b>{m.full_name}</b><small>{POSITION_LABEL[m.hierarchy_position] || "Gestor"}{m.role ? ` • ${m.role}` : ""}</small></span></label>) : <span style={styles.muted}>Nenhum gerente/coordenador/supervisor/líder cadastrado ainda.</span>}</div><p style={styles.help}>O primeiro gestor selecionado será o principal. Você pode selecionar mais de um gestor.</p></Section>
      <Section title="Perfil de acesso"><Row><Select label="Perfil de acesso" value={form.access_role||"employee"} onChange={v=>setField("access_role",v)} options={ACCESS_ROLES.map(v=>[v,ACCESS_LABEL[v]])} />{!editing && <Input label="Senha inicial (opcional)" type="password" value={form.password} onChange={v=>setField("password",v)} />}</Row><p style={styles.help}>Posição hierárquica e perfil de acesso são coisas diferentes. Um Coordenador pode ser Gestor e também utilizar o Portal como colaborador.</p></Section>
      <div style={styles.actions}><button type="button" style={styles.secondary} onClick={()=>{setShowForm(false);setEditing(false);setForm(emptyForm);}}>Cancelar</button><button type="submit" style={styles.primary} disabled={saving}>{saving ? "Salvando..." : editing ? "Salvar alterações" : "Cadastrar colaborador"}</button></div>
    </form>}

    {loading ? <p style={styles.muted}>Carregando...</p> : <div style={styles.tableWrap}><table style={styles.table}><thead><tr><th>Nome</th><th>Cargo / posição</th><th>Equipe</th><th>Gestores</th><th>Acesso</th><th>Status</th><th>Ações</th></tr></thead><tbody>{employees.map(e=><tr key={e.id}><td><Link to={`/colaboradores/${e.id}`} style={styles.link}>{e.full_name}</Link></td><td>{e.role || "—"}<small style={styles.sub}>{POSITION_LABEL[e.hierarchy_position] || "Colaborador"}</small></td><td>{teamName(e.team_id)}</td><td>{managerName(e.manager_id)}{e.manager_id ? "" : "—"}</td><td>{e.access_status === "ativo" ? <span style={styles.ok}>● {ACCESS_LABEL[e.access_role] || "Ativo"}</span> : canAdminister ? <button style={styles.small} onClick={()=>createAccount(e)}>Criar acesso</button> : <span style={styles.muted}>Sem acesso</span>}</td><td><button style={styles.status} onClick={()=>toggleStatus(e)} disabled={!canAdminister}>{e.status === "ativo" ? "Ativo" : "Inativo"}</button></td><td>{canAdminister && <button style={styles.edit} onClick={()=>openEdit(e)}>✎ Editar</button>}</td></tr>)}</tbody></table></div>}
  </div>;
}

function Section({title,children}) { return <section style={styles.section}><h3>{title}</h3>{children}</section>; }
function Row({children}) { return <div style={styles.row}>{children}</div>; }
function Input({label,value,onChange,type="text",placeholder=""}) { return <label style={styles.field}><span>{label}</span><input type={type} value={value ?? ""} placeholder={placeholder} onChange={e=>onChange(e.target.value)} /></label>; }
function Select({label,value,onChange,options}) { return <label style={styles.field}><span>{label}</span><select value={value ?? ""} onChange={e=>onChange(e.target.value)}>{options.map(([v,l])=><option key={v} value={v}>{l}</option>)}</select></label>; }

const styles={header:{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:16,marginBottom:20},title:{fontFamily:"var(--font-display)",fontSize:22,margin:0},subtitle:{color:"var(--text-dim)",fontSize:13,margin:"6px 0 0"},primary:{background:"var(--amber)",color:"#fff",border:0,borderRadius:"var(--radius)",padding:"10px 16px",fontWeight:800,cursor:"pointer"},secondary:{background:"transparent",color:"var(--text)",border:"1px solid var(--line)",borderRadius:"var(--radius)",padding:"10px 16px",fontWeight:700,cursor:"pointer"},error:{background:"rgba(220,70,70,.12)",border:"1px solid rgba(220,70,70,.3)",color:"#ff8c8c",padding:12,borderRadius:10,marginBottom:16,fontSize:13},form:{background:"var(--panel)",border:"1px solid var(--line)",borderRadius:"var(--radius)",padding:20,marginBottom:24},formHead:{borderBottom:"1px solid var(--line)",paddingBottom:12,marginBottom:14},section:{padding:"10px 0 16px",borderBottom:"1px solid var(--line)"},section:{padding:"10px 0 16px",borderBottom:"1px solid var(--line)"},row:{display:"flex",gap:12,flexWrap:"wrap",marginTop:10},field:{display:"flex",flexDirection:"column",gap:6,flex:1,minWidth:200,color:"var(--text-dim)",fontSize:11,fontWeight:700},input:{},fieldInput:{},sectionTitle:{},managerGrid:{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(220px,1fr))",gap:8,marginTop:10},manager:{display:"flex",gap:9,alignItems:"center",padding:10,border:"1px solid var(--line)",borderRadius:9,background:"var(--panel-2)",cursor:"pointer"},manager span:{},help:{fontSize:11,color:"var(--text-dim)",margin:"8px 0 0"},muted:{color:"var(--text-dim)",fontSize:13},actions:{display:"flex",justifyContent:"flex-end",gap:10,paddingTop:16},tableWrap:{overflowX:"auto",border:"1px solid var(--line)",borderRadius:"var(--radius)"},table:{width:"100%",borderCollapse:"collapse",fontSize:12},link:{color:"var(--text)",fontWeight:700,textDecoration:"none"},sub:{display:"block",color:"var(--text-dim)",fontSize:10,marginTop:3},ok:{color:"var(--green)",fontSize:11,fontWeight:700},small:{background:"var(--green)",color:"#fff",border:0,borderRadius:7,padding:"6px 9px",cursor:"pointer",fontSize:11},edit:{background:"transparent",color:"var(--amber)",border:"1px solid var(--line)",borderRadius:7,padding:"6px 9px",cursor:"pointer",fontWeight:700},status:{background:"transparent",border:0,color:"var(--green)",fontWeight:700,cursor:"pointer"}};

// Campos de input/select recebem estilo via CSS global do projeto quando disponíveis.
