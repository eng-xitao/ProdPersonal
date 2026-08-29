import ModulePage from "../components/ModulePage";

export default function ConfigIrrfPage() {
  return (
    <ModulePage
      table="hr_irrf_brackets"
      title="Tabela de IRRF"
      subtitle="Faixas do imposto de renda retido na fonte — mudam todo ano. Confira com seu contador antes de usar em folha real."
      emptyLabel="Nenhuma faixa cadastrada ainda."
      fields={[
        { key: "valid_from", label: "Válida a partir de", type: "date", required: true },
        { key: "min_base", label: "Base mínima (R$)", type: "currency", required: true },
        { key: "max_base", label: "Base máxima (R$)", type: "currency", placeholder: "Vazio = sem teto" },
        { key: "rate_percent", label: "Alíquota (%)", type: "number", required: true },
        { key: "deduction", label: "Parcela a deduzir (R$)", type: "currency" },
        { key: "dependent_deduction", label: "Dedução por dependente (R$)", type: "currency" },
      ]}
    />
  );
}
