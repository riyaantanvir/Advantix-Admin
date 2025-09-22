import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { DollarSign, TrendingUp, TrendingDown, Calculator, Building2, ArrowUpDown } from "lucide-react";
import { formatDistance } from "date-fns";
import Sidebar from "@/components/layout/Sidebar";

interface DashboardData {
  summary: {
    totalPaymentsUSD: number;
    totalPaymentsBDT: number;
    totalExpensesUSD: number;
    totalExpensesBDT: number;
    availableBalanceUSD: number;
    availableBalanceBDT: number;
    exchangeRate: number;
    // Legacy fields for backwards compatibility
    totalFundUSD: number;
    totalFundBDT: number;
    totalSalariesBDT: number;
    netBalanceBDT: number;
  };
  charts: {
    paymentsByMonth: Record<string, number>;
    expensesByMonth: Record<string, { expenses: number; salaries: number }>;
  };
  counts: {
    totalProjects: number;
    activeProjects: number;
    totalPayments: number;
    totalExpenses: number;
  };
}

export default function FinanceDashboard() {
  const [timePeriod, setTimePeriod] = useState("month");

  const { data: dashboardData, isLoading } = useQuery<DashboardData>({
    queryKey: ["/api/finance/dashboard", { period: timePeriod }],
  });

  const formatCurrency = (amount: number, currency: "USD" | "BDT") => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency,
      minimumFractionDigits: currency === "BDT" ? 0 : 2,
    }).format(amount);
  };

  const summaryCards = useMemo(() => {
    if (!dashboardData) return [];

    const { summary } = dashboardData;

    return [
      {
        title: "Total Client Payments (USD)",
        value: formatCurrency(summary.totalPaymentsUSD, "USD"),
        description: `≈ ${formatCurrency(summary.totalPaymentsBDT, "BDT")}`,
        icon: TrendingUp,
        trend: summary.totalPaymentsUSD > 0 ? "up" : "neutral",
        bgColor: "bg-blue-50 dark:bg-blue-900/10",
        iconColor: "text-blue-600 dark:text-blue-400",
      },
      {
        title: "Total Expenses (BDT)",
        value: formatCurrency(summary.totalExpensesBDT, "BDT"),
        description: `≈ ${formatCurrency(summary.totalExpensesUSD, "USD")}`,
        icon: TrendingDown,
        trend: "down",
        bgColor: "bg-red-50 dark:bg-red-900/10",
        iconColor: "text-red-600 dark:text-red-400",
      },
      {
        title: "Available Balance (USD)",
        value: formatCurrency(summary.availableBalanceUSD, "USD"),
        description: `≈ ${formatCurrency(summary.availableBalanceBDT, "BDT")}`,
        icon: DollarSign,
        trend: summary.availableBalanceUSD >= 0 ? "up" : "down",
        bgColor: summary.availableBalanceUSD >= 0 ? "bg-emerald-50 dark:bg-emerald-900/10" : "bg-red-50 dark:bg-red-900/10",
        iconColor: summary.availableBalanceUSD >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400",
      },
    ];
  }, [dashboardData]);

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="space-y-4">
          <div className="h-8 bg-gray-200 rounded animate-pulse" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded animate-pulse" />
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="h-96 bg-gray-200 rounded animate-pulse" />
            <div className="h-96 bg-gray-200 rounded animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <Sidebar>
      <div className="flex-1 overflow-auto">
        <div className="container mx-auto p-6 space-y-6" data-testid="page-finance-dashboard">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Advantix Finance Dashboard
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Financial overview and performance metrics
          </p>
        </div>
        
        {/* Time Period Filter */}
        <div className="flex items-center gap-2">
          <Select value={timePeriod} onValueChange={setTimePeriod}>
            <SelectTrigger className="w-48" data-testid="filter-time-period">
              <SelectValue placeholder="Select time period" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="yesterday">Yesterday</SelectItem>
              <SelectItem value="week">This Week</SelectItem>
              <SelectItem value="month">This Month</SelectItem>
              <SelectItem value="custom">Custom Range</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {summaryCards.map((card, index) => {
          const Icon = card.icon;
          return (
            <Card key={index} className={`${card.bgColor} border-0`}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {card.title}
                </CardTitle>
                <Icon className={`h-5 w-5 ${card.iconColor}`} />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-900 dark:text-white">
                  {card.value}
                </div>
                <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                  {card.description}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Available Balance Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            Available Balance
          </CardTitle>
          <CardDescription>
            Total Client Payments - Total Expenses
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* USD Column */}
              <div className="space-y-3">
                <h4 className="font-semibold text-gray-700 dark:text-gray-300">USD Currency</h4>
                <div className="space-y-2">
                  <div className="flex justify-between items-center py-2 border-b border-gray-200 dark:border-gray-700">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Total Client Payments</span>
                    <span className="text-sm font-semibold text-green-600" data-testid="text-total-payments-usd">
                      {formatCurrency(dashboardData?.summary.totalPaymentsUSD || 0, "USD")}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-gray-200 dark:border-gray-700">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Total Expenses</span>
                    <span className="text-sm font-semibold text-red-600" data-testid="text-total-expenses-usd">
                      -{formatCurrency(dashboardData?.summary.totalExpensesUSD || 0, "USD")}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-3 bg-gray-50 dark:bg-gray-800 px-3 rounded-lg">
                    <span className="font-semibold text-gray-900 dark:text-white">Available Balance</span>
                    <span className={`font-bold text-lg ${(dashboardData?.summary.availableBalanceUSD || 0) >= 0 ? 'text-emerald-600' : 'text-red-600'}`} data-testid="text-available-balance-usd">
                      {formatCurrency(dashboardData?.summary.availableBalanceUSD || 0, "USD")}
                    </span>
                  </div>
                </div>
              </div>

              {/* BDT Column */}
              <div className="space-y-3">
                <h4 className="font-semibold text-gray-700 dark:text-gray-300">BDT Currency</h4>
                <div className="space-y-2">
                  <div className="flex justify-between items-center py-2 border-b border-gray-200 dark:border-gray-700">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Total Client Payments</span>
                    <span className="text-sm font-semibold text-green-600" data-testid="text-total-payments-bdt">
                      {formatCurrency(dashboardData?.summary.totalPaymentsBDT || 0, "BDT")}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-gray-200 dark:border-gray-700">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Total Expenses</span>
                    <span className="text-sm font-semibold text-red-600" data-testid="text-total-expenses-bdt">
                      -{formatCurrency(dashboardData?.summary.totalExpensesBDT || 0, "BDT")}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-3 bg-gray-50 dark:bg-gray-800 px-3 rounded-lg">
                    <span className="font-semibold text-gray-900 dark:text-white">Available Balance</span>
                    <span className={`font-bold text-lg ${(dashboardData?.summary.availableBalanceBDT || 0) >= 0 ? 'text-emerald-600' : 'text-red-600'}`} data-testid="text-available-balance-bdt">
                      {formatCurrency(dashboardData?.summary.availableBalanceBDT || 0, "BDT")}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Exchange Rate */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ArrowUpDown className="h-5 w-5" />
            Exchange Rate
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="text-2xl font-bold">
              1 USD = {dashboardData?.summary.exchangeRate || 110} BDT
            </div>
            <Badge variant="secondary">Current Rate</Badge>
          </div>
        </CardContent>
      </Card>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Payments Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Client Payments (USD)</CardTitle>
            <CardDescription>Monthly payment trends</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2" data-testid="chart-payments">
              {dashboardData?.charts.paymentsByMonth && Object.entries(dashboardData.charts.paymentsByMonth).map(([month, amount]) => (
                <div key={month} className="flex justify-between items-center py-2 border-b">
                  <span className="text-sm font-medium">{month}</span>
                  <span className="text-sm font-bold text-green-600">{formatCurrency(amount, "USD")}</span>
                </div>
              ))}
              {(!dashboardData?.charts.paymentsByMonth || Object.keys(dashboardData.charts.paymentsByMonth).length === 0) && (
                <div className="text-center py-8 text-gray-500">
                  No payment data available
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Expenses & Salaries Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Expenses & Salaries (BDT)</CardTitle>
            <CardDescription>Monthly expense trends</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2" data-testid="chart-expenses">
              {dashboardData?.charts.expensesByMonth && Object.entries(dashboardData.charts.expensesByMonth).map(([month, data]) => (
                <div key={month} className="space-y-1">
                  <div className="flex justify-between items-center py-2 border-b">
                    <span className="text-sm font-medium">{month}</span>
                  </div>
                  <div className="pl-4 space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-red-600">Expenses:</span>
                      <span className="font-medium">{formatCurrency(data.expenses, "BDT")}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-orange-600">Salaries:</span>
                      <span className="font-medium">{formatCurrency(data.salaries, "BDT")}</span>
                    </div>
                  </div>
                </div>
              ))}
              {(!dashboardData?.charts.expensesByMonth || Object.keys(dashboardData.charts.expensesByMonth).length === 0) && (
                <div className="text-center py-8 text-gray-500">
                  No expense data available
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600">
                {dashboardData?.counts.totalProjects || 0}
              </div>
              <div className="text-sm text-gray-600">Total Projects</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600">
                {dashboardData?.counts.activeProjects || 0}
              </div>
              <div className="text-sm text-gray-600">Active Projects</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-purple-600">
                {dashboardData?.counts.totalPayments || 0}
              </div>
              <div className="text-sm text-gray-600">Total Payments</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-orange-600">
                {dashboardData?.counts.totalExpenses || 0}
              </div>
              <div className="text-sm text-gray-600">Total Expenses</div>
            </div>
          </CardContent>
        </Card>
      </div>
        </div>
      </div>
    </Sidebar>
  );
}