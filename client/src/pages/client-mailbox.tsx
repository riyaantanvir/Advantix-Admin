import Sidebar from "@/components/layout/Sidebar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Mail, AlertCircle, Loader2, Send } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { clientMailboxEmailSchema } from "@shared/schema";
import type { ClientMailboxEmail } from "@shared/schema";

interface Client {
  id: string;
  name: string;
  email: string;
  phone: string;
}

interface AdAccount {
  id: string;
  accountName: string;
  platform: string;
  status: string;
  totalSpend: number;
  dailyBudget: number;
  clientId: string;
}

export default function ClientMailboxPage() {
  const { toast } = useToast();

  const form = useForm<ClientMailboxEmail>({
    resolver: zodResolver(clientMailboxEmailSchema),
    defaultValues: {
      clientId: "",
      emailType: "custom",
      subject: "",
      customMessage: "",
      adAccountId: "",
    },
  });

  const watchedClientId = form.watch("clientId");
  const watchedEmailType = form.watch("emailType");
  const watchedAdAccountId = form.watch("adAccountId");
  const watchedCustomMessage = form.watch("customMessage");

  // Fetch clients
  const { data: clients = [], isLoading: clientsLoading } = useQuery<Client[]>({
    queryKey: ["/api/clients"],
  });

  // Fetch all ad accounts (only for activation/suspension emails)
  const needsAdAccount = watchedEmailType === "activation" || watchedEmailType === "suspension";
  const { data: allAdAccounts = [], isLoading: adAccountsLoading } = useQuery<AdAccount[]>({
    queryKey: ["/api/ad-accounts"],
    enabled: needsAdAccount,
  });

  // Filter ad accounts for selected client
  const adAccounts = allAdAccounts.filter(account => account.clientId === watchedClientId);

  // Fetch email settings
  const { data: emailSettings } = useQuery({
    queryKey: ["/api/email/settings"],
  });

  const selectedClient = clients.find(c => c.id === watchedClientId);
  const selectedAdAccount = adAccounts.find(a => a.id === watchedAdAccountId);

  // Get preview data based on email type
  const getPreviewHtml = () => {
    if (!selectedClient) {
      return "<p>Please select a client first.</p>";
    }

    const baseStyle = `font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;`;
    const cardStyle = `background-color: white; padding: 30px; border-radius: 8px;`;
    const footerStyle = `color: #6b7280; font-size: 14px; margin-top: 30px;`;

    if (watchedEmailType === "custom") {
      return `
        <div style="${baseStyle}">
          <div style="${cardStyle}">
            <h2 style="color: #1a73e8; margin-bottom: 20px;">Message from Advantix Admin</h2>
            <p style="color: #333; font-size: 16px; line-height: 1.6; white-space: pre-wrap;">${watchedCustomMessage || "Your custom message will appear here..."}</p>
            <p style="${footerStyle}">
              Best regards,<br/>
              <strong>Advantix Admin Team</strong>
            </p>
          </div>
        </div>
      `;
    }

    if (watchedEmailType === "welcome") {
      return `
        <div style="${baseStyle}">
          <div style="${cardStyle}">
            <h2 style="color: #10b981; margin-bottom: 20px;">🎉 Welcome to Advantix!</h2>
            <p style="color: #333; font-size: 16px; line-height: 1.6; margin-bottom: 15px;">
              Hello <strong>${selectedClient.name}</strong>,
            </p>
            <p style="color: #333; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
              We're thrilled to have you on board! Welcome to Advantix, your trusted partner in digital advertising success.
            </p>
            <div style="background-color: #f0fdf4; padding: 20px; border-radius: 6px; margin-bottom: 20px;">
              <h3 style="color: #15803d; margin-top: 0;">What's Next?</h3>
              <ul style="color: #166534; margin: 0; padding-left: 20px;">
                <li>Your account is set up and ready to go</li>
                <li>We'll be managing your ad campaigns with care</li>
                <li>You'll receive regular updates on performance</li>
                <li>Our team is here to support you every step of the way</li>
              </ul>
            </div>
            <p style="color: #333; font-size: 16px; line-height: 1.6;">
              If you have any questions, please don't hesitate to reach out. We're here to help!
            </p>
            <p style="${footerStyle}">
              Best regards,<br/>
              <strong>Advantix Admin Team</strong>
            </p>
          </div>
        </div>
      `;
    }

    if (watchedEmailType === "monthly_report") {
      return `
        <div style="${baseStyle}">
          <div style="${cardStyle}">
            <h2 style="color: #1a73e8; margin-bottom: 20px;">📊 Your Monthly Performance Report</h2>
            <p style="color: #333; font-size: 16px; line-height: 1.6; margin-bottom: 15px;">
              Hello <strong>${selectedClient.name}</strong>,
            </p>
            <p style="color: #333; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
              Here's a summary of your advertising performance this month.
            </p>
            <div style="background-color: #f3f4f6; padding: 20px; border-radius: 6px; margin-bottom: 20px;">
              <h3 style="color: #1f2937; margin-top: 0;">Key Metrics:</h3>
              <p style="margin: 8px 0; color: #4b5563;"><strong>Total Ad Spend:</strong> $X,XXX.XX</p>
              <p style="margin: 8px 0; color: #4b5563;"><strong>Impressions:</strong> XXX,XXX</p>
              <p style="margin: 8px 0; color: #4b5563;"><strong>Clicks:</strong> XX,XXX</p>
              <p style="margin: 8px 0; color: #4b5563;"><strong>Conversions:</strong> XXX</p>
              <p style="margin: 8px 0; color: #4b5563;"><strong>ROI:</strong> XX%</p>
            </div>
            <p style="color: #333; font-size: 16px; line-height: 1.6;">
              Your campaigns are performing well! Let's schedule a call to discuss optimization opportunities.
            </p>
            <p style="${footerStyle}">
              Best regards,<br/>
              <strong>Advantix Admin Team</strong>
            </p>
          </div>
        </div>
      `;
    }

    if (watchedEmailType === "payment_reminder") {
      return `
        <div style="${baseStyle}">
          <div style="${cardStyle}">
            <h2 style="color: #f59e0b; margin-bottom: 20px;">💳 Payment Reminder</h2>
            <p style="color: #333; font-size: 16px; line-height: 1.6; margin-bottom: 15px;">
              Hello <strong>${selectedClient.name}</strong>,
            </p>
            <p style="color: #333; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
              This is a friendly reminder about your upcoming payment.
            </p>
            <div style="background-color: #fef3c7; padding: 20px; border-radius: 6px; margin-bottom: 20px;">
              <h3 style="color: #92400e; margin-top: 0;">Payment Details:</h3>
              <p style="margin: 8px 0; color: #78350f;"><strong>Amount Due:</strong> $X,XXX.XX</p>
              <p style="margin: 8px 0; color: #78350f;"><strong>Due Date:</strong> [Date]</p>
              <p style="margin: 8px 0; color: #78350f;"><strong>Invoice Number:</strong> INV-XXXXX</p>
            </div>
            <p style="color: #333; font-size: 16px; line-height: 1.6;">
              Please process this payment at your earliest convenience to avoid any service interruptions.
            </p>
            <p style="${footerStyle}">
              Best regards,<br/>
              <strong>Advantix Admin Team</strong>
            </p>
          </div>
        </div>
      `;
    }

    if (watchedEmailType === "campaign_launch") {
      return `
        <div style="${baseStyle}">
          <div style="${cardStyle}">
            <h2 style="color: #8b5cf6; margin-bottom: 20px;">🚀 Your New Campaign is Live!</h2>
            <p style="color: #333; font-size: 16px; line-height: 1.6; margin-bottom: 15px;">
              Hello <strong>${selectedClient.name}</strong>,
            </p>
            <p style="color: #333; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
              Great news! Your new advertising campaign has just been launched and is now live.
            </p>
            <div style="background-color: #f5f3ff; padding: 20px; border-radius: 6px; margin-bottom: 20px;">
              <h3 style="color: #6b21a8; margin-top: 0;">Campaign Details:</h3>
              <p style="margin: 8px 0; color: #5b21b6;"><strong>Campaign Name:</strong> [Campaign Name]</p>
              <p style="margin: 8px 0; color: #5b21b6;"><strong>Platform:</strong> [Platform]</p>
              <p style="margin: 8px 0; color: #5b21b6;"><strong>Budget:</strong> $X,XXX.XX</p>
              <p style="margin: 8px 0; color: #5b21b6;"><strong>Duration:</strong> [Start Date] - [End Date]</p>
            </div>
            <p style="color: #333; font-size: 16px; line-height: 1.6;">
              We'll be monitoring performance closely and will keep you updated with regular reports.
            </p>
            <p style="${footerStyle}">
              Best regards,<br/>
              <strong>Advantix Admin Team</strong>
            </p>
          </div>
        </div>
      `;
    }

    if (watchedEmailType === "budget_alert") {
      return `
        <div style="${baseStyle}">
          <div style="${cardStyle}">
            <h2 style="color: #dc2626; margin-bottom: 20px;">⚠️ Budget Alert</h2>
            <p style="color: #333; font-size: 16px; line-height: 1.6; margin-bottom: 15px;">
              Hello <strong>${selectedClient.name}</strong>,
            </p>
            <p style="color: #333; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
              This is an important notification about your campaign budget.
            </p>
            <div style="background-color: #fef2f2; border-left: 4px solid #dc2626; padding: 20px; margin-bottom: 20px;">
              <h3 style="color: #991b1b; margin-top: 0;">Budget Status:</h3>
              <p style="margin: 8px 0; color: #7f1d1d;"><strong>Campaign:</strong> [Campaign Name]</p>
              <p style="margin: 8px 0; color: #7f1d1d;"><strong>Budget Used:</strong> 85% ($X,XXX.XX of $X,XXX.XX)</p>
              <p style="margin: 8px 0; color: #7f1d1d;"><strong>Remaining:</strong> $XXX.XX</p>
              <p style="margin: 8px 0; color: #7f1d1d;"><strong>Estimated Days Left:</strong> X days</p>
            </div>
            <p style="color: #333; font-size: 16px; line-height: 1.6;">
              Please let us know if you'd like to increase the budget to maintain campaign momentum.
            </p>
            <p style="${footerStyle}">
              Best regards,<br/>
              <strong>Advantix Admin Team</strong>
            </p>
          </div>
        </div>
      `;
    }

    if (watchedEmailType === "thank_you") {
      return `
        <div style="${baseStyle}">
          <div style="${cardStyle}">
            <h2 style="color: #ec4899; margin-bottom: 20px;">💝 Thank You!</h2>
            <p style="color: #333; font-size: 16px; line-height: 1.6; margin-bottom: 15px;">
              Hello <strong>${selectedClient.name}</strong>,
            </p>
            <p style="color: #333; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
              We wanted to take a moment to thank you for your continued trust in Advantix.
            </p>
            <div style="background-color: #fdf2f8; padding: 20px; border-radius: 6px; margin-bottom: 20px; text-align: center;">
              <p style="color: #9f1239; font-size: 18px; font-weight: bold; margin: 0;">
                Your partnership means the world to us!
              </p>
            </div>
            <p style="color: #333; font-size: 16px; line-height: 1.6; margin-bottom: 15px;">
              It's clients like you that make what we do so rewarding. We're committed to delivering exceptional results and supporting your business growth.
            </p>
            <p style="color: #333; font-size: 16px; line-height: 1.6;">
              Here's to our continued success together!
            </p>
            <p style="${footerStyle}">
              With gratitude,<br/>
              <strong>Advantix Admin Team</strong>
            </p>
          </div>
        </div>
      `;
    }

    if (watchedEmailType === "activation" && selectedAdAccount) {
      const availableBalance = selectedAdAccount.dailyBudget - selectedAdAccount.totalSpend;
      return `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
          <div style="background-color: white; padding: 30px; border-radius: 8px;">
            <h2 style="color: #10b981; margin-bottom: 20px;">✅ Ad Account Activated</h2>
            <p style="color: #333; font-size: 16px; line-height: 1.6; margin-bottom: 15px;">
              Hello <strong>${selectedClient.name}</strong>,
            </p>
            <p style="color: #333; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
              Great news! Your ad account has been activated and is now running.
            </p>
            <div style="background-color: #f3f4f6; padding: 20px; border-radius: 6px; margin-bottom: 20px;">
              <h3 style="color: #1f2937; margin-top: 0;">Account Details:</h3>
              <p style="margin: 8px 0; color: #4b5563;"><strong>Platform:</strong> ${selectedAdAccount.platform}</p>
              <p style="margin: 8px 0; color: #4b5563;"><strong>Account Name:</strong> ${selectedAdAccount.accountName}</p>
              <p style="margin: 8px 0; color: #4b5563;"><strong>Status:</strong> <span style="color: #10b981;">Active</span></p>
              <p style="margin: 8px 0; color: #4b5563;"><strong>Total Spend:</strong> $${selectedAdAccount.totalSpend.toFixed(2)}</p>
              <p style="margin: 8px 0; color: #4b5563;"><strong>Available Balance:</strong> $${availableBalance.toFixed(2)}</p>
            </div>
            <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
              Best regards,<br/>
              <strong>Advantix Admin Team</strong>
            </p>
          </div>
        </div>
      `;
    }

    if (watchedEmailType === "suspension" && selectedAdAccount) {
      const availableBalance = selectedAdAccount.dailyBudget - selectedAdAccount.totalSpend;
      return `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
          <div style="background-color: white; padding: 30px; border-radius: 8px;">
            <h2 style="color: #dc2626; margin-bottom: 20px;">⚠️ Ad Account Suspended</h2>
            <p style="color: #333; font-size: 16px; line-height: 1.6; margin-bottom: 15px;">
              Hello <strong>${selectedClient.name}</strong>,
            </p>
            <p style="color: #333; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
              We wanted to inform you that your ad account has been suspended and is no longer running.
            </p>
            <div style="background-color: #f3f4f6; padding: 20px; border-radius: 6px; margin-bottom: 20px;">
              <h3 style="color: #1f2937; margin-top: 0;">Account Details:</h3>
              <p style="margin: 8px 0; color: #4b5563;"><strong>Platform:</strong> ${selectedAdAccount.platform}</p>
              <p style="margin: 8px 0; color: #4b5563;"><strong>Account Name:</strong> ${selectedAdAccount.accountName}</p>
              <p style="margin: 8px 0; color: #4b5563;"><strong>Status:</strong> <span style="color: #dc2626;">Suspended</span></p>
              <p style="margin: 8px 0; color: #4b5563;"><strong>Total Spend:</strong> $${selectedAdAccount.totalSpend.toFixed(2)}</p>
              <p style="margin: 8px 0; color: #4b5563;"><strong>Available Balance:</strong> $${availableBalance.toFixed(2)}</p>
            </div>
            <div style="background-color: #fef2f2; border-left: 4px solid #dc2626; padding: 15px; margin-bottom: 20px;">
              <h4 style="color: #991b1b; margin-top: 0;">What should I do?</h4>
              <ul style="color: #7f1d1d; margin: 0; padding-left: 20px;">
                <li>Contact our support team to understand the reason for suspension</li>
                <li>Check if there are any outstanding payments or policy violations</li>
                <li>Review your ad account settings and compliance with platform policies</li>
              </ul>
            </div>
            <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
              Best regards,<br/>
              <strong>Advantix Admin Team</strong>
            </p>
          </div>
        </div>
      `;
    }

    return "<p>Please select an email type and fill in the required information.</p>";
  };

  // Send email mutation
  const sendEmailMutation = useMutation({
    mutationFn: async (data: ClientMailboxEmail) => {
      const response = await apiRequest("POST", "/api/client-mailbox/send", data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Email sent successfully",
        description: `Email has been sent to ${selectedClient?.name}`,
      });
      // Reset form
      form.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to send email",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: ClientMailboxEmail) => {
    sendEmailMutation.mutate(data);
  };

  const getDefaultSubject = () => {
    switch (watchedEmailType) {
      case "activation":
        return `Your Ad Account is Now Active - ${selectedAdAccount?.accountName || ""}`;
      case "suspension":
        return `Important: Your Ad Account Has Been Suspended - ${selectedAdAccount?.accountName || ""}`;
      case "welcome":
        return `Welcome to Advantix - ${selectedClient?.name || ""}!`;
      case "monthly_report":
        return `Your Monthly Performance Report - ${new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`;
      case "payment_reminder":
        return `Payment Reminder - Advantix Services`;
      case "campaign_launch":
        return `Your New Campaign is Now Live!`;
      case "budget_alert":
        return `Budget Alert: Action Required`;
      case "thank_you":
        return `Thank You from the Advantix Team!`;
      default:
        return "Message from Advantix Admin";
    }
  };

  const isEmailConfigured = (emailSettings as any)?.isConfigured ?? false;

  return (
    <Sidebar>
      <div className="flex-1 overflow-auto">
        <div className="p-6 max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-6">
            <div className="flex items-center gap-3 mb-2">
              <Mail className="h-8 w-8 text-blue-600" />
              <h1 className="text-3xl font-bold text-gray-900">Client Mailbox</h1>
            </div>
            <p className="text-gray-600">Compose and send custom emails to clients with preview</p>
          </div>

          {/* Email Service Warning */}
          {!isEmailConfigured && (
            <Alert className="mb-6">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Email service is not configured. Please configure your email provider in the Admin Panel before sending emails.
              </AlertDescription>
            </Alert>
          )}

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)}>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Composer Section */}
                <Card>
                  <CardHeader>
                    <CardTitle>Email Composer</CardTitle>
                    <CardDescription>Select recipient and compose your message</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Client Selection */}
                    <FormField
                      control={form.control}
                      name="clientId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Select Client *</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            value={field.value}
                            disabled={clientsLoading}
                          >
                            <FormControl>
                              <SelectTrigger data-testid="select-client">
                                <SelectValue placeholder={clientsLoading ? "Loading clients..." : "Select a client"} />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {clients.map((client) => (
                                <SelectItem key={client.id} value={client.id}>
                                  {client.name} ({client.email || "No email"})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {selectedClient && !selectedClient.email && (
                            <p className="text-sm text-red-600">⚠️ This client has no email address configured</p>
                          )}
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Email Type */}
                    <FormField
                      control={form.control}
                      name="emailType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email Type *</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-email-type">
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="custom">✏️ Custom Message</SelectItem>
                              <SelectItem value="welcome">🎉 Welcome Email</SelectItem>
                              <SelectItem value="monthly_report">📊 Monthly Report</SelectItem>
                              <SelectItem value="payment_reminder">💳 Payment Reminder</SelectItem>
                              <SelectItem value="campaign_launch">🚀 Campaign Launch</SelectItem>
                              <SelectItem value="budget_alert">⚠️ Budget Alert</SelectItem>
                              <SelectItem value="thank_you">💝 Thank You</SelectItem>
                              <SelectItem value="activation">✅ Account Activation Alert</SelectItem>
                              <SelectItem value="suspension">⛔ Account Suspension Alert</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Ad Account Selection (only for activation/suspension emails) */}
                    {needsAdAccount && (
                      <FormField
                        control={form.control}
                        name="adAccountId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Select Ad Account *</FormLabel>
                            <Select
                              onValueChange={field.onChange}
                              value={field.value}
                              disabled={!watchedClientId || adAccountsLoading}
                            >
                              <FormControl>
                                <SelectTrigger data-testid="select-ad-account">
                                  <SelectValue placeholder={
                                    !watchedClientId 
                                      ? "Select a client first" 
                                      : adAccountsLoading 
                                        ? "Loading ad accounts..." 
                                        : adAccounts.length === 0 
                                          ? "No ad accounts found" 
                                          : "Select an ad account"
                                  } />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {adAccounts.map((account) => (
                                  <SelectItem key={account.id} value={account.id}>
                                    {account.accountName} ({account.platform})
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}

                    {/* Subject Line */}
                    <FormField
                      control={form.control}
                      name="subject"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Subject Line</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              data-testid="input-subject"
                              placeholder={getDefaultSubject()}
                            />
                          </FormControl>
                          <FormDescription>
                            Leave blank to use default subject
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Custom Message (only for custom type) */}
                    {watchedEmailType === "custom" && (
                      <FormField
                        control={form.control}
                        name="customMessage"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Custom Message *</FormLabel>
                            <FormControl>
                              <Textarea
                                {...field}
                                data-testid="textarea-custom-message"
                                placeholder="Enter your custom message here..."
                                rows={6}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}

                    <Separator />

                    {/* Send Button */}
                    <Button
                      type="submit"
                      disabled={sendEmailMutation.isPending || !isEmailConfigured}
                      className="w-full"
                      data-testid="button-send-email"
                    >
                      {sendEmailMutation.isPending ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Sending...
                        </>
                      ) : (
                        <>
                          <Send className="h-4 w-4 mr-2" />
                          Send Email
                        </>
                      )}
                    </Button>
                  </CardContent>
                </Card>

                {/* Preview Section */}
                <Card>
                  <CardHeader>
                    <CardTitle>Email Preview</CardTitle>
                    <CardDescription>Preview how your email will look</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div 
                      className="border border-gray-200 rounded-lg p-4 bg-white min-h-[400px]"
                      dangerouslySetInnerHTML={{ __html: getPreviewHtml() }}
                      data-testid="email-preview"
                    />
                  </CardContent>
                </Card>
              </div>
            </form>
          </Form>
        </div>
      </div>
    </Sidebar>
  );
}
