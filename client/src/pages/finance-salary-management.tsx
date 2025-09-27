import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Plus, Edit, Trash2, DollarSign, Calendar, User, Clock, RefreshCw } from "lucide-react";
import { insertSalarySchema, type InsertSalary, type Salary } from "@shared/schema";
import Sidebar from "@/components/layout/Sidebar";

interface SalaryFormData extends InsertSalary {
  month: string;
}

const salaryFormSchema = insertSalarySchema.extend({
  month: insertSalarySchema.shape.month,
});

export default function FinanceSalaryManagement() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingSalary, setEditingSalary] = useState<Salary | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch salaries
  const { data: salaries = [], isLoading: salariesLoading, refetch: refetchSalaries } = useQuery({
    queryKey: ["/api/salaries"],
    select: (data: any) => data || [],
  });

  // Fetch users for the dropdown
  const { data: users = [] } = useQuery({
    queryKey: ["/api/users"],
    select: (data: any) => data || [],
  });

  // Create form
  const createForm = useForm<SalaryFormData>({
    resolver: zodResolver(salaryFormSchema),
    defaultValues: {
      userId: "",
      employeeName: "",
      salaryAmount: "0",
      totalHours: 0,
      hourlyRate: "0",
      bonus: "0",
      month: new Date().toISOString().slice(0, 7), // YYYY-MM format
    },
  });

  // Edit form
  const editForm = useForm<SalaryFormData>({
    resolver: zodResolver(salaryFormSchema),
  });

  // Create salary mutation
  const createSalaryMutation = useMutation({
    mutationFn: async (data: SalaryFormData) => {
      const response = await apiRequest("POST", "/api/salaries", data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Salary record created successfully",
      });
      setIsCreateDialogOpen(false);
      createForm.reset();
      queryClient.invalidateQueries({ queryKey: ["/api/salaries"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create salary record",
        variant: "destructive",
      });
    },
  });

  // Update salary mutation
  const updateSalaryMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<SalaryFormData> }) => {
      const response = await apiRequest("PUT", `/api/salaries/${id}`, data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Salary record updated successfully",
      });
      setEditingSalary(null);
      editForm.reset();
      queryClient.invalidateQueries({ queryKey: ["/api/salaries"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update salary record",
        variant: "destructive",
      });
    },
  });

  // Delete salary mutation
  const deleteSalaryMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/salaries/${id}`);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Salary record deleted successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/salaries"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete salary record",
        variant: "destructive",
      });
    },
  });

  const handleCreateSalary = (data: SalaryFormData) => {
    // Calculate total based on hourly rate and hours
    const calculatedTotal = (parseFloat(data.hourlyRate) * data.totalHours) + parseFloat(data.bonus || "0");
    const salaryData = {
      ...data,
      calculatedTotal: calculatedTotal.toFixed(2),
    };
    createSalaryMutation.mutate(salaryData);
  };

  const handleUpdateSalary = (data: SalaryFormData) => {
    if (!editingSalary) return;
    
    const calculatedTotal = (parseFloat(data.hourlyRate) * data.totalHours) + parseFloat(data.bonus || "0");
    const salaryData = {
      ...data,
      calculatedTotal: calculatedTotal.toFixed(2),
    };
    updateSalaryMutation.mutate({ id: editingSalary.id, data: salaryData });
  };

  const handleEditSalary = (salary: Salary) => {
    setEditingSalary(salary);
    editForm.reset({
      userId: salary.userId,
      employeeName: salary.employeeName,
      salaryAmount: salary.salaryAmount,
      totalHours: salary.totalHours,
      hourlyRate: salary.hourlyRate,
      bonus: salary.bonus || "0",
      month: salary.month,
    });
  };

  const formatCurrency = (amount: string | number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(typeof amount === 'string' ? parseFloat(amount) : amount);
  };

  return (
    <Sidebar>
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Salary Management</h1>
            <p className="text-muted-foreground">
              Manage employee salaries and compensation
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetchSalaries()}
              disabled={salariesLoading}
              data-testid="button-refresh-salaries"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${salariesLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button data-testid="button-create-salary">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Salary Record
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                  <DialogTitle>Create Salary Record</DialogTitle>
                  <DialogDescription>
                    Add a new salary record for an employee
                  </DialogDescription>
                </DialogHeader>
                <Form {...createForm}>
                  <form onSubmit={createForm.handleSubmit(handleCreateSalary)} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={createForm.control}
                        name="userId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Employee</FormLabel>
                            <Select onValueChange={(value) => {
                              field.onChange(value);
                              const selectedUser = users.find((u: any) => u.id === value);
                              if (selectedUser) {
                                createForm.setValue("employeeName", selectedUser.name || selectedUser.username);
                              }
                            }}>
                              <FormControl>
                                <SelectTrigger data-testid="select-user">
                                  <SelectValue placeholder="Select employee" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {users.map((user: any) => (
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
                      <FormField
                        control={createForm.control}
                        name="month"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Month</FormLabel>
                            <FormControl>
                              <Input type="month" {...field} data-testid="input-month" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={createForm.control}
                        name="salaryAmount"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Base Salary ($)</FormLabel>
                            <FormControl>
                              <Input type="number" step="0.01" {...field} data-testid="input-salary-amount" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={createForm.control}
                        name="totalHours"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Total Hours</FormLabel>
                            <FormControl>
                              <Input 
                                type="number" 
                                {...field} 
                                onChange={(e) => field.onChange(parseInt(e.target.value))}
                                data-testid="input-total-hours" 
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={createForm.control}
                        name="hourlyRate"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Hourly Rate ($)</FormLabel>
                            <FormControl>
                              <Input type="number" step="0.01" {...field} data-testid="input-hourly-rate" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={createForm.control}
                        name="bonus"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Bonus ($)</FormLabel>
                            <FormControl>
                              <Input type="number" step="0.01" {...field} value={field.value || ""} data-testid="input-bonus" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <div className="flex justify-end gap-2 pt-4">
                      <Button 
                        type="button" 
                        variant="outline" 
                        onClick={() => setIsCreateDialogOpen(false)}
                        data-testid="button-cancel-create"
                      >
                        Cancel
                      </Button>
                      <Button 
                        type="submit" 
                        disabled={createSalaryMutation.isPending}
                        data-testid="button-submit-create"
                      >
                        {createSalaryMutation.isPending ? "Creating..." : "Create Salary Record"}
                      </Button>
                    </div>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Salary Records
            </CardTitle>
            <CardDescription>
              View and manage employee salary information
            </CardDescription>
          </CardHeader>
          <CardContent>
            {salariesLoading ? (
              <div className="flex items-center justify-center h-32">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <span className="ml-2 text-gray-600">Loading salary records...</span>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Employee</TableHead>
                      <TableHead>Month</TableHead>
                      <TableHead>Base Salary</TableHead>
                      <TableHead>Hours</TableHead>
                      <TableHead>Hourly Rate</TableHead>
                      <TableHead>Bonus</TableHead>
                      <TableHead>Total</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {salaries.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center text-muted-foreground">
                          No salary records found. Create your first salary record to get started.
                        </TableCell>
                      </TableRow>
                    ) : (
                      salaries.map((salary: Salary) => (
                        <TableRow key={salary.id} data-testid={`row-salary-${salary.id}`}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <User className="h-4 w-4 text-muted-foreground" />
                              {salary.employeeName}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Calendar className="h-4 w-4 text-muted-foreground" />
                              {salary.month}
                            </div>
                          </TableCell>
                          <TableCell>{formatCurrency(salary.salaryAmount)}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Clock className="h-4 w-4 text-muted-foreground" />
                              {salary.totalHours}h
                            </div>
                          </TableCell>
                          <TableCell>{formatCurrency(salary.hourlyRate)}</TableCell>
                          <TableCell>{formatCurrency(salary.bonus || 0)}</TableCell>
                          <TableCell>
                            <Badge variant="secondary">
                              {formatCurrency(salary.calculatedTotal || 0)}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleEditSalary(salary)}
                                data-testid={`button-edit-${salary.id}`}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => deleteSalaryMutation.mutate(salary.id)}
                                disabled={deleteSalaryMutation.isPending}
                                data-testid={`button-delete-${salary.id}`}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Edit Dialog */}
        <Dialog open={!!editingSalary} onOpenChange={() => setEditingSalary(null)}>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Edit Salary Record</DialogTitle>
              <DialogDescription>
                Update the salary record for {editingSalary?.employeeName}
              </DialogDescription>
            </DialogHeader>
            <Form {...editForm}>
              <form onSubmit={editForm.handleSubmit(handleUpdateSalary)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={editForm.control}
                    name="userId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Employee</FormLabel>
                        <Select onValueChange={(value) => {
                          field.onChange(value);
                          const selectedUser = users.find((u: any) => u.id === value);
                          if (selectedUser) {
                            editForm.setValue("employeeName", selectedUser.name || selectedUser.username);
                          }
                        }} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-edit-user">
                              <SelectValue placeholder="Select employee" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {users.map((user: any) => (
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
                  <FormField
                    control={editForm.control}
                    name="month"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Month</FormLabel>
                        <FormControl>
                          <Input type="month" {...field} data-testid="input-edit-month" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={editForm.control}
                    name="salaryAmount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Base Salary ($)</FormLabel>
                        <FormControl>
                          <Input type="number" step="0.01" {...field} data-testid="input-edit-salary-amount" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={editForm.control}
                    name="totalHours"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Total Hours</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            {...field} 
                            onChange={(e) => field.onChange(parseInt(e.target.value))}
                            data-testid="input-edit-total-hours" 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={editForm.control}
                    name="hourlyRate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Hourly Rate ($)</FormLabel>
                        <FormControl>
                          <Input type="number" step="0.01" {...field} data-testid="input-edit-hourly-rate" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={editForm.control}
                    name="bonus"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Bonus ($)</FormLabel>
                        <FormControl>
                          <Input type="number" step="0.01" {...field} value={field.value || ""} data-testid="input-edit-bonus" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="flex justify-end gap-2 pt-4">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setEditingSalary(null)}
                    data-testid="button-cancel-edit"
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={updateSalaryMutation.isPending}
                    data-testid="button-submit-edit"
                  >
                    {updateSalaryMutation.isPending ? "Updating..." : "Update Salary Record"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>
    </Sidebar>
  );
}