import { useState, useCallback } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { SplashScreen } from "@/components/SplashScreen";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import ClientDashboard from "./pages/client/ClientDashboard";
import { ClientLayout } from "./components/layout/ClientLayout";
import SoilAnalysis from "./pages/SoilAnalysis";
import SeedChoice from "./pages/SeedChoice";
import FinancialManagement from "./pages/FinancialManagement";
import Resultado from "./pages/Resultado";
import Insumos from "./pages/Insumos";
import Spraying from "./pages/Spraying";
import Wizard from "./pages/Wizard";
import QuickAnalysis from "./pages/QuickAnalysis";
import CultureSelect from "./pages/CultureSelect";
import CoffeeWizard from "./pages/CoffeeWizard";
import PhytoWizard from "./pages/PhytoWizard";
import FoliarWizard from "./pages/FoliarWizard";
import Reports from "./pages/Reports";
import Talhoes from "./pages/Talhoes";
import Profile from "./pages/Profile";
import AccountSettings from "./pages/AccountSettings";
import FoliarAnalysis from "./pages/FoliarAnalysis";
import NotFound from "./pages/NotFound";
import Comparar from "./pages/Comparar";
import CoverPlanning from "./pages/CoverPlanning";
import CornPhytoWizard from "./pages/CornPhytoWizard";
import IrrigationSchedule from "./pages/IrrigationSchedule";
import RainfallHistory from "./pages/RainfallHistory";
import SmartFinancial from "./pages/SmartFinancial";
import OrdensServico from "./pages/OrdensServico";
import SoloBio from "./pages/SoloBio";
import IrrigationSectorSetup from "./pages/IrrigationSectorSetup";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes — agronomic data changes slowly
      refetchOnWindowFocus: false,
    },
  },
});

const App = () => {
  const [showSplash, setShowSplash] = useState(() => {
    if (sessionStorage.getItem('splash_shown')) return false;
    return true;
  });

  const handleSplashFinish = useCallback(() => {
    sessionStorage.setItem('splash_shown', 'true');
    setShowSplash(false);
  }, []);

  return (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      {showSplash && <SplashScreen onFinish={handleSplashFinish} />}
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          {/* Public */}
          <Route path="/" element={<Index />} />
          <Route path="/auth" element={<Auth />} />

          {/* Protected — no layout (standalone pages) */}
          <Route element={<ProtectedRoute />}>
            <Route path="/perfil" element={<Profile />} />
            <Route path="/ajustes" element={<AccountSettings />} />

            {/* Consultor routes — DashboardLayout */}
            <Route element={<DashboardLayout />}>
              <Route path="/cultura" element={<CultureSelect />} />
              <Route path="/wizard" element={<Wizard />} />
              <Route path="/cafe" element={<CoffeeWizard />} />
              <Route path="/fitossanitario" element={<PhytoWizard />} />
              <Route path="/foliar" element={<FoliarWizard />} />
              <Route path="/solo" element={<SoilAnalysis />} />
              <Route path="/resultado" element={<Resultado />} />
              <Route path="/sementes" element={<SeedChoice />} />
              <Route path="/financeiro" element={<FinancialManagement />} />
              <Route path="/insumos" element={<Insumos />} />
              <Route path="/pulverizacao" element={<Spraying />} />
              <Route path="/analise-foliar" element={<FoliarAnalysis />} />
              <Route path="/relatorios" element={<Reports />} />
              <Route path="/talhoes" element={<Talhoes />} />
              <Route path="/comparar" element={<Comparar />} />
              <Route path="/cobertura" element={<CoverPlanning />} />
              <Route path="/fitossanidade-milho" element={<CornPhytoWizard />} />
              <Route path="/irrigacao" element={<IrrigationSchedule />} />
              <Route path="/historico-chuvas" element={<RainfallHistory />} />
              <Route path="/gestao-financeira" element={<SmartFinancial />} />
              <Route path="/ordens-servico" element={<OrdensServico />} />
              <Route path="/irrigacao/setor" element={<IrrigationSectorSetup />} />
              <Route path="/bio" element={<SoloBio />} />
            </Route>

            {/* Client (Produtor) routes — ClientLayout */}
            <Route path="/client" element={<ClientLayout />}>
              <Route index element={<ClientDashboard />} />
              <Route path="analise-rapida" element={<QuickAnalysis />} />
              <Route path="analise-foliar" element={<FoliarAnalysis />} />
              <Route path="relatorios" element={<Reports />} />
              <Route path="insumos" element={<Insumos />} />
              <Route path="talhoes" element={<Talhoes />} />
              <Route path="cultura" element={<CultureSelect />} />
              <Route path="cafe" element={<CoffeeWizard />} />
              <Route path="fitossanitario" element={<PhytoWizard />} />
              <Route path="foliar" element={<FoliarWizard />} />
              <Route path="resultado" element={<Resultado />} />
              <Route path="wizard" element={<Wizard />} />
              <Route path="solo" element={<SoilAnalysis />} />
              <Route path="comparar" element={<Comparar />} />
              <Route path="cobertura" element={<CoverPlanning />} />
              <Route path="fitossanidade-milho" element={<CornPhytoWizard />} />
              <Route path="irrigacao" element={<IrrigationSchedule />} />
              <Route path="historico-chuvas" element={<RainfallHistory />} />
              <Route path="gestao-financeira" element={<SmartFinancial />} />
              <Route path="ordens-servico" element={<OrdensServico />} />
              <Route path="irrigacao/setor" element={<IrrigationSectorSetup />} />
              <Route path="bio" element={<SoloBio />} />
            </Route>
          </Route>

          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
  );
};

export default App;
