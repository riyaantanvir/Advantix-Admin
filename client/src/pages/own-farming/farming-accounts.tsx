import { useState, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Plus, 
  Search, 
  Download, 
  Upload, 
  Edit, 
  Trash2, 
  Eye, 
  EyeOff,
  Leaf,
  Filter,
  X
} from "lucide-react";
import type { FarmingAccount, InsertFarmingAccount, FarmingAccountWithSecrets, User as UserType } from "@shared/schema";
import Sidebar from "@/components/layout/Sidebar";

interface FarmingAccountsPageProps {
  defaultStatus?: string;
  title?: string;
  description?: string;
}

export default function FarmingAccountsPage({ 
  defaultStatus = "farming",
  title = "Farming Accounts",
  description = "Manage your farming accounts with secure storage for sensitive information"
}: FarmingAccountsPageProps) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // State
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState(defaultStatus);
  const [socialMediaFilter, setSocialMediaFilter] = useState<string>("");
  const [vaFilter, setVaFilter] = useState<string>("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<FarmingAccount | null>(null);
  const [viewedSecrets, setViewedSecrets] = useState<Record<string, FarmingAccountWithSecrets>>({});
  const [formData, setFormData] = useState<InsertFarmingAccount>({
    comment: "",
    socialMedia: "facebook",
    vaId: null,
    status: defaultStatus,
    idName: "",
    email: "",
    password: "",
    recoveryEmail: "",
    twoFaSecret: "",
  });

  // Get current user
  const { data: currentUser } = useQuery<UserType>({
    queryKey: ["/api/auth/user"],
  });

  const isAdmin = currentUser?.role === 'admin' || currentUser?.role === 'super_admin';

  // Fetch farming accounts
  const { data: accounts = [], isLoading } = useQuery<FarmingAccount[]>({
    queryKey: ["/api/farming-accounts", { status: statusFilter, socialMedia: socialMediaFilter, va: vaFilter, search: searchTerm }],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (statusFilter) params.append("status", statusFilter);
      if (socialMediaFilter) params.append("socialMedia", socialMediaFilter);
      if (vaFilter) params.append("vaId", vaFilter);
      if (searchTerm) params.append("search", searchTerm);
      
      const response = await fetch(`/api/farming-accounts?${params.toString()}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        }
      });
      return response.json();
    },
  });

  // Fetch users for VA assignment
  const { data: users = [] } = useQuery<UserType[]>({
    queryKey: ["/api/users"],
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (data: InsertFarmingAccount) => {
      const response = await apiRequest("POST", "/api/farming-accounts", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/farming-accounts"] });
      setIsCreateOpen(false);
      resetForm();
      toast({
        title: "Success",
        description: "Farming account created successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create farming account",
        variant: "destructive",
      });
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<InsertFarmingAccount> }) => {
      const response = await apiRequest("PUT", `/api/farming-accounts/${id}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/farming-accounts"] });
      setIsEditOpen(false);
      setSelectedAccount(null);
      resetForm();
      toast({
        title: "Success",
        description: "Farming account updated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update farming account",
        variant: "destructive",
      });
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest("DELETE", `/api/farming-accounts/${id}`, {});
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/farming-accounts"] });
      setIsDeleteOpen(false);
      setSelectedAccount(null);
      toast({
        title: "Success",
        description: "Farming account deleted successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete farming account",
        variant: "destructive",
      });
    },
  });

  // CSV Import mutation
  const importMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      
      const response = await fetch("/api/farming-accounts/import/csv", {
        method: "POST",
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        },
        body: formData,
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message);
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/farming-accounts"] });
      toast({
        title: "Import Complete",
        description: `Successfully imported ${data.success} accounts${data.errors.length > 0 ? ` (${data.errors.length} errors)` : ''}`,
      });
      
      if (data.errors.length > 0) {
        console.error("Import errors:", data.errors);
      }
    },
    onError: (error: any) => {
      toast({
        title: "Import Failed",
        description: error.message || "Failed to import CSV",
        variant: "destructive",
      });
    },
  });

  // View secrets
  const viewSecrets = async (account: FarmingAccount) => {
    if (!isAdmin) {
      toast({
        title: "Access Denied",
        description: "Only administrators can view sensitive information",
        variant: "destructive",
      });
      return;
    }

    if (viewedSecrets[account.id]) {
      // Already loaded, just toggle visibility
      return;
    }

    try {
      const response = await fetch(`/api/farming-accounts/${account.id}?includeSecrets=true`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        }
      });
      
      if (!response.ok) {
        throw new Error("Failed to fetch secrets");
      }
      
      const data: FarmingAccountWithSecrets = await response.json();
      setViewedSecrets(prev => ({ ...prev, [account.id]: data }));
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to load sensitive information",
        variant: "destructive",
      });
    }
  };

  const resetForm = () => {
    setFormData({
      comment: "",
      socialMedia: "facebook",
      vaId: null,
      status: defaultStatus,
      idName: "",
      email: "",
      password: "",
      recoveryEmail: "",
      twoFaSecret: "",
    });
  };

  const handleCreate = () => {
    createMutation.mutate(formData);
  };

  const handleEdit = (account: FarmingAccount) => {
    setSelectedAccount(account);
    setFormData({
      comment: account.comment || "",
      socialMedia: account.socialMedia,
      vaId: account.vaId,
      status: account.status,
      idName: account.idName,
      email: account.email,
      password: "", // Don't populate password for security
      recoveryEmail: "",
      twoFaSecret: "",
    });
    setIsEditOpen(true);
  };

  const handleUpdate = () => {
    if (!selectedAccount) return;
    
    // Only send fields that have values
    const updateData: Partial<InsertFarmingAccount> = {
      comment: formData.comment,
      socialMedia: formData.socialMedia,
      vaId: formData.vaId,
      status: formData.status,
      idName: formData.idName,
      email: formData.email,
    };
    
    if (formData.password) updateData.password = formData.password;
    if (formData.recoveryEmail) updateData.recoveryEmail = formData.recoveryEmail;
    if (formData.twoFaSecret) updateData.twoFaSecret = formData.twoFaSecret;
    
    updateMutation.mutate({ id: selectedAccount.id, data: updateData });
  };

  const handleDelete = (account: FarmingAccount) => {
    setSelectedAccount(account);
    setIsDeleteOpen(true);
  };

  const confirmDelete = () => {
    if (!selectedAccount) return;
    deleteMutation.mutate(selectedAccount.id);
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      importMutation.mutate(file);
    }
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleExport = async (includeSecrets: boolean) => {
    if (includeSecrets && !isAdmin) {
      toast({
        title: "Access Denied",
        description: "Only administrators can export with secrets",
        variant: "destructive",
      });
      return;
    }

    try {
      const params = new URLSearchParams();
      if (includeSecrets) params.append("includeSecrets", "true");
      
      const response = await fetch(`/api/farming-accounts/export/csv?${params.toString()}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        }
      });
      
      if (!response.ok) {
        throw new Error("Export failed");
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `farming-accounts-${Date.now()}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast({
        title: "Export Complete",
        description: "CSV file downloaded successfully",
      });
    } catch (error: any) {
      toast({
        title: "Export Failed",
        description: error.message || "Failed to export CSV",
        variant: "destructive",
      });
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, string> = {
      new: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
      farming: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
      suspended: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
      inactive: "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200",
    };
    
    return (
      <Badge className={variants[status] || variants.inactive}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const clearFilters = () => {
    setStatusFilter(defaultStatus);
    setSocialMediaFilter("");
    setVaFilter("");
    setSearchTerm("");
  };

  return (
    <Sidebar>
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Leaf className="h-8 w-8 text-green-600" />
            {title}
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">{description}</p>
        </div>

      <Card>
        <CardHeader>
          <CardTitle>Filters & Actions</CardTitle>
          <CardDescription>Search, filter and manage farming accounts</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search and Filters */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="md:col-span-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search by name, email or comment..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                  data-testid="input-search-accounts"
                />
              </div>
            </div>
            
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger data-testid="select-status-filter">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Statuses</SelectItem>
                <SelectItem value="new">New</SelectItem>
                <SelectItem value="farming">Farming</SelectItem>
                <SelectItem value="suspended">Suspended</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={socialMediaFilter} onValueChange={setSocialMediaFilter}>
              <SelectTrigger data-testid="select-social-filter">
                <SelectValue placeholder="All Platforms" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Platforms</SelectItem>
                <SelectItem value="facebook">Facebook</SelectItem>
                <SelectItem value="tiktok">TikTok</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={vaFilter} onValueChange={setVaFilter}>
              <SelectTrigger data-testid="select-va-filter">
                <SelectValue placeholder="All VAs" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All VAs</SelectItem>
                {users.map(user => (
                  <SelectItem key={user.id} value={user.id}>
                    {user.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button onClick={() => setIsCreateOpen(true)} data-testid="button-create-account">
              <Plus className="h-4 w-4 mr-2" />
              Add Account
            </Button>
            
            <Button variant="outline" onClick={() => fileInputRef.current?.click()} data-testid="button-import-csv">
              <Upload className="h-4 w-4 mr-2" />
              Import CSV
            </Button>
            
            <Button variant="outline" onClick={() => handleExport(false)} data-testid="button-export-csv">
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
            
            {isAdmin && (
              <Button variant="outline" onClick={() => handleExport(true)} data-testid="button-export-with-secrets">
                <Download className="h-4 w-4 mr-2" />
                Export with Secrets
              </Button>
            )}
            
            {(statusFilter !== defaultStatus || socialMediaFilter || vaFilter || searchTerm) && (
              <Button variant="ghost" onClick={clearFilters} data-testid="button-clear-filters">
                <X className="h-4 w-4 mr-2" />
                Clear Filters
              </Button>
            )}
          </div>
          
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            onChange={handleFileUpload}
            className="hidden"
          />
        </CardContent>
      </Card>

      {/* Accounts Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Platform</TableHead>
                  <TableHead>ID Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>VA</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Account Age</TableHead>
                  <TableHead>Comment</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8">
                      Loading accounts...
                    </TableCell>
                  </TableRow>
                ) : accounts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8">
                      No farming accounts found
                    </TableCell>
                  </TableRow>
                ) : (
                  accounts.map((account) => {
                    const secrets = viewedSecrets[account.id];
                    const vaUser = users.find(u => u.id === account.vaId);
                    
                    return (
                      <TableRow key={account.id} data-testid={`row-account-${account.id}`}>
                        <TableCell>
                          <Badge variant="outline">
                            {account.socialMedia.toUpperCase()}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-medium">{account.idName}</TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <div>{account.email}</div>
                            {secrets?.recoveryEmail && (
                              <div className="text-xs text-gray-500">
                                Recovery: {secrets.recoveryEmail}
                              </div>
                            )}
                            {secrets?.passwordDecrypted && (
                              <div className="text-xs font-mono text-gray-500">
                                Pass: {secrets.passwordDecrypted}
                              </div>
                            )}
                            {secrets?.twoFaSecret && (
                              <div className="text-xs font-mono text-gray-500">
                                2FA: {secrets.twoFaSecret}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{vaUser?.name || "-"}</TableCell>
                        <TableCell>{getStatusBadge(account.status)}</TableCell>
                        <TableCell>
                          {account.createdAt ? 
                            `${Math.floor((Date.now() - new Date(account.createdAt).getTime()) / (1000 * 60 * 60 * 24))} days` 
                            : "-"}
                        </TableCell>
                        <TableCell className="max-w-xs truncate">{account.comment || "-"}</TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            {isAdmin && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => viewSecrets(account)}
                                data-testid={`button-view-secrets-${account.id}`}
                              >
                                {secrets ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEdit(account)}
                              data-testid={`button-edit-${account.id}`}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(account)}
                              data-testid={`button-delete-${account.id}`}
                            >
                              <Trash2 className="h-4 w-4 text-red-600" />
                            </Button>
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

      {/* Create Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add Farming Account</DialogTitle>
            <DialogDescription>Create a new farming account with secure credential storage</DialogDescription>
          </DialogHeader>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="create-platform">Platform *</Label>
              <Select value={formData.socialMedia} onValueChange={(value) => setFormData(prev => ({ ...prev, socialMedia: value }))}>
                <SelectTrigger id="create-platform" data-testid="select-create-platform">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="facebook">Facebook</SelectItem>
                  <SelectItem value="tiktok">TikTok</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="create-status">Status *</Label>
              <Select value={formData.status} onValueChange={(value) => setFormData(prev => ({ ...prev, status: value }))}>
                <SelectTrigger id="create-status" data-testid="select-create-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="new">New</SelectItem>
                  <SelectItem value="farming">Farming</SelectItem>
                  <SelectItem value="suspended">Suspended</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="create-idname">ID Name *</Label>
              <Input
                id="create-idname"
                value={formData.idName}
                onChange={(e) => setFormData(prev => ({ ...prev, idName: e.target.value }))}
                placeholder="Enter account name"
                data-testid="input-create-idname"
              />
            </div>
            
            <div>
              <Label htmlFor="create-email">Email *</Label>
              <Input
                id="create-email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                placeholder="account@example.com"
                data-testid="input-create-email"
              />
            </div>
            
            <div>
              <Label htmlFor="create-password">Password *</Label>
              <Input
                id="create-password"
                type="password"
                value={formData.password}
                onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                placeholder="Enter password"
                data-testid="input-create-password"
              />
            </div>
            
            <div>
              <Label htmlFor="create-recovery">Recovery Email</Label>
              <Input
                id="create-recovery"
                type="email"
                value={formData.recoveryEmail}
                onChange={(e) => setFormData(prev => ({ ...prev, recoveryEmail: e.target.value }))}
                placeholder="recovery@example.com"
                data-testid="input-create-recovery"
              />
            </div>
            
            <div>
              <Label htmlFor="create-2fa">2FA Secret</Label>
              <Input
                id="create-2fa"
                value={formData.twoFaSecret}
                onChange={(e) => setFormData(prev => ({ ...prev, twoFaSecret: e.target.value }))}
                placeholder="Enter 2FA secret"
                data-testid="input-create-2fa"
              />
            </div>
            
            <div>
              <Label htmlFor="create-va">Assign to VA</Label>
              <Select value={formData.vaId || ""} onValueChange={(value) => setFormData(prev => ({ ...prev, vaId: value || null }))}>
                <SelectTrigger id="create-va" data-testid="select-create-va">
                  <SelectValue placeholder="Select VA" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">None</SelectItem>
                  {users.map(user => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="col-span-2">
              <Label htmlFor="create-comment">Comment</Label>
              <Input
                id="create-comment"
                value={formData.comment || ""}
                onChange={(e) => setFormData(prev => ({ ...prev, comment: e.target.value }))}
                placeholder="Add notes or comments"
                data-testid="input-create-comment"
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={createMutation.isPending} data-testid="button-confirm-create">
              {createMutation.isPending ? "Creating..." : "Create Account"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Farming Account</DialogTitle>
            <DialogDescription>Update account information (leave password fields empty to keep current values)</DialogDescription>
          </DialogHeader>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="edit-platform">Platform *</Label>
              <Select value={formData.socialMedia} onValueChange={(value) => setFormData(prev => ({ ...prev, socialMedia: value }))}>
                <SelectTrigger id="edit-platform" data-testid="select-edit-platform">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="facebook">Facebook</SelectItem>
                  <SelectItem value="tiktok">TikTok</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="edit-status">Status *</Label>
              <Select value={formData.status} onValueChange={(value) => setFormData(prev => ({ ...prev, status: value }))}>
                <SelectTrigger id="edit-status" data-testid="select-edit-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="new">New</SelectItem>
                  <SelectItem value="farming">Farming</SelectItem>
                  <SelectItem value="suspended">Suspended</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="edit-idname">ID Name *</Label>
              <Input
                id="edit-idname"
                value={formData.idName}
                onChange={(e) => setFormData(prev => ({ ...prev, idName: e.target.value }))}
                placeholder="Enter account name"
                data-testid="input-edit-idname"
              />
            </div>
            
            <div>
              <Label htmlFor="edit-email">Email *</Label>
              <Input
                id="edit-email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                placeholder="account@example.com"
                data-testid="input-edit-email"
              />
            </div>
            
            <div>
              <Label htmlFor="edit-password">Password (leave empty to keep current)</Label>
              <Input
                id="edit-password"
                type="password"
                value={formData.password}
                onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                placeholder="Enter new password"
                data-testid="input-edit-password"
              />
            </div>
            
            <div>
              <Label htmlFor="edit-recovery">Recovery Email</Label>
              <Input
                id="edit-recovery"
                type="email"
                value={formData.recoveryEmail}
                onChange={(e) => setFormData(prev => ({ ...prev, recoveryEmail: e.target.value }))}
                placeholder="recovery@example.com"
                data-testid="input-edit-recovery"
              />
            </div>
            
            <div>
              <Label htmlFor="edit-2fa">2FA Secret</Label>
              <Input
                id="edit-2fa"
                value={formData.twoFaSecret}
                onChange={(e) => setFormData(prev => ({ ...prev, twoFaSecret: e.target.value }))}
                placeholder="Enter 2FA secret"
                data-testid="input-edit-2fa"
              />
            </div>
            
            <div>
              <Label htmlFor="edit-va">Assign to VA</Label>
              <Select value={formData.vaId || ""} onValueChange={(value) => setFormData(prev => ({ ...prev, vaId: value || null }))}>
                <SelectTrigger id="edit-va" data-testid="select-edit-va">
                  <SelectValue placeholder="Select VA" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">None</SelectItem>
                  {users.map(user => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="col-span-2">
              <Label htmlFor="edit-comment">Comment</Label>
              <Input
                id="edit-comment"
                value={formData.comment || ""}
                onChange={(e) => setFormData(prev => ({ ...prev, comment: e.target.value }))}
                placeholder="Add notes or comments"
                data-testid="input-edit-comment"
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditOpen(false)}>Cancel</Button>
            <Button onClick={handleUpdate} disabled={updateMutation.isPending} data-testid="button-confirm-update">
              {updateMutation.isPending ? "Updating..." : "Update Account"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Farming Account?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{selectedAccount?.idName}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-red-600 hover:bg-red-700">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      </div>
    </Sidebar>
  );
}
