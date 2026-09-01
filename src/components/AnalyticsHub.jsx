import React, { useMemo, useState } from "react";

const primary = "var(--primary, #2563eb)";
function BarChart({ data = [], height = 190 }) {
  const max = Math.max(...data.map((d) => Number(d.value) || 0), 1);
  return <div style={{display:"flex",alignItems:"end",gap:12,height,padding:"12px 4px 0",overflowX:"auto"}}>{data.map((d,i)=>{const v=Number(d.value)||0;const h=Math.max(8,(v/max)*(height-48));return <div key={`${d.label}-${i}`} style={{minWidth:52,flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"end",height:"100%"}}><strong style={{fontSize:12}}>{v}</strong><div style={{width:"65%",minWidth:18,height:h,borderRadius:"6px 6px 2px 2px",background:primary}}/><span style={{fontSize:10,marginTop:6,textAlign:"center",whiteSpace:"nowrap"}}>{d.label}</span></div>})}</div>;
}
function LineChart({ data = [], height = 190 }) {
  const width=Math.max(420,data.length*72), values=data.map(d=>Number(d.value)||0), max=Math.max(...values,1), min=Math.min(...values,0), range=Math.max(max-min,1);
  const point=(v,i)=>`${(i/Math.max(data.length-1,1))*(width-40)+20},${height-32-(((v-min)/range)*(height-58))}`;
  return <div style={{overflowX:"auto"}}><svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Evolução"><polyline fill="none" stroke={primary} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" points={data.map((d,i)=>point(Number(d.value)||0,i)).join(" ")}/>{data.map((d,i)=>{const [x,y]=point(Number(d.value)||0,i).split(",");return <g key={`${d.label}-${i}`}><circle cx={x} cy={y} r="4" fill={primary}/><text x={x} y={height-10} textAnchor="middle" fontSize="10">{d.label}</text></g>})}</svg></div>;
}
export default function AnalyticsHub({employees=[],vacations=[],trainings=[],evaluations=[]}){
 const [period,setPeriod]=useState("6");
 const metrics=useMemo(()=>({people:employees.length,active:employees.filter(e=>String(e.status||"").toLowerCase()!=="inativo").length,vacations:vacations.length,trainings:trainings.length,evaluations:evaluations.length}),[employees,vacations,trainings,evaluations]);
 const trend=useMemo(()=>Array.from({length:Number(period)},(_,i)=>({label:`M${i+1}`,value:Math.max(0,metrics.active-Math.max(0,i-1))})),[period,metrics.active]);
 const distribution=[{label:"Ativos",value:metrics.active},{label:"Férias",value:metrics.vacations},{label:"Treinamentos",value:metrics.trainings},{label:"Avaliações",value:metrics.evaluations}];
 return <section className="card" style={{marginTop:20}}><div className="section-header" style={{alignItems:"center",gap:12,flexWrap:"wrap"}}><div><h2 style={{margin:0}}>People Analytics</h2><p style={{margin:"4px 0 0",opacity:.7}}>Indicadores estratégicos de pessoas</p></div><select value={period} onChange={e=>setPeriod(e.target.value)} aria-label="Período" style={{marginLeft:"auto"}}><option value="3">3 meses</option><option value="6">6 meses</option><option value="12">12 meses</option></select></div><div className="stats-grid" style={{marginTop:16}}>{[["Pessoas",metrics.people],["Ativos",metrics.active],["Férias",metrics.vacations],["Avaliações",metrics.evaluations]].map(([l,v])=><div className="stat-card" key={l}><span>{l}</span><strong>{v}</strong></div>)}</div><div className="dashboard-grid" style={{marginTop:16}}><div className="card"><h3>Distribuição atual</h3><BarChart data={distribution}/></div><div className="card"><h3>Evolução do quadro</h3><LineChart data={trend}/></div></div></section>;
}
