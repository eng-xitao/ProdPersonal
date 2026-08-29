import { useEffect, useState } from "react";
import ModulePage from "../components/ModulePage";
import { supabase } from "../lib/supabaseClient";

export default function RemuneracaoPage() {
  const [employeeOptions, setEmployeeOptions] = useState(null);

  useEffect(() => {
    supabase.from("employees").select("id, full_name").eq("status", "ativo").order("full_name").then(({ data }) => {
      setEmployeeOptions((data ?? []).map((e) => ({ value: e.id, label: e.full_name })));
    });
  }, []);

  if (!employeeOptions) return null;

  return (
    <ModulePage
      table="hr_employee_compensation"
      title="Remuneração"
      subtitle="Salário base de cada colaborador — a folha de pagamento usa esse valor."
      emptyLabel="Nenhuma remuneração cadastrada ainda."
      fields={[
        { key: "employee_id", label: "Colaborador", type: "select", options: employeeOptions, required: true },
        { key: "base_salary", label: "Salário base (R$)", type: "currency", required: true },
        { key: "dependents_count", label: "Nº de dependentes (IRRF)", type: "number" },
        { key: "effective_date", label: "Vigente desde", type: "date" },
      ]}
    />
  );
}
