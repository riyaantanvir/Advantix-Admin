import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { CalendarIcon, Users, Megaphone, DollarSign, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import Sidebar from "@/components/layout/Sidebar";

export default function Home() {
  const [dateFilter, setDateFilter] = useState("today");
  const [customDateRange, setCustomDateRange] = useState<{
    from?: Date;
    to?: Date;
  }>({});
  const [showCustomCalendar, setShowCustomCalendar] = useState(false);

  // Get user from localStorage
  const userStr = localStorage.getItem("user");
  const user = userStr ? JSON.parse(userStr) : null;

  // Mock data - in a real app, this would come from API based on the selected filter
  const summaryData = {
    totalClients: 124,
    totalAdAccounts: 347,
    totalCampaigns: 892,
    totalSpend: 156750.50,
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const handleDateFilterChange = (value: string) => {
    setDateFilter(value);
    if (value !== "custom") {
      setCustomDateRange({});
    }
  };

  const getDateRangeText = () => {
    if (dateFilter === "custom" && customDateRange.from) {
      if (customDateRange.to) {
        return `${format(customDateRange.from, "MMM dd")} - ${format(customDateRange.to, "MMM dd, yyyy")}`;
      }
      return format(customDateRange.from, "MMM dd, yyyy");
    }
    
    switch (dateFilter) {
      case "today":
        return "Today";
      case "yesterday":
        return "Yesterday";
      case "this_month":
        return "This Month";
      default:
        return "Select date range";
    }
  };

  return (
    <Sidebar>
      <div className="flex-1 overflow-auto">
        <div className="p-6">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              Dashboard
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Welcome back, {user?.username || "Admin"}! Here's your overview.
            </p>
          </div>

          {/* Filter Bar */}
          <div className="mb-8 bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Filter by:
                </span>
              </div>
              
              <div className="flex items-center gap-2">
                <Select value={dateFilter} onValueChange={handleDateFilterChange}>
                  <SelectTrigger className="w-40" data-testid="select-date-filter">
                    <SelectValue placeholder="Select period" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="today">Today</SelectItem>
                    <SelectItem value="yesterday">Yesterday</SelectItem>
                    <SelectItem value="this_month">This Month</SelectItem>
                    <SelectItem value="custom">Custom Range</SelectItem>
                  </SelectContent>
                </Select>

                {dateFilter === "custom" && (
                  <Popover open={showCustomCalendar} onOpenChange={setShowCustomCalendar}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-60 justify-start text-left font-normal",
                          !customDateRange.from && "text-muted-foreground"
                        )}
                        data-testid="button-custom-date-picker"
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {getDateRangeText()}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        initialFocus
                        mode="range"
                        defaultMonth={customDateRange?.from}
                        selected={{
                          from: customDateRange.from,
                          to: customDateRange.to,
                        }}
                        onSelect={(range) => {
                          setCustomDateRange(range || {});
                          if (range?.from && range?.to) {
                            setShowCustomCalendar(false);
                          }
                        }}
                        numberOfMonths={2}
                      />
                    </PopoverContent>
                  </Popover>
                )}
              </div>
              
              {/* Active filter display */}
              <div className="flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400">
                <span>Showing data for:</span>
                <span className="font-medium" data-testid="text-active-filter">
                  {getDateRangeText()}
                </span>
              </div>
            </div>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {/* Total Clients Card */}
            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Total Clients
                </CardTitle>
                <Users className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-900 dark:text-white" data-testid="stat-total-clients">
                  {summaryData.totalClients.toLocaleString()}
                </div>
                <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                  +12% from last period
                </p>
              </CardContent>
            </Card>

            {/* Total Ad Accounts Card */}
            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Total Ad Accounts
                </CardTitle>
                <TrendingUp className="h-4 w-4 text-green-600 dark:text-green-400" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-900 dark:text-white" data-testid="stat-total-ad-accounts">
                  {summaryData.totalAdAccounts.toLocaleString()}
                </div>
                <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                  +8% from last period
                </p>
              </CardContent>
            </Card>

            {/* Total Campaigns Card */}
            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Total Campaigns
                </CardTitle>
                <Megaphone className="h-4 w-4 text-purple-600 dark:text-purple-400" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-900 dark:text-white" data-testid="stat-total-campaigns">
                  {summaryData.totalCampaigns.toLocaleString()}
                </div>
                <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                  +15% from last period
                </p>
              </CardContent>
            </Card>

            {/* Total Spend Card */}
            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Total Spend
                </CardTitle>
                <DollarSign className="h-4 w-4 text-red-600 dark:text-red-400" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-900 dark:text-white" data-testid="stat-total-spend">
                  {formatCurrency(summaryData.totalSpend)}
                </div>
                <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                  +5% from last period
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Additional Dashboard Content */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Recent Activity Card */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg font-semibold text-gray-900 dark:text-white">
                  Recent Activity
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">New campaign created</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">2 hours ago</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">Client onboarded</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">4 hours ago</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                    <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">Work report submitted</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">6 hours ago</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions Card */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg font-semibold text-gray-900 dark:text-white">
                  Quick Actions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-3">
                  <Button 
                    variant="outline" 
                    className="h-20 flex-col gap-2"
                    data-testid="quick-action-new-campaign"
                  >
                    <Megaphone className="h-5 w-5" />
                    <span className="text-xs">New Campaign</span>
                  </Button>
                  <Button 
                    variant="outline" 
                    className="h-20 flex-col gap-2"
                    data-testid="quick-action-add-client"
                  >
                    <Users className="h-5 w-5" />
                    <span className="text-xs">Add Client</span>
                  </Button>
                  <Button 
                    variant="outline" 
                    className="h-20 flex-col gap-2"
                    data-testid="quick-action-salary-entry"
                  >
                    <DollarSign className="h-5 w-5" />
                    <span className="text-xs">Salary Entry</span>
                  </Button>
                  <Button 
                    variant="outline" 
                    className="h-20 flex-col gap-2"
                    data-testid="quick-action-work-report"
                  >
                    <TrendingUp className="h-5 w-5" />
                    <span className="text-xs">Work Report</span>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </Sidebar>
  );
}