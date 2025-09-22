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
  ChevronRight,
  Play,
  Pause,
  Plus,
  Trash2,
  Eye,
  ExternalLink
} from "lucide-react";
import { format } from "date-fns";
import type { Campaign, AdAccount, Client, AdCopySet, InsertAdCopySet } from "@shared/schema";
import { insertAdCopySetSchema } from "@shared/schema";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
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
  const [isCreateSetDialogOpen, setIsCreateSetDialogOpen] = useState(false);
  const [isEditSetDialogOpen, setIsEditSetDialogOpen] = useState(false);
  const [editingSet, setEditingSet] = useState<AdCopySet | null>(null);
  
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

  // Fetch ad copy sets for this campaign
  const { data: adCopySets = [], isLoading: adCopySetsLoading } = useQuery<AdCopySet[]>({
    queryKey: ["/api/campaigns", campaignId, "ad-copy-sets"],
    enabled: !!campaignId,
  });

  // Mock daily spend data (in real app, this would come from API)
  const [dailySpends, setDailySpends] = useState<DailySpend[]>(() => {
    const days = [];
    // Show 30 days for full calendar context but only last 5 + today are editable
    for (let i = 29; i >= 0; i--) {
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

  // Calculate total spending from calendar data
  const totalCalendarSpend = dailySpends.reduce((sum, day) => {
    const dayDate = new Date(day.date);
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    
    // For past days, add full amount to total
    // For current day, add running total (in real app, this would be live)
    if (dayDate < today || !isRunningDay(day.date)) {
      return sum + day.amount;
    } else {
      // Current running day - in real app, this would be live spending
      return sum + day.amount; // For now, treat the same
    }
  }, 0);

  // Mutation to sync calendar spend to campaign
  const syncCampaignSpendMutation = useMutation({
    mutationFn: async (newSpend: number) => {
      return apiRequest(`/api/campaigns/${campaignId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ spend: newSpend.toString() }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/campaigns", campaignId] });
      queryClient.invalidateQueries({ queryKey: ["/api/campaigns"] }); // Refresh campaign list
      toast({
        title: "Success",
        description: "Campaign spending synchronized successfully.",
      });
    },
    onError: (error: any) => {
      console.error("Failed to sync campaign spend:", error);
      toast({
        title: "Error",
        description: "Failed to sync campaign spending.",
        variant: "destructive",
      });
    },
  });

  // Auto-sync campaign spend when calendar changes
  useEffect(() => {
    if (campaign && totalCalendarSpend !== parseFloat(campaign.spend || '0')) {
      // Debounce the sync to avoid too many API calls
      const timeoutId = setTimeout(() => {
        syncCampaignSpendMutation.mutate(totalCalendarSpend);
      }, 1000); // 1 second debounce
      
      return () => clearTimeout(timeoutId);
    }
  }, [totalCalendarSpend, campaign]);

  // Ad Copy Set form setup
  const createAdCopyForm = useForm<InsertAdCopySet>({
    resolver: zodResolver(insertAdCopySetSchema.omit({ campaignId: true })),
    defaultValues: {
      setName: "",
      isActive: false,
      age: "",
      budget: "",
      adType: "",
      creativeLink: "",
      headline: "",
      description: "",
      callToAction: "",
      targetAudience: "",
      placement: "",
      schedule: "",
      notes: "",
    },
  });

  const editAdCopyForm = useForm<InsertAdCopySet>({
    resolver: zodResolver(insertAdCopySetSchema.omit({ campaignId: true })),
  });

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

  // Create ad copy set mutation
  const createAdCopySetMutation = useMutation({
    mutationFn: async (data: InsertAdCopySet) => {
      const response = await apiRequest("POST", `/api/campaigns/${campaignId}/ad-copy-sets`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/campaigns", campaignId, "ad-copy-sets"] });
      setIsCreateSetDialogOpen(false);
      createAdCopyForm.reset();
      toast({
        title: "Success!",
        description: "Ad copy set created successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create ad copy set.",
        variant: "destructive",
      });
    },
  });

  // Update ad copy set mutation
  const updateAdCopySetMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<InsertAdCopySet> }) => {
      const response = await apiRequest("PUT", `/api/ad-copy-sets/${id}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/campaigns", campaignId, "ad-copy-sets"] });
      setIsEditSetDialogOpen(false);
      setEditingSet(null);
      toast({
        title: "Success!",
        description: "Ad copy set updated successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update ad copy set.",
        variant: "destructive",
      });
    },
  });

  // Set active ad copy set mutation
  const setActiveAdCopySetMutation = useMutation({
    mutationFn: async ({ campaignId, setId }: { campaignId: string; setId: string }) => {
      const response = await apiRequest("PUT", `/api/campaigns/${campaignId}/ad-copy-sets/${setId}/set-active`, {});
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/campaigns", campaignId, "ad-copy-sets"] });
      toast({
        title: "Success!",
        description: "Ad copy set is now active.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to set active ad copy set.",
        variant: "destructive",
      });
    },
  });

  // Delete ad copy set mutation
  const deleteAdCopySetMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest("DELETE", `/api/ad-copy-sets/${id}`, {});
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/campaigns", campaignId, "ad-copy-sets"] });
      toast({
        title: "Success!",
        description: "Ad copy set deleted successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete ad copy set.",
        variant: "destructive",
      });
    },
  });

  // Add comment mutation - syncs with campaign comments
  const addCommentMutation = useMutation({
    mutationFn: async (comment: string) => {
      const response = await apiRequest("POST", `/api/campaigns/${campaignId}/comments`, { comment });
      return response.json();
    },
    onSuccess: () => {
      // Invalidate both queries to update the campaign data and campaign list
      queryClient.invalidateQueries({ queryKey: ["/api/campaigns", campaignId] });
      queryClient.invalidateQueries({ queryKey: ["/api/campaigns"] });
      setNewComment("");
      toast({
        title: "Success!",
        description: "Comment added successfully and synced to Campaign Management.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to add comment.",
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

  const handleCreateAdCopySet = (data: InsertAdCopySet) => {
    createAdCopySetMutation.mutate({ ...data, campaignId: campaignId! });
  };

  const handleEditAdCopySet = (set: AdCopySet) => {
    setEditingSet(set);
    editAdCopyForm.reset({
      setName: set.setName,
      isActive: set.isActive || false,
      age: set.age || "",
      budget: set.budget || "",
      adType: set.adType || "",
      creativeLink: set.creativeLink || "",
      headline: set.headline || "",
      description: set.description || "",
      callToAction: set.callToAction || "",
      targetAudience: set.targetAudience || "",
      placement: set.placement || "",
      schedule: set.schedule || "",
      notes: set.notes || "",
    });
    setIsEditSetDialogOpen(true);
  };

  const handleUpdateAdCopySet = (data: InsertAdCopySet) => {
    if (!editingSet) return;
    updateAdCopySetMutation.mutate({ id: editingSet.id, data });
  };

  const handleSetActive = (setId: string) => {
    if (!campaignId) return;
    setActiveAdCopySetMutation.mutate({ campaignId, setId });
  };

  const handleDeleteSet = (setId: string) => {
    deleteAdCopySetMutation.mutate(setId);
  };

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

  // Every day is now editable, but we control UI visibility separately
  const canEditDay = (date: string) => {
    const dayDate = new Date(date);
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    
    // All past and current days can be edited (no future days)
    return dayDate <= today;
  };

  // Show input controls only for last 5 days + current day
  const showEditControls = (date: string) => {
    const dayDate = new Date(date);
    const fiveDaysAgo = new Date();
    fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5);
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    
    return dayDate >= fiveDaysAgo && dayDate <= today;
  };

  // Check if it's the current running day
  const isRunningDay = (date: string) => {
    return isToday(date);
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

  // Calculate Available Balance using Calendar View spending data
  // Available Balance = Spend Limit - Current Total Spending (from Calendar)
  const availableBalance = (() => {
    if (!campaign.adAccountId) return 0;
    const adAccount = adAccounts.find(a => a.id === campaign.adAccountId);
    if (!adAccount) return 0;
    const spendLimit = parseFloat(adAccount.spendLimit || "0");
    // Use calendar spend instead of ad account total spend
    return spendLimit - totalCalendarSpend;
  })();

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
                onClick={() => setActiveTab("adcopy")}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all",
                  activeTab === "adcopy"
                    ? "bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm"
                    : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
                )}
                data-testid="tab-adcopy"
              >
                <FileText className="h-4 w-4" />
                Ad Copy
              </button>
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
                    Live spending total calculated from Calendar View data
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-blue-600">
                    {formatCurrency(totalCalendarSpend)}
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    Live total from Calendar View - Last updated: {format(new Date(), "MMM dd, yyyy 'at' HH:mm")}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Syncs automatically to Campaign Management
                  </p>
                </CardContent>
              </Card>

              {/* Comments Section */}
              <Card className="rounded-xl shadow-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MessageSquare className="h-5 w-5 text-green-600" />
                    Campaign Comments
                  </CardTitle>
                  <CardDescription>
                    Add comments that sync automatically with Campaign Management
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
                      {addCommentMutation.isPending ? "Adding..." : "Add Comment"}
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* History Section - Merged into Summary Tab */}
              <div className="space-y-6">
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                  <History className="h-5 w-5 text-purple-600" />
                  Campaign History
                </h3>
                
                {/* Comments History */}
                <Card className="rounded-xl shadow-sm">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <MessageSquare className="h-4 w-4 text-green-600" />
                      Comments History
                    </CardTitle>
                    <CardDescription>
                      All comments and notes added to this campaign
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3 max-h-60 overflow-y-auto">
                      {campaign?.comments ? (
                        campaign.comments.split('\n\n').map((commentEntry, index) => {
                          // Parse comment format: [timestamp] username: comment
                          const match = commentEntry.match(/\[(.+?)\] (.+?): (.+)/);
                          if (match) {
                            const [, timestamp, username, comment] = match;
                            return (
                              <div 
                                key={index}
                                className="flex items-start gap-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                                data-testid={`comment-history-${index}`}
                              >
                                <MessageSquare className="h-4 w-4 text-green-600 mt-1 flex-shrink-0" />
                                <div className="flex-1">
                                  <p className="text-sm text-gray-900 dark:text-white">{comment}</p>
                                  <div className="flex items-center gap-2 mt-1 text-xs text-gray-600 dark:text-gray-400">
                                    <span>{format(new Date(timestamp), "MMM dd, yyyy 'at' HH:mm")}</span>
                                    <span>•</span>
                                    <span>{username}</span>
                                  </div>
                                </div>
                              </div>
                            );
                          }
                          return null;
                        }).filter(Boolean).reverse() // Show newest first
                      ) : (
                        <p className="text-gray-600 dark:text-gray-400 text-center py-4">
                          No comments yet
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Change History */}
                <Card className="rounded-xl shadow-sm">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Edit3 className="h-4 w-4 text-blue-600" />
                      Change History
                    </CardTitle>
                    <CardDescription>
                      Changes made to campaign settings and configuration
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3 max-h-60 overflow-y-auto">
                      {campaignHistory
                        .filter(item => item.type === "edit")
                        .slice(0, 10)
                        .map((item) => (
                          <div 
                            key={item.id} 
                            className="flex items-start gap-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                            data-testid={`change-history-${item.id}`}
                          >
                            <Edit3 className="h-4 w-4 text-blue-600 mt-1 flex-shrink-0" />
                            <div className="flex-1">
                              <p className="text-sm text-gray-900 dark:text-white">
                                <span className="font-medium">{item.field}</span> changed from{" "}
                                <span className="px-1 py-0.5 bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300 rounded text-xs">{item.oldValue}</span> to{" "}
                                <span className="px-1 py-0.5 bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300 rounded text-xs">{item.newValue}</span>
                              </p>
                              <div className="flex items-center gap-2 mt-1 text-xs text-gray-600 dark:text-gray-400">
                                <span>{format(new Date(item.date), "MMM dd, yyyy 'at' HH:mm")}</span>
                                <span>•</span>
                                <span>Changed by {item.user}</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      {campaignHistory.filter(item => item.type === "edit").length === 0 && (
                        <p className="text-gray-600 dark:text-gray-400 text-center py-4">
                          No changes yet
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* System Updates */}
                <Card className="rounded-xl shadow-sm">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <History className="h-4 w-4 text-purple-600" />
                      System Updates
                    </CardTitle>
                    <CardDescription>
                      Automatic updates and system-generated changes
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3 max-h-60 overflow-y-auto">
                      {campaignHistory
                        .filter(item => item.type === "system")
                        .slice(0, 10)
                        .map((item) => (
                          <div 
                            key={item.id} 
                            className="flex items-start gap-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                            data-testid={`system-history-${item.id}`}
                          >
                            <History className="h-4 w-4 text-purple-600 mt-1 flex-shrink-0" />
                            <div className="flex-1">
                              <p className="text-sm text-gray-900 dark:text-white">
                                <span className="font-medium">{item.field}</span> automatically updated from{" "}
                                <span className="px-1 py-0.5 bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300 rounded text-xs">{item.oldValue}</span> to{" "}
                                <span className="px-1 py-0.5 bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300 rounded text-xs">{item.newValue}</span>
                              </p>
                              <div className="flex items-center gap-2 mt-1 text-xs text-gray-600 dark:text-gray-400">
                                <span>{format(new Date(item.date), "MMM dd, yyyy 'at' HH:mm")}</span>
                                <span>•</span>
                                <span>System</span>
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
                    Track and edit daily campaign spending. All past days are editable, inputs shown for last 5 days + today.
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
                      const showControls = showEditControls(dayData.date);
                      const today = isToday(dayData.date);
                      const running = isRunningDay(dayData.date);
                      const future = isFutureDay(dayData.date);
                      
                      return (
                        <Card 
                          key={dayData.date}
                          className={cn(
                            "p-3 transition-all",
                            today && "ring-2 ring-blue-500 bg-blue-50 dark:bg-blue-900/20",
                            running && "ring-2 ring-green-500 bg-green-50 dark:bg-green-900/20",
                            future && "opacity-50 cursor-not-allowed",
                            editable && !future && "cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 hover:shadow-md",
                            !showControls && !future && "bg-gray-100 dark:bg-gray-800"
                          )}
                          onClick={() => editable && !future && handleEditDaySpend(dayData.date, dayData.amount)}
                          data-testid={`calendar-day-${dayData.date}`}
                        >
                          <div className="text-sm font-medium text-gray-900 dark:text-white">
                            {date.getDate()}
                          </div>
                          <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                            {formatCurrency(dayData.amount)}
                            {running && (
                              <span className="ml-1 text-green-600 font-medium">(Live)</span>
                            )}
                          </div>
                          {editable && !future && (
                            <div className="text-xs mt-1">
                              {showControls ? (
                                <div className="text-blue-600">
                                  <Edit3 className="h-3 w-3" />
                                </div>
                              ) : (
                                <span className="text-gray-500">Editable</span>
                              )}
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