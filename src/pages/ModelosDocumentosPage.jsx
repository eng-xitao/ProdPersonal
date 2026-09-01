import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../lib/AuthContext";
import { openPrintWindow, formatDate } from "../lib/printDocument";

const TEMPLATES = [
  {
    id: "desconto-folha",
    title: "Autorização de Desconto em Folha de Pagamento",
    description: "Colaborador autoriza a empresa a descontar um valor específico do salário.",
    needsEmployee: true,
  },
  {
    id: "responsabilidade-veiculo",
    title: "Termo de Responsabilidade por Utilização de Veículo",
    description: "Regula o uso de veículo da empresa por um colaborador.",
    needsEmployee: true,
  },
  {
    id: "avaliacao-desempenho-impressa",
    title: "Ficha de Avaliação de Desempenho (impressa)",
    description: "Formulário de 13 fatores pra preencher em papel ou aplicar em reunião presencial.",
    needsEmployee: true,
  },
];

function linhaPreenchimento(largura = 300) {
  return `<span style="display:inline-block;border-bottom:1px solid #172033;min-width:${largura}px;">&nbsp;</span>`;
}

function buildDescontoFolha(company, employee) {
  return `
    <p>Pelo presente instrumento, eu ${employee ? `<strong>${employee.full_name}</strong>` : linhaPreenchimento(320)},
    inscrito(a) no CPF sob o nº ${employee?.cpf || linhaPreenchimento(160)} e no RG nº ${employee?.rg || linhaPreenchimento(160)},
    autorizo a empresa <strong>${company?.name ?? ""}</strong>${company?.cnpj ? `, inscrita no CNPJ nº ${company.cnpj},` : ""}
    a efetuar o desconto em meu salário através da folha de pagamento, do valor abaixo especificado, conforme acordado entre as partes.</p>

    <table style="width:100%; margin-top:20px;">
      <tr><td style="width:50%;"><strong>Valor a ser descontado:</strong> R$ ${linhaPreenchimento(120)}</td><td><strong>Parcelas:</strong> ${linhaPreenchimento(120)}</td></tr>
    </table>

    <p style="margin-top:16px;"><strong>Motivo do desconto:</strong></p>
    <div style="border:1px solid #dfe4eb;border-radius:6px;min-height:70px;padding:10px;"></div>

    <p style="margin-top:30px;">${company?.municipio ?? "___________________"}, ${linhaPreenchimento(40)}/${linhaPreenchimento(40)}/${linhaPreenchimento(50)}.</p>

    <div class="signature-area">
      <div class="signature">Assinatura do(a) Colaborador(a)</div>
      <div class="signature">Assinatura do Responsável pela Empresa</div>
    </div>
  `;
}

function buildResponsabilidadeVeiculo(company, employee) {
  return `
    <p>Pelo presente Termo de Responsabilidade por Utilização de Veículo da Empresa, de um lado a empresa
    <strong>${company?.name ?? ""}</strong>${company?.cnpj ? `, inscrita no CNPJ nº ${company.cnpj},` : ""}
    doravante denominada "EMPRESA", e de outro lado ${employee ? `<strong>${employee.full_name}</strong>` : linhaPreenchimento(300)},
    admitido(a) em ${employee?.hire_date ? formatDate(employee.hire_date) : "___/___/___"}, exercendo a função de
    ${employee?.role ? `<strong>${employee.role}</strong>` : linhaPreenchimento(200)}, portador(a) da CNH nº ${linhaPreenchimento(160)},
    categoria ${linhaPreenchimento(60)}, com validade até ${linhaPreenchimento(100)}, doravante denominado(a) "FUNCIONÁRIO(A)",
    têm entre si justo e contratado o que segue:</p>

    <h3 style="margin-top:20px;">I — Do Objeto</h3>
    <p>O presente Termo regula o uso do veículo marca ${linhaPreenchimento(160)}, modelo ${linhaPreenchimento(160)},
    ano de fabricação ${linhaPreenchimento(80)}, placa ${linhaPreenchimento(120)}, chassi nº ${linhaPreenchimento(200)},
    que o FUNCIONÁRIO recebe da EMPRESA em perfeito estado de funcionamento, pra exercício de suas funções.</p>

    <h3 style="margin-top:16px;">II — Das Formas de Utilização</h3>
    <p>O uso do veículo se destina exclusivamente às atividades da função. São vedadas: utilização por terceiros,
    uso para fins particulares e concessão de carona. Os custos de abastecimento, manutenção, licenciamento, seguro
    e pedágio ficam a cargo da EMPRESA.</p>

    <h3 style="margin-top:16px;">III — Das Responsabilidades do Funcionário</h3>
    <p>O FUNCIONÁRIO compromete-se a: zelar pela conservação do veículo; comunicar imediatamente qualquer dano,
    avaria, roubo, furto ou multa; não realizar manutenção sem autorização prévia da EMPRESA; e devolver o veículo
    imediatamente em caso de rescisão do contrato de trabalho.</p>

    <p style="margin-top:12px;"><em>Em caso de danos, avarias ou multas decorrentes de má utilização, o FUNCIONÁRIO
    autoriza a EMPRESA a proceder ao desconto do valor correspondente em folha de pagamento, respeitados os limites legais.</em></p>

    <h3 style="margin-top:16px;">IV — Da Vigência</h3>
    <p>Este Termo vigora enquanto durar o vínculo empregatício e a necessidade de uso do veículo pela função,
    podendo ser revogado a qualquer tempo pela EMPRESA.</p>

    <p style="margin-top:30px;">${company?.municipio ?? "___________________"}, ${linhaPreenchimento(40)}/${linhaPreenchimento(40)}/${linhaPreenchimento(50)}.</p>

    <div class="signature-area">
      <div class="signature">Assinatura do(a) Motorista</div>
      <div class="signature">Assinatura do Responsável pela Empresa</div>
    </div>
  `;
}

const FATORES = [
  ["Qualidade do Trabalho", "Grau de exatidão, correção e clareza dos trabalhos executados."],
  ["Produtividade no Trabalho", "Quantidade de trabalho executado, comparado a colegas de função similar."],
  ["Iniciativa", "Comportamento proativo, buscando eficiência e eficácia na execução."],
  ["Presteza", "Disposição de agir prontamente no cumprimento das demandas."],
  ["Conhecimentos Específicos I", "Conhecimento pra desenvolver as atividades do próprio setor."],
  ["Conhecimentos Específicos II", "Conhecimento pra desenvolver atividades relacionadas a outros setores."],
  ["Administração do Tempo", "Observância do horário e cumprimento da carga horária."],
  ["Uso de Equipamentos e Instalações", "Cuidado e zelo com equipamentos e instalações de trabalho."],
  ["Aproveitamento de Recursos", "Melhor uso dos recursos disponíveis, buscando eficiência de processos."],
  ["Trabalho em Equipe", "Capacidade de desenvolver atividades em conjunto, buscando resultados comuns."],
  ["Assiduidade", "Comparecimento regular e permanência no local de trabalho."],
  ["Pontualidade", "Observância do horário de entrada e cumprimento da carga horária."],
  ["Disciplina", "Histórico de advertências e suspensões disciplinares."],
];

function buildAvaliacaoImpressa(company, employee) {
  const linhas = FATORES.map(([nome, desc], i) => `
    <tr>
      <td style="width:26px;text-align:center;font-weight:700;">${i + 1}</td>
      <td>
        <strong>${nome}</strong><br/>
        <span style="font-size:8pt;color:#667085;">${desc}</span>
      </td>
      ${[1, 2, 3, 4, 5].map(() => `<td style="text-align:center;">○</td>`).join("")}
    </tr>
  `).join("");

  return `
    <p style="font-size:8.8pt;color:#475467;">
      Cada nota marcada representa 1,54% do total. Somando as 13 notas (1,54% × 5 × 13 = 100%),
      chega-se ao percentual final de desempenho do colaborador.
    </p>

    <table style="margin-top:14px;">
      <thead>
        <tr>
          <th style="width:26px;">Nº</th>
          <th>Fator avaliado</th>
          <th style="text-align:center;">1</th><th style="text-align:center;">2</th>
          <th style="text-align:center;">3</th><th style="text-align:center;">4</th>
          <th style="text-align:center;">5</th>
        </tr>
      </thead>
      <tbody>${linhas}</tbody>
    </table>

    <p style="margin-top:16px;"><strong>Observações:</strong></p>
    <div style="border:1px solid #dfe4eb;border-radius:6px;min-height:80px;padding:10px;"></div>

    <div class="signature-area" style="grid-template-columns:1fr 1fr 1fr;">
      <div class="signature">Assinatura do Gestor</div>
      <div class="signature">Assinatura RH/DP</div>
      <div class="signature">Assinatura do Colaborador</div>
    </div>
  `;
}

export default function ModelosDocumentosPage() {
  const { company } = useAuth();
  const [employees, setEmployees] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [employeeId, setEmployeeId] = useState("");

  useEffect(() => {
    if (!company?.id) return;
    supabase.from("employees").select("id, full_name, cpf, rg, role, hire_date").eq("status", "ativo").order("full_name").then(({ data }) => setEmployees(data ?? []));
  }, [company?.id]);

  function generate() {
    const employee = employees.find((e) => e.id === employeeId) || null;
    let content = "";
    let title = selectedTemplate.title;

    if (selectedTemplate.id === "desconto-folha") content = buildDescontoFolha(company, employee);
    else if (selectedTemplate.id === "responsabilidade-veiculo") content = buildResponsabilidadeVeiculo(company, employee);
    else if (selectedTemplate.id === "avaliacao-desempenho-impressa") content = buildAvaliacaoImpressa(company, employee);

    openPrintWindow({
      title,
      subtitle: employee?.full_name ?? "",
      company: { name: company?.name },
      content,
      documentCode: selectedTemplate.id.toUpperCase(),
    });
  }

  return (
    <div>
      <header style={{ marginBottom: 20 }}>
        <h1 style={styles.title}>Modelos de Documentos</h1>
        <p style={styles.subtitle}>Documentos prontos pra imprimir e assinar — já preenchidos com os dados da sua empresa e do colaborador.</p>
      </header>

      <div style={styles.grid}>
        {TEMPLATES.map((t) => (
          <button key={t.id} style={{ ...styles.card, ...(selectedTemplate?.id === t.id ? styles.cardActive : {}) }} onClick={() => { setSelectedTemplate(t); setEmployeeId(""); }} type="button">
            <strong>{t.title}</strong>
            <span style={styles.dim}>{t.description}</span>
          </button>
        ))}
      </div>

      {selectedTemplate && (
        <div style={styles.panel}>
          <p style={styles.panelTitle}>{selectedTemplate.title}</p>
          {selectedTemplate.needsEmployee && (
            <select style={styles.input} value={employeeId} onChange={(e) => setEmployeeId(e.target.value)}>
              <option value="">Escolha o colaborador (opcional — pode deixar em branco pra preencher à mão)...</option>
              {employees.map((e) => <option key={e.id} value={e.id}>{e.full_name}</option>)}
            </select>
          )}
          <button style={styles.generateBtn} onClick={generate} type="button">🖨 Gerar documento</button>
        </div>
      )}
    </div>
  );
}

const styles = {
  title: { fontFamily: "var(--font-display)", fontSize: 22, margin: 0 },
  subtitle: { color: "var(--text-dim)", fontSize: 13, margin: "6px 0 0" },
  dim: { fontSize: 12.5, color: "var(--text-dim)" },
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 14, maxWidth: 900 },
  card: { textAlign: "left", background: "var(--panel)", border: "1px solid var(--line)", borderRadius: "var(--radius)", padding: 16, cursor: "pointer", display: "flex", flexDirection: "column", gap: 6 },
  cardActive: { borderColor: "var(--amber)", boxShadow: "0 0 0 1px var(--amber)" },
  panel: { marginTop: 20, background: "var(--panel)", border: "1px solid var(--line)", borderRadius: "var(--radius)", padding: 20, maxWidth: 500, display: "flex", flexDirection: "column", gap: 12 },
  panelTitle: { fontWeight: 700, fontSize: 14, margin: 0 },
  input: { background: "var(--panel-2)", border: "1px solid var(--line)", borderRadius: "var(--radius)", padding: "9px 10px", color: "var(--text)", fontSize: 13 },
  generateBtn: { background: "var(--amber)", color: "#FFFFFF", border: "none", borderRadius: "var(--radius)", padding: "10px 0", fontWeight: 700, fontSize: 13, cursor: "pointer" },
};
