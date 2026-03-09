import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";

import POSPage from "./pages/pos";
import InventoryPage from "./pages/inventory";
import ClientsPage from "./pages/clients";
import ExpensesPage from "./pages/expenses";
import CashRegisterPage from "./pages/cash-register";
import UsersPage from "./pages/users";

function Router() {
  return (
    <Switch>
      <Route path="/" component={POSPage} />
      <Route path="/inventory" component={InventoryPage} />
      <Route path="/clients" component={ClientsPage} />
      <Route path="/expenses" component={ExpensesPage} />
      <Route path="/register" component={CashRegisterPage} />
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
