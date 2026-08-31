import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../lib/AuthContext";
import ModulePage from "../components/ModulePage";
import { openPrintDocument, formatDate, infoGrid, section } from "../lib/printDocument";

function textBlock(value){ return `<div class="highlight" style="white-space:pre-line;line-height:1.65">${String(value ?? "").replace(/[&<>\"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;"}[c]))}</div>`; }

export default function DescricaoCargosPage(){
  const { company } = useAuth();
  const [rows,setRows]=useState([]),[selectedId,setSelectedId]=useState(""),[loading,setLoading]=useState(true);
  async function loadPrintableRows(){
    if(!company?.id)return;
    setLoading(true);
    const {data,error}=await supabase.from("hr_job_descriptions").select("*").eq("company_id",company.id).order("title");
    if(!error){const next=data??[];setRows(next);setSelectedId(current=>current&&next.some(r=>r.id===current)?current:(next[0]?.id??""));}
    setLoading(false);
  }
  useEffect(()=>{loadPrintableRows()},[company?.id]);
  const selected=rows.find(r=>r.id===selectedId);
  function printSelected(){
    if(!selected)return;
    const content=[
      infoGrid([
        {label:"Cargo",value:selected.title},
        {label:"Departamento",value:selected.department||"Não informado"},
        {label:"Código CBO",value:selected.cbo_code||"Não informado"},
        {label:"Emissão",value:formatDate(new Date())}
      ]),
      selected.summary?section("Missão do cargo",textBlock(selected.summary)):"",
      selected.responsibilities?section("Principais responsabilidades",textBlock(selected.responsibilities)):"",
      selected.requirements?section("Requisitos do cargo",textBlock(selected.requirements)):"",
      section("Aprovação",`<div class="signature-area"><div><div class="signature">Responsável RH/DP</div></div><div><div class="signature">Aprovação da gestão</div></div></div>`)
    ].join("");
    openPrintDocument({title:"Descrição de Cargo",subtitle:selected.title||"Documento corporativo",company,content,documentCode:`CARGO-${String(selected.id).slice(0,8).toUpperCase()}`});
  }
  return <div>
    <div className="no-print" style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:12,marginBottom:14,flexWrap:"wrap"}}>
      <div><div style={{fontSize:11,fontWeight:800,textTransform:"uppercase",letterSpacing:".05em",color:"var(--text-dim)"}}>Documento administrativo</div><div style={{fontSize:13,color:"var(--text-dim)",marginTop:3}}>Selecione o cargo e gere a descrição corporativa completa.</div></div>
      <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}><select value={selectedId} onChange={e=>setSelectedId(e.target.value)} disabled={loading||!rows.length} style={{background:"var(--panel)",border:"1px solid var(--line)",borderRadius:"var(--radius)",padding:"9px 10px",color:"var(--text)",minWidth:260}}>{!rows.length&&<option value="">Nenhuma descrição cadastrada</option>}{rows.map(r=><option key={r.id} value={r.id}>{r.title}{r.department?` · ${r.department}`:""}</option>)}</select><button type="button" disabled={!selected} onClick={printSelected} style={{background:"var(--ink)",color:"#fff",border:"none",borderRadius:"var(--radius)",padding:"9px 14px",fontWeight:800,cursor:selected?"pointer":"not-allowed",opacity:selected?1:.5}}>🖨 Imprimir documento completo</button></div>
    </div>
    <div className="no-print"><ModulePage table="hr_job_descriptions" title="Descrição de Cargos" subtitle="Documento oficial que define missão, responsabilidades e requisitos de cada cargo." emptyLabel="Nenhum cargo descrito ainda." fields={[{key:"title",label:"Cargo",placeholder:"Ex: Analista de Logística",required:true},{key:"department",label:"Departamento"},{key:"cbo_code",label:"Código CBO",placeholder:"Ex: 4141-05"},{key:"summary",label:"Resumo do cargo"},{key:"responsibilities",label:"Responsabilidades"},{key:"requirements",label:"Requisitos"}]} /></div>
  </div>;
}
