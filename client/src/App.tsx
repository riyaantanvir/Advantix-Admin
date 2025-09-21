import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useEffect, useState } from "react";
import Login from "@/pages/login";
import Home from "@/pages/home";
import CampaignsPage from "@/pages/campaigns";
import CampaignDetailsPage from "@/pages/campaign-details";
import ClientsPage from "@/pages/clients";
import AdAccountsPage from "@/pages/ad-accounts";
import WorkReportsPage from "@/pages/work-reports";
import AdminPage from "@/pages/admin";
import NotFound from "@/pages/not-found";

function AuthenticatedRoute({ component: Component }: { component: React.ComponentType }) {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    const checkAuth = () => {
      const token = localStorage.getItem("authToken");
      setIsAuthenticated(!!token);
    };

    // Check authentication on mount
    checkAuth();

    // Listen for storage changes (when token is added/removed)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "authToken") {
        checkAuth();
      }
    };

    // Listen for custom event when login happens in same tab
    const handleAuthChange = () => {
      checkAuth();
    };

    window.addEventListener("storage", handleStorageChange);
    window.addEventListener("auth-change", handleAuthChange);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("auth-change", handleAuthChange);
    };
  }, []);

  if (isAuthenticated === null) {
    // Loading state
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Login />;
  }

  return <Component />;
}

function Router() {
  return (
    <Switch>
      <Route path="/login" component={Login} />
      <Route path="/campaigns/:id" component={() => <AuthenticatedRoute component={CampaignDetailsPage} />} />
      <Route path="/campaigns" component={() => <AuthenticatedRoute component={CampaignsPage} />} />
      <Route path="/clients" component={() => <AuthenticatedRoute component={ClientsPage} />} />
      <Route path="/ad-accounts" component={() => <AuthenticatedRoute component={AdAccountsPage} />} />
      <Route path="/work-reports" component={() => <AuthenticatedRoute component={WorkReportsPage} />} />
      <Route path="/admin" component={() => <AuthenticatedRoute component={AdminPage} />} />
      <Route path="/" component={() => <AuthenticatedRoute component={Home} />} />
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
