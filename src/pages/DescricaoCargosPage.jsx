import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../lib/AuthContext";
import ModulePage from "../components/ModulePage";

function Field({ label, value, icon }) {
  if (!value) return null;
  return <section className="job-print-section"><div className="job-print-section-title"><span className="job-print-icon">{icon}</span><span>{label}</span></div><div className="job-print-text">{value}</div></section>;
}

export default function DescricaoCargosPage() {
  const { company } = useAuth();
  const [rows, setRows] = useState([]);
  const [selectedId, setSelectedId] = useState("");
  const [loading, setLoading] = useState(true);

  async function loadPrintableRows() {
    if (!company?.id) return;
    setLoading(true);
    const { data } = await supabase.from("hr_job_descriptions").select("*").eq("company_id", company.id).order("title");
    const next = data ?? [];
    setRows(next);
    setSelectedId(current => current && next.some(r => r.id === current) ? current : (next[0]?.id ?? ""));
    setLoading(false);
  }
  useEffect(() => { loadPrintableRows(); }, [company?.id]);
  const selected = rows.find(r => r.id === selectedId);

  return <div>
    <div className="no-print" style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:12,marginBottom:14}}>
      <div><div style={{fontSize:11,fontWeight:800,textTransform:"uppercase",letterSpacing:".05em",color:"var(--text-dim)"}}>Documento administrativo</div><div style={{fontSize:13,color:"var(--text-dim)",marginTop:3}}>Selecione o cargo e gere uma descrição corporativa completa, sem imprimir a tela do sistema.</div></div>
      <div style={{display:"flex",gap:8,alignItems:"center"}}><select value={selectedId} onChange={e=>setSelectedId(e.target.value)} disabled={loading||!rows.length} style={{background:"var(--panel)",border:"1px solid var(--line)",borderRadius:"var(--radius)",padding:"9px 10px",color:"var(--text)",minWidth:260}}>{!rows.length&&<option value="">Nenhuma descrição cadastrada</option>}{rows.map(r=><option key={r.id} value={r.id}>{r.title}{r.department?` · ${r.department}`:""}</option>)}</select><button type="button" disabled={!selected} onClick={()=>window.print()} style={{background:"#1267E8",color:"#fff",border:"none",borderRadius:"var(--radius)",padding:"9px 14px",fontWeight:800,cursor:selected?"pointer":"not-allowed",opacity:selected?1:.5}}>🖨 Imprimir documento</button></div>
    </div>

    <div className="no-print"><ModulePage table="hr_job_descriptions" title="Descrição de Cargos" subtitle="Documento oficial que define missão, responsabilidades e requisitos de cada cargo." emptyLabel="Nenhum cargo descrito ainda." fields={[{key:"title",label:"Cargo",placeholder:"Ex: Analista de Logística",required:true},{key:"department",label:"Departamento"},{key:"cbo_code",label:"Código CBO",placeholder:"Ex: 4141-05"},{key:"summary",label:"Resumo do cargo"},{key:"responsibilities",label:"Responsabilidades"},{key:"requirements",label:"Requisitos"}]} /></div>

    {selected && <article className="print-document job-print-document">
      <header className="job-print-cover">
        <div className="job-print-brand"><img src="/brand/prodpersonal-logo.svg" alt="ProdPersonal" /></div>
        <div className="job-print-confidential">CONFIDENCIAL — USO RESTRITO AO RH/DP</div>
        <div className="job-print-cover-content"><div className="job-print-kicker">DESCRIÇÃO DE CARGO</div><h1>{selected.title}</h1><p>Documento corporativo para gestão de pessoas, recrutamento e desenvolvimento.</p><div className="job-print-code">{selected.cbo_code ? `CBO ${selected.cbo_code}` : "Documento interno"}</div></div>
      </header>

      <section className="job-print-identity"><div><span>Cargo</span><strong>{selected.title}</strong></div><div><span>Departamento</span><strong>{selected.department || "Não informado"}</strong></div><div><span>Código CBO</span><strong>{selected.cbo_code || "Não informado"}</strong></div><div><span>Emissão</span><strong>{new Date().toLocaleDateString("pt-BR")}</strong></div></section>

      <Field icon="◈" label="Missão do cargo" value={selected.summary} />
      <Field icon="✓" label="Principais responsabilidades" value={selected.responsibilities} />
      <Field icon="▣" label="Requisitos do cargo" value={selected.requirements} />

      <section className="job-print-approval"><div><span>Responsável RH/DP</span><div className="job-print-line" /></div><div><span>Aprovação da gestão</span><div className="job-print-line" /></div></section>
      <footer className="job-print-footer"><span>ProdPersonal • Gestão de Pessoas • ProdOS</span><span>Documento corporativo • Versão atual</span></footer>
    </article>}
  </div>;
}
