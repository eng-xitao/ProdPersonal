import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./lib/AuthContext";
import LoginPage from "./pages/LoginPage";
import PendingSubscriptionPage from "./pages/PendingSubscriptionPage";
import Layout from "./components/Layout";
import AvaliacoesPage from "./pages/AvaliacoesPage";
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
import AvaliacaoComportamentalPage from "./pages/AvaliacaoComportamentalPage";
import DescricaoCargosPage from "./pages/DescricaoCargosPage";
import RemuneracaoPage from "./pages/RemuneracaoPage";
import FolhaPagamentoPage from "./pages/FolhaPagamentoPage";
import FeriasPage from "./pages/FeriasPage";
import RescisaoPage from "./pages/RescisaoPage";
import ConfigInssPage from "./pages/ConfigInssPage";
import ConfigIrrfPage from "./pages/ConfigIrrfPage";

function PrivateArea() {
  const { session, loading, profileLoading, subscription, profile } = useAuth();

  if (loading || profileLoading) {
    return <div style={{ padding: 40 }}>Carregando...</div>;
  }
  if (!session) {
    return <Navigate to="/login" replace />;
  }

  const isActive = !!profile?.platform_role || ["active", "vitalicio"].includes(subscription?.subscription_status);

  return (
    <Layout>
      <Routes>
        {isActive ? (
          <>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/colaboradores" element={<ColaboradoresPage />} />
            <Route path="/avaliacoes" element={<AvaliacoesPage />} />
            <Route path="/avaliacao-comportamental" element={<AvaliacaoComportamentalPage />} />
            <Route path="/competencias" element={<CompetenciasPage />} />
            <Route path="/descricao-cargos" element={<DescricaoCargosPage />} />
            <Route path="/pdi" element={<PdiPage />} />
            <Route path="/metas" element={<MetasPage />} />
            <Route path="/carreira" element={<CarreiraPage />} />
            <Route path="/sucessao" element={<SucessaoPage />} />
            <Route path="/treinamentos" element={<TreinamentosPage />} />
            <Route path="/vagas" element={<VagasPage />} />
            <Route path="/remuneracao" element={<RemuneracaoPage />} />
            <Route path="/folha-pagamento" element={<FolhaPagamentoPage />} />
            <Route path="/ferias" element={<FeriasPage />} />
            <Route path="/rescisao" element={<RescisaoPage />} />
            <Route path="/config-inss" element={<ConfigInssPage />} />
            <Route path="/config-irrf" element={<ConfigIrrfPage />} />
            <Route path="/assinatura" element={<AssinaturaPage />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </>
        ) : (
          <>
            <Route path="/assinatura" element={<AssinaturaPage />} />
            <Route path="*" element={<PendingSubscriptionPage />} />
          </>
        )}
      </Routes>
    </Layout>
  );
}

function RootRoutes() {
  const { session, loading } = useAuth();
  return (
    <Routes>
      <Route path="/login" element={!loading && session ? <Navigate to="/" replace /> : <LoginPage />} />
      <Route path="/*" element={<PrivateArea />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <RootRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
