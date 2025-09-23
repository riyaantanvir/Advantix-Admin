import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from '../shared/schema';

export class DatabaseSync {
  private sourceDb;
  private targetDb;

  constructor(sourceDatabaseUrl: string, targetDatabaseUrl?: string) {
    const sourceConnection = neon(sourceDatabaseUrl);
    this.sourceDb = drizzle(sourceConnection, { schema });
    
    if (targetDatabaseUrl) {
      const targetConnection = neon(targetDatabaseUrl);
      this.targetDb = drizzle(targetConnection, { schema });
    }
  }

  async exportAllData() {
    console.log('🔄 Starting database export...');
    
    try {
      // Export all tables data
      const [users, clients, projects, payments, expenses, sessions, permissions, userPermissions] = await Promise.all([
        this.sourceDb.select().from(schema.users),
        this.sourceDb.select().from(schema.financeClients),
        this.sourceDb.select().from(schema.financeProjects),  
        this.sourceDb.select().from(schema.financePayments),
        this.sourceDb.select().from(schema.financeExpenses),
        this.sourceDb.select().from(schema.sessions),
        this.sourceDb.select().from(schema.permissions),
        this.sourceDb.select().from(schema.userPermissions)
      ]);

      const exportData = {
        timestamp: new Date().toISOString(),
        tables: {
          users,
          financeClients: clients,
          financeProjects: projects,
          financePayments: payments,
          financeExpenses: expenses,
          sessions,
          permissions,
          userPermissions
        },
        counts: {
          users: users.length,
          financeClients: clients.length,
          financeProjects: projects.length,
          financePayments: payments.length,
          financeExpenses: expenses.length,
          sessions: sessions.length,
          permissions: permissions.length,
          userPermissions: userPermissions.length
        }
      };

      console.log('✅ Database export completed:', exportData.counts);
      return exportData;
    } catch (error) {
      console.error('❌ Database export failed:', error);
      throw error;
    }
  }

  async importAllData(exportData: any, clearExisting: boolean = true) {
    if (!this.targetDb) {
      throw new Error('Target database not configured');
    }

    console.log('🔄 Starting database import...');
    
    try {
      // Clear existing data if requested
      if (clearExisting) {
        console.log('🧹 Clearing existing data...');
        await Promise.all([
          this.targetDb.delete(schema.userPermissions),
          this.targetDb.delete(schema.permissions), 
          this.targetDb.delete(schema.sessions),
          this.targetDb.delete(schema.financeExpenses),
          this.targetDb.delete(schema.financePayments),
          this.targetDb.delete(schema.financeProjects),
          this.targetDb.delete(schema.financeClients),
          this.targetDb.delete(schema.users)
        ]);
      }

      // Import data in correct order (respecting foreign keys)
      console.log('📥 Importing data...');
      
      if (exportData.tables.users?.length > 0) {
        await this.targetDb.insert(schema.users).values(exportData.tables.users);
      }
      
      if (exportData.tables.financeClients?.length > 0) {
        await this.targetDb.insert(schema.financeClients).values(exportData.tables.financeClients);
      }
      
      if (exportData.tables.financeProjects?.length > 0) {
        await this.targetDb.insert(schema.financeProjects).values(exportData.tables.financeProjects);
      }
      
      if (exportData.tables.financePayments?.length > 0) {
        await this.targetDb.insert(schema.financePayments).values(exportData.tables.financePayments);
      }
      
      if (exportData.tables.financeExpenses?.length > 0) {
        await this.targetDb.insert(schema.financeExpenses).values(exportData.tables.financeExpenses);
      }
      
      if (exportData.tables.sessions?.length > 0) {
        await this.targetDb.insert(schema.sessions).values(exportData.tables.sessions);
      }
      
      if (exportData.tables.permissions?.length > 0) {
        await this.targetDb.insert(schema.permissions).values(exportData.tables.permissions);
      }
      
      if (exportData.tables.userPermissions?.length > 0) {
        await this.targetDb.insert(schema.userPermissions).values(exportData.tables.userPermissions);
      }

      console.log('✅ Database import completed successfully!');
      return exportData.counts;
    } catch (error) {
      console.error('❌ Database import failed:', error);
      throw error;
    }
  }

  async syncDatabases(clearTarget: boolean = true) {
    console.log('🔄 Starting full database synchronization...');
    
    try {
      // Step 1: Export from source
      const exportData = await this.exportAllData();
      
      // Step 2: Import to target
      const importCounts = await this.importAllData(exportData, clearTarget);
      
      console.log('🎉 Database synchronization completed!');
      console.log('📊 Records synced:', importCounts);
      
      return {
        success: true,
        timestamp: exportData.timestamp,
        recordsCopied: importCounts
      };
    } catch (error) {
      console.error('❌ Database synchronization failed:', error);
      throw error;
    }
  }
}

export async function createDatabaseBackup(databaseUrl: string) {
  const sync = new DatabaseSync(databaseUrl);
  return await sync.exportAllData();
}

export async function restoreDatabaseBackup(sourceDatabaseUrl: string, targetDatabaseUrl: string, clearTarget: boolean = true) {
  const sync = new DatabaseSync(sourceDatabaseUrl, targetDatabaseUrl);
  return await sync.syncDatabases(clearTarget);
}