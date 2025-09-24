import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Link, useLocation } from "wouter";
import { 
  Menu, 
  X,
  LayoutDashboard,
  Megaphone,
  Users,
  DollarSign,
  FileText,
  Settings,
  LogOut,
  User,
  ChevronDown,
  Wallet,
  PieChart,
  Briefcase,
  CreditCard,
  Calculator,
  BarChart3,
  Building2,
  Fish,
  ShoppingCart,
  Receipt,
  Package,
  Calendar,
  Truck,
  TrendingDown
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface SidebarProps {
  children: React.ReactNode;
}

export default function Sidebar({ children }: SidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [location, setLocation] = useLocation();
  const { toast } = useToast();

  // Load sidebar state from localStorage on mount
  useEffect(() => {
    const savedState = localStorage.getItem("sidebarCollapsed");
    if (savedState !== null) {
      setIsCollapsed(JSON.parse(savedState));
    }
  }, []);

  // Save sidebar state to localStorage when it changes
  const toggleSidebar = () => {
    const newState = !isCollapsed;
    setIsCollapsed(newState);
    localStorage.setItem("sidebarCollapsed", JSON.stringify(newState));
  };

  // Get user from localStorage
  const userStr = localStorage.getItem("user");
  const user = userStr ? JSON.parse(userStr) : null;

  const logoutMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/auth/logout", {});
      return response.json();
    },
    onSuccess: () => {
      localStorage.removeItem("authToken");
      localStorage.removeItem("user");
      
      // Dispatch custom event to notify auth state change
      window.dispatchEvent(new Event("auth-change"));
      
      toast({
        title: "Logged out successfully",
        description: "You have been signed out of Advantix Admin.",
      });
      
      setTimeout(() => {
        setLocation("/login");
      }, 1000);
    },
    onError: () => {
      // Even if logout fails on server, clear local storage
      localStorage.removeItem("authToken");
      localStorage.removeItem("user");
      
      // Dispatch custom event to notify auth state change
      window.dispatchEvent(new Event("auth-change"));
      
      setLocation("/login");
    },
  });

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  const menuItems = [
    { 
      href: "/", 
      icon: LayoutDashboard, 
      label: "Dashboard",
      testId: "nav-dashboard",
      pageKey: "dashboard"
    },
    { 
      href: "/campaigns", 
      icon: Megaphone, 
      label: "Campaign Management",
      testId: "nav-campaigns",
      pageKey: "campaigns"
    },
    { 
      href: "/clients", 
      icon: Users, 
      label: "Client Management",
      testId: "nav-clients",
      pageKey: "clients"
    },
    { 
      href: "/ad-accounts", 
      icon: Wallet, 
      label: "Ad Accounts",
      testId: "nav-ad-accounts",
      pageKey: "ad_accounts"
    },
    { 
      href: "/work-reports", 
      icon: FileText, 
      label: "Work Reports",
      testId: "nav-work-reports",
      pageKey: "work_reports"
    },
    {
      label: "Advantix Finance",
      icon: Building2,
      testId: "nav-finance",
      pageKey: "finance",
      isSection: true,
      subItems: [
        {
          href: "/finance/dashboard",
          icon: PieChart,
          label: "Advantix Dashboard",
          testId: "nav-finance-dashboard",
          pageKey: "finance"
        },
        {
          href: "/finance/projects",
          icon: Briefcase,
          label: "Projects",
          testId: "nav-finance-projects",
          pageKey: "finance"
        },
        {
          href: "/finance/payments",
          icon: CreditCard,
          label: "Payments",
          testId: "nav-finance-payments",
          pageKey: "finance"
        },
        {
          href: "/finance/expenses",
          icon: Calculator,
          label: "Expenses & Salaries",
          testId: "nav-finance-expenses",
          pageKey: "finance"
        },
        {
          href: "/finance/reports",
          icon: BarChart3,
          label: "Reports",
          testId: "nav-finance-reports",
          pageKey: "finance"
        }
      ]
    },
    {
      label: "Fishfire",
      icon: Fish,
      testId: "nav-fishfire",
      pageKey: "fishfire",
      isSection: true,
      subItems: [
        {
          href: "/fishfire/order-management",
          icon: ShoppingCart,
          label: "Order Management",
          testId: "nav-fishfire-orders",
          pageKey: "fishfire"
        },
        {
          href: "/fishfire/expense-management",
          icon: Receipt,
          label: "Expense Management",
          testId: "nav-fishfire-expenses",
          pageKey: "fishfire"
        },
        {
          href: "/fishfire/stock-report",
          icon: Package,
          label: "Stock Report",
          testId: "nav-fishfire-stock",
          pageKey: "fishfire"
        },
        {
          href: "/fishfire/daily-order",
          icon: Calendar,
          label: "Daily Order",
          testId: "nav-fishfire-daily-order",
          pageKey: "fishfire"
        },
        {
          href: "/fishfire/purchase",
          icon: Truck,
          label: "Purchase",
          testId: "nav-fishfire-purchase",
          pageKey: "fishfire"
        },
        {
          href: "/fishfire/daily-expense",
          icon: TrendingDown,
          label: "Daily Expense",
          testId: "nav-fishfire-daily-expense",
          pageKey: "fishfire"
        }
      ]
    },
    { 
      href: "/admin", 
      icon: Settings, 
      label: "Admin Panel",
      testId: "nav-admin",
      pageKey: "admin",
      superAdminOnly: true
    },
  ];

  // Check permissions for all menu items at top level (Rules of Hooks compliance)
  const dashboardPermission = useQuery({
    queryKey: [`/api/permissions/check/dashboard`],
    enabled: !!user && user.role !== 'super_admin',
    retry: false,
    select: (data: any) => data?.hasPermission ?? false,
    staleTime: 5 * 60 * 1000,
  });

  const campaignsPermission = useQuery({
    queryKey: [`/api/permissions/check/campaigns`],
    enabled: !!user && user.role !== 'super_admin',
    retry: false,
    select: (data: any) => data?.hasPermission ?? false,
    staleTime: 5 * 60 * 1000,
  });

  const clientsPermission = useQuery({
    queryKey: [`/api/permissions/check/clients`],
    enabled: !!user && user.role !== 'super_admin',
    retry: false,
    select: (data: any) => data?.hasPermission ?? false,
    staleTime: 5 * 60 * 1000,
  });

  const adAccountsPermission = useQuery({
    queryKey: [`/api/permissions/check/ad_accounts`],
    enabled: !!user && user.role !== 'super_admin',
    retry: false,
    select: (data: any) => data?.hasPermission ?? false,
    staleTime: 5 * 60 * 1000,
  });

  const workReportsPermission = useQuery({
    queryKey: [`/api/permissions/check/work_reports`],
    enabled: !!user && user.role !== 'super_admin',
    retry: false,
    select: (data: any) => data?.hasPermission ?? false,
    staleTime: 5 * 60 * 1000,
  });

  const financePermission = useQuery({
    queryKey: [`/api/permissions/check/finance`],
    enabled: !!user && user.role !== 'super_admin',
    retry: false,
    select: (data: any) => data?.hasPermission ?? false,
    staleTime: 5 * 60 * 1000,
  });

  const fishfirePermission = useQuery({
    queryKey: [`/api/permissions/check/fishfire`],
    enabled: !!user && user.role !== 'super_admin',
    retry: false,
    select: (data: any) => data?.hasPermission ?? false,
    staleTime: 5 * 60 * 1000,
  });

  // Helper function to get permission for each page
  const getPermissionForPage = (pageKey: string) => {
    switch (pageKey) {
      case 'dashboard': return dashboardPermission.data;
      case 'campaigns': return campaignsPermission.data;
      case 'clients': return clientsPermission.data;
      case 'ad_accounts': return adAccountsPermission.data;
      case 'work_reports': return workReportsPermission.data;
      case 'finance': return financePermission.data;
      case 'fishfire': return fishfirePermission.data;
      default: return false;
    }
  };

  const isActive = (href: string) => {
    if (href === "/") {
      return location === "/";
    }
    return location.startsWith(href);
  };

  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Sidebar */}
      <div className={cn(
        "bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 transition-all duration-300 flex flex-col",
        "md:relative md:translate-x-0",
        isCollapsed ? "w-16" : "w-64 md:w-64"
      )}>
        {/* Header */}
        <div className="flex items-center justify-between p-3 md:p-4 border-b border-gray-200 dark:border-gray-700">
          {!isCollapsed && (
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">
              Advantix Admin
            </h1>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleSidebar}
            className="h-8 w-8 p-0"
            data-testid="button-toggle-sidebar"
          >
            {isCollapsed ? (
              <Menu className="h-4 w-4" />
            ) : (
              <X className="h-4 w-4" />
            )}
          </Button>
        </div>

        {/* Navigation Menu */}
        <nav className="flex-1 p-4 space-y-2">
          {menuItems.map((item) => {
            const Icon = item.icon;
            
            // Hide pages for users without permission
            if (item.superAdminOnly && user?.role !== "super_admin") {
              return null;
            }
            
            // Handle section items with sub-menus (like Advantix Finance)
            if (item.isSection && item.subItems) {
              // Check permission for the section
              const hasPermission = getPermissionForPage(item.pageKey);
              const canAccess = user?.role === 'super_admin' || hasPermission;
              
              // Hide section if user doesn't have permission
              if (!canAccess) {
                return null;
              }
              if (isCollapsed) {
                // Collapsed view - show dropdown with sub-items
                return (
                  <DropdownMenu key={item.label}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <DropdownMenuTrigger asChild>
                          <Button 
                            variant="ghost" 
                            className="w-full justify-center px-2"
                            data-testid={item.testId}
                          >
                            <Icon className="h-5 w-5" />
                          </Button>
                        </DropdownMenuTrigger>
                      </TooltipTrigger>
                      <TooltipContent side="right">
                        <p>{item.label}</p>
                      </TooltipContent>
                    </Tooltip>
                    <DropdownMenuContent side="right" align="start">
                      {item.subItems.map((subItem) => (
                        <DropdownMenuItem key={subItem.href} asChild>
                          <Link href={subItem.href}>
                            <subItem.icon className="h-4 w-4 mr-2" />
                            {subItem.label}
                          </Link>
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                );
              } else {
                // Expanded view - show section header and sub-items
                return (
                  <div key={item.label} className="space-y-1">
                    <div className="px-3 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      {item.label}
                    </div>
                    {item.subItems.map((subItem) => {
                      const SubIcon = subItem.icon;
                      const active = isActive(subItem.href);
                      
                      return (
                        <Link 
                          href={subItem.href}
                          key={subItem.href}
                        >
                          <Button
                            variant={active ? "secondary" : "ghost"}
                            className={cn(
                              "w-full justify-start gap-3 transition-colors pl-6",
                              active && "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800"
                            )}
                            data-testid={subItem.testId}
                          >
                            <SubIcon className="h-4 w-4 flex-shrink-0" />
                            <span className="truncate">{subItem.label}</span>
                          </Button>
                        </Link>
                      );
                    })}
                  </div>
                );
              }
            }

            // Handle regular menu items
            if (!item.href) return null;
            
            const active = isActive(item.href);
            
            // Check individual permission for non-super-admin-only pages
            const hasPermission = getPermissionForPage(item.pageKey);
            
            // Super Admin always has access
            const canAccess = user?.role === 'super_admin' || hasPermission;
            
            // Hide page if user doesn't have permission
            if (!item.superAdminOnly && user?.role !== 'super_admin' && !canAccess) {
              return null;
            }
            // This avoids calling admin-only endpoints from the sidebar

            const menuButton = (
              <Link 
                href={item.href}
                key={item.href}
              >
                <Button
                  variant={active ? "secondary" : "ghost"}
                  className={cn(
                    "w-full justify-start gap-3 transition-colors",
                    isCollapsed && "justify-center px-2",
                    active && "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800"
                  )}
                  data-testid={item.testId}
                >
                  <Icon className="h-5 w-5 flex-shrink-0" />
                  {!isCollapsed && <span className="truncate">{item.label}</span>}
                </Button>
              </Link>
            );

            if (isCollapsed) {
              return (
                <Tooltip key={item.href}>
                  <TooltipTrigger asChild>
                    {menuButton}
                  </TooltipTrigger>
                  <TooltipContent side="right">
                    <p>{item.label}</p>
                  </TooltipContent>
                </Tooltip>
              );
            }

            return menuButton;
          })}
        </nav>

        {/* Profile Section */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700">
          {isCollapsed ? (
            <DropdownMenu>
              <Tooltip>
                <TooltipTrigger asChild>
                  <DropdownMenuTrigger asChild>
                    <Button 
                      variant="ghost" 
                      className="w-full justify-center px-2"
                      data-testid="button-profile-collapsed"
                    >
                      <User className="h-5 w-5" />
                    </Button>
                  </DropdownMenuTrigger>
                </TooltipTrigger>
                <TooltipContent side="right">
                  <p>Profile Menu</p>
                </TooltipContent>
              </Tooltip>
              <DropdownMenuContent side="right" align="end">
                <DropdownMenuItem className="cursor-pointer">
                  <Settings className="h-4 w-4 mr-2" />
                  Change Password
                </DropdownMenuItem>
                <DropdownMenuItem 
                  className="cursor-pointer text-red-600 dark:text-red-400"
                  onClick={handleLogout}
                  disabled={logoutMutation.isPending}
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  {logoutMutation.isPending ? "Logging out..." : "Logout"}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="ghost" 
                  className="w-full justify-between gap-2"
                  data-testid="button-profile-expanded"
                >
                  <div className="flex items-center gap-2">
                    <User className="h-5 w-5" />
                    <div className="text-left">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {user?.username || "Admin"}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">
                        {user?.role?.replace('_', ' ') || "Admin"}
                      </p>
                    </div>
                  </div>
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent side="top" align="start" className="w-48">
                <DropdownMenuItem className="cursor-pointer">
                  <Settings className="h-4 w-4 mr-2" />
                  Change Password
                </DropdownMenuItem>
                <DropdownMenuItem 
                  className="cursor-pointer text-red-600 dark:text-red-400"
                  onClick={handleLogout}
                  disabled={logoutMutation.isPending}
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  {logoutMutation.isPending ? "Logging out..." : "Logout"}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 min-h-0 flex flex-col">
        {children}
      </div>
    </div>
  );
}