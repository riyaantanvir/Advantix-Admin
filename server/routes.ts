import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { db } from "./db";
import multer from "multer";
import { parse } from "csv-parse/sync";
import { 
  loginSchema, 
  insertCampaignSchema, 
  insertCampaignDailySpendSchema,
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
  insertUserMenuPermissionSchema,
  insertSalarySchema,
  insertTelegramConfigSchema,
  insertTelegramChatIdSchema,
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
  type UserMenuPermission,
  type Salary,
  type TelegramConfig,
  type TelegramChatId,
  UserRole,
  clients,
  campaigns,
  campaignDailySpends
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
      cb(null, false);
    }
  },
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
});

// Helper function to send work report notifications via Telegram
async function sendWorkReportNotification(workReport: WorkReport, submittedByUser: { id: string; username: string; role: string }) {
  try {
    // Get Telegram configuration
    const config = await storage.getTelegramConfig();
    if (!config || !config.botToken || !config.isActive) {
      return; // No Telegram config or not active
    }

    // Get active chat IDs
    const chatIds = await storage.getTelegramChatIds();
    const activeChatIds = chatIds.filter(chat => chat.isActive);
    if (activeChatIds.length === 0) {
      return; // No active chat IDs
    }

    // Get user details for the work report
    const reportUser = await storage.getUser(workReport.userId);
    if (!reportUser) {
      return;
    }

    // Format the notification message
    const message = `
🔔 <b>New Work Report Submitted</b>

👤 <b>Employee:</b> ${reportUser.name} (@${reportUser.username})
📅 <b>Date:</b> ${new Date(workReport.date).toLocaleDateString()}
📝 <b>Title:</b> ${workReport.title}
📋 <b>Description:</b> ${workReport.description}
⏰ <b>Hours Worked:</b> ${workReport.hoursWorked}
📊 <b>Status:</b> ${workReport.status}

<i>Submitted by ${submittedByUser.username} at ${new Date().toLocaleString()}</i>
`;

    // Send message to all active chat IDs
    for (const chatId of activeChatIds) {
      try {
        const telegramApiUrl = `https://api.telegram.org/bot${config.botToken}/sendMessage`;
        const telegramResponse = await fetch(telegramApiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            chat_id: chatId.chatId,
            text: message.trim(),
            parse_mode: 'HTML'
          })
        });

        if (!telegramResponse.ok) {
          const errorData = await telegramResponse.json();
          console.error(`Failed to send Telegram notification to ${chatId.name}:`, errorData.description);
        }
      } catch (error: any) {
        console.error(`Error sending Telegram notification to ${chatId.name}:`, error.message);
      }
    }
  } catch (error: any) {
    console.error("Error in sendWorkReportNotification:", error);
  }
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

  // Campaign Daily Spend Routes
  // Get all daily spends for a campaign
  app.get("/api/campaigns/:id/daily-spends", authenticate, requirePagePermission('campaigns', 'view'), async (req: Request, res: Response) => {
    try {
      const spends = await storage.getCampaignDailySpends(req.params.id);
      res.json(spends);
    } catch (error) {
      console.error("Get campaign daily spends error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Upsert (create or update) daily spend for a campaign
  app.post("/api/campaigns/:id/daily-spends", authenticate, requirePagePermission('campaigns', 'edit'), async (req: Request, res: Response) => {
    try {
      const validatedData = insertCampaignDailySpendSchema.parse({
        ...req.body,
        campaignId: req.params.id,
      });
      
      const spend = await storage.upsertCampaignDailySpend(validatedData);
      res.json(spend);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input", errors: error.errors });
      }
      console.error("Upsert campaign daily spend error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Get total spend for a campaign
  app.get("/api/campaigns/:id/total-spend", authenticate, requirePagePermission('campaigns', 'view'), async (req: Request, res: Response) => {
    try {
      const totalSpend = await storage.getCampaignTotalSpend(req.params.id);
      res.json({ totalSpend });
    } catch (error) {
      console.error("Get campaign total spend error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Export campaigns to CSV
  app.get("/api/campaigns/export/csv", authenticate, requirePagePermission('campaigns', 'view'), async (req: Request, res: Response) => {
    try {
      const campaigns = await storage.getCampaigns();
      
      // Get daily spends for all campaigns
      const campaignsWithSpends = await Promise.all(
        campaigns.map(async (campaign) => {
          const dailySpends = await storage.getCampaignDailySpends(campaign.id);
          return {
            ...campaign,
            dailySpends: JSON.stringify(dailySpends.map(spend => ({
              date: new Date(spend.date).toISOString(),
              amount: spend.amount
            })))
          };
        })
      );

      // Create CSV header - include ALL fields for lossless export/import
      const headers = [
        'id', 'name', 'clientId', 'adAccountId', 'startDate', 'status', 
        'spend', 'budget', 'objective', 'comments',
        'createdAt', 'updatedAt', 'dailySpends'
      ];

      // Create CSV rows
      const csvRows = [headers.join(',')];
      
      campaignsWithSpends.forEach(campaign => {
        const row = headers.map(header => {
          let value = campaign[header as keyof typeof campaign] ?? '';
          
          // Handle special formatting
          if (header === 'startDate' || header === 'endDate' || header === 'createdAt' || header === 'updatedAt') {
            value = value ? new Date(value as string).toISOString() : '';
          }
          
          // Escape commas and quotes in values
          const stringValue = String(value);
          if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
            return `"${stringValue.replace(/"/g, '""')}"`;
          }
          return stringValue;
        });
        csvRows.push(row.join(','));
      });

      const csvContent = csvRows.join('\n');
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=campaigns-export.csv');
      res.send(csvContent);
    } catch (error) {
      console.error("Export campaigns CSV error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Import campaigns from CSV
  const upload = multer({ storage: multer.memoryStorage() });
  app.post("/api/campaigns/import/csv", authenticate, requirePagePermission('campaigns', 'edit'), upload.single('file'), async (req: Request, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      const fileContent = req.file.buffer.toString('utf-8');
      const records = parse(fileContent, {
        columns: true,
        skip_empty_lines: true,
        trim: true
      }) as Record<string, string>[];

      // Validate CSV structure
      const requiredHeaders = [
        'id', 'name', 'clientId', 'adAccountId', 'startDate', 'status',
        'spend', 'budget', 'objective', 'comments',
        'createdAt', 'updatedAt', 'dailySpends'
      ];

      if (records.length === 0) {
        return res.status(400).json({ message: "CSV file is empty" });
      }

      const firstRecord = records[0];
      const missingHeaders = requiredHeaders.filter(header => !(header in firstRecord));
      
      if (missingHeaders.length > 0) {
        return res.status(400).json({ 
          message: `Invalid CSV format. Missing columns: ${missingHeaders.join(', ')}` 
        });
      }

      let importedCount = 0;
      const errors: string[] = [];

      for (const record of records) {
        try {
          // Parse campaign data with preserved ID and timestamps
          const campaignData = {
            id: record.id,
            name: record.name,
            clientId: record.clientId || null,
            adAccountId: record.adAccountId || '',
            startDate: record.startDate ? new Date(record.startDate) : new Date(),
            status: record.status || 'active',
            spend: record.spend || '0',
            budget: record.budget || '0',
            objective: record.objective || 'awareness',
            comments: record.comments || null,
            createdAt: record.createdAt ? new Date(record.createdAt) : new Date(),
            updatedAt: record.updatedAt ? new Date(record.updatedAt) : new Date(),
          };

          // Upsert campaign (insert with preserved ID or update if exists)
          await db.insert(campaigns).values(campaignData)
            .onConflictDoUpdate({
              target: campaigns.id,
              set: {
                name: campaignData.name,
                clientId: campaignData.clientId,
                adAccountId: campaignData.adAccountId,
                startDate: campaignData.startDate,
                status: campaignData.status,
                spend: campaignData.spend,
                budget: campaignData.budget,
                objective: campaignData.objective,
                comments: campaignData.comments,
                updatedAt: campaignData.updatedAt,
              }
            });
          
          // Import daily spends if present
          if (record.dailySpends && record.dailySpends !== '') {
            try {
              const dailySpends = JSON.parse(record.dailySpends);
              for (const spend of dailySpends) {
                const spendData = {
                  campaignId: record.id,
                  date: new Date(spend.date),
                  amount: spend.amount
                };
                
                // Upsert daily spend
                await db.insert(campaignDailySpends).values(spendData)
                  .onConflictDoUpdate({
                    target: [campaignDailySpends.campaignId, campaignDailySpends.date],
                    set: {
                      amount: spendData.amount
                    }
                  });
              }
            } catch (jsonError) {
              errors.push(`Failed to parse daily spends for campaign "${record.name}"`);
            }
          }

          importedCount++;
        } catch (error) {
          errors.push(`Failed to import campaign "${record.name}": ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      res.json({
        message: `Successfully imported ${importedCount} campaign(s)`,
        imported: importedCount,
        errors: errors.length > 0 ? errors : undefined
      });
    } catch (error) {
      console.error("Import campaigns CSV error:", error);
      res.status(500).json({ message: "Failed to import CSV file" });
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

  // Export clients to CSV
  app.get("/api/clients/export/csv", authenticate, requirePagePermission('clients', 'view'), async (req: Request, res: Response) => {
    try {
      const clients = await storage.getClients();

      // Create CSV header
      const headers = [
        'id', 'clientName', 'businessName', 'contactPerson', 'email', 
        'phone', 'address', 'notes', 'status', 'createdAt', 'updatedAt'
      ];

      // Create CSV rows
      const csvRows = [headers.join(',')];
      
      clients.forEach(client => {
        const row = headers.map(header => {
          let value = client[header as keyof typeof client] ?? '';
          
          // Handle special formatting
          if (header === 'createdAt' || header === 'updatedAt') {
            value = value ? new Date(value as string).toISOString() : '';
          }
          
          // Escape commas and quotes in values
          const stringValue = String(value);
          if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
            return `"${stringValue.replace(/"/g, '""')}"`;
          }
          return stringValue;
        });
        csvRows.push(row.join(','));
      });

      const csvContent = csvRows.join('\n');
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=clients-export.csv');
      res.send(csvContent);
    } catch (error) {
      console.error("Export clients CSV error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Import clients from CSV
  app.post("/api/clients/import/csv", authenticate, requirePagePermission('clients', 'edit'), upload.single('file'), async (req: Request, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      const fileContent = req.file.buffer.toString('utf-8');
      const records = parse(fileContent, {
        columns: true,
        skip_empty_lines: true,
        trim: true
      }) as Record<string, string>[];

      // Validate CSV structure
      const requiredHeaders = [
        'id', 'clientName', 'businessName', 'contactPerson', 'email',
        'phone', 'address', 'notes', 'status', 'createdAt', 'updatedAt'
      ];

      if (records.length === 0) {
        return res.status(400).json({ message: "CSV file is empty" });
      }

      const firstRecord = records[0];
      const missingHeaders = requiredHeaders.filter(header => !(header in firstRecord));
      
      if (missingHeaders.length > 0) {
        return res.status(400).json({ 
          message: `Invalid CSV format. Missing columns: ${missingHeaders.join(', ')}` 
        });
      }

      let importedCount = 0;
      const errors: string[] = [];

      for (const record of records) {
        try {
          // Parse client data with preserved ID and timestamps
          const clientData = {
            id: record.id,
            clientName: record.clientName,
            businessName: record.businessName,
            contactPerson: record.contactPerson,
            email: record.email,
            phone: record.phone,
            address: record.address || null,
            notes: record.notes || null,
            status: record.status || 'active',
            createdAt: record.createdAt ? new Date(record.createdAt) : new Date(),
            updatedAt: record.updatedAt ? new Date(record.updatedAt) : new Date(),
          };

          // Upsert client (insert with preserved ID or update if exists)
          await db.insert(clients).values(clientData)
            .onConflictDoUpdate({
              target: clients.id,
              set: {
                clientName: clientData.clientName,
                businessName: clientData.businessName,
                contactPerson: clientData.contactPerson,
                email: clientData.email,
                phone: clientData.phone,
                address: clientData.address,
                notes: clientData.notes,
                status: clientData.status,
                updatedAt: clientData.updatedAt,
              }
            });
          
          importedCount++;
        } catch (error) {
          errors.push(`Failed to import client "${record.clientName}": ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      res.json({
        message: `Successfully imported ${importedCount} client(s)`,
        imported: importedCount,
        errors: errors.length > 0 ? errors : undefined
      });
    } catch (error) {
      console.error("Import clients CSV error:", error);
      res.status(500).json({ message: "Failed to import CSV file" });
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

  // User Menu Permissions Routes
  // Get all user menu permissions or for a specific user
  app.get("/api/user-menu-permissions", authenticate, requirePagePermission('admin', 'view', { superAdminBypass: true }), async (req: Request, res: Response) => {
    try {
      const { userId } = req.query;
      const permissions = await storage.getUserMenuPermissions(userId as string);
      res.json(permissions);
    } catch (error) {
      console.error("Get user menu permissions error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Get user menu permission for a specific user
  app.get("/api/user-menu-permissions/:userId", authenticate, requirePagePermission('admin', 'view', { superAdminBypass: true }), async (req: Request, res: Response) => {
    try {
      const permission = await storage.getUserMenuPermission(req.params.userId);
      if (!permission) {
        return res.status(404).json({ message: "User menu permission not found" });
      }
      res.json(permission);
    } catch (error) {
      console.error("Get user menu permission error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Create new user menu permission
  app.post("/api/user-menu-permissions", authenticate, requirePagePermission('admin', 'edit', { superAdminBypass: true }), async (req: Request, res: Response) => {
    try {
      const validatedData = insertUserMenuPermissionSchema.parse(req.body);
      
      // Validate that user exists
      const user = await storage.getUser(validatedData.userId);
      if (!user) {
        return res.status(400).json({ message: "User not found" });
      }
      
      const permission = await storage.createUserMenuPermission(validatedData);
      res.status(201).json(permission);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input", errors: error.errors });
      }
      console.error("Create user menu permission error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Update user menu permission
  app.put("/api/user-menu-permissions/:userId", authenticate, requirePagePermission('admin', 'edit', { superAdminBypass: true }), async (req: Request, res: Response) => {
    try {
      const validatedData = insertUserMenuPermissionSchema.partial().parse(req.body);
      const permission = await storage.updateUserMenuPermission(req.params.userId, validatedData);
      if (!permission) {
        return res.status(404).json({ message: "User menu permission not found" });
      }
      res.json(permission);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input", errors: error.errors });
      }
      console.error("Update user menu permission error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Delete user menu permission
  app.delete("/api/user-menu-permissions/:userId", authenticate, requirePagePermission('admin', 'edit', { superAdminBypass: true }), async (req: Request, res: Response) => {
    try {
      const deleted = await storage.deleteUserMenuPermission(req.params.userId);
      if (!deleted) {
        return res.status(404).json({ message: "User menu permission not found" });
      }
      res.json({ message: "User menu permission deleted successfully" });
    } catch (error) {
      console.error("Delete user menu permission error:", error);
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
      
      // Send Telegram notification for new work report (async, don't block response)
      sendWorkReportNotification(workReport, req.user!).catch(error => {
        console.error("Failed to send Telegram notification for work report:", error);
      });
      
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

  // Salary Management API Routes
  
  // Get all salaries
  app.get("/api/salaries", authenticate, requirePagePermission('salaries', 'view'), async (req: Request, res: Response) => {
    try {
      const salaries = await storage.getSalaries();
      res.json(salaries);
    } catch (error) {
      console.error("Get salaries error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Get salary statistics (MUST be before /:id route)
  app.get("/api/salaries/stats", authenticate, requirePagePermission('salaries', 'view'), async (req: Request, res: Response) => {
    try {
      const [salaries, workReports] = await Promise.all([
        storage.getSalaries(),
        storage.getWorkReports()
      ]);

      // Calculate salary statistics
      const totalSalaries = salaries.length;
      const paidSalaries = salaries.filter(s => s.paymentStatus === 'paid');
      const unpaidSalaries = salaries.filter(s => s.paymentStatus === 'unpaid');
      
      const totalPaidAmount = paidSalaries.reduce((sum, salary) => sum + parseFloat(salary.finalPayment), 0);
      const totalPendingAmount = unpaidSalaries.reduce((sum, salary) => sum + parseFloat(salary.finalPayment), 0);
      const totalSalaryAmount = salaries.reduce((sum, salary) => sum + parseFloat(salary.finalPayment), 0);
      
      // Calculate work report statistics
      const totalWorkHours = workReports.reduce((sum, report) => sum + parseFloat(report.hoursWorked), 0);
      const totalSalaryHours = salaries.reduce((sum, salary) => sum + parseFloat(salary.actualWorkingHours), 0);
      
      // Group by user for comparison
      const userWorkHours: Record<string, number> = {};
      const userSalaryHours: Record<string, number> = {};
      
      workReports.forEach(report => {
        userWorkHours[report.userId] = (userWorkHours[report.userId] || 0) + parseFloat(report.hoursWorked);
      });
      
      salaries.forEach(salary => {
        userSalaryHours[salary.employeeId] = (userSalaryHours[salary.employeeId] || 0) + parseFloat(salary.actualWorkingHours);
      });

      const stats = {
        totalSalaries,
        paidSalaries: paidSalaries.length,
        unpaidSalaries: unpaidSalaries.length,
        totalPaidAmount,
        totalPendingAmount,
        totalSalaryAmount,
        totalWorkHours,
        totalSalaryHours,
        hoursDifference: totalWorkHours - totalSalaryHours,
        userWorkHours,
        userSalaryHours,
        averageSalary: totalSalaries > 0 ? totalSalaryAmount / totalSalaries : 0,
        paymentRate: totalSalaries > 0 ? (paidSalaries.length / totalSalaries) * 100 : 0
      };

      res.json(stats);
    } catch (error) {
      console.error("Get salary stats error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Get single salary
  app.get("/api/salaries/:id", authenticate, requirePagePermission('salaries', 'view'), async (req: Request, res: Response) => {
    try {
      const salary = await storage.getSalary(req.params.id);
      if (!salary) {
        return res.status(404).json({ message: "Salary record not found" });
      }
      res.json(salary);
    } catch (error) {
      console.error("Get salary error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Create new salary
  app.post("/api/salaries", authenticate, requirePagePermission('salaries', 'edit'), async (req: Request, res: Response) => {
    try {
      // For now, accept the data as-is since frontend sends calculated fields
      // TODO: Add proper validation later
      const salary = await storage.createSalary(req.body);
      res.status(201).json(salary);
    } catch (error) {
      console.error("Create salary error:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Update salary
  app.put("/api/salaries/:id", authenticate, requirePagePermission('salaries', 'edit'), async (req: Request, res: Response) => {
    try {
      const validatedData = insertSalarySchema.partial().parse(req.body);
      const salary = await storage.updateSalary(req.params.id, validatedData);
      if (!salary) {
        return res.status(404).json({ message: "Salary record not found" });
      }
      res.json(salary);
    } catch (error) {
      console.error("Update salary error:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Delete salary
  app.delete("/api/salaries/:id", authenticate, requirePagePermission('salaries', 'delete'), async (req: Request, res: Response) => {
    try {
      const deleted = await storage.deleteSalary(req.params.id);
      if (!deleted) {
        return res.status(404).json({ message: "Salary record not found" });
      }
      res.json({ message: "Salary record deleted successfully" });
    } catch (error) {
      console.error("Delete salary error:", error);
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

  app.get("/api/backup/employees/csv", authenticate, requireSuperAdmin, async (req: Request, res: Response) => {
    try {
      const employees = await storage.getEmployees();
      const headers = ['id', 'name', 'department', 'position', 'notes', 'isActive', 'createdAt', 'updatedAt'];
      const csv = convertToCSV(employees, headers);
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="employees-${new Date().toISOString().split('T')[0]}.csv"`);
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
        financeExpensesCount,
        employeesCount
      ] = await Promise.all([
        storage.getAllUsers().then(users => users.length),
        storage.getCampaigns().then(campaigns => campaigns.length),
        storage.getClients().then(clients => clients.length),
        storage.getAdAccounts().then(accounts => accounts.length),
        storage.getWorkReports().then(reports => reports.length),
        storage.getFinanceProjects().then(projects => projects.length),
        storage.getFinancePayments().then(payments => payments.length),
        storage.getFinanceExpenses().then(expenses => expenses.length),
        storage.getEmployees().then(employees => employees.length),
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
            financeExpenses: "/api/backup/finance-expenses/csv",
            employees: "/api/backup/employees/csv"
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
          employees: employeesCount,
          lastBackupAvailable: "On-demand via API endpoints"
        },
        securityNote: "All backup endpoints require Super Admin authentication"
      });
    } catch (error) {
      res.status(500).json({ message: "Backup info retrieval failed" });
    }
  });

  // User-friendly CSV Export Endpoints for Finance Users
  app.get("/api/finance/expenses/export/csv", authenticate, requirePagePermission('finance', 'view'), async (req: Request, res: Response) => {
    try {
      const expenses = await storage.getFinanceExpenses();
      const headers = ['id', 'projectId', 'amount', 'currency', 'category', 'description', 'expenseDate', 'createdAt', 'updatedAt'];
      const csv = convertToCSV(expenses, headers);
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="expenses-${new Date().toISOString().split('T')[0]}.csv"`);
      res.send(csv);
    } catch (error) {
      console.error('Finance expenses CSV export error:', error);
      res.status(500).json({ message: "CSV export failed" });
    }
  });

  app.get("/api/employees/export/csv", authenticate, requirePagePermission('finance', 'view'), async (req: Request, res: Response) => {
    try {
      const employees = await storage.getEmployees();
      const headers = ['id', 'name', 'department', 'position', 'notes', 'isActive', 'createdAt', 'updatedAt'];
      const csv = convertToCSV(employees, headers);
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="employees-${new Date().toISOString().split('T')[0]}.csv"`);
      res.send(csv);
    } catch (error) {
      console.error('Employees CSV export error:', error);
      res.status(500).json({ message: "CSV export failed" });
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

      // Helper function to convert date strings back to Date objects
      const convertDatesToObjects = (obj: any): any => {
        if (obj === null || obj === undefined) return obj;
        if (Array.isArray(obj)) return obj.map(convertDatesToObjects);
        if (typeof obj !== 'object') return obj;
        
        const converted: any = {};
        for (const [key, value] of Object.entries(obj)) {
          // Convert ISO date strings to Date objects - more comprehensive detection
          if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(value)) {
            // Convert any string that looks like an ISO date to Date object
            converted[key] = new Date(value);
          } else if (typeof value === 'object') {
            converted[key] = convertDatesToObjects(value);
          } else {
            converted[key] = value;
          }
        }
        return converted;
      };

      // Import data with duplicate handling - simplified approach
      try {
        // Users MUST be imported first - everything else depends on them
        if (importData.data.users && Array.isArray(importData.data.users)) {
          for (const user of importData.data.users) {
            try {
              const processedUser = convertDatesToObjects(user);
              const existing = await storage.getUser(processedUser.id);
              if (existing) {
                await storage.updateUser(processedUser.id, processedUser);
                results.updated++;
              } else {
                await storage.createUser(processedUser);
                results.imported++;
              }
            } catch (error: any) {
              results.errors.push(`user (${user.username || user.id}): ${error.message}`);
              results.skipped++;
            }
          }
        }

        // Core system data next
        if (importData.data.pages && Array.isArray(importData.data.pages)) {
          for (const page of importData.data.pages) {
            try {
              const processedPage = convertDatesToObjects(page);
              // Check for existing page by pageKey to handle duplicates
              const existingByKey = await storage.getPageByKey(processedPage.pageKey);
              const existingById = await storage.getPage(processedPage.id);
              
              if (existingByKey && existingByKey.id !== processedPage.id) {
                // Page key already exists with different ID - skip to avoid unique constraint violation
                results.errors.push(`page (${page.pageKey}): duplicate key value violates unique constraint "pages_page_key_unique"`);
                results.skipped++;
              } else if (existingByKey) {
                // Same pageKey exists - update it
                await storage.updatePage(existingByKey.id, processedPage);
                results.updated++;
              } else if (existingById) {
                // Same ID exists - update it
                await storage.updatePage(processedPage.id, processedPage);
                results.updated++;
              } else {
                // No existing record - create new
                await storage.createPage(processedPage);
                results.imported++;
              }
            } catch (error: any) {
              results.errors.push(`page (${page.pageKey || page.id}): ${error.message}`);
              results.skipped++;
            }
          }
        }

        // Business data
        if (importData.data.clients && Array.isArray(importData.data.clients)) {
          for (const client of importData.data.clients) {
            try {
              const processedClient = convertDatesToObjects(client);
              const existing = await storage.getClient(processedClient.id);
              if (existing) {
                await storage.updateClient(processedClient.id, processedClient);
                results.updated++;
              } else {
                await storage.createClient(processedClient);
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
              const processedAccount = convertDatesToObjects(account);
              const existing = await storage.getAdAccount(processedAccount.id);
              if (existing) {
                await storage.updateAdAccount(processedAccount.id, processedAccount);
                results.updated++;
              } else {
                await storage.createAdAccount(processedAccount);
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
              const processedCampaign = convertDatesToObjects(campaign);
              const existing = await storage.getCampaign(processedCampaign.id);
              if (existing) {
                await storage.updateCampaign(processedCampaign.id, processedCampaign);
                results.updated++;
              } else {
                await storage.createCampaign(processedCampaign);
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
              const processedCopySet = convertDatesToObjects(copySet);
              const existing = await storage.getAdCopySet(processedCopySet.id);
              if (existing) {
                await storage.updateAdCopySet(processedCopySet.id, processedCopySet);
                results.updated++;
              } else {
                await storage.createAdCopySet(processedCopySet);
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
              const processedReport = convertDatesToObjects(report);
              
              // Check if user exists before creating work report
              if (processedReport.userId) {
                const user = await storage.getUser(processedReport.userId);
                if (!user) {
                  results.errors.push(`workReport (${report.id}): user ${processedReport.userId} not found`);
                  results.skipped++;
                  continue;
                }
              }
              
              const existing = await storage.getWorkReport(processedReport.id);
              if (existing) {
                await storage.updateWorkReport(processedReport.id, processedReport);
                results.updated++;
              } else {
                await storage.createWorkReport(processedReport);
                results.imported++;
              }
            } catch (error: any) {
              results.errors.push(`workReport (${report.id}): ${error.message}`);
              results.skipped++;
            }
          }
        }

        // Finance data - ensure client dependencies exist
        if (importData.data.financeProjects && Array.isArray(importData.data.financeProjects)) {
          for (const project of importData.data.financeProjects) {
            try {
              const processedProject = convertDatesToObjects(project);
              
              // Check if client exists before creating finance project
              if (processedProject.clientId) {
                const client = await storage.getClient(processedProject.clientId);
                if (!client) {
                  results.errors.push(`financeProject (${project.id}): client ${processedProject.clientId} not found`);
                  results.skipped++;
                  continue;
                }
              }
              
              const existing = await storage.getFinanceProject(processedProject.id);
              if (existing) {
                await storage.updateFinanceProject(processedProject.id, processedProject);
                results.updated++;
              } else {
                await storage.createFinanceProject(processedProject);
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
              const processedPayment = convertDatesToObjects(payment);
              
              // Check if client exists before creating finance payment
              if (processedPayment.clientId) {
                const client = await storage.getClient(processedPayment.clientId);
                if (!client) {
                  results.errors.push(`financePayment (${payment.id}): client ${processedPayment.clientId} not found`);
                  results.skipped++;
                  continue;
                }
              }
              
              const existing = await storage.getFinancePayment(processedPayment.id);
              if (existing) {
                await storage.updateFinancePayment(processedPayment.id, processedPayment);
                results.updated++;
              } else {
                await storage.createFinancePayment(processedPayment);
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
              const processedExpense = convertDatesToObjects(expense);
              
              // Check if project exists before creating finance expense
              if (processedExpense.projectId) {
                const project = await storage.getFinanceProject(processedExpense.projectId);
                if (!project) {
                  results.errors.push(`financeExpense (${expense.id}): project ${processedExpense.projectId} not found`);
                  results.skipped++;
                  continue;
                }
              }
              
              const existing = await storage.getFinanceExpense(processedExpense.id);
              if (existing) {
                await storage.updateFinanceExpense(processedExpense.id, processedExpense);
                results.updated++;
              } else {
                await storage.createFinanceExpense(processedExpense);
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
              const processedTag = convertDatesToObjects(tag);
              const existing = await storage.getTag(processedTag.id);
              if (existing) {
                await storage.updateTag(processedTag.id, processedTag);
                results.updated++;
              } else {
                await storage.createTag(processedTag);
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
              const processedEmployee = convertDatesToObjects(employee);
              const existing = await storage.getEmployee(processedEmployee.id);
              if (existing) {
                await storage.updateEmployee(processedEmployee.id, processedEmployee);
                results.updated++;
              } else {
                await storage.createEmployee(processedEmployee);
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

  // Telegram Configuration Routes
  // Get Telegram configuration
  app.get("/api/telegram/config", authenticate, requireSuperAdmin, async (req: Request, res: Response) => {
    try {
      const config = await storage.getTelegramConfig();
      res.json(config);
    } catch (error) {
      console.error("Get Telegram config error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Create or update Telegram configuration
  app.post("/api/telegram/config", authenticate, requireSuperAdmin, async (req: Request, res: Response) => {
    try {
      const validatedData = insertTelegramConfigSchema.parse(req.body);
      const config = await storage.createTelegramConfig(validatedData);
      res.status(201).json(config);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input", errors: error.errors });
      }
      console.error("Create Telegram config error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Update Telegram configuration
  app.put("/api/telegram/config", authenticate, requireSuperAdmin, async (req: Request, res: Response) => {
    try {
      const validatedData = insertTelegramConfigSchema.parse(req.body);
      const config = await storage.updateTelegramConfig(validatedData);
      if (!config) {
        return res.status(404).json({ message: "Telegram configuration not found" });
      }
      res.json(config);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input", errors: error.errors });
      }
      console.error("Update Telegram config error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Delete Telegram configuration
  app.delete("/api/telegram/config", authenticate, requireSuperAdmin, async (req: Request, res: Response) => {
    try {
      await storage.deleteTelegramConfig();
      res.json({ message: "Telegram configuration deleted successfully" });
    } catch (error) {
      console.error("Delete Telegram config error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Telegram Chat ID Routes
  // Get all chat IDs
  app.get("/api/telegram/chat-ids", authenticate, requireSuperAdmin, async (req: Request, res: Response) => {
    try {
      const chatIds = await storage.getTelegramChatIds();
      res.json(chatIds);
    } catch (error) {
      console.error("Get Telegram chat IDs error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Create chat ID
  app.post("/api/telegram/chat-ids", authenticate, requireSuperAdmin, async (req: Request, res: Response) => {
    try {
      const validatedData = insertTelegramChatIdSchema.parse(req.body);
      const chatId = await storage.createTelegramChatId(validatedData);
      res.status(201).json(chatId);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input", errors: error.errors });
      }
      console.error("Create Telegram chat ID error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Update chat ID
  app.put("/api/telegram/chat-ids/:id", authenticate, requireSuperAdmin, async (req: Request, res: Response) => {
    try {
      const validatedData = insertTelegramChatIdSchema.parse(req.body);
      const chatId = await storage.updateTelegramChatId(req.params.id, validatedData);
      if (!chatId) {
        return res.status(404).json({ message: "Chat ID not found" });
      }
      res.json(chatId);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input", errors: error.errors });
      }
      console.error("Update Telegram chat ID error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Delete chat ID
  app.delete("/api/telegram/chat-ids/:id", authenticate, requireSuperAdmin, async (req: Request, res: Response) => {
    try {
      await storage.deleteTelegramChatId(req.params.id);
      res.json({ message: "Chat ID deleted successfully" });
    } catch (error) {
      console.error("Delete Telegram chat ID error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Test message endpoint
  app.post("/api/telegram/test-message", authenticate, requireSuperAdmin, async (req: Request, res: Response) => {
    try {
      const { message } = req.body;
      if (!message || typeof message !== 'string' || !message.trim()) {
        return res.status(400).json({ message: "Message is required" });
      }

      const config = await storage.getTelegramConfig();
      if (!config || !config.botToken) {
        return res.status(400).json({ message: "Telegram bot token not configured" });
      }

      const chatIds = await storage.getTelegramChatIds();
      if (chatIds.length === 0) {
        return res.status(400).json({ message: "No chat IDs configured" });
      }

      // Send message to all configured chat IDs
      let sentCount = 0;
      let errors: string[] = [];

      for (const chatId of chatIds) {
        if (!chatId.isActive) continue;

        try {
          const telegramApiUrl = `https://api.telegram.org/bot${config.botToken}/sendMessage`;
          const telegramResponse = await fetch(telegramApiUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              chat_id: chatId.chatId,
              text: message.trim(),
              parse_mode: 'HTML'
            })
          });

          if (telegramResponse.ok) {
            sentCount++;
          } else {
            const errorData = await telegramResponse.json();
            errors.push(`${chatId.name}: ${errorData.description || 'Unknown error'}`);
          }
        } catch (error: any) {
          errors.push(`${chatId.name}: ${error.message}`);
        }
      }

      if (sentCount === 0) {
        return res.status(500).json({ 
          message: "Failed to send test message to any chat", 
          errors: errors 
        });
      }

      res.json({ 
        message: "Test message sent successfully",
        sentCount: sentCount,
        totalChatIds: chatIds.filter(c => c.isActive).length,
        errors: errors.length > 0 ? errors : undefined
      });

    } catch (error) {
      console.error("Send test message error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
