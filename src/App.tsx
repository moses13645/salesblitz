import { HashRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
/*import { BrowserRouter, Route, Routes } from "react-router-dom"; */
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Index from "./pages/Index.tsx";
import BUDashboard from "./pages/BUDashboard.tsx";
import HQDashboard from "./pages/HQDashboard.tsx";
import NotFound from "./pages/NotFound.tsx";


const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <HashRouter >
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/bu/:slug" element={<BUDashboard />} />
          <Route path="/hq" element={<HQDashboard />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </HashRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
