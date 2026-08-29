import { useEffect, useState } from "react";
import ModulePage from "../components/ModulePage";
import { supabase } from "../lib/supabaseClient";

export default function SucessaoPage() {
  const [employeeOptions, setEmployeeOptions] = useState(null);

  useEffect(() => {
    supabase.from("employees").select("id, full_name").eq("status", "ativo").order("full_name").then(({ data }) => {
      setEmployeeOptions((data ?? []).map((e) => ({ value: e.id, label: e.full_name })));
    });
  }, []);

  if (!employeeOptions) return null;

  return (
    <ModulePage
      table="hr_succession_plans"
      title="Plano de Sucessão"
      subtitle="Quem está pronto (ou em preparação) pra assumir cargos críticos."
      emptyLabel="Nenhum plano de sucessão cadastrado ainda."
      fields={[
        { key: "critical_role", label: "Cargo crítico", placeholder: "Ex: Gerente de Produção", required: true },
        { key: "successor_employee_id", label: "Sucessor(a)", type: "select", options: employeeOptions },
        { key: "readiness", label: "Prontidão", type: "select", options: [
          { value: "pronto", label: "Pronto" },
          { value: "em_desenvolvimento", label: "Em desenvolvimento" },
          { value: "a_iniciar", label: "A iniciar" },
        ] },
        { key: "notes", label: "Observações" },
      ]}
    />
  );
}
