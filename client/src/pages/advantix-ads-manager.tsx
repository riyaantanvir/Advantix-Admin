import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Rocket, Plus, Trash2, Play, CheckCircle, XCircle, Clock } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export default function AdvantixAdsManager() {
  const { toast } = useToast();
  const [showWizard, setShowWizard] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);

  // Form state
  const [draftName, setDraftName] = useState("");
  const [adAccountId, setAdAccountId] = useState("");
  const [objective, setObjective] = useState("");
  const [campaignName, setCampaignName] = useState("");
  const [budgetType, setBudgetType] = useState("daily");
  const [dailyBudget, setDailyBudget] = useState("");
  const [adSetName, setAdSetName] = useState("");
  const [adName, setAdName] = useState("");
  const [adCopy, setAdCopy] = useState("");
  const [headline, setHeadline] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [callToAction, setCallToAction] = useState("LEARN_MORE");

  // Fetch ad accounts
  const { data: adAccounts = [] } = useQuery({
    queryKey: ["/api/facebook/ad-accounts"],
  });

  // Fetch campaign drafts
  const { data: drafts = [], isLoading: draftsLoading } = useQuery({
    queryKey: ["/api/campaign-drafts"],
  });

  // Create draft mutation
  const createDraftMutation = useMutation({
    mutationFn: async (draftData: any) => {
      return await apiRequest("/api/campaign-drafts", "POST", draftData);
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Campaign draft saved successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/campaign-drafts"] });
      resetForm();
      setShowWizard(false);
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to save draft", variant: "destructive" });
    },
  });

  // Publish draft mutation
  const publishDraftMutation = useMutation({
    mutationFn: async (draftId: string) => {
      return await apiRequest(`/api/campaign-drafts/${draftId}/publish`, "POST");
    },
    onSuccess: (data: any) => {
      toast({ title: "Campaign Published!", description: `Campaign ID: ${data.campaignId}` });
      queryClient.invalidateQueries({ queryKey: ["/api/campaign-drafts"] });
    },
    onError: (error: any) => {
      toast({ title: "Publish Failed", description: error.message || "Failed to publish campaign", variant: "destructive" });
    },
  });

  // Delete draft mutation
  const deleteDraftMutation = useMutation({
    mutationFn: async (draftId: string) => {
      return await apiRequest(`/api/campaign-drafts/${draftId}`, "DELETE");
    },
    onSuccess: () => {
      toast({ title: "Deleted", description: "Draft deleted successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/campaign-drafts"] });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to delete draft", variant: "destructive" });
    },
  });

  const resetForm = () => {
    setDraftName("");
    setAdAccountId("");
    setObjective("");
    setCampaignName("");
    setBudgetType("daily");
    setDailyBudget("");
    setAdSetName("");
    setAdName("");
    setAdCopy("");
    setHeadline("");
    setWebsiteUrl("");
    setCallToAction("LEARN_MORE");
    setCurrentStep(1);
  };

  const handleSaveDraft = () => {
    if (!draftName || !adAccountId || !objective || !campaignName) {
      toast({ title: "Error", description: "Please fill in all required fields", variant: "destructive" });
      return;
    }

    const draftData = {
      draftName,
      adAccountId,
      objective,
      campaignName,
      budgetType,
      dailyBudget: dailyBudget ? parseFloat(dailyBudget) : null,
      adSetName,
      adName,
      adCopy,
      headline,
      websiteUrl,
      callToAction,
      status: "draft",
    };

    createDraftMutation.mutate(draftData);
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: any; icon: any }> = {
      draft: { variant: "secondary", icon: <Clock className="w-3 h-3" /> },
      ready: { variant: "default", icon: <CheckCircle className="w-3 h-3" /> },
      publishing: { variant: "default", icon: <Play className="w-3 h-3" /> },
      published: { variant: "default", icon: <CheckCircle className="w-3 h-3" /> },
      failed: { variant: "destructive", icon: <XCircle className="w-3 h-3" /> },
    };

    const config = variants[status] || variants.draft;
    return (
      <Badge variant={config.variant as any} className="flex items-center gap-1">
        {config.icon}
        {status.toUpperCase()}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Rocket className="w-8 h-8 text-primary" />
            Advantix Ads Manager
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Create and manage Facebook ad campaigns with ease
          </p>
        </div>
        <Button onClick={() => setShowWizard(!showWizard)} size="lg" data-testid="button-new-campaign">
          <Plus className="w-4 h-4 mr-2" />
          New Campaign
        </Button>
      </div>

      {showWizard && (
        <Card>
          <CardHeader>
            <CardTitle>Campaign Creation Wizard</CardTitle>
            <CardDescription>Step {currentStep} of 3: {currentStep === 1 ? "Campaign Setup" : currentStep === 2 ? "Budget & Targeting" : "Creative Assets"}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {currentStep === 1 && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="draft-name">Draft Name *</Label>
                  <Input
                    id="draft-name"
                    value={draftName}
                    onChange={(e) => setDraftName(e.target.value)}
                    placeholder="My Campaign Draft"
                    data-testid="input-draft-name"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="ad-account">Ad Account *</Label>
                  <Select value={adAccountId} onValueChange={setAdAccountId}>
                    <SelectTrigger id="ad-account" data-testid="select-ad-account">
                      <SelectValue placeholder="Select ad account" />
                    </SelectTrigger>
                    <SelectContent>
                      {adAccounts.map((account: any) => (
                        <SelectItem key={account.id} value={account.id}>
                          {account.accountName} ({account.platform})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="objective">Campaign Objective *</Label>
                  <Select value={objective} onValueChange={setObjective}>
                    <SelectTrigger id="objective" data-testid="select-objective">
                      <SelectValue placeholder="Select objective" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="OUTCOME_ENGAGEMENT">Engagement</SelectItem>
                      <SelectItem value="OUTCOME_SALES">Sales</SelectItem>
                      <SelectItem value="OUTCOME_LEADS">Leads</SelectItem>
                      <SelectItem value="OUTCOME_TRAFFIC">Traffic</SelectItem>
                      <SelectItem value="OUTCOME_AWARENESS">Awareness</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="campaign-name">Campaign Name *</Label>
                  <Input
                    id="campaign-name"
                    value={campaignName}
                    onChange={(e) => setCampaignName(e.target.value)}
                    placeholder="Summer Sale Campaign"
                    data-testid="input-campaign-name"
                  />
                </div>
              </div>
            )}

            {currentStep === 2 && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="budget-type">Budget Type</Label>
                  <Select value={budgetType} onValueChange={setBudgetType}>
                    <SelectTrigger id="budget-type" data-testid="select-budget-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">Daily Budget</SelectItem>
                      <SelectItem value="lifetime">Lifetime Budget</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="daily-budget">{budgetType === "daily" ? "Daily" : "Lifetime"} Budget ($)</Label>
                  <Input
                    id="daily-budget"
                    type="number"
                    value={dailyBudget}
                    onChange={(e) => setDailyBudget(e.target.value)}
                    placeholder="100"
                    data-testid="input-budget"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="adset-name">Ad Set Name</Label>
                  <Input
                    id="adset-name"
                    value={adSetName}
                    onChange={(e) => setAdSetName(e.target.value)}
                    placeholder="Main Ad Set"
                    data-testid="input-adset-name"
                  />
                </div>
              </div>
            )}

            {currentStep === 3 && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="ad-name">Ad Name</Label>
                  <Input
                    id="ad-name"
                    value={adName}
                    onChange={(e) => setAdName(e.target.value)}
                    placeholder="Main Ad"
                    data-testid="input-ad-name"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="headline">Headline</Label>
                  <Input
                    id="headline"
                    value={headline}
                    onChange={(e) => setHeadline(e.target.value)}
                    placeholder="Get 50% Off Today!"
                    data-testid="input-headline"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="ad-copy">Ad Copy</Label>
                  <Textarea
                    id="ad-copy"
                    value={adCopy}
                    onChange={(e) => setAdCopy(e.target.value)}
                    placeholder="Limited time offer - shop now and save big!"
                    rows={4}
                    data-testid="textarea-ad-copy"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="website-url">Website URL</Label>
                  <Input
                    id="website-url"
                    value={websiteUrl}
                    onChange={(e) => setWebsiteUrl(e.target.value)}
                    placeholder="https://example.com"
                    data-testid="input-website-url"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="cta">Call to Action</Label>
                  <Select value={callToAction} onValueChange={setCallToAction}>
                    <SelectTrigger id="cta" data-testid="select-cta">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="LEARN_MORE">Learn More</SelectItem>
                      <SelectItem value="SHOP_NOW">Shop Now</SelectItem>
                      <SelectItem value="SIGN_UP">Sign Up</SelectItem>
                      <SelectItem value="DOWNLOAD">Download</SelectItem>
                      <SelectItem value="GET_QUOTE">Get Quote</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            <div className="flex items-center justify-between pt-4 border-t">
              <Button
                variant="outline"
                onClick={() => setCurrentStep(Math.max(1, currentStep - 1))}
                disabled={currentStep === 1}
                data-testid="button-prev-step"
              >
                Previous
              </Button>

              <div className="flex gap-2">
                <Button variant="outline" onClick={resetForm} data-testid="button-cancel">
                  Cancel
                </Button>
                {currentStep < 3 ? (
                  <Button onClick={() => setCurrentStep(currentStep + 1)} data-testid="button-next-step">
                    Next
                  </Button>
                ) : (
                  <Button onClick={handleSaveDraft} disabled={createDraftMutation.isPending} data-testid="button-save-draft">
                    {createDraftMutation.isPending ? "Saving..." : "Save Draft"}
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Campaign Drafts</CardTitle>
          <CardDescription>Manage your campaign drafts before publishing to Facebook</CardDescription>
        </CardHeader>
        <CardContent>
          {draftsLoading ? (
            <div className="text-center py-8 text-gray-500">Loading drafts...</div>
          ) : drafts.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No drafts yet. Create your first campaign!
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Draft Name</TableHead>
                  <TableHead>Campaign</TableHead>
                  <TableHead>Objective</TableHead>
                  <TableHead>Budget</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {drafts.map((draft: any) => (
                  <TableRow key={draft.id}>
                    <TableCell className="font-medium">{draft.draftName}</TableCell>
                    <TableCell>{draft.campaignName}</TableCell>
                    <TableCell>{draft.objective?.replace('OUTCOME_', '')}</TableCell>
                    <TableCell>${draft.dailyBudget || draft.lifetimeBudget || 'N/A'}</TableCell>
                    <TableCell>{getStatusBadge(draft.status)}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        {draft.status === "draft" && (
                          <Button
                            size="sm"
                            onClick={() => publishDraftMutation.mutate(draft.id)}
                            disabled={publishDraftMutation.isPending}
                            data-testid={`button-publish-${draft.id}`}
                          >
                            <Play className="w-3 h-3 mr-1" />
                            Publish
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => deleteDraftMutation.mutate(draft.id)}
                          disabled={deleteDraftMutation.isPending}
                          data-testid={`button-delete-${draft.id}`}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
