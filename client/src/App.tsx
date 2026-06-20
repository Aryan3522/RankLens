import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import AppLayout from "@/components/app-layout";
import { lazy, Suspense } from "react";
import { Loader2 } from "lucide-react";
import { useSmoothScroll } from "@/lib/useSmoothScroll";

// Critical pages - direct imports
import MarketingHome from "@/pages/marketing-home";
import Analyzer from "@/pages/analyzer";
import Login from "@/pages/login";
import Pricing from "@/pages/pricing";

// Secondary pages - lazy loaded
const Dashboard = lazy(() => import("@/pages/dashboard"));
const Projects = lazy(() => import("@/pages/projects"));
const ProjectDetail = lazy(() => import("@/pages/project-detail"));
const AnalysisDetail = lazy(() => import("@/pages/analysis-detail"));
const Keywords = lazy(() => import("@/pages/keywords"));
const Reports = lazy(() => import("@/pages/reports"));
const Indexing = lazy(() => import("@/pages/indexing"));
const AdminDashboard = lazy(() => import("@/pages/admin"));
const Profile = lazy(() => import("@/pages/profile"));
const Settings = lazy(() => import("@/pages/settings"));
const NotFound = lazy(() => import("@/pages/not-found"));

// Agentation — visual feedback tool for AI coding agents. Dev + localhost ONLY:
// the dynamic import sits in an `import.meta.env.DEV` dead branch in production
// builds (tree-shaken out, devDependency never shipped), and rendering is
// further gated to localhost hostnames at runtime.
const isLocalhost =
  typeof window !== "undefined" && /^(localhost|127\.0\.0\.1|\[?::1\]?)$/.test(window.location.hostname);
const Agentation = import.meta.env.DEV
  ? lazy(() => import("agentation").then((m) => ({ default: m.Agentation })))
  : () => null;

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
        <Route path="/" component={MarketingHome} />
        <Route path="/login" component={Login} />
        
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
        
        <Route path="/indexing">
          <AppLayout><Indexing /></AppLayout>
        </Route>
        
        <Route path="/admin">
          <AppLayout><AdminDashboard /></AppLayout>
        </Route>
        
        <Route path="/pricing">
          <AppLayout><Pricing /></AppLayout>
        </Route>

        
        <Route path="/profile">
          <AppLayout><Profile /></AppLayout>
        </Route>
        
        <Route path="/settings">
          <AppLayout><Settings /></AppLayout>
        </Route>

        <Route component={NotFound} />
      </Switch>
    </Suspense>
  );
}

function App() {
  const base = import.meta.env.BASE_URL?.replace(/\/$/, "") || "";
  useSmoothScroll();

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={base}>
          <AppRouter />
        </WouterRouter>
        <Toaster />
        {import.meta.env.DEV && isLocalhost && (
          <Suspense fallback={null}>
            <Agentation />
          </Suspense>
        )}
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
