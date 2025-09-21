import { 
  type User, 
  type InsertUser, 
  type Session, 
  type LoginRequest,
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
  UserRole
} from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  // User methods
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, user: Partial<InsertUser>): Promise<User | undefined>;
  deleteUser(id: string): Promise<boolean>;
  getAllUsers(): Promise<User[]>;
  validateCredentials(username: string, password: string): Promise<User | null>;
  
  // Session methods
  createSession(userId: string): Promise<Session>;
  getSessionByToken(token: string): Promise<Session | undefined>;
  deleteSession(token: string): Promise<void>;
  
  // Campaign methods
  getCampaigns(): Promise<Campaign[]>;
  getCampaign(id: string): Promise<Campaign | undefined>;
  createCampaign(campaign: InsertCampaign): Promise<Campaign>;
  updateCampaign(id: string, campaign: Partial<InsertCampaign>): Promise<Campaign | undefined>;
  deleteCampaign(id: string): Promise<boolean>;
  
  // Client methods
  getClients(): Promise<Client[]>;
  getClient(id: string): Promise<Client | undefined>;
  createClient(client: InsertClient): Promise<Client>;
  updateClient(id: string, client: Partial<InsertClient>): Promise<Client | undefined>;
  deleteClient(id: string): Promise<boolean>;
  
  // Ad Account methods
  getAdAccounts(): Promise<AdAccount[]>;
  getAdAccount(id: string): Promise<AdAccount | undefined>;
  createAdAccount(adAccount: InsertAdAccount): Promise<AdAccount>;
  updateAdAccount(id: string, adAccount: Partial<InsertAdAccount>): Promise<AdAccount | undefined>;
  deleteAdAccount(id: string): Promise<boolean>;
  
  // Ad Copy Set methods
  getAdCopySets(campaignId: string): Promise<AdCopySet[]>;
  getAdCopySet(id: string): Promise<AdCopySet | undefined>;
  createAdCopySet(adCopySet: InsertAdCopySet): Promise<AdCopySet>;
  updateAdCopySet(id: string, adCopySet: Partial<InsertAdCopySet>): Promise<AdCopySet | undefined>;
  deleteAdCopySet(id: string): Promise<boolean>;
  setActiveAdCopySet(campaignId: string, setId: string): Promise<boolean>;
  
  // Work Report methods
  getWorkReports(userId?: string): Promise<WorkReport[]>; // If userId provided, filter by user; otherwise get all (admin only)
  getWorkReport(id: string): Promise<WorkReport | undefined>;
  createWorkReport(workReport: InsertWorkReport): Promise<WorkReport>;
  updateWorkReport(id: string, workReport: Partial<InsertWorkReport>): Promise<WorkReport | undefined>;
  deleteWorkReport(id: string): Promise<boolean>;
  
  // Page methods
  getPages(): Promise<Page[]>;
  getPage(id: string): Promise<Page | undefined>;
  getPageByKey(pageKey: string): Promise<Page | undefined>;
  createPage(page: InsertPage): Promise<Page>;
  updatePage(id: string, page: Partial<InsertPage>): Promise<Page | undefined>;
  deletePage(id: string): Promise<boolean>;
  
  // Role Permission methods
  getRolePermissions(role?: string): Promise<RolePermission[]>; // If role provided, filter by role; otherwise get all
  getRolePermission(id: string): Promise<RolePermission | undefined>;
  getRolePermissionByRoleAndPage(role: string, pageId: string): Promise<RolePermission | undefined>;
  createRolePermission(permission: InsertRolePermission): Promise<RolePermission>;
  updateRolePermission(id: string, permission: Partial<InsertRolePermission>): Promise<RolePermission | undefined>;
  deleteRolePermission(id: string): Promise<boolean>;
  checkUserPagePermission(userId: string, pageKey: string, action: 'view' | 'edit' | 'delete'): Promise<boolean>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private sessions: Map<string, Session>;
  private campaigns: Map<string, Campaign>;
  private clients: Map<string, Client>;
  private adAccounts: Map<string, AdAccount>;
  private adCopySets: Map<string, AdCopySet>;
  private workReports: Map<string, WorkReport>;
  private pages: Map<string, Page>;
  private rolePermissions: Map<string, RolePermission>;

  constructor() {
    this.users = new Map();
    this.sessions = new Map();
    this.campaigns = new Map();
    this.clients = new Map();
    this.adAccounts = new Map();
    this.adCopySets = new Map();
    this.workReports = new Map();
    this.pages = new Map();
    this.rolePermissions = new Map();
    
    // Create default admin user
    const adminId = randomUUID();
    const adminUser: User = {
      id: adminId,
      name: "Administrator",
      username: "Admin",
      password: "2604", // In production, this should be hashed
      role: UserRole.SUPER_ADMIN,
      isActive: true,
      createdAt: new Date(),
    };
    this.users.set(adminId, adminUser);

    // Create sample clients for testing
    const client1Id = randomUUID();
    const client1: Client = {
      id: client1Id,
      clientName: "TechCorp Solutions",
      businessName: "TechCorp Inc.",
      contactPerson: "John Smith",
      email: "contact@techcorp.com",
      phone: "+1-555-0123",
      address: "123 Tech Street, Silicon Valley, CA",
      notes: "Enterprise client with multiple campaigns",
      status: "active",
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.clients.set(client1Id, client1);

    const client2Id = randomUUID();
    const client2: Client = {
      id: client2Id,
      clientName: "Marketing Pro",
      businessName: "Marketing Pro LLC",
      contactPerson: "Sarah Johnson",
      email: "hello@marketingpro.com",
      phone: "+1-555-0456",
      address: "456 Marketing Ave, New York, NY",
      notes: "High-volume advertising client",
      status: "active",
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.clients.set(client2Id, client2);

    const client3Id = randomUUID();
    const client3: Client = {
      id: client3Id,
      clientName: "Digital Dynamics",
      businessName: "Digital Dynamics Corp",
      contactPerson: "Mike Chen",
      email: "info@digitaldynamics.net",
      phone: "+1-555-0789",
      address: "789 Digital Blvd, Austin, TX",
      notes: "Tech startup focusing on social media",
      status: "active",
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.clients.set(client3Id, client3);

    // Initialize default pages
    this.initializeDefaultPages();
    this.initializeDefaultPermissions();
  }

  private initializeDefaultPages() {
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

    defaultPages.forEach(pageData => {
      const pageId = randomUUID();
      const page: Page = {
        id: pageId,
        pageKey: pageData.pageKey,
        displayName: pageData.displayName,
        path: pageData.path,
        description: pageData.description,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      this.pages.set(pageId, page);
    });
  }

  private initializeDefaultPermissions() {
    const pages = Array.from(this.pages.values());
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

    roles.forEach(role => {
      pages.forEach(page => {
        const rolePermissions = defaultPermissions[role as keyof typeof defaultPermissions];
        const permissions = rolePermissions[page.pageKey as keyof typeof rolePermissions];
        if (permissions) {
          const permissionId = randomUUID();
          const rolePermission: RolePermission = {
            id: permissionId,
            role,
            pageId: page.id,
            canView: permissions.view,
            canEdit: permissions.edit,
            canDelete: permissions.delete,
            createdAt: new Date(),
            updatedAt: new Date(),
          };
          this.rolePermissions.set(permissionId, rolePermission);
        }
      });
    });
  }

  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = { 
      ...insertUser, 
      id,
      role: UserRole.USER, // Default role for new users
      isActive: true,
      createdAt: new Date(),
    };
    this.users.set(id, user);
    return user;
  }

  async updateUser(id: string, updateData: Partial<InsertUser>): Promise<User | undefined> {
    const user = this.users.get(id);
    if (!user) return undefined;
    
    const updatedUser: User = {
      ...user,
      ...updateData,
    };
    this.users.set(id, updatedUser);
    return updatedUser;
  }

  async deleteUser(id: string): Promise<boolean> {
    return this.users.delete(id);
  }

  async getAllUsers(): Promise<User[]> {
    return Array.from(this.users.values()).sort((a, b) => {
      return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
    });
  }

  async validateCredentials(username: string, password: string): Promise<User | null> {
    const user = await this.getUserByUsername(username);
    if (user && user.password === password && user.isActive) {
      return user;
    }
    return null;
  }

  async createSession(userId: string): Promise<Session> {
    const sessionId = randomUUID();
    const token = randomUUID();
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24); // 24 hour session

    const session: Session = {
      id: sessionId,
      userId,
      token,
      expiresAt,
      createdAt: new Date(),
    };

    this.sessions.set(token, session);
    return session;
  }

  async getSessionByToken(token: string): Promise<Session | undefined> {
    const session = this.sessions.get(token);
    if (session && session.expiresAt > new Date()) {
      return session;
    }
    if (session) {
      this.sessions.delete(token);
    }
    return undefined;
  }

  async deleteSession(token: string): Promise<void> {
    this.sessions.delete(token);
  }

  // Campaign methods
  async getCampaigns(): Promise<Campaign[]> {
    return Array.from(this.campaigns.values()).sort((a, b) => {
      return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
    });
  }

  async getCampaign(id: string): Promise<Campaign | undefined> {
    return this.campaigns.get(id);
  }

  async createCampaign(insertCampaign: InsertCampaign): Promise<Campaign> {
    const id = randomUUID();
    const campaign: Campaign = {
      ...insertCampaign,
      id,
      status: insertCampaign.status || "active",
      comments: insertCampaign.comments || null,
      clientId: insertCampaign.clientId || null,
      spend: insertCampaign.spend || null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.campaigns.set(id, campaign);
    return campaign;
  }

  async updateCampaign(id: string, updateData: Partial<InsertCampaign>): Promise<Campaign | undefined> {
    const campaign = this.campaigns.get(id);
    if (!campaign) return undefined;
    
    const updatedCampaign: Campaign = {
      ...campaign,
      ...updateData,
      updatedAt: new Date(),
    };
    this.campaigns.set(id, updatedCampaign);
    return updatedCampaign;
  }

  async deleteCampaign(id: string): Promise<boolean> {
    return this.campaigns.delete(id);
  }

  // Client methods
  async getClients(): Promise<Client[]> {
    return Array.from(this.clients.values()).sort((a, b) => {
      return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
    });
  }

  async getClient(id: string): Promise<Client | undefined> {
    return this.clients.get(id);
  }

  async createClient(insertClient: InsertClient): Promise<Client> {
    const id = randomUUID();
    const client: Client = {
      ...insertClient,
      id,
      status: insertClient.status || "active",
      address: insertClient.address || null,
      notes: insertClient.notes || null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.clients.set(id, client);
    return client;
  }

  async updateClient(id: string, updateData: Partial<InsertClient>): Promise<Client | undefined> {
    const client = this.clients.get(id);
    if (!client) return undefined;
    
    const updatedClient: Client = {
      ...client,
      ...updateData,
      updatedAt: new Date(),
    };
    this.clients.set(id, updatedClient);
    return updatedClient;
  }

  async deleteClient(id: string): Promise<boolean> {
    return this.clients.delete(id);
  }

  // Ad Account methods
  async getAdAccounts(): Promise<AdAccount[]> {
    return Array.from(this.adAccounts.values()).sort((a, b) => {
      return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
    });
  }

  async getAdAccount(id: string): Promise<AdAccount | undefined> {
    return this.adAccounts.get(id);
  }

  async createAdAccount(insertAdAccount: InsertAdAccount): Promise<AdAccount> {
    const id = randomUUID();
    const adAccount: AdAccount = {
      ...insertAdAccount,
      id,
      totalSpend: "0",
      status: insertAdAccount.status || "active",
      notes: insertAdAccount.notes || null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.adAccounts.set(id, adAccount);
    return adAccount;
  }

  async updateAdAccount(id: string, updateData: Partial<InsertAdAccount>): Promise<AdAccount | undefined> {
    const adAccount = this.adAccounts.get(id);
    if (!adAccount) return undefined;
    
    const updatedAdAccount: AdAccount = {
      ...adAccount,
      ...updateData,
      updatedAt: new Date(),
    };
    this.adAccounts.set(id, updatedAdAccount);
    return updatedAdAccount;
  }

  async deleteAdAccount(id: string): Promise<boolean> {
    return this.adAccounts.delete(id);
  }
  // Ad Copy Set methods
  async getAdCopySets(campaignId: string): Promise<AdCopySet[]> {
    return Array.from(this.adCopySets.values())
      .filter(set => set.campaignId === campaignId)
      .sort((a, b) => {
        // Active sets first
        if (a.isActive && !b.isActive) return -1;
        if (!a.isActive && b.isActive) return 1;
        // Then by creation date
        return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
      });
  }

  async getAdCopySet(id: string): Promise<AdCopySet | undefined> {
    return this.adCopySets.get(id);
  }

  async createAdCopySet(insertAdCopySet: InsertAdCopySet): Promise<AdCopySet> {
    const id = randomUUID();
    const adCopySet: AdCopySet = {
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
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.adCopySets.set(id, adCopySet);
    return adCopySet;
  }

  async updateAdCopySet(id: string, updateData: Partial<InsertAdCopySet>): Promise<AdCopySet | undefined> {
    const adCopySet = this.adCopySets.get(id);
    if (!adCopySet) return undefined;
    
    const updatedAdCopySet: AdCopySet = {
      ...adCopySet,
      ...updateData,
      updatedAt: new Date(),
    };
    this.adCopySets.set(id, updatedAdCopySet);
    return updatedAdCopySet;
  }

  async deleteAdCopySet(id: string): Promise<boolean> {
    return this.adCopySets.delete(id);
  }

  async setActiveAdCopySet(campaignId: string, setId: string): Promise<boolean> {
    // First, deactivate all sets for this campaign
    const campaignSets = Array.from(this.adCopySets.values())
      .filter(set => set.campaignId === campaignId);
    
    for (const set of campaignSets) {
      if (set.isActive) {
        const updatedSet = { ...set, isActive: false, updatedAt: new Date() };
        this.adCopySets.set(set.id, updatedSet);
      }
    }

    // Then activate the specified set
    const targetSet = this.adCopySets.get(setId);
    if (!targetSet || targetSet.campaignId !== campaignId) {
      return false;
    }

    const updatedTargetSet = { ...targetSet, isActive: true, updatedAt: new Date() };
    this.adCopySets.set(setId, updatedTargetSet);
    return true;
  }

  // Work Report methods
  async getWorkReports(userId?: string): Promise<WorkReport[]> {
    const reports = Array.from(this.workReports.values());
    const filteredReports = userId 
      ? reports.filter(report => report.userId === userId)
      : reports;
    
    return filteredReports.sort((a, b) => {
      return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
    });
  }

  async getWorkReport(id: string): Promise<WorkReport | undefined> {
    return this.workReports.get(id);
  }

  async createWorkReport(insertWorkReport: InsertWorkReport): Promise<WorkReport> {
    const id = randomUUID();
    const workReport: WorkReport = {
      ...insertWorkReport,
      id,
      status: insertWorkReport.status || "submitted",
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.workReports.set(id, workReport);
    return workReport;
  }

  async updateWorkReport(id: string, updateData: Partial<InsertWorkReport>): Promise<WorkReport | undefined> {
    const workReport = this.workReports.get(id);
    if (!workReport) return undefined;
    
    const updatedWorkReport: WorkReport = {
      ...workReport,
      ...updateData,
      updatedAt: new Date(),
    };
    this.workReports.set(id, updatedWorkReport);
    return updatedWorkReport;
  }

  async deleteWorkReport(id: string): Promise<boolean> {
    return this.workReports.delete(id);
  }

  // Page methods
  async getPages(): Promise<Page[]> {
    return Array.from(this.pages.values()).sort((a, b) => {
      return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
    });
  }

  async getPage(id: string): Promise<Page | undefined> {
    return this.pages.get(id);
  }

  async getPageByKey(pageKey: string): Promise<Page | undefined> {
    return Array.from(this.pages.values()).find(page => page.pageKey === pageKey);
  }

  async createPage(insertPage: InsertPage): Promise<Page> {
    const id = randomUUID();
    const page: Page = {
      ...insertPage,
      id,
      isActive: insertPage.isActive ?? true,
      description: insertPage.description || null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.pages.set(id, page);
    return page;
  }

  async updatePage(id: string, updateData: Partial<InsertPage>): Promise<Page | undefined> {
    const page = this.pages.get(id);
    if (!page) return undefined;
    
    const updatedPage: Page = {
      ...page,
      ...updateData,
      updatedAt: new Date(),
    };
    this.pages.set(id, updatedPage);
    return updatedPage;
  }

  async deletePage(id: string): Promise<boolean> {
    return this.pages.delete(id);
  }

  // Role Permission methods
  async getRolePermissions(role?: string): Promise<RolePermission[]> {
    const permissions = Array.from(this.rolePermissions.values());
    const filteredPermissions = role 
      ? permissions.filter(permission => permission.role === role)
      : permissions;
    
    return filteredPermissions.sort((a, b) => {
      return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
    });
  }

  async getRolePermission(id: string): Promise<RolePermission | undefined> {
    return this.rolePermissions.get(id);
  }

  async getRolePermissionByRoleAndPage(role: string, pageId: string): Promise<RolePermission | undefined> {
    return Array.from(this.rolePermissions.values()).find(
      permission => permission.role === role && permission.pageId === pageId
    );
  }

  async createRolePermission(insertPermission: InsertRolePermission): Promise<RolePermission> {
    const id = randomUUID();
    const permission: RolePermission = {
      ...insertPermission,
      id,
      canView: insertPermission.canView || false,
      canEdit: insertPermission.canEdit || false,
      canDelete: insertPermission.canDelete || false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.rolePermissions.set(id, permission);
    return permission;
  }

  async updateRolePermission(id: string, updateData: Partial<InsertRolePermission>): Promise<RolePermission | undefined> {
    const permission = this.rolePermissions.get(id);
    if (!permission) return undefined;
    
    const updatedPermission: RolePermission = {
      ...permission,
      ...updateData,
      updatedAt: new Date(),
    };
    this.rolePermissions.set(id, updatedPermission);
    return updatedPermission;
  }

  async deleteRolePermission(id: string): Promise<boolean> {
    return this.rolePermissions.delete(id);
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
}

import { DatabaseStorage } from './database-storage';

export const storage = new DatabaseStorage();
