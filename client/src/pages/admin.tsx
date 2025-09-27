import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import Sidebar from "@/components/layout/Sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { UserPlus, Edit3, Trash2, Users, Shield, RefreshCw, Settings, Lock, DollarSign, Tag as TagIcon, Plus, Database, Download, Upload, FileText, AlertCircle } from "lucide-react";
import type { User, InsertUserWithRole, Page, RolePermission, Tag, InsertTag, UserMenuPermission, InsertUserMenuPermission } from "@shared/schema";

interface UserFormData {
  name: string;
  username: string;
  password: string;
  role: string;
}

function UserManagement() {
  const { toast } = useToast();

  // Get current user to check permissions
  const { data: currentUser } = useQuery<{ id: string; username: string; role: string }>({
    queryKey: ["/api/auth/user"],
  });

  // Fetch all users
  const { 
    data: users = [], 
    isLoading: usersLoading,
    refetch: refetchUsers 
  } = useQuery<User[]>({
    queryKey: ["/api/users"],
  });

  // Fetch all user menu permissions
  const { 
    data: userMenuPermissions = [], 
    isLoading: permissionsLoading,
    refetch: refetchPermissions 
  } = useQuery<UserMenuPermission[]>({
    queryKey: ["/api/user-menu-permissions"],
  });

  // Update user menu permission mutation
  const updatePermissionMutation = useMutation({
    mutationFn: async ({ userId, permission, value }: { userId: string; permission: string; value: boolean }) => {
      // Get existing permissions for this user
      const existing = userMenuPermissions.find(p => p.userId === userId);
      
      if (existing) {
        // Update existing permission
        const updateData = { [permission]: value };
        const response = await apiRequest("PUT", `/api/user-menu-permissions/${userId}`, updateData);
        return response.json();
      } else {
        // Create new permission record
        const newPermission = {
          userId,
          dashboard: permission === 'dashboard' ? value : false,
          expenseEntry: permission === 'expenseEntry' ? value : false,
          adminPanel: permission === 'adminPanel' ? value : false,
          advantixAgency: permission === 'advantixAgency' ? value : false,
          investmentMgmt: permission === 'investmentMgmt' ? value : false,
          fundMgmt: permission === 'fundMgmt' ? value : false,
          subscriptions: permission === 'subscriptions' ? value : false,
        };
        const response = await apiRequest("POST", "/api/user-menu-permissions", newPermission);
        return response.json();
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user-menu-permissions"] });
      toast({
        title: "Permission updated",
        description: "User menu permission has been updated successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update permission",
        variant: "destructive",
      });
    },
  });

  const getUserPermissions = (userId: string) => {
    const permission = userMenuPermissions.find(p => p.userId === userId);
    if (!permission) {
      return {
        dashboard: false,
        expenseEntry: false,
        adminPanel: false,
        advantixAgency: false,
        investmentMgmt: false,
        fundMgmt: false,
        subscriptions: false,
      };
    }
    return permission;
  };

  const handlePermissionToggle = (userId: string, permission: string, value: boolean) => {
    updatePermissionMutation.mutate({ userId, permission, value });
  };

  // Check if current user is Super Admin
  const isSupeAdmin = currentUser?.role === 'super_admin';

  if (!isSupeAdmin) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Card className="w-96">
          <CardContent className="p-8 text-center">
            <Shield className="h-16 w-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
            <p className="text-gray-600 dark:text-gray-400">
              Only Super Admins can access the Admin Panel.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (usersLoading || permissionsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600 dark:text-gray-400">Loading user management...</span>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              User Management
            </CardTitle>
            <CardDescription>
              Manage user access to different menu options
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              refetchUsers();
              refetchPermissions();
            }}
            disabled={usersLoading || permissionsLoading}
            data-testid="button-refresh-permissions"
          >
            <RefreshCw className={`h-4 w-4 ${usersLoading || permissionsLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="font-semibold">Username</TableHead>
                <TableHead className="text-center font-semibold">Dashboard</TableHead>
                <TableHead className="text-center font-semibold">Expense Entry</TableHead>
                <TableHead className="text-center font-semibold">Admin Panel</TableHead>
                <TableHead className="text-center font-semibold">Advantix Agency</TableHead>
                <TableHead className="text-center font-semibold">Investment Mgmt</TableHead>
                <TableHead className="text-center font-semibold">Fund Mgmt</TableHead>
                <TableHead className="text-center font-semibold">Subscriptions</TableHead>
                <TableHead className="text-center font-semibold">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8 text-gray-500">
                    No users found
                  </TableCell>
                </TableRow>
              ) : (
                users.map((user) => {
                  const permissions = getUserPermissions(user.id);
                  return (
                    <TableRow key={user.id} data-testid={`row-user-${user.id}`}>
                      <TableCell className="font-medium" data-testid={`text-username-${user.id}`}>
                        {user.username}
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex justify-center">
                          <Switch
                            checked={permissions.dashboard || false}
                            onCheckedChange={(checked) => handlePermissionToggle(user.id, 'dashboard', checked)}
                            data-testid={`switch-dashboard-${user.id}`}
                          />
                        </div>
                        <span className={`text-sm font-medium ${permissions.dashboard ? 'text-green-600' : 'text-red-600'}`}>
                          {permissions.dashboard ? 'Yes' : 'No'}
                        </span>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex justify-center">
                          <Switch
                            checked={permissions.expenseEntry || false}
                            onCheckedChange={(checked) => handlePermissionToggle(user.id, 'expenseEntry', checked)}
                            data-testid={`switch-expense-entry-${user.id}`}
                          />
                        </div>
                        <span className={`text-sm font-medium ${permissions.expenseEntry ? 'text-green-600' : 'text-red-600'}`}>
                          {permissions.expenseEntry ? 'Yes' : 'No'}
                        </span>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex justify-center">
                          <Switch
                            checked={permissions.adminPanel || false}
                            onCheckedChange={(checked) => handlePermissionToggle(user.id, 'adminPanel', checked)}
                            data-testid={`switch-admin-panel-${user.id}`}
                          />
                        </div>
                        <span className={`text-sm font-medium ${permissions.adminPanel ? 'text-green-600' : 'text-red-600'}`}>
                          {permissions.adminPanel ? 'Yes' : 'No'}
                        </span>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex justify-center">
                          <Switch
                            checked={permissions.advantixAgency || false}
                            onCheckedChange={(checked) => handlePermissionToggle(user.id, 'advantixAgency', checked)}
                            data-testid={`switch-advantix-agency-${user.id}`}
                          />
                        </div>
                        <span className={`text-sm font-medium ${permissions.advantixAgency ? 'text-green-600' : 'text-red-600'}`}>
                          {permissions.advantixAgency ? 'Yes' : 'No'}
                        </span>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex justify-center">
                          <Switch
                            checked={permissions.investmentMgmt || false}
                            onCheckedChange={(checked) => handlePermissionToggle(user.id, 'investmentMgmt', checked)}
                            data-testid={`switch-investment-mgmt-${user.id}`}
                          />
                        </div>
                        <span className={`text-sm font-medium ${permissions.investmentMgmt ? 'text-green-600' : 'text-red-600'}`}>
                          {permissions.investmentMgmt ? 'Yes' : 'No'}
                        </span>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex justify-center">
                          <Switch
                            checked={permissions.fundMgmt || false}
                            onCheckedChange={(checked) => handlePermissionToggle(user.id, 'fundMgmt', checked)}
                            data-testid={`switch-fund-mgmt-${user.id}`}
                          />
                        </div>
                        <span className={`text-sm font-medium ${permissions.fundMgmt ? 'text-green-600' : 'text-red-600'}`}>
                          {permissions.fundMgmt ? 'Yes' : 'No'}
                        </span>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex justify-center">
                          <Switch
                            checked={permissions.subscriptions || false}
                            onCheckedChange={(checked) => handlePermissionToggle(user.id, 'subscriptions', checked)}
                            data-testid={`switch-subscriptions-${user.id}`}
                          />
                        </div>
                        <span className={`text-sm font-medium ${permissions.subscriptions ? 'text-green-600' : 'text-red-600'}`}>
                          {permissions.subscriptions ? 'Yes' : 'No'}
                        </span>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            data-testid={`button-edit-permissions-${user.id}`}
                          >
                            <Edit3 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-red-600 hover:text-red-700"
                            data-testid={`button-delete-permissions-${user.id}`}
                          >
                            <Trash2 className="h-4 w-4" />
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
  );
}

// Access Control Component
function AccessControl() {
  const { toast } = useToast();
  
  // Fetch pages and role permissions
  const { data: pages = [], isLoading: pagesLoading } = useQuery<Page[]>({
    queryKey: ["/api/pages"],
  });

  const { data: rolePermissions = [], isLoading: permissionsLoading, refetch } = useQuery<RolePermission[]>({
    queryKey: ["/api/role-permissions"],
  });

  // Update permission mutation
  const updatePermissionMutation = useMutation({
    mutationFn: async ({ id, canView, canEdit, canDelete }: { id: string, canView?: boolean, canEdit?: boolean, canDelete?: boolean }) => {
      const response = await apiRequest("PUT", `/api/role-permissions/${id}`, {
        canView,
        canEdit,
        canDelete,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/role-permissions"] });
      toast({
        title: "Permission updated",
        description: "Role permission has been updated successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update permission",
        variant: "destructive",
      });
    },
  });

  const roles = ["user", "manager", "admin", "super_admin"];

  const getRoleDisplayName = (role: string) => {
    switch (role) {
      case "user": return "User";
      case "manager": return "Manager";
      case "admin": return "Admin";
      case "super_admin": return "Super Admin";
      default: return role;
    }
  };

  const getPermissionForRoleAndPage = (role: string, pageId: string) => {
    return rolePermissions.find(p => p.role === role && p.pageId === pageId);
  };

  const handlePermissionToggle = (permissionId: string, action: 'view' | 'edit' | 'delete', value: boolean) => {
    const updateData: any = { id: permissionId };
    updateData[`can${action.charAt(0).toUpperCase() + action.slice(1)}`] = value;
    updatePermissionMutation.mutate(updateData);
  };

  if (pagesLoading || permissionsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600 dark:text-gray-400">Loading access control settings...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Lock className="w-6 h-6" />
            Access Control
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            Manage page visibility and permissions for each role
          </p>
        </div>
        <Button onClick={() => refetch()} variant="outline" size="sm">
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Role-Based Page Permissions</CardTitle>
          <CardDescription>
            Configure which pages each role can access and what actions they can perform.
            Changes are saved automatically.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {/* Desktop View - Full Table with Proper Scrolling */}
          <div className="hidden lg:block">
            <div className="h-[calc(100vh-24rem)] min-h-[400px] max-h-[600px] overflow-auto border-t relative">
              <Table className="relative">
                <TableHeader className="sticky top-0 bg-white dark:bg-gray-900 z-30 shadow-sm border-b">
                  <TableRow>
                    <TableHead className="w-56 bg-white dark:bg-gray-900 sticky left-0 z-40 border-r shadow-sm">
                      <div className="font-semibold">Page</div>
                    </TableHead>
                    {roles.map(role => (
                      <TableHead key={role} className="text-center min-w-[200px] bg-white dark:bg-gray-900 px-4">
                        <div className="flex flex-col items-center gap-1">
                          <Shield className="w-4 h-4" />
                          <span className="font-medium">{getRoleDisplayName(role)}</span>
                        </div>
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pages.map((page, index) => (
                    <TableRow key={page.id} className={index % 2 === 0 ? "bg-gray-50/50 dark:bg-gray-800/50" : ""}>
                      <TableCell className="font-medium bg-white dark:bg-gray-900 sticky left-0 z-20 border-r shadow-sm w-56">
                        <div className="flex flex-col py-2 pr-4">
                          <span className="font-semibold text-sm">{page.displayName}</span>
                          <span className="text-xs text-gray-500">{page.path}</span>
                          {page.description && (
                            <span className="text-xs text-gray-400 mt-1 line-clamp-2">{page.description}</span>
                          )}
                        </div>
                      </TableCell>
                      {roles.map(role => {
                        const permission = getPermissionForRoleAndPage(role, page.id);
                        if (!permission) return (
                          <TableCell key={role} className="text-center text-gray-400 px-4">
                            <div className="py-4">No permission found</div>
                          </TableCell>
                        );

                        return (
                          <TableCell key={role} className="text-center px-4">
                            <div className="grid grid-cols-3 gap-2 py-3">
                              {/* View Permission */}
                              <div className="flex flex-col items-center space-y-1">
                                <Switch
                                  checked={permission.canView ?? false}
                                  onCheckedChange={(checked) => handlePermissionToggle(permission.id, 'view', checked)}
                                  disabled={updatePermissionMutation.isPending}
                                  data-testid={`switch-view-${role}-${page.pageKey}`}

                                />
                                <span className="text-xs text-gray-600 font-medium">View</span>
                              </div>
                              
                              {/* Edit Permission */}
                              <div className="flex flex-col items-center space-y-1">
                                <Switch
                                  checked={permission.canEdit ?? false}
                                  onCheckedChange={(checked) => handlePermissionToggle(permission.id, 'edit', checked)}
                                  disabled={updatePermissionMutation.isPending || !permission.canView}
                                  data-testid={`switch-edit-${role}-${page.pageKey}`}

                                />
                                <span className="text-xs text-gray-600 font-medium">Edit</span>
                              </div>
                              
                              {/* Delete Permission */}
                              <div className="flex flex-col items-center space-y-1">
                                <Switch
                                  checked={permission.canDelete ?? false}
                                  onCheckedChange={(checked) => handlePermissionToggle(permission.id, 'delete', checked)}
                                  disabled={updatePermissionMutation.isPending || !permission.canView}
                                  data-testid={`switch-delete-${role}-${page.pageKey}`}

                                />
                                <span className="text-xs text-gray-600 font-medium">Delete</span>
                              </div>
                            </div>
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>

          {/* Tablet View - Horizontally Scrollable */}
          <div className="hidden md:block lg:hidden">
            <div className="h-[calc(100vh-24rem)] min-h-[400px] max-h-[500px] overflow-auto border-t">
              <div className="min-w-[800px]">
                <Table>
                  <TableHeader className="sticky top-0 bg-white dark:bg-gray-900 z-10 shadow-sm">
                    <TableRow>
                      <TableHead className="w-48 bg-white dark:bg-gray-900 sticky left-0 z-20 border-r">Page</TableHead>
                      {roles.map(role => (
                        <TableHead key={role} className="text-center min-w-[150px] bg-white dark:bg-gray-900">
                          <div className="flex flex-col items-center">
                            <Shield className="w-4 h-4 mb-1" />
                            {getRoleDisplayName(role)}
                          </div>
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pages.map(page => (
                      <TableRow key={page.id}>
                        <TableCell className="font-medium bg-white dark:bg-gray-900 sticky left-0 z-10 border-r w-48">
                          <div className="flex flex-col">
                            <span className="font-semibold text-sm">{page.displayName}</span>
                            <span className="text-xs text-gray-500">{page.path}</span>
                          </div>
                        </TableCell>
                        {roles.map(role => {
                          const permission = getPermissionForRoleAndPage(role, page.id);
                          if (!permission) return (
                            <TableCell key={role} className="text-center text-gray-400">
                              No permission found
                            </TableCell>
                          );

                          return (
                            <TableCell key={role} className="text-center">
                              <div className="flex justify-center space-x-1 py-2">
                                <div className="flex flex-col items-center space-y-1">
                                  <Switch
                                    checked={permission.canView ?? false}
                                    onCheckedChange={(checked) => handlePermissionToggle(permission.id, 'view', checked)}
                                    disabled={updatePermissionMutation.isPending}
                                    data-testid={`switch-view-${role}-${page.pageKey}`}
  
                                  />
                                  <span className="text-xs">V</span>
                                </div>
                                <div className="flex flex-col items-center space-y-1">
                                  <Switch
                                    checked={permission.canEdit ?? false}
                                    onCheckedChange={(checked) => handlePermissionToggle(permission.id, 'edit', checked)}
                                    disabled={updatePermissionMutation.isPending || !permission.canView}
                                    data-testid={`switch-edit-${role}-${page.pageKey}`}
  
                                  />
                                  <span className="text-xs">E</span>
                                </div>
                                <div className="flex flex-col items-center space-y-1">
                                  <Switch
                                    checked={permission.canDelete ?? false}
                                    onCheckedChange={(checked) => handlePermissionToggle(permission.id, 'delete', checked)}
                                    disabled={updatePermissionMutation.isPending || !permission.canView}
                                    data-testid={`switch-delete-${role}-${page.pageKey}`}
  
                                  />
                                  <span className="text-xs">D</span>
                                </div>
                              </div>
                            </TableCell>
                          );
                        })}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>

          {/* Mobile View - Stacked Cards */}
          <div className="md:hidden">
            <div className="h-[calc(100vh-20rem)] min-h-[400px] overflow-y-auto p-4 space-y-4">
              {pages.map(page => (
                <div key={page.id} className="border rounded-lg p-4 space-y-4 bg-white dark:bg-gray-800">
                  <div className="border-b pb-3">
                    <h3 className="font-semibold text-lg">{page.displayName}</h3>
                    <p className="text-sm text-gray-500">{page.path}</p>
                    {page.description && (
                      <p className="text-xs text-gray-400 mt-1">{page.description}</p>
                    )}
                  </div>
                  
                  <div className="space-y-4">
                    {roles.map(role => {
                      const permission = getPermissionForRoleAndPage(role, page.id);
                      if (!permission) return (
                        <div key={role} className="text-center text-gray-400 p-2">
                          <div className="font-medium mb-2">{getRoleDisplayName(role)}</div>
                          <div>No permission found</div>
                        </div>
                      );

                      return (
                        <div key={role} className="border rounded p-3 bg-gray-50 dark:bg-gray-700">
                          <div className="font-medium text-center mb-3 flex items-center justify-center gap-1">
                            <Shield className="w-4 h-4" />
                            {getRoleDisplayName(role)}
                          </div>
                          <div className="grid grid-cols-3 gap-3">
                            {/* View Permission */}
                            <div className="flex flex-col items-center space-y-2">
                              <Switch
                                checked={permission.canView ?? false}
                                onCheckedChange={(checked) => handlePermissionToggle(permission.id, 'view', checked)}
                                disabled={updatePermissionMutation.isPending}
                                data-testid={`switch-view-${role}-${page.pageKey}`}
                              />
                              <span className="text-sm text-gray-600 text-center">View</span>
                            </div>
                            
                            {/* Edit Permission */}
                            <div className="flex flex-col items-center space-y-2">
                              <Switch
                                checked={permission.canEdit ?? false}
                                onCheckedChange={(checked) => handlePermissionToggle(permission.id, 'edit', checked)}
                                disabled={updatePermissionMutation.isPending || !permission.canView}
                                data-testid={`switch-edit-${role}-${page.pageKey}`}
                              />
                              <span className="text-sm text-gray-600 text-center">Edit</span>
                            </div>
                            
                            {/* Delete Permission */}
                            <div className="flex flex-col items-center space-y-2">
                              <Switch
                                checked={permission.canDelete ?? false}
                                onCheckedChange={(checked) => handlePermissionToggle(permission.id, 'delete', checked)}
                                disabled={updatePermissionMutation.isPending || !permission.canView}
                                data-testid={`switch-delete-${role}-${page.pageKey}`}
                              />
                              <span className="text-sm text-gray-600 text-center">Delete</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Permission Guidelines</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
            <p>• <strong>View:</strong> Access to view the page content</p>
            <p>• <strong>Edit:</strong> Ability to modify content (requires View permission)</p>
            <p>• <strong>Delete:</strong> Ability to delete content (requires View permission)</p>
            <p>• <strong>Super Admin:</strong> Always has full access to all pages regardless of settings</p>
            <p>• Changes are automatically saved and will take effect immediately for users</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function FinanceAccessControl() {
  const { toast } = useToast();
  const [isCreateTagOpen, setIsCreateTagOpen] = useState(false);
  const [isEditTagOpen, setIsEditTagOpen] = useState(false);
  const [editingTag, setEditingTag] = useState<Tag | null>(null);
  const [tagFormData, setTagFormData] = useState({ name: "", description: "", color: "#3B82F6" });
  
  const [isCreateEmployeeOpen, setIsCreateEmployeeOpen] = useState(false);
  const [isEditEmployeeOpen, setIsEditEmployeeOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [employeeFormData, setEmployeeFormData] = useState({ name: "", department: "", position: "", notes: "" });
  
  // Fetch all users
  const { data: users = [], isLoading: usersLoading } = useQuery<User[]>({
    queryKey: ["/api/users"],
  });

  // Fetch tags
  const { data: tags = [], isLoading: tagsLoading, refetch: refetchTags } = useQuery<Tag[]>({
    queryKey: ["/api/tags"],
  });

  // Fetch employees (dedicated employees table)
  const { data: employees = [], isLoading: employeesLoading, refetch: refetchEmployees } = useQuery<Employee[]>({
    queryKey: ["/api/employees"],
  });

  // Fetch finance page and role permissions
  const { data: pages = [] } = useQuery<Page[]>({
    queryKey: ["/api/pages"],
  });

  const { data: rolePermissions = [], refetch: refetchPermissions } = useQuery<RolePermission[]>({
    queryKey: ["/api/role-permissions"],
  });

  // Find the finance page
  const financePage = pages.find(p => p.pageKey === 'finance');

  // Update permission mutation
  const updatePermissionMutation = useMutation({
    mutationFn: async ({ userId, hasAccess }: { userId: string, hasAccess: boolean }) => {
      const user = users.find(u => u.id === userId);
      if (!user || !financePage) return;

      // Find existing permission for this user's role and finance page
      const existingPermission = rolePermissions.find(p => 
        p.role === user.role && p.pageId === financePage.id
      );

      if (existingPermission) {
        // Update existing permission
        const response = await apiRequest("PUT", `/api/role-permissions/${existingPermission.id}`, {
          canView: hasAccess,
          canEdit: hasAccess,
          canDelete: hasAccess,
        });
        return response.json();
      } else if (hasAccess) {
        // Create new permission
        const response = await apiRequest("POST", "/api/role-permissions", {
          role: user.role,
          pageId: financePage.id,
          canView: true,
          canEdit: true,
          canDelete: true,
        });
        return response.json();
      }
    },
    onSuccess: () => {
      refetchPermissions();
      toast({
        title: "Success",
        description: "Finance access updated successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update finance access",
        variant: "destructive",
      });
    },
  });

  // Helper to check if user has finance access
  const getUserFinanceAccess = (user: User) => {
    if (!financePage) return false;
    if (user.role === 'super_admin') return true; // Super admins always have access
    
    const permission = rolePermissions.find(p => 
      p.role === user.role && p.pageId === financePage.id
    );
    return permission?.canView ?? false;
  };

  const handleAccessToggle = (userId: string, hasAccess: boolean) => {
    updatePermissionMutation.mutate({ userId, hasAccess });
  };

  // Tag mutations
  const createTagMutation = useMutation({
    mutationFn: async (tagData: InsertTag) => {
      const response = await apiRequest("POST", "/api/tags", tagData);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Tag created successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/tags"] });
      setIsCreateTagOpen(false);
      resetTagForm();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create tag",
        variant: "destructive",
      });
    },
  });

  const updateTagMutation = useMutation({
    mutationFn: async ({ id, tagData }: { id: string; tagData: Partial<InsertTag> }) => {
      const response = await apiRequest("PUT", `/api/tags/${id}`, tagData);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Tag updated successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/tags"] });
      setIsEditTagOpen(false);
      setEditingTag(null);
      resetTagForm();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update tag",
        variant: "destructive",
      });
    },
  });

  const deleteTagMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest("DELETE", `/api/tags/${id}`);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Tag deleted successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/tags"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete tag",
        variant: "destructive",
      });
    },
  });

  const resetTagForm = () => {
    setTagFormData({ name: "", description: "", color: "#3B82F6" });
  };

  const handleCreateTag = () => {
    if (!tagFormData.name.trim()) {
      toast({
        title: "Error",
        description: "Tag name is required",
        variant: "destructive",
      });
      return;
    }
    createTagMutation.mutate({
      name: tagFormData.name,
      description: tagFormData.description || null,
      color: tagFormData.color,
    });
  };

  const handleEditTag = (tag: Tag) => {
    setEditingTag(tag);
    setTagFormData({
      name: tag.name,
      description: tag.description || "",
      color: tag.color || "#3B82F6",
    });
    setIsEditTagOpen(true);
  };

  const handleUpdateTag = () => {
    if (!editingTag || !tagFormData.name.trim()) return;
    updateTagMutation.mutate({
      id: editingTag.id,
      tagData: {
        name: tagFormData.name,
        description: tagFormData.description || null,
        color: tagFormData.color,
      },
    });
  };

  const handleDeleteTag = (id: string) => {
    deleteTagMutation.mutate(id);
  };

  // Employee mutations
  const createEmployeeMutation = useMutation({
    mutationFn: async (employeeData: InsertEmployee) => {
      const response = await apiRequest("POST", "/api/employees", employeeData);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Employee created successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/employees"] });
      setIsCreateEmployeeOpen(false);
      resetEmployeeForm();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create employee",
        variant: "destructive",
      });
    },
  });

  const updateEmployeeMutation = useMutation({
    mutationFn: async ({ id, employeeData }: { id: string; employeeData: Partial<InsertEmployee> }) => {
      const response = await apiRequest("PUT", `/api/employees/${id}`, employeeData);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Employee updated successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/employees"] });
      setIsEditEmployeeOpen(false);
      setEditingEmployee(null);
      resetEmployeeForm();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update employee",
        variant: "destructive",
      });
    },
  });

  const deleteEmployeeMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest("DELETE", `/api/employees/${id}`);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Employee deleted successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/employees"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete employee",
        variant: "destructive",
      });
    },
  });

  const resetEmployeeForm = () => {
    setEmployeeFormData({ name: "", department: "", position: "", notes: "" });
  };

  const handleCreateEmployee = () => {
    if (!employeeFormData.name.trim()) {
      toast({
        title: "Error",
        description: "Employee name is required",
        variant: "destructive",
      });
      return;
    }
    createEmployeeMutation.mutate({
      name: employeeFormData.name,
      department: employeeFormData.department || null,
      position: employeeFormData.position || null,
      notes: employeeFormData.notes || null,
    });
  };

  const handleEditEmployee = (employee: Employee) => {
    setEditingEmployee(employee);
    setEmployeeFormData({
      name: employee.name,
      department: employee.department || "",
      position: employee.position || "",
      notes: employee.notes || "",
    });
    setIsEditEmployeeOpen(true);
  };

  const handleUpdateEmployee = () => {
    if (!editingEmployee || !employeeFormData.name.trim()) return;
    updateEmployeeMutation.mutate({
      id: editingEmployee.id,
      employeeData: {
        name: employeeFormData.name,
        department: employeeFormData.department || null,
        position: employeeFormData.position || null,
        notes: employeeFormData.notes || null,
      },
    });
  };

  const handleDeleteEmployee = (id: string) => {
    deleteEmployeeMutation.mutate(id);
  };

  if (usersLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600 dark:text-gray-400">Loading users...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <DollarSign className="w-6 h-6" />
            Advantix Finance Access Control
          </h2>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Control which users can access the Finance module and all its features
          </p>
        </div>
      </div>

      {/* Users Table */}
      <Card>
        <CardHeader>
          <CardTitle>Manage Finance Access</CardTitle>
          <CardDescription>
            Grant or revoke access to Advantix Finance for specific users. Users with access will see all Finance submenus (Dashboard, Projects, Payments, Expenses & Salaries, Reports).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Finance Access</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => {
                const hasAccess = getUserFinanceAccess(user);
                
                return (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{user.name}</div>
                        <div className="text-sm text-gray-500">@{user.username}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge 
                        variant={user.role === 'super_admin' ? 'default' : 'secondary'}
                        className={user.role === 'super_admin' ? 'bg-purple-100 text-purple-800' : ''}
                      >
                        {user.role === 'super_admin' ? 'Super Admin' : 
                         user.role === 'admin' ? 'Admin' :
                         user.role === 'manager' ? 'Manager' : 'User'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={user.isActive ? "default" : "secondary"}>
                        {user.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={hasAccess ? "default" : "secondary"}>
                        {hasAccess ? "Granted" : "Denied"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {user.role === 'super_admin' ? (
                          <span className="text-sm text-gray-500">Always has access</span>
                        ) : (
                          <div className="flex items-center gap-2">
                            <Switch
                              checked={hasAccess}
                              onCheckedChange={(checked) => handleAccessToggle(user.id, checked)}
                              disabled={updatePermissionMutation.isPending}
                              data-testid={`switch-finance-access-${user.id}`}
                            />
                            <span className="text-sm text-gray-600 dark:text-gray-400">
                              {hasAccess ? "Granted" : "Denied"}
                            </span>
                          </div>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Information Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            How Finance Access Works
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
            <p>• <strong>Granted Access:</strong> User can see and access all Finance features including Dashboard, Projects, Payments, Expenses & Salaries, and Reports</p>
            <p>• <strong>Denied Access:</strong> User cannot see any Finance menu items or access any Finance pages</p>
            <p>• <strong>Super Admin:</strong> Always has full access to all Finance features regardless of settings</p>
            <p>• <strong>Role-based:</strong> Access is granted per user role (all users with the same role share the same access level)</p>
            <p>• Changes take effect immediately and will be reflected in the user's sidebar menu</p>
          </div>
        </CardContent>
      </Card>

      {/* Tag Management Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <TagIcon className="w-5 h-5" />
                Tag Management
              </CardTitle>
              <CardDescription>
                Create and manage tags for categorizing finance data
              </CardDescription>
            </div>
            <Dialog open={isCreateTagOpen} onOpenChange={setIsCreateTagOpen}>
              <DialogTrigger asChild>
                <Button data-testid="button-create-tag">
                  <Plus className="h-4 w-4 mr-2" />
                  Create Tag
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create New Tag</DialogTitle>
                  <DialogDescription>
                    Create a new tag for categorizing finance data
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="tag-name">Tag Name</Label>
                    <Input
                      id="tag-name"
                      value={tagFormData.name}
                      onChange={(e) => setTagFormData(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Enter tag name"
                      data-testid="input-tag-name"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="tag-description">Description (optional)</Label>
                    <Input
                      id="tag-description"
                      value={tagFormData.description}
                      onChange={(e) => setTagFormData(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Enter tag description"
                      data-testid="input-tag-description"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="tag-color">Color</Label>
                    <Input
                      id="tag-color"
                      type="color"
                      value={tagFormData.color}
                      onChange={(e) => setTagFormData(prev => ({ ...prev, color: e.target.value }))}
                      data-testid="input-tag-color"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsCreateTagOpen(false)}>
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleCreateTag}
                    disabled={createTagMutation.isPending}
                    data-testid="button-save-tag"
                  >
                    {createTagMutation.isPending ? "Creating..." : "Create Tag"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {tagsLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Color</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tags.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                      No tags found
                    </TableCell>
                  </TableRow>
                ) : (
                  tags.map((tag) => (
                    <TableRow key={tag.id} data-testid={`row-tag-${tag.id}`}>
                      <TableCell className="font-medium" data-testid={`text-tag-name-${tag.id}`}>
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-4 h-4 rounded-full" 
                            style={{ backgroundColor: tag.color || "#3B82F6" }}
                          />
                          {tag.name}
                        </div>
                      </TableCell>
                      <TableCell data-testid={`text-tag-description-${tag.id}`}>
                        {tag.description || "No description"}
                      </TableCell>
                      <TableCell data-testid={`text-tag-color-${tag.id}`}>
                        {tag.color || "#3B82F6"}
                      </TableCell>
                      <TableCell>
                        <Badge variant={tag.isActive ? "default" : "secondary"} data-testid={`badge-tag-status-${tag.id}`}>
                          {tag.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEditTag(tag)}
                            data-testid={`button-edit-tag-${tag.id}`}
                          >
                            <Edit3 className="h-4 w-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-red-600 hover:text-red-700"
                                data-testid={`button-delete-tag-${tag.id}`}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Tag</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete "{tag.name}"? This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDeleteTag(tag.id)}
                                  className="bg-red-600 hover:bg-red-700"
                                  data-testid={`button-confirm-delete-tag-${tag.id}`}
                                >
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Employee Name Management Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                Employee Name Management
              </CardTitle>
              <CardDescription>
                Create and manage employee names for finance tracking (no registration required)
              </CardDescription>
            </div>
            <Dialog open={isCreateEmployeeOpen} onOpenChange={setIsCreateEmployeeOpen}>
              <DialogTrigger asChild>
                <Button data-testid="button-create-employee">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Employee
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add New Employee</DialogTitle>
                  <DialogDescription>
                    Add a new employee name that will sync with Expenses & Salaries
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="employee-name">Employee Name *</Label>
                    <Input
                      id="employee-name"
                      value={employeeFormData.name}
                      onChange={(e) => setEmployeeFormData(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Enter employee name"
                      data-testid="input-employee-name"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="employee-department">Department (optional)</Label>
                    <Input
                      id="employee-department"
                      value={employeeFormData.department}
                      onChange={(e) => setEmployeeFormData(prev => ({ ...prev, department: e.target.value }))}
                      placeholder="Enter department"
                      data-testid="input-employee-department"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="employee-position">Position (optional)</Label>
                    <Input
                      id="employee-position"
                      value={employeeFormData.position}
                      onChange={(e) => setEmployeeFormData(prev => ({ ...prev, position: e.target.value }))}
                      placeholder="Enter position"
                      data-testid="input-employee-position"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="employee-notes">Notes (optional)</Label>
                    <Input
                      id="employee-notes"
                      value={employeeFormData.notes}
                      onChange={(e) => setEmployeeFormData(prev => ({ ...prev, notes: e.target.value }))}
                      placeholder="Enter notes"
                      data-testid="input-employee-notes"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsCreateEmployeeOpen(false)}>
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleCreateEmployee}
                    disabled={createEmployeeMutation.isPending}
                    data-testid="button-save-employee"
                  >
                    {createEmployeeMutation.isPending ? "Adding..." : "Add Employee"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {employeesLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Position</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {employees.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                      No employees found. Click "Add Employee" to create your first employee.
                    </TableCell>
                  </TableRow>
                ) : (
                  employees.map((employee) => (
                    <TableRow key={employee.id} data-testid={`row-employee-${employee.id}`}>
                      <TableCell className="font-medium" data-testid={`text-employee-name-${employee.id}`}>
                        {employee.name}
                      </TableCell>
                      <TableCell data-testid={`text-employee-department-${employee.id}`}>
                        {employee.department || "N/A"}
                      </TableCell>
                      <TableCell data-testid={`text-employee-position-${employee.id}`}>
                        {employee.position || "N/A"}
                      </TableCell>
                      <TableCell>
                        <Badge variant={employee.isActive ? "default" : "secondary"} data-testid={`badge-employee-status-${employee.id}`}>
                          {employee.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEditEmployee(employee)}
                            data-testid={`button-edit-employee-${employee.id}`}
                          >
                            <Edit3 className="h-4 w-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-red-600 hover:text-red-700"
                                data-testid={`button-delete-employee-${employee.id}`}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Employee</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete "{employee.name}"? This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDeleteEmployee(employee.id)}
                                  className="bg-red-600 hover:bg-red-700"
                                  data-testid={`button-confirm-delete-employee-${employee.id}`}
                                >
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Edit Employee Dialog */}
      <Dialog open={isEditEmployeeOpen} onOpenChange={setIsEditEmployeeOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Employee</DialogTitle>
            <DialogDescription>
              Update employee information
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-employee-name">Employee Name *</Label>
              <Input
                id="edit-employee-name"
                value={employeeFormData.name}
                onChange={(e) => setEmployeeFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Enter employee name"
                data-testid="input-edit-employee-name"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-employee-department">Department (optional)</Label>
              <Input
                id="edit-employee-department"
                value={employeeFormData.department}
                onChange={(e) => setEmployeeFormData(prev => ({ ...prev, department: e.target.value }))}
                placeholder="Enter department"
                data-testid="input-edit-employee-department"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-employee-position">Position (optional)</Label>
              <Input
                id="edit-employee-position"
                value={employeeFormData.position}
                onChange={(e) => setEmployeeFormData(prev => ({ ...prev, position: e.target.value }))}
                placeholder="Enter position"
                data-testid="input-edit-employee-position"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-employee-notes">Notes (optional)</Label>
              <Input
                id="edit-employee-notes"
                value={employeeFormData.notes}
                onChange={(e) => setEmployeeFormData(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Enter notes"
                data-testid="input-edit-employee-notes"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditEmployeeOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleUpdateEmployee}
              disabled={updateEmployeeMutation.isPending}
              data-testid="button-update-employee"
            >
              {updateEmployeeMutation.isPending ? "Updating..." : "Update Employee"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Tag Dialog */}
      <Dialog open={isEditTagOpen} onOpenChange={setIsEditTagOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Tag</DialogTitle>
            <DialogDescription>
              Update tag information
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-tag-name">Tag Name</Label>
              <Input
                id="edit-tag-name"
                value={tagFormData.name}
                onChange={(e) => setTagFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Enter tag name"
                data-testid="input-edit-tag-name"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-tag-description">Description (optional)</Label>
              <Input
                id="edit-tag-description"
                value={tagFormData.description}
                onChange={(e) => setTagFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Enter tag description"
                data-testid="input-edit-tag-description"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-tag-color">Color</Label>
              <Input
                id="edit-tag-color"
                type="color"
                value={tagFormData.color}
                onChange={(e) => setTagFormData(prev => ({ ...prev, color: e.target.value }))}
                data-testid="input-edit-tag-color"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditTagOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleUpdateTag}
              disabled={updateTagMutation.isPending}
              data-testid="button-update-tag"
            >
              {updateTagMutation.isPending ? "Updating..." : "Update Tag"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function DataImportExport() {
  const { toast } = useToast();
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importResults, setImportResults] = useState<any>(null);

  // Get current user to check permissions
  const { data: currentUser } = useQuery<{ id: string; username: string; role: string }>({
    queryKey: ["/api/auth/user"],
  });

  const isAdminOrSuperAdmin = currentUser?.role === 'admin' || currentUser?.role === 'super_admin';

  // Export data function
  const handleExport = async () => {
    if (!isAdminOrSuperAdmin) {
      toast({
        title: "Access Denied",
        description: "Only admin users can export data.",
        variant: "destructive",
      });
      return;
    }

    setIsExporting(true);
    try {
      const response = await apiRequest("GET", "/api/data/export");
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `data-export-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(link);

      toast({
        title: "Export Successful",
        description: "All data has been exported successfully.",
      });
    } catch (error: any) {
      console.error("Export failed:", error);
      toast({
        title: "Export Failed",
        description: error.message || "Failed to export data.",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  // Import data function
  const handleImport = async () => {
    if (!isAdminOrSuperAdmin) {
      toast({
        title: "Access Denied",
        description: "Only admin users can import data.",
        variant: "destructive",
      });
      return;
    }

    if (!importFile) {
      toast({
        title: "No File Selected",
        description: "Please select a JSON file to import.",
        variant: "destructive",
      });
      return;
    }

    setIsImporting(true);
    setImportResults(null);
    
    try {
      const fileContent = await importFile.text();
      const importData = JSON.parse(fileContent);

      const response = await apiRequest("POST", "/api/data/import", importData);
      const results = await response.json();
      
      setImportResults(results);
      
      toast({
        title: "Import Completed",
        description: `Imported: ${results.results.imported}, Updated: ${results.results.updated}, Errors: ${results.results.errors.length}`,
      });

      // Invalidate all queries to refresh data
      queryClient.invalidateQueries();
      
    } catch (error: any) {
      console.error("Import failed:", error);
      toast({
        title: "Import Failed",
        description: error.message || "Failed to import data.",
        variant: "destructive",
      });
    } finally {
      setIsImporting(false);
    }
  };

  // File input handler
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type === 'application/json') {
      setImportFile(file);
      setImportResults(null);
    } else {
      toast({
        title: "Invalid File",
        description: "Please select a valid JSON file.",
        variant: "destructive",
      });
      setImportFile(null);
    }
  };

  if (!isAdminOrSuperAdmin) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center py-8">
            <div className="text-center">
              <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Access Denied</h3>
              <p className="text-gray-500">
                Data Import/Export is only available to Admin and Super Admin users.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="w-5 h-5" />
            Data Import/Export
          </CardTitle>
          <CardDescription>
            Export all site data to JSON format or import previously exported data back into the system.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          
          {/* Export Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b">
              <Download className="w-4 h-4" />
              <h3 className="font-semibold">Export Data</h3>
            </div>
            
            <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg">
              <div className="flex items-start gap-3">
                <FileText className="w-5 h-5 text-blue-600 mt-0.5" />
                <div className="flex-1">
                  <h4 className="font-medium text-blue-900 dark:text-blue-100">Export All Data</h4>
                  <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                    Download a complete backup of all site data including users, campaigns, clients, 
                    finance records, and settings in JSON format.
                  </p>
                  <ul className="text-xs text-blue-600 dark:text-blue-400 mt-2 space-y-1">
                    <li>• Passwords are automatically redacted for security</li>
                    <li>• All data relationships are preserved</li>
                    <li>• Compatible with the import function below</li>
                  </ul>
                </div>
              </div>
              
              <Button 
                onClick={handleExport}
                disabled={isExporting}
                className="mt-4"
                data-testid="button-export"
              >
                {isExporting ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Exporting...
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4 mr-2" />
                    Export All Data
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Import Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b">
              <Upload className="w-4 h-4" />
              <h3 className="font-semibold">Import Data</h3>
            </div>
            
            <div className="bg-amber-50 dark:bg-amber-950 p-4 rounded-lg">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5" />
                <div className="flex-1">
                  <h4 className="font-medium text-amber-900 dark:text-amber-100">Import Previously Exported Data</h4>
                  <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                    Upload a JSON file exported from this system to restore data. Existing records will be 
                    updated and new records will be created.
                  </p>
                  <ul className="text-xs text-amber-600 dark:text-amber-400 mt-2 space-y-1">
                    <li>• Duplicate handling: Updates existing records instead of creating duplicates</li>
                    <li>• Maintains data integrity and relationships</li>
                    <li>• Shows detailed import results</li>
                  </ul>
                </div>
              </div>
              
              <div className="mt-4 space-y-3">
                <div>
                  <Input
                    type="file"
                    accept=".json"
                    onChange={handleFileSelect}
                    disabled={isImporting}
                    data-testid="input-import-file"
                  />
                  {importFile && (
                    <p className="text-sm text-green-600 mt-1">
                      Selected: {importFile.name} ({(importFile.size / 1024).toFixed(1)} KB)
                    </p>
                  )}
                </div>
                
                <Button 
                  onClick={handleImport}
                  disabled={isImporting || !importFile}
                  variant="secondary"
                  data-testid="button-import"
                >
                  {isImporting ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      Importing...
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4 mr-2" />
                      Import Data
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>

          {/* Import Results */}
          {importResults && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b">
                <FileText className="w-4 h-4" />
                <h3 className="font-semibold">Import Results</h3>
              </div>
              
              <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">{importResults.results.imported}</div>
                    <div className="text-sm text-gray-600">New Records</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">{importResults.results.updated}</div>
                    <div className="text-sm text-gray-600">Updated Records</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-red-600">{importResults.results.skipped}</div>
                    <div className="text-sm text-gray-600">Errors/Skipped</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-gray-600">{importResults.results.totalProcessed}</div>
                    <div className="text-sm text-gray-600">Total Processed</div>
                  </div>
                </div>
                
                {importResults.results.errors.length > 0 && (
                  <div className="mt-4">
                    <h4 className="font-medium text-red-700 dark:text-red-300 mb-2">Errors:</h4>
                    <div className="text-sm text-red-600 dark:text-red-400 space-y-1 max-h-32 overflow-y-auto">
                      {importResults.results.errors.map((error: string, index: number) => (
                        <div key={index}>• {error}</div>
                      ))}
                    </div>
                  </div>
                )}
                
                <div className="text-xs text-gray-500 mt-4">
                  Import completed at {new Date(importResults.importedAt).toLocaleString()}
                  {importResults.importedBy && ` by ${importResults.importedBy}`}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function AdminPage() {
  return (
    <Sidebar>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4">
        <div className="max-w-7xl mx-auto space-y-8">
          {/* Header */}
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Settings className="w-8 h-8" />
              Admin Panel
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Manage users, permissions, and system settings
            </p>
          </div>

          {/* Tabs */}
          <Tabs defaultValue="users" className="space-y-6">
            <TabsList className="grid w-full grid-cols-2 max-w-2xl">
              <TabsTrigger value="users" className="flex items-center gap-2">
                <Users className="w-4 h-4" />
                User Management
              </TabsTrigger>
              <TabsTrigger value="data" className="flex items-center gap-2">
                <Database className="w-4 h-4" />
                Data Import/Export
              </TabsTrigger>
            </TabsList>

            <TabsContent value="users">
              <UserManagement />
            </TabsContent>
            
            <TabsContent value="data">
              <DataImportExport />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </Sidebar>
  );
}