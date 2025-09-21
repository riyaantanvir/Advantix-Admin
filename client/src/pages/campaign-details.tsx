import { useState, useEffect } from "react";
import { useRoute, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import Sidebar from "@/components/layout/Sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { 
  ArrowLeft, 
  Calendar, 
  FileText, 
  Info, 
  Edit3,
  MessageSquare,
  History,
  DollarSign,
  Target,
  TrendingUp,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import { format } from "date-fns";
import type { Campaign, AdAccount, Client } from "@shared/schema";
import { cn } from "@/lib/utils";

interface DailySpend {
  date: string;
  amount: number;
}

interface CampaignHistory {
  id: string;
  date: string;
  type: "comment" | "edit" | "system";
  field?: string;
  oldValue?: string;
  newValue?: string;
  comment?: string;
  user: string;
}

const statusColors = {
  active: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
  paused: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
  completed: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
  draft: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300",
};

export default function CampaignDetailsPage() {
  const [, params] = useRoute("/campaigns/:id");
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("summary");
  const [newComment, setNewComment] = useState("");
  const [editingDay, setEditingDay] = useState<string | null>(null);
  const [editingSpend, setEditingSpend] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  
  const campaignId = params?.id;

  // Fetch campaign details
  const { data: campaign, isLoading: campaignLoading } = useQuery<Campaign>({
    queryKey: ["/api/campaigns", campaignId],
    enabled: !!campaignId,
  });

  // Fetch clients and ad accounts for display
  const { data: clients = [] } = useQuery<Client[]>({
    queryKey: ["/api/clients"],
  });

  const { data: adAccounts = [] } = useQuery<AdAccount[]>({
    queryKey: ["/api/ad-accounts"],
  });

  // Mock daily spend data (in real app, this would come from API)
  const [dailySpends, setDailySpends] = useState<DailySpend[]>(() => {
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      days.push({
        date: date.toISOString().split('T')[0],
        amount: Math.random() * 200 + 50, // Random amount for demo
      });
    }
    return days;
  });

  // Mock campaign history (in real app, this would come from API)
  const [campaignHistory] = useState<CampaignHistory[]>([
    {
      id: "1",
      date: new Date().toISOString(),
      type: "comment",
      comment: "Campaign performing well, will increase budget next week",
      user: "Admin",
    },
    {
      id: "2",
      date: new Date(Date.now() - 86400000).toISOString(),
      type: "edit",
      field: "Budget",
      oldValue: "$1,000",
      newValue: "$1,500",
      user: "Admin",
    },
    {
      id: "3",
      date: new Date(Date.now() - 172800000).toISOString(),
      type: "system",
      field: "Status",
      oldValue: "Draft",
      newValue: "Active",
      user: "System",
    },
  ]);

  const getClientName = (clientId: string | null) => {
    if (!clientId) return "No Client";
    const client = clients.find(c => c.id === clientId);
    return client?.clientName || "Unknown Client";
  };

  const getAdAccountName = (adAccountId: string | null) => {
    if (!adAccountId) return "No Ad Account";
    const adAccount = adAccounts.find(a => a.id === adAccountId);
    return adAccount ? `${adAccount.accountName} (${adAccount.platform})` : "Unknown Ad Account";
  };

  const getAdAccountAvailableBalance = (adAccountId: string | null) => {
    if (!adAccountId) return 0;
    const adAccount = adAccounts.find(a => a.id === adAccountId);
    if (!adAccount) return 0;
    const spendLimit = parseFloat(adAccount.spendLimit || "0");
    const totalSpend = parseFloat(adAccount.totalSpend || "0");
    return spendLimit - totalSpend;
  };

  const formatCurrency = (amount: number | string) => {
    const numAmount = typeof amount === "string" ? parseFloat(amount) : amount;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(numAmount);
  };

  const totalCalendarSpend = dailySpends.reduce((sum, day) => sum + day.amount, 0);

  // Update campaign status mutation
  const updateCampaignStatusMutation = useMutation({
    mutationFn: async (status: string) => {
      const response = await apiRequest("PUT", `/api/campaigns/${campaignId}`, { status });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/campaigns", campaignId] });
      queryClient.invalidateQueries({ queryKey: ["/api/campaigns"] });
      toast({
        title: "Success!",
        description: "Campaign status updated successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update campaign status.",
        variant: "destructive",
      });
    },
  });

  // Add comment mutation (mock - in real app would call API)
  const addCommentMutation = useMutation({
    mutationFn: async (comment: string) => {
      setIsLoading(true);
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      return { comment };
    },
    onSuccess: () => {
      setIsLoading(false);
      setNewComment("");
      toast({
        title: "Success!",
        description: "Comment added successfully.",
      });
    },
    onError: () => {
      setIsLoading(false);
      toast({
        title: "Error",
        description: "Failed to add comment.",
        variant: "destructive",
      });
    },
  });

  // Update daily spend mutation (mock)
  const updateDailySpendMutation = useMutation({
    mutationFn: async ({ date, amount }: { date: string; amount: number }) => {
      setIsLoading(true);
      await new Promise(resolve => setTimeout(resolve, 1000));
      return { date, amount };
    },
    onSuccess: (data) => {
      setIsLoading(false);
      setDailySpends(prev => 
        prev.map(day => 
          day.date === data.date ? { ...day, amount: data.amount } : day
        )
      );
      setEditingDay(null);
      setEditingSpend("");
      toast({
        title: "Success!",
        description: "Daily spend updated successfully.",
      });
    },
    onError: () => {
      setIsLoading(false);
      toast({
        title: "Error",
        description: "Failed to update daily spend.",
        variant: "destructive",
      });
    },
  });

  const handleAddComment = () => {
    if (!newComment.trim()) {
      toast({
        title: "Error",
        description: "Please enter a comment.",
        variant: "destructive",
      });
      return;
    }
    addCommentMutation.mutate(newComment);
  };

  const handleEditDaySpend = (date: string, currentAmount: number) => {
    setEditingDay(date);
    setEditingSpend(currentAmount.toString());
  };

  const handleSaveDaySpend = () => {
    const amount = parseFloat(editingSpend);
    if (isNaN(amount) || amount < 0) {
      toast({
        title: "Error",
        description: "Please enter a valid amount.",
        variant: "destructive",
      });
      return;
    }
    
    if (editingDay) {
      updateDailySpendMutation.mutate({ date: editingDay, amount });
    }
  };

  const canEditDay = (date: string) => {
    const dayDate = new Date(date);
    const fiveDaysAgo = new Date();
    fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5);
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    
    return dayDate >= fiveDaysAgo && dayDate <= today;
  };

  const isToday = (date: string) => {
    const dayDate = new Date(date);
    const today = new Date();
    return dayDate.toDateString() === today.toDateString();
  };

  const isFutureDay = (date: string) => {
    const dayDate = new Date(date);
    const today = new Date();
    return dayDate > today;
  };

  if (campaignLoading) {
    return (
      <Sidebar>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">Loading campaign details...</p>
          </div>
        </div>
      </Sidebar>
    );
  }

  if (!campaign) {
    return (
      <Sidebar>
        <div className="flex-1 flex items-center justify-center">
          <Card className="w-96">
            <CardContent className="p-8 text-center">
              <h2 className="text-xl font-semibold mb-2">Campaign Not Found</h2>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                The campaign you're looking for doesn't exist.
              </p>
              <Button onClick={() => setLocation("/campaigns")}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Campaigns
              </Button>
            </CardContent>
          </Card>
        </div>
      </Sidebar>
    );
  }

  const availableBalance = getAdAccountAvailableBalance(campaign.adAccountId);

  return (
    <Sidebar>
      <div className="flex-1 overflow-auto">
        <div className="p-6">
          {/* Header with back button */}
          <div className="mb-6">
            <Button
              variant="outline"
              onClick={() => setLocation("/campaigns")}
              className="mb-4"
              data-testid="button-back-to-campaigns"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Campaign Management
            </Button>
            
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                {campaign.name}
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                Campaign Details & Management
              </p>
            </div>
          </div>

          {/* Modern pill-style tabs */}
          <div className="mb-6">
            <div className="flex space-x-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg w-fit">
              <button
                onClick={() => setActiveTab("summary")}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all",
                  activeTab === "summary"
                    ? "bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm"
                    : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
                )}
                data-testid="tab-summary"
              >
                <Info className="h-4 w-4" />
                Summary
              </button>
              <button
                onClick={() => setActiveTab("calendar")}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all",
                  activeTab === "calendar"
                    ? "bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm"
                    : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
                )}
                data-testid="tab-calendar"
              >
                <Calendar className="h-4 w-4" />
                Calendar View
              </button>
              <button
                onClick={() => setActiveTab("history")}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all",
                  activeTab === "history"
                    ? "bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm"
                    : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
                )}
                data-testid="tab-history"
              >
                <History className="h-4 w-4" />
                History
              </button>
            </div>
          </div>

          {/* Tab Content */}
          {activeTab === "summary" && (
            <div className="space-y-6">
              {/* Campaign Info Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <Card className="rounded-xl shadow-sm">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
                      Campaign Status
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Select
                      value={campaign.status}
                      onValueChange={(value) => updateCampaignStatusMutation.mutate(value)}
                      disabled={updateCampaignStatusMutation.isPending}
                    >
                      <SelectTrigger data-testid="select-campaign-status">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="paused">Paused</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                        <SelectItem value="draft">Draft</SelectItem>
                      </SelectContent>
                    </Select>
                  </CardContent>
                </Card>

                <Card className="rounded-xl shadow-sm">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
                      Client
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-lg font-semibold">{getClientName(campaign.clientId)}</p>
                  </CardContent>
                </Card>

                <Card className="rounded-xl shadow-sm">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
                      Ad Account
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-lg font-semibold">{getAdAccountName(campaign.adAccountId)}</p>
                  </CardContent>
                </Card>

                <Card className="rounded-xl shadow-sm">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
                      Objective
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-2">
                      <Target className="h-4 w-4 text-blue-600" />
                      <p className="text-lg font-semibold">{campaign.objective}</p>
                    </div>
                  </CardContent>
                </Card>

                <Card className="rounded-xl shadow-sm">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
                      Budget
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4 text-green-600" />
                      <p className="text-lg font-semibold">{formatCurrency(campaign.budget || "0")}</p>
                    </div>
                  </CardContent>
                </Card>

                <Card className="rounded-xl shadow-sm">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
                      Available Balance
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-2">
                      <TrendingUp className={`h-4 w-4 ${availableBalance < 0 ? 'text-red-600' : 'text-green-600'}`} />
                      <p className={`text-lg font-semibold ${availableBalance < 0 ? 'text-red-600' : 'text-green-600'}`}>
                        {formatCurrency(availableBalance)}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Total Spend Card */}
              <Card className="rounded-xl shadow-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <DollarSign className="h-5 w-5 text-blue-600" />
                    Updated Total Spend
                  </CardTitle>
                  <CardDescription>
                    Current campaign spending across all channels
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-blue-600">
                    {formatCurrency(campaign.spend || "0")}
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    Last updated: {format(new Date(campaign.updatedAt || campaign.createdAt || new Date()), "MMM dd, yyyy 'at' HH:mm")}
                  </p>
                </CardContent>
              </Card>

              {/* Comments Section */}
              <Card className="rounded-xl shadow-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MessageSquare className="h-5 w-5 text-green-600" />
                    Campaign Notes
                  </CardTitle>
                  <CardDescription>
                    Add comments and notes about this campaign
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="new-comment">Add a comment</Label>
                      <Textarea
                        id="new-comment"
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        placeholder="Enter your comment here..."
                        rows={3}
                        data-testid="textarea-new-comment"
                      />
                    </div>
                    <Button 
                      onClick={handleAddComment}
                      disabled={addCommentMutation.isPending || !newComment.trim()}
                      size="sm"
                      data-testid="button-add-comment"
                    >
                      {addCommentMutation.isPending ? "Updating..." : "Update"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {activeTab === "calendar" && (
            <div className="space-y-6">
              <Card className="rounded-xl shadow-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-blue-600" />
                    Daily Spending Calendar
                  </CardTitle>
                  <CardDescription>
                    Track and edit daily campaign spending (last 5 days editable)
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {/* Calendar Grid */}
                  <div className="grid grid-cols-7 gap-4">
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                      <div key={day} className="text-center text-sm font-medium text-gray-600 dark:text-gray-400 pb-2">
                        {day}
                      </div>
                    ))}
                    
                    {dailySpends.map((dayData) => {
                      const date = new Date(dayData.date);
                      const editable = canEditDay(dayData.date);
                      const today = isToday(dayData.date);
                      const future = isFutureDay(dayData.date);
                      
                      return (
                        <Card 
                          key={dayData.date}
                          className={cn(
                            "p-3 cursor-pointer transition-all hover:shadow-md",
                            today && "ring-2 ring-blue-500 bg-blue-50 dark:bg-blue-900/20",
                            future && "opacity-50 cursor-not-allowed",
                            editable && !future && "hover:bg-gray-50 dark:hover:bg-gray-800"
                          )}
                          onClick={() => editable && !future && handleEditDaySpend(dayData.date, dayData.amount)}
                          data-testid={`calendar-day-${dayData.date}`}
                        >
                          <div className="text-sm font-medium text-gray-900 dark:text-white">
                            {date.getDate()}
                          </div>
                          <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                            {formatCurrency(dayData.amount)}
                          </div>
                          {editable && !future && (
                            <div className="text-xs text-blue-600 mt-1">
                              <Edit3 className="h-3 w-3" />
                            </div>
                          )}
                        </Card>
                      );
                    })}
                  </div>

                  {/* Total Spend Summary */}
                  <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                    <div className="flex items-center justify-between">
                      <span className="text-lg font-medium text-gray-900 dark:text-white">
                        Total Spend (7 days):
                      </span>
                      <span className="text-2xl font-bold text-blue-600">
                        {formatCurrency(totalCalendarSpend)}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {activeTab === "history" && (
            <div className="space-y-6">
              {/* Comments History */}
              <Card className="rounded-xl shadow-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MessageSquare className="h-5 w-5 text-green-600" />
                    Comments History
                  </CardTitle>
                  <CardDescription>
                    All comments and notes added to this campaign
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4 max-h-60 overflow-y-auto">
                    {campaignHistory
                      .filter(item => item.type === "comment")
                      .slice(0, 5)
                      .map((item) => (
                        <div 
                          key={item.id} 
                          className="flex items-start gap-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                          data-testid={`comment-history-${item.id}`}
                        >
                          <MessageSquare className="h-4 w-4 text-green-600 mt-1" />
                          <div className="flex-1">
                            <p className="text-sm text-gray-900 dark:text-white">{item.comment}</p>
                            <div className="flex items-center gap-2 mt-1 text-xs text-gray-600 dark:text-gray-400">
                              <span>{format(new Date(item.date), "MMM dd, yyyy 'at' HH:mm")}</span>
                              <span>•</span>
                              <span>{item.user}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    {campaignHistory.filter(item => item.type === "comment").length === 0 && (
                      <p className="text-gray-600 dark:text-gray-400 text-center py-4">
                        No comments yet
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Edit History */}
              <Card className="rounded-xl shadow-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Edit3 className="h-5 w-5 text-blue-600" />
                    Edit History
                  </CardTitle>
                  <CardDescription>
                    Changes made to campaign settings and configuration
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4 max-h-60 overflow-y-auto">
                    {campaignHistory
                      .filter(item => item.type === "edit")
                      .slice(0, 5)
                      .map((item) => (
                        <div 
                          key={item.id} 
                          className="flex items-start gap-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                          data-testid={`edit-history-${item.id}`}
                        >
                          <Edit3 className="h-4 w-4 text-blue-600 mt-1" />
                          <div className="flex-1">
                            <p className="text-sm text-gray-900 dark:text-white">
                              <span className="font-medium">{item.field}</span> changed from{" "}
                              <span className="text-red-600">{item.oldValue}</span> to{" "}
                              <span className="text-green-600">{item.newValue}</span>
                            </p>
                            <div className="flex items-center gap-2 mt-1 text-xs text-gray-600 dark:text-gray-400">
                              <span>{format(new Date(item.date), "MMM dd, yyyy 'at' HH:mm")}</span>
                              <span>•</span>
                              <span>{item.user}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    {campaignHistory.filter(item => item.type === "edit").length === 0 && (
                      <p className="text-gray-600 dark:text-gray-400 text-center py-4">
                        No edits yet
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Non-user Updates */}
              <Card className="rounded-xl shadow-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <History className="h-5 w-5 text-purple-600" />
                    System Updates
                  </CardTitle>
                  <CardDescription>
                    Automatic updates and system-generated changes
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4 max-h-60 overflow-y-auto">
                    {campaignHistory
                      .filter(item => item.type === "system")
                      .slice(0, 5)
                      .map((item) => (
                        <div 
                          key={item.id} 
                          className="flex items-start gap-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                          data-testid={`system-history-${item.id}`}
                        >
                          <History className="h-4 w-4 text-purple-600 mt-1" />
                          <div className="flex-1">
                            <p className="text-sm text-gray-900 dark:text-white">
                              <span className="font-medium">{item.field}</span> automatically updated from{" "}
                              <span className="text-red-600">{item.oldValue}</span> to{" "}
                              <span className="text-green-600">{item.newValue}</span>
                            </p>
                            <div className="flex items-center gap-2 mt-1 text-xs text-gray-600 dark:text-gray-400">
                              <span>{format(new Date(item.date), "MMM dd, yyyy 'at' HH:mm")}</span>
                              <span>•</span>
                              <span>{item.user}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    {campaignHistory.filter(item => item.type === "system").length === 0 && (
                      <p className="text-gray-600 dark:text-gray-400 text-center py-4">
                        No system updates yet
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Edit Daily Spend Modal */}
          <Dialog open={editingDay !== null} onOpenChange={() => setEditingDay(null)}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Edit Daily Spend</DialogTitle>
                <DialogDescription>
                  Update the spending amount for {editingDay && format(new Date(editingDay), "MMMM dd, yyyy")}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="spend-amount">Spend Amount ($)</Label>
                  <Input
                    id="spend-amount"
                    type="number"
                    step="0.01"
                    min="0"
                    value={editingSpend}
                    onChange={(e) => setEditingSpend(e.target.value)}
                    placeholder="0.00"
                    data-testid="input-edit-spend"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setEditingDay(null)}>
                  Cancel
                </Button>
                <Button 
                  onClick={handleSaveDaySpend}
                  disabled={updateDailySpendMutation.isPending}
                  data-testid="button-save-spend"
                >
                  {updateDailySpendMutation.isPending ? "Saving..." : "Save"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Loading Overlay */}
          {isLoading && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
              <div className="bg-white dark:bg-gray-800 rounded-lg p-6 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-600 dark:text-gray-400">Processing...</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </Sidebar>
  );
}