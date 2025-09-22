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
import { UserPlus, Edit3, Trash2, Users, Shield, RefreshCw, Settings, Lock } from "lucide-react";
import type { User, InsertUserWithRole, Page, RolePermission } from "@shared/schema";

interface UserFormData {
  name: string;
  username: string;
  password: string;
  role: string;
}

function UserManagement() {
  const { toast } = useToast();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  
  const [formData, setFormData] = useState<UserFormData>({
    name: "",
    username: "",
    password: "",
    role: "user"
  });

  // Get current user to check permissions
  const { data: currentUser } = useQuery<{ id: string; username: string; role: string }>({
    queryKey: ["/api/auth/user"],
  });

  // Fetch all users
  const { 
    data: users = [], 
    isLoading,
    refetch: refetchUsers 
  } = useQuery<User[]>({
    queryKey: ["/api/users"],
  });

  // Create user mutation
  const createUserMutation = useMutation({
    mutationFn: async (userData: InsertUserWithRole) => {
      const response = await apiRequest("POST", "/api/users", userData);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "User created successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      setIsCreateDialogOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create user",
        variant: "destructive",
      });
    },
  });

  // Update user mutation
  const updateUserMutation = useMutation({
    mutationFn: async ({ id, userData }: { id: string; userData: Partial<InsertUserWithRole> }) => {
      const response = await apiRequest("PUT", `/api/users/${id}`, userData);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "User updated successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      setIsEditDialogOpen(false);
      setEditingUser(null);
      resetForm();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update user",
        variant: "destructive",
      });
    },
  });

  // Delete user mutation
  const deleteUserMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest("DELETE", `/api/users/${id}`);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "User deleted successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete user",
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setFormData({
      name: "",
      username: "",
      password: "",
      role: "user"
    });
  };

  const handleCreateUser = () => {
    if (!formData.name.trim() || !formData.username.trim() || !formData.password.trim()) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    createUserMutation.mutate(formData as InsertUserWithRole);
  };

  const handleEditUser = (user: User) => {
    setEditingUser(user);
    setFormData({
      name: user.name || "",
      username: user.username,
      password: "",
      role: user.role
    });
    setIsEditDialogOpen(true);
  };

  const handleUpdateUser = () => {
    if (!editingUser) return;
    
    if (!formData.name.trim() || !formData.username.trim()) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    const updateData: Partial<InsertUserWithRole> = {
      name: formData.name,
      username: formData.username,
      role: formData.role as any
    };

    if (formData.password.trim()) {
      updateData.password = formData.password;
    }

    updateUserMutation.mutate({ id: editingUser.id, userData: updateData });
  };

  const handleDeleteUser = (id: string) => {
    deleteUserMutation.mutate(id);
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case "super_admin":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300";
      case "admin":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300";
      case "manager":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300";
      case "user":
        return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300";
    }
  };

  const formatRole = (role: string) => {
    return role.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  // Check if current user is Super Admin
  const isSupeAdmin = currentUser?.role === 'super_admin';

  if (!isSupeAdmin) {
    return (
      <Sidebar>
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
      </Sidebar>
    );
  }

  return (
    <Sidebar>
      <div className="flex-1 flex flex-col">
        <div className="p-8">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Admin Panel</h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                Manage users and system settings
              </p>
            </div>
          </div>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    User Management
                  </CardTitle>
                  <CardDescription>
                    Create, edit, and manage user accounts and roles
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => refetchUsers()}
                    disabled={isLoading}
                    data-testid="button-refresh-users"
                  >
                    <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                  </Button>
                  <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                    <DialogTrigger asChild>
                      <Button data-testid="button-create-user">
                        <UserPlus className="h-4 w-4 mr-2" />
                        Create User
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Create New User</DialogTitle>
                        <DialogDescription>
                          Create a new user account. Default role is User.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                          <Label htmlFor="name">Name</Label>
                          <Input
                            id="name"
                            value={formData.name}
                            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                            placeholder="Enter full name"
                            data-testid="input-user-name"
                          />
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor="username">Username</Label>
                          <Input
                            id="username"
                            value={formData.username}
                            onChange={(e) => setFormData(prev => ({ ...prev, username: e.target.value }))}
                            placeholder="Enter username"
                            data-testid="input-user-username"
                          />
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor="password">Password</Label>
                          <Input
                            id="password"
                            type="password"
                            value={formData.password}
                            onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                            placeholder="Enter password"
                            data-testid="input-user-password"
                          />
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor="role">Role</Label>
                          <Select value={formData.role} onValueChange={(value) => setFormData(prev => ({ ...prev, role: value }))}>
                            <SelectTrigger data-testid="select-user-role">
                              <SelectValue placeholder="Select role" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="user">User</SelectItem>
                              <SelectItem value="manager">Manager</SelectItem>
                              <SelectItem value="admin">Admin</SelectItem>
                              <SelectItem value="super_admin">Super Admin</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                          Cancel
                        </Button>
                        <Button 
                          onClick={handleCreateUser}
                          disabled={createUserMutation.isPending}
                          data-testid="button-save-user"
                        >
                          {createUserMutation.isPending ? "Creating..." : "Create User"}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Username</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                          No users found
                        </TableCell>
                      </TableRow>
                    ) : (
                      users.map((user) => (
                        <TableRow key={user.id} data-testid={`row-user-${user.id}`}>
                          <TableCell className="font-medium" data-testid={`text-user-name-${user.id}`}>
                            {user.name || "N/A"}
                          </TableCell>
                          <TableCell data-testid={`text-user-username-${user.id}`}>
                            {user.username}
                          </TableCell>
                          <TableCell>
                            <Badge className={getRoleBadgeColor(user.role)} data-testid={`badge-user-role-${user.id}`}>
                              {formatRole(user.role)}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant={user.isActive ? "default" : "secondary"} data-testid={`badge-user-status-${user.id}`}>
                              {user.isActive ? "Active" : "Inactive"}
                            </Badge>
                          </TableCell>
                          <TableCell data-testid={`text-user-created-${user.id}`}>
                            {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : "N/A"}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleEditUser(user)}
                                data-testid={`button-edit-user-${user.id}`}
                              >
                                <Edit3 className="h-4 w-4" />
                              </Button>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button
                                    variant="outline"
  
                                    className="text-red-600 hover:text-red-700"
                                    data-testid={`button-delete-user-${user.id}`}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Delete User</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Are you sure you want to delete {user.name || user.username}? This action cannot be undone.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => handleDeleteUser(user.id)}
                                      className="bg-red-600 hover:bg-red-700"
                                      data-testid={`button-confirm-delete-user-${user.id}`}
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

          {/* Edit User Dialog */}
          <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Edit User</DialogTitle>
                <DialogDescription>
                  Update user information and role. Leave password empty to keep current password.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="edit-name">Name</Label>
                  <Input
                    id="edit-name"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Enter full name"
                    data-testid="input-edit-user-name"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-username">Username</Label>
                  <Input
                    id="edit-username"
                    value={formData.username}
                    onChange={(e) => setFormData(prev => ({ ...prev, username: e.target.value }))}
                    placeholder="Enter username"
                    data-testid="input-edit-user-username"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-password">Password (leave empty to keep current)</Label>
                  <Input
                    id="edit-password"
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                    placeholder="Enter new password (optional)"
                    data-testid="input-edit-user-password"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-role">Role</Label>
                  <Select value={formData.role} onValueChange={(value) => setFormData(prev => ({ ...prev, role: value }))}>
                    <SelectTrigger data-testid="select-edit-user-role">
                      <SelectValue placeholder="Select role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="user">User</SelectItem>
                      <SelectItem value="manager">Manager</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="super_admin">Super Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={handleUpdateUser}
                  disabled={updateUserMutation.isPending}
                  data-testid="button-update-user"
                >
                  {updateUserMutation.isPending ? "Updating..." : "Update User"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </Sidebar>
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
                      <TableCell className="font-medium bg-white dark:bg-gray-900 sticky left-0 z-20 border-r shadow-sm">
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
                        <TableCell className="font-medium bg-white dark:bg-gray-900 sticky left-0 z-10 border-r">
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
            <TabsList className="grid w-full grid-cols-2 max-w-md">
              <TabsTrigger value="users" className="flex items-center gap-2">
                <Users className="w-4 h-4" />
                User Management
              </TabsTrigger>
              <TabsTrigger value="access" className="flex items-center gap-2">
                <Lock className="w-4 h-4" />
                Access Control
              </TabsTrigger>
            </TabsList>

            <TabsContent value="users">
              <UserManagement />
            </TabsContent>

            <TabsContent value="access">
              <AccessControl />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </Sidebar>
  );
}