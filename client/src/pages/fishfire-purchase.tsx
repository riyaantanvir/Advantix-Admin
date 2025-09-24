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
import { Truck, Plus, Edit3, Trash2, Package, Building, Calendar, DollarSign } from "lucide-react";
import type { FishfirePurchase, InsertFishfirePurchase } from "@shared/schema";

function PurchaseManagement() {
  const { toast } = useToast();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [formData, setFormData] = useState<InsertFishfirePurchase>({
    purchaseNumber: `PUR-${Date.now()}`,
    supplierName: "",
    supplierContact: "",
    purchaseDate: new Date(),
    totalAmount: 0,
    paymentStatus: "pending",
    paymentMethod: "cash",
    deliveryDate: undefined,
    notes: "",
    status: "pending",
  });

  const { data: purchases = [], isLoading } = useQuery({
    queryKey: ["/api/fishfire/purchases"],
  });

  const createPurchaseMutation = useMutation({
    mutationFn: async (data: InsertFishfirePurchase) => {
      const response = await apiRequest("POST", "/api/fishfire/purchases", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/fishfire/purchases"] });
      setIsCreateDialogOpen(false);
      setFormData({
        purchaseNumber: `PUR-${Date.now()}`,
        supplierName: "",
        supplierContact: "",
        purchaseDate: new Date(),
        totalAmount: 0,
        paymentStatus: "pending",
        paymentMethod: "cash",
        deliveryDate: undefined,
        notes: "",
        status: "pending",
      });
      toast({
        title: "Purchase order created",
        description: "Purchase order has been created successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create purchase order",
        variant: "destructive",
      });
    },
  });

  const handleCreatePurchase = () => {
    createPurchaseMutation.mutate(formData);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "received": return "bg-green-100 text-green-800";
      case "pending": return "bg-yellow-100 text-yellow-800";
      case "cancelled": return "bg-red-100 text-red-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const getPaymentColor = (status: string) => {
    switch (status) {
      case "paid": return "bg-green-100 text-green-800";
      case "partial": return "bg-yellow-100 text-yellow-800";
      case "pending": return "bg-red-100 text-red-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Truck className="w-8 h-8" />
            Purchase Management
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Manage supplier purchases and inventory procurement
          </p>
        </div>

        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="flex items-center gap-2" data-testid="button-create-purchase">
              <Plus className="w-4 h-4" />
              New Purchase Order
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create New Purchase Order</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="purchaseNumber">Purchase Number</Label>
                  <Input
                    id="purchaseNumber"
                    value={formData.purchaseNumber}
                    onChange={(e) => setFormData({ ...formData, purchaseNumber: e.target.value })}
                    data-testid="input-purchase-number"
                  />
                </div>
                <div>
                  <Label htmlFor="supplierName">Supplier Name</Label>
                  <Input
                    id="supplierName"
                    value={formData.supplierName}
                    onChange={(e) => setFormData({ ...formData, supplierName: e.target.value })}
                    data-testid="input-supplier-name"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="supplierContact">Supplier Contact</Label>
                  <Input
                    id="supplierContact"
                    value={formData.supplierContact || ""}
                    onChange={(e) => setFormData({ ...formData, supplierContact: e.target.value })}
                    data-testid="input-supplier-contact"
                  />
                </div>
                <div>
                  <Label htmlFor="totalAmount">Total Amount (৳)</Label>
                  <Input
                    id="totalAmount"
                    type="number"
                    step="0.01"
                    value={formData.totalAmount}
                    onChange={(e) => setFormData({ ...formData, totalAmount: parseFloat(e.target.value) || 0 })}
                    data-testid="input-total-amount"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="purchaseDate">Purchase Date</Label>
                  <Input
                    id="purchaseDate"
                    type="date"
                    value={formData.purchaseDate.toISOString().split('T')[0]}
                    onChange={(e) => setFormData({ ...formData, purchaseDate: new Date(e.target.value) })}
                    data-testid="input-purchase-date"
                  />
                </div>
                <div>
                  <Label htmlFor="deliveryDate">Expected Delivery Date</Label>
                  <Input
                    id="deliveryDate"
                    type="date"
                    value={formData.deliveryDate ? formData.deliveryDate.toISOString().split('T')[0] : ""}
                    onChange={(e) => setFormData({ 
                      ...formData, 
                      deliveryDate: e.target.value ? new Date(e.target.value) : undefined 
                    })}
                    data-testid="input-delivery-date"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="paymentMethod">Payment Method</Label>
                  <Select
                    value={formData.paymentMethod || ""}
                    onValueChange={(value) => setFormData({ ...formData, paymentMethod: value })}
                  >
                    <SelectTrigger data-testid="select-payment-method">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">Cash</SelectItem>
                      <SelectItem value="bank">Bank Transfer</SelectItem>
                      <SelectItem value="credit">Credit</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="status">Status</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value) => setFormData({ ...formData, status: value })}
                  >
                    <SelectTrigger data-testid="select-status">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="received">Received</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
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
                onClick={handleCreatePurchase} 
                disabled={createPurchaseMutation.isPending}
                className="w-full"
                data-testid="button-submit-purchase"
              >
                {createPurchaseMutation.isPending ? "Creating..." : "Create Purchase Order"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Purchases Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="w-5 h-5" />
            Purchase Orders
          </CardTitle>
          <CardDescription>
            View and manage all supplier purchase orders
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">Loading purchase orders...</div>
          ) : purchases.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No purchase orders found. Create your first purchase order to get started.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Purchase #</TableHead>
                    <TableHead>Supplier</TableHead>
                    <TableHead>Purchase Date</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Delivery Date</TableHead>
                    <TableHead>Payment</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {purchases.map((purchase: FishfirePurchase) => (
                    <TableRow key={purchase.id}>
                      <TableCell className="font-medium" data-testid={`purchase-number-${purchase.id}`}>
                        {purchase.purchaseNumber}
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium" data-testid={`supplier-name-${purchase.id}`}>
                            {purchase.supplierName}
                          </div>
                          {purchase.supplierContact && (
                            <div className="text-sm text-gray-500" data-testid={`supplier-contact-${purchase.id}`}>
                              {purchase.supplierContact}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell data-testid={`purchase-date-${purchase.id}`}>
                        {new Date(purchase.purchaseDate).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="font-medium" data-testid={`purchase-amount-${purchase.id}`}>
                        ৳{parseFloat(purchase.totalAmount.toString()).toFixed(2)}
                      </TableCell>
                      <TableCell data-testid={`delivery-date-${purchase.id}`}>
                        {purchase.deliveryDate 
                          ? new Date(purchase.deliveryDate).toLocaleDateString() 
                          : "-"
                        }
                      </TableCell>
                      <TableCell>
                        <Badge className={getPaymentColor(purchase.paymentStatus)} data-testid={`payment-status-${purchase.id}`}>
                          {purchase.paymentStatus}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(purchase.status)} data-testid={`purchase-status-${purchase.id}`}>
                          {purchase.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button variant="ghost" size="sm" data-testid={`button-edit-${purchase.id}`}>
                            <Edit3 className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="sm" data-testid={`button-delete-${purchase.id}`}>
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

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="flex items-center p-6">
            <Building className="h-8 w-8 text-blue-600 mr-3" />
            <div>
              <p className="text-sm font-medium text-gray-600">Total Purchases</p>
              <p className="text-2xl font-bold" data-testid="total-purchases">{purchases.length}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center p-6">
            <DollarSign className="h-8 w-8 text-green-600 mr-3" />
            <div>
              <p className="text-sm font-medium text-gray-600">Total Amount</p>
              <p className="text-2xl font-bold text-green-600" data-testid="total-purchase-amount">
                ৳{purchases.reduce((sum: number, p: FishfirePurchase) => 
                  sum + parseFloat(p.totalAmount.toString()), 0
                ).toFixed(2)}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center p-6">
            <Package className="h-8 w-8 text-yellow-600 mr-3" />
            <div>
              <p className="text-sm font-medium text-gray-600">Pending</p>
              <p className="text-2xl font-bold text-yellow-600" data-testid="pending-purchases">
                {purchases.filter((p: FishfirePurchase) => p.status === 'pending').length}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center p-6">
            <Calendar className="h-8 w-8 text-blue-600 mr-3" />
            <div>
              <p className="text-sm font-medium text-gray-600">This Month</p>
              <p className="text-2xl font-bold text-blue-600" data-testid="month-purchases">
                {purchases.filter((p: FishfirePurchase) => {
                  const purchaseMonth = new Date(p.purchaseDate).getMonth();
                  const currentMonth = new Date().getMonth();
                  return purchaseMonth === currentMonth;
                }).length}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function FishfirePurchasePage() {
  return (
    <Sidebar>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4">
        <div className="max-w-7xl mx-auto">
          <PurchaseManagement />
        </div>
      </div>
    </Sidebar>
  );
}