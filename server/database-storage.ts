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
  UserRole,
  users,
  sessions,
  campaigns,
  clients,
  adAccounts,
  adCopySets
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
    } catch (error) {
      // Silently fail if tables don't exist yet - they'll be created by schema push
      console.log("Database initialization pending schema creation:", error);
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
}