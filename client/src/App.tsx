import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/use-auth";
import AppLayout from "@/components/app-layout";
import { lazy, Suspense } from "react";
import { Loader2 } from "lucide-react";

// Lazy-loaded pages for better performance
const Landing = lazy(() => import("@/pages/landing"));
const AuthPage = lazy(() => import("@/pages/auth"));
const Dashboard = lazy(() => import("@/pages/dashboard"));
const Projects = lazy(() => import("@/pages/projects"));
const ProjectDetail = lazy(() => import("@/pages/project-detail"));
const Analyzer = lazy(() => import("@/pages/analyzer"));
const AnalysisDetail = lazy(() => import("@/pages/analysis-detail"));
const Keywords = lazy(() => import("@/pages/keywords"));
const Reports = lazy(() => import("@/pages/reports"));
const NotFound = lazy(() => import("@/pages/not-found"));

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 30_000 } },
});

function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <Loader2 className="h-8 w-8 animate-spin text-primary opacity-20" />
    </div>
  );
}

function Router() {
  return (
    <Suspense fallback={<PageLoader />}>
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
    </Suspense>
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
