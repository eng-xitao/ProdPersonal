import { useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./lib/AuthContext";
import LoginPage from "./pages/LoginPage";
import PendingSubscriptionPage from "./pages/PendingSubscriptionPage";
import Layout from "./components/Layout";
import RoleDashboardPage from "./pages/RoleDashboardPage";
import AvaliacoesPage from "./pages/AvaliacoesPage";
import CentralAvaliacoesPage from "./pages/CentralAvaliacoesPage";
import ComunicadosPage from "./pages/ComunicadosPage";
import FeedbacksPage from "./pages/FeedbacksPage";
import CompetenciasPage from "./pages/CompetenciasPage";
import PdiPage from "./pages/PdiPage";
import MetasPage from "./pages/MetasPage";
import CarreiraPage from "./pages/CarreiraPage";
import SucessaoPage from "./pages/SucessaoPage";
import TreinamentosPage from "./pages/TreinamentosPage";
import VagasPage from "./pages/VagasPage";
import AssinaturaPage from "./pages/AssinaturaPage";
import ColaboradoresPage from "./pages/ColaboradoresPage";
import FichaColaboradorPage from "./pages/FichaColaboradorPage";
import AvaliacaoExperienciaPage from "./pages/AvaliacaoExperienciaPage";
import MuralPage from "./pages/MuralPage";
import ClimaPage from "./pages/ClimaPage";
import DenunciasPage from "./pages/DenunciasPage";
import SugestoesPage from "./pages/SugestoesPage";
import AvaliacaoComportamentalPage from "./pages/AvaliacaoComportamentalPage";
import DescricaoCargosPage from "./pages/DescricaoCargosPage";
import RemuneracaoPage from "./pages/RemuneracaoPage";
import FeriasPage from "./pages/FeriasPage";
import EmpresaPage from "./pages/EmpresaPage";

function ResponsiveTables() {
  useEffect(() => {
    const wrapTables = () => {
      document.querySelectorAll("table").forEach((table) => {
        if (table.closest(".responsive-table,.table-responsive,.table-wrap,.table-container")) return;
        const wrapper = document.createElement("div");
        wrapper.className = "responsive-table";
        table.parentNode?.insertBefore(wrapper, table);
        wrapper.appendChild(table);
      });
    };
    wrapTables();
    const observer = new MutationObserver(wrapTables);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);
  return null;
}

function Guard({children,allow}){const {profile}=useAuth();const role=profile?.access_role||"employee";return allow.includes(role)||role==="master"||role==="admin"?children:<Navigate to="/dashboard" replace/>}
function PrivateArea(){const {session,loading,profileLoading,subscription,profile}=useAuth();if(loading||profileLoading)return <div style={{padding:40}}>Carregando...</div>;if(!session)return <Navigate to="/login" replace/>;const active=!!profile?.platform_role||["active","vitalicio"].includes(subscription?.subscription_status);const route=(path,element,allow=[])=> <Route path={path} element={<Guard allow={allow}>{element}</Guard>}/>;if(!active)return <Layout><Routes><Route path="/assinatura" element={<AssinaturaPage/>}/><Route path="*" element={<PendingSubscriptionPage/>}/></Routes></Layout>;return <Layout><ResponsiveTables/><Routes><Route path="/" element={<Navigate to="/dashboard" replace/>}/>{route("/dashboard",<RoleDashboardPage/>,["employee","gestor","rh","dp","admin","master"])}{route("/empresa",<EmpresaPage/>,["employee","gestor","rh","dp","admin","master"])}{route("/colaboradores",<ColaboradoresPage/>,["gestor","rh","dp","admin","master"])}{route("/colaboradores/:id",<FichaColaboradorPage/>,["gestor","rh","dp","admin","master"])}{route("/central-avaliacoes",<CentralAvaliacoesPage/>,["employee","gestor","rh","dp","admin","master"])}{route("/comunicados",<ComunicadosPage/>,["employee","gestor","rh","dp","admin","master"])}{route("/feedbacks",<FeedbacksPage/>,["employee","gestor","rh","dp","admin","master"])}{route("/avaliacoes",<AvaliacoesPage/>,["gestor","rh","dp","admin","master"])}{route("/avaliacao-experiencia",<AvaliacaoExperienciaPage/>,["rh","dp","admin","master"])}{route("/mural",<MuralPage/>,["gestor","rh","dp","admin","master"])}{route("/clima",<ClimaPage/>,["gestor","rh","dp","admin","master"])}{route("/denuncias",<DenunciasPage/>,["gestor","rh","admin","master"])}{route("/sugestoes",<SugestoesPage/>,["employee","gestor","rh","dp","admin","master"])}{route("/avaliacao-comportamental",<AvaliacaoComportamentalPage/>,["gestor","rh","dp","admin","master"])}{route("/competencias",<CompetenciasPage/>,["rh","dp","admin","master"])}{route("/descricao-cargos",<DescricaoCargosPage/>,["rh","dp","admin","master"])}{route("/pdi",<PdiPage/>,["employee","gestor","rh","dp","admin","master"])}{route("/metas",<MetasPage/>,["employee","gestor","rh","dp","admin","master"])}{route("/carreira",<CarreiraPage/>,["employee","gestor","rh","dp","admin","master"])}{route("/sucessao",<SucessaoPage/>,["rh","dp","admin","master"])}{route("/treinamentos",<TreinamentosPage/>,["gestor","rh","dp","admin","master"])}{route("/vagas",<VagasPage/>,["rh","dp","admin","master"])}{route("/remuneracao",<RemuneracaoPage/>,["rh","dp","admin","master"])}{route("/ferias",<FeriasPage/>,["employee","gestor","rh","dp","admin","master"])}{route("/assinatura",<AssinaturaPage/>,["employee","gestor","rh","dp","admin","master"])}<Route path="*" element={<Navigate to="/dashboard" replace/>}/></Routes></Layout>}
function RootRoutes(){const {session,loading}=useAuth();return <Routes><Route path="/login" element={!loading&&session?<Navigate to="/" replace/>:<LoginPage/>}/><Route path="/*" element={<PrivateArea/>}/></Routes>}
export default function App(){return <BrowserRouter><AuthProvider><RootRoutes/></AuthProvider></BrowserRouter>}
