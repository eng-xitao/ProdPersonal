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
            <Route path="/" element={<Navigate to="/avaliacoes" replace />} />
            <Route path="/avaliacoes" element={<AvaliacoesPage />} />
            <Route path="/competencias" element={<CompetenciasPage />} />
            <Route path="/pdi" element={<PdiPage />} />
            <Route path="/metas" element={<MetasPage />} />
            <Route path="/carreira" element={<CarreiraPage />} />
            <Route path="/sucessao" element={<SucessaoPage />} />
            <Route path="/treinamentos" element={<TreinamentosPage />} />
            <Route path="/vagas" element={<VagasPage />} />
            <Route path="/assinatura" element={<AssinaturaPage />} />
            <Route path="*" element={<Navigate to="/avaliacoes" replace />} />
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
