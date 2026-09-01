import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../lib/AuthContext";
import { openPrintDocument, formatDate, section, infoGrid, table, kpis } from "../lib/printDocument";

const TYPE_LABEL = { gestor: "Gestor", autoavaliacao: "Autoavaliação", pares: "Pares", subordinados: "Subordinados" };
const TYPE_ORDER = ["autoavaliacao", "gestor", "pares", "subordinados"];
const SERIES_COLORS = { autoavaliacao: "#2563eb", gestor: "#d97706", pares: "#7c3aed", subordinados: "#059669" };
const STATUS_LABEL = { aberta: "Aberta", concluida: "Concluída" };
const STATUS_COLOR = { aberta: "var(--amber)", concluida: "var(--green)" };

function clampScore(value) { return Math.max(0, Math.min(10, Number(value) || 0)); }
function average(values) { return values.length ? values.reduce((a, b) => a + b, 0) / values.length : null; }

function RadarChart({ items = [], series = [], size = 460 }) {
  const n = Math.max(items.length, 3);
  const labels = items.length ? items.map(x => x.name) : ["Sem dados", "Sem dados", "Sem dados"];
  const cx = size / 2, cy = size / 2, radius = size * 0.32;
  const point = (i, r) => {
    const a = -Math.PI / 2 + (i * Math.PI * 2) / n;
    return [cx + Math.cos(a) * r, cy + Math.sin(a) * r];
  };
  const poly = r => Array.from({ length: n }, (_, i) => point(i, r).join(",")).join(" ");
  const normalizedSeries = series.filter(s => s.items?.some(x => x.score !== null && x.score !== undefined && x.score !== ""));
  const fallback = normalizedSeries.length ? normalizedSeries : [{ type: "gestor", label: "Resultado", items }];

  return <div style={styles.radarCard}>
    <div style={styles.radarHeader}>
      <div><div style={styles.chartTitle}>Mapa de competências</div><div style={styles.chartSubtitle}>Rede de competências • escala de 0 a 10</div></div>
      <div style={styles.radarScore}>{average((fallback[0]?.items || []).map(x => clampScore(x.score)).filter((_, i) => fallback[0]?.items?.[i]?.score !== null && fallback[0]?.items?.[i]?.score !== undefined)) == null ? "—" : average((fallback[0]?.items || []).map(x => clampScore(x.score)).filter((_, i) => fallback[0]?.items?.[i]?.score !== null && fallback[0]?.items?.[i]?.score !== undefined)).toFixed(1)}<small>/10</small></div>
    </div>
    <div style={{ width: "100%", maxWidth: size, margin: "0 auto" }}>
      <svg viewBox={`0 0 ${size} ${size}`} width="100%" role="img" aria-label="Gráfico de rede das competências">
        <polygon points={poly(radius)} fill="#eef8f1" stroke="#2f9e68" strokeWidth="1" />
        <polygon points={poly(radius * .7)} fill="#fff8ea" stroke="#d8a34d" strokeWidth="1" />
        <polygon points={poly(radius * .4)} fill="#fff0ee" stroke="#c9483d" strokeWidth="1" />
        {[2, 4, 6, 8, 10].map(v => <polygon key={v} points={poly(radius * v / 10)} fill="none" stroke="#dfe4eb" strokeWidth="1" />)}
        {Array.from({ length: n }, (_, i) => { const [x, y] = point(i, radius); return <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke="#cfd5dc" strokeWidth="1" />; })}
        {fallback.map((serie, si) => {
          const color = SERIES_COLORS[serie.type] || ["#2563eb", "#d97706", "#7c3aed", "#059669"][si % 4];
          const values = items.map(c => clampScore(serie.items?.find(x => x.competency_id === c.id || x.name === c.name)?.score));
          const has = serie.items?.some(x => x.score !== null && x.score !== undefined && x.score !== "");
          if (!has) return null;
          const dataPoly = values.map((v, i) => point(i, radius * v / 10).join(",")).join(" ");
          return <g key={serie.type || si}>
            <polygon points={dataPoly} fill={color} fillOpacity=".12" stroke={color} strokeWidth="2.5" strokeLinejoin="round" />
            {values.map((v, i) => { const [x, y] = point(i, radius * v / 10); return <circle key={i} cx={x} cy={y} r="4" fill={color} stroke="#fff" strokeWidth="2" />; })}
          </g>;
        })}
        {labels.map((label, i) => { const [x, y] = point(i, radius + 30); const a = -Math.PI / 2 + (i * Math.PI * 2) / n; const anchor = Math.cos(a) > .25 ? "start" : Math.cos(a) < -.25 ? "end" : "middle"; return <text key={i} x={x} y={y} textAnchor={anchor} dominantBaseline="middle" fontSize={size < 400 ? "9" : "11"} fontWeight="600" fill="#344054">{String(label).slice(0, 25)}</text>; })}
        {[2, 4, 6, 8, 10].map(v => <text key={`r${v}`} x={cx + 4} y={cy - radius * v / 10} fontSize="8" fill="#98a2b3">{v}</text>)}
      </svg>
    </div>
    <div style={styles.zoneLegend}><span><i style={{ background: "#c9483d" }} />0–4 Atenção</span><span><i style={{ background: "#d8a34d" }} />4–7 Desenvolvimento</span><span><i style={{ background: "#2f9e68" }} />7–10 Forte</span></div>
    <div style={styles.seriesLegend}>{fallback.map(s => <span key={s.type}><i style={{ background: SERIES_COLORS[s.type] || "#344054" }} />{s.label || TYPE_LABEL[s.type] || "Resultado"}</span>)}</div>
    <div style={styles.chartLegend}>Quanto mais distante do centro, maior o resultado. Em avaliações 360°, as redes permitem comparar as diferentes fontes.</div>
  </div>;
}

function radarSvg(items = [], series = [], width = 560, height = 430) {
  const n = Math.max(items.length, 3), cx = width / 2, cy = height / 2, radius = Math.min(width, height) * .31;
  const point = (i, r) => { const a = -Math.PI / 2 + i * Math.PI * 2 / n; return [cx + Math.cos(a) * r, cy + Math.sin(a) * r]; };
  const poly = r => Array.from({ length: n }, (_, i) => point(i, r).join(",")).join(" ");
  const active = series.filter(s => s.items?.some(x => x.score !== null && x.score !== undefined && x.score !== ""));
  const useSeries = active.length ? active : [{ type: "gestor", label: "Resultado", items }];
  const labels = items.map(x => String(x.name || "").slice(0, 28));
  const avg = average((useSeries[0].items || []).map(x => clampScore(x.score)).filter((_, i) => useSeries[0].items?.[i]?.score !== null && useSeries[0].items?.[i]?.score !== undefined));
  const polygons = useSeries.map((serie, si) => {
    const color = SERIES_COLORS[serie.type] || ["#2563eb", "#d97706", "#7c3aed", "#059669"][si % 4];
    const values = items.map(c => clampScore(serie.items?.find(x => x.competency_id === c.id || x.name === c.name)?.score));
    const data = values.map((v, i) => point(i, radius * v / 10).join(",")).join(" ");
    return `<polygon points="${data}" fill="${color}" fill-opacity=".12" stroke="${color}" stroke-width="2.5" stroke-linejoin="round"/>${values.map((v,i)=>{const [x,y]=point(i,radius*v/10);return `<circle cx="${x}" cy="${y}" r="4" fill="${color}" stroke="#fff" stroke-width="2"/>`;}).join("")}`;
  }).join("");
  return `<div class="chart-wrap"><div class="chart-title">Mapa de competências — rede / teia</div><div style="text-align:center;font-size:18pt;font-weight:700;margin:4px 0 8px">${avg == null ? "—" : avg.toFixed(1)}<span style="font-size:9pt;color:#667085"> / 10</span></div><svg viewBox="0 0 ${width} ${height}" width="100%" height="auto"><polygon points="${poly(radius)}" fill="#eef8f1" stroke="#2f9e68" stroke-width="1"/><polygon points="${poly(radius*.7)}" fill="#fff8ea" stroke="#d8a34d" stroke-width="1"/><polygon points="${poly(radius*.4)}" fill="#fff0ee" stroke="#c9483d" stroke-width="1"/>${[2,4,6,8,10].map(v=>`<polygon points="${poly(radius*v/10)}" fill="none" stroke="#dfe4eb" stroke-width="1"/>`).join("")}${Array.from({length:n},(_,i)=>{const [x,y]=point(i,radius);return `<line x1="${cx}" y1="${cy}" x2="${x}" y2="${y}" stroke="#cfd5dc" stroke-width="1"/>`;}).join("")}${polygons}${labels.map((l,i)=>{const [x,y]=point(i,radius+30);const a=-Math.PI/2+i*Math.PI*2/n;const anchor=Math.cos(a)>.25?"start":Math.cos(a)<-.25?"end":"middle";return `<text x="${x}" y="${y}" text-anchor="${anchor}" dominant-baseline="middle" font-size="10" font-weight="600" fill="#344054">${escapeHtml(l)}</text>`;}).join("")}</svg><div style="font-size:8pt;color:#667085;margin-top:5px;text-align:center">0–4 Atenção • 4–7 Desenvolvimento • 7–10 Forte</div><div style="font-size:8pt;color:#667085;margin-top:4px;text-align:center">${useSeries.map(s=>`<span style="margin-right:12px"><b style="color:${SERIES_COLORS[s.type]||"#344054"}">●</b> ${escapeHtml(s.label||TYPE_LABEL[s.type]||"Resultado")}</span>`).join("")}</div></div>`;
}
function escapeHtml(value) { return String(value ?? "").replace(/[&<>\"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;" }[c])); }

export default function AvaliacoesPage() {
  const { company, profile } = useAuth();
  const [employees, setEmployees] = useState([]), [competencies, setCompetencies] = useState([]), [evaluations, setEvaluations] = useState([]);
  const [loading, setLoading] = useState(true), [error, setError] = useState(""), [employeeId, setEmployeeId] = useState(""), [cycleName, setCycleName] = useState(""), [evaluationType, setEvaluationType] = useState("gestor"), [saving, setSaving] = useState(false), [expandedId, setExpandedId] = useState(null), [scores, setScores] = useState({}), [printingId, setPrintingId] = useState(null), [comparisonSeries, setComparisonSeries] = useState([]);

  async function loadAll() {
    setLoading(true); setError("");
    try {
      const [{ data: emp, error: e1 }, { data: comp, error: e2 }, { data: ev, error: e3 }] = await Promise.all([
        supabase.from("employees").select("id, full_name, role").eq("status", "ativo").order("full_name"),
        supabase.from("hr_competencies").select("id, name, category").order("name"),
        supabase.from("hr_performance_evaluations").select("id, employee_id, cycle_name, evaluation_type, status, overall_score, created_at, employees:employee_id (full_name, role)").eq("company_id", company.id).order("created_at", { ascending: false }).limit(100)
      ]);
      const firstError = e1 || e2 || e3; if (firstError) throw firstError;
      setEmployees(emp ?? []); setCompetencies(comp ?? []); setEvaluations(ev ?? []);
    } catch (err) { setError("Não foi possível carregar: " + (err.message ?? "erro desconhecido")); } finally { setLoading(false); }
  }
  useEffect(() => { if (company?.id) loadAll(); }, [company?.id]);

  async function createEvaluation(e) {
    e.preventDefault(); setError(""); if (!employeeId || !cycleName) { setError("Escolha o colaborador e dê um nome ao ciclo."); return; }
    setSaving(true);
    const { error: insertError } = await supabase.from("hr_performance_evaluations").insert({ company_id: company.id, employee_id: employeeId, cycle_name: cycleName, evaluation_type: evaluationType, evaluator_profile_id: profile.id });
    if (insertError) { setError(insertError.message); setSaving(false); return; }
    setEmployeeId(""); setCycleName(""); setSaving(false); await loadAll();
  }

  async function loadScores(evaluationId) {
    const { data, error: scoreError } = await supabase.from("hr_evaluation_scores").select("id, evaluation_id, competency_id, score, comments").eq("evaluation_id", evaluationId);
    if (scoreError) setError(scoreError.message);
    const map = {}; (data ?? []).forEach(s => { map[s.competency_id] = s; }); setScores(map); return map;
  }

  async function loadComparison(evaluation) {
    const sameCycle = evaluations.filter(e => e.employee_id === evaluation.employee_id && e.cycle_name === evaluation.cycle_name);
    if (!sameCycle.length) { setComparisonSeries([]); return; }
    const ids = sameCycle.map(e => e.id);
    const { data, error: scoreError } = await supabase.from("hr_evaluation_scores").select("evaluation_id, competency_id, score").in("evaluation_id", ids);
    if (scoreError) { setError(scoreError.message); return; }
    const grouped = TYPE_ORDER.map(type => {
      const ev = sameCycle.find(e => e.evaluation_type === type);
      if (!ev) return null;
      const rows = (data ?? []).filter(s => s.evaluation_id === ev.id);
      return { type, label: TYPE_LABEL[type], evaluationId: ev.id, items: competencies.map(c => ({ ...c, competency_id: c.id, score: rows.find(s => s.competency_id === c.id)?.score })) };
    }).filter(Boolean);
    setComparisonSeries(grouped);
  }

  async function toggleExpand(evaluation) {
    if (expandedId === evaluation.id) { setExpandedId(null); setComparisonSeries([]); return; }
    setExpandedId(evaluation.id);
    await loadScores(evaluation.id);
    await loadComparison(evaluation);
  }

  async function saveScore(evaluationId, competencyId, value) {
    const existing = scores[competencyId];
    if (existing) await supabase.from("hr_evaluation_scores").update({ score: Number(value) }).eq("id", existing.id);
    else await supabase.from("hr_evaluation_scores").insert({ company_id: company.id, evaluation_id: evaluationId, competency_id: competencyId, score: Number(value) });
    const next = await loadScores(evaluationId);
    const current = evaluations.find(e => e.id === evaluationId);
    if (current) await loadComparison(current);
    return next;
  }

  async function concludeEvaluation(evaluationId) {
    const evalScores = Object.values(scores).filter(s => s.score !== null && s.score !== undefined && s.score !== "");
    const scoreAverage = average(evalScores.map(s => Number(s.score)));
    await supabase.from("hr_performance_evaluations").update({ status: "concluida", overall_score: scoreAverage }).eq("id", evaluationId);
    setExpandedId(null); setComparisonSeries([]); await loadAll();
  }

  async function printEvaluation(evaluation) {
    if (printingId) return; setPrintingId(evaluation.id); setError("");
    try {
      const sameCycle = evaluations.filter(e => e.employee_id === evaluation.employee_id && e.cycle_name === evaluation.cycle_name);
      const allIds = sameCycle.length ? sameCycle.map(e => e.id) : [evaluation.id];
      const { data: scoreRows, error: scoreError } = await supabase.from("hr_evaluation_scores").select("id, evaluation_id, competency_id, score, comments").in("evaluation_id", allIds);
      if (scoreError) throw scoreError;
      const currentRows = (scoreRows ?? []).filter(s => s.evaluation_id === evaluation.id);
      const scoreMap = {}; currentRows.forEach(s => { scoreMap[s.competency_id] = s; });
      const employee = evaluation.employees ?? {};
      const scored = competencies.map(c => ({ ...c, competency_id: c.id, score: scoreMap[c.id]?.score, comments: scoreMap[c.id]?.comments }));
      const answered = scored.filter(c => c.score !== null && c.score !== undefined && c.score !== "");
      const printSeries = TYPE_ORDER.map(type => {
        const ev = sameCycle.find(e => e.evaluation_type === type);
        if (!ev) return null;
        const rows = (scoreRows ?? []).filter(s => s.evaluation_id === ev.id);
        return { type, label: TYPE_LABEL[type], items: competencies.map(c => ({ ...c, competency_id: c.id, score: rows.find(s => s.competency_id === c.id)?.score })) };
      }).filter(Boolean);
      if (!printSeries.length) printSeries.push({ type: evaluation.evaluation_type, label: TYPE_LABEL[evaluation.evaluation_type] || "Resultado", items: scored });
      const scoreAverage = average(answered.map(c => Number(c.score)));
      const competencyRows = scored.length ? scored.map(c => [c.name, c.category || "—", c.score ?? "Não avaliada", c.comments || "—"]) : [["Nenhuma competência cadastrada", "—", "—", "—"]];
      const content = [
        infoGrid([{ label: "Colaborador", value: employee.full_name || "Não informado" }, { label: "Cargo", value: employee.role || "Não informado" }, { label: "Ciclo", value: evaluation.cycle_name || "Não informado" }, { label: "Tipo", value: TYPE_LABEL[evaluation.evaluation_type] || evaluation.evaluation_type || "—" }, { label: "Status", value: STATUS_LABEL[evaluation.status] || evaluation.status || "—" }, { label: "Data de criação", value: formatDate(evaluation.created_at) }]),
        section("Resultado geral", kpis([{ label: "Nota final", value: scoreAverage == null ? "—" : scoreAverage.toFixed(1) }, { label: "Competências avaliadas", value: `${answered.length}/${scored.length}` }, { label: "Tipo de avaliação", value: TYPE_LABEL[evaluation.evaluation_type] || "—" }, { label: "Situação", value: STATUS_LABEL[evaluation.status] || "—" }])),
        section("Mapa de competências", radarSvg(competencies, printSeries)),
        section("Competências e resultados", table(["Competência", "Categoria", "Nota", "Comentários"], competencyRows)),
        section("Observações", `<div class="highlight note">O mapa de competências usa a mesma escala e as mesmas notas apresentadas na tela. Quando existem avaliações 360° no mesmo ciclo, as fontes são comparadas na mesma rede.</div>`),
        `<div class="signature-area"><div><div class="signature">Colaborador</div></div><div><div class="signature">Avaliador / Gestor</div></div></div>`
      ].join("");
      openPrintDocument({ title: "Avaliação de Desempenho", subtitle: `${employee.full_name || "Colaborador"} • ${evaluation.cycle_name || "Ciclo"}`, company, content, documentCode: `AV-${String(evaluation.id).slice(0, 8).toUpperCase()}` });
    } catch (err) { setError("Não foi possível gerar a avaliação completa: " + (err.message ?? "erro desconhecido")); } finally { setPrintingId(null); }
  }

  const liveItems = useMemo(() => competencies.map(c => ({ ...c, competency_id: c.id, score: scores[c.id]?.score })).filter(c => c.score !== null && c.score !== undefined && c.score !== ""), [competencies, scores]);
  const visibleSeries = comparisonSeries.length ? comparisonSeries : [{ type: "gestor", label: TYPE_LABEL.gestor, items: liveItems }];

  return <div>
    <header style={{ marginBottom: 20 }}><h1 style={styles.title}>Avaliação de Desempenho</h1><p style={styles.subtitle}>Crie o ciclo, avalie por competência de 0 a 10, e conclua quando terminar.</p></header>
    {error && <div style={styles.error}>{error}</div>}
    <form onSubmit={createEvaluation} style={styles.form}><p style={styles.formTitle}>Nova avaliação</p><div style={styles.row}>
      <select style={styles.input} value={employeeId} onChange={e => setEmployeeId(e.target.value)} required><option value="">Colaborador...</option>{employees.map(e => <option key={e.id} value={e.id}>{e.full_name} — {e.role}</option>)}</select>
      <input style={styles.input} placeholder="Nome do ciclo (ex: 2026 - 1º semestre)" value={cycleName} onChange={e => setCycleName(e.target.value)} required />
      <select style={styles.input} value={evaluationType} onChange={e => setEvaluationType(e.target.value)}>{Object.entries(TYPE_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
    </div><button style={styles.saveBtn} type="submit" disabled={saving}>{saving ? "Criando..." : "Criar avaliação"}</button></form>
    {loading ? <p style={styles.dim}>Carregando...</p> : evaluations.length === 0 ? <p style={styles.dim}>Nenhuma avaliação criada ainda.</p> : <div style={styles.list}>{evaluations.map(ev => <div key={ev.id} style={styles.card}>
      <div style={styles.cardHeader}><div><strong>{ev.employees?.full_name}</strong><span style={styles.dim}> · {ev.cycle_name} · {TYPE_LABEL[ev.evaluation_type]}</span></div><span style={{ ...styles.statusBadge, color: STATUS_COLOR[ev.status] }}>{STATUS_LABEL[ev.status]}{ev.overall_score != null && ` — ${Number(ev.overall_score).toFixed(1)}`}</span></div>
      <div style={styles.actionsRow}><button style={styles.expandBtn} onClick={() => toggleExpand(ev)} type="button">{expandedId === ev.id ? "Fechar" : "Avaliar competências"}</button><button style={styles.printBtn} onClick={() => printEvaluation(ev)} type="button" disabled={printingId === ev.id}>{printingId === ev.id ? "Gerando..." : "🖨 Imprimir avaliação completa"}</button></div>
      {expandedId === ev.id && <div style={styles.detailsBox}>
        {competencies.length === 0 ? <p style={styles.dim}>Cadastre competências primeiro, em Competências.</p> : <><div style={styles.evaluationVisual}><RadarChart items={competencies} series={visibleSeries} size={460} /></div><div style={styles.competencyGrid}>{competencies.map(c => <div key={c.id} style={styles.competencyRow}><span style={styles.competencyName}>{c.name}<small style={styles.category}>{c.category || ""}</small></span><select style={styles.scoreSelect} value={scores[c.id]?.score ?? ""} onChange={e => saveScore(ev.id, c.id, e.target.value)} disabled={ev.status === "concluida"}><option value="">—</option>{[0,1,2,3,4,5,6,7,8,9,10].map(n => <option key={n} value={n}>{n}</option>)}</select></div>)}</div></>}
        {ev.status !== "concluida" && <button style={styles.concludeBtn} onClick={() => concludeEvaluation(ev.id)} type="button">Concluir avaliação</button>}
      </div>}
    </div>)}</div>}
  </div>;
}

const styles = {
  title: { fontFamily: "var(--font-display)", fontSize: 22, margin: 0 }, subtitle: { color: "var(--text-dim)", fontSize: 13, margin: "6px 0 0" }, dim: { color: "var(--text-dim)", fontSize: 12.5 },
  form: { display: "flex", flexDirection: "column", gap: 12, background: "var(--panel)", border: "1px solid var(--line)", borderRadius: "var(--radius)", padding: 20, marginBottom: 28, maxWidth: 920 }, formTitle: { fontSize: 13, fontWeight: 700, color: "var(--text-dim)", textTransform: "uppercase", letterSpacing: ".04em", margin: "0 0 4px" }, row: { display: "flex", gap: 10, flexWrap: "wrap" }, input: { flex: 1, minWidth: 150, background: "var(--panel-2)", border: "1px solid var(--line)", borderRadius: "var(--radius)", padding: "9px 10px", color: "var(--text)", fontSize: 13 }, saveBtn: { background: "var(--amber)", color: "#fff", border: "none", borderRadius: "var(--radius)", padding: "10px 16px", fontWeight: 700, fontSize: 13, cursor: "pointer" },
  list: { display: "flex", flexDirection: "column", gap: 12, maxWidth: 920 }, card: { background: "var(--panel)", border: "1px solid var(--line)", borderRadius: "var(--radius)", padding: 16 }, cardHeader: { display: "flex", justifyContent: "space-between", marginBottom: 4, flexWrap: "wrap", gap: 6 }, actionsRow: { display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }, statusBadge: { fontSize: 12, fontWeight: 700, whiteSpace: "nowrap" }, expandBtn: { background: "var(--panel-2)", border: "1px solid var(--line)", color: "var(--text)", borderRadius: "var(--radius)", padding: "7px 14px", fontSize: 12, fontWeight: 650, cursor: "pointer" }, printBtn: { background: "var(--ink)", border: "1px solid var(--ink)", color: "#fff", borderRadius: "var(--radius)", padding: "7px 14px", fontSize: 12, fontWeight: 700, cursor: "pointer" }, detailsBox: { marginTop: 12, paddingTop: 12, borderTop: "1px solid var(--line)" }, evaluationVisual: { display: "flex", justifyContent: "center", marginBottom: 16 }, radarCard: { width: "100%", maxWidth: 680, background: "var(--panel-2)", border: "1px solid var(--line)", borderRadius: 12, padding: "16px 16px 12px" }, radarHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, marginBottom: 2 }, chartTitle: { fontSize: 14, fontWeight: 800 }, chartSubtitle: { fontSize: 11, color: "var(--text-dim)", marginTop: 2 }, radarScore: { fontSize: 24, fontWeight: 800, color: "var(--amber)", whiteSpace: "nowrap" }, zoneLegend: { display: "flex", justifyContent: "center", gap: 12, flexWrap: "wrap", fontSize: 10.5, color: "var(--text-dim)", marginTop: -4 }, seriesLegend: { display: "flex", justifyContent: "center", gap: 14, flexWrap: "wrap", fontSize: 10.5, color: "var(--text-dim)", marginTop: 7 }, competencyGrid: { display: "flex", flexDirection: "column", gap: 8, marginBottom: 12 }, competencyRow: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, padding: "8px 0", borderBottom: "1px solid var(--line)" }, competencyName: { fontSize: 13, display: "flex", flexDirection: "column", gap: 2 }, category: { fontSize: 10, color: "var(--text-dim)", fontWeight: 400 }, scoreSelect: { background: "var(--panel-2)", border: "1px solid var(--line)", borderRadius: "var(--radius)", padding: "5px 10px", color: "var(--text)", fontSize: 13, width: 70 }, concludeBtn: { background: "var(--green)", color: "#fff", border: "none", borderRadius: "var(--radius)", padding: "9px 18px", fontWeight: 700, fontSize: 12.5, cursor: "pointer" }, chartLegend: { fontSize: 10.5, color: "var(--text-dim)", textAlign: "center", marginTop: 7 }, error: { background: "rgba(217,105,95,.12)", border: "1px solid var(--red)", color: "var(--red)", borderRadius: "var(--radius)", padding: "10px 12px", fontSize: 13, marginBottom: 16, maxWidth: 920 }
};
