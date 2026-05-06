import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/use-auth";
import NotFound from "@/pages/not-found";
import Landing from "@/pages/landing";
import AuthPage from "@/pages/auth";
import Dashboard from "@/pages/dashboard";
import Projects from "@/pages/projects";
import ProjectDetail from "@/pages/project-detail";
import Analyzer from "@/pages/analyzer";
import AnalysisDetail from "@/pages/analysis-detail";
import Keywords from "@/pages/keywords";
import Reports from "@/pages/reports";
import AppLayout from "@/components/app-layout";

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 30_000 } },
});

function Router() {
  return (
    <Switch>
      <Route path="/" component={Landing} />
      <Route path="/auth" component={AuthPage} />
      <Route path="/dashboard">
        <AppLayout><Dashboard /></AppLayout>
      </Route>
      <Route path="/projects/:id">
        {(params) => <AppLayout><ProjectDetail id={Number(params.id)} /></AppLayout>}
      </Route>
      <Route path="/projects">
        <AppLayout><Projects /></AppLayout>
      </Route>
      <Route path="/analyzer">
        <AppLayout><Analyzer /></AppLayout>
      </Route>
      <Route path="/analyses/:id">
        {(params) => <AppLayout><AnalysisDetail id={Number(params.id)} /></AppLayout>}
      </Route>
      <Route path="/keywords">
        <AppLayout><Keywords /></AppLayout>
      </Route>
      <Route path="/reports">
        <AppLayout><Reports /></AppLayout>
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <Router />
          </WouterRouter>
          <Toaster />
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
