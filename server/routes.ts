import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import multer from "multer";
import { parse } from "csv-parse/sync";
import { 
  loginSchema, 
  insertCampaignSchema, 
  insertClientSchema,
  insertUserWithRoleSchema,
  insertAdAccountSchema,
  insertAdCopySetSchema,
  insertWorkReportSchema,
  insertRolePermissionSchema,
  insertFinanceProjectSchema,
  insertFinancePaymentSchema,
  insertFinanceExpenseSchema,
  insertFinanceSettingSchema,
  insertTagSchema,
  insertEmployeeSchema,
  type Campaign,
  type Client,
  type User,
  type AdAccount,
  type AdCopySet,
  type WorkReport,
  type Page,
  type RolePermission,
  type FinanceProject,
  type FinancePayment,
  type FinanceExpense,
  type FinanceSetting,
  type Tag,
  type Employee,
  UserRole 
} from "@shared/schema";
import { z } from "zod";

// Extend Express Request to include user
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        username: string;
        role: string;
      };
    }
  }
}

// Middleware to authenticate requests
async function authenticate(req: Request, res: Response, next: Function) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  
  if (!token) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  try {
    const session = await storage.getSessionByToken(token);
    if (!session) {
      return res.status(401).json({ message: "Invalid or expired session" });
    }

    const user = await storage.getUser(session.userId!);
    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }

    req.user = {
      id: user.id,
      username: user.username,
      role: user.role,
    };

    next();
  } catch (error) {
    return res.status(500).json({ message: "Authentication error" });
  }
}

// Middleware to check Super Admin role
async function requireSuperAdmin(req: Request, res: Response, next: Function) {
  if (!req.user || req.user.role !== UserRole.SUPER_ADMIN) {
    return res.status(403).json({ message: "Super Admin access required" });
  }
  next();
}

// Middleware to check Admin or Super Admin role
async function requireAdminOrSuperAdmin(req: Request, res: Response, next: Function) {
  if (!req.user || (req.user.role !== UserRole.ADMIN && req.user.role !== UserRole.SUPER_ADMIN)) {
    return res.status(403).json({ message: "Admin access required" });
  }
  next();
}

// Middleware factory to check page permissions
function requirePagePermission(pageKey: string, action: 'view' | 'edit' | 'delete' = 'view', options: { superAdminBypass?: boolean } = {}) {
  return async (req: Request, res: Response, next: Function) => {
    if (!req.user) {
      return res.status(401).json({ message: "Authentication required" });
    }

    // Super Admin bypass only for emergency access (admin/permissions endpoints)
    if (options.superAdminBypass && req.user.role === UserRole.SUPER_ADMIN) {
      return next();
    }

    try {
      const hasPermission = await storage.checkUserPagePermission(req.user.id, pageKey, action);
      if (!hasPermission) {
        return res.status(403).json({ 
          message: `Access denied. You don't have ${action} permission for this page.`
        });
      }
      next();
    } catch (error) {
      console.error("Permission check error:", error);
      return res.status(500).json({ message: "Permission check failed" });
    }
  };
}

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV files are allowed'), false);
    }
  },
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Login route
  app.post("/api/auth/login", async (req: Request, res: Response) => {
    try {
      const validatedData = loginSchema.parse(req.body);
      const { username, password } = validatedData;

      const user = await storage.validateCredentials(username, password);
      
      if (!user) {
        return res.status(401).json({ message: "Invalid username or password" });
      }

      const session = await storage.createSession(user.id);

      res.json({
        user: {
          id: user.id,
          username: user.username,
          role: user.role,
          name: user.name,
        },
        token: session.token,
        expiresAt: session.expiresAt,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input", errors: error.errors });
      }
      console.error("Login error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Logout route
  app.post("/api/auth/logout", authenticate, async (req: Request, res: Response) => {
    try {
      const token = req.headers.authorization?.replace('Bearer ', '');
      if (token) {
        await storage.deleteSession(token);
      }
      res.json({ message: "Logged out successfully" });
    } catch (error) {
      console.error("Logout error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Get current user route
  app.get("/api/auth/user", authenticate, async (req: Request, res: Response) => {
    res.json(req.user);
  });

  // Campaign Routes
  // Get all campaigns
  app.get("/api/campaigns", authenticate, requirePagePermission('campaigns', 'view'), async (req: Request, res: Response) => {
    try {
      const campaigns = await storage.getCampaigns();
      res.json(campaigns);
    } catch (error) {
      console.error("Get campaigns error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Get single campaign
  app.get("/api/campaigns/:id", authenticate, requirePagePermission('campaigns', 'view'), async (req: Request, res: Response) => {
    try {
      const campaign = await storage.getCampaign(req.params.id);
      if (!campaign) {
        return res.status(404).json({ message: "Campaign not found" });
      }
      res.json(campaign);
    } catch (error) {
      console.error("Get campaign error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Create new campaign
  app.post("/api/campaigns", authenticate, requirePagePermission('campaigns', 'edit'), async (req: Request, res: Response) => {
    try {
      const validatedData = insertCampaignSchema.parse(req.body);
      
      // Validate that client exists if clientId is provided
      if (validatedData.clientId) {
        const client = await storage.getClient(validatedData.clientId);
        if (!client) {
          return res.status(400).json({ message: "Client not found" });
        }
      }
      
      const campaign = await storage.createCampaign(validatedData);
      res.status(201).json(campaign);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input", errors: error.errors });
      }
      console.error("Create campaign error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Update campaign
  app.put("/api/campaigns/:id", authenticate, requirePagePermission('campaigns', 'edit'), async (req: Request, res: Response) => {
    try {
      const validatedData = insertCampaignSchema.partial().parse(req.body);
      
      // Validate that client exists if clientId is being updated
      if (validatedData.clientId) {
        const client = await storage.getClient(validatedData.clientId);
        if (!client) {
          return res.status(400).json({ message: "Client not found" });
        }
      }
      
      const campaign = await storage.updateCampaign(req.params.id, validatedData);
      if (!campaign) {
        return res.status(404).json({ message: "Campaign not found" });
      }
      res.json(campaign);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input", errors: error.errors });
      }
      console.error("Update campaign error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Add campaign comment
  app.post("/api/campaigns/:id/comments", authenticate, requirePagePermission('campaigns', 'edit'), async (req: Request, res: Response) => {
    try {
      const { comment } = req.body;
      if (!comment || !comment.trim()) {
        return res.status(400).json({ message: "Comment is required" });
      }

      const campaign = await storage.getCampaign(req.params.id);
      if (!campaign) {
        return res.status(404).json({ message: "Campaign not found" });
      }

      // Add the new comment to existing comments
      const existingComments = campaign.comments || "";
      const newComments = existingComments 
        ? `${existingComments}\n\n[${new Date().toISOString()}] ${req.user?.username}: ${comment.trim()}`
        : `[${new Date().toISOString()}] ${req.user?.username}: ${comment.trim()}`;

      const updatedCampaign = await storage.updateCampaign(req.params.id, {
        comments: newComments
      });

      if (!updatedCampaign) {
        return res.status(404).json({ message: "Campaign not found" });
      }

      res.json({ 
        message: "Comment added successfully",
        campaign: updatedCampaign
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to add comment" });
    }
  });

  // Delete campaign
  app.delete("/api/campaigns/:id", authenticate, requirePagePermission('campaigns', 'delete'), async (req: Request, res: Response) => {
    try {
      const deleted = await storage.deleteCampaign(req.params.id);
      if (!deleted) {
        return res.status(404).json({ message: "Campaign not found" });
      }
      res.json({ message: "Campaign deleted successfully" });
    } catch (error) {
      console.error("Delete campaign error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Client Routes
  // Get all clients
  app.get("/api/clients", authenticate, requirePagePermission('clients', 'view'), async (req: Request, res: Response) => {
    try {
      const clients = await storage.getClients();
      res.json(clients);
    } catch (error) {
      console.error("Get clients error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Get single client
  app.get("/api/clients/:id", authenticate, requirePagePermission('clients', 'view'), async (req: Request, res: Response) => {
    try {
      const client = await storage.getClient(req.params.id);
      if (!client) {
        return res.status(404).json({ message: "Client not found" });
      }
      res.json(client);
    } catch (error) {
      console.error("Get client error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Create new client
  app.post("/api/clients", authenticate, requirePagePermission('clients', 'edit'), async (req: Request, res: Response) => {
    try {
      const validatedData = insertClientSchema.parse(req.body);
      const client = await storage.createClient(validatedData);
      res.status(201).json(client);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input", errors: error.errors });
      }
      console.error("Create client error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Update client
  app.put("/api/clients/:id", authenticate, requirePagePermission('clients', 'edit'), async (req: Request, res: Response) => {
    try {
      const validatedData = insertClientSchema.partial().parse(req.body);
      const client = await storage.updateClient(req.params.id, validatedData);
      if (!client) {
        return res.status(404).json({ message: "Client not found" });
      }
      res.json(client);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input", errors: error.errors });
      }
      console.error("Update client error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Delete client
  app.delete("/api/clients/:id", authenticate, requirePagePermission('clients', 'delete'), async (req: Request, res: Response) => {
    try {
      const deleted = await storage.deleteClient(req.params.id);
      if (!deleted) {
        return res.status(404).json({ message: "Client not found" });
      }
      res.json({ message: "Client deleted successfully" });
    } catch (error) {
      console.error("Delete client error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // User Management Routes (Super Admin only)
  // Get all users
  app.get("/api/users", authenticate, requirePagePermission('admin', 'view', { superAdminBypass: true }), async (req: Request, res: Response) => {
    try {
      const users = await storage.getAllUsers();
      res.json(users);
    } catch (error) {
      console.error("Get users error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Create new user
  app.post("/api/users", authenticate, requirePagePermission('admin', 'edit', { superAdminBypass: true }), async (req: Request, res: Response) => {
    try {
      const validatedData = insertUserWithRoleSchema.parse(req.body);
      const user = await storage.createUser(validatedData);
      res.status(201).json(user);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input", errors: error.errors });
      }
      console.error("Create user error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Update user (role changes)
  app.put("/api/users/:id", authenticate, requirePagePermission('admin', 'edit', { superAdminBypass: true }), async (req: Request, res: Response) => {
    try {
      const validatedData = insertUserWithRoleSchema.partial().parse(req.body);
      const user = await storage.updateUser(req.params.id, validatedData);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      res.json(user);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input", errors: error.errors });
      }
      console.error("Update user error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Delete user
  app.delete("/api/users/:id", authenticate, requirePagePermission('admin', 'delete', { superAdminBypass: true }), async (req: Request, res: Response) => {
    try {
      const deleted = await storage.deleteUser(req.params.id);
      if (!deleted) {
        return res.status(404).json({ message: "User not found" });
      }
      res.json({ message: "User deleted successfully" });
    } catch (error) {
      console.error("Delete user error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Ad Accounts Routes
  // Get all ad accounts
  app.get("/api/ad-accounts", authenticate, requirePagePermission('ad_accounts', 'view'), async (req: Request, res: Response) => {
    try {
      const adAccounts = await storage.getAdAccounts();
      res.json(adAccounts);
    } catch (error) {
      console.error("Get ad accounts error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Get single ad account
  app.get("/api/ad-accounts/:id", authenticate, requirePagePermission('ad_accounts', 'view'), async (req: Request, res: Response) => {
    try {
      const adAccount = await storage.getAdAccount(req.params.id);
      if (!adAccount) {
        return res.status(404).json({ message: "Ad account not found" });
      }
      res.json(adAccount);
    } catch (error) {
      console.error("Get ad account error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Create new ad account
  app.post("/api/ad-accounts", authenticate, requirePagePermission('ad_accounts', 'edit'), async (req: Request, res: Response) => {
    try {
      const validatedData = insertAdAccountSchema.parse(req.body);
      
      // Validate that client exists
      const client = await storage.getClient(validatedData.clientId);
      if (!client) {
        return res.status(400).json({ message: "Client not found" });
      }
      
      const adAccount = await storage.createAdAccount(validatedData);
      res.status(201).json(adAccount);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input", errors: error.errors });
      }
      console.error("Create ad account error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Update ad account
  app.put("/api/ad-accounts/:id", authenticate, requirePagePermission('ad_accounts', 'edit'), async (req: Request, res: Response) => {
    try {
      const validatedData = insertAdAccountSchema.partial().parse(req.body);
      
      // Validate that client exists if clientId is being updated
      if (validatedData.clientId) {
        const client = await storage.getClient(validatedData.clientId);
        if (!client) {
          return res.status(400).json({ message: "Client not found" });
        }
      }
      
      const adAccount = await storage.updateAdAccount(req.params.id, validatedData);
      if (!adAccount) {
        return res.status(404).json({ message: "Ad account not found" });
      }
      res.json(adAccount);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input", errors: error.errors });
      }
      console.error("Update ad account error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Delete ad account
  app.delete("/api/ad-accounts/:id", authenticate, requirePagePermission('ad_accounts', 'delete'), async (req: Request, res: Response) => {
    try {
      const deleted = await storage.deleteAdAccount(req.params.id);
      if (!deleted) {
        return res.status(404).json({ message: "Ad account not found" });
      }
      res.json({ message: "Ad account deleted successfully" });
    } catch (error) {
      console.error("Delete ad account error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // ====== AD COPY SETS ROUTES ======
  
  // Get ad copy sets for a campaign
  app.get("/api/campaigns/:campaignId/ad-copy-sets", authenticate, requirePagePermission('campaigns', 'view'), async (req: Request, res: Response) => {
    try {
      const { campaignId } = req.params;
      const adCopySets = await storage.getAdCopySets(campaignId);
      res.json(adCopySets);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch ad copy sets" });
    }
  });

  // Get single ad copy set
  app.get("/api/ad-copy-sets/:id", authenticate, requirePagePermission('campaigns', 'view'), async (req: Request, res: Response) => {
    try {
      const adCopySet = await storage.getAdCopySet(req.params.id);
      if (!adCopySet) {
        return res.status(404).json({ message: "Ad copy set not found" });
      }
      res.json(adCopySet);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch ad copy set" });
    }
  });

  // Create new ad copy set
  app.post("/api/campaigns/:campaignId/ad-copy-sets", authenticate, requirePagePermission('campaigns', 'edit'), async (req: Request, res: Response) => {
    try {
      const { campaignId } = req.params;
      const validatedData = insertAdCopySetSchema.parse({
        ...req.body,
        campaignId,
      });
      
      // Validate that campaign exists
      const campaign = await storage.getCampaign(campaignId);
      if (!campaign) {
        return res.status(400).json({ message: "Campaign not found" });
      }

      const adCopySet = await storage.createAdCopySet(validatedData);
      res.status(201).json(adCopySet);
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create ad copy set" });
    }
  });

  // Update ad copy set
  app.put("/api/ad-copy-sets/:id", authenticate, requirePagePermission('campaigns', 'edit'), async (req: Request, res: Response) => {
    try {
      const validatedData = insertAdCopySetSchema.partial().parse(req.body);
      const adCopySet = await storage.updateAdCopySet(req.params.id, validatedData);
      
      if (!adCopySet) {
        return res.status(404).json({ message: "Ad copy set not found" });
      }
      
      res.json(adCopySet);
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update ad copy set" });
    }
  });

  // Set active ad copy set
  app.put("/api/campaigns/:campaignId/ad-copy-sets/:id/set-active", authenticate, requirePagePermission('campaigns', 'edit'), async (req: Request, res: Response) => {
    try {
      const { campaignId, id } = req.params;
      const success = await storage.setActiveAdCopySet(campaignId, id);
      
      if (!success) {
        return res.status(400).json({ message: "Failed to set active ad copy set" });
      }
      
      res.json({ message: "Ad copy set set as active" });
    } catch (error) {
      res.status(500).json({ message: "Failed to set active ad copy set" });
    }
  });

  // Delete ad copy set
  app.delete("/api/ad-copy-sets/:id", authenticate, requirePagePermission('campaigns', 'delete'), async (req: Request, res: Response) => {
    try {
      const deleted = await storage.deleteAdCopySet(req.params.id);
      if (!deleted) {
        return res.status(404).json({ message: "Ad copy set not found" });
      }
      res.json({ message: "Ad copy set deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete ad copy set" });
    }
  });

  // Work Report Routes
  
  // Get work reports - users see only their own, admins see all
  app.get("/api/work-reports", authenticate, requirePagePermission('work_reports', 'view'), async (req: Request, res: Response) => {
    try {
      let workReports: WorkReport[];
      
      if (req.user!.role === UserRole.ADMIN || req.user!.role === UserRole.SUPER_ADMIN) {
        // Admin/Super Admin can see all work reports
        workReports = await storage.getWorkReports();
      } else {
        // Regular users see only their own work reports
        workReports = await storage.getWorkReports(req.user!.id);
      }
      
      res.json(workReports);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch work reports" });
    }
  });

  // Get single work report - check ownership or admin access
  app.get("/api/work-reports/:id", authenticate, requirePagePermission('work_reports', 'view'), async (req: Request, res: Response) => {
    try {
      const workReport = await storage.getWorkReport(req.params.id);
      if (!workReport) {
        return res.status(404).json({ message: "Work report not found" });
      }
      
      // Check if user can access this work report
      const isAdmin = req.user!.role === UserRole.ADMIN || req.user!.role === UserRole.SUPER_ADMIN;
      const isOwner = workReport.userId === req.user!.id;
      
      if (!isAdmin && !isOwner) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      res.json(workReport);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch work report" });
    }
  });

  // Create new work report
  app.post("/api/work-reports", authenticate, requirePagePermission('work_reports', 'edit'), async (req: Request, res: Response) => {
    try {
      let validatedData;
      
      if (req.user!.role === UserRole.ADMIN || req.user!.role === UserRole.SUPER_ADMIN) {
        // Admin can create work reports for any user (if userId is provided)
        validatedData = insertWorkReportSchema.parse({
          ...req.body,
          userId: req.body.userId || req.user!.id // Default to current user if not specified
        });
      } else {
        // Regular users can only create work reports for themselves
        validatedData = insertWorkReportSchema.parse({
          ...req.body,
          userId: req.user!.id // Force current user
        });
      }
      
      const workReport = await storage.createWorkReport(validatedData);
      res.status(201).json(workReport);
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create work report" });
    }
  });

  // Update work report - check ownership or admin access
  app.put("/api/work-reports/:id", authenticate, requirePagePermission('work_reports', 'edit'), async (req: Request, res: Response) => {
    try {
      const existingReport = await storage.getWorkReport(req.params.id);
      if (!existingReport) {
        return res.status(404).json({ message: "Work report not found" });
      }
      
      // Check if user can update this work report
      const isAdmin = req.user!.role === UserRole.ADMIN || req.user!.role === UserRole.SUPER_ADMIN;
      const isOwner = existingReport.userId === req.user!.id;
      
      if (!isAdmin && !isOwner) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const validatedData = insertWorkReportSchema.partial().parse(req.body);
      
      // Prevent non-admin users from changing userId
      if (!isAdmin && validatedData.userId && validatedData.userId !== req.user!.id) {
        return res.status(403).json({ message: "Cannot change work report owner" });
      }
      
      const workReport = await storage.updateWorkReport(req.params.id, validatedData);
      res.json(workReport);
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update work report" });
    }
  });

  // Delete work report - check ownership or admin access
  app.delete("/api/work-reports/:id", authenticate, requirePagePermission('work_reports', 'delete'), async (req: Request, res: Response) => {
    try {
      const existingReport = await storage.getWorkReport(req.params.id);
      if (!existingReport) {
        return res.status(404).json({ message: "Work report not found" });
      }
      
      // Check if user can delete this work report
      const isAdmin = req.user!.role === UserRole.ADMIN || req.user!.role === UserRole.SUPER_ADMIN;
      const isOwner = existingReport.userId === req.user!.id;
      
      if (!isAdmin && !isOwner) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const deleted = await storage.deleteWorkReport(req.params.id);
      if (!deleted) {
        return res.status(404).json({ message: "Work report not found" });
      }
      
      res.json({ message: "Work report deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete work report" });
    }
  });

  // === PAGE PERMISSIONS ROUTES ===
  
  // Get all pages (Super Admin only)
  app.get("/api/pages", authenticate, requirePagePermission('admin', 'view', { superAdminBypass: true }), async (req: Request, res: Response) => {
    try {
      const pages = await storage.getPages();
      res.json(pages);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch pages" });
    }
  });

  // Get all role permissions (Super Admin only)
  app.get("/api/role-permissions", authenticate, requirePagePermission('admin', 'view', { superAdminBypass: true }), async (req: Request, res: Response) => {
    try {
      const permissions = await storage.getRolePermissions();
      res.json(permissions);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch role permissions" });
    }
  });

  // Get role permissions for a specific role (Super Admin only)
  app.get("/api/role-permissions/:role", authenticate, requirePagePermission('admin', 'view', { superAdminBypass: true }), async (req: Request, res: Response) => {
    try {
      const permissions = await storage.getRolePermissions(req.params.role);
      res.json(permissions);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch role permissions" });
    }
  });

  // Update role permission (Super Admin only)
  app.put("/api/role-permissions/:id", authenticate, requirePagePermission('admin', 'edit', { superAdminBypass: true }), async (req: Request, res: Response) => {
    try {
      const validatedData = insertRolePermissionSchema.partial().parse(req.body);
      const permission = await storage.updateRolePermission(req.params.id, validatedData);
      
      if (!permission) {
        return res.status(404).json({ message: "Role permission not found" });
      }
      
      res.json(permission);
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update role permission" });
    }
  });

  // Bulk update role permissions (Super Admin only)
  app.put("/api/role-permissions/bulk", authenticate, requirePagePermission('admin', 'edit', { superAdminBypass: true }), async (req: Request, res: Response) => {
    try {
      const updates = z.array(z.object({
        id: z.string(),
        canView: z.boolean().optional(),
        canEdit: z.boolean().optional(),
        canDelete: z.boolean().optional(),
      })).parse(req.body);

      const updatedPermissions = [];
      for (const update of updates) {
        const { id, ...updateData } = update;
        const permission = await storage.updateRolePermission(id, updateData);
        if (permission) {
          updatedPermissions.push(permission);
        }
      }

      res.json(updatedPermissions);
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update role permissions" });
    }
  });

  // Check user permission for a specific page
  app.get("/api/permissions/check/:pageKey", authenticate, async (req: Request, res: Response) => {
    try {
      const { pageKey } = req.params;
      const { action = 'view' } = req.query;
      
      if (!['view', 'edit', 'delete'].includes(action as string)) {
        return res.status(400).json({ message: "Invalid action. Must be 'view', 'edit', or 'delete'" });
      }
      
      const hasPermission = await storage.checkUserPagePermission(
        req.user!.id, 
        pageKey, 
        action as 'view' | 'edit' | 'delete'
      );
      
      res.json({ hasPermission });
    } catch (error) {
      res.status(500).json({ message: "Failed to check permission" });
    }
  });

  // Finance Routes
  
  // Finance Projects
  app.get("/api/finance/projects", authenticate, requirePagePermission('finance', 'view'), async (req: Request, res: Response) => {
    try {
      const projects = await storage.getFinanceProjects();
      res.json(projects);
    } catch (error) {
      console.error("Get finance projects error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/finance/projects/:id", authenticate, requirePagePermission('finance', 'view'), async (req: Request, res: Response) => {
    try {
      const project = await storage.getFinanceProject(req.params.id);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }
      res.json(project);
    } catch (error) {
      console.error("Get finance project error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/finance/projects", authenticate, requirePagePermission('finance', 'edit'), async (req: Request, res: Response) => {
    try {
      const validatedData = insertFinanceProjectSchema.parse(req.body);
      
      // Validate that client exists
      const client = await storage.getClient(validatedData.clientId);
      if (!client) {
        return res.status(400).json({ message: "Client not found" });
      }
      
      const project = await storage.createFinanceProject(validatedData);
      res.status(201).json(project);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input", errors: error.errors });
      }
      console.error("Create finance project error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.put("/api/finance/projects/:id", authenticate, requirePagePermission('finance', 'edit'), async (req: Request, res: Response) => {
    try {
      const validatedData = insertFinanceProjectSchema.partial().parse(req.body);
      
      // Validate that client exists if clientId is being updated
      if (validatedData.clientId) {
        const client = await storage.getClient(validatedData.clientId);
        if (!client) {
          return res.status(400).json({ message: "Client not found" });
        }
      }
      
      const project = await storage.updateFinanceProject(req.params.id, validatedData);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }
      res.json(project);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input", errors: error.errors });
      }
      console.error("Update finance project error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.delete("/api/finance/projects/:id", authenticate, requirePagePermission('finance', 'delete'), async (req: Request, res: Response) => {
    try {
      const deleted = await storage.deleteFinanceProject(req.params.id);
      if (!deleted) {
        return res.status(404).json({ message: "Project not found" });
      }
      res.json({ message: "Project deleted successfully" });
    } catch (error) {
      console.error("Delete finance project error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Finance Payments
  app.get("/api/finance/payments", authenticate, requirePagePermission('finance', 'view'), async (req: Request, res: Response) => {
    try {
      const { projectId } = req.query;
      const payments = await storage.getFinancePayments(projectId as string);
      res.json(payments);
    } catch (error) {
      console.error("Get finance payments error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/finance/payments/:id", authenticate, requirePagePermission('finance', 'view'), async (req: Request, res: Response) => {
    try {
      const payment = await storage.getFinancePayment(req.params.id);
      if (!payment) {
        return res.status(404).json({ message: "Payment not found" });
      }
      res.json(payment);
    } catch (error) {
      console.error("Get finance payment error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/finance/payments", authenticate, requirePagePermission('finance', 'edit'), async (req: Request, res: Response) => {
    try {
      const validatedData = insertFinancePaymentSchema.parse(req.body);
      
      // Validate that client and project exist
      const client = await storage.getClient(validatedData.clientId);
      if (!client) {
        return res.status(400).json({ message: "Client not found" });
      }
      
      const project = await storage.getFinanceProject(validatedData.projectId);
      if (!project) {
        return res.status(400).json({ message: "Project not found" });
      }
      
      const payment = await storage.createFinancePayment(validatedData);
      res.status(201).json(payment);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input", errors: error.errors });
      }
      console.error("Create finance payment error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.put("/api/finance/payments/:id", authenticate, requirePagePermission('finance', 'edit'), async (req: Request, res: Response) => {
    try {
      const validatedData = insertFinancePaymentSchema.partial().parse(req.body);
      
      const payment = await storage.updateFinancePayment(req.params.id, validatedData);
      if (!payment) {
        return res.status(404).json({ message: "Payment not found" });
      }
      res.json(payment);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input", errors: error.errors });
      }
      console.error("Update finance payment error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.delete("/api/finance/payments/:id", authenticate, requirePagePermission('finance', 'delete'), async (req: Request, res: Response) => {
    try {
      const deleted = await storage.deleteFinancePayment(req.params.id);
      if (!deleted) {
        return res.status(404).json({ message: "Payment not found" });
      }
      res.json({ message: "Payment deleted successfully" });
    } catch (error) {
      console.error("Delete finance payment error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Finance Expenses
  app.get("/api/finance/expenses", authenticate, requirePagePermission('finance', 'view'), async (req: Request, res: Response) => {
    try {
      const { projectId } = req.query;
      const expenses = await storage.getFinanceExpenses(projectId as string);
      res.json(expenses);
    } catch (error) {
      console.error("Get finance expenses error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/finance/expenses/:id", authenticate, requirePagePermission('finance', 'view'), async (req: Request, res: Response) => {
    try {
      const expense = await storage.getFinanceExpense(req.params.id);
      if (!expense) {
        return res.status(404).json({ message: "Expense not found" });
      }
      res.json(expense);
    } catch (error) {
      console.error("Get finance expense error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/finance/expenses", authenticate, requirePagePermission('finance', 'edit'), async (req: Request, res: Response) => {
    try {
      const validatedData = insertFinanceExpenseSchema.parse(req.body);
      
      // Validate that project exists if projectId is provided
      if (validatedData.projectId) {
        const project = await storage.getFinanceProject(validatedData.projectId);
        if (!project) {
          return res.status(400).json({ message: "Project not found" });
        }
      }
      
      const expense = await storage.createFinanceExpense(validatedData);
      res.status(201).json(expense);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input", errors: error.errors });
      }
      console.error("Create finance expense error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.put("/api/finance/expenses/:id", authenticate, requirePagePermission('finance', 'edit'), async (req: Request, res: Response) => {
    try {
      const validatedData = insertFinanceExpenseSchema.partial().parse(req.body);
      
      const expense = await storage.updateFinanceExpense(req.params.id, validatedData);
      if (!expense) {
        return res.status(404).json({ message: "Expense not found" });
      }
      res.json(expense);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input", errors: error.errors });
      }
      console.error("Update finance expense error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.delete("/api/finance/expenses/:id", authenticate, requirePagePermission('finance', 'delete'), async (req: Request, res: Response) => {
    try {
      const deleted = await storage.deleteFinanceExpense(req.params.id);
      if (!deleted) {
        return res.status(404).json({ message: "Expense not found" });
      }
      res.json({ message: "Expense deleted successfully" });
    } catch (error) {
      console.error("Delete finance expense error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // CSV Preview for expenses (Step 1: Show data before importing)
  app.post("/api/finance/expenses/import-csv/preview", authenticate, requirePagePermission('finance', 'edit'), upload.single('csvFile'), async (req: Request, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No CSV file uploaded" });
      }

      const csvContent = req.file.buffer.toString('utf-8');
      
      // Parse CSV data
      const records = parse(csvContent, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
      });

      let validRecords: any[] = [];
      let errors: string[] = [];

      // Process each record for preview
      for (let i = 0; i < records.length; i++) {
        const record = records[i] as any;
        const rowNumber = i + 2;

        try {
          // Validate required fields
          if (!record.type || !record.amount || !record.currency || !record.date) {
            errors.push(`Row ${rowNumber}: Missing required fields (type, amount, currency, date)`);
            continue;
          }

          // Normalize and validate type
          const typeLC = record.type.trim().toLowerCase();
          if (!['expense', 'salary'].includes(typeLC)) {
            errors.push(`Row ${rowNumber}: Type must be 'expense' or 'salary', got '${record.type}'`);
            continue;
          }

          // Validate currency
          const currencyUC = record.currency.trim().toUpperCase();
          if (!['USD', 'BDT'].includes(currencyUC)) {
            errors.push(`Row ${rowNumber}: Currency must be 'USD' or 'BDT', got '${record.currency}'`);
            continue;
          }

          // Validate amount
          const amount = parseFloat(record.amount);
          if (isNaN(amount) || amount <= 0) {
            errors.push(`Row ${rowNumber}: Amount must be a positive number, got '${record.amount}'`);
            continue;
          }

          // Validate date format
          const date = new Date(record.date);
          if (isNaN(date.getTime())) {
            errors.push(`Row ${rowNumber}: Date must be in YYYY-MM-DD format, got '${record.date}'`);
            continue;
          }

          // Validate projectId if provided
          let projectId: string | null = null;
          let projectName = 'No Project';
          if (record.projectId && record.projectId.trim() !== '') {
            const project = await storage.getFinanceProject(record.projectId.trim());
            if (!project) {
              errors.push(`Row ${rowNumber}: Project ID '${record.projectId}' not found`);
              continue;
            }
            projectId = record.projectId.trim();
            projectName = project.name;
          }

          // Create validated record for preview
          const validRecord = {
            rowNumber,
            type: typeLC,
            projectId,
            projectName,
            amount: amount.toString(),
            currency: currencyUC,
            date: date.toISOString().split('T')[0],
            notes: record.notes || '',
            originalRow: record
          };

          validRecords.push(validRecord);

        } catch (validationError) {
          if (validationError instanceof z.ZodError) {
            errors.push(`Row ${rowNumber}: ${validationError.errors.map(e => e.message).join(', ')}`);
          } else {
            errors.push(`Row ${rowNumber}: ${validationError instanceof Error ? validationError.message : 'Unknown error'}`);
          }
        }
      }

      res.json({
        message: `Preview ready: ${validRecords.length} valid records, ${errors.length} errors`,
        validRecords,
        totalRows: records.length,
        validCount: validRecords.length,
        errorCount: errors.length,
        errors: errors,
      });

    } catch (error) {
      console.error("CSV Preview error:", error);
      res.status(500).json({ message: "Internal server error during preview" });
    }
  });

  // CSV Import for expenses (Step 2: Actually save the data)
  app.post("/api/finance/expenses/import-csv/confirm", authenticate, requirePagePermission('finance', 'edit'), async (req: Request, res: Response) => {
    try {
      const { validRecords } = req.body;
      
      if (!validRecords || !Array.isArray(validRecords)) {
        return res.status(400).json({ message: "Invalid data: validRecords array required" });
      }

      let imported = 0;
      let errors: string[] = [];

      for (const record of validRecords) {
        try {
          // Create expense data
          const expenseData = {
            type: record.type as 'expense' | 'salary',
            projectId: record.projectId || null,
            amount: record.amount,
            currency: record.currency as 'USD' | 'BDT',
            date: new Date(record.date),
            notes: record.notes || '',
          };

          // Validate with schema
          const validatedData = insertFinanceExpenseSchema.parse(expenseData);
          
          // Create the expense
          await storage.createFinanceExpense(validatedData);
          imported++;

        } catch (validationError) {
          if (validationError instanceof z.ZodError) {
            errors.push(`Row ${record.rowNumber}: ${validationError.errors.map(e => e.message).join(', ')}`);
          } else {
            errors.push(`Row ${record.rowNumber}: ${validationError instanceof Error ? validationError.message : 'Unknown error'}`);
          }
        }
      }

      if (imported === 0 && errors.length > 0) {
        return res.status(400).json({
          message: "No records were imported due to validation errors",
          imported: 0,
          errors: errors.length,
          errorDetails: errors,
        });
      }

      res.json({
        message: `Import completed successfully! ${imported} expenses imported.`,
        imported,
        errors: errors.length,
        errorDetails: errors,
      });

    } catch (error) {
      console.error("CSV Confirm error:", error);
      res.status(500).json({ message: "Internal server error during import" });
    }
  });

  // Finance Settings
  app.get("/api/finance/settings/:key", authenticate, requirePagePermission('finance', 'view'), async (req: Request, res: Response) => {
    try {
      const setting = await storage.getFinanceSetting(req.params.key);
      if (!setting) {
        return res.status(404).json({ message: "Setting not found" });
      }
      res.json(setting);
    } catch (error) {
      console.error("Get finance setting error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/finance/settings", authenticate, requirePagePermission('finance', 'edit'), async (req: Request, res: Response) => {
    try {
      const validatedData = insertFinanceSettingSchema.parse(req.body);
      const setting = await storage.setFinanceSetting(validatedData);
      res.json(setting);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input", errors: error.errors });
      }
      console.error("Set finance setting error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Get exchange rate
  app.get("/api/finance/exchange-rate", authenticate, requirePagePermission('finance', 'view'), async (req: Request, res: Response) => {
    try {
      const rate = await storage.getExchangeRate();
      res.json({ rate });
    } catch (error) {
      console.error("Get exchange rate error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Finance Dashboard Analytics
  app.get("/api/finance/dashboard", authenticate, requirePagePermission('finance', 'view'), async (req: Request, res: Response) => {
    try {
      const { period = 'month' } = req.query;
      
      // Get all data for calculations
      const projects = await storage.getFinanceProjects();
      const payments = await storage.getFinancePayments();
      const expenses = await storage.getFinanceExpenses();
      const exchangeRate = await storage.getExchangeRate();
      
      // Calculate totals for payments
      const totalPaymentsUSD = payments.reduce((sum: number, payment: FinancePayment) => sum + parseFloat(payment.amount), 0);
      const totalPaymentsBDT = payments.reduce((sum: number, payment: FinancePayment) => sum + parseFloat(payment.convertedAmount), 0);
      
      // Calculate totals for expenses (both expense and salary types)
      const totalExpensesBDT = expenses.reduce((sum: number, expense: FinanceExpense) => sum + parseFloat(expense.amount), 0);
      const totalExpensesUSD = totalExpensesBDT / exchangeRate;
      
      // Calculate Available Balance
      const availableBalanceUSD = totalPaymentsUSD - totalExpensesUSD;
      const availableBalanceBDT = totalPaymentsBDT - totalExpensesBDT;
      
      // Legacy calculations for backwards compatibility
      const expensesOnlyBDT = expenses.filter((e: FinanceExpense) => e.type === 'expense').reduce((sum: number, expense: FinanceExpense) => sum + parseFloat(expense.amount), 0);
      const totalSalariesBDT = expenses.filter((e: FinanceExpense) => e.type === 'salary').reduce((sum: number, expense: FinanceExpense) => sum + parseFloat(expense.amount), 0);
      const totalFundUSD = totalPaymentsUSD;
      const totalFundBDT = totalPaymentsBDT;
      const netBalanceBDT = totalPaymentsBDT - expensesOnlyBDT - totalSalariesBDT;
      
      // Group payments by month for chart
      const paymentsByMonth = payments.reduce((acc: Record<string, number>, payment: FinancePayment) => {
        const month = new Date(payment.date).toLocaleString('default', { month: 'short', year: 'numeric' });
        acc[month] = (acc[month] || 0) + parseFloat(payment.amount);
        return acc;
      }, {});
      
      // Group expenses by month for chart
      const expensesByMonth = expenses.reduce((acc: Record<string, { expenses: number, salaries: number }>, expense: FinanceExpense) => {
        const month = new Date(expense.date).toLocaleString('default', { month: 'short', year: 'numeric' });
        if (!acc[month]) acc[month] = { expenses: 0, salaries: 0 };
        if (expense.type === 'expense') {
          acc[month].expenses += parseFloat(expense.amount);
        } else {
          acc[month].salaries += parseFloat(expense.amount);
        }
        return acc;
      }, {});
      
      res.json({
        summary: {
          totalPaymentsUSD,
          totalPaymentsBDT,
          totalExpensesUSD,
          totalExpensesBDT,
          availableBalanceUSD,
          availableBalanceBDT,
          exchangeRate,
          // Legacy fields for backwards compatibility
          totalFundUSD,
          totalFundBDT,
          totalSalariesBDT: totalSalariesBDT,
          netBalanceBDT,
        },
        charts: {
          paymentsByMonth,
          expensesByMonth,
        },
        counts: {
          totalProjects: projects.length,
          activeProjects: projects.filter((p: FinanceProject) => p.status === 'active').length,
          totalPayments: payments.length,
          totalExpenses: expenses.length,
        }
      });
    } catch (error) {
      console.error("Get finance dashboard error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Tag Management Routes - Admin Only
  
  // Get all tags
  app.get("/api/tags", authenticate, requireAdminOrSuperAdmin, async (req: Request, res: Response) => {
    try {
      const tags = await storage.getTags();
      res.json(tags);
    } catch (error) {
      console.error("Get tags error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Get single tag
  app.get("/api/tags/:id", authenticate, requireAdminOrSuperAdmin, async (req: Request, res: Response) => {
    try {
      const tag = await storage.getTag(req.params.id);
      if (!tag) {
        return res.status(404).json({ message: "Tag not found" });
      }
      res.json(tag);
    } catch (error) {
      console.error("Get tag error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Create new tag
  app.post("/api/tags", authenticate, requireAdminOrSuperAdmin, async (req: Request, res: Response) => {
    try {
      const validatedData = insertTagSchema.parse(req.body);
      const tag = await storage.createTag(validatedData);
      res.status(201).json(tag);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input", errors: error.errors });
      }
      console.error("Create tag error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Update tag
  app.put("/api/tags/:id", authenticate, requireAdminOrSuperAdmin, async (req: Request, res: Response) => {
    try {
      const validatedData = insertTagSchema.partial().parse(req.body);
      const tag = await storage.updateTag(req.params.id, validatedData);
      if (!tag) {
        return res.status(404).json({ message: "Tag not found" });
      }
      res.json(tag);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input", errors: error.errors });
      }
      console.error("Update tag error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Delete tag
  app.delete("/api/tags/:id", authenticate, requireAdminOrSuperAdmin, async (req: Request, res: Response) => {
    try {
      const deleted = await storage.deleteTag(req.params.id);
      if (!deleted) {
        return res.status(404).json({ message: "Tag not found" });
      }
      res.json({ message: "Tag deleted successfully" });
    } catch (error) {
      console.error("Delete tag error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Employee Management Routes - Admin Only
  
  // Get all employees
  app.get("/api/employees", authenticate, requireAdminOrSuperAdmin, async (req: Request, res: Response) => {
    try {
      const employees = await storage.getEmployees();
      res.json(employees);
    } catch (error) {
      console.error("Get employees error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Get single employee
  app.get("/api/employees/:id", authenticate, requireAdminOrSuperAdmin, async (req: Request, res: Response) => {
    try {
      const employee = await storage.getEmployee(req.params.id);
      if (!employee) {
        return res.status(404).json({ message: "Employee not found" });
      }
      res.json(employee);
    } catch (error) {
      console.error("Get employee error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Create new employee
  app.post("/api/employees", authenticate, requireAdminOrSuperAdmin, async (req: Request, res: Response) => {
    try {
      const validatedData = insertEmployeeSchema.parse(req.body);
      const employee = await storage.createEmployee(validatedData);
      res.status(201).json(employee);
    } catch (error) {
      console.error("Create employee error:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Update employee
  app.put("/api/employees/:id", authenticate, requireAdminOrSuperAdmin, async (req: Request, res: Response) => {
    try {
      const validatedData = insertEmployeeSchema.partial().parse(req.body);
      const employee = await storage.updateEmployee(req.params.id, validatedData);
      if (!employee) {
        return res.status(404).json({ message: "Employee not found" });
      }
      res.json(employee);
    } catch (error) {
      console.error("Update employee error:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Delete employee
  app.delete("/api/employees/:id", authenticate, requireAdminOrSuperAdmin, async (req: Request, res: Response) => {
    try {
      const deleted = await storage.deleteEmployee(req.params.id);
      if (!deleted) {
        return res.status(404).json({ message: "Employee not found" });
      }
      res.json({ message: "Employee deleted successfully" });
    } catch (error) {
      console.error("Delete employee error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Data Backup and Export Endpoints - Super Admin Only
  
  // Helper function to check if user is Super Admin
  function requireSuperAdmin(req: Request, res: Response, next: Function) {
    if (!req.user || req.user.role !== UserRole.SUPER_ADMIN) {
      return res.status(403).json({ message: "Super Admin access required" });
    }
    next();
  }

  // Full Database Backup (JSON format)
  app.get("/api/backup/full", authenticate, requireSuperAdmin, async (req: Request, res: Response) => {
    try {
      const [
        allUsers,
        allCampaigns,
        allClients,
        allAdAccounts,
        allAdCopySets,
        allWorkReports,
        allPages,
        allRolePermissions,
        allFinanceProjects,
        allFinancePayments,
        allFinanceExpenses,
        allFinanceSettings
      ] = await Promise.all([
        storage.getAllUsers(),
        storage.getCampaigns(),
        storage.getClients(),
        storage.getAdAccounts(),
        storage.getAllAdCopySets(), // Get all ad copy sets
        storage.getWorkReports(),
        storage.getPages(),
        storage.getRolePermissions(),
        storage.getFinanceProjects(),
        storage.getFinancePayments(),
        storage.getFinanceExpenses(),
        storage.getAllFinanceSettings(), // Get all settings
      ]);

      const backup = {
        exportedAt: new Date().toISOString(),
        version: "1.0",
        data: {
          users: allUsers,
          campaigns: allCampaigns,
          clients: allClients,
          adAccounts: allAdAccounts,
          adCopySets: allAdCopySets,
          workReports: allWorkReports,
          pages: allPages,
          rolePermissions: allRolePermissions,
          financeProjects: allFinanceProjects,
          financePayments: allFinancePayments,
          financeExpenses: allFinanceExpenses,
          financeSettings: allFinanceSettings,
        }
      };

      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="advantix-backup-${new Date().toISOString().split('T')[0]}.json"`);
      res.json(backup);
    } catch (error) {
      console.error("Full backup error:", error);
      res.status(500).json({ message: "Backup failed" });
    }
  });

  // Individual table exports (JSON format)
  app.get("/api/backup/users", authenticate, requireSuperAdmin, async (req: Request, res: Response) => {
    try {
      const users = await storage.getAllUsers();
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="users-backup-${new Date().toISOString().split('T')[0]}.json"`);
      res.json({ exportedAt: new Date().toISOString(), data: users });
    } catch (error) {
      res.status(500).json({ message: "Users backup failed" });
    }
  });

  app.get("/api/backup/clients", authenticate, requireSuperAdmin, async (req: Request, res: Response) => {
    try {
      const clients = await storage.getClients();
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="clients-backup-${new Date().toISOString().split('T')[0]}.json"`);
      res.json({ exportedAt: new Date().toISOString(), data: clients });
    } catch (error) {
      res.status(500).json({ message: "Clients backup failed" });
    }
  });

  app.get("/api/backup/campaigns", authenticate, requireSuperAdmin, async (req: Request, res: Response) => {
    try {
      const campaigns = await storage.getCampaigns();
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="campaigns-backup-${new Date().toISOString().split('T')[0]}.json"`);
      res.json({ exportedAt: new Date().toISOString(), data: campaigns });
    } catch (error) {
      res.status(500).json({ message: "Campaigns backup failed" });
    }
  });

  app.get("/api/backup/finance", authenticate, requireSuperAdmin, async (req: Request, res: Response) => {
    try {
      const [projects, payments, expenses, settings] = await Promise.all([
        storage.getFinanceProjects(),
        storage.getFinancePayments(),
        storage.getFinanceExpenses(),
        storage.getAllFinanceSettings(), // Get all settings
      ]);

      const financeData = {
        projects,
        payments,
        expenses,
        settings
      };

      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="finance-backup-${new Date().toISOString().split('T')[0]}.json"`);
      res.json({ exportedAt: new Date().toISOString(), data: financeData });
    } catch (error) {
      res.status(500).json({ message: "Finance backup failed" });
    }
  });

  // CSV Export Functions
  function convertToCSV(data: any[], headers: string[]): string {
    const csvHeaders = headers.join(',');
    const csvRows = data.map(row => {
      return headers.map(header => {
        const value = row[header];
        if (value === null || value === undefined) return '';
        if (typeof value === 'string' && (value.includes(',') || value.includes('"') || value.includes('\n'))) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return String(value);
      }).join(',');
    });
    return [csvHeaders, ...csvRows].join('\n');
  }

  // CSV Export Endpoints
  app.get("/api/backup/clients/csv", authenticate, requireSuperAdmin, async (req: Request, res: Response) => {
    try {
      const clients = await storage.getClients();
      const headers = ['id', 'clientName', 'businessName', 'contactPerson', 'email', 'phone', 'address', 'notes', 'status', 'createdAt', 'updatedAt'];
      const csv = convertToCSV(clients, headers);
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="clients-${new Date().toISOString().split('T')[0]}.csv"`);
      res.send(csv);
    } catch (error) {
      res.status(500).json({ message: "CSV export failed" });
    }
  });

  app.get("/api/backup/campaigns/csv", authenticate, requireSuperAdmin, async (req: Request, res: Response) => {
    try {
      const campaigns = await storage.getCampaigns();
      const headers = ['id', 'name', 'startDate', 'comments', 'adAccountId', 'clientId', 'spend', 'status', 'createdAt', 'updatedAt'];
      const csv = convertToCSV(campaigns, headers);
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="campaigns-${new Date().toISOString().split('T')[0]}.csv"`);
      res.send(csv);
    } catch (error) {
      res.status(500).json({ message: "CSV export failed" });
    }
  });

  app.get("/api/backup/finance-projects/csv", authenticate, requireSuperAdmin, async (req: Request, res: Response) => {
    try {
      const projects = await storage.getFinanceProjects();
      const headers = ['id', 'name', 'description', 'budget', 'expenses', 'status', 'createdAt', 'updatedAt'];
      const csv = convertToCSV(projects, headers);
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="finance-projects-${new Date().toISOString().split('T')[0]}.csv"`);
      res.send(csv);
    } catch (error) {
      res.status(500).json({ message: "CSV export failed" });
    }
  });

  app.get("/api/backup/finance-payments/csv", authenticate, requireSuperAdmin, async (req: Request, res: Response) => {
    try {
      const payments = await storage.getFinancePayments();
      const headers = ['id', 'projectId', 'amount', 'currency', 'description', 'paymentDate', 'createdAt', 'updatedAt'];
      const csv = convertToCSV(payments, headers);
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="finance-payments-${new Date().toISOString().split('T')[0]}.csv"`);
      res.send(csv);
    } catch (error) {
      res.status(500).json({ message: "CSV export failed" });
    }
  });

  app.get("/api/backup/finance-expenses/csv", authenticate, requireSuperAdmin, async (req: Request, res: Response) => {
    try {
      const expenses = await storage.getFinanceExpenses();
      const headers = ['id', 'projectId', 'amount', 'currency', 'category', 'description', 'expenseDate', 'createdAt', 'updatedAt'];
      const csv = convertToCSV(expenses, headers);
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="finance-expenses-${new Date().toISOString().split('T')[0]}.csv"`);
      res.send(csv);
    } catch (error) {
      res.status(500).json({ message: "CSV export failed" });
    }
  });

  // Data Recovery Information Endpoint
  app.get("/api/backup/info", authenticate, requireSuperAdmin, async (req: Request, res: Response) => {
    try {
      const [
        usersCount,
        campaignsCount,
        clientsCount,
        adAccountsCount,
        workReportsCount,
        financeProjectsCount,
        financePaymentsCount,
        financeExpensesCount
      ] = await Promise.all([
        storage.getAllUsers().then(users => users.length),
        storage.getCampaigns().then(campaigns => campaigns.length),
        storage.getClients().then(clients => clients.length),
        storage.getAdAccounts().then(accounts => accounts.length),
        storage.getWorkReports().then(reports => reports.length),
        storage.getFinanceProjects().then(projects => projects.length),
        storage.getFinancePayments().then(payments => payments.length),
        storage.getFinanceExpenses().then(expenses => expenses.length),
      ]);

      res.json({
        message: "Data backup and recovery system active",
        dataIntegrity: "All data is permanently stored in PostgreSQL database",
        backupOptions: {
          fullBackup: "/api/backup/full",
          individualBackups: {
            users: "/api/backup/users",
            clients: "/api/backup/clients", 
            campaigns: "/api/backup/campaigns",
            finance: "/api/backup/finance"
          },
          csvExports: {
            clients: "/api/backup/clients/csv",
            campaigns: "/api/backup/campaigns/csv",
            financeProjects: "/api/backup/finance-projects/csv",
            financePayments: "/api/backup/finance-payments/csv",
            financeExpenses: "/api/backup/finance-expenses/csv"
          }
        },
        dataStats: {
          users: usersCount,
          campaigns: campaignsCount,
          clients: clientsCount,
          adAccounts: adAccountsCount,
          workReports: workReportsCount,
          financeProjects: financeProjectsCount,
          financePayments: financePaymentsCount,
          financeExpenses: financeExpensesCount,
          lastBackupAvailable: "On-demand via API endpoints"
        },
        securityNote: "All backup endpoints require Super Admin authentication"
      });
    } catch (error) {
      res.status(500).json({ message: "Backup info retrieval failed" });
    }
  });

  // JSON Export/Import Endpoints for Admin Panel

  // Full Data Export (JSON)
  app.get("/api/data/export", authenticate, requireAdminOrSuperAdmin, async (req: Request, res: Response) => {
    try {
      const [
        users,
        campaigns,
        clients,
        adAccounts,
        adCopySets,
        workReports,
        pages,
        rolePermissions,
        financeProjects,
        financePayments,
        financeExpenses,
        financeSettings,
        tags,
        employees
      ] = await Promise.all([
        storage.getAllUsers(),
        storage.getCampaigns(),
        storage.getClients(),
        storage.getAdAccounts(),
        storage.getAllAdCopySets(),
        storage.getWorkReports(),
        storage.getPages(),
        storage.getRolePermissions(),
        storage.getFinanceProjects(),
        storage.getFinancePayments(),
        storage.getFinanceExpenses(),
        storage.getAllFinanceSettings(),
        storage.getTags(),
        storage.getEmployees()
      ]);

      const exportData = {
        exportedAt: new Date().toISOString(),
        exportedBy: req.user?.username,
        version: "1.0",
        data: {
          users: users.map(u => ({ ...u, password: "[REDACTED]" })), // Remove passwords for security
          campaigns,
          clients,
          adAccounts,
          adCopySets,
          workReports,
          pages,
          rolePermissions,
          financeProjects,
          financePayments,
          financeExpenses,
          financeSettings,
          tags,
          employees
        }
      };

      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="data-export-${new Date().toISOString().split('T')[0]}.json"`);
      res.json(exportData);
    } catch (error) {
      console.error("Data export failed:", error);
      res.status(500).json({ message: "Data export failed" });
    }
  });

  // Full Data Import (JSON)
  app.post("/api/data/import", authenticate, requireAdminOrSuperAdmin, async (req: Request, res: Response) => {
    try {
      const importData = req.body;
      
      if (!importData || !importData.data) {
        return res.status(400).json({ message: "Invalid import data format" });
      }

      const results = {
        imported: 0,
        updated: 0,
        skipped: 0,
        errors: [] as string[]
      };

      // Import data with duplicate handling - simplified approach
      try {
        // Core system data first
        if (importData.data.pages && Array.isArray(importData.data.pages)) {
          for (const page of importData.data.pages) {
            try {
              const existing = await storage.getPage(page.id);
              if (existing) {
                await storage.updatePage(page.id, page);
                results.updated++;
              } else {
                await storage.createPage(page);
                results.imported++;
              }
            } catch (error: any) {
              results.errors.push(`page (${page.id}): ${error.message}`);
              results.skipped++;
            }
          }
        }

        // Business data
        if (importData.data.clients && Array.isArray(importData.data.clients)) {
          for (const client of importData.data.clients) {
            try {
              const existing = await storage.getClient(client.id);
              if (existing) {
                await storage.updateClient(client.id, client);
                results.updated++;
              } else {
                await storage.createClient(client);
                results.imported++;
              }
            } catch (error: any) {
              results.errors.push(`client (${client.id}): ${error.message}`);
              results.skipped++;
            }
          }
        }

        if (importData.data.adAccounts && Array.isArray(importData.data.adAccounts)) {
          for (const account of importData.data.adAccounts) {
            try {
              const existing = await storage.getAdAccount(account.id);
              if (existing) {
                await storage.updateAdAccount(account.id, account);
                results.updated++;
              } else {
                await storage.createAdAccount(account);
                results.imported++;
              }
            } catch (error: any) {
              results.errors.push(`adAccount (${account.id}): ${error.message}`);
              results.skipped++;
            }
          }
        }

        if (importData.data.campaigns && Array.isArray(importData.data.campaigns)) {
          for (const campaign of importData.data.campaigns) {
            try {
              const existing = await storage.getCampaign(campaign.id);
              if (existing) {
                await storage.updateCampaign(campaign.id, campaign);
                results.updated++;
              } else {
                await storage.createCampaign(campaign);
                results.imported++;
              }
            } catch (error: any) {
              results.errors.push(`campaign (${campaign.id}): ${error.message}`);
              results.skipped++;
            }
          }
        }

        if (importData.data.adCopySets && Array.isArray(importData.data.adCopySets)) {
          for (const copySet of importData.data.adCopySets) {
            try {
              const existing = await storage.getAdCopySet(copySet.id);
              if (existing) {
                await storage.updateAdCopySet(copySet.id, copySet);
                results.updated++;
              } else {
                await storage.createAdCopySet(copySet);
                results.imported++;
              }
            } catch (error: any) {
              results.errors.push(`adCopySet (${copySet.id}): ${error.message}`);
              results.skipped++;
            }
          }
        }

        if (importData.data.workReports && Array.isArray(importData.data.workReports)) {
          for (const report of importData.data.workReports) {
            try {
              const existing = await storage.getWorkReport(report.id);
              if (existing) {
                await storage.updateWorkReport(report.id, report);
                results.updated++;
              } else {
                await storage.createWorkReport(report);
                results.imported++;
              }
            } catch (error: any) {
              results.errors.push(`workReport (${report.id}): ${error.message}`);
              results.skipped++;
            }
          }
        }

        // Finance data
        if (importData.data.financeProjects && Array.isArray(importData.data.financeProjects)) {
          for (const project of importData.data.financeProjects) {
            try {
              const existing = await storage.getFinanceProject(project.id);
              if (existing) {
                await storage.updateFinanceProject(project.id, project);
                results.updated++;
              } else {
                await storage.createFinanceProject(project);
                results.imported++;
              }
            } catch (error: any) {
              results.errors.push(`financeProject (${project.id}): ${error.message}`);
              results.skipped++;
            }
          }
        }

        if (importData.data.financePayments && Array.isArray(importData.data.financePayments)) {
          for (const payment of importData.data.financePayments) {
            try {
              const existing = await storage.getFinancePayment(payment.id);
              if (existing) {
                await storage.updateFinancePayment(payment.id, payment);
                results.updated++;
              } else {
                await storage.createFinancePayment(payment);
                results.imported++;
              }
            } catch (error: any) {
              results.errors.push(`financePayment (${payment.id}): ${error.message}`);
              results.skipped++;
            }
          }
        }

        if (importData.data.financeExpenses && Array.isArray(importData.data.financeExpenses)) {
          for (const expense of importData.data.financeExpenses) {
            try {
              const existing = await storage.getFinanceExpense(expense.id);
              if (existing) {
                await storage.updateFinanceExpense(expense.id, expense);
                results.updated++;
              } else {
                await storage.createFinanceExpense(expense);
                results.imported++;
              }
            } catch (error: any) {
              results.errors.push(`financeExpense (${expense.id}): ${error.message}`);
              results.skipped++;
            }
          }
        }

        if (importData.data.tags && Array.isArray(importData.data.tags)) {
          for (const tag of importData.data.tags) {
            try {
              const existing = await storage.getTag(tag.id);
              if (existing) {
                await storage.updateTag(tag.id, tag);
                results.updated++;
              } else {
                await storage.createTag(tag);
                results.imported++;
              }
            } catch (error: any) {
              results.errors.push(`tag (${tag.id}): ${error.message}`);
              results.skipped++;
            }
          }
        }

        if (importData.data.employees && Array.isArray(importData.data.employees)) {
          for (const employee of importData.data.employees) {
            try {
              const existing = await storage.getEmployee(employee.id);
              if (existing) {
                await storage.updateEmployee(employee.id, employee);
                results.updated++;
              } else {
                await storage.createEmployee(employee);
                results.imported++;
              }
            } catch (error: any) {
              results.errors.push(`employee (${employee.id}): ${error.message}`);
              results.skipped++;
            }
          }
        }

      } catch (importError: any) {
        results.errors.push(`Import process error: ${importError.message}`);
      }

      res.json({
        message: "Data import completed",
        results: {
          ...results,
          totalProcessed: results.imported + results.updated + results.skipped
        },
        importedAt: new Date().toISOString(),
        importedBy: req.user?.username
      });

    } catch (error: any) {
      console.error("Data import failed:", error);
      res.status(500).json({ 
        message: "Data import failed", 
        error: error.message,
        importedAt: new Date().toISOString(),
        importedBy: req.user?.username
      });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
