import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { useAuth } from "../lib/AuthContext";

const ADMIN_NAV = [
  { to: "/dashboard", label: "Dashboard", icon: "📊" },
  { to: "/colaboradores", label: "Colaboradores", icon: "👤" },
  { to: "/central-avaliacoes", label: "Central de Avaliações", icon: "★" },
  { to: "/feedbacks", label: "Feedbacks", icon: "💬" },
  { to: "/comunicados", label: "Comunicados e Documentos", icon: "📢" },
  { to: "/descricao-cargos", label: "Descrição de Cargos", icon: "📄" },
  { to: "/treinamentos", label: "Treinamentos", icon: "🎓" },
  { to: "/carreira", label: "Plano de Carreira", icon: "🪜" },
  { to: "/sucessao", label: "Plano de Sucessão", icon: "👥" },
  { to: "/vagas", label: "Recrutamento", icon: "📋" },
  { to: "/mural", label: "Mural", icon: "📌" },
  { to: "/clima", label: "Clima Organizacional", icon: "😊" },
  { to: "/denuncias", label: "Denúncias", icon: "⚠️" },
  { to: "/sugestoes", label: "Sugestões", icon: "💡" },
  { to: "/remuneracao", label: "Remuneração", icon: "💵" },
  { to: "/folha-pagamento", label: "Folha de Pagamento", icon: "🧾" },
  { to: "/ferias", label: "Controle de Férias", icon: "🏖️" },
  { to: "/rescisao", label: "Cálculo de Rescisão", icon: "📤" },
  { to: "/config-inss", label: "Tabela de INSS", icon: "⚙️" },
  { to: "/config-irrf", label: "Tabela de IRRF", icon: "⚙️" },
  { to: "/assinatura", label: "Assinatura", icon: "◈" },
];

const EMPLOYEE_NAV = [
  { to: "/dashboard", label: "Meu Portal", icon: "🏠" },
  { to: "/central-avaliacoes", label: "Minhas Avaliações", icon: "★" },
  { to: "/feedbacks", label: "Meus Feedbacks", icon: "💬" },
  { to: "/comunicados", label: "Minha Caixa de Entrada", icon: "📥" },
  { to: "/treinamentos", label: "Meus Treinamentos", icon: "🎓" },
  { to: "/pdi", label: "Meu PDI", icon: "🎯" },
  { to: "/metas", label: "Minhas Metas", icon: "📈" },
  { to: "/carreira", label: "Minha Carreira", icon: "🪜" },
  { to: "/sugestoes", label: "Sugestões", icon: "💡" },
  { to: "/clima", label: "Meu Clima", icon: "😊" },
];

const MANAGER_NAV = [
  ...ADMIN_NAV.filter((x) => !["/folha-pagamento", "/rescisao", "/config-inss", "/config-irrf", "/remuneracao", "/colaboradores"].includes(x.to)),
  { to: "/colaboradores", label: "Minha Equipe", icon: "👥" },
];

function navFor(role) {
  if (role === "employee") return EMPLOYEE_NAV;
  if (role === "gestor") return MANAGER_NAV;
  return ADMIN_NAV;
}

function removeDuplicateEmployeeName(root, fullName) {
  if (!root || !fullName) return;
  const normalized = String(fullName).trim().toLocaleLowerCase("pt-BR");
  const firstName = normalized.split(/\s+/)[0];
  if (!normalized) return;

  const elements = root.querySelectorAll("h1,h2,h3,h4,h5,h6,strong,span,p,div");
  elements.forEach((el) => {
    if (el.closest(".employeeIdentity") || el.closest("select") || el.closest("option")) return;
    const text = (el.textContent || "").trim().toLocaleLowerCase("pt-BR");
    if (!text) return;

    const exactName = text === normalized;
    const greeting = text.startsWith("olá,") && text.includes(firstName);
    if (!exactName && !greeting) return;

    // Evita deixar a identificação repetida no conteúdo. Em cartões de perfil,
    // remove somente o bloco de identificação e preserva os KPIs/resultados ao lado.
    if (exactName && el.tagName === "H2" && el.parentElement) {
      el.parentElement.style.display = "none";
      return;
    }
    el.style.display = "none";
  });
}

export default function Layout({ children }) {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const role = profile?.access_role || "employee";
  const nav = navFor(role);
  const isEmployee = role === "employee";

  useEffect(() => {
    if (!isEmployee || !profile?.full_name) return;
    const timer = window.setTimeout(() => removeDuplicateEmployeeName(document.querySelector(".app-main"), profile.full_name), 0);
    return () => window.clearTimeout(timer);
  }, [isEmployee, profile?.full_name, location.pathname]);

  async function handleSignOut() {
    await signOut();
    navigate("/login");
  }

  return (
    <div style={styles.wrap}>
      <aside className="no-print" style={styles.sidebar}>
        <div style={styles.brand}>Prod<span style={{ color: "var(--amber)" }}>Personal</span></div>
        <div style={styles.roleBadge}>{isEmployee ? "Portal do Colaborador" : role === "gestor" ? "Gestão de Equipe" : role === "dp" ? "Departamento Pessoal" : role === "rh" ? "Recursos Humanos" : "Administração"}</div>
        <nav style={styles.nav}>{nav.map((item) => <NavLink key={item.to} to={item.to} style={({ isActive }) => ({ ...styles.navItem, ...(isActive ? styles.navItemActive : {}) })}><span>{item.icon}</span>{item.label}</NavLink>)}</nav>
        <div style={styles.footer}>
          {!isEmployee && <div style={styles.userName}>{profile?.full_name ?? profile?.email}</div>}
          <button style={styles.signOutBtn} onClick={handleSignOut} type="button">Sair</button>
        </div>
      </aside>
      <main className="app-main" style={styles.main}>
        {isEmployee && (
          <div className="no-print employeeIdentity" style={styles.employeeIdentity}>
            <span style={styles.identityDot}>●</span>
            <strong>{profile?.full_name ?? profile?.email}</strong>
            <span style={styles.identityLabel}>Portal pessoal</span>
          </div>
        )}
        {children}
      </main>
    </div>
  );
}

const styles = {
  wrap: { display: "flex", minHeight: "100vh", background: "var(--bg)" },
  sidebar: { width: 230, background: "var(--panel)", borderRight: "1px solid var(--line)", display: "flex", flexDirection: "column", padding: "20px 14px", flexShrink: 0 },
  brand: { fontFamily: "var(--font-display)", fontSize: 18, fontWeight: 800, padding: "0 8px 12px" },
  roleBadge: { margin: "0 8px 16px", padding: "6px 8px", border: "1px solid var(--line)", borderRadius: "var(--radius)", fontSize: 10.5, fontWeight: 800, color: "var(--text-dim)", textTransform: "uppercase", letterSpacing: ".04em" },
  nav: { display: "flex", flexDirection: "column", gap: 2, flex: 1, overflowY: "auto" },
  navItem: { display: "flex", alignItems: "center", gap: 10, padding: "9px 10px", borderRadius: "var(--radius)", color: "var(--text-dim)", fontSize: 13, fontWeight: 600, textDecoration: "none" },
  navItemActive: { background: "var(--panel-2)", color: "var(--text)" },
  footer: { borderTop: "1px solid var(--line)", paddingTop: 14, marginTop: 14 },
  userName: { fontSize: 12.5, color: "var(--text-dim)", marginBottom: 8, padding: "0 8px" },
  signOutBtn: { width: "100%", background: "transparent", border: "1px solid var(--line)", borderRadius: "var(--radius)", padding: "8px 0", color: "var(--text-dim)", fontSize: 12.5, fontWeight: 600, cursor: "pointer" },
  main: { flex: 1, padding: 28, overflowY: "auto" },
  employeeIdentity: { display: "flex", alignItems: "center", gap: 8, margin: "-8px 0 22px", paddingBottom: 12, borderBottom: "1px solid var(--line)", fontSize: 13 },
  identityDot: { color: "var(--green)", fontSize: 9 },
  identityLabel: { color: "var(--text-dim)", fontSize: 11.5 },
};
