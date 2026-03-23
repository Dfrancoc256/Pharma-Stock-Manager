import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useEffect, lazy, Suspense } from "react";
import NotFound from "@/pages/not-found";
import POSPage from "@/pages/pos";
import InventoryPage from "@/pages/inventory";
import FiadoresPage from "@/pages/fiadores";
import BalancesPage from "@/pages/balances";
import UsersPage from "@/pages/users";
import ImportarPage from "@/pages/importar";
import LoginPage from "@/pages/login";
import { useAuth } from "@/hooks/use-auth";

// Lazy-load Dashboard so recharts (and all d3 deps) are in a separate async chunk.
// This prevents the Rollup TDZ circular-reference error in production builds.
const DashboardPage = lazy(() => import("@/pages/dashboard"));

function AppRouter() {
  const { isLoading, isAuthenticated } = useAuth();
  const [location, setLocation] = useLocation();

  useEffect(() => {
    if (!isLoading && !isAuthenticated && location !== "/login") {
      setLocation("/login");
    }
  }, [isAuthenticated, isLoading, location, setLocation]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-50 to-emerald-50">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-primary" />
          <p className="text-sm text-muted-foreground">Cargando...</p>
        </div>
      </div>
    );
  }

  return (
    <Switch>
      <Route path="/login" component={LoginPage} />
      <Route path="/">
        <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-primary" /></div>}>
          <DashboardPage />
        </Suspense>
      </Route>
      <Route path="/pos" component={POSPage} />
      <Route path="/inventory" component={InventoryPage} />
      <Route path="/fiadores" component={FiadoresPage} />
      <Route path="/balances" component={BalancesPage} />
      <Route path="/users" component={UsersPage} />
      <Route path="/importar" component={ImportarPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <AppRouter />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
