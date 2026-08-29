/**
 * Cálculos trabalhistas (CLT). Todas as tabelas de INSS/IRRF vêm do
 * banco (configuráveis, porque mudam todo ano por decreto) — nada
 * fica fixo aqui. Isso é um motor de cálculo, não substitui revisão
 * de um contador antes de rodar folha real.
 */

// INSS: progressivo, soma cada pedaço do salário na faixa correspondente.
export function calcularINSS(salario, brackets) {
  if (!brackets || brackets.length === 0) return 0;
  const sorted = [...brackets].sort((a, b) => a.min_salary - b.min_salary);
  let total = 0;
  for (const b of sorted) {
    const inicio = b.min_salary;
    const fim = b.max_salary != null ? b.max_salary : salario;
    if (salario <= inicio) continue;
    const valorNaFaixa = Math.min(salario, fim) - inicio;
    if (valorNaFaixa > 0) total += valorNaFaixa * (b.rate_percent / 100);
  }
  return round2(total);
}

// IRRF: base de cálculo já descontada do INSS e dos dependentes,
// aplicando a faixa correspondente com parcela a deduzir.
export function calcularIRRF(baseCalculo, dependentesCount, brackets) {
  if (!brackets || brackets.length === 0) return 0;
  const sorted = [...brackets].sort((a, b) => a.min_base - b.min_base);
  const faixa = sorted.find((b) => baseCalculo >= b.min_base && (b.max_base == null || baseCalculo <= b.max_base));
  if (!faixa || faixa.rate_percent === 0) return 0;

  const deducaoDependentes = dependentesCount * (faixa.dependent_deduction ?? 0);
  const baseAjustada = Math.max(0, baseCalculo - deducaoDependentes);
  const valor = baseAjustada * (faixa.rate_percent / 100) - faixa.deduction;
  return round2(Math.max(0, valor));
}

// FGTS: 8% do salário bruto, depositado pelo empregador (não
// desconta do funcionário).
export function calcularFGTS(salarioBruto) {
  return round2(salarioBruto * 0.08);
}

// Férias: salário proporcional aos dias de gozo + 1/3
// constitucional. Dias vendidos (abono pecuniário) pagos à parte.
export function calcularFerias(salarioMensal, diasGozo = 30, diasVendidos = 0) {
  const salarioDiario = salarioMensal / 30;
  const valorGozo = salarioDiario * diasGozo;
  const tercoConstitucional = valorGozo / 3;
  const valorVendido = diasVendidos > 0 ? salarioDiario * diasVendidos * (4 / 3) : 0;
  return {
    valorFerias: round2(valorGozo),
    tercoConstitucional: round2(tercoConstitucional),
    valorAbonoPecuniario: round2(valorVendido),
    total: round2(valorGozo + tercoConstitucional + valorVendido),
  };
}

// 13º salário proporcional: 1/12 do salário por mês trabalhado
// (mês com 15+ dias trabalhados conta como mês cheio).
export function calcular13oProporcional(salarioMensal, mesesTrabalhados) {
  const meses = Math.min(12, Math.max(0, mesesTrabalhados));
  return round2((salarioMensal / 12) * meses);
}

// Rescisão: monta todas as verbas de acordo com o tipo de
// desligamento. Isso é a parte mais sensível — cada tipo tem regras
// diferentes de aviso prévio, multa de FGTS e o que é devido.
export function calcularRescisao({ tipo, salario, dataAdmissao, dataDesligamento, avisoTrabalhado, saldoFgts = 0 }) {
  const admissao = new Date(dataAdmissao);
  const desligamento = new Date(dataDesligamento);
  const mesesTrabalhados = diferencaEmMeses(admissao, desligamento);
  const diasNoMes = desligamento.getDate();
  const salarioDiario = salario / 30;

  const saldoSalario = round2(salarioDiario * diasNoMes);

  // Aviso prévio: 30 dias + 3 dias por ano trabalhado (até 90 dias),
  // só quando a empresa dispensa sem justa causa (ou em acordo).
  const anosTrabalhados = Math.floor(mesesTrabalhados / 12);
  const diasAviso = tipo === "sem_justa_causa" || tipo === "acordo" ? Math.min(90, 30 + anosTrabalhados * 3) : 0;
  const avisoPrevio = diasAviso > 0 && !avisoTrabalhado ? round2(salarioDiario * diasAviso) : 0;

  // Férias vencidas: precisa cruzar com hr_vacations pra saber se
  // há período vencido não gozado — não calculado automaticamente
  // aqui, fica como ajuste manual na tela.
  const feriasVencidas = 0;

  // Férias proporcionais: meses trabalhados desde o último período
  // aquisitivo completo.
  const mesesProporcionais = mesesTrabalhados % 12;
  const feriasCalc = calcularFerias(salario, 30, 0);
  const feriasProporcionais = round2((feriasCalc.total / 12) * mesesProporcionais);

  // 13º proporcional do ano corrente.
  const mesesNoAno = desligamento.getMonth() + 1;
  const decimoProporcional = calcular13oProporcional(salario, mesesNoAno);

  // Multa de FGTS: 40% sobre o saldo em dispensa sem justa causa;
  // 20% em acordo (rescisão consensual, Reforma Trabalhista).
  let multaFgts = 0;
  if (tipo === "sem_justa_causa") multaFgts = round2(saldoFgts * 0.4);
  else if (tipo === "acordo") multaFgts = round2(saldoFgts * 0.2);

  const total = round2(saldoSalario + avisoPrevio + feriasVencidas + feriasProporcionais + decimoProporcional + multaFgts);

  return {
    mesesTrabalhados,
    saldoSalario,
    avisoPrevio,
    diasAviso,
    feriasVencidas,
    feriasProporcionais,
    decimoTerceiroProporcional: decimoProporcional,
    multaFgts,
    total,
  };
}

function diferencaEmMeses(inicio, fim) {
  return (fim.getFullYear() - inicio.getFullYear()) * 12 + (fim.getMonth() - inicio.getMonth());
}

function round2(n) {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}
