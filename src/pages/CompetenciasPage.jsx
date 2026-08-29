import ModulePage from "../components/ModulePage";

export default function CompetenciasPage() {
  return (
    <ModulePage
      table="hr_competencies"
      title="Competências"
      subtitle="O catálogo usado nas avaliações de desempenho e nos perfis de cargo."
      emptyLabel="Nenhuma competência cadastrada ainda."
      fields={[
        { key: "name", label: "Nome", placeholder: "Ex: Comunicação, Liderança, Trabalho em equipe", required: true },
        { key: "category", label: "Categoria", placeholder: "Ex: Comportamental, Técnica" },
        { key: "description", label: "Descrição" },
      ]}
    />
  );
}
