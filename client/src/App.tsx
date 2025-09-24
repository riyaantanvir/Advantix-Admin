import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Login from "@/pages/login";
import Home from "@/pages/home";
import CampaignsPage from "@/pages/campaigns";
import CampaignDetailsPage from "@/pages/campaign-details";
import ClientsPage from "@/pages/clients";
import AdAccountsPage from "@/pages/ad-accounts";
import WorkReportsPage from "@/pages/work-reports";
import AdminPage from "@/pages/admin";
import FinanceDashboard from "@/pages/finance-dashboard";
import FinanceProjects from "@/pages/finance-projects";
import FinancePayments from "@/pages/finance-payments";
import FinanceExpenses from "@/pages/finance-expenses";
import FinanceReports from "@/pages/finance-reports";
import FishfireOrderManagementPage from "@/pages/fishfire-order-management";
import FishfireExpenseManagementPage from "@/pages/fishfire-expense-management";
import FishfireStockReportPage from "@/pages/fishfire-stock-report";
import FishfireDailyOrderPage from "@/pages/fishfire-daily-order";
import FishfirePurchasePage from "@/pages/fishfire-purchase";
import FishfireDailyExpensePage from "@/pages/fishfire-daily-expense";
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

// Protected route with permission checking
function ProtectedRoute({ component: Component, pageKey }: { component: React.ComponentType, pageKey: string }) {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const checkAuth = () => {
      const token = localStorage.getItem("authToken");
      const userStr = localStorage.getItem("user");
      setIsAuthenticated(!!token);
      setUser(userStr ? JSON.parse(userStr) : null);
    };

    checkAuth();

    // Listen for auth changes
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "authToken" || e.key === "user") {
        checkAuth();
      }
    };

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

  // Check page permissions
  const { data: hasPermission, isLoading: permissionLoading, isError } = useQuery({
    queryKey: [`/api/permissions/check/${pageKey}`],
    enabled: !!isAuthenticated && !!user,
    retry: false,
    select: (data: any) => data?.hasPermission ?? false,
  });

  if (isAuthenticated === null || (isAuthenticated && permissionLoading)) {
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

  // Super Admin bypass only for admin page (emergency access)
  if (user?.role === 'super_admin' && pageKey === 'admin') {
    return <Component />;
  }

  // Check if user has permission for this page
  if (isError || !hasPermission) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-red-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-8">
          <div className="text-red-500 text-6xl mb-4">🔒</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h1>
          <p className="text-gray-600 mb-4">
            You don't have permission to access this page. Please contact your administrator if you believe this is an error.
          </p>
          <button 
            onClick={() => window.history.back()} 
            className="text-blue-600 hover:text-blue-800 font-medium"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return <Component />;
}

function Router() {
  return (
    <Switch>
      <Route path="/login" component={Login} />
      <Route path="/campaigns/:id" component={() => <ProtectedRoute component={CampaignDetailsPage} pageKey="campaigns" />} />
      <Route path="/campaigns" component={() => <ProtectedRoute component={CampaignsPage} pageKey="campaigns" />} />
      <Route path="/clients" component={() => <ProtectedRoute component={ClientsPage} pageKey="clients" />} />
      <Route path="/ad-accounts" component={() => <ProtectedRoute component={AdAccountsPage} pageKey="ad_accounts" />} />
      <Route path="/work-reports" component={() => <ProtectedRoute component={WorkReportsPage} pageKey="work_reports" />} />
      <Route path="/finance/dashboard" component={() => <ProtectedRoute component={FinanceDashboard} pageKey="finance" />} />
      <Route path="/finance/projects" component={() => <ProtectedRoute component={FinanceProjects} pageKey="finance" />} />
      <Route path="/finance/payments" component={() => <ProtectedRoute component={FinancePayments} pageKey="finance" />} />
      <Route path="/finance/expenses" component={() => <ProtectedRoute component={FinanceExpenses} pageKey="finance" />} />
      <Route path="/finance/reports" component={() => <ProtectedRoute component={FinanceReports} pageKey="finance" />} />
      <Route path="/fishfire/order-management" component={() => <ProtectedRoute component={FishfireOrderManagementPage} pageKey="fishfire" />} />
      <Route path="/fishfire/expense-management" component={() => <ProtectedRoute component={FishfireExpenseManagementPage} pageKey="fishfire" />} />
      <Route path="/fishfire/stock-report" component={() => <ProtectedRoute component={FishfireStockReportPage} pageKey="fishfire" />} />
      <Route path="/fishfire/daily-order" component={() => <ProtectedRoute component={FishfireDailyOrderPage} pageKey="fishfire" />} />
      <Route path="/fishfire/purchase" component={() => <ProtectedRoute component={FishfirePurchasePage} pageKey="fishfire" />} />
      <Route path="/fishfire/daily-expense" component={() => <ProtectedRoute component={FishfireDailyExpensePage} pageKey="fishfire" />} />
      <Route path="/admin" component={() => <ProtectedRoute component={AdminPage} pageKey="admin" />} />
      <Route path="/" component={() => <ProtectedRoute component={Home} pageKey="dashboard" />} />
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
