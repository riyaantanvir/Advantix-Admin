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
  financeSettings
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

      // Check if sample clients exist
      const existingClients = await db.select().from(clients).limit(1);
      if (existingClients.length === 0) {
        // Create sample clients
        await db.insert(clients).values([
          {
            id: randomUUID(),
            clientName: "TechCorp Solutions",
            businessName: "TechCorp Inc.",
            contactPerson: "John Smith",
            email: "contact@techcorp.com",
            phone: "+1-555-0123",
            address: "123 Tech Street, Silicon Valley, CA",
            notes: "Enterprise client with multiple campaigns",
            status: "active",
          },
          {
            id: randomUUID(),
            clientName: "Marketing Pro",
            businessName: "Marketing Pro LLC",
            contactPerson: "Sarah Johnson",
            email: "hello@marketingpro.com",
            phone: "+1-555-0456",
            address: "456 Marketing Ave, New York, NY",
            notes: "High-volume advertising client",
            status: "active",
          },
          {
            id: randomUUID(),
            clientName: "Digital Dynamics",
            businessName: "Digital Dynamics Corp",
            contactPerson: "Mike Chen",
            email: "info@digitaldynamics.net",
            phone: "+1-555-0789",
            address: "789 Digital Blvd, Austin, TX",
            notes: "Tech startup focusing on social media",
            status: "active",
          },
        ]);
      }

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
  }

  private async initializeDefaultPermissions() {
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
        }
      }
    }
  }

  // User methods
  async getUser(id: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
    return result[0];
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.username, username)).limit(1);
    return result[0];
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const newUser = {
      ...insertUser,
      id,
      role: UserRole.USER,
      isActive: true,
    };
    
    await db.insert(users).values(newUser);
    return newUser as User;
  }

  async updateUser(id: string, updateData: Partial<InsertUser>): Promise<User | undefined> {
    await db.update(users).set(updateData).where(eq(users.id, id));
    return this.getUser(id);
  }

  async deleteUser(id: string): Promise<boolean> {
    const result = await db.delete(users).where(eq(users.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  async getAllUsers(): Promise<User[]> {
    return db.select().from(users).orderBy(desc(users.createdAt));
  }

  async validateCredentials(username: string, password: string): Promise<User | null> {
    const user = await this.getUserByUsername(username);
    if (user && user.password === password && user.isActive) {
      return user;
    }
    return null;
  }

  // Session methods
  async createSession(userId: string): Promise<Session> {
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
    return session as Session;
  }

  async getSessionByToken(token: string): Promise<Session | undefined> {
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
  }

  async deleteSession(token: string): Promise<void> {
    await db.delete(sessions).where(eq(sessions.token, token));
  }

  // Campaign methods
  async getCampaigns(): Promise<Campaign[]> {
    return db.select().from(campaigns).orderBy(desc(campaigns.createdAt));
  }

  async getCampaign(id: string): Promise<Campaign | undefined> {
    const result = await db.select().from(campaigns).where(eq(campaigns.id, id)).limit(1);
    return result[0];
  }

  async createCampaign(insertCampaign: InsertCampaign): Promise<Campaign> {
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
    return campaign as Campaign;
  }

  async updateCampaign(id: string, updateData: Partial<InsertCampaign>): Promise<Campaign | undefined> {
    await db.update(campaigns).set(updateData).where(eq(campaigns.id, id));
    return this.getCampaign(id);
  }

  async deleteCampaign(id: string): Promise<boolean> {
    const result = await db.delete(campaigns).where(eq(campaigns.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  // Client methods
  async getClients(): Promise<Client[]> {
    return db.select().from(clients).orderBy(desc(clients.createdAt));
  }

  async getClient(id: string): Promise<Client | undefined> {
    const result = await db.select().from(clients).where(eq(clients.id, id)).limit(1);
    return result[0];
  }

  async createClient(insertClient: InsertClient): Promise<Client> {
    const id = randomUUID();
    const client = {
      ...insertClient,
      id,
      status: insertClient.status || "active",
      address: insertClient.address || null,
      notes: insertClient.notes || null,
    };
    
    await db.insert(clients).values(client);
    return client as Client;
  }

  async updateClient(id: string, updateData: Partial<InsertClient>): Promise<Client | undefined> {
    await db.update(clients).set(updateData).where(eq(clients.id, id));
    return this.getClient(id);
  }

  async deleteClient(id: string): Promise<boolean> {
    const result = await db.delete(clients).where(eq(clients.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  // Ad Account methods
  async getAdAccounts(): Promise<AdAccount[]> {
    return db.select().from(adAccounts).orderBy(desc(adAccounts.createdAt));
  }

  async getAdAccount(id: string): Promise<AdAccount | undefined> {
    const result = await db.select().from(adAccounts).where(eq(adAccounts.id, id)).limit(1);
    return result[0];
  }

  async createAdAccount(insertAdAccount: InsertAdAccount): Promise<AdAccount> {
    const id = randomUUID();
    const adAccount = {
      ...insertAdAccount,
      id,
      totalSpend: "0",
      status: insertAdAccount.status || "active",
      notes: insertAdAccount.notes || null,
    };
    
    await db.insert(adAccounts).values(adAccount);
    return adAccount as AdAccount;
  }

  async updateAdAccount(id: string, updateData: Partial<InsertAdAccount>): Promise<AdAccount | undefined> {
    await db.update(adAccounts).set(updateData).where(eq(adAccounts.id, id));
    return this.getAdAccount(id);
  }

  async deleteAdAccount(id: string): Promise<boolean> {
    const result = await db.delete(adAccounts).where(eq(adAccounts.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  // Ad Copy Set methods
  async getAdCopySets(campaignId: string): Promise<AdCopySet[]> {
    return db.select()
      .from(adCopySets)
      .where(eq(adCopySets.campaignId, campaignId))
      .orderBy(desc(adCopySets.isActive), desc(adCopySets.createdAt));
  }

  async getAllAdCopySets(): Promise<AdCopySet[]> {
    return db.select()
      .from(adCopySets)
      .orderBy(desc(adCopySets.createdAt));
  }

  async getAdCopySet(id: string): Promise<AdCopySet | undefined> {
    const result = await db.select().from(adCopySets).where(eq(adCopySets.id, id)).limit(1);
    return result[0];
  }

  async createAdCopySet(insertAdCopySet: InsertAdCopySet): Promise<AdCopySet> {
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
    return adCopySet as AdCopySet;
  }

  async updateAdCopySet(id: string, updateData: Partial<InsertAdCopySet>): Promise<AdCopySet | undefined> {
    await db.update(adCopySets).set(updateData).where(eq(adCopySets.id, id));
    return this.getAdCopySet(id);
  }

  async deleteAdCopySet(id: string): Promise<boolean> {
    const result = await db.delete(adCopySets).where(eq(adCopySets.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  async setActiveAdCopySet(campaignId: string, setId: string): Promise<boolean> {
    // First, deactivate all sets for this campaign
    await db.update(adCopySets)
      .set({ isActive: false })
      .where(eq(adCopySets.campaignId, campaignId));

    // Then activate the specified set
    const result = await db.update(adCopySets)
      .set({ isActive: true })
      .where(and(eq(adCopySets.id, setId), eq(adCopySets.campaignId, campaignId)));

    return (result.rowCount ?? 0) > 0;
  }

  // Work Report methods
  async getWorkReports(userId?: string): Promise<WorkReport[]> {
    const query = db.select().from(workReports);
    
    if (userId) {
      return query
        .where(eq(workReports.userId, userId))
        .orderBy(desc(workReports.createdAt));
    } else {
      return query.orderBy(desc(workReports.createdAt));
    }
  }

  async getWorkReport(id: string): Promise<WorkReport | undefined> {
    const result = await db.select().from(workReports).where(eq(workReports.id, id)).limit(1);
    return result[0];
  }

  async createWorkReport(insertWorkReport: InsertWorkReport): Promise<WorkReport> {
    const id = randomUUID();
    const workReport = {
      ...insertWorkReport,
      id,
      status: insertWorkReport.status || "submitted",
    };
    
    await db.insert(workReports).values(workReport);
    return workReport as WorkReport;
  }

  async updateWorkReport(id: string, updateData: Partial<InsertWorkReport>): Promise<WorkReport | undefined> {
    await db.update(workReports).set(updateData).where(eq(workReports.id, id));
    return this.getWorkReport(id);
  }

  async deleteWorkReport(id: string): Promise<boolean> {
    const result = await db.delete(workReports).where(eq(workReports.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  // Page methods
  async getPages(): Promise<Page[]> {
    const result = await db.select().from(pages).orderBy(desc(pages.createdAt));
    // Map database columns to expected frontend format
    return result.map(page => ({
      ...page,
      pageKey: page.pageKey || (page as any).page_key,
      displayName: page.displayName || (page as any).display_name,
    }));
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
    const newProject = {
      ...project,
      id: randomUUID(),
      budget: project.budget.toString(), // Convert number to string for decimal
      expense: project.expense ? project.expense.toString() : "0", // Convert number to string for decimal
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    await db.insert(financeProjects).values(newProject);
    return newProject as FinanceProject;
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
    const result = await db.delete(financeProjects).where(eq(financeProjects.id, id));
    return (result.rowCount ?? 0) > 0;
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
    const newPayment = {
      ...payment,
      id: randomUUID(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    await db.insert(financePayments).values(newPayment);
    return newPayment as FinancePayment;
  }

  async updateFinancePayment(id: string, payment: Partial<InsertFinancePayment>): Promise<FinancePayment | undefined> {
    const updatedPayment = { ...payment, updatedAt: new Date() };
    await db.update(financePayments).set(updatedPayment).where(eq(financePayments.id, id));
    return this.getFinancePayment(id);
  }

  async deleteFinancePayment(id: string): Promise<boolean> {
    const result = await db.delete(financePayments).where(eq(financePayments.id, id));
    return (result.rowCount ?? 0) > 0;
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
    const newExpense = {
      ...expense,
      id: randomUUID(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    await db.insert(financeExpenses).values(newExpense);
    return newExpense as FinanceExpense;
  }

  async updateFinanceExpense(id: string, expense: Partial<InsertFinanceExpense>): Promise<FinanceExpense | undefined> {
    const updatedExpense = { ...expense, updatedAt: new Date() };
    await db.update(financeExpenses).set(updatedExpense).where(eq(financeExpenses.id, id));
    return this.getFinanceExpense(id);
  }

  async deleteFinanceExpense(id: string): Promise<boolean> {
    const result = await db.delete(financeExpenses).where(eq(financeExpenses.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  // Finance Setting methods
  async getFinanceSetting(key: string): Promise<FinanceSetting | undefined> {
    const results = await db.select().from(financeSettings).where(eq(financeSettings.key, key));
    return results[0];
  }

  async getAllFinanceSettings(): Promise<FinanceSetting[]> {
    return db.select()
      .from(financeSettings)
      .orderBy(desc(financeSettings.updatedAt));
  }

  async setFinanceSetting(setting: InsertFinanceSetting): Promise<FinanceSetting> {
    const existingSetting = await this.getFinanceSetting(setting.key);
    
    if (existingSetting) {
      // Update existing setting
      const updatedSetting = { ...setting, updatedAt: new Date() };
      await db.update(financeSettings).set(updatedSetting).where(eq(financeSettings.key, setting.key));
      return { ...existingSetting, ...updatedSetting };
    } else {
      // Create new setting
      const newSetting = {
        ...setting,
        id: randomUUID(),
        updatedAt: new Date(),
      };
      await db.insert(financeSettings).values(newSetting);
      return newSetting as FinanceSetting;
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
}