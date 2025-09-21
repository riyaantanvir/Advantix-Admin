import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { 
  loginSchema, 
  insertCampaignSchema, 
  insertClientSchema,
  insertUserWithRoleSchema,
  insertAdAccountSchema,
  insertAdCopySetSchema,
  insertWorkReportSchema,
  insertRolePermissionSchema,
  type Campaign,
  type Client,
  type User,
  type AdAccount,
  type AdCopySet,
  type WorkReport,
  type Page,
  type RolePermission,
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
  app.get("/api/campaigns", authenticate, async (req: Request, res: Response) => {
    try {
      const campaigns = await storage.getCampaigns();
      res.json(campaigns);
    } catch (error) {
      console.error("Get campaigns error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Get single campaign
  app.get("/api/campaigns/:id", authenticate, async (req: Request, res: Response) => {
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
  app.post("/api/campaigns", authenticate, async (req: Request, res: Response) => {
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
  app.put("/api/campaigns/:id", authenticate, async (req: Request, res: Response) => {
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
  app.post("/api/campaigns/:id/comments", authenticate, async (req: Request, res: Response) => {
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
  app.delete("/api/campaigns/:id", authenticate, async (req: Request, res: Response) => {
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
  app.get("/api/clients", authenticate, async (req: Request, res: Response) => {
    try {
      const clients = await storage.getClients();
      res.json(clients);
    } catch (error) {
      console.error("Get clients error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Get single client
  app.get("/api/clients/:id", authenticate, async (req: Request, res: Response) => {
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
  app.post("/api/clients", authenticate, async (req: Request, res: Response) => {
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
  app.put("/api/clients/:id", authenticate, async (req: Request, res: Response) => {
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
  app.delete("/api/clients/:id", authenticate, async (req: Request, res: Response) => {
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
  app.get("/api/users", authenticate, requireAdminOrSuperAdmin, async (req: Request, res: Response) => {
    try {
      const users = await storage.getAllUsers();
      res.json(users);
    } catch (error) {
      console.error("Get users error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Create new user
  app.post("/api/users", authenticate, requireSuperAdmin, async (req: Request, res: Response) => {
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
  app.put("/api/users/:id", authenticate, requireSuperAdmin, async (req: Request, res: Response) => {
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
  app.delete("/api/users/:id", authenticate, requireSuperAdmin, async (req: Request, res: Response) => {
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
  app.get("/api/ad-accounts", authenticate, async (req: Request, res: Response) => {
    try {
      const adAccounts = await storage.getAdAccounts();
      res.json(adAccounts);
    } catch (error) {
      console.error("Get ad accounts error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Get single ad account
  app.get("/api/ad-accounts/:id", authenticate, async (req: Request, res: Response) => {
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
  app.post("/api/ad-accounts", authenticate, async (req: Request, res: Response) => {
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
  app.put("/api/ad-accounts/:id", authenticate, async (req: Request, res: Response) => {
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
  app.delete("/api/ad-accounts/:id", authenticate, async (req: Request, res: Response) => {
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
  app.get("/api/campaigns/:campaignId/ad-copy-sets", authenticate, async (req: Request, res: Response) => {
    try {
      const { campaignId } = req.params;
      const adCopySets = await storage.getAdCopySets(campaignId);
      res.json(adCopySets);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch ad copy sets" });
    }
  });

  // Get single ad copy set
  app.get("/api/ad-copy-sets/:id", authenticate, async (req: Request, res: Response) => {
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
  app.post("/api/campaigns/:campaignId/ad-copy-sets", authenticate, async (req: Request, res: Response) => {
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
  app.put("/api/ad-copy-sets/:id", authenticate, async (req: Request, res: Response) => {
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
  app.put("/api/campaigns/:campaignId/ad-copy-sets/:id/set-active", authenticate, async (req: Request, res: Response) => {
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
  app.delete("/api/ad-copy-sets/:id", authenticate, async (req: Request, res: Response) => {
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
  app.get("/api/work-reports", authenticate, async (req: Request, res: Response) => {
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
  app.get("/api/work-reports/:id", authenticate, async (req: Request, res: Response) => {
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
  app.post("/api/work-reports", authenticate, async (req: Request, res: Response) => {
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
  app.put("/api/work-reports/:id", authenticate, async (req: Request, res: Response) => {
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
  app.delete("/api/work-reports/:id", authenticate, async (req: Request, res: Response) => {
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
  app.get("/api/pages", authenticate, requireSuperAdmin, async (req: Request, res: Response) => {
    try {
      const pages = await storage.getPages();
      res.json(pages);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch pages" });
    }
  });

  // Get all role permissions (Super Admin only)
  app.get("/api/role-permissions", authenticate, requireSuperAdmin, async (req: Request, res: Response) => {
    try {
      const permissions = await storage.getRolePermissions();
      res.json(permissions);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch role permissions" });
    }
  });

  // Get role permissions for a specific role (Super Admin only)
  app.get("/api/role-permissions/:role", authenticate, requireSuperAdmin, async (req: Request, res: Response) => {
    try {
      const permissions = await storage.getRolePermissions(req.params.role);
      res.json(permissions);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch role permissions" });
    }
  });

  // Update role permission (Super Admin only)
  app.put("/api/role-permissions/:id", authenticate, requireSuperAdmin, async (req: Request, res: Response) => {
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
  app.put("/api/role-permissions/bulk", authenticate, requireSuperAdmin, async (req: Request, res: Response) => {
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

  const httpServer = createServer(app);
  return httpServer;
}
