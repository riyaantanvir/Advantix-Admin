import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Calculator, FileText, AlertCircle, CheckCircle2, Clock } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface GenerateSalaryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface PreviewData {
  exists: boolean;
  existingSalary?: any;
  employee?: {
    id: string;
    name: string;
  };
  workReports?: {
    count: number;
    totalHours: string;
    reports: Array<{
      id: string;
      title: string;
      date: string;
      hoursWorked: string;
    }>;
  };
  preview?: {
    basicSalary: string;
    contractualHours: number;
    actualWorkingHours: string;
    hourlyRate: string;
    basePayment: string;
    hasPreviousSalary: boolean;
  };
  message?: string;
}

export function GenerateSalaryDialog({ open, onOpenChange }: GenerateSalaryDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedEmployeeId, setSelectedEmployeeId] = useState("");
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
  const [bonuses, setBonuses] = useState({
    festivalBonus: 0,
    performanceBonus: 0,
    otherBonus: 0,
  });
  const [approvalStatus, setApprovalStatus] = useState<"pending" | "approved" | "rejected">("pending");
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "bank_transfer" | "mobile_banking">("bank_transfer");
  const [paymentStatus, setPaymentStatus] = useState<"paid" | "unpaid">("unpaid");
  const [remarks, setRemarks] = useState("");

  // Fetch users for employee selection
  const { data: users = [] } = useQuery({
    queryKey: ["/api/users"],
    enabled: open,
    select: (data: any) => data || [],
  });

  // Fetch preview data when employee and month are selected
  const { data: previewData, isLoading: previewLoading, refetch: refetchPreview } = useQuery<PreviewData>({
    queryKey: ["/api/salaries/generate-preview", selectedEmployeeId, selectedMonth],
    queryFn: async () => {
      const response = await fetch(`/api/salaries/generate-preview?employeeId=${selectedEmployeeId}&month=${selectedMonth}`, {
        headers: {
          "Authorization": `Bearer ${localStorage.getItem("authToken")}`,
        },
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error(await response.text());
      }
      return response.json();
    },
    enabled: !!selectedEmployeeId && !!selectedMonth && open,
  });

  // Generate salary mutation
  const generateMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("POST", "/api/salaries/generate", data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Salary generated successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/salaries"] });
      queryClient.invalidateQueries({ queryKey: ["/api/salaries/stats"] });
      resetForm();
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to generate salary",
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setSelectedEmployeeId("");
    setSelectedMonth(new Date().toISOString().slice(0, 7));
    setBonuses({ festivalBonus: 0, performanceBonus: 0, otherBonus: 0 });
    setApprovalStatus("pending");
    setPaymentMethod("bank_transfer");
    setPaymentStatus("unpaid");
    setRemarks("");
  };

  const handleGenerate = () => {
    if (!previewData || !previewData.preview) {
      toast({
        title: "Error",
        description: "Please select an employee and month first",
        variant: "destructive",
      });
      return;
    }

    const { preview, employee } = previewData;
    
    const salaryData = {
      employeeId: selectedEmployeeId,
      employeeName: employee?.name || "",
      month: selectedMonth,
      basicSalary: parseFloat(preview.basicSalary),
      contractualHours: preview.contractualHours,
      actualWorkingHours: parseFloat(preview.actualWorkingHours),
      festivalBonus: bonuses.festivalBonus,
      performanceBonus: bonuses.performanceBonus,
      otherBonus: bonuses.otherBonus,
      paymentMethod,
      paymentStatus,
      salaryApprovalStatus: approvalStatus,
      remarks,
    };

    generateMutation.mutate(salaryData);
  };

  const totalBonus = bonuses.festivalBonus + bonuses.performanceBonus + bonuses.otherBonus;
  const basePayment = previewData?.preview ? parseFloat(previewData.preview.basePayment) : 0;
  const grossPayment = basePayment + totalBonus;
  const finalPayment = grossPayment;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-BD', {
      style: 'currency',
      currency: 'BDT',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Reset when dialog closes
  useEffect(() => {
    if (!open) {
      resetForm();
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>📊 Generate Salary</DialogTitle>
          <DialogDescription>
            Automatically calculate salary from work reports for a selected employee and month
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Employee and Month Selection */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Employee *</Label>
              <Select value={selectedEmployeeId} onValueChange={setSelectedEmployeeId} data-testid="select-generate-employee">
                <SelectTrigger>
                  <SelectValue placeholder="Select employee" />
                </SelectTrigger>
                <SelectContent>
                  {users.map((user: any) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.name || user.username}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Month *</Label>
              <Input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                data-testid="input-generate-month"
              />
            </div>
          </div>

          {/* Loading State */}
          {previewLoading && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
            </div>
          )}

          {/* Existing Salary Warning */}
          {previewData?.exists && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {previewData.message} 
                <Badge variant="secondary" className="ml-2">
                  {previewData.existingSalary?.paymentStatus === 'paid' ? 'Paid' : 'Unpaid'}
                </Badge>
              </AlertDescription>
            </Alert>
          )}

          {/* Work Reports Summary */}
          {previewData?.workReports && !previewData.exists && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Work Reports Summary
                </CardTitle>
              </CardHeader>
              <CardContent>
                {previewData.workReports.count === 0 ? (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      No approved or submitted work reports found for this employee and month.
                    </AlertDescription>
                  </Alert>
                ) : (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Total Work Reports:</span>
                      <Badge variant="outline">{previewData.workReports.count}</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Total Hours Worked:</span>
                      <Badge variant="secondary" className="text-base font-semibold">
                        {previewData.workReports.totalHours} hours
                      </Badge>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Salary Calculation Preview */}
          {previewData?.preview && !previewData.exists && (
            <>
              <Card className="bg-blue-50 dark:bg-blue-950">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Calculator className="h-4 w-4" />
                    Salary Calculation Preview
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {!previewData.preview.hasPreviousSalary && (
                    <Alert>
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        No previous salary record found. Using default values. Please verify basic salary and contractual hours.
                      </AlertDescription>
                    </Alert>
                  )}
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Basic Salary:</span>
                      <span className="font-medium">{formatCurrency(parseFloat(previewData.preview.basicSalary))}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Contractual Hours:</span>
                      <span className="font-medium">{previewData.preview.contractualHours} hours</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Total Hours Worked:</span>
                      <span className="font-medium">{previewData.preview.actualWorkingHours} hours</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Hourly Rate:</span>
                      <span className="font-medium">{formatCurrency(parseFloat(previewData.preview.hourlyRate))}</span>
                    </div>
                    <div className="flex justify-between col-span-2 pt-2 border-t">
                      <span className="text-muted-foreground">Base Payment:</span>
                      <span className="font-semibold text-lg">{formatCurrency(parseFloat(previewData.preview.basePayment))}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Bonuses */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Bonuses (Optional)</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>Festival Bonus</Label>
                      <Input
                        type="number"
                        value={bonuses.festivalBonus || ''}
                        onChange={(e) => setBonuses(prev => ({ ...prev, festivalBonus: parseFloat(e.target.value) || 0 }))}
                        placeholder="0"
                        data-testid="input-generate-festival-bonus"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Performance Bonus</Label>
                      <Input
                        type="number"
                        value={bonuses.performanceBonus || ''}
                        onChange={(e) => setBonuses(prev => ({ ...prev, performanceBonus: parseFloat(e.target.value) || 0 }))}
                        placeholder="0"
                        data-testid="input-generate-performance-bonus"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Other Bonus</Label>
                      <Input
                        type="number"
                        value={bonuses.otherBonus || ''}
                        onChange={(e) => setBonuses(prev => ({ ...prev, otherBonus: parseFloat(e.target.value) || 0 }))}
                        placeholder="0"
                        data-testid="input-generate-other-bonus"
                      />
                    </div>
                  </div>
                  <div className="mt-3 flex justify-between text-sm">
                    <span className="text-muted-foreground">Total Bonus:</span>
                    <span className="font-semibold">{formatCurrency(totalBonus)}</span>
                  </div>
                </CardContent>
              </Card>

              {/* Final Calculation */}
              <Card className="bg-green-50 dark:bg-green-950">
                <CardContent className="pt-6">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Base Payment:</span>
                      <span>{formatCurrency(basePayment)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Total Bonus:</span>
                      <span>{formatCurrency(totalBonus)}</span>
                    </div>
                    <div className="flex justify-between text-sm border-t pt-2">
                      <span>Gross Payment:</span>
                      <span className="font-semibold">{formatCurrency(grossPayment)}</span>
                    </div>
                    <div className="flex justify-between text-lg font-bold border-t pt-2">
                      <span>Final Salary:</span>
                      <span className="text-green-600 dark:text-green-400">{formatCurrency(finalPayment)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Approval & Payment Status */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Approval & Payment</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>Approval Status</Label>
                      <Select value={approvalStatus} onValueChange={(value: any) => setApprovalStatus(value)} data-testid="select-approval-status">
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pending">
                            <div className="flex items-center gap-2">
                              <Clock className="h-4 w-4 text-yellow-500" />
                              Pending
                            </div>
                          </SelectItem>
                          <SelectItem value="approved">
                            <div className="flex items-center gap-2">
                              <CheckCircle2 className="h-4 w-4 text-green-500" />
                              Approved
                            </div>
                          </SelectItem>
                          <SelectItem value="rejected">
                            <div className="flex items-center gap-2">
                              <AlertCircle className="h-4 w-4 text-red-500" />
                              Rejected
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Payment Method</Label>
                      <Select value={paymentMethod} onValueChange={(value: any) => setPaymentMethod(value)} data-testid="select-generate-payment-method">
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
                      <Label>Payment Status</Label>
                      <Select value={paymentStatus} onValueChange={(value: any) => setPaymentStatus(value)} data-testid="select-generate-payment-status">
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
                    <Label>Remarks (Optional)</Label>
                    <Input
                      value={remarks}
                      onChange={(e) => setRemarks(e.target.value)}
                      placeholder="Add any notes or comments..."
                      data-testid="input-generate-remarks"
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Actions */}
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => onOpenChange(false)} data-testid="button-cancel-generate">
                  Cancel
                </Button>
                <Button
                  onClick={handleGenerate}
                  disabled={generateMutation.isPending || previewData.workReports?.count === 0}
                  data-testid="button-generate-salary"
                >
                  {generateMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Calculator className="h-4 w-4 mr-2" />
                      Generate Salary
                    </>
                  )}
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
