import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Sidebar from "@/components/layout/Sidebar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Calendar, TrendingUp, TrendingDown, DollarSign, ShoppingCart, CreditCard, Clock, CheckCircle, XCircle } from "lucide-react";
import type { FishfireDailyOrder } from "@shared/schema";

function DailyOrder() {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  const { data: dailyOrders = [], isLoading } = useQuery({
    queryKey: ["/api/fishfire/daily-orders"],
  });

  const { data: todayOrders = [], isLoading: loadingToday } = useQuery({
    queryKey: ["/api/fishfire/daily-orders", selectedDate],
  });

  // Get today's summary or create empty one
  const todaySummary = dailyOrders.find((order: FishfireDailyOrder) => 
    new Date(order.date).toDateString() === new Date(selectedDate).toDateString()
  ) || {
    totalOrders: 0,
    totalAmount: 0,
    totalDiscount: 0,
    netAmount: 0,
    cashOrders: 0,
    cardOrders: 0,
    onlineOrders: 0,
    creditOrders: 0,
    completedOrders: 0,
    pendingOrders: 0,
    cancelledOrders: 0
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Calendar className="w-8 h-8" />
            Daily Order Report
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            View daily order summaries and performance metrics
          </p>
        </div>

        <div className="flex items-center gap-4">
          <label htmlFor="dateSelect" className="text-sm font-medium">
            Select Date:
          </label>
          <input
            id="dateSelect"
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            data-testid="input-date-select"
          />
        </div>
      </div>

      {/* Today's Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="flex items-center p-6">
            <ShoppingCart className="h-8 w-8 text-blue-600 mr-3" />
            <div>
              <p className="text-sm font-medium text-gray-600">Total Orders</p>
              <p className="text-2xl font-bold" data-testid="total-orders">{todaySummary.totalOrders}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center p-6">
            <DollarSign className="h-8 w-8 text-green-600 mr-3" />
            <div>
              <p className="text-sm font-medium text-gray-600">Net Amount</p>
              <p className="text-2xl font-bold text-green-600" data-testid="net-amount">
                ৳{parseFloat(todaySummary.netAmount.toString()).toFixed(2)}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center p-6">
            <CheckCircle className="h-8 w-8 text-green-600 mr-3" />
            <div>
              <p className="text-sm font-medium text-gray-600">Completed</p>
              <p className="text-2xl font-bold text-green-600" data-testid="completed-orders">{todaySummary.completedOrders}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center p-6">
            <Clock className="h-8 w-8 text-yellow-600 mr-3" />
            <div>
              <p className="text-sm font-medium text-gray-600">Pending</p>
              <p className="text-2xl font-bold text-yellow-600" data-testid="pending-orders">{todaySummary.pendingOrders}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Payment Method Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="w-5 h-5" />
              Payment Methods
            </CardTitle>
            <CardDescription>
              Today's orders by payment method
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Cash Orders</span>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" data-testid="cash-orders">{todaySummary.cashOrders}</Badge>
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Card Orders</span>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" data-testid="card-orders">{todaySummary.cardOrders}</Badge>
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Online Orders</span>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" data-testid="online-orders">{todaySummary.onlineOrders}</Badge>
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Credit Orders</span>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" data-testid="credit-orders">{todaySummary.creditOrders}</Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Order Status
            </CardTitle>
            <CardDescription>
              Today's order completion status
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  Completed
                </span>
                <Badge className="bg-green-100 text-green-800" data-testid="status-completed">
                  {todaySummary.completedOrders}
                </Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium flex items-center gap-2">
                  <Clock className="w-4 h-4 text-yellow-600" />
                  Pending
                </span>
                <Badge className="bg-yellow-100 text-yellow-800" data-testid="status-pending">
                  {todaySummary.pendingOrders}
                </Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium flex items-center gap-2">
                  <XCircle className="w-4 h-4 text-red-600" />
                  Cancelled
                </span>
                <Badge className="bg-red-100 text-red-800" data-testid="status-cancelled">
                  {todaySummary.cancelledOrders}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Financial Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="w-5 h-5" />
            Financial Summary - {new Date(selectedDate).toLocaleDateString()}
          </CardTitle>
          <CardDescription>
            Revenue and discount breakdown for the selected date
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <h3 className="text-lg font-semibold text-blue-900">Total Amount</h3>
              <p className="text-2xl font-bold text-blue-600" data-testid="total-amount">
                ৳{parseFloat(todaySummary.totalAmount.toString()).toFixed(2)}
              </p>
            </div>
            <div className="text-center p-4 bg-red-50 rounded-lg">
              <h3 className="text-lg font-semibold text-red-900">Total Discount</h3>
              <p className="text-2xl font-bold text-red-600" data-testid="total-discount">
                ৳{parseFloat(todaySummary.totalDiscount.toString()).toFixed(2)}
              </p>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <h3 className="text-lg font-semibold text-green-900">Net Revenue</h3>
              <p className="text-2xl font-bold text-green-600" data-testid="net-revenue">
                ৳{parseFloat(todaySummary.netAmount.toString()).toFixed(2)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Historical Daily Orders Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Historical Daily Summaries
          </CardTitle>
          <CardDescription>
            Previous days' order summaries and performance
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">Loading daily summaries...</div>
          ) : dailyOrders.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No daily summaries found. Order data will appear here as orders are processed.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Orders</TableHead>
                    <TableHead>Revenue</TableHead>
                    <TableHead>Discount</TableHead>
                    <TableHead>Net Amount</TableHead>
                    <TableHead>Completed</TableHead>
                    <TableHead>Pending</TableHead>
                    <TableHead>Cancelled</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dailyOrders
                    .sort((a: FishfireDailyOrder, b: FishfireDailyOrder) => 
                      new Date(b.date).getTime() - new Date(a.date).getTime()
                    )
                    .map((order: FishfireDailyOrder) => (
                    <TableRow key={order.id}>
                      <TableCell className="font-medium" data-testid={`date-${order.id}`}>
                        {new Date(order.date).toLocaleDateString()}
                      </TableCell>
                      <TableCell data-testid={`orders-${order.id}`}>
                        {order.totalOrders}
                      </TableCell>
                      <TableCell data-testid={`revenue-${order.id}`}>
                        ৳{parseFloat(order.totalAmount.toString()).toFixed(2)}
                      </TableCell>
                      <TableCell data-testid={`discount-${order.id}`}>
                        ৳{parseFloat(order.totalDiscount.toString()).toFixed(2)}
                      </TableCell>
                      <TableCell className="font-medium text-green-600" data-testid={`net-${order.id}`}>
                        ৳{parseFloat(order.netAmount.toString()).toFixed(2)}
                      </TableCell>
                      <TableCell>
                        <Badge className="bg-green-100 text-green-800" data-testid={`completed-${order.id}`}>
                          {order.completedOrders}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className="bg-yellow-100 text-yellow-800" data-testid={`pending-${order.id}`}>
                          {order.pendingOrders}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className="bg-red-100 text-red-800" data-testid={`cancelled-${order.id}`}>
                          {order.cancelledOrders}
                        </Badge>
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

export default function FishfireDailyOrderPage() {
  return (
    <Sidebar>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4">
        <div className="max-w-7xl mx-auto">
          <DailyOrder />
        </div>
      </div>
    </Sidebar>
  );
}