import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import POSPage from "@/pages/pos";
import InventoryPage from "@/pages/inventory";
import ClientsPage from "@/pages/clients";
import ExpensesPage from "@/pages/expenses";
import CashRegisterPage from "@/pages/cash-register";
import UsersPage from "@/pages/users";
import LoginPage from "@/pages/login";
import { useAuth } from "@/hooks/use-auth";
import { useEffect } from "react";

function Router() {
  const { user, isLoading, isAuthenticated } = useAuth();
  const [location, setLocation] = useLocation();

  useEffect(() => {
    if (!isLoading && !isAuthenticated && location !== "/login") {
      setLocation("/login");
    }
  }, [isAuthenticated, isLoading, location, setLocation]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <Switch>
      <Route path="/login" component={LoginPage} />
      <Route path="/" component={POSPage} />
      <Route path="/inventory" component={InventoryPage} />
      <Route path="/clients" component={ClientsPage} />
      <Route path="/expenses" component={ExpensesPage} />
      <Route path="/cash-register" component={CashRegisterPage} />
      <Route path="/users" component={UsersPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
