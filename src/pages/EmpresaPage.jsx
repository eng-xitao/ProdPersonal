import { useAuth } from "../lib/AuthContext";

const sections = [
  { icon: "🎯", title: "Missão", text: "Defina aqui o propósito que orienta a empresa e o trabalho de todas as equipes." },
  { icon: "🔭", title: "Visão", text: "Apresente onde a empresa pretende chegar e quais objetivos orientam seu crescimento." },
  { icon: "⭐", title: "Valores", text: "Registre os princípios que orientam decisões, comportamentos e relações profissionais." },
  { icon: "🤝", title: "Cultura", text: "Comunique o jeito de trabalhar, princípios de convivência, ética, respeito e colaboração." },
];
const docs = ["Manual do Colaborador", "Código de Conduta", "Regulamento Interno", "Política de Privacidade e LGPD", "Políticas e Procedimentos", "Comunicados Institucionais"];

export default function EmpresaPage(){
  const { company } = useAuth();
  const name = company?.name || company?.razao_social || "Sua empresa";
  return <div style={s.page}>
    <header style={s.hero}>
      <div><div style={s.eyebrow}>Central institucional</div><h1 style={s.h1}>🏢 {name}</h1><p style={s.sub}>Cultura, identidade e documentos oficiais da empresa.</p></div>
      <div style={s.badge}>Informações institucionais</div>
    </header>
    <section style={s.grid}>{sections.map(x=><article key={x.title} style={s.card}><div style={s.icon}>{x.icon}</div><h2 style={s.h2}>{x.title}</h2><p style={s.text}>{x.text}</p></article>)}</section>
    <section style={s.panel}><div style={s.panelHead}><div><div style={s.eyebrow}>Biblioteca institucional</div><h2 style={s.h2}>📚 Documentos da empresa</h2></div><span style={s.muted}>Área administrada pelo RH/DP</span></div><div style={s.docs}>{docs.map((d,i)=><div style={s.doc} key={d}><span style={s.docIcon}>📄</span><div><strong>{d}</strong><small>Documento institucional • versão vigente</small></div><button type="button" style={s.view}>Visualizar</button></div>)}</div></section>
    <section style={s.panel}><div style={s.eyebrow}>Nossa estrutura</div><h2 style={s.h2}>👥 Organização e canais</h2><div style={s.infoGrid}><div><small>Empresa</small><strong>{name}</strong></div><div><small>Endereço</small><strong>Administrado pelo RH</strong></div><div><small>Contato institucional</small><strong>Consulte o RH/DP</strong></div></div></section>
  </div>
}
const s={page:{maxWidth:1180,margin:"0 auto",paddingBottom:40},hero:{display:"flex",justifyContent:"space-between",alignItems:"center",gap:20,padding:"8px 0 28px",borderBottom:"1px solid var(--line)",marginBottom:22},eyebrow:{fontSize:10,textTransform:"uppercase",letterSpacing:".09em",fontWeight:800,color:"var(--amber)",marginBottom:6},h1:{fontFamily:"var(--font-display)",fontSize:30,margin:"0 0 5px",color:"var(--text)"},h2:{fontFamily:"var(--font-display)",fontSize:20,margin:"4px 0 8px",color:"var(--text)"},sub:{margin:0,color:"var(--text-dim)",fontSize:13},badge:{border:"1px solid var(--line)",borderRadius:999,padding:"7px 11px",fontSize:11,color:"var(--text-dim)"},grid:{display:"grid",gridTemplateColumns:"repeat(4,minmax(0,1fr))",gap:12,marginBottom:18},card:{background:"var(--panel)",border:"1px solid var(--line)",borderRadius:"var(--radius)",padding:18,minHeight:145},icon:{fontSize:25,marginBottom:12},text:{fontSize:12.5,lineHeight:1.55,color:"var(--text-dim)",margin:0},panel:{background:"var(--panel)",border:"1px solid var(--line)",borderRadius:"var(--radius)",padding:20,marginTop:14},panelHead:{display:"flex",justifyContent:"space-between",alignItems:"center",gap:15,marginBottom:12},muted:{fontSize:11,color:"var(--text-dim)"},docs:{display:"grid",gridTemplateColumns:"repeat(2,minmax(0,1fr))",gap:8},doc:{display:"flex",alignItems:"center",gap:11,border:"1px solid var(--line)",borderRadius:10,padding:12},docIcon:{fontSize:21},doc: {display:"flex"},docTitle:{fontSize:12},view:{marginLeft:"auto",background:"transparent",border:"1px solid var(--line)",borderRadius:8,padding:"6px 9px",color:"var(--text)",fontSize:11,cursor:"pointer"},infoGrid:{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10},info:{padding:12,border:"1px solid var(--line)",borderRadius:10},small:{display:"block",fontSize:10,color:"var(--text-dim)"}};
Object.assign(s,{doc:{display:"flex",alignItems:"center",gap:11,border:"1px solid var(--line)",borderRadius:10,padding:12},info:{padding:12,border:"1px solid var(--line)",borderRadius:10}});
