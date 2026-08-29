import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../lib/AuthContext";

const NAV = [
  { to: "/dashboard", label: "Dashboard", icon: "📊" },
  { to: "/avaliacoes", label: "Avaliação de Desempenho", icon: "★" },
  { to: "/avaliacao-comportamental", label: "Avaliação Comportamental", icon: "🧭" },
  { to: "/competencias", label: "Competências", icon: "◆" },
  { to: "/descricao-cargos", label: "Descrição de Cargos", icon: "📄" },
  { to: "/pdi", label: "PDI", icon: "📈" },
  { to: "/metas", label: "Metas e KPIs", icon: "🎯" },
  { to: "/carreira", label: "Plano de Carreira", icon: "🪜" },
  { to: "/sucessao", label: "Plano de Sucessão", icon: "👥" },
  { to: "/treinamentos", label: "Treinamentos", icon: "🎓" },
  { to: "/vagas", label: "Recrutamento", icon: "📋" },
  { to: "/remuneracao", label: "Remuneração", icon: "💵" },
  { to: "/folha-pagamento", label: "Folha de Pagamento", icon: "🧾" },
  { to: "/ferias", label: "Controle de Férias", icon: "🏖️" },
  { to: "/rescisao", label: "Cálculo de Rescisão", icon: "📤" },
  { to: "/config-inss", label: "Tabela de INSS", icon: "⚙️" },
  { to: "/config-irrf", label: "Tabela de IRRF", icon: "⚙️" },
  { to: "/assinatura", label: "Assinatura", icon: "◈" },
];

export default function Layout({ children }) {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();

  async function handleSignOut() {
    await signOut();
    navigate("/login");
  }

  return (
    <div style={styles.wrap}>
      <aside style={styles.sidebar}>
        <div style={styles.brand}>
          Prod<span style={{ color: "var(--amber)" }}>Personal</span>
        </div>
        <nav style={styles.nav}>
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              style={({ isActive }) => ({ ...styles.navItem, ...(isActive ? styles.navItemActive : {}) })}
            >
              <span>{item.icon}</span> {item.label}
            </NavLink>
          ))}
        </nav>
        <div style={styles.footer}>
          <div style={styles.userName}>{profile?.full_name ?? profile?.email}</div>
          <button style={styles.signOutBtn} onClick={handleSignOut} type="button">Sair</button>
        </div>
      </aside>
      <main style={styles.main}>{children}</main>
    </div>
  );
}

const styles = {
  wrap: { display: "flex", minHeight: "100vh", background: "var(--bg)" },
  sidebar: {
    width: 230, background: "var(--panel)", borderRight: "1px solid var(--line)",
    display: "flex", flexDirection: "column", padding: "20px 14px", flexShrink: 0,
  },
  brand: { fontFamily: "var(--font-display)", fontSize: 18, fontWeight: 800, padding: "0 8px 20px" },
  nav: { display: "flex", flexDirection: "column", gap: 2, flex: 1 },
  navItem: {
    display: "flex", alignItems: "center", gap: 10, padding: "9px 10px", borderRadius: "var(--radius)",
    color: "var(--text-dim)", fontSize: 13, fontWeight: 600, textDecoration: "none",
  },
  navItemActive: { background: "var(--panel-2)", color: "var(--text)" },
  footer: { borderTop: "1px solid var(--line)", paddingTop: 14, marginTop: 14 },
  userName: { fontSize: 12.5, color: "var(--text-dim)", marginBottom: 8, padding: "0 8px" },
  signOutBtn: {
    width: "100%", background: "transparent", border: "1px solid var(--line)", borderRadius: "var(--radius)",
    padding: "8px 0", color: "var(--text-dim)", fontSize: 12.5, fontWeight: 600, cursor: "pointer",
  },
  main: { flex: 1, padding: 28, overflowY: "auto" },
};
