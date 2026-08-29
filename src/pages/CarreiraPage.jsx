import { useEffect, useState } from "react";
import ModulePage from "../components/ModulePage";
import { supabase } from "../lib/supabaseClient";

export default function CarreiraPage() {
  const [employeeOptions, setEmployeeOptions] = useState(null);

  useEffect(() => {
    supabase.from("employees").select("id, full_name").eq("status", "ativo").order("full_name").then(({ data }) => {
      setEmployeeOptions((data ?? []).map((e) => ({ value: e.id, label: e.full_name })));
    });
  }, []);

  if (!employeeOptions) return null;

  return (
    <ModulePage
      table="hr_career_plans"
      title="Plano de Carreira"
      subtitle="Pra onde cada colaborador pode crescer dentro da empresa."
      emptyLabel="Nenhum plano de carreira cadastrado ainda."
      fields={[
        { key: "employee_id", label: "Colaborador", type: "select", options: employeeOptions, required: true },
        { key: "current_role_title", label: "Cargo atual" },
        { key: "target_role_title", label: "Cargo alvo" },
        { key: "notes", label: "Observações" },
      ]}
    />
  );
}
