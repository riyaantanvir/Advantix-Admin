import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Sidebar from "@/components/layout/Sidebar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { TrendingDown, DollarSign, Calendar, CreditCard, Building, Truck, Zap, Home, Megaphone, Package } from "lucide-react";
import type { FishfireDailyExpense } from "@shared/schema";

function DailyExpense() {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  const { data: dailyExpenses = [], isLoading } = useQuery({
    queryKey: ["/api/fishfire/daily-expenses"],
  });

  // Get today's summary or create empty one
  const todaySummary = dailyExpenses.find((expense: FishfireDailyExpense) => 
    new Date(expense.date).toDateString() === new Date(selectedDate).toDateString()
  ) || {
    totalExpenses: 0,
    totalTransactions: 0,
    cashExpenses: 0,
    bankExpenses: 0,
    cardExpenses: 0,
    suppliesExpenses: 0,
    utilitiesExpenses: 0,
    rentExpenses: 0,
    marketingExpenses: 0,
    transportationExpenses: 0,
    otherExpenses: 0
  };

  const expenseCategories = [
    { 
      key: 'suppliesExpenses', 
      label: 'Supplies', 
      icon: <Package className="w-4 h-4" />, 
      color: 'bg-blue-100 text-blue-800',
      value: todaySummary.suppliesExpenses 
    },
    { 
      key: 'utilitiesExpenses', 
      label: 'Utilities', 
      icon: <Zap className="w-4 h-4" />, 
      color: 'bg-green-100 text-green-800',
      value: todaySummary.utilitiesExpenses 
    },
    { 
      key: 'rentExpenses', 
      label: 'Rent', 
      icon: <Home className="w-4 h-4" />, 
      color: 'bg-purple-100 text-purple-800',
      value: todaySummary.rentExpenses 
    },
    { 
      key: 'marketingExpenses', 
      label: 'Marketing', 
      icon: <Megaphone className="w-4 h-4" />, 
      color: 'bg-pink-100 text-pink-800',
      value: todaySummary.marketingExpenses 
    },
    { 
      key: 'transportationExpenses', 
      label: 'Transportation', 
      icon: <Truck className="w-4 h-4" />, 
      color: 'bg-orange-100 text-orange-800',
      value: todaySummary.transportationExpenses 
    },
    { 
      key: 'otherExpenses', 
      label: 'Other', 
      icon: <Building className="w-4 h-4" />, 
      color: 'bg-gray-100 text-gray-800',
      value: todaySummary.otherExpenses 
    }
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <TrendingDown className="w-8 h-8" />
            Daily Expense Report
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            View daily expense summaries and spending analysis
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
            <DollarSign className="h-8 w-8 text-red-600 mr-3" />
            <div>
              <p className="text-sm font-medium text-gray-600">Total Expenses</p>
              <p className="text-2xl font-bold text-red-600" data-testid="total-expenses">
                ৳{parseFloat(todaySummary.totalExpenses.toString()).toFixed(2)}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center p-6">
            <Building className="h-8 w-8 text-blue-600 mr-3" />
            <div>
              <p className="text-sm font-medium text-gray-600">Transactions</p>
              <p className="text-2xl font-bold" data-testid="total-transactions">{todaySummary.totalTransactions}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center p-6">
            <CreditCard className="h-8 w-8 text-green-600 mr-3" />
            <div>
              <p className="text-sm font-medium text-gray-600">Cash Expenses</p>
              <p className="text-2xl font-bold text-green-600" data-testid="cash-expenses">
                ৳{parseFloat(todaySummary.cashExpenses.toString()).toFixed(2)}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center p-6">
            <Calendar className="h-8 w-8 text-purple-600 mr-3" />
            <div>
              <p className="text-sm font-medium text-gray-600">Bank Expenses</p>
              <p className="text-2xl font-bold text-purple-600" data-testid="bank-expenses">
                ৳{parseFloat(todaySummary.bankExpenses.toString()).toFixed(2)}
              </p>
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
              Today's expenses by payment method
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Cash Payments</span>
                <div className="flex items-center gap-2">
                  <Badge className="bg-green-100 text-green-800" data-testid="cash-payment-amount">
                    ৳{parseFloat(todaySummary.cashExpenses.toString()).toFixed(2)}
                  </Badge>
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Bank Transfers</span>
                <div className="flex items-center gap-2">
                  <Badge className="bg-blue-100 text-blue-800" data-testid="bank-payment-amount">
                    ৳{parseFloat(todaySummary.bankExpenses.toString()).toFixed(2)}
                  </Badge>
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Card Payments</span>
                <div className="flex items-center gap-2">
                  <Badge className="bg-purple-100 text-purple-800" data-testid="card-payment-amount">
                    ৳{parseFloat(todaySummary.cardExpenses.toString()).toFixed(2)}
                  </Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building className="w-5 h-5" />
              Expense Categories
            </CardTitle>
            <CardDescription>
              Today's expenses by category
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {expenseCategories.map((category) => (
                <div key={category.key} className="flex justify-between items-center">
                  <span className="text-sm font-medium flex items-center gap-2">
                    {category.icon}
                    {category.label}
                  </span>
                  <Badge className={category.color} data-testid={`${category.key}-amount`}>
                    ৳{parseFloat(category.value.toString()).toFixed(2)}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Expense Breakdown Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="w-5 h-5" />
            Expense Breakdown - {new Date(selectedDate).toLocaleDateString()}
          </CardTitle>
          <CardDescription>
            Visual breakdown of expenses by category
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {expenseCategories.map((category) => {
              const percentage = todaySummary.totalExpenses > 0 
                ? (parseFloat(category.value.toString()) / parseFloat(todaySummary.totalExpenses.toString()) * 100)
                : 0;
              
              return (
                <div key={category.key} className="text-center p-4 bg-gray-50 rounded-lg">
                  <div className="flex justify-center mb-2">
                    {category.icon}
                  </div>
                  <h3 className="text-sm font-semibold text-gray-900">{category.label}</h3>
                  <p className="text-lg font-bold text-gray-600" data-testid={`${category.key}-breakdown`}>
                    ৳{parseFloat(category.value.toString()).toFixed(2)}
                  </p>
                  <p className="text-xs text-gray-500">
                    {percentage.toFixed(1)}%
                  </p>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Historical Daily Expenses Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Historical Daily Expenses
          </CardTitle>
          <CardDescription>
            Previous days' expense summaries and spending patterns
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">Loading daily expense summaries...</div>
          ) : dailyExpenses.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No daily expense summaries found. Expense data will appear here as expenses are recorded.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Total Expenses</TableHead>
                    <TableHead>Transactions</TableHead>
                    <TableHead>Cash</TableHead>
                    <TableHead>Bank</TableHead>
                    <TableHead>Card</TableHead>
                    <TableHead>Top Category</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dailyExpenses
                    .sort((a: FishfireDailyExpense, b: FishfireDailyExpense) => 
                      new Date(b.date).getTime() - new Date(a.date).getTime()
                    )
                    .map((expense: FishfireDailyExpense) => {
                      // Find the highest category expense
                      const topCategory = expenseCategories.reduce((prev, current) => {
                        const prevValue = parseFloat(expense[prev.key as keyof FishfireDailyExpense]?.toString() || '0');
                        const currentValue = parseFloat(expense[current.key as keyof FishfireDailyExpense]?.toString() || '0');
                        return prevValue > currentValue ? prev : current;
                      });

                      return (
                        <TableRow key={expense.id}>
                          <TableCell className="font-medium" data-testid={`date-${expense.id}`}>
                            {new Date(expense.date).toLocaleDateString()}
                          </TableCell>
                          <TableCell className="font-medium text-red-600" data-testid={`total-${expense.id}`}>
                            ৳{parseFloat(expense.totalExpenses.toString()).toFixed(2)}
                          </TableCell>
                          <TableCell data-testid={`transactions-${expense.id}`}>
                            {expense.totalTransactions}
                          </TableCell>
                          <TableCell data-testid={`cash-${expense.id}`}>
                            ৳{parseFloat(expense.cashExpenses.toString()).toFixed(2)}
                          </TableCell>
                          <TableCell data-testid={`bank-${expense.id}`}>
                            ৳{parseFloat(expense.bankExpenses.toString()).toFixed(2)}
                          </TableCell>
                          <TableCell data-testid={`card-${expense.id}`}>
                            ৳{parseFloat(expense.cardExpenses.toString()).toFixed(2)}
                          </TableCell>
                          <TableCell>
                            <Badge className={topCategory.color} data-testid={`top-category-${expense.id}`}>
                              {topCategory.label}
                            </Badge>
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

export default function FishfireDailyExpensePage() {
  return (
    <Sidebar>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4">
        <div className="max-w-7xl mx-auto">
          <DailyExpense />
        </div>
      </div>
    </Sidebar>
  );
}