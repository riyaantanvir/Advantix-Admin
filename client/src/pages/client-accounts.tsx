import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
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
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { User, Client } from "@shared/schema";

const clientUserSchema = z.object({
  name: z.string().min(1, "Name is required"),
  username: z.string().min(1, "Username is required"),
  password: z.string().min(3, "Password must be at least 3 characters"),
  clientId: z.string().min(1, "Client is required"),
  role: z.literal("client"),
});

type ClientUserFormData = z.infer<typeof clientUserSchema>;

export default function ClientAccountsPage() {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  // Fetch client users
  const { data: clientUsers, isLoading: isLoadingUsers } = useQuery<User[]>({
    queryKey: ["/api/client-users"],
  });

  // Fetch clients for dropdown
  const { data: clients } = useQuery<Client[]>({
    queryKey: ["/api/clients"],
  });

  const form = useForm<ClientUserFormData>({
    resolver: zodResolver(clientUserSchema),
    defaultValues: {
      name: "",
      username: "",
      password: "",
      clientId: "",
      role: "client",
    },
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: (data: ClientUserFormData) =>
      apiRequest("/api/client-users", "POST", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/client-users"] });
      setIsDialogOpen(false);
      form.reset();
      toast({
        title: "Success",
        description: "Client user created successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create client user",
        variant: "destructive",
      });
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<ClientUserFormData> }) =>
      apiRequest(`/api/client-users/${id}`, "PUT", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/client-users"] });
      setIsDialogOpen(false);
      setEditingUser(null);
      form.reset();
      toast({
        title: "Success",
        description: "Client user updated successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update client user",
        variant: "destructive",
      });
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest(`/api/client-users/${id}`, "DELETE"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/client-users"] });
      toast({
        title: "Success",
        description: "Client user deleted successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete client user",
        variant: "destructive",
      });
    },
  });

  const handleOpenDialog = (user?: User) => {
    if (user) {
      setEditingUser(user);
      form.reset({
        name: user.name || "",
        username: user.username,
        password: "", // Don't pre-fill password
        clientId: user.clientId || "",
        role: "client",
      });
    } else {
      setEditingUser(null);
      form.reset({
        name: "",
        username: "",
        password: "",
        clientId: "",
        role: "client",
      });
    }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingUser(null);
    form.reset();
  };

  const onSubmit = (data: ClientUserFormData) => {
    if (editingUser) {
      // For updates, only send password if it was changed
      const updateData: Partial<ClientUserFormData> = {
        name: data.name,
        username: data.username,
        clientId: data.clientId,
      };
      if (data.password) {
        updateData.password = data.password;
      }
      updateMutation.mutate({ id: editingUser.id, data: updateData });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleDelete = (id: string, username: string) => {
    if (window.confirm(`Are you sure you want to delete client user "${username}"?`)) {
      deleteMutation.mutate(id);
    }
  };

  const getClientName = (clientId: string | null) => {
    if (!clientId || !clients) return "N/A";
    const client = clients.find((c) => c.id === clientId);
    return client ? client.clientName : "Unknown Client";
  };

  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold" data-testid="text-page-title">Client Accounts</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Manage client user accounts with limited access
          </p>
        </div>
        <Button
          onClick={() => handleOpenDialog()}
          className="flex items-center gap-2"
          data-testid="button-add-client-user"
        >
          <Plus className="h-4 w-4" />
          Add Client User
        </Button>
      </div>

      {isLoadingUsers ? (
        <div className="text-center py-8" data-testid="text-loading">Loading...</div>
      ) : !clientUsers || clientUsers.length === 0 ? (
        <div className="text-center py-8 text-gray-500" data-testid="text-no-users">
          No client users found. Click "Add Client User" to create one.
        </div>
      ) : (
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Username</TableHead>
                <TableHead>Linked Client</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {clientUsers.map((user) => (
                <TableRow key={user.id} data-testid={`row-client-user-${user.id}`}>
                  <TableCell data-testid={`text-name-${user.id}`}>{user.name}</TableCell>
                  <TableCell data-testid={`text-username-${user.id}`}>{user.username}</TableCell>
                  <TableCell data-testid={`text-client-${user.id}`}>{getClientName(user.clientId)}</TableCell>
                  <TableCell data-testid={`text-status-${user.id}`}>
                    <span
                      className={`px-2 py-1 rounded text-xs ${
                        user.isActive
                          ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                          : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                      }`}
                    >
                      {user.isActive ? "Active" : "Inactive"}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleOpenDialog(user)}
                        data-testid={`button-edit-${user.id}`}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(user.id, user.username)}
                        className="text-red-600 hover:text-red-700"
                        data-testid={`button-delete-${user.id}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={handleCloseDialog}>
        <DialogContent data-testid="dialog-client-user-form">
          <DialogHeader>
            <DialogTitle>
              {editingUser ? "Edit Client User" : "Add Client User"}
            </DialogTitle>
            <DialogDescription>
              {editingUser
                ? "Update the client user information below."
                : "Create a new client user account. This user will only see their assigned client's data."}
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input placeholder="John Doe" {...field} data-testid="input-name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Username</FormLabel>
                    <FormControl>
                      <Input placeholder="johndoe" {...field} data-testid="input-username" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Password {editingUser && "(leave blank to keep current)"}
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        placeholder="Enter password"
                        {...field}
                        data-testid="input-password"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="clientId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Linked Client</FormLabel>
                    <Select
                      value={field.value || undefined}
                      onValueChange={field.onChange}
                    >
                      <FormControl>
                        <SelectTrigger data-testid="select-client">
                          <SelectValue placeholder="Select a client" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {clients?.map((client) => (
                          <SelectItem key={client.id} value={client.id}>
                            {client.clientName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCloseDialog}
                  data-testid="button-cancel"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                  data-testid="button-submit"
                >
                  {createMutation.isPending || updateMutation.isPending
                    ? "Saving..."
                    : editingUser
                    ? "Update"
                    : "Create"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
