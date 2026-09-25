import * as React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";

import Adoption from "./pages/metrics/Adoption";
import AiPrototypingPage from "./pages/metrics/adoption/AiPrototypingPage";
import Documentation from "./pages/metrics/Documentation";
import Impact from "./pages/metrics/Impact";
import OKRs from "./pages/okrs/OKRs";
import Performance from "./pages/performance/Performance";
import Auth from "./pages/Auth";
import SetPassword from "./pages/SetPassword";
import DataSourcesSettings from "./pages/settings/DataSourcesSettings";
import PerformanceSettings from "./pages/settings/PerformanceSettings";
import ManualMetricsSettings from "./pages/settings/ManualMetricsSettings";
import MetricsSettings from "./pages/settings/MetricsSettings";
import HistorySettings from "./pages/settings/HistorySettings";
import ComponentsSettings from "./pages/settings/ComponentsSettings";
import UsersSettings from "./pages/settings/UsersSettings";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const PageViewTracker = () => {
  const location = useLocation();
  const first = React.useRef(true);
  React.useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    const gtag = (window as unknown as { gtag?: (...args: unknown[]) => void }).gtag;
    gtag?.("event", "page_view", {
      page_path: location.pathname + location.search,
      page_location: window.location.href,
    });
  }, [location.pathname, location.search]);
  return null;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <PageViewTracker />
        <Routes>
          <Route path="/" element={<Navigate to="/metrics" replace />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/auth/set-password" element={<SetPassword />} />
          <Route path="/okrs" element={<OKRs />} />
          <Route path="/metrics" element={<Navigate to="/metrics/impact" replace />} />
          <Route path="/metrics/impact" element={<Impact />} />
          <Route path="/metrics/adoption" element={<Adoption />} />
          <Route path="/metrics/adoption/ai-prototyping" element={<AiPrototypingPage />} />
          <Route path="/metrics/adoption/:touchpoint" element={<Adoption />} />
          <Route path="/metrics/documentation" element={<Documentation />} />
          <Route path="/metrics/documentation/:propertySlug" element={<Documentation />} />
          <Route path="/performance" element={<Performance />} />
          <Route path="/settings" element={<Navigate to="/settings/data-sources" replace />} />
          <Route path="/settings/data-sources" element={<DataSourcesSettings />} />
          <Route path="/settings/performance" element={<PerformanceSettings />} />
          <Route path="/settings/manual-metrics" element={<ManualMetricsSettings />} />
          <Route path="/settings/metrics" element={<MetricsSettings />} />
          <Route path="/settings/components" element={<ComponentsSettings />} />
          <Route path="/settings/history" element={<HistorySettings />} />
          <Route path="/settings/users" element={<UsersSettings />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
