import ModulePage from "../components/ModulePage";

export default function ConfigInssPage() {
  return (
    <ModulePage
      table="hr_inss_brackets"
      title="Tabela de INSS"
      subtitle="Faixas de contribuição — mudam todo ano por decreto do governo. Confira com seu contador antes de usar em folha real."
      emptyLabel="Nenhuma faixa cadastrada ainda."
      fields={[
        { key: "valid_from", label: "Válida a partir de", type: "date", required: true },
        { key: "min_salary", label: "Salário mínimo da faixa (R$)", type: "currency", required: true },
        { key: "max_salary", label: "Salário máximo da faixa (R$)", type: "currency", placeholder: "Vazio = sem teto" },
        { key: "rate_percent", label: "Alíquota (%)", type: "number", required: true },
        { key: "deduction", label: "Parcela a deduzir (R$)", type: "currency" },
      ]}
    />
  );
}
