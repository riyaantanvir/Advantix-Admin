import { useState } from "react";
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
  Calendar,
  Clock,
  FileText
} from "lucide-react";
import { format } from "date-fns";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { z } from "zod";
import { insertWorkReportSchema, type WorkReport, type User, UserRole } from "@shared/schema";
import Sidebar from "@/components/layout/Sidebar";

// Form schemas
const workReportFormSchema = insertWorkReportSchema.extend({
  date: z.coerce.date({
    required_error: "Date is required",
  }),
  hoursWorked: z.string().refine((val) => {
    const num = parseFloat(val);
    return !isNaN(num) && num >= 0.1;
  }, "Hours worked must be a valid number of at least 0.1"),
});

type WorkReportFormData = z.infer<typeof workReportFormSchema>;

export default function WorkReportsPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingWorkReport, setEditingWorkReport] = useState<WorkReport | null>(null);
  const { toast } = useToast();

  // Get current user info
  const userStr = localStorage.getItem("user");
  const currentUser = userStr ? JSON.parse(userStr) : null;
  const isAdmin = currentUser?.role === UserRole.ADMIN || currentUser?.role === UserRole.SUPER_ADMIN;

  // Fetch work reports
  const { data: workReports = [], isLoading, error, refetch } = useQuery<WorkReport[]>({
    queryKey: ["/api/work-reports"],
  });

  // Fetch users for admin user selection
  const { data: users = [] } = useQuery<User[]>({
    queryKey: ["/api/users"],
    enabled: isAdmin, // Only fetch if user is admin
  });

  // Create work report mutation
  const createMutation = useMutation({
    mutationFn: async (data: WorkReportFormData) => {
      const response = await apiRequest("POST", "/api/work-reports", {
        ...data,
        date: data.date,
        hoursWorked: data.hoursWorked,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/work-reports"] });
      setIsCreateDialogOpen(false);
      toast({
        title: "Work report created",
        description: "Your work report has been submitted successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create work report",
        variant: "destructive",
      });
    },
  });

  // Update work report mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<WorkReportFormData> }) => {
      const response = await apiRequest("PUT", `/api/work-reports/${id}`, {
        ...data,
        date: data.date,
        hoursWorked: data.hoursWorked,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/work-reports"] });
      setIsEditDialogOpen(false);
      setEditingWorkReport(null);
      toast({
        title: "Work report updated",
        description: "Your work report has been updated successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update work report",
        variant: "destructive",
      });
    },
  });

  // Delete work report mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest("DELETE", `/api/work-reports/${id}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/work-reports"] });
      toast({
        title: "Work report deleted",
        description: "The work report has been deleted successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete work report",
        variant: "destructive",
      });
    },
  });

  // Create form
  const createForm = useForm<WorkReportFormData>({
    resolver: zodResolver(workReportFormSchema),
    defaultValues: {
      title: "",
      description: "",
      hoursWorked: "1",
      date: new Date(),
      status: "submitted",
      userId: currentUser?.id || "",
    },
  });

  // Edit form
  const editForm = useForm<WorkReportFormData>({
    resolver: zodResolver(workReportFormSchema),
  });

  // Handle form submission
  const onCreateSubmit = (data: WorkReportFormData) => {
    createMutation.mutate(data);
  };

  const onEditSubmit = (data: WorkReportFormData) => {
    if (editingWorkReport) {
      updateMutation.mutate({ id: editingWorkReport.id, data });
    }
  };

  // Handle editing
  const handleEdit = (workReport: WorkReport) => {
    setEditingWorkReport(workReport);
    editForm.reset({
      title: workReport.title,
      description: workReport.description,
      hoursWorked: workReport.hoursWorked.toString(),
      date: new Date(workReport.date),
      status: workReport.status,
      userId: workReport.userId,
    });
    setIsEditDialogOpen(true);
  };

  // Handle delete
  const handleDelete = (id: string) => {
    deleteMutation.mutate(id);
  };

  // Filter work reports based on search term
  const filteredWorkReports = workReports.filter((report) =>
    report.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    report.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Reset create form when dialog opens
  const handleCreateDialogOpen = () => {
    createForm.reset({
      title: "",
      description: "",
      hoursWorked: "1",
      date: new Date(),
      status: "submitted",
      userId: currentUser?.id || "",
    });
    setIsCreateDialogOpen(true);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "submitted":
        return "default";
      case "approved":
        return "secondary";
      case "draft":
        return "outline";
      default:
        return "default";
    }
  };

  const getUserName = (userId: string) => {
    const user = users.find((u) => u.id === userId);
    return user ? user.name || user.username : "Unknown User";
  };

  if (error) {
    return (
      <Sidebar>
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-red-600 mb-4">Error Loading Work Reports</h1>
            <p className="text-gray-600 dark:text-gray-400">Please try refreshing the page.</p>
          </div>
        </div>
      </Sidebar>
    );
  }

  return (
    <Sidebar>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4">
        <div className="max-w-7xl mx-auto space-y-8">
          {/* Header */}
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white" data-testid="page-title">
                Work Reports
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                Track your work hours and submit reports
              </p>
            </div>
            <Button 
              onClick={handleCreateDialogOpen}
              className="bg-blue-600 hover:bg-blue-700"
              data-testid="button-create-work-report"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create Work Report
            </Button>
          </div>

          {/* Create Work Report Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Create Work Report
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-center p-8 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg">
                <div className="text-center">
                  <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                    Submit Your Work Report
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 mb-4">
                    Click the button below to create a new work report with your hours and tasks.
                  </p>
                  <Button 
                    onClick={handleCreateDialogOpen}
                    variant="outline"
                    data-testid="button-create-inline"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Create Work Report
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Search and Actions */}
          <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search work reports..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
                data-testid="input-search"
              />
            </div>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                onClick={() => refetch()}
                disabled={isLoading}
                data-testid="button-refresh"
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </div>

          {/* Work Reports History */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5" />
                Work Reports History
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                  <p className="text-gray-600 dark:text-gray-400">Loading work reports...</p>
                </div>
              ) : filteredWorkReports.length === 0 ? (
                <div className="text-center py-8">
                  <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                    No work reports found
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400">
                    {searchTerm ? "Try adjusting your search terms." : "Start by creating your first work report."}
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Task Details</TableHead>
                        <TableHead>Hours</TableHead>
                        {isAdmin && <TableHead>User</TableHead>}
                        <TableHead>Status</TableHead>
                        <TableHead>Comments</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredWorkReports.map((report) => (
                        <TableRow key={report.id} data-testid={`row-work-report-${report.id}`}>
                          <TableCell data-testid={`text-date-${report.id}`}>
                            {format(new Date(report.date), "PPP")}
                          </TableCell>
                          <TableCell data-testid={`text-title-${report.id}`}>
                            <div className="font-medium">{report.title}</div>
                          </TableCell>
                          <TableCell data-testid={`text-hours-${report.id}`}>
                            <div className="flex items-center gap-1">
                              <Clock className="w-4 h-4 text-gray-400" />
                              {parseFloat(report.hoursWorked.toString()).toFixed(1)}h
                            </div>
                          </TableCell>
                          {isAdmin && (
                            <TableCell data-testid={`text-user-${report.id}`}>
                              {getUserName(report.userId)}
                            </TableCell>
                          )}
                          <TableCell data-testid={`status-${report.id}`}>
                            <Badge variant={getStatusBadgeVariant(report.status)}>
                              {report.status}
                            </Badge>
                          </TableCell>
                          <TableCell data-testid={`text-description-${report.id}`}>
                            <div className="max-w-xs truncate">
                              {report.description || "No comments"}
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEdit(report)}
                                data-testid={`button-edit-${report.id}`}
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="text-red-600 hover:text-red-700"
                                    data-testid={`button-delete-${report.id}`}
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Delete Work Report</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Are you sure you want to delete this work report? This action cannot be undone.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => handleDelete(report.id)}
                                      className="bg-red-600 hover:bg-red-700"
                                    >
                                      Delete
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Create Work Report Dialog */}
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Create Work Report</DialogTitle>
              <DialogDescription>
                Submit a new work report with your completed tasks and hours worked.
              </DialogDescription>
            </DialogHeader>
            <Form {...createForm}>
              <form onSubmit={createForm.handleSubmit(onCreateSubmit)} className="space-y-4">
                {isAdmin && (
                  <FormField
                    control={createForm.control}
                    name="userId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>User</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-user">
                              <SelectValue placeholder="Select user" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {users.map((user) => (
                              <SelectItem key={user.id} value={user.id}>
                                {user.name || user.username}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                <FormField
                  control={createForm.control}
                  name="date"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Date</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              className={cn(
                                "w-full pl-3 text-left font-normal",
                                !field.value && "text-muted-foreground"
                              )}
                              data-testid="input-date"
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
                              date > new Date() || date < new Date("1900-01-01")
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
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Task Details</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Describe what you worked on..." 
                          {...field}
                          data-testid="input-task-details"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={createForm.control}
                  name="hoursWorked"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Working Time (hours)</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          step="0.1" 
                          min="0.1"
                          placeholder="8.0" 
                          {...field}
                          onChange={(e) => field.onChange(e.target.value)}
                          data-testid="input-working-time"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={createForm.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Comments</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Add any additional comments about your work..."
                          rows={3}
                          {...field}
                          data-testid="input-comments"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <DialogFooter>
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setIsCreateDialogOpen(false)}
                    data-testid="button-cancel"
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={createMutation.isPending}
                    data-testid="button-submit"
                  >
                    {createMutation.isPending ? "Creating..." : "Submit Report"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>

        {/* Edit Work Report Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Edit Work Report</DialogTitle>
              <DialogDescription>
                Update your work report details.
              </DialogDescription>
            </DialogHeader>
            <Form {...editForm}>
              <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-4">
                {isAdmin && (
                  <FormField
                    control={editForm.control}
                    name="userId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>User</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-edit-user">
                              <SelectValue placeholder="Select user" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {users.map((user) => (
                              <SelectItem key={user.id} value={user.id}>
                                {user.name || user.username}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                <FormField
                  control={editForm.control}
                  name="date"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Date</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              className={cn(
                                "w-full pl-3 text-left font-normal",
                                !field.value && "text-muted-foreground"
                              )}
                              data-testid="input-edit-date"
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
                              date > new Date() || date < new Date("1900-01-01")
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
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Task Details</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Describe what you worked on..." 
                          {...field}
                          data-testid="input-edit-task-details"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={editForm.control}
                  name="hoursWorked"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Working Time (hours)</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          step="0.1" 
                          min="0.1"
                          placeholder="8.0" 
                          {...field}
                          onChange={(e) => field.onChange(e.target.value)}
                          data-testid="input-edit-working-time"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={editForm.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Comments</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Add any additional comments about your work..."
                          rows={3}
                          {...field}
                          data-testid="input-edit-comments"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <DialogFooter>
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setIsEditDialogOpen(false)}
                    data-testid="button-edit-cancel"
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={updateMutation.isPending}
                    data-testid="button-edit-submit"
                  >
                    {updateMutation.isPending ? "Updating..." : "Update Report"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>
    </Sidebar>
  );
}