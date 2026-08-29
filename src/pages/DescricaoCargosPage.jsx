import ModulePage from "../components/ModulePage";

export default function DescricaoCargosPage() {
  return (
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
  );
}
