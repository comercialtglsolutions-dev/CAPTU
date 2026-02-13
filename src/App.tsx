import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import AppLayout from "@/components/AppLayout";
import Index from "./pages/Index";
import SearchPage from "./pages/SearchPage";
import LeadsPage from "./pages/LeadsPage";
import CampaignsPage from "./pages/CampaignsPage";
import ContactsPage from "./pages/ContactsPage";
import MetricsPage from "./pages/MetricsPage";
import AutomationsPage from "./pages/AutomationsPage";
import SettingsPage from "./pages/SettingsPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AppLayout>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/search" element={<SearchPage />} />
            <Route path="/leads" element={<LeadsPage />} />
            <Route path="/campaigns" element={<CampaignsPage />} />
            <Route path="/contacts" element={<ContactsPage />} />
            <Route path="/metrics" element={<MetricsPage />} />
            <Route path="/automations" element={<AutomationsPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AppLayout>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
