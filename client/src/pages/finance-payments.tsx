import { useState, useEffect, useMemo } from "react";
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
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { insertFinancePaymentSchema, type FinancePayment, type Client, type FinanceProject, type InsertFinancePayment } from "@shared/schema";
import { Plus, Edit, Trash2, MoreHorizontal, DollarSign, Calendar, Building, ArrowUpDown, Filter, X } from "lucide-react";
import { formatDistance } from "date-fns";
import Sidebar from "@/components/layout/Sidebar";

export default function FinancePayments() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingPayment, setEditingPayment] = useState<FinancePayment | null>(null);
  
  // Filter states
  const [selectedProject, setSelectedProject] = useState<string>("all");
  const [selectedClient, setSelectedClient] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState<string>("all");
  const [customStartDate, setCustomStartDate] = useState<string>("");
  const [customEndDate, setCustomEndDate] = useState<string>("");
  
  const { toast } = useToast();

  // Fetch payments
  const { data: payments, isLoading: paymentsLoading } = useQuery<FinancePayment[]>({
    queryKey: ["/api/finance/payments"],
  });

  // Fetch clients
  const { data: clients } = useQuery<Client[]>({
    queryKey: ["/api/clients"],
  });

  // Fetch projects
  const { data: projects } = useQuery<FinanceProject[]>({
    queryKey: ["/api/finance/projects"],
  });

  // Fetch exchange rate
  const { data: exchangeRateData } = useQuery<{ rate: number }>({
    queryKey: ["/api/finance/exchange-rate"],
  });

  const exchangeRate = exchangeRateData?.rate || 110;

  // Create/Update form
  const form = useForm<InsertFinancePayment>({
    resolver: zodResolver(insertFinancePaymentSchema),
    defaultValues: {
      clientId: "",
      projectId: "",
      amount: "",
      conversionRate: exchangeRate.toString(),
      convertedAmount: "0",
      currency: "USD",
      date: new Date(),
      notes: "",
    },
  });

  // Watch amount and conversion rate to auto-calculate converted amount
  const amount = form.watch("amount");
  const conversionRate = form.watch("conversionRate");

  // Update converted amount when amount or rate changes
  useEffect(() => {
    const numAmount = parseFloat(amount || "0");
    const numRate = parseFloat(conversionRate || "0");
    const converted = numAmount * numRate;
    form.setValue("convertedAmount", converted.toString());
  }, [amount, conversionRate, form]);

  // Update conversion rate when exchange rate data loads (for new payments only)
  useEffect(() => {
    if (exchangeRateData?.rate && !editingPayment && !form.getValues("conversionRate")) {
      form.setValue("conversionRate", exchangeRateData.rate.toString());
    }
  }, [exchangeRateData, editingPayment, form]);

  // Create payment mutation
  const createPaymentMutation = useMutation({
    mutationFn: async (data: InsertFinancePayment) => {
      const response = await apiRequest("POST", "/api/finance/payments", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/finance/payments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/finance/dashboard"] });
      setIsCreateDialogOpen(false);
      form.reset();
      toast({
        title: "Success",
        description: "Payment recorded successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to record payment.",
        variant: "destructive",
      });
    },
  });

  // Update payment mutation
  const updatePaymentMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<InsertFinancePayment> }) => {
      const response = await apiRequest("PUT", `/api/finance/payments/${id}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/finance/payments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/finance/dashboard"] });
      setEditingPayment(null);
      form.reset();
      toast({
        title: "Success",
        description: "Payment updated successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update payment.",
        variant: "destructive",
      });
    },
  });

  // Delete payment mutation
  const deletePaymentMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/finance/payments/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/finance/payments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/finance/dashboard"] });
      toast({
        title: "Success",
        description: "Payment deleted successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete payment.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: InsertFinancePayment) => {
    if (editingPayment) {
      updatePaymentMutation.mutate({ id: editingPayment.id, data });
    } else {
      createPaymentMutation.mutate(data);
    }
  };

  const handleEdit = (payment: FinancePayment) => {
    setEditingPayment(payment);
    form.reset({
      clientId: payment.clientId,
      projectId: payment.projectId,
      amount: payment.amount,
      conversionRate: payment.conversionRate,
      convertedAmount: payment.convertedAmount,
      currency: payment.currency,
      date: new Date(payment.date),
      notes: payment.notes || "",
    });
  };

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this payment?")) {
      deletePaymentMutation.mutate(id);
    }
  };

  const getClientName = (clientId: string) => {
    const client = clients?.find(c => c.id === clientId);
    return client?.clientName || "Unknown Client";
  };

  const getProjectName = (projectId: string) => {
    const project = projects?.find(p => p.id === projectId);
    return project?.name || "Unknown Project";
  };

  const formatCurrency = (amount: string | number, currency: "USD" | "BDT" = "USD") => {
    const numAmount = typeof amount === "string" ? parseFloat(amount) : amount;
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      minimumFractionDigits: currency === "BDT" ? 0 : 2,
    }).format(numAmount);
  };

  // Helper function to get date range
  const getDateRange = (filter: string) => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    
    switch (filter) {
      case "thisYear":
        const yearEnd = new Date(currentYear, 11, 31);
        yearEnd.setHours(23, 59, 59, 999);
        return {
          start: new Date(currentYear, 0, 1),
          end: yearEnd
        };
      case "thisMonth":
        const monthEnd = new Date(currentYear, currentMonth + 1, 0);
        monthEnd.setHours(23, 59, 59, 999);
        return {
          start: new Date(currentYear, currentMonth, 1),
          end: monthEnd
        };
      case "lastMonth":
        const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
        const lastMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;
        const lastMonthEnd = new Date(lastMonthYear, lastMonth + 1, 0);
        lastMonthEnd.setHours(23, 59, 59, 999);
        return {
          start: new Date(lastMonthYear, lastMonth, 1),
          end: lastMonthEnd
        };
      case "custom":
        const customStart = customStartDate ? new Date(customStartDate) : null;
        let customEnd = null;
        if (customEndDate) {
          customEnd = new Date(customEndDate);
          customEnd.setHours(23, 59, 59, 999);
        }
        return {
          start: customStart,
          end: customEnd
        };
      default:
        return null;
    }
  };

  // Filtered payments based on current filters
  const filteredPayments = useMemo(() => {
    if (!payments) return [];
    
    return payments.filter(payment => {
      // Filter by project
      if (selectedProject !== "all" && payment.projectId !== selectedProject) {
        return false;
      }
      
      // Filter by client  
      if (selectedClient !== "all" && payment.clientId !== selectedClient) {
        return false;
      }
      
      // Filter by date
      if (dateFilter !== "all") {
        const dateRange = getDateRange(dateFilter);
        if (dateRange && (dateRange.start || dateRange.end)) {
          const paymentDate = new Date(payment.date);
          if (dateRange.start && paymentDate < dateRange.start) return false;
          if (dateRange.end && paymentDate > dateRange.end) return false;
        }
      }
      
      return true;
    });
  }, [payments, selectedProject, selectedClient, dateFilter, customStartDate, customEndDate]);

  // Calculate totals for filtered payments
  const totals = useMemo(() => {
    const totalUSD = filteredPayments.reduce((sum, payment) => sum + parseFloat(payment.amount), 0);
    const totalBDT = filteredPayments.reduce((sum, payment) => sum + parseFloat(payment.convertedAmount), 0);
    
    return { totalUSD, totalBDT };
  }, [filteredPayments]);

  // Clear filters function
  const clearFilters = () => {
    setSelectedProject("all");
    setSelectedClient("all");
    setDateFilter("all");
    setCustomStartDate("");
    setCustomEndDate("");
  };

  if (paymentsLoading) {
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
        <div className="container mx-auto p-6 space-y-6" data-testid="page-finance-payments">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Payments</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Track client payments with automatic USD/BDT conversion
          </p>
        </div>
        
        <Dialog open={isCreateDialogOpen || !!editingPayment} onOpenChange={(open) => {
          if (!open) {
            setIsCreateDialogOpen(false);
            setEditingPayment(null);
            form.reset();
          }
        }}>
          <DialogTrigger asChild>
            <Button onClick={() => {
              setIsCreateDialogOpen(true);
              form.setValue("conversionRate", exchangeRate.toString());
            }} data-testid="button-add-payment">
              <Plus className="h-4 w-4 mr-2" />
              Add Payment
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>
                {editingPayment ? "Edit Payment" : "Add New Payment"}
              </DialogTitle>
              <DialogDescription>
                {editingPayment ? "Update payment details" : "Record a new client payment"}
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="clientId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Client</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-client">
                              <SelectValue placeholder="Select client" />
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
                  <FormField
                    control={form.control}
                    name="projectId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Project</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-project">
                              <SelectValue placeholder="Select project" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {projects?.map((project) => (
                              <SelectItem key={project.id} value={project.id}>
                                <div>
                                  <div className="font-medium">{project.name}</div>
                                  <div className="text-xs text-gray-400 font-mono">ID: {project.id}</div>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <div className="grid grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="amount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Amount (USD)</FormLabel>
                        <FormControl>
                          <Input {...field} type="number" step="0.01" placeholder="0.00" data-testid="input-amount" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="conversionRate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Exchange Rate</FormLabel>
                        <FormControl>
                          <Input {...field} type="number" step="0.01" placeholder="110.00" data-testid="input-rate" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="convertedAmount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Amount (BDT)</FormLabel>
                        <FormControl>
                          <Input {...field} readOnly className="bg-gray-50" data-testid="input-converted" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Payment Date</FormLabel>
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

                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Notes</FormLabel>
                      <FormControl>
                        <Textarea {...field} placeholder="Payment notes..." data-testid="textarea-notes" value={field.value || ""} />
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
                      setEditingPayment(null);
                      form.reset();
                    }}
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={createPaymentMutation.isPending || updatePaymentMutation.isPending}
                    data-testid="button-submit"
                  >
                    {createPaymentMutation.isPending || updatePaymentMutation.isPending ? "Saving..." : editingPayment ? "Update" : "Create"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filter Options */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filter Options
            </div>
            {(selectedProject !== "all" || selectedClient !== "all" || dateFilter !== "all") && (
              <Button
                variant="outline"
                size="sm"
                onClick={clearFilters}
                data-testid="button-clear-filters"
              >
                <X className="h-4 w-4 mr-2" />
                Clear Filters
              </Button>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Project Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Filter by Project</label>
              <Select value={selectedProject} onValueChange={setSelectedProject}>
                <SelectTrigger data-testid="filter-project">
                  <SelectValue placeholder="All Projects" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Projects</SelectItem>
                  {projects?.map((project) => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Client Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Filter by Client</label>
              <Select value={selectedClient} onValueChange={setSelectedClient}>
                <SelectTrigger data-testid="filter-client">
                  <SelectValue placeholder="All Clients" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Clients</SelectItem>
                  {clients?.map((client) => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.clientName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Date Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Filter by Date</label>
              <Select value={dateFilter} onValueChange={setDateFilter}>
                <SelectTrigger data-testid="filter-date">
                  <SelectValue placeholder="All Dates" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Dates</SelectItem>
                  <SelectItem value="thisYear">This Year</SelectItem>
                  <SelectItem value="thisMonth">This Month</SelectItem>
                  <SelectItem value="lastMonth">Last Month</SelectItem>
                  <SelectItem value="custom">Custom Range</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Custom Date Range */}
          {dateFilter === "custom" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 p-4 border rounded-lg bg-gray-50 dark:bg-gray-800">
              <div className="space-y-2">
                <label className="text-sm font-medium">Start Date</label>
                <Input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  data-testid="filter-start-date"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">End Date</label>
                <Input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  data-testid="filter-end-date"
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Payment Totals Section */}
      {filteredPayments && filteredPayments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Payment Totals
              {(selectedProject !== "all" || selectedClient !== "all" || dateFilter !== "all") && (
                <Badge variant="outline" className="ml-2">
                  Filtered Results
                </Badge>
              )}
            </CardTitle>
            <CardDescription>
              Showing totals for {filteredPayments.length} payment{filteredPayments.length !== 1 ? 's' : ''}
              {payments && filteredPayments.length !== payments.length && (
                <> out of {payments.length} total</>
              )}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-green-600" />
                  <span className="text-sm font-medium text-gray-600">Total Amount (USD)</span>
                </div>
                <div className="text-3xl font-bold text-green-600" data-testid="total-usd">
                  {formatCurrency(totals.totalUSD, "USD")}
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-blue-600" />
                  <span className="text-sm font-medium text-gray-600">Total Conversion (BDT)</span>
                </div>
                <div className="text-3xl font-bold text-blue-600" data-testid="total-bdt">
                  {formatCurrency(totals.totalBDT, "BDT")}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Exchange Rate Display */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ArrowUpDown className="h-5 w-5 text-blue-600" />
              <span className="text-sm font-medium">Current Exchange Rate:</span>
            </div>
            <div className="text-lg font-bold">
              1 USD = {exchangeRate} BDT
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Payments Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Project</TableHead>
                <TableHead>Amount (USD)</TableHead>
                <TableHead>Conversion (BDT)</TableHead>
                <TableHead>Notes</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPayments?.map((payment) => (
                <TableRow key={payment.id} data-testid={`row-payment-${payment.id}`}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-gray-500" />
                      <div>
                        <div>{new Date(payment.date).toLocaleDateString()}</div>
                        <div className="text-sm text-gray-500">
                          {formatDistance(new Date(payment.date), new Date(), { addSuffix: true })}
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>{getClientName(payment.clientId)}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Building className="h-4 w-4 text-gray-500" />
                      {getProjectName(payment.projectId)}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4 text-green-600" />
                      <div>
                        <div className="font-medium">{formatCurrency(payment.amount, "USD")}</div>
                        <div className="text-xs text-gray-500">@ {payment.conversionRate}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4 text-blue-600" />
                      {formatCurrency(payment.convertedAmount, "BDT")}
                    </div>
                  </TableCell>
                  <TableCell>
                    {payment.notes && (
                      <div className="text-sm text-gray-600 truncate max-w-xs">
                        {payment.notes}
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0" data-testid={`button-actions-${payment.id}`}>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleEdit(payment)}>
                          <Edit className="h-4 w-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => handleDelete(payment.id)}
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
          {(!filteredPayments || filteredPayments.length === 0) && (
            <div className="text-center py-8 text-gray-500">
              {!payments || payments.length === 0 
                ? "No payments recorded yet. Add your first payment to get started."
                : "No payments match the current filters. Try adjusting your filter criteria."
              }
            </div>
          )}
        </CardContent>
      </Card>
        </div>
      </div>
    </Sidebar>
  );
}