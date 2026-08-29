import { useEffect, useState } from "react";
import ModulePage from "../components/ModulePage";
import { supabase } from "../lib/supabaseClient";

export default function MetasPage() {
  const [employeeOptions, setEmployeeOptions] = useState(null);

  useEffect(() => {
    supabase.from("employees").select("id, full_name").eq("status", "ativo").order("full_name").then(({ data }) => {
      setEmployeeOptions((data ?? []).map((e) => ({ value: e.id, label: e.full_name })));
    });
  }, []);

  if (!employeeOptions) return null;

  return (
    <ModulePage
      table="hr_goals"
      title="Metas e KPIs"
      subtitle="Metas individuais alinhadas com a estratégia da empresa."
      emptyLabel="Nenhuma meta cadastrada ainda."
      fields={[
        { key: "employee_id", label: "Colaborador", type: "select", options: employeeOptions, required: true },
        { key: "description", label: "Descrição da meta", placeholder: "Ex: Reduzir tempo médio de atendimento", required: true },
        { key: "target_value", label: "Valor alvo", type: "number" },
        { key: "current_value", label: "Valor atual", type: "number" },
        { key: "due_date", label: "Prazo", type: "date" },
        { key: "status", label: "Status", type: "select", options: [
          { value: "em_andamento", label: "Em andamento" },
          { value: "atingida", label: "Atingida" },
          { value: "nao_atingida", label: "Não atingida" },
        ] },
      ]}
    />
  );
}
