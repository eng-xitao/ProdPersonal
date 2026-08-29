import { useEffect, useState } from "react";
import ModulePage from "../components/ModulePage";
import { supabase } from "../lib/supabaseClient";

export default function PdiPage() {
  const [employeeOptions, setEmployeeOptions] = useState(null);

  useEffect(() => {
    supabase.from("employees").select("id, full_name").eq("status", "ativo").order("full_name").then(({ data }) => {
      setEmployeeOptions((data ?? []).map((e) => ({ value: e.id, label: e.full_name })));
    });
  }, []);

  if (!employeeOptions) return null;

  return (
    <ModulePage
      table="hr_pdi"
      title="PDI"
      subtitle="Plano de Desenvolvimento Individual — ações concretas pra cada colaborador evoluir."
      emptyLabel="Nenhum PDI cadastrado ainda."
      statusField={{ key: "status", activeValue: "concluido", inactiveValue: "pendente", trueLabel: "Concluído", falseLabel: "Pendente" }}
      fields={[
        { key: "employee_id", label: "Colaborador", type: "select", options: employeeOptions, required: true },
        { key: "action_description", label: "Ação de desenvolvimento", placeholder: "Ex: Curso de liderança, mentoria com gestor", required: true },
        { key: "target_date", label: "Prazo", type: "date" },
      ]}
    />
  );
}
