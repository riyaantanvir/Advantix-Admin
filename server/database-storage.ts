import { 
  type User, 
  type InsertUser, 
  type Session, 
  type Campaign,
  type InsertCampaign,
  type Client,
  type InsertClient,
  type AdAccount,
  type InsertAdAccount,
  type AdCopySet,
  type InsertAdCopySet,
  type WorkReport,
  type InsertWorkReport,
  type Page,
  type InsertPage,
  type RolePermission,
  type InsertRolePermission,
  type FinanceProject,
  type InsertFinanceProject,
  type FinancePayment,
  type InsertFinancePayment,
  type FinanceExpense,
  type InsertFinanceExpense,
  type FinanceSetting,
  type InsertFinanceSetting,
  type Tag,
  type InsertTag,
  UserRole,
  users,
  sessions,
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
  tags
} from "@shared/schema";
import { randomUUID } from "crypto";
import { eq, and, desc } from "drizzle-orm";
import { db } from "./db";
import type { IStorage } from "./storage";

export class DatabaseStorage implements IStorage {
  constructor() {
    // Initialize database with default admin user if it doesn't exist
    this.initializeDefaultData();
  }

  private async initializeDefaultData() {
    try {
      // Check if admin user exists
      const existingAdmin = await db.select()
        .from(users)
        .where(eq(users.username, "Admin"))
        .limit(1);
      
      if (existingAdmin.length === 0) {
        // Create default admin user
        await db.insert(users).values({
          id: randomUUID(),
          name: "Administrator",
          username: "Admin",
          password: "2604", // In production, this should be hashed
          role: UserRole.SUPER_ADMIN,
          isActive: true,
        });
      }

      // Initialize default exchange rate if not exists
      const existingExchangeRate = await this.getFinanceSetting("usd_to_bdt_rate");
      if (!existingExchangeRate) {
        await this.setFinanceSetting({
          key: "usd_to_bdt_rate",
          value: "110",
          description: "USD to BDT exchange rate",
        });
      }

      // Sample clients are no longer created automatically to preserve user data

      // Initialize default pages if not exist
      const existingPages = await db.select().from(pages).limit(1);
      if (existingPages.length === 0) {
        await this.initializeDefaultPages();
      }

      // Initialize default permissions if not exist
      const existingPermissions = await db.select().from(rolePermissions).limit(1);
      if (existingPermissions.length === 0) {
        await this.initializeDefaultPermissions();
      }
    } catch (error) {
      // Silently fail if tables don't exist yet - they'll be created by schema push
      console.log("Database initialization pending schema creation:", error);
    }
  }

  private async initializeDefaultPages() {
    try {
      const defaultPages = [
        { pageKey: "dashboard", displayName: "Dashboard", path: "/", description: "Main dashboard with metrics and overview" },
        { pageKey: "campaigns", displayName: "Campaign Management", path: "/campaigns", description: "Manage advertising campaigns" },
        { pageKey: "campaign_details", displayName: "Campaign Details", path: "/campaigns/:id", description: "View and edit individual campaign details" },
        { pageKey: "clients", displayName: "Client Management", path: "/clients", description: "Manage client accounts and information" },
        { pageKey: "ad_accounts", displayName: "Ad Accounts", path: "/ad-accounts", description: "Manage advertising account connections" },
        { pageKey: "salaries", displayName: "Salary Management", path: "/salaries", description: "Manage employee salaries and payments" },
        { pageKey: "work_reports", displayName: "Work Reports", path: "/work-reports", description: "Track and submit work hours and tasks" },
        { pageKey: "admin", displayName: "Admin Panel", path: "/admin", description: "Administrative settings and user management" },
      ];

      for (const pageData of defaultPages) {
        await db.insert(pages).values({
          id: randomUUID(),
          pageKey: pageData.pageKey,
          displayName: pageData.displayName,
          path: pageData.path,
          description: pageData.description,
          isActive: true,
        });
      }
      console.log(`[DB] Initialized ${defaultPages.length} default pages`);
    } catch (error) {
      console.error(`[DB ERROR] Failed to initialize default pages:`, error);
      throw new Error(`Failed to initialize default pages: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async initializeDefaultPermissions() {
    try {
      const allPages = await db.select().from(pages);
      const roles = [UserRole.USER, UserRole.MANAGER, UserRole.ADMIN, UserRole.SUPER_ADMIN];

      // Define default permission matrix
      const defaultPermissions = {
        [UserRole.USER]: {
          dashboard: { view: true, edit: false, delete: false },
          campaigns: { view: false, edit: false, delete: false },
          campaign_details: { view: false, edit: false, delete: false },
          clients: { view: false, edit: false, delete: false },
          ad_accounts: { view: false, edit: false, delete: false },
          salaries: { view: false, edit: false, delete: false },
          work_reports: { view: true, edit: true, delete: false },
          admin: { view: false, edit: false, delete: false },
        },
        [UserRole.MANAGER]: {
          dashboard: { view: true, edit: false, delete: false },
          campaigns: { view: true, edit: false, delete: false },
          campaign_details: { view: true, edit: false, delete: false },
          clients: { view: true, edit: false, delete: false },
          ad_accounts: { view: true, edit: false, delete: false },
          salaries: { view: false, edit: false, delete: false },
          work_reports: { view: true, edit: true, delete: false },
          admin: { view: false, edit: false, delete: false },
        },
        [UserRole.ADMIN]: {
          dashboard: { view: true, edit: true, delete: false },
          campaigns: { view: true, edit: true, delete: true },
          campaign_details: { view: true, edit: true, delete: false },
          clients: { view: true, edit: true, delete: true },
          ad_accounts: { view: true, edit: true, delete: true },
          salaries: { view: true, edit: true, delete: false },
          work_reports: { view: true, edit: true, delete: true },
          admin: { view: false, edit: false, delete: false },
        },
        [UserRole.SUPER_ADMIN]: {
          dashboard: { view: true, edit: true, delete: true },
          campaigns: { view: true, edit: true, delete: true },
          campaign_details: { view: true, edit: true, delete: true },
          clients: { view: true, edit: true, delete: true },
          ad_accounts: { view: true, edit: true, delete: true },
          salaries: { view: true, edit: true, delete: true },
          work_reports: { view: true, edit: true, delete: true },
          admin: { view: true, edit: true, delete: true },
        },
      };

      let permissionsCreated = 0;
      for (const role of roles) {
        for (const page of allPages) {
          const rolePerms = defaultPermissions[role as keyof typeof defaultPermissions];
          const permissions = rolePerms[page.pageKey as keyof typeof rolePerms];
          if (permissions) {
            await db.insert(rolePermissions).values({
              id: randomUUID(),
              role,
              pageId: page.id,
              canView: permissions.view,
              canEdit: permissions.edit,
              canDelete: permissions.delete,
            });
            permissionsCreated++;
          }
        }
      }
      console.log(`[DB] Initialized ${permissionsCreated} default permissions`);
    } catch (error) {
      console.error(`[DB ERROR] Failed to initialize default permissions:`, error);
      throw new Error(`Failed to initialize default permissions: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // User methods
  async getUser(id: string): Promise<User | undefined> {
    try {
      const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
      return result[0];
    } catch (error) {
      console.error(`[DB ERROR] Failed to get user with ID ${id}:`, error);
      throw new Error(`Failed to get user: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    try {
      const result = await db.select().from(users).where(eq(users.username, username)).limit(1);
      return result[0];
    } catch (error) {
      console.error(`[DB ERROR] Failed to get user by username ${username}:`, error);
      throw new Error(`Failed to get user by username: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    try {
      const id = randomUUID();
      const newUser = {
        ...insertUser,
        id,
        role: UserRole.USER,
        isActive: true,
      };
      
      await db.insert(users).values(newUser);
      console.log(`[DB] Created user: ${newUser.username} (ID: ${newUser.id})`);
      return newUser as User;
    } catch (error) {
      console.error(`[DB ERROR] Failed to create user:`, error);
      throw new Error(`Failed to create user: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async updateUser(id: string, updateData: Partial<InsertUser>): Promise<User | undefined> {
    try {
      await db.update(users).set(updateData).where(eq(users.id, id));
      console.log(`[DB] Updated user with ID: ${id}`);
      return this.getUser(id);
    } catch (error) {
      console.error(`[DB ERROR] Failed to update user with ID ${id}:`, error);
      throw new Error(`Failed to update user: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async deleteUser(id: string): Promise<boolean> {
    try {
      const result = await db.delete(users).where(eq(users.id, id));
      const deleted = (result.rowCount ?? 0) > 0;
      if (deleted) {
        console.log(`[DB] Deleted user with ID: ${id}`);
      } else {
        console.warn(`[DB] No user found to delete with ID: ${id}`);
      }
      return deleted;
    } catch (error) {
      console.error(`[DB ERROR] Failed to delete user with ID ${id}:`, error);
      throw new Error(`Failed to delete user: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getAllUsers(): Promise<User[]> {
    try {
      return db.select().from(users).orderBy(desc(users.createdAt));
    } catch (error) {
      console.error(`[DB ERROR] Failed to get all users:`, error);
      throw new Error(`Failed to get all users: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async validateCredentials(username: string, password: string): Promise<User | null> {
    try {
      const user = await this.getUserByUsername(username);
      if (user && user.password === password && user.isActive) {
        console.log(`[DB] Valid credentials for user: ${username}`);
        return user;
      }
      console.log(`[DB] Invalid credentials for user: ${username}`);
      return null;
    } catch (error) {
      console.error(`[DB ERROR] Failed to validate credentials for ${username}:`, error);
      throw new Error(`Failed to validate credentials: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Session methods
  async createSession(userId: string): Promise<Session> {
    try {
      const sessionId = randomUUID();
      const token = randomUUID();
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 24); // 24 hour session

      const session = {
        id: sessionId,
        userId,
        token,
        expiresAt,
      };

      await db.insert(sessions).values(session);
      console.log(`[DB] Created session for user: ${userId}`);
      return session as Session;
    } catch (error) {
      console.error(`[DB ERROR] Failed to create session for user ${userId}:`, error);
      throw new Error(`Failed to create session: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getSessionByToken(token: string): Promise<Session | undefined> {
    try {
      const result = await db.select()
        .from(sessions)
        .where(eq(sessions.token, token))
        .limit(1);
      
      const session = result[0];
      if (session && session.expiresAt > new Date()) {
        return session;
      }
      if (session) {
        await this.deleteSession(token);
      }
      return undefined;
    } catch (error) {
      console.error(`[DB ERROR] Failed to get session by token:`, error);
      throw new Error(`Failed to get session: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async deleteSession(token: string): Promise<void> {
    try {
      await db.delete(sessions).where(eq(sessions.token, token));
      console.log(`[DB] Deleted session`);
    } catch (error) {
      console.error(`[DB ERROR] Failed to delete session:`, error);
      throw new Error(`Failed to delete session: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Campaign methods
  async getCampaigns(): Promise<Campaign[]> {
    try {
      return db.select().from(campaigns).orderBy(desc(campaigns.createdAt));
    } catch (error) {
      console.error(`[DB ERROR] Failed to get campaigns:`, error);
      throw new Error(`Failed to get campaigns: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getCampaign(id: string): Promise<Campaign | undefined> {
    try {
      const result = await db.select().from(campaigns).where(eq(campaigns.id, id)).limit(1);
      return result[0];
    } catch (error) {
      console.error(`[DB ERROR] Failed to get campaign with ID ${id}:`, error);
      throw new Error(`Failed to get campaign: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async createCampaign(insertCampaign: InsertCampaign): Promise<Campaign> {
    try {
      const id = randomUUID();
      const campaign = {
        ...insertCampaign,
        id,
        status: insertCampaign.status || "active",
        comments: insertCampaign.comments || null,
        clientId: insertCampaign.clientId || null,
        spend: insertCampaign.spend || "0",
      };
      
      await db.insert(campaigns).values(campaign);
      console.log(`[DB] Created campaign: ${campaign.name} (ID: ${campaign.id})`);
      return campaign as Campaign;
    } catch (error) {
      console.error(`[DB ERROR] Failed to create campaign:`, error);
      throw new Error(`Failed to create campaign: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async updateCampaign(id: string, updateData: Partial<InsertCampaign>): Promise<Campaign | undefined> {
    try {
      await db.update(campaigns).set(updateData).where(eq(campaigns.id, id));
      console.log(`[DB] Updated campaign with ID: ${id}`);
      return this.getCampaign(id);
    } catch (error) {
      console.error(`[DB ERROR] Failed to update campaign with ID ${id}:`, error);
      throw new Error(`Failed to update campaign: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async deleteCampaign(id: string): Promise<boolean> {
    try {
      const result = await db.delete(campaigns).where(eq(campaigns.id, id));
      const deleted = (result.rowCount ?? 0) > 0;
      if (deleted) {
        console.log(`[DB] Deleted campaign with ID: ${id}`);
      } else {
        console.warn(`[DB] No campaign found to delete with ID: ${id}`);
      }
      return deleted;
    } catch (error) {
      console.error(`[DB ERROR] Failed to delete campaign with ID ${id}:`, error);
      throw new Error(`Failed to delete campaign: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Client methods
  async getClients(): Promise<Client[]> {
    try {
      return db.select().from(clients).orderBy(desc(clients.createdAt));
    } catch (error) {
      console.error(`[DB ERROR] Failed to get clients:`, error);
      throw new Error(`Failed to get clients: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getClient(id: string): Promise<Client | undefined> {
    try {
      const result = await db.select().from(clients).where(eq(clients.id, id)).limit(1);
      return result[0];
    } catch (error) {
      console.error(`[DB ERROR] Failed to get client with ID ${id}:`, error);
      throw new Error(`Failed to get client: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async createClient(insertClient: InsertClient): Promise<Client> {
    try {
      const id = randomUUID();
      const client = {
        ...insertClient,
        id,
        status: insertClient.status || "active",
        address: insertClient.address || null,
        notes: insertClient.notes || null,
      };
      
      await db.insert(clients).values(client);
      console.log(`[DB] Created client: ${client.clientName} (ID: ${client.id})`);
      return client as Client;
    } catch (error) {
      console.error(`[DB ERROR] Failed to create client:`, error);
      throw new Error(`Failed to create client: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async updateClient(id: string, updateData: Partial<InsertClient>): Promise<Client | undefined> {
    try {
      await db.update(clients).set(updateData).where(eq(clients.id, id));
      console.log(`[DB] Updated client with ID: ${id}`);
      return this.getClient(id);
    } catch (error) {
      console.error(`[DB ERROR] Failed to update client with ID ${id}:`, error);
      throw new Error(`Failed to update client: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async deleteClient(id: string): Promise<boolean> {
    try {
      const result = await db.delete(clients).where(eq(clients.id, id));
      const deleted = (result.rowCount ?? 0) > 0;
      if (deleted) {
        console.log(`[DB] Deleted client with ID: ${id}`);
      } else {
        console.warn(`[DB] No client found to delete with ID: ${id}`);
      }
      return deleted;
    } catch (error) {
      console.error(`[DB ERROR] Failed to delete client with ID ${id}:`, error);
      throw new Error(`Failed to delete client: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Ad Account methods
  async getAdAccounts(): Promise<AdAccount[]> {
    try {
      return db.select().from(adAccounts).orderBy(desc(adAccounts.createdAt));
    } catch (error) {
      console.error(`[DB ERROR] Failed to get ad accounts:`, error);
      throw new Error(`Failed to get ad accounts: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getAdAccount(id: string): Promise<AdAccount | undefined> {
    try {
      const result = await db.select().from(adAccounts).where(eq(adAccounts.id, id)).limit(1);
      return result[0];
    } catch (error) {
      console.error(`[DB ERROR] Failed to get ad account with ID ${id}:`, error);
      throw new Error(`Failed to get ad account: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async createAdAccount(insertAdAccount: InsertAdAccount): Promise<AdAccount> {
    try {
      const id = randomUUID();
      const adAccount = {
        ...insertAdAccount,
        id,
        totalSpend: "0",
        status: insertAdAccount.status || "active",
        notes: insertAdAccount.notes || null,
      };
      
      await db.insert(adAccounts).values(adAccount);
      console.log(`[DB] Created ad account: ${adAccount.accountName} (ID: ${adAccount.id})`);
      return adAccount as AdAccount;
    } catch (error) {
      console.error(`[DB ERROR] Failed to create ad account:`, error);
      throw new Error(`Failed to create ad account: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async updateAdAccount(id: string, updateData: Partial<InsertAdAccount>): Promise<AdAccount | undefined> {
    try {
      await db.update(adAccounts).set(updateData).where(eq(adAccounts.id, id));
      console.log(`[DB] Updated ad account with ID: ${id}`);
      return this.getAdAccount(id);
    } catch (error) {
      console.error(`[DB ERROR] Failed to update ad account with ID ${id}:`, error);
      throw new Error(`Failed to update ad account: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async deleteAdAccount(id: string): Promise<boolean> {
    try {
      const result = await db.delete(adAccounts).where(eq(adAccounts.id, id));
      const deleted = (result.rowCount ?? 0) > 0;
      if (deleted) {
        console.log(`[DB] Deleted ad account with ID: ${id}`);
      } else {
        console.warn(`[DB] No ad account found to delete with ID: ${id}`);
      }
      return deleted;
    } catch (error) {
      console.error(`[DB ERROR] Failed to delete ad account with ID ${id}:`, error);
      throw new Error(`Failed to delete ad account: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Ad Copy Set methods
  async getAdCopySets(campaignId: string): Promise<AdCopySet[]> {
    try {
      return db.select()
        .from(adCopySets)
        .where(eq(adCopySets.campaignId, campaignId))
        .orderBy(desc(adCopySets.isActive), desc(adCopySets.createdAt));
    } catch (error) {
      console.error(`[DB ERROR] Failed to get ad copy sets for campaign ${campaignId}:`, error);
      throw new Error(`Failed to get ad copy sets: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getAllAdCopySets(): Promise<AdCopySet[]> {
    try {
      return db.select()
        .from(adCopySets)
        .orderBy(desc(adCopySets.createdAt));
    } catch (error) {
      console.error(`[DB ERROR] Failed to get all ad copy sets:`, error);
      throw new Error(`Failed to get all ad copy sets: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getAdCopySet(id: string): Promise<AdCopySet | undefined> {
    try {
      const result = await db.select().from(adCopySets).where(eq(adCopySets.id, id)).limit(1);
      return result[0];
    } catch (error) {
      console.error(`[DB ERROR] Failed to get ad copy set with ID ${id}:`, error);
      throw new Error(`Failed to get ad copy set: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async createAdCopySet(insertAdCopySet: InsertAdCopySet): Promise<AdCopySet> {
    try {
      const id = randomUUID();
      const adCopySet = {
        ...insertAdCopySet,
        id,
        isActive: insertAdCopySet.isActive || false,
        notes: insertAdCopySet.notes || null,
        age: insertAdCopySet.age || null,
        budget: insertAdCopySet.budget || null,
        adType: insertAdCopySet.adType || null,
        creativeLink: insertAdCopySet.creativeLink || null,
        headline: insertAdCopySet.headline || null,
        description: insertAdCopySet.description || null,
        callToAction: insertAdCopySet.callToAction || null,
        targetAudience: insertAdCopySet.targetAudience || null,
        placement: insertAdCopySet.placement || null,
        schedule: insertAdCopySet.schedule || null,
      };
      
      await db.insert(adCopySets).values(adCopySet);
      console.log(`[DB] Created ad copy set: ${adCopySet.setName} (ID: ${adCopySet.id})`);
      return adCopySet as AdCopySet;
    } catch (error) {
      console.error(`[DB ERROR] Failed to create ad copy set:`, error);
      throw new Error(`Failed to create ad copy set: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async updateAdCopySet(id: string, updateData: Partial<InsertAdCopySet>): Promise<AdCopySet | undefined> {
    try {
      await db.update(adCopySets).set(updateData).where(eq(adCopySets.id, id));
      console.log(`[DB] Updated ad copy set with ID: ${id}`);
      return this.getAdCopySet(id);
    } catch (error) {
      console.error(`[DB ERROR] Failed to update ad copy set with ID ${id}:`, error);
      throw new Error(`Failed to update ad copy set: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async deleteAdCopySet(id: string): Promise<boolean> {
    try {
      const result = await db.delete(adCopySets).where(eq(adCopySets.id, id));
      const deleted = (result.rowCount ?? 0) > 0;
      if (deleted) {
        console.log(`[DB] Deleted ad copy set with ID: ${id}`);
      } else {
        console.warn(`[DB] No ad copy set found to delete with ID: ${id}`);
      }
      return deleted;
    } catch (error) {
      console.error(`[DB ERROR] Failed to delete ad copy set with ID ${id}:`, error);
      throw new Error(`Failed to delete ad copy set: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async setActiveAdCopySet(campaignId: string, setId: string): Promise<boolean> {
    try {
      // First, deactivate all sets for this campaign
      await db.update(adCopySets)
        .set({ isActive: false })
        .where(eq(adCopySets.campaignId, campaignId));

      // Then activate the specified set
      const result = await db.update(adCopySets)
        .set({ isActive: true })
        .where(and(eq(adCopySets.id, setId), eq(adCopySets.campaignId, campaignId)));

      const activated = (result.rowCount ?? 0) > 0;
      if (activated) {
        console.log(`[DB] Activated ad copy set ${setId} for campaign ${campaignId}`);
      } else {
        console.warn(`[DB] No ad copy set found to activate with ID ${setId} for campaign ${campaignId}`);
      }
      return activated;
    } catch (error) {
      console.error(`[DB ERROR] Failed to set active ad copy set ${setId} for campaign ${campaignId}:`, error);
      throw new Error(`Failed to set active ad copy set: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Work Report methods
  async getWorkReports(userId?: string): Promise<WorkReport[]> {
    try {
      const query = db.select().from(workReports);
      
      if (userId) {
        return query
          .where(eq(workReports.userId, userId))
          .orderBy(desc(workReports.createdAt));
      } else {
        return query.orderBy(desc(workReports.createdAt));
      }
    } catch (error) {
      console.error(`[DB ERROR] Failed to get work reports:`, error);
      throw new Error(`Failed to get work reports: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getWorkReport(id: string): Promise<WorkReport | undefined> {
    try {
      const result = await db.select().from(workReports).where(eq(workReports.id, id)).limit(1);
      return result[0];
    } catch (error) {
      console.error(`[DB ERROR] Failed to get work report with ID ${id}:`, error);
      throw new Error(`Failed to get work report: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async createWorkReport(insertWorkReport: InsertWorkReport): Promise<WorkReport> {
    try {
      const id = randomUUID();
      const workReport = {
        ...insertWorkReport,
        id,
        status: insertWorkReport.status || "submitted",
      };
      
      await db.insert(workReports).values(workReport);
      console.log(`[DB] Created work report (ID: ${workReport.id})`);
      return workReport as WorkReport;
    } catch (error) {
      console.error(`[DB ERROR] Failed to create work report:`, error);
      throw new Error(`Failed to create work report: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async updateWorkReport(id: string, updateData: Partial<InsertWorkReport>): Promise<WorkReport | undefined> {
    try {
      await db.update(workReports).set(updateData).where(eq(workReports.id, id));
      console.log(`[DB] Updated work report with ID: ${id}`);
      return this.getWorkReport(id);
    } catch (error) {
      console.error(`[DB ERROR] Failed to update work report with ID ${id}:`, error);
      throw new Error(`Failed to update work report: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async deleteWorkReport(id: string): Promise<boolean> {
    try {
      const result = await db.delete(workReports).where(eq(workReports.id, id));
      const deleted = (result.rowCount ?? 0) > 0;
      if (deleted) {
        console.log(`[DB] Deleted work report with ID: ${id}`);
      } else {
        console.warn(`[DB] No work report found to delete with ID: ${id}`);
      }
      return deleted;
    } catch (error) {
      console.error(`[DB ERROR] Failed to delete work report with ID ${id}:`, error);
      throw new Error(`Failed to delete work report: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Page methods
  async getPages(): Promise<Page[]> {
    try {
      const result = await db.select().from(pages).orderBy(desc(pages.createdAt));
      // Map database columns to expected frontend format
      return result.map(page => ({
        ...page,
        pageKey: page.pageKey || (page as any).page_key,
        displayName: page.displayName || (page as any).display_name,
      }));
    } catch (error) {
      console.error(`[DB ERROR] Failed to get pages:`, error);
      throw new Error(`Failed to get pages: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getPage(id: string): Promise<Page | undefined> {
    const result = await db.select().from(pages).where(eq(pages.id, id)).limit(1);
    const page = result[0];
    if (!page) return undefined;
    // Map database columns to expected frontend format
    return {
      ...page,
      pageKey: page.pageKey || (page as any).page_key,
      displayName: page.displayName || (page as any).display_name,
    };
  }

  async getPageByKey(pageKey: string): Promise<Page | undefined> {
    const result = await db.select().from(pages).where(eq(pages.pageKey, pageKey)).limit(1);
    const page = result[0];
    if (!page) return undefined;
    // Map database columns to expected frontend format
    return {
      ...page,
      pageKey: page.pageKey || (page as any).page_key,
      displayName: page.displayName || (page as any).display_name,
    };
  }

  async createPage(insertPage: InsertPage): Promise<Page> {
    const id = randomUUID();
    const page = {
      ...insertPage,
      id,
      isActive: insertPage.isActive ?? true,
    };
    
    await db.insert(pages).values(page);
    return page as Page;
  }

  async updatePage(id: string, updateData: Partial<InsertPage>): Promise<Page | undefined> {
    await db.update(pages).set(updateData).where(eq(pages.id, id));
    return this.getPage(id);
  }

  async deletePage(id: string): Promise<boolean> {
    const result = await db.delete(pages).where(eq(pages.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  // Role Permission methods
  async getRolePermissions(role?: string): Promise<RolePermission[]> {
    const query = db.select().from(rolePermissions);
    
    if (role) {
      return query
        .where(eq(rolePermissions.role, role))
        .orderBy(desc(rolePermissions.createdAt));
    } else {
      return query.orderBy(desc(rolePermissions.createdAt));
    }
  }

  async getRolePermission(id: string): Promise<RolePermission | undefined> {
    const result = await db.select().from(rolePermissions).where(eq(rolePermissions.id, id)).limit(1);
    return result[0];
  }

  async getRolePermissionByRoleAndPage(role: string, pageId: string): Promise<RolePermission | undefined> {
    const result = await db.select()
      .from(rolePermissions)
      .where(and(eq(rolePermissions.role, role), eq(rolePermissions.pageId, pageId)))
      .limit(1);
    return result[0];
  }

  async createRolePermission(insertPermission: InsertRolePermission): Promise<RolePermission> {
    const id = randomUUID();
    const permission = {
      ...insertPermission,
      id,
      canView: insertPermission.canView || false,
      canEdit: insertPermission.canEdit || false,
      canDelete: insertPermission.canDelete || false,
    };
    
    await db.insert(rolePermissions).values(permission);
    return permission as RolePermission;
  }

  async updateRolePermission(id: string, updateData: Partial<InsertRolePermission>): Promise<RolePermission | undefined> {
    await db.update(rolePermissions).set(updateData).where(eq(rolePermissions.id, id));
    return this.getRolePermission(id);
  }

  async deleteRolePermission(id: string): Promise<boolean> {
    const result = await db.delete(rolePermissions).where(eq(rolePermissions.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  async checkUserPagePermission(userId: string, pageKey: string, action: 'view' | 'edit' | 'delete'): Promise<boolean> {
    // Get user
    const user = await this.getUser(userId);
    if (!user) return false;

    // Super Admin has access to everything
    if (user.role === UserRole.SUPER_ADMIN) return true;

    // Get page
    const page = await this.getPageByKey(pageKey);
    if (!page || !page.isActive) return false;

    // Get permission for this role and page
    const permission = await this.getRolePermissionByRoleAndPage(user.role, page.id);
    if (!permission) return false;

    // Check specific action
    switch (action) {
      case 'view':
        return permission.canView ?? false;
      case 'edit':
        return permission.canEdit ?? false;
      case 'delete':
        return permission.canDelete ?? false;
      default:
        return false;
    }
  }

  // Finance Project methods
  async getFinanceProjects(): Promise<FinanceProject[]> {
    return await db.select().from(financeProjects).orderBy(desc(financeProjects.createdAt));
  }

  async getFinanceProject(id: string): Promise<FinanceProject | undefined> {
    const results = await db.select().from(financeProjects).where(eq(financeProjects.id, id));
    return results[0];
  }

  async createFinanceProject(project: InsertFinanceProject): Promise<FinanceProject> {
    try {
      const newProject = {
        ...project,
        id: randomUUID(),
        budget: project.budget.toString(), // Convert number to string for decimal
        expense: project.expense ? project.expense.toString() : "0", // Convert number to string for decimal
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      await db.insert(financeProjects).values(newProject);
      console.log(`[DB] Created finance project: ${newProject.name} (ID: ${newProject.id})`);
      return newProject as FinanceProject;
    } catch (error) {
      console.error(`[DB ERROR] Failed to create finance project:`, error);
      throw new Error(`Failed to create finance project: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async updateFinanceProject(id: string, project: Partial<InsertFinanceProject>): Promise<FinanceProject | undefined> {
    const updatedProject = { 
      ...project, 
      budget: project.budget ? project.budget.toString() : undefined,
      expense: project.expense ? project.expense.toString() : undefined,
      updatedAt: new Date() 
    };
    await db.update(financeProjects).set(updatedProject).where(eq(financeProjects.id, id));
    return this.getFinanceProject(id);
  }

  async deleteFinanceProject(id: string): Promise<boolean> {
    try {
      const result = await db.delete(financeProjects).where(eq(financeProjects.id, id));
      const deleted = (result.rowCount ?? 0) > 0;
      if (deleted) {
        console.log(`[DB] Deleted finance project with ID: ${id}`);
      } else {
        console.warn(`[DB] No finance project found to delete with ID: ${id}`);
      }
      return deleted;
    } catch (error) {
      console.error(`[DB ERROR] Failed to delete finance project with ID ${id}:`, error);
      throw new Error(`Failed to delete finance project: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Finance Payment methods
  async getFinancePayments(projectId?: string): Promise<FinancePayment[]> {
    if (projectId) {
      return await db.select().from(financePayments)
        .where(eq(financePayments.projectId, projectId))
        .orderBy(desc(financePayments.createdAt));
    }
    return await db.select().from(financePayments).orderBy(desc(financePayments.createdAt));
  }

  async getFinancePayment(id: string): Promise<FinancePayment | undefined> {
    const results = await db.select().from(financePayments).where(eq(financePayments.id, id));
    return results[0];
  }

  async createFinancePayment(payment: InsertFinancePayment): Promise<FinancePayment> {
    try {
      const newPayment = {
        ...payment,
        id: randomUUID(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      await db.insert(financePayments).values(newPayment);
      console.log(`[DB] Created finance payment: ${newPayment.amount} ${newPayment.currency} (ID: ${newPayment.id})`);
      return newPayment as FinancePayment;
    } catch (error) {
      console.error(`[DB ERROR] Failed to create finance payment:`, error);
      throw new Error(`Failed to create finance payment: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async updateFinancePayment(id: string, payment: Partial<InsertFinancePayment>): Promise<FinancePayment | undefined> {
    const updatedPayment = { ...payment, updatedAt: new Date() };
    await db.update(financePayments).set(updatedPayment).where(eq(financePayments.id, id));
    return this.getFinancePayment(id);
  }

  async deleteFinancePayment(id: string): Promise<boolean> {
    try {
      const result = await db.delete(financePayments).where(eq(financePayments.id, id));
      const deleted = (result.rowCount ?? 0) > 0;
      if (deleted) {
        console.log(`[DB] Deleted finance payment with ID: ${id}`);
      } else {
        console.warn(`[DB] No finance payment found to delete with ID: ${id}`);
      }
      return deleted;
    } catch (error) {
      console.error(`[DB ERROR] Failed to delete finance payment with ID ${id}:`, error);
      throw new Error(`Failed to delete finance payment: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Finance Expense methods
  async getFinanceExpenses(projectId?: string): Promise<FinanceExpense[]> {
    if (projectId) {
      return await db.select().from(financeExpenses)
        .where(eq(financeExpenses.projectId, projectId))
        .orderBy(desc(financeExpenses.createdAt));
    }
    return await db.select().from(financeExpenses).orderBy(desc(financeExpenses.createdAt));
  }

  async getFinanceExpense(id: string): Promise<FinanceExpense | undefined> {
    const results = await db.select().from(financeExpenses).where(eq(financeExpenses.id, id));
    return results[0];
  }

  async createFinanceExpense(expense: InsertFinanceExpense): Promise<FinanceExpense> {
    try {
      const newExpense = {
        ...expense,
        id: randomUUID(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      await db.insert(financeExpenses).values(newExpense);
      console.log(`[DB] Created finance expense: ${newExpense.amount} ${newExpense.currency} (ID: ${newExpense.id})`);
      return newExpense as FinanceExpense;
    } catch (error) {
      console.error(`[DB ERROR] Failed to create finance expense:`, error);
      throw new Error(`Failed to create finance expense: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async updateFinanceExpense(id: string, expense: Partial<InsertFinanceExpense>): Promise<FinanceExpense | undefined> {
    const updatedExpense = { ...expense, updatedAt: new Date() };
    await db.update(financeExpenses).set(updatedExpense).where(eq(financeExpenses.id, id));
    return this.getFinanceExpense(id);
  }

  async deleteFinanceExpense(id: string): Promise<boolean> {
    try {
      const result = await db.delete(financeExpenses).where(eq(financeExpenses.id, id));
      const deleted = (result.rowCount ?? 0) > 0;
      if (deleted) {
        console.log(`[DB] Deleted finance expense with ID: ${id}`);
      } else {
        console.warn(`[DB] No finance expense found to delete with ID: ${id}`);
      }
      return deleted;
    } catch (error) {
      console.error(`[DB ERROR] Failed to delete finance expense with ID ${id}:`, error);
      throw new Error(`Failed to delete finance expense: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Finance Setting methods
  async getFinanceSetting(key: string): Promise<FinanceSetting | undefined> {
    try {
      const results = await db.select().from(financeSettings).where(eq(financeSettings.key, key));
      return results[0];
    } catch (error) {
      console.error(`[DB ERROR] Failed to get finance setting ${key}:`, error);
      throw new Error(`Failed to get finance setting: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getAllFinanceSettings(): Promise<FinanceSetting[]> {
    return db.select()
      .from(financeSettings)
      .orderBy(desc(financeSettings.updatedAt));
  }

  async setFinanceSetting(setting: InsertFinanceSetting): Promise<FinanceSetting> {
    try {
      const existingSetting = await this.getFinanceSetting(setting.key);
      
      if (existingSetting) {
        // Update existing setting
        const updatedSetting = { ...setting, updatedAt: new Date() };
        await db.update(financeSettings).set(updatedSetting).where(eq(financeSettings.key, setting.key));
        console.log(`[DB] Updated finance setting: ${setting.key}`);
        return { ...existingSetting, ...updatedSetting };
      } else {
        // Create new setting
        const newSetting = {
          ...setting,
          id: randomUUID(),
          updatedAt: new Date(),
        };
        await db.insert(financeSettings).values(newSetting);
        console.log(`[DB] Created finance setting: ${setting.key}`);
        return newSetting as FinanceSetting;
      }
    } catch (error) {
      console.error(`[DB ERROR] Failed to set finance setting ${setting.key}:`, error);
      throw new Error(`Failed to set finance setting: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getExchangeRate(): Promise<number> {
    const setting = await this.getFinanceSetting("usd_to_bdt_rate");
    if (setting) {
      return parseFloat(setting.value);
    }
    // Default exchange rate if not set
    const defaultRate = {
      key: "usd_to_bdt_rate",
      value: "110",
      description: "USD to BDT exchange rate",
    };
    await this.setFinanceSetting(defaultRate);
    return 110;
  }

  // Tag methods implementation
  async getTags(): Promise<Tag[]> {
    try {
      return db.select().from(tags).orderBy(desc(tags.createdAt));
    } catch (error) {
      console.error(`[DB ERROR] Failed to get tags:`, error);
      throw new Error(`Failed to get tags: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getTag(id: string): Promise<Tag | undefined> {
    try {
      const result = await db.select().from(tags).where(eq(tags.id, id)).limit(1);
      return result[0];
    } catch (error) {
      console.error(`[DB ERROR] Failed to get tag with ID ${id}:`, error);
      throw new Error(`Failed to get tag: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async createTag(insertTag: InsertTag): Promise<Tag> {
    try {
      const id = randomUUID();
      const newTag = {
        ...insertTag,
        id,
        isActive: insertTag.isActive ?? true,
      };
      
      await db.insert(tags).values(newTag);
      console.log(`[DB] Created tag: ${newTag.name} (ID: ${newTag.id})`);
      return newTag as Tag;
    } catch (error) {
      console.error(`[DB ERROR] Failed to create tag:`, error);
      throw new Error(`Failed to create tag: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async updateTag(id: string, updateData: Partial<InsertTag>): Promise<Tag | undefined> {
    try {
      await db.update(tags).set(updateData).where(eq(tags.id, id));
      console.log(`[DB] Updated tag with ID: ${id}`);
      return this.getTag(id);
    } catch (error) {
      console.error(`[DB ERROR] Failed to update tag with ID ${id}:`, error);
      throw new Error(`Failed to update tag: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async deleteTag(id: string): Promise<boolean> {
    try {
      const result = await db.delete(tags).where(eq(tags.id, id));
      const deleted = (result.rowCount ?? 0) > 0;
      if (deleted) {
        console.log(`[DB] Deleted tag with ID: ${id}`);
      } else {
        console.warn(`[DB] No tag found to delete with ID: ${id}`);
      }
      return deleted;
    } catch (error) {
      console.error(`[DB ERROR] Failed to delete tag with ID ${id}:`, error);
      throw new Error(`Failed to delete tag: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}