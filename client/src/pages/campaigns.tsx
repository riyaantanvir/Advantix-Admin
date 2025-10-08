import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { 
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { 
  Search, 
  RefreshCw, 
  Plus, 
  Edit, 
  Trash2, 
  ExternalLink,
  Calendar,
  Download,
  Upload,
  CloudDownload,
  DollarSign,
  TrendingUp,
  Filter,
  X
} from "lucide-react";
import { format } from "date-fns";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { z } from "zod";
import { insertCampaignSchema, type Campaign, type Client, type AdAccount } from "@shared/schema";
import Sidebar from "@/components/layout/Sidebar";

// Form schemas
const campaignFormSchema = insertCampaignSchema.extend({
  startDate: z.date({
    required_error: "Start date is required",
  }),
});

type CampaignFormData = z.infer<typeof campaignFormSchema>;

// Status color mapping
const statusColors = {
  active: "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300",
  paused: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300",
  completed: "bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300",
  draft: "bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-300",
};

export default function CampaignsPage() {
  const [, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<Campaign | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [isSyncDialogOpen, setIsSyncDialogOpen] = useState(false);
  const [syncAdAccountId, setSyncAdAccountId] = useState("");
  
  // Analytics filters
  const [filterAdAccountId, setFilterAdAccountId] = useState<string>("");
  const [filterCampaignId, setFilterCampaignId] = useState<string>("");
  const [filterStartDate, setFilterStartDate] = useState<Date | undefined>(undefined);
  const [filterEndDate, setFilterEndDate] = useState<Date | undefined>(undefined);
  
  const { toast} = useToast();

  // Form setup
  const createForm = useForm<CampaignFormData>({
    resolver: zodResolver(campaignFormSchema),
    defaultValues: {
      name: "",
      startDate: new Date(),
      comments: "",
      adAccountId: "",
      objective: "",
      budget: "0",
      status: "active",
      spend: "0",
    },
  });

  const editForm = useForm<CampaignFormData>({
    resolver: zodResolver(campaignFormSchema),
  });

  // Fetch campaigns
  const { 
    data: campaigns = [], 
    isLoading: campaignsLoading, 
    refetch: refetchCampaigns 
  } = useQuery({
    queryKey: ["/api/campaigns"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/campaigns");
      const data = await response.json();
      return data as Campaign[];
    },
  });

  // Fetch clients
  const { data: clients = [] } = useQuery({
    queryKey: ["/api/clients"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/clients");
      const data = await response.json();
      return data as Client[];
    },
  });

  // Fetch ad accounts
  const { data: adAccounts = [] } = useQuery({
    queryKey: ["/api/ad-accounts"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/ad-accounts");
      const data = await response.json();
      return data as AdAccount[];
    },
  });

  // Fetch campaign analytics
  const { data: analyticsData, isLoading: analyticsLoading } = useQuery({
    queryKey: [
      "/api/campaigns/analytics",
      filterAdAccountId,
      filterCampaignId,
      filterStartDate?.toISOString(),
      filterEndDate?.toISOString()
    ],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filterAdAccountId) params.append("adAccountId", filterAdAccountId);
      if (filterCampaignId) params.append("campaignId", filterCampaignId);
      if (filterStartDate) params.append("startDate", filterStartDate.toISOString());
      if (filterEndDate) params.append("endDate", filterEndDate.toISOString());
      
      const response = await apiRequest("GET", `/api/campaigns/analytics?${params.toString()}`);
      const data = await response.json();
      return data as {
        analytics: Array<{
          adAccountId: string;
          adAccountName: string;
          platform: string;
          totalSpend: number;
          totalBudget: number;
          availableBalance: number;
          campaignCount: number;
        }>;
        totalCampaigns: number;
        grandTotalSpend: number;
        grandTotalBudget: number;
      };
    },
  });

  // Create campaign mutation
  const createCampaignMutation = useMutation({
    mutationFn: async (data: CampaignFormData) => {
      const response = await apiRequest("POST", "/api/campaigns", {
        ...data,
        startDate: data.startDate.toISOString(),
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/campaigns"] });
      setIsCreateDialogOpen(false);
      createForm.reset();
      toast({
        title: "Success!",
        description: "Campaign created successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create campaign.",
        variant: "destructive",
      });
    },
  });

  // Update campaign mutation
  const updateCampaignMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<CampaignFormData> }) => {
      const response = await apiRequest("PUT", `/api/campaigns/${id}`, {
        ...data,
        ...(data.startDate && { startDate: data.startDate.toISOString() }),
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/campaigns"] });
      setIsEditDialogOpen(false);
      setEditingCampaign(null);
      editForm.reset();
      toast({
        title: "Success!",
        description: "Campaign updated successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update campaign.",
        variant: "destructive",
      });
    },
  });

  // Delete campaign mutation
  const deleteCampaignMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest("DELETE", `/api/campaigns/${id}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/campaigns"] });
      toast({
        title: "Success!",
        description: "Campaign deleted successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete campaign.",
        variant: "destructive",
      });
    },
  });

  // Get ad account name from ID
  const getAdAccountName = (adAccountId: string | null) => {
    if (!adAccountId) return "Unknown";
    const adAccount = adAccounts.find(a => a.id === adAccountId);
    return adAccount ? `${adAccount.accountName} (${adAccount.platform})` : "Unknown Ad Account";
  };

  // Filter campaigns based on search query
  const filteredCampaigns = campaigns.filter((campaign) => {
    const searchLower = searchQuery.toLowerCase();
    const adAccountName = getAdAccountName(campaign.adAccountId);
    return (
      campaign.name.toLowerCase().includes(searchLower) ||
      adAccountName.toLowerCase().includes(searchLower) ||
      campaign.objective.toLowerCase().includes(searchLower) ||
      (campaign.comments && campaign.comments.toLowerCase().includes(searchLower))
    );
  });

  // Get client name by ID
  const getClientName = (clientId: string | null) => {
    if (!clientId) return "No Client";
    const client = clients.find(c => c.id === clientId);
    return client?.clientName || "Unknown Client";
  };

  // Get campaign available balance (using individual campaign spend instead of ad account total)
  const getCampaignAvailableBalance = (adAccountId: string | null, campaignSpend: string | null) => {
    if (!adAccountId) return 0;
    const adAccount = adAccounts.find(a => a.id === adAccountId);
    if (!adAccount) return 0;
    const spendLimit = parseFloat(adAccount.spendLimit || "0");
    const currentCampaignSpend = parseFloat(campaignSpend || "0");
    // Calculate available balance using individual campaign spend (synced from Calendar View)
    return spendLimit - currentCampaignSpend;
  };

  // Keep original function for ad account selection dialogs
  const getAdAccountAvailableBalance = (adAccountId: string | null) => {
    if (!adAccountId) return 0;
    const adAccount = adAccounts.find(a => a.id === adAccountId);
    if (!adAccount) return 0;
    const spendLimit = parseFloat(adAccount.spendLimit || "0");
    const totalSpend = parseFloat(adAccount.totalSpend || "0");
    return spendLimit - totalSpend;
  };

  // Format currency
  const formatCurrency = (amount: number | string) => {
    const numAmount = typeof amount === "string" ? parseFloat(amount) : amount;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(numAmount);
  };

  // Handle edit campaign
  const handleEdit = (campaign: Campaign) => {
    setEditingCampaign(campaign);
    editForm.reset({
      name: campaign.name,
      startDate: new Date(campaign.startDate),
      comments: campaign.comments || "",
      adAccountId: campaign.adAccountId,
      clientId: campaign.clientId || "",
      status: campaign.status,
      objective: campaign.objective,
      budget: campaign.budget || "0",
      spend: campaign.spend || "0",
    });
    setIsEditDialogOpen(true);
  };

  // Handle ad account selection to show available balance
  const handleAdAccountChange = (adAccountId: string, form: typeof createForm | typeof editForm) => {
    form.setValue("adAccountId", adAccountId);
    const availableBalance = getAdAccountAvailableBalance(adAccountId);
    // Show toast with available balance for user awareness
    if (availableBalance > 0) {
      toast({
        title: "Ad Account Selected",
        description: `Available balance: ${formatCurrency(availableBalance)}`,
      });
    } else if (availableBalance <= 0) {
      toast({
        title: "Warning",
        description: `Ad account has no available balance: ${formatCurrency(availableBalance)}`,
        variant: "destructive",
      });
    }
  };

  // Handle Export
  const handleExport = async () => {
    try {
      const token = localStorage.getItem("authToken");
      const response = await fetch("/api/campaigns/export/csv", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to export campaigns");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `campaigns-export-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      toast({
        title: "Success",
        description: "Campaigns exported successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to export campaigns",
        variant: "destructive",
      });
    }
  };

  // Handle Import
  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const token = localStorage.getItem("authToken");
      const response = await fetch("/api/campaigns/import/csv", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to import campaigns");
      }

      toast({
        title: "Success",
        description: data.message,
      });

      if (data.errors && data.errors.length > 0) {
        toast({
          title: "Import Warnings",
          description: `${data.errors.length} error(s) occurred during import`,
          variant: "destructive",
        });
      }

      // Refresh campaigns list
      refetchCampaigns();
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to import campaigns",
        variant: "destructive",
      });
    } finally {
      setIsImporting(false);
      // Reset file input
      event.target.value = "";
    }
  };

  // Sync campaigns from Facebook
  const syncFacebookCampaignsMutation = useMutation({
    mutationFn: async (adAccountId: string) => {
      const response = await apiRequest("POST", "/api/campaigns/sync-facebook", {
        adAccountId,
        clientId: null,
      });
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/campaigns"] });
      toast({
        title: "Success!",
        description: data.message || "Campaigns synced successfully from Facebook",
      });
      setIsSyncDialogOpen(false);
      setSyncAdAccountId("");
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to sync campaigns from Facebook",
        variant: "destructive",
      });
    },
  });

  const handleSyncFacebook = () => {
    if (!syncAdAccountId || syncAdAccountId.trim() === "") {
      toast({
        title: "Error",
        description: "Please enter a Facebook Ad Account ID",
        variant: "destructive",
      });
      return;
    }
    syncFacebookCampaignsMutation.mutate(syncAdAccountId);
  };

  return (
    <Sidebar>
      <div className="flex-1 overflow-auto">
        <div className="p-6">
          {/* Header */}
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              Campaign Management
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Manage your advertising campaigns and track performance
            </p>
          </div>

          {/* Top Bar */}
          <Card className="mb-6">
            <CardContent className="p-4">
              <div className="flex items-center gap-4 flex-wrap">
                <div className="flex-1 min-w-64">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Search campaigns..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                      data-testid="input-campaign-search"
                    />
                  </div>
                </div>
                <Button 
                  variant="outline" 
                  onClick={() => refetchCampaigns()}
                  disabled={campaignsLoading}
                  data-testid="button-refresh-campaigns"
                >
                  <RefreshCw className={cn("h-4 w-4 mr-2", campaignsLoading && "animate-spin")} />
                  Refresh
                </Button>
                <Button 
                  variant="outline" 
                  onClick={handleExport}
                  data-testid="button-export-campaigns"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Export CSV
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => document.getElementById('csv-import-input')?.click()}
                  disabled={isImporting}
                  data-testid="button-import-campaigns"
                >
                  <Upload className={cn("h-4 w-4 mr-2", isImporting && "animate-pulse")} />
                  {isImporting ? "Importing..." : "Import CSV"}
                </Button>
                <input
                  id="csv-import-input"
                  type="file"
                  accept=".csv"
                  onChange={handleImport}
                  className="hidden"
                  data-testid="input-csv-file"
                />
                <Dialog open={isSyncDialogOpen} onOpenChange={setIsSyncDialogOpen}>
                  <DialogTrigger asChild>
                    <Button 
                      variant="outline" 
                      className="bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800 hover:bg-blue-100 dark:hover:bg-blue-900"
                      data-testid="button-sync-facebook"
                    >
                      <CloudDownload className="h-4 w-4 mr-2" />
                      Sync Campaign Management
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Sync Facebook Campaigns</DialogTitle>
                      <DialogDescription>
                        Enter your Facebook Ad Account ID to sync campaigns from Facebook.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <label htmlFor="ad-account-id" className="text-sm font-medium">
                          Facebook Ad Account ID
                        </label>
                        <Input
                          id="ad-account-id"
                          placeholder="e.g., 123456789012345"
                          value={syncAdAccountId}
                          onChange={(e) => setSyncAdAccountId(e.target.value)}
                          data-testid="input-sync-ad-account-id"
                        />
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          Enter the numeric ID of your Facebook Ad Account (without "act_" prefix)
                        </p>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button
                        variant="outline"
                        onClick={() => setIsSyncDialogOpen(false)}
                        data-testid="button-cancel-sync"
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={handleSyncFacebook}
                        disabled={syncFacebookCampaignsMutation.isPending}
                        data-testid="button-confirm-sync"
                      >
                        {syncFacebookCampaignsMutation.isPending ? (
                          <>
                            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                            Syncing...
                          </>
                        ) : (
                          <>
                            <CloudDownload className="h-4 w-4 mr-2" />
                            Sync Campaigns
                          </>
                        )}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
                <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                  <DialogTrigger asChild>
                    <Button data-testid="button-new-campaign">
                      <Plus className="h-4 w-4 mr-2" />
                      New Campaign
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle>Create New Campaign</DialogTitle>
                      <DialogDescription>
                        Add a new advertising campaign to your account.
                      </DialogDescription>
                    </DialogHeader>
                    <Form {...createForm}>
                      <form onSubmit={createForm.handleSubmit((data) => createCampaignMutation.mutate(data))}>
                        <div className="space-y-4 max-h-96 overflow-y-auto">
                          <div className="grid grid-cols-2 gap-4">
                            <FormField
                              control={createForm.control}
                              name="name"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Campaign Name</FormLabel>
                                  <FormControl>
                                    <Input {...field} data-testid="input-campaign-name" />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={createForm.control}
                              name="adAccountId"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Ad Account</FormLabel>
                                  <Select
                                    onValueChange={(value) => handleAdAccountChange(value, createForm)}
                                    value={field.value || ""}
                                  >
                                    <FormControl>
                                      <SelectTrigger data-testid="select-ad-account">
                                        <SelectValue placeholder="Select an ad account" />
                                      </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                      {adAccounts.map((adAccount) => (
                                        <SelectItem key={adAccount.id} value={adAccount.id}>
                                          {adAccount.accountName} ({adAccount.platform}) - Available: {formatCurrency(getAdAccountAvailableBalance(adAccount.id))}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                          
                          <div className="grid grid-cols-2 gap-4">
                            <FormField
                              control={createForm.control}
                              name="clientId"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Client</FormLabel>
                                  <Select
                                    onValueChange={field.onChange}
                                    value={field.value || ""}
                                  >
                                    <FormControl>
                                      <SelectTrigger data-testid="select-client">
                                        <SelectValue placeholder="Select a client" />
                                      </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                      {clients.map((client) => (
                                        <SelectItem key={client.id} value={client.id}>
                                          {client.clientName} ({client.businessName})
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={createForm.control}
                              name="status"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Status</FormLabel>
                                  <Select
                                    onValueChange={field.onChange}
                                    defaultValue={field.value}
                                  >
                                    <FormControl>
                                      <SelectTrigger data-testid="select-status">
                                        <SelectValue placeholder="Select status" />
                                      </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                      <SelectItem value="active">Active</SelectItem>
                                      <SelectItem value="paused">Paused</SelectItem>
                                      <SelectItem value="completed">Completed</SelectItem>
                                      <SelectItem value="draft">Draft</SelectItem>
                                    </SelectContent>
                                  </Select>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            <FormField
                              control={createForm.control}
                              name="objective"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Objective</FormLabel>
                                  <FormControl>
                                    <Input {...field} placeholder="e.g., Brand Awareness, Conversions" data-testid="input-objective" />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={createForm.control}
                              name="budget"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Budget</FormLabel>
                                  <FormControl>
                                    <Input 
                                      {...field} 
                                      type="number" 
                                      step="0.01" 
                                      min="0"
                                      placeholder="0.00"
                                      data-testid="input-budget"
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>

                          <FormField
                            control={createForm.control}
                            name="startDate"
                            render={({ field }) => (
                              <FormItem className="flex flex-col">
                                <FormLabel>Start Date</FormLabel>
                                <Popover>
                                  <PopoverTrigger asChild>
                                    <FormControl>
                                      <Button
                                        variant={"outline"}
                                        className={cn(
                                          "w-full pl-3 text-left font-normal",
                                          !field.value && "text-muted-foreground"
                                        )}
                                        data-testid="button-start-date"
                                      >
                                        {field.value ? (
                                          format(field.value, "PPP")
                                        ) : (
                                          <span>Pick a date</span>
                                        )}
                                        <Calendar className="ml-auto h-4 w-4 opacity-50" />
                                      </Button>
                                    </FormControl>
                                  </PopoverTrigger>
                                  <PopoverContent className="w-auto p-0" align="start">
                                    <CalendarComponent
                                      mode="single"
                                      selected={field.value}
                                      onSelect={field.onChange}
                                      disabled={(date) =>
                                        date < new Date("1900-01-01")
                                      }
                                      initialFocus
                                    />
                                  </PopoverContent>
                                </Popover>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={createForm.control}
                            name="comments"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Comments</FormLabel>
                                <FormControl>
                                  <Textarea 
                                    {...field} 
                                    value={field.value || ""}
                                    placeholder="Add any additional notes..."
                                    className="min-h-20"
                                    data-testid="textarea-comments"
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                        <DialogFooter className="mt-6">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => setIsCreateDialogOpen(false)}
                          >
                            Cancel
                          </Button>
                          <Button
                            type="submit"
                            disabled={createCampaignMutation.isPending}
                            data-testid="button-save-campaign"
                          >
                            {createCampaignMutation.isPending ? "Creating..." : "Create Campaign"}
                          </Button>
                        </DialogFooter>
                      </form>
                    </Form>
                  </DialogContent>
                </Dialog>
              </div>
            </CardContent>
          </Card>

          {/* Campaign Analytics Dashboard */}
          <Card className="mb-6">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-xl flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Campaign Analytics
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              {/* Filters */}
              <div className="flex items-center gap-3 flex-wrap mb-6 p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                <div className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                  <Filter className="h-4 w-4" />
                  Filters:
                </div>
                <Select value={filterAdAccountId} onValueChange={setFilterAdAccountId}>
                  <SelectTrigger className="w-[200px]" data-testid="select-filter-ad-account">
                    <SelectValue placeholder="All Ad Accounts" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All Ad Accounts</SelectItem>
                    {adAccounts.map((account) => (
                      <SelectItem key={account.id} value={account.id}>
                        {account.accountName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={filterCampaignId} onValueChange={setFilterCampaignId}>
                  <SelectTrigger className="w-[200px]" data-testid="select-filter-campaign">
                    <SelectValue placeholder="All Campaigns" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All Campaigns</SelectItem>
                    {campaigns.map((campaign) => (
                      <SelectItem key={campaign.id} value={campaign.id}>
                        {campaign.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-[200px] justify-start text-left font-normal",
                        !filterStartDate && "text-muted-foreground"
                      )}
                      data-testid="button-filter-start-date"
                    >
                      <Calendar className="mr-2 h-4 w-4" />
                      {filterStartDate ? format(filterStartDate, "PPP") : "Start Date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <CalendarComponent
                      mode="single"
                      selected={filterStartDate}
                      onSelect={setFilterStartDate}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>

                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-[200px] justify-start text-left font-normal",
                        !filterEndDate && "text-muted-foreground"
                      )}
                      data-testid="button-filter-end-date"
                    >
                      <Calendar className="mr-2 h-4 w-4" />
                      {filterEndDate ? format(filterEndDate, "PPP") : "End Date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <CalendarComponent
                      mode="single"
                      selected={filterEndDate}
                      onSelect={setFilterEndDate}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>

                {(filterAdAccountId || filterCampaignId || filterStartDate || filterEndDate) && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setFilterAdAccountId("");
                      setFilterCampaignId("");
                      setFilterStartDate(undefined);
                      setFilterEndDate(undefined);
                    }}
                    className="h-9"
                    data-testid="button-clear-filters"
                  >
                    <X className="h-4 w-4 mr-1" />
                    Clear Filters
                  </Button>
                )}
              </div>

              {/* Summary Cards */}
              {analyticsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <RefreshCw className="h-6 w-6 animate-spin text-gray-400" />
                  <span className="ml-2 text-gray-500">Loading analytics...</span>
                </div>
              ) : analyticsData && analyticsData.analytics.length > 0 ? (
                <div className="space-y-4">
                  {/* Grand Total Summary */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/30 dark:to-blue-900/30 rounded-lg border border-blue-200 dark:border-blue-800">
                    <div className="flex items-center gap-3">
                      <div className="p-3 bg-white dark:bg-gray-800 rounded-lg">
                        <DollarSign className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">Total Spend</div>
                        <div className="text-2xl font-bold text-gray-900 dark:text-white">
                          ${analyticsData.grandTotalSpend.toFixed(2)}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="p-3 bg-white dark:bg-gray-800 rounded-lg">
                        <TrendingUp className="h-6 w-6 text-green-600 dark:text-green-400" />
                      </div>
                      <div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">Total Budget</div>
                        <div className="text-2xl font-bold text-gray-900 dark:text-white">
                          ${analyticsData.grandTotalBudget.toFixed(2)}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="p-3 bg-white dark:bg-gray-800 rounded-lg">
                        <DollarSign className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                      </div>
                      <div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">Available Balance</div>
                        <div className="text-2xl font-bold text-gray-900 dark:text-white">
                          ${(analyticsData.grandTotalBudget - analyticsData.grandTotalSpend).toFixed(2)}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Ad Account Breakdown */}
                  <div className="space-y-3">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      Ad Account Breakdown
                    </h3>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      {analyticsData.analytics.map((account) => (
                        <Card 
                          key={account.adAccountId}
                          className="hover:shadow-lg transition-shadow"
                          data-testid={`analytics-card-${account.adAccountId}`}
                        >
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between mb-3">
                              <div>
                                <h4 className="font-semibold text-gray-900 dark:text-white">
                                  {account.adAccountName}
                                </h4>
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                  {account.platform.toUpperCase()} • {account.campaignCount} campaigns
                                </p>
                              </div>
                              <Badge variant="outline" className="capitalize">
                                {account.platform}
                              </Badge>
                            </div>
                            <div className="grid grid-cols-3 gap-3 text-sm">
                              <div>
                                <div className="text-gray-500 dark:text-gray-400 text-xs">Spend</div>
                                <div className="font-semibold text-red-600 dark:text-red-400">
                                  ${account.totalSpend.toFixed(2)}
                                </div>
                              </div>
                              <div>
                                <div className="text-gray-500 dark:text-gray-400 text-xs">Budget</div>
                                <div className="font-semibold text-gray-900 dark:text-white">
                                  ${account.totalBudget.toFixed(2)}
                                </div>
                              </div>
                              <div>
                                <div className="text-gray-500 dark:text-gray-400 text-xs">Available</div>
                                <div className={cn(
                                  "font-semibold",
                                  account.availableBalance > 0 
                                    ? "text-green-600 dark:text-green-400" 
                                    : "text-red-600 dark:text-red-400"
                                )}>
                                  ${account.availableBalance.toFixed(2)}
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  No analytics data available for the selected filters.
                </div>
              )}
            </CardContent>
          </Card>

          {/* Campaigns Table */}
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">
                Campaigns ({filteredCampaigns.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Campaign Name</TableHead>
                      <TableHead>Start Date</TableHead>
                      <TableHead>Comments</TableHead>
                      <TableHead>Ad Account</TableHead>
                      <TableHead>Client</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Objective</TableHead>
                      <TableHead>Budget</TableHead>
                      <TableHead>Available Balance</TableHead>
                      <TableHead>Total Spend</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {campaignsLoading ? (
                      <TableRow>
                        <TableCell colSpan={11} className="text-center py-8">
                          <div className="flex items-center justify-center gap-2">
                            <RefreshCw className="h-4 w-4 animate-spin" />
                            Loading campaigns...
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : filteredCampaigns.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={11} className="text-center py-8 text-gray-500">
                          {searchQuery ? "No campaigns match your search." : "No campaigns found."}
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredCampaigns.map((campaign) => {
                        const availableBalance = getCampaignAvailableBalance(campaign.adAccountId, campaign.spend);
                        const clientName = getClientName(campaign.clientId);
                        
                        return (
                          <TableRow 
                            key={campaign.id} 
                            className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                            data-testid={`campaign-row-${campaign.id}`}
                          >
                            <TableCell className="font-medium">
                              <div className="flex items-center gap-2">
                                <Button
                                  variant="link"
                                  className="p-0 h-auto font-medium text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400"
                                  onClick={() => setLocation(`/campaigns/${campaign.id}`)}
                                  data-testid={`link-campaign-${campaign.id}`}
                                >
                                  {campaign.name}
                                </Button>
                                {campaign.isSynced && (
                                  <Badge 
                                    variant="outline" 
                                    className="text-xs bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300"
                                    title="Synced from Facebook"
                                  >
                                    <CloudDownload className="h-3 w-3 mr-1" />
                                    FB
                                  </Badge>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              {format(new Date(campaign.startDate), "MMM dd, yyyy")}
                            </TableCell>
                            <TableCell>
                              <div className="max-w-32 truncate" title={campaign.comments || ""}>
                                {campaign.comments || "—"}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Button 
                                variant="link" 
                                className="p-0 h-auto font-normal text-blue-600 hover:text-blue-800"
                                onClick={() => {
                                  // TODO: Navigate to Ad Account Details page
                                  toast({
                                    title: "Ad Account Details",
                                    description: `Opening details for ${getAdAccountName(campaign.adAccountId)}`,
                                  });
                                }}
                                data-testid={`link-ad-account-${campaign.id}`}
                              >
                                {getAdAccountName(campaign.adAccountId)}
                                <ExternalLink className="h-3 w-3 ml-1" />
                              </Button>
                            </TableCell>
                            <TableCell data-testid={`client-name-${campaign.id}`}>
                              {clientName}
                            </TableCell>
                            <TableCell>
                              <Badge 
                                className={statusColors[campaign.status as keyof typeof statusColors]}
                                data-testid={`status-badge-${campaign.id}`}
                              >
                                {campaign.status.charAt(0).toUpperCase() + campaign.status.slice(1)}
                              </Badge>
                            </TableCell>
                            <TableCell>{campaign.objective}</TableCell>
                            <TableCell data-testid={`budget-${campaign.id}`}>
                              {formatCurrency(campaign.budget || "0")}
                            </TableCell>
                            <TableCell 
                              className={cn(
                                "font-medium",
                                availableBalance < 0 
                                  ? "text-red-600 dark:text-red-400" 
                                  : "text-green-600 dark:text-green-400"
                              )}
                              data-testid={`available-balance-${campaign.id}`}
                            >
                              {formatCurrency(availableBalance)}
                            </TableCell>
                            <TableCell data-testid={`total-spend-${campaign.id}`}>
                              {formatCurrency(campaign.spend || "0")}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleEdit(campaign)}
                                  data-testid={`button-edit-${campaign.id}`}
                                >
                                  <Edit className="h-3 w-3" />
                                </Button>
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="text-red-600 hover:text-red-800 hover:bg-red-50"
                                      data-testid={`button-delete-${campaign.id}`}
                                    >
                                      <Trash2 className="h-3 w-3" />
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Delete Campaign</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        Are you sure you want to delete "{campaign.name}"? 
                                        This action cannot be undone.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                                      <AlertDialogAction
                                        onClick={() => deleteCampaignMutation.mutate(campaign.id)}
                                        className="bg-red-600 hover:bg-red-700"
                                        data-testid={`confirm-delete-${campaign.id}`}
                                      >
                                        Delete
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* Edit Campaign Dialog */}
          <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Edit Campaign</DialogTitle>
                <DialogDescription>
                  Update the campaign information below.
                </DialogDescription>
              </DialogHeader>
              {editingCampaign && (
                <Form {...editForm}>
                  <form onSubmit={editForm.handleSubmit((data) => 
                    updateCampaignMutation.mutate({ id: editingCampaign.id, data })
                  )}>
                    <div className="space-y-4 max-h-96 overflow-y-auto">
                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={editForm.control}
                          name="name"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Campaign Name</FormLabel>
                              <FormControl>
                                <Input {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={editForm.control}
                          name="adAccountId"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Ad Account</FormLabel>
                              <Select
                                onValueChange={(value) => handleAdAccountChange(value, editForm)}
                                value={field.value || ""}
                              >
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select an ad account" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {adAccounts.map((adAccount) => (
                                    <SelectItem key={adAccount.id} value={adAccount.id}>
                                      {adAccount.accountName} ({adAccount.platform}) - Available: {formatCurrency(getAdAccountAvailableBalance(adAccount.id))}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={editForm.control}
                          name="clientId"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Client</FormLabel>
                              <Select
                                onValueChange={field.onChange}
                                value={field.value || ""}
                              >
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select a client" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {clients.map((client) => (
                                    <SelectItem key={client.id} value={client.id}>
                                      {client.clientName} ({client.businessName})
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={editForm.control}
                          name="status"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Status</FormLabel>
                              <Select
                                onValueChange={field.onChange}
                                value={field.value}
                              >
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select status" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="active">Active</SelectItem>
                                  <SelectItem value="paused">Paused</SelectItem>
                                  <SelectItem value="completed">Completed</SelectItem>
                                  <SelectItem value="draft">Draft</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={editForm.control}
                          name="objective"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Objective</FormLabel>
                              <FormControl>
                                <Input {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={editForm.control}
                          name="budget"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Budget</FormLabel>
                              <FormControl>
                                <Input 
                                  {...field} 
                                  type="number" 
                                  step="0.01" 
                                  min="0"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <FormField
                        control={editForm.control}
                        name="startDate"
                        render={({ field }) => (
                          <FormItem className="flex flex-col">
                            <FormLabel>Start Date</FormLabel>
                            <Popover>
                              <PopoverTrigger asChild>
                                <FormControl>
                                  <Button
                                    variant={"outline"}
                                    className={cn(
                                      "w-full pl-3 text-left font-normal",
                                      !field.value && "text-muted-foreground"
                                    )}
                                  >
                                    {field.value ? (
                                      format(field.value, "PPP")
                                    ) : (
                                      <span>Pick a date</span>
                                    )}
                                    <Calendar className="ml-auto h-4 w-4 opacity-50" />
                                  </Button>
                                </FormControl>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto p-0" align="start">
                                <CalendarComponent
                                  mode="single"
                                  selected={field.value}
                                  onSelect={field.onChange}
                                  disabled={(date) =>
                                    date < new Date("1900-01-01")
                                  }
                                  initialFocus
                                />
                              </PopoverContent>
                            </Popover>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={editForm.control}
                        name="comments"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Comments</FormLabel>
                            <FormControl>
                              <Textarea 
                                {...field} 
                                value={field.value || ""}
                                placeholder="Add any additional notes..."
                                className="min-h-20"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <DialogFooter className="mt-6">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setIsEditDialogOpen(false)}
                      >
                        Cancel
                      </Button>
                      <Button
                        type="submit"
                        disabled={updateCampaignMutation.isPending}
                      >
                        {updateCampaignMutation.isPending ? "Updating..." : "Update Campaign"}
                      </Button>
                    </DialogFooter>
                  </form>
                </Form>
              )}
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </Sidebar>
  );
}