import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";

/**
 * Motor central de impressão administrativa do ProdPersonal.
 * Mantém compatibilidade com as páginas existentes e fornece um documento A4
 * separado da aplicação, com identidade corporativa e aviso de confidencialidade.
 */

const CSS = `
:root{--ink:#172033;--muted:#667085;--line:#dfe4eb;--soft:#f6f8fa;--soft2:#eef2f6;--accent:#344054}
@page{size:A4;margin:15mm 14mm 18mm}
*{box-sizing:border-box}
html,body{margin:0;padding:0;background:#fff;color:var(--ink);font-family:Inter,Arial,Helvetica,sans-serif;-webkit-print-color-adjust:exact;print-color-adjust:exact}
body{font-size:10.5pt;line-height:1.45}.document{width:100%;max-width:182mm;margin:0 auto}
.document-header{padding-bottom:12px;border-bottom:2px solid var(--ink);margin-bottom:12px}.brand-row{display:flex;justify-content:space-between;align-items:flex-start;gap:24px}.brand{display:flex;align-items:center;gap:10px}.brand-mark{width:34px;height:34px;border-radius:8px;background:var(--ink);color:#fff;display:grid;place-items:center;font-size:16px;font-weight:800}.brand-name{font-size:15px;font-weight:800;letter-spacing:-.02em}.brand-sub{font-size:8.5pt;color:var(--muted);margin-top:1px}.document-meta{text-align:right;color:var(--muted);font-size:7.8pt;line-height:1.5}.document-meta strong{display:block;color:var(--ink);font-size:8.2pt;letter-spacing:.05em}.document-title{margin-top:14px}.document-title h1{margin:0;font-size:21pt;line-height:1.12;letter-spacing:-.035em;font-weight:800}.document-title p{margin:4px 0 0;color:var(--muted);font-size:9pt}
.confidential{margin:0 0 15px;padding:8px 11px;border:1px solid #cbd2dc;border-radius:6px;background:var(--soft);color:#344054;text-align:center;font-size:7.8pt;font-weight:800;letter-spacing:.075em;text-transform:uppercase}
.section{margin:17px 0 0;break-inside:avoid;page-break-inside:avoid}.section-title{display:flex;align-items:center;gap:7px;margin:0 0 9px;padding-bottom:6px;border-bottom:1px solid var(--line);font-size:9pt;font-weight:800;color:#344054;letter-spacing:.075em;text-transform:uppercase}.section-title:before{content:"";display:block;width:3px;height:12px;border-radius:2px;background:var(--ink)}
.info-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:7px 12px}.info-item{padding:8px 10px;border:1px solid var(--line);border-radius:6px;background:#fbfcfd;min-height:42px}.label{display:block;color:var(--muted);font-size:7.2pt;line-height:1.2;text-transform:uppercase;letter-spacing:.055em;margin-bottom:3px}.value{font-weight:650;color:var(--ink)}
.kpis{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;margin:10px 0}.kpi{padding:10px;border:1px solid var(--line);border-radius:7px;background:#fff;min-height:58px}.kpi-label{font-size:7.2pt;color:var(--muted);text-transform:uppercase;letter-spacing:.055em}.kpi-value{font-size:17pt;line-height:1.15;font-weight:800;margin-top:3px}.highlight{padding:12px;border:1px solid var(--line);border-radius:8px;background:var(--soft);break-inside:avoid}.note{font-size:8.8pt;color:#475467}.two-col{display:grid;grid-template-columns:1fr 1fr;gap:10px}.chart-wrap{padding:11px;border:1px solid var(--line);border-radius:8px;background:#fff;break-inside:avoid;page-break-inside:avoid}.chart-title{font-size:9pt;font-weight:750;margin:0 0 8px;color:#344054}.chart-wrap svg,.chart-wrap canvas,svg,canvas{max-width:100%;height:auto}
table{width:100%;border-collapse:separate;border-spacing:0;border:1px solid var(--line);border-radius:7px;overflow:hidden;margin:7px 0 13px;page-break-inside:auto}thead{display:table-header-group}tfoot{display:table-footer-group}tr{break-inside:avoid;page-break-inside:avoid}th{background:var(--soft2);color:#344054;text-align:left;font-size:7.2pt;font-weight:800;text-transform:uppercase;letter-spacing:.045em;padding:7px 8px;border-bottom:1px solid var(--line)}td{font-size:8.7pt;padding:7px 8px;border-bottom:1px solid #eaecf0;vertical-align:top}tr:last-child td{border-bottom:0}.badge{display:inline-block;padding:3px 7px;border:1px solid #d8dee7;border-radius:999px;background:#f8fafc;font-size:7.2pt;font-weight:700}.progress{height:7px;border-radius:99px;background:#e8ecf1;overflow:hidden}.progress>span{display:block;height:100%;background:#344054;border-radius:99px}
.signature-area{display:grid;grid-template-columns:1fr 1fr;gap:34px;margin-top:42px;break-inside:avoid;page-break-inside:avoid}.signature{padding-top:23px;border-top:1px solid #667085;text-align:center;font-size:8.5pt;color:#344054}.footer{margin-top:24px;padding-top:8px;border-top:1px solid var(--line);display:flex;justify-content:space-between;gap:20px;color:#98a2b3;font-size:7pt}.page-break{break-before:page;page-break-before:always}.keep-together{break-inside:avoid;page-break-inside:avoid}.no-print{display:none!important}
@media screen{body{background:#eef1f5;padding:24px}.document{background:#fff;max-width:210mm;min-height:297mm;padding:18mm;box-shadow:0 8px 30px rgba(16,24,40,.10)}}
@media print{body{background:#fff}.document{max-width:none}.no-print{display:none!important}}
`;

function esc(value){return String(value??"").replace(/[&<>\"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;"}[c]));}

function buildDocument({title="Documento",subtitle="",company="ProdOS",content="",confidential=true,documentCode=""}={}){
 const now=new Date().toLocaleString("pt-BR");
 return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)}</title><style>${CSS}</style></head><body><main class="document">
 <header class="document-header"><div class="brand-row"><div class="brand"><div class="brand-mark">P</div><div><div class="brand-name">${esc(company)}</div><div class="brand-sub">ProdPersonal • Gestão de Pessoas</div></div></div><div class="document-meta"><strong>DOCUMENTO CORPORATIVO</strong>${documentCode?`Código: ${esc(documentCode)}<br>`:""}Emissão: ${esc(now)}</div></div><div class="document-title"><h1>${esc(title)}</h1>${subtitle?`<p>${esc(subtitle)}</p>`:""}</div></header>
 ${confidential?'<div class="confidential">CONFIDENCIAL — USO RESTRITO AO RH/DP</div>':""}${content}<footer class="footer"><span>ProdPersonal • Documento administrativo</span><span>Emissão: ${esc(now)}</span></footer></main><script>window.addEventListener('load',()=>setTimeout(()=>window.print(),300));</script></body></html>`;
}

export function openPrintDocument(options={}){const win=window.open("","_blank","width=980,height=1200");if(!win){window.print();return null;}win.document.open();win.document.write(buildDocument(options));win.document.close();return win;}
export function openPrintWindow(options={}){return openPrintDocument(options);}
export function printDocument(title,content,subtitle=""){return openPrintDocument({title,subtitle,content});}
export function brandHeader(title="Documento",subtitle=""){return `<div class="document-title"><h1>${esc(title)}</h1>${subtitle?`<p>${esc(subtitle)}</p>`:""}</div>`;}
export function currency(value){const n=Number(value||0);return n.toLocaleString("pt-BR",{style:"currency",currency:"BRL"});}
export function formatDate(value){if(!value)return "—";const d=new Date(value);return Number.isNaN(d.getTime())?String(value):d.toLocaleDateString("pt-BR");}
export function infoGrid(items=[]){return `<div class="info-grid">${items.filter(x=>x&&x.value!==undefined&&x.value!==null&&x.value!=="").map(x=>`<div class="info-item"><span class="label">${esc(x.label)}</span><span class="value">${esc(x.value)}</span></div>`).join("")}</div>`;}
export function section(title,content){return `<section class="section"><h2 class="section-title">${esc(title)}</h2>${content}</section>`;}
export function kpis(items=[]){return `<div class="kpis">${items.map(x=>`<div class="kpi"><div class="kpi-label">${esc(x.label)}</div><div class="kpi-value">${esc(x.value)}</div></div>`).join("")}</div>`;}
export function table(headers=[],rows=[]){return `<table><thead><tr>${headers.map(h=>`<th>${esc(h)}</th>`).join("")}</tr></thead><tbody>${rows.map(r=>`<tr>${r.map(c=>`<td>${typeof c==="string"&&c.includes("<")?c:esc(c)}</td>`).join("")}</tr>`).join("")}</tbody></table>`;}
export {CSS};
