import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./lib/AuthContext";
import LoginPage from "./pages/LoginPage";
import PendingSubscriptionPage from "./pages/PendingSubscriptionPage";
import Layout from "./components/Layout";
import AvaliacoesPage from "./pages/AvaliacoesPage";
import CentralAvaliacoesPage from "./pages/CentralAvaliacoesPage";
import ComunicadosPage from "./pages/ComunicadosPage";
import CompetenciasPage from "./pages/CompetenciasPage";
import PdiPage from "./pages/PdiPage";
import MetasPage from "./pages/MetasPage";
import CarreiraPage from "./pages/CarreiraPage";
import SucessaoPage from "./pages/SucessaoPage";
import TreinamentosPage from "./pages/TreinamentosPage";
import VagasPage from "./pages/VagasPage";
import AssinaturaPage from "./pages/AssinaturaPage";
import DashboardPage from "./pages/DashboardPage";
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
import FolhaPagamentoPage from "./pages/FolhaPagamentoPage";
import FeriasPage from "./pages/FeriasPage";
import RescisaoPage from "./pages/RescisaoPage";
import ConfigInssPage from "./pages/ConfigInssPage";
import ConfigIrrfPage from "./pages/ConfigIrrfPage";

const EMPLOYEE_ROUTES=["/dashboard","/central-avaliacoes","/comunicados","/treinamentos","/pdi","/metas","/carreira","/mural","/sugestoes","/clima"];
function Guard({children,allow}){const{profile}=useAuth();const role=profile?.access_role||"employee";return allow.includes(role)||role==="master"||role==="admin"?<>{children}</>:<Navigate to={role==="employee"?"/dashboard":"/dashboard"} replace/>;}
function PrivateArea(){const{session,loading,profileLoading,subscription,profile}=useAuth();if(loading||profileLoading)return <div style={{padding:40}}>Carregando...</div>;if(!session)return <Navigate to="/login" replace/>;const isActive=!!profile?.platform_role||["active","vitalicio"].includes(subscription?.subscription_status);const r=(path,element,allow=[])=> <Route path={path} element={<Guard allow={allow}>{element}</Guard>}/>;return <Layout><Routes>{isActive?<><Route path="/" element={<Navigate to="/dashboard" replace/>}/>{r("/dashboard",<DashboardPage/>,["employee","gestor","rh","dp","admin","master"])}{r("/colaboradores",<ColaboradoresPage/>,["gestor","rh","dp","admin","master"])}{r("/colaboradores/:id",<FichaColaboradorPage/>,["gestor","rh","dp","admin","master"])}{r("/central-avaliacoes",<CentralAvaliacoesPage/>,["employee","gestor","rh","dp","admin","master"])}{r("/comunicados",<ComunicadosPage/>,["employee","gestor","rh","dp","admin","master"])}{r("/avaliacoes",<AvaliacoesPage/>,["rh","dp","admin","master"])}{r("/avaliacao-experiencia",<AvaliacaoExperienciaPage/>,["rh","dp","admin","master"])}{r("/mural",<MuralPage/>,["employee","gestor","rh","dp","admin","master"])}{r("/clima",<ClimaPage/>,["employee","gestor","rh","dp","admin","master"])}{r("/denuncias",<DenunciasPage/>,["rh","dp","admin","master"])}{r("/sugestoes",<SugestoesPage/>,["employee","gestor","rh","dp","admin","master"])}{r("/avaliacao-comportamental",<AvaliacaoComportamentalPage/>,["rh","dp","admin","master"])}{r("/competencias",<CompetenciasPage/>,["rh","dp","admin","master"])}{r("/descricao-cargos",<DescricaoCargosPage/>,["rh","dp","admin","master"])}{r("/pdi",<PdiPage/>,["employee","gestor","rh","dp","admin","master"])}{r("/metas",<MetasPage/>,["employee","gestor","rh","dp","admin","master"])}{r("/carreira",<CarreiraPage/>,["employee","gestor","rh","dp","admin","master"])}{r("/sucessao",<SucessaoPage/>,["rh","dp","admin","master"])}{r("/treinamentos",<TreinamentosPage/>,["employee","gestor","rh","dp","admin","master"])}{r("/vagas",<VagasPage/>,["rh","dp","admin","master"])}{r("/remuneracao",<RemuneracaoPage/>,["rh","dp","admin","master"])}{r("/folha-pagamento",<FolhaPagamentoPage/>,["dp","rh","admin","master"])}{r("/ferias",<FeriasPage/>,["employee","gestor","rh","dp","admin","master"])}{r("/rescisao",<RescisaoPage/>,["dp","rh","admin","master"])}{r("/config-inss",<ConfigInssPage/>,["dp","rh","admin","master"])}{r("/config-irrf",<ConfigIrrfPage/>,["dp","rh","admin","master"])}{r("/assinatura",<AssinaturaPage/>,["employee","gestor","rh","dp","admin","master"])}<Route path="*" element={<Navigate to="/dashboard" replace/>}/></>:<><Route path="/assinatura" element={<AssinaturaPage/>}/><Route path="*" element={<PendingSubscriptionPage/>}/></>}</Routes></Layout>}
function RootRoutes(){const{session,loading}=useAuth();return <Routes><Route path="/login" element={!loading&&session?<Navigate to="/" replace/>:<LoginPage/>}/><Route path="/*" element={<PrivateArea/>}/></Routes>}
export default function App(){return <BrowserRouter><AuthProvider><RootRoutes/></AuthProvider></BrowserRouter>}
