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
import { Package, Plus, Edit3, Trash2, AlertTriangle, TrendingUp, TrendingDown, Boxes } from "lucide-react";
import type { FishfireProduct, InsertFishfireProduct } from "@shared/schema";

function StockReport() {
  const { toast } = useToast();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [formData, setFormData] = useState<InsertFishfireProduct>({
    name: "",
    description: "",
    sku: "",
    category: "",
    unitPrice: 0,
    stockQuantity: 0,
    minStockLevel: 10,
    unit: "pcs",
    status: "active",
    supplier: "",
    notes: "",
  });

  const { data: products = [], isLoading } = useQuery({
    queryKey: ["/api/fishfire/products"],
  });

  const createProductMutation = useMutation({
    mutationFn: async (data: InsertFishfireProduct) => {
      const response = await apiRequest("POST", "/api/fishfire/products", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/fishfire/products"] });
      setIsCreateDialogOpen(false);
      setFormData({
        name: "",
        description: "",
        sku: "",
        category: "",
        unitPrice: 0,
        stockQuantity: 0,
        minStockLevel: 10,
        unit: "pcs",
        status: "active",
        supplier: "",
        notes: "",
      });
      toast({
        title: "Product added",
        description: "Product has been added to inventory successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to add product",
        variant: "destructive",
      });
    },
  });

  const handleCreateProduct = () => {
    createProductMutation.mutate(formData);
  };

  const getStockStatus = (product: FishfireProduct) => {
    if (product.stockQuantity === 0) {
      return { status: "Out of Stock", color: "bg-red-100 text-red-800", icon: <AlertTriangle className="w-4 h-4" /> };
    } else if (product.stockQuantity <= product.minStockLevel) {
      return { status: "Low Stock", color: "bg-yellow-100 text-yellow-800", icon: <TrendingDown className="w-4 h-4" /> };
    } else {
      return { status: "In Stock", color: "bg-green-100 text-green-800", icon: <TrendingUp className="w-4 h-4" /> };
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active": return "bg-green-100 text-green-800";
      case "discontinued": return "bg-red-100 text-red-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  // Calculate summary statistics
  const totalProducts = products.length;
  const lowStockProducts = products.filter((p: FishfireProduct) => p.stockQuantity <= p.minStockLevel).length;
  const outOfStockProducts = products.filter((p: FishfireProduct) => p.stockQuantity === 0).length;
  const totalStockValue = products.reduce((sum: number, p: FishfireProduct) => sum + (parseFloat(p.unitPrice.toString()) * p.stockQuantity), 0);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Package className="w-8 h-8" />
            Stock Report
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Monitor inventory levels and manage product stock
          </p>
        </div>

        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="flex items-center gap-2" data-testid="button-create-product">
              <Plus className="w-4 h-4" />
              Add Product
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add New Product</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Product Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    data-testid="input-product-name"
                  />
                </div>
                <div>
                  <Label htmlFor="sku">SKU</Label>
                  <Input
                    id="sku"
                    value={formData.sku || ""}
                    onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                    data-testid="input-sku"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="category">Category</Label>
                  <Input
                    id="category"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    data-testid="input-category"
                  />
                </div>
                <div>
                  <Label htmlFor="supplier">Supplier</Label>
                  <Input
                    id="supplier"
                    value={formData.supplier || ""}
                    onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
                    data-testid="input-supplier"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description || ""}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  data-testid="textarea-description"
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="unitPrice">Unit Price (৳)</Label>
                  <Input
                    id="unitPrice"
                    type="number"
                    step="0.01"
                    value={formData.unitPrice}
                    onChange={(e) => setFormData({ ...formData, unitPrice: parseFloat(e.target.value) || 0 })}
                    data-testid="input-unit-price"
                  />
                </div>
                <div>
                  <Label htmlFor="stockQuantity">Stock Quantity</Label>
                  <Input
                    id="stockQuantity"
                    type="number"
                    value={formData.stockQuantity}
                    onChange={(e) => setFormData({ ...formData, stockQuantity: parseInt(e.target.value) || 0 })}
                    data-testid="input-stock-quantity"
                  />
                </div>
                <div>
                  <Label htmlFor="minStockLevel">Min Stock Level</Label>
                  <Input
                    id="minStockLevel"
                    type="number"
                    value={formData.minStockLevel}
                    onChange={(e) => setFormData({ ...formData, minStockLevel: parseInt(e.target.value) || 0 })}
                    data-testid="input-min-stock"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="unit">Unit</Label>
                  <Select
                    value={formData.unit}
                    onValueChange={(value) => setFormData({ ...formData, unit: value })}
                  >
                    <SelectTrigger data-testid="select-unit">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pcs">Pieces</SelectItem>
                      <SelectItem value="kg">Kilogram</SelectItem>
                      <SelectItem value="liter">Liter</SelectItem>
                      <SelectItem value="box">Box</SelectItem>
                      <SelectItem value="pack">Pack</SelectItem>
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
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="discontinued">Discontinued</SelectItem>
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
                onClick={handleCreateProduct} 
                disabled={createProductMutation.isPending}
                className="w-full"
                data-testid="button-submit-product"
              >
                {createProductMutation.isPending ? "Adding..." : "Add Product"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="flex items-center p-6">
            <Boxes className="h-8 w-8 text-blue-600 mr-3" />
            <div>
              <p className="text-sm font-medium text-gray-600">Total Products</p>
              <p className="text-2xl font-bold" data-testid="total-products">{totalProducts}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center p-6">
            <TrendingDown className="h-8 w-8 text-yellow-600 mr-3" />
            <div>
              <p className="text-sm font-medium text-gray-600">Low Stock</p>
              <p className="text-2xl font-bold text-yellow-600" data-testid="low-stock-count">{lowStockProducts}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center p-6">
            <AlertTriangle className="h-8 w-8 text-red-600 mr-3" />
            <div>
              <p className="text-sm font-medium text-gray-600">Out of Stock</p>
              <p className="text-2xl font-bold text-red-600" data-testid="out-of-stock-count">{outOfStockProducts}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center p-6">
            <TrendingUp className="h-8 w-8 text-green-600 mr-3" />
            <div>
              <p className="text-sm font-medium text-gray-600">Stock Value</p>
              <p className="text-2xl font-bold text-green-600" data-testid="stock-value">৳{totalStockValue.toFixed(2)}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Products Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="w-5 h-5" />
            Product Inventory
          </CardTitle>
          <CardDescription>
            Current stock levels and product information
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">Loading products...</div>
          ) : products.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No products found. Add your first product to get started.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Unit Price</TableHead>
                    <TableHead>Stock</TableHead>
                    <TableHead>Stock Status</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {products.map((product: FishfireProduct) => {
                    const stockStatus = getStockStatus(product);
                    return (
                      <TableRow key={product.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium" data-testid={`product-name-${product.id}`}>
                              {product.name}
                            </div>
                            {product.description && (
                              <div className="text-sm text-gray-500" data-testid={`product-description-${product.id}`}>
                                {product.description}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell data-testid={`product-sku-${product.id}`}>
                          {product.sku || "-"}
                        </TableCell>
                        <TableCell data-testid={`product-category-${product.id}`}>
                          {product.category}
                        </TableCell>
                        <TableCell data-testid={`product-price-${product.id}`}>
                          ৳{parseFloat(product.unitPrice.toString()).toFixed(2)}
                        </TableCell>
                        <TableCell data-testid={`product-stock-${product.id}`}>
                          {product.stockQuantity} {product.unit}
                          <div className="text-xs text-gray-500">
                            Min: {product.minStockLevel}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={stockStatus.color} data-testid={`stock-status-${product.id}`}>
                            <span className="flex items-center gap-1">
                              {stockStatus.icon}
                              {stockStatus.status}
                            </span>
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className={getStatusColor(product.status)} data-testid={`product-status-${product.id}`}>
                            {product.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Button variant="ghost" size="sm" data-testid={`button-edit-${product.id}`}>
                              <Edit3 className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="sm" data-testid={`button-delete-${product.id}`}>
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function FishfireStockReportPage() {
  return (
    <Sidebar>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4">
        <div className="max-w-7xl mx-auto">
          <StockReport />
        </div>
      </div>
    </Sidebar>
  );
}