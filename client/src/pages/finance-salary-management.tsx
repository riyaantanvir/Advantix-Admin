import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Plus, Edit, Trash2, DollarSign, Calendar, User, Clock, RefreshCw, Filter, Calculator, Receipt, CreditCard } from "lucide-react";
import { type User as UserType } from "@shared/schema";
import Sidebar from "@/components/layout/Sidebar";
import { GenerateSalaryDialog } from "@/components/GenerateSalaryDialog";

interface SalaryFormData {
  employeeId: string; // Actually userId, keeping name for backend compatibility
  employeeName: string;
  basicSalary: number;
  contractualHours: number;
  actualWorkingHours: number;
  
  // Bonus
  festivalBonus: number;
  performanceBonus: number;
  otherBonus: number;
  
  paymentMethod: 'cash' | 'bank_transfer' | 'mobile_banking';
  paymentStatus: 'paid' | 'unpaid';
  remarks?: string;
  month: string;
}

interface SalaryRecord extends SalaryFormData {
  id: string;
  hourlyRate: number;
  basePayment: number;
  totalBonus: number;
  grossPayment: number;
  finalPayment: number;
  createdAt: string;
  updatedAt: string;
}

export default function FinanceSalaryManagement() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isGenerateDialogOpen, setIsGenerateDialogOpen] = useState(false);
  const [editingSalary, setEditingSalary] = useState<SalaryRecord | null>(null);
  const [filterMonth, setFilterMonth] = useState("");
  const [filterEmployee, setFilterEmployee] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Form state
  const [formData, setFormData] = useState<SalaryFormData>({
    employeeId: "",
    employeeName: "",
    basicSalary: 0,
    contractualHours: 160, // Default: 8 hours * 20 working days
    actualWorkingHours: 0,
    festivalBonus: 0,
    performanceBonus: 0,
    otherBonus: 0,
    paymentMethod: 'bank_transfer',
    paymentStatus: 'unpaid',
    remarks: '',
    month: new Date().toISOString().slice(0, 7), // YYYY-MM format
  });

  // Calculated values
  const [calculations, setCalculations] = useState({
    hourlyRate: 0,
    basePayment: 0,
    totalBonus: 0,
    grossPayment: 0,
    finalPayment: 0,
  });

  // Auto-calculate derived values whenever relevant fields change
  useEffect(() => {
    const hourlyRate = formData.contractualHours > 0 ? formData.basicSalary / formData.contractualHours : 0;
    const basePayment = formData.actualWorkingHours * hourlyRate;
    const totalBonus = formData.festivalBonus + formData.performanceBonus + formData.otherBonus;
    const grossPayment = basePayment + totalBonus;
    const finalPayment = grossPayment;

    setCalculations({
      hourlyRate,
      basePayment,
      totalBonus,
      grossPayment,
      finalPayment,
    });
  }, [
    formData.basicSalary,
    formData.contractualHours,
    formData.actualWorkingHours,
    formData.festivalBonus,
    formData.performanceBonus,
    formData.otherBonus,
  ]);


  // Fetch salary records
  const { data: salaries = [], isLoading: salariesLoading, refetch: refetchSalaries } = useQuery({
    queryKey: ["/api/salaries"],
    select: (data: any) => data || [],
  });

  // Fetch users for the dropdown
  const { data: users = [] } = useQuery({
    queryKey: ["/api/users"],
    select: (data: any) => data || [],
  });

  // Fetch user work reports to calculate total hours
  const { data: workReports = [] } = useQuery({
    queryKey: ["/api/work-reports"],
    select: (data: any) => data || [],
  });

  // Auto-sync work hours when work reports data becomes available or employee changes
  useEffect(() => {
    if (formData.employeeId && workReports.length > 0) {
      // Calculate total work hours for the currently selected user
      const userWorkReports = workReports.filter((report: any) => report.userId === formData.employeeId);
      const totalWorkHours = userWorkReports.reduce((sum: number, report: any) => {
        const hours = parseFloat(report.hoursWorked) || 0;
        return sum + hours;
      }, 0);

      // Only update if the calculated hours differ from current value
      if (totalWorkHours !== formData.actualWorkingHours) {
        setFormData(prev => ({
          ...prev,
          actualWorkingHours: totalWorkHours,
        }));

        // Show toast notification for user feedback
        if (totalWorkHours > 0) {
          toast({
            title: "Hours Auto-Synced",
            description: `Updated to ${totalWorkHours.toFixed(2)} hours from ${userWorkReports.length} work reports`,
          });
        }
      }
    }
  }, [workReports, formData.employeeId, formData.actualWorkingHours, toast]);

  // Fetch salary statistics
  const { data: salaryStats, isLoading: statsLoading } = useQuery({
    queryKey: ["/api/salaries/stats"],
    select: (data: any) => data || {},
    refetchInterval: 30000, // Auto-refresh every 30 seconds for live sync
  });

  // Create salary mutation
  const createSalaryMutation = useMutation({
    mutationFn: async (data: SalaryFormData & typeof calculations) => {
      const response = await apiRequest("POST", "/api/salaries", data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Salary record created successfully",
      });
      setIsCreateDialogOpen(false);
      resetForm();
      queryClient.invalidateQueries({ queryKey: ["/api/salaries"] });
      queryClient.invalidateQueries({ queryKey: ["/api/salaries/stats"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create salary record",
        variant: "destructive",
      });
    },
  });

  // Update salary mutation
  const updateSalaryMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: SalaryFormData & typeof calculations }) => {
      const response = await apiRequest("PUT", `/api/salaries/${id}`, data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Salary record updated successfully",
      });
      setEditingSalary(null);
      resetForm();
      queryClient.invalidateQueries({ queryKey: ["/api/salaries"] });
      queryClient.invalidateQueries({ queryKey: ["/api/salaries/stats"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update salary record",
        variant: "destructive",
      });
    },
  });

  // Delete salary mutation
  const deleteSalaryMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/salaries/${id}`);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Salary record deleted successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/salaries"] });
      queryClient.invalidateQueries({ queryKey: ["/api/salaries/stats"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete salary record",
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setFormData({
      employeeId: "",
      employeeName: "",
      basicSalary: 0,
      contractualHours: 160,
      actualWorkingHours: 0,
      festivalBonus: 0,
      performanceBonus: 0,
      otherBonus: 0,
      paymentMethod: 'bank_transfer',
      paymentStatus: 'unpaid',
      remarks: '',
      month: new Date().toISOString().slice(0, 7),
    });
  };

  const handleCreateSalary = () => {
    if (!formData.employeeId || !formData.basicSalary || !formData.contractualHours) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    // Validate calculations are not NaN
    if (isNaN(calculations.finalPayment) || isNaN(calculations.grossPayment) || isNaN(calculations.hourlyRate)) {
      toast({
        title: "Calculation Error",
        description: "Invalid calculation values detected. Please check your input.",
        variant: "destructive",
      });
      return;
    }

    const salaryData = { ...formData, ...calculations };
    createSalaryMutation.mutate(salaryData);
  };

  const handleUpdateSalary = () => {
    if (!editingSalary) return;
    
    if (!formData.employeeId || !formData.basicSalary || !formData.contractualHours) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    // Validate calculations are not NaN
    if (isNaN(calculations.finalPayment) || isNaN(calculations.grossPayment) || isNaN(calculations.hourlyRate)) {
      toast({
        title: "Calculation Error",
        description: "Invalid calculation values detected. Please check your input.",
        variant: "destructive",
      });
      return;
    }
    
    const salaryData = { ...formData, ...calculations };
    updateSalaryMutation.mutate({ id: editingSalary.id, data: salaryData });
  };

  const handleEditSalary = (salary: SalaryRecord) => {
    setEditingSalary(salary);
    // Convert all string numbers to actual numbers to fix calculation issues
    setFormData({
      employeeId: salary.employeeId,
      employeeName: salary.employeeName,
      basicSalary: typeof salary.basicSalary === 'string' ? parseFloat(salary.basicSalary) : salary.basicSalary,
      contractualHours: typeof salary.contractualHours === 'string' ? parseInt(salary.contractualHours) : salary.contractualHours,
      actualWorkingHours: typeof salary.actualWorkingHours === 'string' ? parseFloat(salary.actualWorkingHours) : salary.actualWorkingHours,
      festivalBonus: typeof salary.festivalBonus === 'string' ? parseFloat(salary.festivalBonus) : salary.festivalBonus,
      performanceBonus: typeof salary.performanceBonus === 'string' ? parseFloat(salary.performanceBonus) : salary.performanceBonus,
      otherBonus: typeof salary.otherBonus === 'string' ? parseFloat(salary.otherBonus) : salary.otherBonus,
      paymentMethod: salary.paymentMethod,
      paymentStatus: salary.paymentStatus,
      remarks: salary.remarks || '',
      month: salary.month,
    });
  };

  const handleUserChange = (userId: string) => {
    const selectedUser = users.find((u: UserType) => u.id === userId);
    if (selectedUser) {
      // Set basic user info immediately - hours will be auto-synced by useEffect
      setFormData(prev => ({
        ...prev,
        employeeId: userId, // Using userId for employeeId
        employeeName: selectedUser.name || selectedUser.username,
        actualWorkingHours: 0, // Will be updated by useEffect when workReports are available
      }));
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-BD', {
      style: 'currency',
      currency: 'BDT',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Filter salaries based on selected filters
  const filteredSalaries = salaries.filter((salary: SalaryRecord) => {
    if (filterMonth && salary.month !== filterMonth) return false;
    if (filterEmployee && filterEmployee !== 'all' && salary.employeeId !== filterEmployee) return false;
    if (filterStatus && filterStatus !== 'all' && salary.paymentStatus !== filterStatus) return false;
    return true;
  });

  return (
    <Sidebar>
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Salary Management</h1>
            <p className="text-muted-foreground">
              Manage employee salary records with automatic calculations
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetchSalaries()}
              disabled={salariesLoading}
              data-testid="button-refresh-salaries"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${salariesLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={() => setIsGenerateDialogOpen(true)}
              data-testid="button-open-generate-salary"
            >
              <Calculator className="h-4 w-4 mr-2" />
              Generate Salary
            </Button>
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button data-testid="button-create-salary">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Salary Record
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Add Salary Record</DialogTitle>
                  <DialogDescription>
                    Create a salary record with automatic calculations
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-6">
                  {/* Employee and Basic Info */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="employee">User Name *</Label>
                      <Select onValueChange={handleUserChange} data-testid="select-employee">
                        <SelectTrigger>
                          <SelectValue placeholder="Select user" />
                        </SelectTrigger>
                        <SelectContent>
                          {users.map((user: UserType) => (
                            <SelectItem key={user.id} value={user.id}>
                              {user.name || user.username}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="month">Month *</Label>
                      <Input
                        type="month"
                        value={formData.month}
                        onChange={(e) => setFormData(prev => ({ ...prev, month: e.target.value }))}
                        data-testid="input-month"
                      />
                    </div>
                  </div>

                  {/* Basic Salary Information */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Basic Salary Information</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="basicSalary">Basic Salary (BDT) *</Label>
                          <Input
                            type="number"
                            value={formData.basicSalary > 0 ? formData.basicSalary : ''}
                            onChange={(e) => setFormData(prev => ({ ...prev, basicSalary: parseFloat(e.target.value) || 0 }))}
                            placeholder="50000"
                            data-testid="input-basic-salary"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="contractualHours">Contractual Hours (Per Month) *</Label>
                          <Input
                            type="number"
                            value={formData.contractualHours > 0 ? formData.contractualHours : ''}
                            onChange={(e) => setFormData(prev => ({ ...prev, contractualHours: parseInt(e.target.value) || 0 }))}
                            placeholder="160"
                            data-testid="input-contractual-hours"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="actualWorkingHours">Actual Working Hours (Auto-filled from reports) *</Label>
                          <Input
                            type="number"
                            step="0.1"
                            value={formData.actualWorkingHours > 0 ? formData.actualWorkingHours : ''}
                            onChange={(e) => setFormData(prev => ({ ...prev, actualWorkingHours: parseFloat(e.target.value) || 0 }))}
                            placeholder="150"
                            data-testid="input-actual-hours"
                          />
                        </div>
                      </div>
                      <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <Calculator className="h-4 w-4" />
                          <span className="font-medium">Auto-Calculated Values</span>
                        </div>
                        <div className="grid grid-cols-3 gap-4 text-sm">
                          <div>Per Hour Rate: <span className="font-medium">{formatCurrency(calculations.hourlyRate)}</span></div>
                          <div>Base Payment: <span className="font-medium">{formatCurrency(calculations.basePayment)}</span></div>
                          <div>Final Payment: <span className="font-bold text-green-600">{formatCurrency(calculations.finalPayment)}</span></div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Bonus */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Bonus</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="festivalBonus">Festival (BDT)</Label>
                          <Input
                            type="number"
                            value={formData.festivalBonus > 0 ? formData.festivalBonus : ''}
                            onChange={(e) => setFormData(prev => ({ ...prev, festivalBonus: parseFloat(e.target.value) || 0 }))}
                            placeholder="10000"
                            data-testid="input-festival-bonus"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="performanceBonus">Performance (BDT)</Label>
                          <Input
                            type="number"
                            value={formData.performanceBonus > 0 ? formData.performanceBonus : ''}
                            onChange={(e) => setFormData(prev => ({ ...prev, performanceBonus: parseFloat(e.target.value) || 0 }))}
                            placeholder="5000"
                            data-testid="input-performance-bonus"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="otherBonus">Other (BDT)</Label>
                          <Input
                            type="number"
                            value={formData.otherBonus > 0 ? formData.otherBonus : ''}
                            onChange={(e) => setFormData(prev => ({ ...prev, otherBonus: parseFloat(e.target.value) || 0 }))}
                            placeholder="3000"
                            data-testid="input-other-bonus"
                          />
                        </div>
                      </div>
                      <div className="mt-2 text-sm text-muted-foreground">
                        Total Bonus: <span className="font-medium">{formatCurrency(calculations.totalBonus)}</span>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Payment Information */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Payment Information</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="paymentMethod">Payment Method</Label>
                          <Select 
                            value={formData.paymentMethod} 
                            onValueChange={(value: 'cash' | 'bank_transfer' | 'mobile_banking') => 
                              setFormData(prev => ({ ...prev, paymentMethod: value }))} 
                            data-testid="select-payment-method"
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="cash">Cash</SelectItem>
                              <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                              <SelectItem value="mobile_banking">Mobile Banking</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="paymentStatus">Payment Status</Label>
                          <Select 
                            value={formData.paymentStatus} 
                            onValueChange={(value: 'paid' | 'unpaid') => 
                              setFormData(prev => ({ ...prev, paymentStatus: value }))} 
                            data-testid="select-payment-status"
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="unpaid">Unpaid</SelectItem>
                              <SelectItem value="paid">Paid</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="space-y-2 mt-4">
                        <Label htmlFor="remarks">Remarks</Label>
                        <Input
                          value={formData.remarks}
                          onChange={(e) => setFormData(prev => ({ ...prev, remarks: e.target.value }))}
                          placeholder="Additional notes or comments"
                          data-testid="input-remarks"
                        />
                      </div>
                    </CardContent>
                  </Card>

                  <div className="flex justify-end gap-2 pt-4">
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => setIsCreateDialogOpen(false)}
                      data-testid="button-cancel-create"
                    >
                      Cancel
                    </Button>
                    <Button 
                      onClick={handleCreateSalary}
                      disabled={createSalaryMutation.isPending}
                      data-testid="button-submit-create"
                    >
                      {createSalaryMutation.isPending ? "Creating..." : "Create Salary Record"}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Dashboard Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Pending</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {statsLoading ? '...' : formatCurrency(Number(salaryStats?.totalPendingAmount) || 0)}
              </div>
              <p className="text-xs text-muted-foreground">
                {statsLoading ? '...' : `${Number(salaryStats?.unpaidSalaries) || 0} unpaid records`}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Paid</CardTitle>
              <Receipt className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {statsLoading ? '...' : formatCurrency(Number(salaryStats?.totalPaidAmount) || 0)}
              </div>
              <p className="text-xs text-muted-foreground">
                {statsLoading ? '...' : `${Number(salaryStats?.paidSalaries) || 0} paid records`}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Work Hours Sync</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {statsLoading ? '...' : (Number(salaryStats?.totalWorkHours) || 0).toFixed(1)}h
              </div>
              <p className="text-xs text-muted-foreground">
                {statsLoading ? '...' : `Salary: ${(Number(salaryStats?.totalSalaryHours) || 0).toFixed(1)}h`}
              </p>
              {!statsLoading && salaryStats?.hoursDifference !== undefined && salaryStats?.hoursDifference !== null && Number(salaryStats?.hoursDifference) !== 0 && (
                <p className={`text-xs ${(Number(salaryStats?.hoursDifference) || 0) > 0 ? 'text-orange-600' : 'text-blue-600'}`}>
                  {(Number(salaryStats?.hoursDifference) || 0) > 0 ? '+' : ''}{(Number(salaryStats?.hoursDifference) || 0).toFixed(1)}h difference
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Payment Rate</CardTitle>
              <CreditCard className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {statsLoading ? '...' : `${(Number(salaryStats?.paymentRate) || 0).toFixed(1)}%`}
              </div>
              <p className="text-xs text-muted-foreground">
                {statsLoading ? '...' : `Avg: ${formatCurrency(Number(salaryStats?.averageSalary) || 0)}`}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Filter className="h-5 w-5" />
              Filters
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label>Filter by Month</Label>
                <Input
                  type="month"
                  value={filterMonth}
                  onChange={(e) => setFilterMonth(e.target.value)}
                  data-testid="filter-month"
                />
              </div>
              <div className="space-y-2">
                <Label>Filter by User</Label>
                <Select value={filterEmployee} onValueChange={setFilterEmployee} data-testid="filter-employee">
                  <SelectTrigger>
                    <SelectValue placeholder="All users" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All users</SelectItem>
                    {users.map((user: UserType) => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.name || user.username}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Filter by Status</Label>
                <Select value={filterStatus} onValueChange={setFilterStatus} data-testid="filter-status">
                  <SelectTrigger>
                    <SelectValue placeholder="All statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All statuses</SelectItem>
                    <SelectItem value="paid">Paid</SelectItem>
                    <SelectItem value="unpaid">Unpaid</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>&nbsp;</Label>
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setFilterMonth("");
                    setFilterEmployee("all");
                    setFilterStatus("all");
                  }}
                  data-testid="button-clear-filters"
                >
                  Clear Filters
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Salary Records Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5" />
              Salary Records ({filteredSalaries.length})
            </CardTitle>
            <CardDescription>
              Salary records with automatic calculations
            </CardDescription>
          </CardHeader>
          <CardContent>
            {salariesLoading ? (
              <div className="flex items-center justify-center h-32">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <span className="ml-2 text-gray-600">Loading salary records...</span>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Month</TableHead>
                      <TableHead>Basic Salary</TableHead>
                      <TableHead>Contract Hrs</TableHead>
                      <TableHead>Actual Hrs</TableHead>
                      <TableHead>Hourly Rate</TableHead>
                      <TableHead>Base Payment</TableHead>
                      <TableHead>Bonus</TableHead>
                      <TableHead>Final Payment</TableHead>
                      <TableHead>Method</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredSalaries.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={12} className="text-center text-muted-foreground">
                          {salaries.length === 0 
                            ? "No salary records found. Create your first salary record to get started."
                            : "No records match the selected filters."
                          }
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredSalaries.map((salary: SalaryRecord) => (
                        <TableRow key={salary.id} data-testid={`row-salary-${salary.id}`}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <User className="h-4 w-4 text-muted-foreground" />
                              {salary.employeeName}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Calendar className="h-4 w-4 text-muted-foreground" />
                              {salary.month}
                            </div>
                          </TableCell>
                          <TableCell>{formatCurrency(salary.basicSalary)}</TableCell>
                          <TableCell>{salary.contractualHours}h</TableCell>
                          <TableCell>{salary.actualWorkingHours}h</TableCell>
                          <TableCell>{formatCurrency(salary.hourlyRate)}</TableCell>
                          <TableCell>{formatCurrency(salary.basePayment)}</TableCell>
                          <TableCell className="text-green-600">{formatCurrency(salary.totalBonus)}</TableCell>
                          <TableCell>
                            <Badge variant="secondary" className="font-bold">
                              {formatCurrency(salary.finalPayment)}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <CreditCard className="h-3 w-3" />
                              {salary.paymentMethod === 'bank_transfer' ? 'Bank' : 
                               salary.paymentMethod === 'mobile_banking' ? 'Mobile' : 'Cash'}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={salary.paymentStatus === 'paid' ? 'default' : 'destructive'}>
                              {salary.paymentStatus === 'paid' ? 'Paid' : 'Unpaid'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleEditSalary(salary)}
                                data-testid={`button-edit-${salary.id}`}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => deleteSalaryMutation.mutate(salary.id)}
                                disabled={deleteSalaryMutation.isPending}
                                data-testid={`button-delete-${salary.id}`}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Edit Dialog */}
        <Dialog open={!!editingSalary} onOpenChange={() => setEditingSalary(null)}>
          <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Salary Record</DialogTitle>
              <DialogDescription>
                Update salary record for {editingSalary?.employeeName}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-6">
              {/* Employee and Basic Info */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="employee">User Name *</Label>
                  <Select value={formData.employeeId} onValueChange={handleUserChange} data-testid="select-edit-employee">
                    <SelectTrigger>
                      <SelectValue placeholder="Select user" />
                    </SelectTrigger>
                    <SelectContent>
                      {users.map((user: UserType) => (
                        <SelectItem key={user.id} value={user.id}>
                          {user.name || user.username}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="month">Month *</Label>
                  <Input
                    type="month"
                    value={formData.month}
                    onChange={(e) => setFormData(prev => ({ ...prev, month: e.target.value }))}
                    data-testid="input-edit-month"
                  />
                </div>
              </div>

              {/* Basic Salary Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Basic Salary Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="basicSalary">Basic Salary (BDT) *</Label>
                      <Input
                        type="number"
                        value={formData.basicSalary > 0 ? formData.basicSalary : ''}
                        onChange={(e) => setFormData(prev => ({ ...prev, basicSalary: parseFloat(e.target.value) || 0 }))}
                        placeholder="50000"
                        data-testid="input-edit-basic-salary"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="contractualHours">Contractual Hours (Per Month) *</Label>
                      <Input
                        type="number"
                        value={formData.contractualHours > 0 ? formData.contractualHours : ''}
                        onChange={(e) => setFormData(prev => ({ ...prev, contractualHours: parseInt(e.target.value) || 0 }))}
                        placeholder="160"
                        data-testid="input-edit-contractual-hours"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="actualWorkingHours">Actual Working Hours (Auto-filled from reports) *</Label>
                      <Input
                        type="number"
                        step="0.1"
                        value={formData.actualWorkingHours > 0 ? formData.actualWorkingHours : ''}
                        onChange={(e) => setFormData(prev => ({ ...prev, actualWorkingHours: parseFloat(e.target.value) || 0 }))}
                        placeholder="150"
                        data-testid="input-edit-actual-hours"
                      />
                    </div>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Calculator className="h-4 w-4" />
                      <span className="font-medium">Auto-Calculated Values</span>
                    </div>
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>Per Hour Rate: <span className="font-medium">{formatCurrency(calculations.hourlyRate)}</span></div>
                      <div>Base Payment: <span className="font-medium">{formatCurrency(calculations.basePayment)}</span></div>
                      <div>Final Payment: <span className="font-bold text-green-600">{formatCurrency(calculations.finalPayment)}</span></div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Bonus */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Bonus</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="festivalBonus">Festival (BDT)</Label>
                      <Input
                        type="number"
                        value={formData.festivalBonus > 0 ? formData.festivalBonus : ''}
                        onChange={(e) => setFormData(prev => ({ ...prev, festivalBonus: parseFloat(e.target.value) || 0 }))}
                        placeholder="10000"
                        data-testid="input-edit-festival-bonus"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="performanceBonus">Performance (BDT)</Label>
                      <Input
                        type="number"
                        value={formData.performanceBonus > 0 ? formData.performanceBonus : ''}
                        onChange={(e) => setFormData(prev => ({ ...prev, performanceBonus: parseFloat(e.target.value) || 0 }))}
                        placeholder="5000"
                        data-testid="input-edit-performance-bonus"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="otherBonus">Other (BDT)</Label>
                      <Input
                        type="number"
                        value={formData.otherBonus > 0 ? formData.otherBonus : ''}
                        onChange={(e) => setFormData(prev => ({ ...prev, otherBonus: parseFloat(e.target.value) || 0 }))}
                        placeholder="3000"
                        data-testid="input-edit-other-bonus"
                      />
                    </div>
                  </div>
                  <div className="mt-2 text-sm text-muted-foreground">
                    Total Bonus: <span className="font-medium">{formatCurrency(calculations.totalBonus)}</span>
                  </div>
                </CardContent>
              </Card>

              {/* Payment Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Payment Information</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="paymentMethod">Payment Method</Label>
                      <Select 
                        value={formData.paymentMethod} 
                        onValueChange={(value: 'cash' | 'bank_transfer' | 'mobile_banking') => 
                          setFormData(prev => ({ ...prev, paymentMethod: value }))} 
                        data-testid="select-edit-payment-method"
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="cash">Cash</SelectItem>
                          <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                          <SelectItem value="mobile_banking">Mobile Banking</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="paymentStatus">Payment Status</Label>
                      <Select 
                        value={formData.paymentStatus} 
                        onValueChange={(value: 'paid' | 'unpaid') => 
                          setFormData(prev => ({ ...prev, paymentStatus: value }))} 
                        data-testid="select-edit-payment-status"
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="unpaid">Unpaid</SelectItem>
                          <SelectItem value="paid">Paid</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2 mt-4">
                    <Label htmlFor="remarks">Remarks</Label>
                    <Input
                      value={formData.remarks}
                      onChange={(e) => setFormData(prev => ({ ...prev, remarks: e.target.value }))}
                      placeholder="Additional notes or comments"
                      data-testid="input-edit-remarks"
                    />
                  </div>
                </CardContent>
              </Card>

              <div className="flex justify-end gap-2 pt-4">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setEditingSalary(null)}
                  data-testid="button-cancel-edit"
                >
                  Cancel
                </Button>
                <Button 
                  onClick={handleUpdateSalary}
                  disabled={updateSalaryMutation.isPending}
                  data-testid="button-submit-edit"
                >
                  {updateSalaryMutation.isPending ? "Updating..." : "Update Salary Record"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Generate Salary Dialog */}
        <GenerateSalaryDialog 
          open={isGenerateDialogOpen} 
          onOpenChange={setIsGenerateDialogOpen}
        />
      </div>
    </Sidebar>
  );
}