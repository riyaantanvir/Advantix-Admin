import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Download, Filter, Building, DollarSign, Calendar, TrendingUp, TrendingDown, BarChart3 } from "lucide-react";
import { formatDistance } from "date-fns";
import { type FinanceProject, type FinancePayment, type FinanceExpense, type Client } from "@shared/schema";

interface ReportData {
  projects: FinanceProject[];
  payments: FinancePayment[];
  expenses: FinanceExpense[];
  clients: Client[];
}

export default function FinanceReports() {
  const [selectedProject, setSelectedProject] = useState<string>("");
  const [selectedClient, setSelectedClient] = useState<string>("");
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");

  // Fetch all data for reports
  const { data: projects } = useQuery<FinanceProject[]>({
    queryKey: ["/api/finance/projects"],
  });

  const { data: payments } = useQuery<FinancePayment[]>({
    queryKey: ["/api/finance/payments"],
  });

  const { data: expenses } = useQuery<FinanceExpense[]>({
    queryKey: ["/api/finance/expenses"],
  });

  const { data: clients } = useQuery<Client[]>({
    queryKey: ["/api/clients"],
  });

  const reportData = useMemo(() => {
    if (!projects || !payments || !expenses || !clients) return null;

    // Apply filters
    let filteredPayments = [...payments];
    let filteredExpenses = [...expenses];
    let filteredProjects = [...projects];

    // Project filter
    if (selectedProject) {
      filteredPayments = filteredPayments.filter(p => p.projectId === selectedProject);
      filteredExpenses = filteredExpenses.filter(e => e.projectId === selectedProject);
      filteredProjects = filteredProjects.filter(p => p.id === selectedProject);
    }

    // Client filter
    if (selectedClient) {
      filteredPayments = filteredPayments.filter(p => p.clientId === selectedClient);
      const clientProjects = projects.filter(p => p.clientId === selectedClient);
      const clientProjectIds = clientProjects.map(p => p.id);
      filteredExpenses = filteredExpenses.filter(e => !e.projectId || clientProjectIds.includes(e.projectId));
      filteredProjects = filteredProjects.filter(p => p.clientId === selectedClient);
    }

    // Date filter
    if (dateFrom) {
      const fromDate = new Date(dateFrom);
      filteredPayments = filteredPayments.filter(p => new Date(p.date) >= fromDate);
      filteredExpenses = filteredExpenses.filter(e => new Date(e.date) >= fromDate);
    }

    if (dateTo) {
      const toDate = new Date(dateTo);
      toDate.setHours(23, 59, 59, 999); // Include full day
      filteredPayments = filteredPayments.filter(p => new Date(p.date) <= toDate);
      filteredExpenses = filteredExpenses.filter(e => new Date(e.date) <= toDate);
    }

    // Calculate totals
    const totalPaymentsUSD = filteredPayments.reduce((sum, p) => sum + parseFloat(p.amount), 0);
    const totalPaymentsBDT = filteredPayments.reduce((sum, p) => sum + parseFloat(p.convertedAmount), 0);
    const totalExpensesBDT = filteredExpenses.filter(e => e.type === "expense").reduce((sum, e) => sum + parseFloat(e.amount), 0);
    const totalSalariesBDT = filteredExpenses.filter(e => e.type === "salary").reduce((sum, e) => sum + parseFloat(e.amount), 0);
    const netBalanceBDT = totalPaymentsBDT - totalExpensesBDT - totalSalariesBDT;

    // Group by project
    const projectSummary = filteredProjects.map(project => {
      const projectPayments = filteredPayments.filter(p => p.projectId === project.id);
      const projectExpenses = filteredExpenses.filter(e => e.projectId === project.id);
      
      const paymentTotal = projectPayments.reduce((sum, p) => sum + parseFloat(p.convertedAmount), 0);
      const expenseTotal = projectExpenses.reduce((sum, e) => sum + parseFloat(e.amount), 0);
      const projectNetBalance = paymentTotal - expenseTotal;

      return {
        project,
        paymentCount: projectPayments.length,
        paymentTotal,
        expenseCount: projectExpenses.length,
        expenseTotal,
        netBalance: projectNetBalance,
        client: clients.find(c => c.id === project.clientId),
      };
    });

    // Group by client
    const clientSummary = clients.map(client => {
      const clientPayments = filteredPayments.filter(p => p.clientId === client.id);
      const clientProjects = filteredProjects.filter(p => p.clientId === client.id);
      const clientProjectIds = clientProjects.map(p => p.id);
      const clientExpenses = filteredExpenses.filter(e => !e.projectId || clientProjectIds.includes(e.projectId));

      const paymentTotal = clientPayments.reduce((sum, p) => sum + parseFloat(p.convertedAmount), 0);
      const expenseTotal = clientExpenses.reduce((sum, e) => sum + parseFloat(e.amount), 0);

      return {
        client,
        projectCount: clientProjects.length,
        paymentCount: clientPayments.length,
        paymentTotal,
        expenseCount: clientExpenses.length,
        expenseTotal,
        netBalance: paymentTotal - expenseTotal,
      };
    }).filter(c => c.paymentCount > 0 || c.expenseCount > 0); // Only show clients with activity

    return {
      summary: {
        totalPaymentsUSD,
        totalPaymentsBDT,
        totalExpensesBDT,
        totalSalariesBDT,
        netBalanceBDT,
        projectCount: filteredProjects.length,
        paymentCount: filteredPayments.length,
        expenseCount: filteredExpenses.length,
      },
      projectSummary,
      clientSummary,
      filteredPayments,
      filteredExpenses,
    };
  }, [projects, payments, expenses, clients, selectedProject, selectedClient, dateFrom, dateTo]);

  const formatCurrency = (amount: number, currency: "USD" | "BDT" = "BDT") => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      minimumFractionDigits: currency === "BDT" ? 0 : 2,
    }).format(amount);
  };

  const clearFilters = () => {
    setSelectedProject("");
    setSelectedClient("");
    setDateFrom("");
    setDateTo("");
  };

  const exportReport = () => {
    // Simple CSV export
    if (!reportData) return;

    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Finance Report Summary\\n\\n";
    csvContent += `Generated on: ${new Date().toLocaleString()}\\n`;
    csvContent += `Filters: Project=${selectedProject || "All"}, Client=${selectedClient || "All"}, Date Range=${dateFrom || "All"} to ${dateTo || "All"}\\n\\n`;
    
    csvContent += "Summary\\n";
    csvContent += `Total Payments (USD),${reportData.summary.totalPaymentsUSD}\\n`;
    csvContent += `Total Payments (BDT),${reportData.summary.totalPaymentsBDT}\\n`;
    csvContent += `Total Expenses (BDT),${reportData.summary.totalExpensesBDT}\\n`;
    csvContent += `Total Salaries (BDT),${reportData.summary.totalSalariesBDT}\\n`;
    csvContent += `Net Balance (BDT),${reportData.summary.netBalanceBDT}\\n\\n`;

    csvContent += "Project Summary\\n";
    csvContent += "Project Name,Client,Payments (BDT),Expenses (BDT),Net Balance (BDT)\\n";
    reportData.projectSummary.forEach(item => {
      csvContent += `"${item.project.name}","${item.client?.clientName || 'Unknown'}",${item.paymentTotal},${item.expenseTotal},${item.netBalance}\\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `finance-report-${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!reportData) {
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
    <div className="container mx-auto p-6 space-y-6" data-testid="page-finance-reports">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Reports</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Financial reports and analytics with filtering options
          </p>
        </div>
        
        <Button onClick={exportReport} data-testid="button-export">
          <Download className="h-4 w-4 mr-2" />
          Export Report
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Report Filters
          </CardTitle>
          <CardDescription>Filter the report data by project, client, or date range</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="space-y-2">
              <Label>Project</Label>
              <Select value={selectedProject} onValueChange={setSelectedProject}>
                <SelectTrigger data-testid="filter-project">
                  <SelectValue placeholder="All Projects" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Projects</SelectItem>
                  {projects?.map((project) => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>Client</Label>
              <Select value={selectedClient} onValueChange={setSelectedClient}>
                <SelectTrigger data-testid="filter-client">
                  <SelectValue placeholder="All Clients" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Clients</SelectItem>
                  {clients?.map((client) => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.clientName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>Date From</Label>
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                data-testid="filter-date-from"
              />
            </div>
            
            <div className="space-y-2">
              <Label>Date To</Label>
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                data-testid="filter-date-to"
              />
            </div>
            
            <div className="space-y-2">
              <Label>&nbsp;</Label>
              <Button variant="outline" onClick={clearFilters} className="w-full">
                Clear Filters
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card className="bg-blue-50 dark:bg-blue-900/10 border-blue-200 dark:border-blue-800">
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-900 dark:text-blue-300">
                {formatCurrency(reportData.summary.totalPaymentsUSD, "USD")}
              </div>
              <div className="text-sm text-blue-700 dark:text-blue-400 mt-1">
                Total Payments (USD)
              </div>
              <div className="text-xs text-blue-600 dark:text-blue-500">
                {reportData.summary.paymentCount} payments
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-800">
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-900 dark:text-green-300">
                {formatCurrency(reportData.summary.totalPaymentsBDT, "BDT")}
              </div>
              <div className="text-sm text-green-700 dark:text-green-400 mt-1">
                Total Payments (BDT)
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-800">
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-red-900 dark:text-red-300">
                {formatCurrency(reportData.summary.totalExpensesBDT, "BDT")}
              </div>
              <div className="text-sm text-red-700 dark:text-red-400 mt-1">
                Total Expenses
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-orange-50 dark:bg-orange-900/10 border-orange-200 dark:border-orange-800">
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-900 dark:text-orange-300">
                {formatCurrency(reportData.summary.totalSalariesBDT, "BDT")}
              </div>
              <div className="text-sm text-orange-700 dark:text-orange-400 mt-1">
                Total Salaries
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className={`border-2 ${reportData.summary.netBalanceBDT >= 0 ? 'bg-emerald-50 dark:bg-emerald-900/10 border-emerald-200 dark:border-emerald-800' : 'bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-800'}`}>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className={`text-2xl font-bold ${reportData.summary.netBalanceBDT >= 0 ? 'text-emerald-900 dark:text-emerald-300' : 'text-red-900 dark:text-red-300'}`}>
                {formatCurrency(reportData.summary.netBalanceBDT, "BDT")}
              </div>
              <div className={`text-sm mt-1 ${reportData.summary.netBalanceBDT >= 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-700 dark:text-red-400'}`}>
                Net Balance
              </div>
              <div className="flex items-center justify-center mt-1">
                {reportData.summary.netBalanceBDT >= 0 ? (
                  <TrendingUp className="h-4 w-4 text-emerald-600" />
                ) : (
                  <TrendingDown className="h-4 w-4 text-red-600" />
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Project Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Project Summary
          </CardTitle>
          <CardDescription>Financial breakdown by project</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Project Name</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Payments</TableHead>
                <TableHead>Expenses</TableHead>
                <TableHead>Net Balance</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {reportData.projectSummary.map((item) => (
                <TableRow key={item.project.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Building className="h-4 w-4 text-gray-500" />
                      <div>
                        <div className="font-medium">{item.project.name}</div>
                        <Badge variant={item.project.status === "active" ? "default" : "secondary"} className="mt-1">
                          {item.project.status}
                        </Badge>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>{item.client?.clientName || "Unknown"}</TableCell>
                  <TableCell>
                    <div className="text-green-600">
                      <div className="font-medium">{formatCurrency(item.paymentTotal, "BDT")}</div>
                      <div className="text-xs">{item.paymentCount} payments</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-red-600">
                      <div className="font-medium">{formatCurrency(item.expenseTotal, "BDT")}</div>
                      <div className="text-xs">{item.expenseCount} expenses</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className={`font-medium ${item.netBalance >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                      {formatCurrency(item.netBalance, "BDT")}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {reportData.projectSummary.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              No project data available for the selected filters.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Client Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Client Summary</CardTitle>
          <CardDescription>Financial breakdown by client</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Client Name</TableHead>
                <TableHead>Projects</TableHead>
                <TableHead>Payments</TableHead>
                <TableHead>Expenses</TableHead>
                <TableHead>Net Balance</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {reportData.clientSummary.map((item) => (
                <TableRow key={item.client.id}>
                  <TableCell>
                    <div className="font-medium">{item.client.clientName}</div>
                    <div className="text-sm text-gray-500">{item.client.businessName}</div>
                  </TableCell>
                  <TableCell>
                    <div className="text-blue-600">
                      <div className="font-medium">{item.projectCount}</div>
                      <div className="text-xs">projects</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-green-600">
                      <div className="font-medium">{formatCurrency(item.paymentTotal, "BDT")}</div>
                      <div className="text-xs">{item.paymentCount} payments</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-red-600">
                      <div className="font-medium">{formatCurrency(item.expenseTotal, "BDT")}</div>
                      <div className="text-xs">{item.expenseCount} expenses</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className={`font-medium ${item.netBalance >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                      {formatCurrency(item.netBalance, "BDT")}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {reportData.clientSummary.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              No client data available for the selected filters.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}