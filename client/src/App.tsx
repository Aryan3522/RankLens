import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import AppLayout from "@/components/app-layout";
import { lazy, Suspense } from "react";
import { Loader2 } from "lucide-react";

// Critical pages - direct imports
import Home from "@/pages/home";
import Analyzer from "@/pages/analyzer";

// Secondary pages - lazy loaded
const Dashboard = lazy(() => import("@/pages/dashboard"));
const Projects = lazy(() => import("@/pages/projects"));
const ProjectDetail = lazy(() => import("@/pages/project-detail"));
const AnalysisDetail = lazy(() => import("@/pages/analysis-detail"));
const Keywords = lazy(() => import("@/pages/keywords"));
const Reports = lazy(() => import("@/pages/reports"));
const NotFound = lazy(() => import("@/pages/not-found"));

const queryClient = new QueryClient({
  defaultOptions: { 
    queries: { 
      retry: 1, 
      staleTime: 30_000,
      refetchOnWindowFocus: false 
    } 
  },
});

function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <Loader2 className="h-8 w-8 animate-spin text-primary opacity-20" />
    </div>
  );
}

function AppRouter() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Switch>
        <Route path="/" component={Home} />
        
        {/* All internal routes wrapped in AppLayout */}
        <Route path="/dashboard">
          <AppLayout><Dashboard /></AppLayout>
        </Route>
        
        <Route path="/projects/:id">
          {(params) => <AppLayout><ProjectDetail id={String(params.id)} /></AppLayout>}
        </Route>
        
        <Route path="/projects">
          <AppLayout><Projects /></AppLayout>
        </Route>
        
        <Route path="/analyzer">
          <AppLayout><Analyzer /></AppLayout>
        </Route>
        
        <Route path="/analyses/:id">
          {(params) => <AppLayout><AnalysisDetail id={String(params.id)} /></AppLayout>}
        </Route>
        
        <Route path="/keywords">
          <AppLayout><Keywords /></AppLayout>
        </Route>
        
        <Route path="/reports">
          <AppLayout><Reports /></AppLayout>
        </Route>
        
        <Route component={NotFound} />
      </Switch>
    </Suspense>
  );
}

function App() {
  const base = import.meta.env.BASE_URL?.replace(/\/$/, "") || "";

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={base}>
          <AppRouter />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
