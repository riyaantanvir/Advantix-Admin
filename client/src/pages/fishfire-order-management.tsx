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
import { ShoppingCart, Plus, Edit3, Trash2, Eye, Package, Calendar, User } from "lucide-react";
import type { FishfireOrder, InsertFishfireOrder } from "@shared/schema";

function OrderManagement() {
  const { toast } = useToast();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [formData, setFormData] = useState<InsertFishfireOrder>({
    orderNumber: `ORD-${Date.now()}`,
    customerName: "",
    customerPhone: "",
    customerAddress: "",
    orderDate: new Date(),
    totalAmount: 0,
    discountAmount: 0,
    finalAmount: 0,
    paymentStatus: "pending",
    orderStatus: "pending",
    paymentMethod: "cash",
    notes: "",
    deliveryDate: undefined,
  });

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ["/api/fishfire/orders"],
  });

  const createOrderMutation = useMutation({
    mutationFn: async (data: InsertFishfireOrder) => {
      const response = await apiRequest("POST", "/api/fishfire/orders", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/fishfire/orders"] });
      setIsCreateDialogOpen(false);
      setFormData({
        orderNumber: `ORD-${Date.now()}`,
        customerName: "",
        customerPhone: "",
        customerAddress: "",
        orderDate: new Date(),
        totalAmount: 0,
        discountAmount: 0,
        finalAmount: 0,
        paymentStatus: "pending",
        orderStatus: "pending",
        paymentMethod: "cash",
        notes: "",
        deliveryDate: undefined,
      });
      toast({
        title: "Order created",
        description: "Order has been created successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create order",
        variant: "destructive",
      });
    },
  });

  const handleCreateOrder = () => {
    createOrderMutation.mutate(formData);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed": return "bg-green-100 text-green-800";
      case "processing": return "bg-blue-100 text-blue-800";
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
            <ShoppingCart className="w-8 h-8" />
            Order Management
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Manage customer orders and track order status
          </p>
        </div>

        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="flex items-center gap-2" data-testid="button-create-order">
              <Plus className="w-4 h-4" />
              New Order
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create New Order</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="orderNumber">Order Number</Label>
                  <Input
                    id="orderNumber"
                    value={formData.orderNumber}
                    onChange={(e) => setFormData({ ...formData, orderNumber: e.target.value })}
                    data-testid="input-order-number"
                  />
                </div>
                <div>
                  <Label htmlFor="customerName">Customer Name</Label>
                  <Input
                    id="customerName"
                    value={formData.customerName}
                    onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                    data-testid="input-customer-name"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="customerPhone">Customer Phone</Label>
                  <Input
                    id="customerPhone"
                    value={formData.customerPhone || ""}
                    onChange={(e) => setFormData({ ...formData, customerPhone: e.target.value })}
                    data-testid="input-customer-phone"
                  />
                </div>
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
                      <SelectItem value="card">Card</SelectItem>
                      <SelectItem value="online">Online</SelectItem>
                      <SelectItem value="credit">Credit</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="customerAddress">Customer Address</Label>
                <Textarea
                  id="customerAddress"
                  value={formData.customerAddress || ""}
                  onChange={(e) => setFormData({ ...formData, customerAddress: e.target.value })}
                  data-testid="textarea-customer-address"
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="totalAmount">Total Amount</Label>
                  <Input
                    id="totalAmount"
                    type="number"
                    step="0.01"
                    value={formData.totalAmount}
                    onChange={(e) => {
                      const total = parseFloat(e.target.value) || 0;
                      setFormData({ 
                        ...formData, 
                        totalAmount: total,
                        finalAmount: total - (formData.discountAmount || 0)
                      });
                    }}
                    data-testid="input-total-amount"
                  />
                </div>
                <div>
                  <Label htmlFor="discountAmount">Discount Amount</Label>
                  <Input
                    id="discountAmount"
                    type="number"
                    step="0.01"
                    value={formData.discountAmount}
                    onChange={(e) => {
                      const discount = parseFloat(e.target.value) || 0;
                      setFormData({ 
                        ...formData, 
                        discountAmount: discount,
                        finalAmount: (formData.totalAmount || 0) - discount
                      });
                    }}
                    data-testid="input-discount-amount"
                  />
                </div>
                <div>
                  <Label htmlFor="finalAmount">Final Amount</Label>
                  <Input
                    id="finalAmount"
                    type="number"
                    step="0.01"
                    value={formData.finalAmount}
                    readOnly
                    className="bg-gray-100"
                    data-testid="input-final-amount"
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
                onClick={handleCreateOrder} 
                disabled={createOrderMutation.isPending}
                className="w-full"
                data-testid="button-submit-order"
              >
                {createOrderMutation.isPending ? "Creating..." : "Create Order"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Orders Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="w-5 h-5" />
            Customer Orders
          </CardTitle>
          <CardDescription>
            View and manage all customer orders
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">Loading orders...</div>
          ) : orders.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No orders found. Create your first order to get started.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order #</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Payment</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orders.map((order: FishfireOrder) => (
                    <TableRow key={order.id}>
                      <TableCell className="font-medium" data-testid={`order-number-${order.id}`}>
                        {order.orderNumber}
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium" data-testid={`customer-name-${order.id}`}>
                            {order.customerName}
                          </div>
                          {order.customerPhone && (
                            <div className="text-sm text-gray-500" data-testid={`customer-phone-${order.id}`}>
                              {order.customerPhone}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell data-testid={`order-date-${order.id}`}>
                        {new Date(order.orderDate).toLocaleDateString()}
                      </TableCell>
                      <TableCell data-testid={`final-amount-${order.id}`}>
                        ৳{parseFloat(order.finalAmount.toString()).toFixed(2)}
                      </TableCell>
                      <TableCell>
                        <Badge className={getPaymentColor(order.paymentStatus)} data-testid={`payment-status-${order.id}`}>
                          {order.paymentStatus}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(order.orderStatus)} data-testid={`order-status-${order.id}`}>
                          {order.orderStatus}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button variant="ghost" size="sm" data-testid={`button-view-${order.id}`}>
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="sm" data-testid={`button-edit-${order.id}`}>
                            <Edit3 className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="sm" data-testid={`button-delete-${order.id}`}>
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

export default function FishfireOrderManagementPage() {
  return (
    <Sidebar>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4">
        <div className="max-w-7xl mx-auto">
          <OrderManagement />
        </div>
      </div>
    </Sidebar>
  );
}