import { useState, useMemo } from "react";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { 
  Search, 
  Plus, 
  Edit3, 
  Trash2, 
  Wallet, 
  RefreshCw, 
  Download,
  Eye,
  Pause,
  Play,
  DollarSign
} from "lucide-react";
import type { AdAccount, InsertAdAccount, Client } from "@shared/schema";

interface AdAccountFormData {
  platform: string;
  accountName: string;
  accountId: string;
  clientId: string;
  spendLimit: string;
  notes: string;
}

const PLATFORMS = [
  { value: "facebook", label: "Facebook Ads" },
  { value: "google", label: "Google Ads" },
  { value: "tiktok", label: "TikTok Ads" },
  { value: "instagram", label: "Instagram Ads" },
  { value: "linkedin", label: "LinkedIn Ads" },
  { value: "twitter", label: "Twitter Ads" },
  { value: "snapchat", label: "Snapchat Ads" },
  { value: "youtube", label: "YouTube Ads" },
];

export default function AdAccountsPage() {
  const { toast } = useToast();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingAdAccount, setEditingAdAccount] = useState<AdAccount | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [platformFilter, setPlatformFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  
  const [formData, setFormData] = useState<AdAccountFormData>({
    platform: "",
    accountName: "",
    accountId: "",
    clientId: "",
    spendLimit: "",
    notes: ""
  });

  // Fetch all ad accounts
  const { 
    data: adAccounts = [], 
    isLoading,
    refetch: refetchAdAccounts 
  } = useQuery<AdAccount[]>({
    queryKey: ["/api/ad-accounts"],
  });

  // Fetch all clients for dropdown
  const { data: clients = [] } = useQuery<Client[]>({
    queryKey: ["/api/clients"],
  });

  // Filter ad accounts based on search term, platform, and status
  const filteredAdAccounts = useMemo(() => {
    return adAccounts.filter(adAccount => {
      const client = clients.find(c => c.id === adAccount.clientId);
      const clientName = client ? client.clientName : "";
      
      const matchesSearch = !searchTerm || 
        adAccount.accountName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        adAccount.accountId.toLowerCase().includes(searchTerm.toLowerCase()) ||
        clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        adAccount.platform.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesPlatform = platformFilter === "all" || adAccount.platform === platformFilter;
      const matchesStatus = statusFilter === "all" || adAccount.status === statusFilter;
      
      return matchesSearch && matchesPlatform && matchesStatus;
    });
  }, [adAccounts, clients, searchTerm, platformFilter, statusFilter]);

  // Create ad account mutation
  const createAdAccountMutation = useMutation({
    mutationFn: async (adAccountData: InsertAdAccount) => {
      const response = await apiRequest("POST", "/api/ad-accounts", adAccountData);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Ad account created successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/ad-accounts"] });
      setIsCreateDialogOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create ad account",
        variant: "destructive",
      });
    },
  });

  // Update ad account mutation
  const updateAdAccountMutation = useMutation({
    mutationFn: async ({ id, adAccountData }: { id: string; adAccountData: Partial<InsertAdAccount> }) => {
      const response = await apiRequest("PUT", `/api/ad-accounts/${id}`, adAccountData);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Ad account updated successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/ad-accounts"] });
      setIsEditDialogOpen(false);
      setEditingAdAccount(null);
      resetForm();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update ad account",
        variant: "destructive",
      });
    },
  });

  // Delete ad account mutation
  const deleteAdAccountMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest("DELETE", `/api/ad-accounts/${id}`);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Ad account deleted successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/ad-accounts"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete ad account",
        variant: "destructive",
      });
    },
  });

  // Toggle ad account status mutation
  const toggleAdAccountStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const response = await apiRequest("PUT", `/api/ad-accounts/${id}`, { status });
      return response.json();
    },
    onSuccess: (data, variables) => {
      toast({
        title: "Success",
        description: `Ad account ${variables.status === 'active' ? 'activated' : 'suspended'} successfully`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/ad-accounts"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update ad account status",
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setFormData({
      platform: "",
      accountName: "",
      accountId: "",
      clientId: "",
      spendLimit: "",
      notes: ""
    });
  };

  const handleCreateAdAccount = () => {
    if (!formData.platform || !formData.accountName.trim() || !formData.accountId.trim() || 
        !formData.clientId || !formData.spendLimit.trim()) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    const spendLimit = parseFloat(formData.spendLimit);
    if (isNaN(spendLimit) || spendLimit <= 0) {
      toast({
        title: "Error",
        description: "Please enter a valid spend limit",
        variant: "destructive",
      });
      return;
    }

    createAdAccountMutation.mutate({
      ...formData,
      spendLimit: spendLimit.toString()
    } as InsertAdAccount);
  };

  const handleEditAdAccount = (adAccount: AdAccount) => {
    setEditingAdAccount(adAccount);
    setFormData({
      platform: adAccount.platform,
      accountName: adAccount.accountName,
      accountId: adAccount.accountId,
      clientId: adAccount.clientId,
      spendLimit: adAccount.spendLimit,
      notes: adAccount.notes || ""
    });
    setIsEditDialogOpen(true);
  };

  const handleUpdateAdAccount = () => {
    if (!editingAdAccount) return;
    
    if (!formData.platform || !formData.accountName.trim() || !formData.accountId.trim() || 
        !formData.clientId || !formData.spendLimit.trim()) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    const spendLimit = parseFloat(formData.spendLimit);
    if (isNaN(spendLimit) || spendLimit <= 0) {
      toast({
        title: "Error",
        description: "Please enter a valid spend limit",
        variant: "destructive",
      });
      return;
    }

    updateAdAccountMutation.mutate({ 
      id: editingAdAccount.id, 
      adAccountData: {
        ...formData,
        spendLimit: spendLimit.toString()
      } as InsertAdAccount 
    });
  };

  const handleDeleteAdAccount = (id: string) => {
    deleteAdAccountMutation.mutate(id);
  };

  const handleToggleStatus = (adAccount: AdAccount) => {
    const newStatus = adAccount.status === 'active' ? 'suspended' : 'active';
    toggleAdAccountStatusMutation.mutate({ id: adAccount.id, status: newStatus });
  };

  const getClientName = (clientId: string) => {
    const client = clients.find(c => c.id === clientId);
    return client ? client.clientName : "Unknown Client";
  };

  const getPlatformIcon = (platform: string) => {
    const platformData = PLATFORMS.find(p => p.value === platform);
    return platformData ? platformData.label : platform;
  };

  const calculateAvailableBalance = (adAccount: AdAccount) => {
    const spendLimit = parseFloat(adAccount.spendLimit || "0");
    const totalSpend = parseFloat(adAccount.totalSpend || "0");
    return spendLimit - totalSpend;
  };

  const formatCurrency = (amount: number | string) => {
    const numAmount = typeof amount === "string" ? parseFloat(amount) : amount;
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(numAmount);
  };

  const handleExportCSV = () => {
    if (filteredAdAccounts.length === 0) {
      toast({
        title: "No Data",
        description: "No ad accounts to export",
        variant: "destructive",
      });
      return;
    }

    const headers = [
      "Account ID",
      "Platform", 
      "Account Name",
      "External Account ID",
      "Linked Client",
      "Status",
      "Spend Limit",
      "Total Spend",
      "Available Balance",
      "Created Date"
    ];

    const csvData = [
      headers,
      ...filteredAdAccounts.map(adAccount => [
        adAccount.id,
        getPlatformIcon(adAccount.platform),
        adAccount.accountName,
        adAccount.accountId,
        getClientName(adAccount.clientId),
        adAccount.status,
        formatCurrency(adAccount.spendLimit),
        formatCurrency(adAccount.totalSpend || "0"),
        formatCurrency(calculateAvailableBalance(adAccount)),
        adAccount.createdAt ? new Date(adAccount.createdAt).toLocaleDateString() : ""
      ])
    ];

    const csvContent = csvData.map(row => 
      row.map(field => `"${field}"`).join(",")
    ).join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `ad-accounts-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({
      title: "Success",
      description: "Ad accounts data exported successfully",
    });
  };

  return (
    <Sidebar>
      <div className="flex-1 flex flex-col">
        <div className="p-8">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Ad Accounts</h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                Manage advertising accounts and spend tracking
              </p>
            </div>
          </div>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Wallet className="h-5 w-5" />
                    Ad Accounts
                  </CardTitle>
                  <CardDescription>
                    View and manage advertising accounts across platforms
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleExportCSV}
                    disabled={filteredAdAccounts.length === 0}
                    data-testid="button-export-csv"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Export CSV
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => refetchAdAccounts()}
                    disabled={isLoading}
                    data-testid="button-refresh-ad-accounts"
                  >
                    <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                  </Button>
                  <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                    <DialogTrigger asChild>
                      <Button data-testid="button-create-ad-account">
                        <Plus className="h-4 w-4 mr-2" />
                        Add Ad Account
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[600px]">
                      <DialogHeader>
                        <DialogTitle>Add New Ad Account</DialogTitle>
                        <DialogDescription>
                          Create a new advertising account linked to a client
                        </DialogDescription>
                      </DialogHeader>
                      <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="grid gap-2">
                            <Label htmlFor="platform">Platform *</Label>
                            <Select value={formData.platform} onValueChange={(value) => setFormData(prev => ({ ...prev, platform: value }))}>
                              <SelectTrigger data-testid="select-platform">
                                <SelectValue placeholder="Select platform" />
                              </SelectTrigger>
                              <SelectContent>
                                {PLATFORMS.map(platform => (
                                  <SelectItem key={platform.value} value={platform.value}>
                                    {platform.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="grid gap-2">
                            <Label htmlFor="clientId">Link to Client *</Label>
                            <Select value={formData.clientId} onValueChange={(value) => setFormData(prev => ({ ...prev, clientId: value }))}>
                              <SelectTrigger data-testid="select-client">
                                <SelectValue placeholder="Select client" />
                              </SelectTrigger>
                              <SelectContent>
                                {clients.map(client => (
                                  <SelectItem key={client.id} value={client.id}>
                                    {client.clientName} ({client.businessName})
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor="accountName">Account Name *</Label>
                          <Input
                            id="accountName"
                            value={formData.accountName}
                            onChange={(e) => setFormData(prev => ({ ...prev, accountName: e.target.value }))}
                            placeholder="Enter account name"
                            data-testid="input-account-name"
                          />
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor="accountId">External Account ID *</Label>
                          <Input
                            id="accountId"
                            value={formData.accountId}
                            onChange={(e) => setFormData(prev => ({ ...prev, accountId: e.target.value }))}
                            placeholder="Enter external account ID"
                            data-testid="input-account-id"
                          />
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor="spendLimit">Spend Limit ($) *</Label>
                          <Input
                            id="spendLimit"
                            type="number"
                            step="0.01"
                            min="0"
                            value={formData.spendLimit}
                            onChange={(e) => setFormData(prev => ({ ...prev, spendLimit: e.target.value }))}
                            placeholder="Enter spend limit"
                            data-testid="input-spend-limit"
                          />
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor="notes">Notes</Label>
                          <Textarea
                            id="notes"
                            value={formData.notes}
                            onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                            placeholder="Enter any additional notes"
                            rows={3}
                            data-testid="input-ad-account-notes"
                          />
                        </div>
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                          Cancel
                        </Button>
                        <Button 
                          onClick={handleCreateAdAccount}
                          disabled={createAdAccountMutation.isPending}
                          data-testid="button-save-ad-account"
                        >
                          {createAdAccountMutation.isPending ? "Creating..." : "Create Ad Account"}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {/* Search and Filter Controls */}
              <div className="flex gap-4 mb-6">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder="Search by account name, ID, client, or platform..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                    data-testid="input-search-ad-accounts"
                  />
                </div>
                <Select value={platformFilter} onValueChange={setPlatformFilter}>
                  <SelectTrigger className="w-48" data-testid="select-platform-filter">
                    <SelectValue placeholder="Filter by platform" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Platforms</SelectItem>
                    {PLATFORMS.map(platform => (
                      <SelectItem key={platform.value} value={platform.value}>
                        {platform.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-48" data-testid="select-status-filter">
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="suspended">Suspended</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {isLoading ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Account ID</TableHead>
                      <TableHead>Platform</TableHead>
                      <TableHead>Account Name</TableHead>
                      <TableHead>Linked Client</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Spend Limit</TableHead>
                      <TableHead>Total Spend</TableHead>
                      <TableHead>Available Balance</TableHead>
                      <TableHead>Created Date</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredAdAccounts.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={10} className="text-center py-8 text-gray-500">
                          {searchTerm || platformFilter !== "all" || statusFilter !== "all" ? 
                            "No ad accounts match your search criteria" : "No ad accounts found"}
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredAdAccounts.map((adAccount) => {
                        const availableBalance = calculateAvailableBalance(adAccount);
                        return (
                          <TableRow key={adAccount.id} data-testid={`row-ad-account-${adAccount.id}`}>
                            <TableCell className="font-mono text-sm" data-testid={`text-ad-account-id-${adAccount.id}`}>
                              {adAccount.id.slice(0, 8)}...
                            </TableCell>
                            <TableCell data-testid={`text-platform-${adAccount.id}`}>
                              <Badge variant="outline" className="font-medium">
                                {getPlatformIcon(adAccount.platform)}
                              </Badge>
                            </TableCell>
                            <TableCell className="font-medium" data-testid={`text-account-name-${adAccount.id}`}>
                              {adAccount.accountName}
                            </TableCell>
                            <TableCell data-testid={`text-linked-client-${adAccount.id}`}>
                              {getClientName(adAccount.clientId)}
                            </TableCell>
                            <TableCell>
                              <Badge 
                                variant={adAccount.status === 'active' ? "default" : "secondary"}
                                className={adAccount.status === 'active' ? 
                                  "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300" : 
                                  "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300"
                                }
                                data-testid={`badge-ad-account-status-${adAccount.id}`}
                              >
                                {adAccount.status === 'active' ? 'Active' : 'Suspended'}
                              </Badge>
                            </TableCell>
                            <TableCell data-testid={`text-spend-limit-${adAccount.id}`}>
                              {formatCurrency(adAccount.spendLimit)}
                            </TableCell>
                            <TableCell data-testid={`text-total-spend-${adAccount.id}`}>
                              {formatCurrency(adAccount.totalSpend || "0")}
                            </TableCell>
                            <TableCell>
                              <span 
                                className={`font-medium ${availableBalance < 0 ? 'text-red-600' : 'text-green-600'}`}
                                data-testid={`text-available-balance-${adAccount.id}`}
                              >
                                {formatCurrency(availableBalance)}
                              </span>
                            </TableCell>
                            <TableCell data-testid={`text-ad-account-created-${adAccount.id}`}>
                              {adAccount.createdAt ? new Date(adAccount.createdAt).toLocaleDateString() : "N/A"}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleToggleStatus(adAccount)}
                                  disabled={toggleAdAccountStatusMutation.isPending}
                                  data-testid={`button-toggle-status-${adAccount.id}`}
                                >
                                  {adAccount.status === 'active' ? (
                                    <Pause className="h-4 w-4" />
                                  ) : (
                                    <Play className="h-4 w-4" />
                                  )}
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleEditAdAccount(adAccount)}
                                  data-testid={`button-edit-ad-account-${adAccount.id}`}
                                >
                                  <Edit3 className="h-4 w-4" />
                                </Button>
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="text-red-600 hover:text-red-700"
                                      data-testid={`button-delete-ad-account-${adAccount.id}`}
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Delete Ad Account</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        Are you sure you want to delete {adAccount.accountName}? This action cannot be undone.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                                      <AlertDialogAction
                                        onClick={() => handleDeleteAdAccount(adAccount.id)}
                                        className="bg-red-600 hover:bg-red-700"
                                        data-testid={`button-confirm-delete-ad-account-${adAccount.id}`}
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
              )}
            </CardContent>
          </Card>

          {/* Edit Ad Account Dialog */}
          <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
            <DialogContent className="sm:max-w-[600px]">
              <DialogHeader>
                <DialogTitle>Edit Ad Account</DialogTitle>
                <DialogDescription>
                  Update advertising account information and settings
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="edit-platform">Platform *</Label>
                    <Select value={formData.platform} onValueChange={(value) => setFormData(prev => ({ ...prev, platform: value }))}>
                      <SelectTrigger data-testid="select-edit-platform">
                        <SelectValue placeholder="Select platform" />
                      </SelectTrigger>
                      <SelectContent>
                        {PLATFORMS.map(platform => (
                          <SelectItem key={platform.value} value={platform.value}>
                            {platform.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="edit-clientId">Link to Client *</Label>
                    <Select value={formData.clientId} onValueChange={(value) => setFormData(prev => ({ ...prev, clientId: value }))}>
                      <SelectTrigger data-testid="select-edit-client">
                        <SelectValue placeholder="Select client" />
                      </SelectTrigger>
                      <SelectContent>
                        {clients.map(client => (
                          <SelectItem key={client.id} value={client.id}>
                            {client.clientName} ({client.businessName})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-accountName">Account Name *</Label>
                  <Input
                    id="edit-accountName"
                    value={formData.accountName}
                    onChange={(e) => setFormData(prev => ({ ...prev, accountName: e.target.value }))}
                    placeholder="Enter account name"
                    data-testid="input-edit-account-name"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-accountId">External Account ID *</Label>
                  <Input
                    id="edit-accountId"
                    value={formData.accountId}
                    onChange={(e) => setFormData(prev => ({ ...prev, accountId: e.target.value }))}
                    placeholder="Enter external account ID"
                    data-testid="input-edit-account-id"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-spendLimit">Spend Limit ($) *</Label>
                  <Input
                    id="edit-spendLimit"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.spendLimit}
                    onChange={(e) => setFormData(prev => ({ ...prev, spendLimit: e.target.value }))}
                    placeholder="Enter spend limit"
                    data-testid="input-edit-spend-limit"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-notes">Notes</Label>
                  <Textarea
                    id="edit-notes"
                    value={formData.notes}
                    onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                    placeholder="Enter any additional notes"
                    rows={3}
                    data-testid="input-edit-ad-account-notes"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={handleUpdateAdAccount}
                  disabled={updateAdAccountMutation.isPending}
                  data-testid="button-update-ad-account"
                >
                  {updateAdAccountMutation.isPending ? "Updating..." : "Update Ad Account"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </Sidebar>
  );
}