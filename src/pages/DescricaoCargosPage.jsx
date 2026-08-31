import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../lib/AuthContext";
import ModulePage from "../components/ModulePage";

function Field({ label, value }) {
  if (!value) return null;
  return <div style={{ marginBottom: 12 }}><div style={{fontSize:10,textTransform:"uppercase",letterSpacing:".06em",fontWeight:800,color:"#666",marginBottom:4}}>{label}</div><div style={{fontSize:12,lineHeight:1.55,whiteSpace:"pre-line"}}>{value}</div></div>;
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
    setSelectedId((current) => current && next.some((r) => r.id === current) ? current : (next[0]?.id ?? ""));
    setLoading(false);
  }

  useEffect(() => { loadPrintableRows(); }, [company?.id]);
  const selected = rows.find((r) => r.id === selectedId);

  return (
    <div>
      <div className="no-print" style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:12,marginBottom:12}}>
        <div>
          <div style={{fontSize:11,fontWeight:800,textTransform:"uppercase",letterSpacing:".05em",color:"var(--text-dim)"}}>Documento para impressão</div>
          <div style={{fontSize:13,color:"var(--text-dim)",marginTop:3}}>Selecione o cargo. A impressão conterá somente a descrição escolhida.</div>
        </div>
        <div style={{display:"flex",gap:8,alignItems:"center"}}>
          <select value={selectedId} onChange={(e)=>setSelectedId(e.target.value)} disabled={loading || !rows.length} style={{background:"var(--panel)",border:"1px solid var(--line)",borderRadius:"var(--radius)",padding:"9px 10px",color:"var(--text)",minWidth:260}}>
            {!rows.length && <option value="">Nenhuma descrição cadastrada</option>}
            {rows.map((r)=><option key={r.id} value={r.id}>{r.title}{r.department?` · ${r.department}`:""}</option>)}
          </select>
          <button type="button" disabled={!selected} onClick={()=>window.print()} style={{background:"var(--amber)",color:"#fff",border:"none",borderRadius:"var(--radius)",padding:"9px 14px",fontWeight:700,cursor:selected?"pointer":"not-allowed",opacity:selected?1:.5}}>🖨 Imprimir cargo</button>
        </div>
      </div>

      <div className="no-print">
        <ModulePage
          table="hr_job_descriptions"
          title="Descrição de Cargos"
          subtitle="O que cada cargo faz, exige e responde — usado em recrutamento e avaliação."
          emptyLabel="Nenhum cargo descrito ainda."
          fields={[
            { key: "title", label: "Cargo", placeholder: "Ex: Analista de Logística", required: true },
            { key: "department", label: "Departamento" },
            { key: "cbo_code", label: "Código CBO", placeholder: "Ex: 4141-05" },
            { key: "summary", label: "Resumo do cargo" },
            { key: "responsibilities", label: "Responsabilidades" },
            { key: "requirements", label: "Requisitos" },
          ]}
        />
      </div>

      {selected && (
        <article className="print-document">
          <div style={{borderTop:"6px solid #2563EB",paddingTop:16,marginBottom:18}}>
            <div style={{display:"flex",justifyContent:"space-between",gap:20,alignItems:"flex-start"}}>
              <div><div style={{fontFamily:"Arial,sans-serif",fontSize:18,fontWeight:800}}>PRODOS</div><div style={{fontSize:10,color:"#555",marginTop:3}}>ProdPersonal · Gestão de Pessoas</div></div>
              <div style={{textAlign:"right"}}><div style={{fontSize:11,fontWeight:800}}>DOCUMENTO CORPORATIVO</div><div style={{fontSize:10,color:"#555",marginTop:3}}>Descrição de Cargo · {new Date().toLocaleDateString("pt-BR")}</div></div>
            </div>
          </div>
          <div style={{borderBottom:"2px solid #111",paddingBottom:12,marginBottom:18}}>
            <div style={{fontSize:10,textTransform:"uppercase",fontWeight:800,color:"#666",letterSpacing:".06em"}}>Cargo</div>
            <h1 style={{fontSize:24,margin:"4px 0 8px",fontFamily:"Arial,sans-serif"}}>{selected.title}</h1>
            <div style={{display:"flex",gap:28,fontSize:11,color:"#444"}}><span><b>Departamento:</b> {selected.department||"Não informado"}</span><span><b>CBO:</b> {selected.cbo_code||"Não informado"}</span></div>
          </div>
          <Field label="Missão / Resumo do cargo" value={selected.summary}/>
          <Field label="Responsabilidades" value={selected.responsibilities}/>
          <Field label="Requisitos" value={selected.requirements}/>
          <div style={{marginTop:30,paddingTop:12,borderTop:"1px solid #999",display:"flex",justifyContent:"space-between",fontSize:10,color:"#555"}}>
            <span>Documento gerado pelo ProdPersonal</span><span>Versão atual · {new Date().toLocaleString("pt-BR")}</span>
          </div>
        </article>
      )}
    </div>
  );
}
