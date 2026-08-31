import ModulePage from "../components/ModulePage";

export default function DescricaoCargosPage() {
  return (
    <div>
      <div className="no-print" style={{display:"flex",justifyContent:"flex-end",marginBottom:8}}>
        <button type="button" onClick={()=>window.print()} style={{background:"var(--panel)",color:"var(--text)",border:"1px solid var(--line)",borderRadius:"var(--radius)",padding:"9px 14px",fontWeight:700,cursor:"pointer"}}>🖨 Imprimir Descrição de Cargo</button>
      </div>
      <div className="print-only" style={{borderBottom:"2px solid #000",paddingBottom:10,marginBottom:16,fontSize:12}}><b>PRODOS</b> · ProdPersonal · DESCRIÇÃO DE CARGO · {new Date().toLocaleDateString("pt-BR")}</div>
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
  );
}
