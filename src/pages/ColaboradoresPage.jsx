import ModulePage from "../components/ModulePage";

const CONTRACT_OPTIONS = [
  { value: "clt", label: "CLT" },
  { value: "pj", label: "PJ" },
  { value: "estagio", label: "Estágio" },
  { value: "temporario", label: "Temporário" },
  { value: "terceirizado", label: "Terceirizado" },
];

export default function ColaboradoresPage() {
  return (
    <ModulePage
      table="employees"
      title="Colaboradores"
      subtitle="O cadastro base — todas as outras telas (avaliação, folha, férias, rescisão) usam esses dados."
      emptyLabel="Nenhum colaborador cadastrado ainda."
      statusField={{ key: "status", activeValue: "ativo", inactiveValue: "inativo", trueLabel: "Ativo", falseLabel: "Inativo" }}
      fields={[
        { key: "full_name", label: "Nome completo", required: true },
        { key: "role", label: "Cargo" },
        { key: "hire_date", label: "Data de admissão", type: "date" },
        { key: "contract_type", label: "Tipo de contrato", type: "select", options: CONTRACT_OPTIONS },
        { key: "cpf", label: "CPF" },
        { key: "rg", label: "RG" },
        { key: "pis", label: "PIS/PASEP" },
        { key: "ctps", label: "CTPS (número/série)" },
        { key: "birth_date", label: "Data de nascimento", type: "date" },
        { key: "email", label: "E-mail" },
        { key: "phone", label: "Telefone" },
        { key: "address", label: "Endereço" },
        { key: "base_salary", label: "Salário base (R$)", type: "currency" },
        { key: "dependents_count", label: "Nº de dependentes (IRRF)", type: "number" },
        { key: "bank_name", label: "Banco" },
        { key: "bank_agency", label: "Agência" },
        { key: "bank_account", label: "Conta" },
      ]}
    />
  );
}
