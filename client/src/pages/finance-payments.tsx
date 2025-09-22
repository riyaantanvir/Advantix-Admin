import { useState, useEffect } from "react";
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
import { Plus, Edit, Trash2, MoreHorizontal, DollarSign, Calendar, Building, ArrowUpDown } from "lucide-react";
import { formatDistance } from "date-fns";
import Sidebar from "@/components/layout/Sidebar";

export default function FinancePayments() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingPayment, setEditingPayment] = useState<FinancePayment | null>(null);
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
                        <Textarea {...field} placeholder="Payment notes..." data-testid="textarea-notes" />
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
              {payments?.map((payment) => (
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
          {(!payments || payments.length === 0) && (
            <div className="text-center py-8 text-gray-500">
              No payments recorded yet. Add your first payment to get started.
            </div>
          )}
        </CardContent>
      </Card>
        </div>
      </div>
    </Sidebar>
  );
}