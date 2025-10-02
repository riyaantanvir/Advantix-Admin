import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import Sidebar from "@/components/layout/Sidebar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { RefreshCw, TrendingUp, MousePointer, Eye, DollarSign, Target, BarChart3, CalendarIcon, Filter } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { format } from "date-fns";

interface AdAccount {
  id: string;
  name: string;
  accountId: string;
  platform: string;
}

interface AccountInsight {
  id: string;
  adAccountId: string;
  date: Date;
  spend: string;
  impressions: number;
  clicks: number;
  ctr: string;
  cpc: string;
  cpm: string;
  conversions?: number;
  conversionValue?: string;
  roas?: string;
}

interface CampaignInsight {
  id: string;
  adAccountId: string;
  campaignId: string;
  campaignName: string;
  date: Date;
  spend: string;
  impressions: number;
  clicks: number;
  ctr: string;
  cpc: string;
  conversions?: number;
  roas?: string;
}

export default function FBAdManagementPage() {
  const { toast } = useToast();
  const [selectedAccountId, setSelectedAccountId] = useState<string>("");
  const [startDate, setStartDate] = useState<Date>(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000));
  const [endDate, setEndDate] = useState<Date>(new Date());

  // Fetch Facebook ad accounts
  const { data: adAccounts = [], isLoading: accountsLoading } = useQuery<AdAccount[]>({
    queryKey: ["/api/facebook/ad-accounts"],
  });

  // Fetch account insights with date filtering
  const { data: accountInsights = [], isLoading: insightsLoading } = useQuery<AccountInsight[]>({
    queryKey: ["/api/facebook/insights", selectedAccountId, startDate.toISOString(), endDate.toISOString()],
    queryFn: async () => {
      const params = new URLSearchParams({
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      });
      const response = await fetch(`/api/facebook/insights/${selectedAccountId}?${params}`, {
        headers: {
          "Authorization": `Bearer ${localStorage.getItem("authToken")}`,
        },
      });
      if (!response.ok) throw new Error("Failed to fetch insights");
      return response.json();
    },
    enabled: !!selectedAccountId,
  });

  // Fetch campaign insights with date filtering
  const { data: campaignInsights = [], isLoading: campaignsLoading } = useQuery<CampaignInsight[]>({
    queryKey: ["/api/facebook/campaigns", selectedAccountId, startDate.toISOString(), endDate.toISOString()],
    queryFn: async () => {
      const params = new URLSearchParams({
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      });
      const response = await fetch(`/api/facebook/campaigns/${selectedAccountId}?${params}`, {
        headers: {
          "Authorization": `Bearer ${localStorage.getItem("authToken")}`,
        },
      });
      if (!response.ok) throw new Error("Failed to fetch campaigns");
      return response.json();
    },
    enabled: !!selectedAccountId,
  });

  // Sync data mutation
  const syncMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/facebook/sync/${selectedAccountId}`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${localStorage.getItem("authToken")}`,
        },
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Sync failed");
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Sync Successful",
        description: "Facebook ad data has been synchronized",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/facebook/insights"] });
      queryClient.invalidateQueries({ queryKey: ["/api/facebook/campaigns"] });
    },
    onError: (error: any) => {
      toast({
        title: "Sync Failed",
        description: error.message || "Failed to sync Facebook data",
        variant: "destructive",
      });
    },
  });

  // Calculate KPIs
  const calculateKPIs = () => {
    if (!accountInsights.length) {
      return {
        totalSpend: "0.00",
        totalImpressions: 0,
        totalClicks: 0,
        avgCTR: "0.00",
        avgCPC: "0.00",
        avgROAS: "0.00",
      };
    }

    const totalSpend = accountInsights.reduce((sum, insight) => sum + parseFloat(insight.spend || "0"), 0);
    const totalImpressions = accountInsights.reduce((sum, insight) => sum + (insight.impressions || 0), 0);
    const totalClicks = accountInsights.reduce((sum, insight) => sum + (insight.clicks || 0), 0);
    const avgCTR = totalImpressions > 0 ? ((totalClicks / totalImpressions) * 100).toFixed(2) : "0.00";
    const avgCPC = totalClicks > 0 ? (totalSpend / totalClicks).toFixed(2) : "0.00";
    
    const totalConversionValue = accountInsights.reduce((sum, insight) => 
      sum + parseFloat(insight.conversionValue || "0"), 0
    );
    const avgROAS = totalSpend > 0 ? (totalConversionValue / totalSpend).toFixed(2) : "0.00";

    return {
      totalSpend: totalSpend.toFixed(2),
      totalImpressions,
      totalClicks,
      avgCTR,
      avgCPC,
      avgROAS,
    };
  };

  const kpis = calculateKPIs();

  // Quick date range presets
  const setDatePreset = (preset: 'today' | 'yesterday' | 'last7days' | 'last30days' | 'thisMonth' | 'lastMonth') => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    switch (preset) {
      case 'today':
        setStartDate(today);
        setEndDate(new Date());
        break;
      case 'yesterday':
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        setStartDate(yesterday);
        setEndDate(yesterday);
        break;
      case 'last7days':
        const last7 = new Date(today);
        last7.setDate(last7.getDate() - 7);
        setStartDate(last7);
        setEndDate(new Date());
        break;
      case 'last30days':
        const last30 = new Date(today);
        last30.setDate(last30.getDate() - 30);
        setStartDate(last30);
        setEndDate(new Date());
        break;
      case 'thisMonth':
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        setStartDate(monthStart);
        setEndDate(new Date());
        break;
      case 'lastMonth':
        const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
        setStartDate(lastMonthStart);
        setEndDate(lastMonthEnd);
        break;
    }
  };

  return (
    <Sidebar>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Header */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                  </svg>
                  FB Ad Management
                </h1>
                <p className="text-gray-600 dark:text-gray-400">
                  Monitor and analyze Facebook advertising performance
                </p>
              </div>
              <div className="flex gap-3">
                <Select value={selectedAccountId} onValueChange={setSelectedAccountId}>
                  <SelectTrigger className="w-64" data-testid="select-fb-account">
                    <SelectValue placeholder="Select ad account" />
                  </SelectTrigger>
                  <SelectContent>
                    {adAccounts.map((account) => (
                      <SelectItem key={account.id} value={account.id}>
                        {account.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  onClick={() => syncMutation.mutate()}
                  disabled={!selectedAccountId || syncMutation.isPending}
                  data-testid="button-sync-fb-data"
                >
                  {syncMutation.isPending ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      Syncing...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Sync Data
                    </>
                  )}
                </Button>
              </div>
            </div>

            {/* Date Range Filter */}
            <Card>
              <CardContent className="p-4">
                <div className="space-y-3">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <Filter className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Filter by Date:</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" className="justify-start text-left font-normal" data-testid="button-start-date">
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {format(startDate, "MMM dd, yyyy")}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={startDate}
                            onSelect={(date) => date && setStartDate(date)}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <span className="text-gray-600 dark:text-gray-400">to</span>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" className="justify-start text-left font-normal" data-testid="button-end-date">
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {format(endDate, "MMM dd, yyyy")}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={endDate}
                            onSelect={(date) => date && setEndDate(date)}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                    <div className="flex-1" />
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      Showing data from <span className="font-semibold">{format(startDate, "MMM dd, yyyy")}</span> to <span className="font-semibold">{format(endDate, "MMM dd, yyyy")}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-600 dark:text-gray-400">Quick Select:</span>
                    <Button variant="outline" size="sm" onClick={() => setDatePreset('today')} data-testid="preset-today">
                      Today
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setDatePreset('yesterday')} data-testid="preset-yesterday">
                      Yesterday
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setDatePreset('last7days')} data-testid="preset-last7days">
                      Last 7 Days
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setDatePreset('last30days')} data-testid="preset-last30days">
                      Last 30 Days
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setDatePreset('thisMonth')} data-testid="preset-this-month">
                      This Month
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setDatePreset('lastMonth')} data-testid="preset-last-month">
                      Last Month
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {!selectedAccountId ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <BarChart3 className="w-16 h-16 text-gray-400 mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                  Select an Ad Account
                </h3>
                <p className="text-gray-600 dark:text-gray-400 text-center max-w-md">
                  Choose a Facebook ad account from the dropdown above to view performance metrics and insights
                </p>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Period Summary */}
              <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 border-blue-200 dark:border-blue-800">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-blue-900 dark:text-blue-100">
                    <CalendarIcon className="w-5 h-5" />
                    Period Summary
                  </CardTitle>
                  <CardDescription className="text-blue-700 dark:text-blue-300">
                    Results for {format(startDate, "MMM dd, yyyy")} - {format(endDate, "MMM dd, yyyy")}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                      <p className="text-sm text-blue-700 dark:text-blue-300 mb-1">Total Spend</p>
                      <p className="text-3xl font-bold text-blue-900 dark:text-blue-100">
                        ${kpis.totalSpend}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-blue-700 dark:text-blue-300 mb-1">Total Conversions</p>
                      <p className="text-3xl font-bold text-blue-900 dark:text-blue-100">
                        {accountInsights.reduce((sum, insight) => sum + (insight.conversions || 0), 0).toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-blue-700 dark:text-blue-300 mb-1">ROAS (Return on Ad Spend)</p>
                      <p className="text-3xl font-bold text-blue-900 dark:text-blue-100">
                        {kpis.avgROAS}x
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* KPI Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
                <Card data-testid="kpi-total-spend">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400 flex items-center gap-2">
                      <DollarSign className="w-4 h-4" />
                      Total Spend
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-gray-900 dark:text-white">
                      ${kpis.totalSpend}
                    </div>
                  </CardContent>
                </Card>

                <Card data-testid="kpi-impressions">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400 flex items-center gap-2">
                      <Eye className="w-4 h-4" />
                      Impressions
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-gray-900 dark:text-white">
                      {kpis.totalImpressions.toLocaleString()}
                    </div>
                  </CardContent>
                </Card>

                <Card data-testid="kpi-clicks">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400 flex items-center gap-2">
                      <MousePointer className="w-4 h-4" />
                      Clicks
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-gray-900 dark:text-white">
                      {kpis.totalClicks.toLocaleString()}
                    </div>
                  </CardContent>
                </Card>

                <Card data-testid="kpi-ctr">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400 flex items-center gap-2">
                      <Target className="w-4 h-4" />
                      Avg CTR
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-gray-900 dark:text-white">
                      {kpis.avgCTR}%
                    </div>
                  </CardContent>
                </Card>

                <Card data-testid="kpi-cpc">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400 flex items-center gap-2">
                      <DollarSign className="w-4 h-4" />
                      Avg CPC
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-gray-900 dark:text-white">
                      ${kpis.avgCPC}
                    </div>
                  </CardContent>
                </Card>

                <Card data-testid="kpi-roas">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400 flex items-center gap-2">
                      <TrendingUp className="w-4 h-4" />
                      Avg ROAS
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-gray-900 dark:text-white">
                      {kpis.avgROAS}x
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Data Tables */}
              <Tabs defaultValue="account" className="space-y-4">
                <TabsList>
                  <TabsTrigger value="account">Account Insights</TabsTrigger>
                  <TabsTrigger value="campaigns">Campaign Insights</TabsTrigger>
                </TabsList>

                <TabsContent value="account" className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>Account Performance</CardTitle>
                      <CardDescription>Daily performance metrics for the selected ad account</CardDescription>
                    </CardHeader>
                    <CardContent>
                      {insightsLoading ? (
                        <div className="text-center py-8 text-gray-600 dark:text-gray-400">
                          Loading insights...
                        </div>
                      ) : accountInsights.length === 0 ? (
                        <div className="text-center py-8 text-gray-600 dark:text-gray-400">
                          No data available. Click "Sync Data" to fetch the latest insights.
                        </div>
                      ) : (
                        <div className="overflow-x-auto">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Date</TableHead>
                                <TableHead className="text-right">Spend</TableHead>
                                <TableHead className="text-right">Impressions</TableHead>
                                <TableHead className="text-right">Clicks</TableHead>
                                <TableHead className="text-right">CTR</TableHead>
                                <TableHead className="text-right">CPC</TableHead>
                                <TableHead className="text-right">CPM</TableHead>
                                <TableHead className="text-right">ROAS</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {accountInsights.map((insight) => (
                                <TableRow key={insight.id} data-testid={`insight-row-${insight.id}`}>
                                  <TableCell>{new Date(insight.date).toLocaleDateString()}</TableCell>
                                  <TableCell className="text-right">${parseFloat(insight.spend).toFixed(2)}</TableCell>
                                  <TableCell className="text-right">{insight.impressions.toLocaleString()}</TableCell>
                                  <TableCell className="text-right">{insight.clicks.toLocaleString()}</TableCell>
                                  <TableCell className="text-right">{parseFloat(insight.ctr).toFixed(2)}%</TableCell>
                                  <TableCell className="text-right">${parseFloat(insight.cpc).toFixed(2)}</TableCell>
                                  <TableCell className="text-right">${parseFloat(insight.cpm).toFixed(2)}</TableCell>
                                  <TableCell className="text-right">{insight.roas ? `${parseFloat(insight.roas).toFixed(2)}x` : '-'}</TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="campaigns" className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>Campaign Performance</CardTitle>
                      <CardDescription>Performance metrics by campaign</CardDescription>
                    </CardHeader>
                    <CardContent>
                      {campaignsLoading ? (
                        <div className="text-center py-8 text-gray-600 dark:text-gray-400">
                          Loading campaigns...
                        </div>
                      ) : campaignInsights.length === 0 ? (
                        <div className="text-center py-8 text-gray-600 dark:text-gray-400">
                          No campaign data available. Click "Sync Data" to fetch the latest insights.
                        </div>
                      ) : (
                        <div className="overflow-x-auto">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Campaign</TableHead>
                                <TableHead>Date</TableHead>
                                <TableHead className="text-right">Spend</TableHead>
                                <TableHead className="text-right">Impressions</TableHead>
                                <TableHead className="text-right">Clicks</TableHead>
                                <TableHead className="text-right">CTR</TableHead>
                                <TableHead className="text-right">CPC</TableHead>
                                <TableHead className="text-right">ROAS</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {campaignInsights.map((campaign) => (
                                <TableRow key={campaign.id} data-testid={`campaign-row-${campaign.id}`}>
                                  <TableCell className="font-medium">{campaign.campaignName}</TableCell>
                                  <TableCell>{new Date(campaign.date).toLocaleDateString()}</TableCell>
                                  <TableCell className="text-right">${parseFloat(campaign.spend).toFixed(2)}</TableCell>
                                  <TableCell className="text-right">{campaign.impressions.toLocaleString()}</TableCell>
                                  <TableCell className="text-right">{campaign.clicks.toLocaleString()}</TableCell>
                                  <TableCell className="text-right">{parseFloat(campaign.ctr).toFixed(2)}%</TableCell>
                                  <TableCell className="text-right">${parseFloat(campaign.cpc).toFixed(2)}</TableCell>
                                  <TableCell className="text-right">{campaign.roas ? `${parseFloat(campaign.roas).toFixed(2)}x` : '-'}</TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </>
          )}
        </div>
      </div>
    </Sidebar>
  );
}
