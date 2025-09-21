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
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private sessions: Map<string, Session>;
  private campaigns: Map<string, Campaign>;
  private clients: Map<string, Client>;
  private adAccounts: Map<string, AdAccount>;
  private adCopySets: Map<string, AdCopySet>;

  constructor() {
    this.users = new Map();
    this.sessions = new Map();
    this.campaigns = new Map();
    this.clients = new Map();
    this.adAccounts = new Map();
    this.adCopySets = new Map();
    
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
}

export const storage = new MemStorage();
