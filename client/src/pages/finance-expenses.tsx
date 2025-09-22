import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { insertFinanceExpenseSchema, type FinanceExpense, type FinanceProject, type InsertFinanceExpense } from "@shared/schema";
import { Plus, Edit, Trash2, MoreHorizontal, DollarSign, Calendar, Building, Calculator, TrendingDown } from "lucide-react";
import { formatDistance } from "date-fns";
import Sidebar from "@/components/layout/Sidebar";

export default function FinanceExpenses() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<FinanceExpense | null>(null);
  const [activeTab, setActiveTab] = useState("all");
  const { toast } = useToast();

  // Fetch expenses
  const { data: expenses, isLoading: expensesLoading } = useQuery<FinanceExpense[]>({
    queryKey: ["/api/finance/expenses"],
  });

  // Fetch projects
  const { data: projects } = useQuery<FinanceProject[]>({
    queryKey: ["/api/finance/projects"],
  });

  // Create/Update form
  const form = useForm<InsertFinanceExpense>({
    resolver: zodResolver(insertFinanceExpenseSchema),
    defaultValues: {
      type: "expense",
      projectId: "",
      amount: "",
      currency: "BDT",
      date: new Date(),
      notes: "",
    },
  });

  // Create expense mutation
  const createExpenseMutation = useMutation({
    mutationFn: async (data: InsertFinanceExpense) => {
      const response = await apiRequest("POST", "/api/finance/expenses", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/finance/expenses"] });
      queryClient.invalidateQueries({ queryKey: ["/api/finance/dashboard"] });
      setIsCreateDialogOpen(false);
      form.reset();
      toast({
        title: "Success",
        description: "Expense recorded successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to record expense.",
        variant: "destructive",
      });
    },
  });

  // Update expense mutation
  const updateExpenseMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<InsertFinanceExpense> }) => {
      const response = await apiRequest("PUT", `/api/finance/expenses/${id}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/finance/expenses"] });
      queryClient.invalidateQueries({ queryKey: ["/api/finance/dashboard"] });
      setEditingExpense(null);
      form.reset();
      toast({
        title: "Success",
        description: "Expense updated successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update expense.",
        variant: "destructive",
      });
    },
  });

  // Delete expense mutation
  const deleteExpenseMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/finance/expenses/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/finance/expenses"] });
      queryClient.invalidateQueries({ queryKey: ["/api/finance/dashboard"] });
      toast({
        title: "Success",
        description: "Expense deleted successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete expense.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: InsertFinanceExpense) => {
    if (editingExpense) {
      updateExpenseMutation.mutate({ id: editingExpense.id, data });
    } else {
      createExpenseMutation.mutate(data);
    }
  };

  const handleEdit = (expense: FinanceExpense) => {
    setEditingExpense(expense);
    form.reset({
      type: expense.type,
      projectId: expense.projectId || "",
      amount: expense.amount,
      currency: expense.currency,
      date: new Date(expense.date),
      notes: expense.notes || "",
    });
  };

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this expense?")) {
      deleteExpenseMutation.mutate(id);
    }
  };

  const getProjectName = (projectId: string | null) => {
    if (!projectId) return "General";
    const project = projects?.find(p => p.id === projectId);
    return project?.name || "Unknown Project";
  };

  const formatCurrency = (amount: string | number) => {
    const numAmount = typeof amount === "string" ? parseFloat(amount) : amount;
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "BDT",
      minimumFractionDigits: 0,
    }).format(numAmount);
  };

  // Filter expenses based on active tab
  const filteredExpenses = expenses?.filter(expense => {
    if (activeTab === "expenses") return expense.type === "expense";
    if (activeTab === "salaries") return expense.type === "salary";
    return true; // all
  }) || [];

  // Calculate totals
  const totalExpenses = expenses?.filter(e => e.type === "expense").reduce((sum, e) => sum + parseFloat(e.amount), 0) || 0;
  const totalSalaries = expenses?.filter(e => e.type === "salary").reduce((sum, e) => sum + parseFloat(e.amount), 0) || 0;
  const grandTotal = totalExpenses + totalSalaries;

  if (expensesLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="space-y-4">
          <div className="h-8 bg-gray-200 rounded animate-pulse" />
          <div className="h-96 bg-gray-200 rounded animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <Sidebar>
      <div className="flex-1 overflow-auto">
        <div className="container mx-auto p-6 space-y-6" data-testid="page-finance-expenses">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Expenses & Salaries</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Track business expenses and salary payments
          </p>
        </div>
        
        <Dialog open={isCreateDialogOpen || !!editingExpense} onOpenChange={(open) => {
          if (!open) {
            setIsCreateDialogOpen(false);
            setEditingExpense(null);
            form.reset();
          }
        }}>
          <DialogTrigger asChild>
            <Button onClick={() => setIsCreateDialogOpen(true)} data-testid="button-add-expense">
              <Plus className="h-4 w-4 mr-2" />
              Add Expense/Salary
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>
                {editingExpense ? "Edit Entry" : "Add New Entry"}
              </DialogTitle>
              <DialogDescription>
                {editingExpense ? "Update expense or salary details" : "Record a new expense or salary payment"}
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Type</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-type">
                              <SelectValue placeholder="Select type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="expense">Expense</SelectItem>
                            <SelectItem value="salary">Salary</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="projectId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Project (Optional)</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-project">
                              <SelectValue placeholder="Select project" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="">General (No Project)</SelectItem>
                            {projects?.map((project) => (
                              <SelectItem key={project.id} value={project.id}>
                                {project.name}
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
                    control={form.control}
                    name="amount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Amount (BDT)</FormLabel>
                        <FormControl>
                          <Input {...field} type="number" step="0.01" placeholder="0.00" data-testid="input-amount" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="date"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Date</FormLabel>
                        <FormControl>
                          <Input
                            type="date"
                            {...field}
                            value={field.value ? field.value.toISOString().split('T')[0] : ''}
                            onChange={(e) => field.onChange(new Date(e.target.value))}
                            data-testid="input-date"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Notes</FormLabel>
                      <FormControl>
                        <Textarea {...field} placeholder="Description of expense or salary..." data-testid="textarea-notes" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex justify-end space-x-2 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setIsCreateDialogOpen(false);
                      setEditingExpense(null);
                      form.reset();
                    }}
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={createExpenseMutation.isPending || updateExpenseMutation.isPending}
                    data-testid="button-submit"
                  >
                    {createExpenseMutation.isPending || updateExpenseMutation.isPending ? "Saving..." : editingExpense ? "Update" : "Create"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-red-700 dark:text-red-400">
              Total Expenses
            </CardTitle>
            <TrendingDown className="h-5 w-5 text-red-600 dark:text-red-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-900 dark:text-red-300">
              {formatCurrency(totalExpenses)}
            </div>
            <p className="text-xs text-red-600 dark:text-red-400 mt-1">
              Business expenses
            </p>
          </CardContent>
        </Card>

        <Card className="bg-orange-50 dark:bg-orange-900/10 border-orange-200 dark:border-orange-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-orange-700 dark:text-orange-400">
              Total Salaries
            </CardTitle>
            <Calculator className="h-5 w-5 text-orange-600 dark:text-orange-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-900 dark:text-orange-300">
              {formatCurrency(totalSalaries)}
            </div>
            <p className="text-xs text-orange-600 dark:text-orange-400 mt-1">
              Employee salaries
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gray-50 dark:bg-gray-900/10 border-gray-200 dark:border-gray-700">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-700 dark:text-gray-400">
              Grand Total
            </CardTitle>
            <DollarSign className="h-5 w-5 text-gray-600 dark:text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900 dark:text-gray-300">
              {formatCurrency(grandTotal)}
            </div>
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
              Total outgoing
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Expenses/Salaries Table with Tabs */}
      <Card>
        <CardHeader>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList>
              <TabsTrigger value="all" data-testid="tab-all">All ({expenses?.length || 0})</TabsTrigger>
              <TabsTrigger value="expenses" data-testid="tab-expenses">
                Expenses ({expenses?.filter(e => e.type === "expense").length || 0})
              </TabsTrigger>
              <TabsTrigger value="salaries" data-testid="tab-salaries">
                Salaries ({expenses?.filter(e => e.type === "salary").length || 0})
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Project</TableHead>
                <TableHead>Amount (BDT)</TableHead>
                <TableHead>Notes</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredExpenses.map((expense) => (
                <TableRow key={expense.id} data-testid={`row-expense-${expense.id}`}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-gray-500" />
                      <div>
                        <div>{new Date(expense.date).toLocaleDateString()}</div>
                        <div className="text-sm text-gray-500">
                          {formatDistance(new Date(expense.date), new Date(), { addSuffix: true })}
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge 
                      variant={expense.type === "expense" ? "destructive" : "secondary"}
                      className={expense.type === "expense" ? "bg-red-100 text-red-800" : "bg-orange-100 text-orange-800"}
                    >
                      {expense.type}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Building className="h-4 w-4 text-gray-500" />
                      {getProjectName(expense.projectId)}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <DollarSign className={`h-4 w-4 ${expense.type === "expense" ? "text-red-600" : "text-orange-600"}`} />
                      <span className="font-medium">{formatCurrency(expense.amount)}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {expense.notes && (
                      <div className="text-sm text-gray-600 truncate max-w-xs">
                        {expense.notes}
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0" data-testid={`button-actions-${expense.id}`}>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleEdit(expense)}>
                          <Edit className="h-4 w-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => handleDelete(expense.id)}
                          className="text-red-600"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {filteredExpenses.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              No {activeTab === "all" ? "expenses" : activeTab} recorded yet. Add your first entry to get started.
            </div>
          )}
        </CardContent>
      </Card>
        </div>
      </div>
    </Sidebar>
  );
}