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
import { Rocket, Plus, Trash2, Play, CheckCircle, XCircle, Clock, Upload, Image as ImageIcon, Video, X, Edit, RefreshCw } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import Sidebar from "@/components/layout/Sidebar";

export default function AdvantixAdsManager() {
  const { toast } = useToast();
  const [showWizard, setShowWizard] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [editingDraftId, setEditingDraftId] = useState<string | null>(null);

  // Form state - Campaign Setup
  const [draftName, setDraftName] = useState("");
  const [adAccountId, setAdAccountId] = useState("");
  const [pageId, setPageId] = useState("");
  const [objective, setObjective] = useState("");
  const [campaignName, setCampaignName] = useState("");
  const [budgetType, setBudgetType] = useState("daily");
  const [dailyBudget, setDailyBudget] = useState("");
  
  // Targeting state
  const [ageMin, setAgeMin] = useState(18);
  const [ageMax, setAgeMax] = useState(65);
  const [genders, setGenders] = useState<string[]>(["all"]);
  const [countries, setCountries] = useState("");
  const [interests, setInterests] = useState("");
  const [adSetName, setAdSetName] = useState("");
  
  // Creative state
  const [adName, setAdName] = useState("");
  const [adCopy, setAdCopy] = useState("");
  const [headline, setHeadline] = useState("");
  const [description, setDescription] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [callToAction, setCallToAction] = useState("LEARN_MORE");
  const [imageUrl, setImageUrl] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [imagePreview, setImagePreview] = useState("");
  const [videoPreview, setVideoPreview] = useState("");

  // Fetch ad accounts
  const { data: adAccounts = [] } = useQuery<any[]>({
    queryKey: ["/api/facebook/ad-accounts"],
  });

  // Fetch Facebook pages for selected ad account
  const { data: facebookPages = [] } = useQuery<any[]>({
    queryKey: ["/api/facebook/pages", adAccountId],
    enabled: !!adAccountId,
  });

  // Fetch campaign drafts
  const { data: drafts = [], isLoading: draftsLoading } = useQuery<any[]>({
    queryKey: ["/api/campaign-drafts"],
  });

  // Create/Update draft mutation
  const saveDraftMutation = useMutation({
    mutationFn: async (draftData: any) => {
      if (editingDraftId) {
        return await apiRequest("PUT", `/api/campaign-drafts/${editingDraftId}`, draftData);
      }
      return await apiRequest("POST", "/api/campaign-drafts", draftData);
    },
    onSuccess: () => {
      toast({ title: "Success", description: editingDraftId ? "Draft updated successfully" : "Draft saved successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/campaign-drafts"] });
      resetForm();
      setShowWizard(false);
      setEditingDraftId(null);
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to save draft", variant: "destructive" });
    },
  });

  // Publish draft mutation
  const publishDraftMutation = useMutation({
    mutationFn: async (draftId: string) => {
      return await apiRequest("POST", `/api/campaign-drafts/${draftId}/publish`);
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
      return await apiRequest("DELETE", `/api/campaign-drafts/${draftId}`);
    },
    onSuccess: () => {
      toast({ title: "Deleted", description: "Draft deleted successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/campaign-drafts"] });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to delete draft", variant: "destructive" });
    },
  });

  // Sync Facebook data mutation
  const syncFacebookMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", "/api/facebook/sync-accounts");
    },
    onSuccess: (data: any) => {
      const message = data.message || "Facebook data synced successfully";
      toast({ 
        title: "Synced!", 
        description: message
      });
      queryClient.invalidateQueries({ queryKey: ["/api/facebook/ad-accounts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/facebook/pages"] });
    },
    onError: (error: any) => {
      toast({ title: "Sync Failed", description: error.message || "Failed to sync with Facebook", variant: "destructive" });
    },
  });

  const resetForm = () => {
    setDraftName("");
    setAdAccountId("");
    setPageId("");
    setObjective("");
    setCampaignName("");
    setBudgetType("daily");
    setDailyBudget("");
    setAgeMin(18);
    setAgeMax(65);
    setGenders(["all"]);
    setCountries("");
    setInterests("");
    setAdSetName("");
    setAdName("");
    setAdCopy("");
    setHeadline("");
    setDescription("");
    setWebsiteUrl("");
    setCallToAction("LEARN_MORE");
    setImageUrl("");
    setVideoUrl("");
    setImagePreview("");
    setVideoPreview("");
    setCurrentStep(1);
    setEditingDraftId(null);
  };

  const loadDraft = (draft: any) => {
    setEditingDraftId(draft.id);
    setDraftName(draft.draftName || "");
    setAdAccountId(draft.adAccountId || "");
    setPageId(draft.pageId || "");
    setObjective(draft.objective || "");
    setCampaignName(draft.campaignName || "");
    setBudgetType(draft.budgetType || "daily");
    setDailyBudget(draft.dailyBudget ? draft.dailyBudget.toString() : "");
    
    // Parse targeting JSON with fallback to defaults
    if (draft.targeting) {
      try {
        const targeting = typeof draft.targeting === 'string' ? JSON.parse(draft.targeting) : draft.targeting;
        setAgeMin(targeting.age_min || 18);
        setAgeMax(targeting.age_max || 65);
        setGenders(targeting.genders || ["all"]);
        setCountries(targeting.geo_locations?.countries?.join(', ') || "");
        setInterests(targeting.interests?.join(', ') || "");
      } catch (e) {
        console.error("Error parsing targeting data:", e);
        // Reset to defaults on parse error
        setAgeMin(18);
        setAgeMax(65);
        setGenders(["all"]);
        setCountries("");
        setInterests("");
      }
    } else {
      // No targeting data, use defaults
      setAgeMin(18);
      setAgeMax(65);
      setGenders(["all"]);
      setCountries("");
      setInterests("");
    }
    
    setAdSetName(draft.adSetName || "");
    setAdName(draft.adName || "");
    setAdCopy(draft.adCopy || "");
    setHeadline(draft.headline || "");
    setDescription(draft.description || "");
    setWebsiteUrl(draft.websiteUrl || "");
    setCallToAction(draft.callToAction || "LEARN_MORE");
    setImageUrl(draft.imageUrl || "");
    setVideoUrl(draft.videoUrl || "");
    setImagePreview(draft.imageUrl || "");
    setVideoPreview(draft.videoUrl || "");
    
    setShowWizard(true);
    setCurrentStep(1);
  };

  const handleSaveDraft = () => {
    if (!draftName || !adAccountId || !objective || !campaignName) {
      toast({ title: "Error", description: "Please fill in all required fields", variant: "destructive" });
      return;
    }

    const targeting = JSON.stringify({
      age_min: ageMin,
      age_max: ageMax,
      genders: genders,
      geo_locations: { countries: countries.split(',').map(c => c.trim()).filter(c => c) },
      interests: interests.split(',').map(i => i.trim()).filter(i => i),
    });

    const draftData = {
      draftName,
      adAccountId,
      pageId: pageId || null,
      objective,
      campaignName,
      budgetType,
      dailyBudget: dailyBudget ? parseFloat(dailyBudget) : null,
      targeting,
      adSetName,
      adName,
      adCopy,
      headline,
      description,
      websiteUrl,
      callToAction,
      imageUrl,
      videoUrl,
      status: "draft",
    };

    saveDraftMutation.mutate(draftData);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
        setImageUrl(URL.createObjectURL(file));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleVideoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setVideoPreview(url);
      setVideoUrl(url);
    }
  };

  const toggleGender = (gender: string) => {
    if (gender === "all") {
      setGenders(["all"]);
    } else {
      const newGenders = genders.filter(g => g !== "all");
      if (newGenders.includes(gender)) {
        const filtered = newGenders.filter(g => g !== gender);
        setGenders(filtered.length === 0 ? ["all"] : filtered);
      } else {
        setGenders([...newGenders, gender]);
      }
    }
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
    <Sidebar>
      <div className="flex-1 overflow-auto">
        <div className="p-6 space-y-6">
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
            <div className="flex gap-2">
              <Button 
                onClick={() => syncFacebookMutation.mutate()} 
                variant="outline" 
                size="lg" 
                disabled={syncFacebookMutation.isPending}
                data-testid="button-sync-facebook"
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${syncFacebookMutation.isPending ? 'animate-spin' : ''}`} />
                {syncFacebookMutation.isPending ? 'Syncing...' : 'Sync with FB'}
              </Button>
              <Button onClick={() => setShowWizard(!showWizard)} size="lg" data-testid="button-new-campaign">
                <Plus className="w-4 h-4 mr-2" />
                New Campaign
              </Button>
            </div>
          </div>

      {showWizard && (
        <Card>
          <CardHeader>
            <CardTitle>Campaign Creation Wizard</CardTitle>
            <CardDescription>Step {currentStep} of 3: {currentStep === 1 ? "Campaign Setup" : currentStep === 2 ? "Budget & Audience Targeting" : "Creative Assets & Media"}</CardDescription>
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
                  <Select value={adAccountId} onValueChange={(value) => {
                    setAdAccountId(value);
                    setPageId("");
                  }}>
                    <SelectTrigger id="ad-account" data-testid="select-ad-account">
                      <SelectValue placeholder="Select ad account" />
                    </SelectTrigger>
                    <SelectContent>
                      {adAccounts.map((account: any) => (
                        <SelectItem key={account.id} value={account.id}>
                          {account.name} ({account.platform})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="page">Facebook Page</Label>
                  <Select value={pageId} onValueChange={setPageId} disabled={!adAccountId || facebookPages.length === 0}>
                    <SelectTrigger id="page" data-testid="select-page">
                      <SelectValue placeholder={!adAccountId ? "Select ad account first" : facebookPages.length === 0 ? "No pages found - connect Facebook" : "Select a page"} />
                    </SelectTrigger>
                    <SelectContent>
                      {facebookPages.map((page: any) => (
                        <SelectItem key={page.id} value={page.id}>
                          {page.pageName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-gray-500">
                    {facebookPages.length === 0 && adAccountId ? "No pages found. Make sure your Facebook account is connected." : "Select the page where your ad will be published"}
                  </p>
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
              <div className="space-y-6">
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Budget</h3>
                  <div className="grid grid-cols-2 gap-4">
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

                <div className="space-y-4 pt-4 border-t">
                  <h3 className="text-lg font-semibold">Audience Targeting</h3>
                  
                  <div className="space-y-2">
                    <Label>Age Range: {ageMin} - {ageMax}</Label>
                    <div className="flex gap-4 items-center">
                      <span className="text-sm text-gray-600">18</span>
                      <Slider
                        min={18}
                        max={65}
                        step={1}
                        value={[ageMin, ageMax]}
                        onValueChange={(values) => {
                          setAgeMin(values[0]);
                          setAgeMax(values[1]);
                        }}
                        className="flex-1"
                        data-testid="slider-age-range"
                      />
                      <span className="text-sm text-gray-600">65+</span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Gender</Label>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant={genders.includes("all") ? "default" : "outline"}
                        size="sm"
                        onClick={() => toggleGender("all")}
                        data-testid="button-gender-all"
                      >
                        All
                      </Button>
                      <Button
                        type="button"
                        variant={genders.includes("male") ? "default" : "outline"}
                        size="sm"
                        onClick={() => toggleGender("male")}
                        data-testid="button-gender-male"
                      >
                        Male
                      </Button>
                      <Button
                        type="button"
                        variant={genders.includes("female") ? "default" : "outline"}
                        size="sm"
                        onClick={() => toggleGender("female")}
                        data-testid="button-gender-female"
                      >
                        Female
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="countries">Countries (comma-separated)</Label>
                    <Input
                      id="countries"
                      value={countries}
                      onChange={(e) => setCountries(e.target.value)}
                      placeholder="US, CA, GB, AU"
                      data-testid="input-countries"
                    />
                    <p className="text-xs text-gray-500">Enter 2-letter country codes separated by commas</p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="interests">Interests (comma-separated)</Label>
                    <Textarea
                      id="interests"
                      value={interests}
                      onChange={(e) => setInterests(e.target.value)}
                      placeholder="Technology, E-commerce, Digital Marketing"
                      rows={3}
                      data-testid="textarea-interests"
                    />
                    <p className="text-xs text-gray-500">Enter interests or behaviors to target</p>
                  </div>
                </div>
              </div>
            )}

            {currentStep === 3 && (
              <div className="space-y-6">
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Ad Details</h3>
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
                    <Label htmlFor="description">Description (Optional)</Label>
                    <Input
                      id="description"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Shop our latest collection"
                      data-testid="input-description"
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

                  <div className="grid grid-cols-2 gap-4">
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
                </div>

                <div className="space-y-4 pt-4 border-t">
                  <h3 className="text-lg font-semibold">Creative Assets</h3>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Ad Image</Label>
                      <div className="border-2 border-dashed rounded-lg p-4 text-center">
                        {imagePreview ? (
                          <div className="relative">
                            <img src={imagePreview} alt="Preview" className="max-h-48 mx-auto rounded" />
                            <Button
                              type="button"
                              variant="destructive"
                              size="sm"
                              className="absolute top-2 right-2"
                              onClick={() => {
                                setImagePreview("");
                                setImageUrl("");
                              }}
                              data-testid="button-remove-image"
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                        ) : (
                          <label htmlFor="image-upload" className="cursor-pointer">
                            <ImageIcon className="w-12 h-12 mx-auto text-gray-400 mb-2" />
                            <p className="text-sm text-gray-600">Click to upload image</p>
                            <p className="text-xs text-gray-400">JPG, PNG up to 10MB</p>
                            <input
                              id="image-upload"
                              type="file"
                              accept="image/*"
                              onChange={handleImageUpload}
                              className="hidden"
                              data-testid="input-image-upload"
                            />
                          </label>
                        )}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Ad Video (Optional)</Label>
                      <div className="border-2 border-dashed rounded-lg p-4 text-center">
                        {videoPreview ? (
                          <div className="relative">
                            <video src={videoPreview} controls className="max-h-48 mx-auto rounded" />
                            <Button
                              type="button"
                              variant="destructive"
                              size="sm"
                              className="absolute top-2 right-2"
                              onClick={() => {
                                setVideoPreview("");
                                setVideoUrl("");
                              }}
                              data-testid="button-remove-video"
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                        ) : (
                          <label htmlFor="video-upload" className="cursor-pointer">
                            <Video className="w-12 h-12 mx-auto text-gray-400 mb-2" />
                            <p className="text-sm text-gray-600">Click to upload video</p>
                            <p className="text-xs text-gray-400">MP4, MOV up to 100MB</p>
                            <input
                              id="video-upload"
                              type="file"
                              accept="video/*"
                              onChange={handleVideoUpload}
                              className="hidden"
                              data-testid="input-video-upload"
                            />
                          </label>
                        )}
                      </div>
                    </div>
                  </div>
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
                  <Button onClick={handleSaveDraft} disabled={saveDraftMutation.isPending} data-testid="button-save-draft">
                    {saveDraftMutation.isPending ? "Saving..." : editingDraftId ? "Update Draft" : "Save Draft"}
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
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => loadDraft(draft)}
                          data-testid={`button-edit-${draft.id}`}
                        >
                          <Edit className="w-3 h-3 mr-1" />
                          Edit
                        </Button>
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
      </div>
    </Sidebar>
  );
}
