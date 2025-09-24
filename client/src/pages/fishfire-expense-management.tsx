import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import Sidebar from "@/components/layout/Sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Receipt, Plus, Edit3, Trash2, DollarSign, Calendar, Building } from "lucide-react";
import type { FishfireExpense, InsertFishfireExpense } from "@shared/schema";

function ExpenseManagement() {
  const { toast } = useToast();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [formData, setFormData] = useState<InsertFishfireExpense>({
    expenseDate: new Date(),
    category: "supplies",
    description: "",
    amount: 0,
    paymentMethod: "cash",
    vendor: "",
    receiptNumber: "",
    notes: "",
    approvedBy: "",
    status: "pending",
  });

  const { data: expenses = [], isLoading } = useQuery({
    queryKey: ["/api/fishfire/expenses"],
  });

  const createExpenseMutation = useMutation({
    mutationFn: async (data: InsertFishfireExpense) => {
      const response = await apiRequest("POST", "/api/fishfire/expenses", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/fishfire/expenses"] });
      setIsCreateDialogOpen(false);
      setFormData({
        expenseDate: new Date(),
        category: "supplies",
        description: "",
        amount: 0,
        paymentMethod: "cash",
        vendor: "",
        receiptNumber: "",
        notes: "",
        approvedBy: "",
        status: "pending",
      });
      toast({
        title: "Expense recorded",
        description: "Expense has been recorded successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to record expense",
        variant: "destructive",
      });
    },
  });

  const handleCreateExpense = () => {
    createExpenseMutation.mutate(formData);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "approved": return "bg-green-100 text-green-800";
      case "pending": return "bg-yellow-100 text-yellow-800";
      case "rejected": return "bg-red-100 text-red-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case "supplies": return "bg-blue-100 text-blue-800";
      case "utilities": return "bg-green-100 text-green-800";
      case "rent": return "bg-purple-100 text-purple-800";
      case "marketing": return "bg-pink-100 text-pink-800";
      case "transportation": return "bg-orange-100 text-orange-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Receipt className="w-8 h-8" />
            Expense Management
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Track and manage business expenses
          </p>
        </div>

        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="flex items-center gap-2" data-testid="button-create-expense">
              <Plus className="w-4 h-4" />
              New Expense
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Record New Expense</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="category">Category</Label>
                  <Select
                    value={formData.category}
                    onValueChange={(value) => setFormData({ ...formData, category: value })}
                  >
                    <SelectTrigger data-testid="select-category">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="supplies">Supplies</SelectItem>
                      <SelectItem value="utilities">Utilities</SelectItem>
                      <SelectItem value="rent">Rent</SelectItem>
                      <SelectItem value="marketing">Marketing</SelectItem>
                      <SelectItem value="transportation">Transportation</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="amount">Amount (৳)</Label>
                  <Input
                    id="amount"
                    type="number"
                    step="0.01"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })}
                    data-testid="input-amount"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Input
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  data-testid="input-description"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="paymentMethod">Payment Method</Label>
                  <Select
                    value={formData.paymentMethod}
                    onValueChange={(value) => setFormData({ ...formData, paymentMethod: value })}
                  >
                    <SelectTrigger data-testid="select-payment-method">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">Cash</SelectItem>
                      <SelectItem value="bank">Bank</SelectItem>
                      <SelectItem value="card">Card</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="vendor">Vendor</Label>
                  <Input
                    id="vendor"
                    value={formData.vendor || ""}
                    onChange={(e) => setFormData({ ...formData, vendor: e.target.value })}
                    data-testid="input-vendor"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="receiptNumber">Receipt Number</Label>
                  <Input
                    id="receiptNumber"
                    value={formData.receiptNumber || ""}
                    onChange={(e) => setFormData({ ...formData, receiptNumber: e.target.value })}
                    data-testid="input-receipt-number"
                  />
                </div>
                <div>
                  <Label htmlFor="approvedBy">Approved By</Label>
                  <Input
                    id="approvedBy"
                    value={formData.approvedBy || ""}
                    onChange={(e) => setFormData({ ...formData, approvedBy: e.target.value })}
                    data-testid="input-approved-by"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={formData.notes || ""}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  data-testid="textarea-notes"
                />
              </div>

              <Button 
                onClick={handleCreateExpense} 
                disabled={createExpenseMutation.isPending}
                className="w-full"
                data-testid="button-submit-expense"
              >
                {createExpenseMutation.isPending ? "Recording..." : "Record Expense"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Expenses Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="w-5 h-5" />
            Business Expenses
          </CardTitle>
          <CardDescription>
            View and manage all business expenses
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">Loading expenses...</div>
          ) : expenses.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No expenses found. Record your first expense to get started.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Payment</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {expenses.map((expense: FishfireExpense) => (
                    <TableRow key={expense.id}>
                      <TableCell data-testid={`expense-date-${expense.id}`}>
                        {new Date(expense.expenseDate).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <Badge className={getCategoryColor(expense.category)} data-testid={`expense-category-${expense.id}`}>
                          {expense.category}
                        </Badge>
                      </TableCell>
                      <TableCell data-testid={`expense-description-${expense.id}`}>
                        {expense.description}
                      </TableCell>
                      <TableCell className="font-medium" data-testid={`expense-amount-${expense.id}`}>
                        ৳{parseFloat(expense.amount.toString()).toFixed(2)}
                      </TableCell>
                      <TableCell data-testid={`expense-payment-${expense.id}`}>
                        {expense.paymentMethod}
                      </TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(expense.status)} data-testid={`expense-status-${expense.id}`}>
                          {expense.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button variant="ghost" size="sm" data-testid={`button-edit-${expense.id}`}>
                            <Edit3 className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="sm" data-testid={`button-delete-${expense.id}`}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
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
  );
}

export default function FishfireExpenseManagementPage() {
  return (
    <Sidebar>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4">
        <div className="max-w-7xl mx-auto">
          <ExpenseManagement />
        </div>
      </div>
    </Sidebar>
  );
}