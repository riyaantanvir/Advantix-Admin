#!/usr/bin/env tsx

import { DatabaseSync, createDatabaseBackup, restoreDatabaseBackup } from '../server/database-sync';
import * as fs from 'fs';
import * as path from 'path';

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  const sourceDatabaseUrl = process.env.DATABASE_URL;
  const targetDatabaseUrl = process.env.TARGET_DATABASE_URL || process.env.DEV_DATABASE_URL;

  if (!sourceDatabaseUrl) {
    console.error('❌ DATABASE_URL environment variable is required');
    process.exit(1);
  }

  try {
    switch (command) {
      case 'export':
        console.log('🔄 Exporting database...');
        const exportData = await createDatabaseBackup(sourceDatabaseUrl);
        
        // Save to file
        const backupDir = path.join(process.cwd(), 'backups');
        if (!fs.existsSync(backupDir)) {
          fs.mkdirSync(backupDir, { recursive: true });
        }
        
        const filename = `database-backup-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
        const filepath = path.join(backupDir, filename);
        
        fs.writeFileSync(filepath, JSON.stringify(exportData, null, 2));
        console.log(`✅ Database exported to: ${filepath}`);
        console.log('📊 Records exported:', exportData.counts);
        break;

      case 'import':
        const backupFile = args[1];
        if (!backupFile) {
          console.error('❌ Please specify backup file path');
          process.exit(1);
        }
        
        if (!targetDatabaseUrl) {
          console.error('❌ TARGET_DATABASE_URL or DEV_DATABASE_URL environment variable is required for import');
          process.exit(1);
        }
        
        console.log('🔄 Importing database...');
        const backupData = JSON.parse(fs.readFileSync(backupFile, 'utf8'));
        
        const sync = new DatabaseSync(sourceDatabaseUrl, targetDatabaseUrl);
        await sync.importAllData(backupData, true);
        console.log('✅ Database imported successfully!');
        break;

      case 'sync':
        if (!targetDatabaseUrl) {
          console.error('❌ TARGET_DATABASE_URL or DEV_DATABASE_URL environment variable is required for sync');
          process.exit(1);
        }
        
        console.log('🔄 Synchronizing databases...');
        console.log(`📤 Source: ${sourceDatabaseUrl.substring(0, 30)}...`);
        console.log(`📥 Target: ${targetDatabaseUrl.substring(0, 30)}...`);
        
        const result = await restoreDatabaseBackup(sourceDatabaseUrl, targetDatabaseUrl, true);
        console.log('🎉 Database synchronization completed!');
        console.log('📊 Records synchronized:', result.recordsCopied);
        break;

      case 'status':
        console.log('🔍 Checking database status...');
        const sourceSync = new DatabaseSync(sourceDatabaseUrl);
        const sourceData = await sourceSync.exportAllData();
        
        console.log('\n📊 Source Database Status:');
        console.table(sourceData.counts);
        
        if (targetDatabaseUrl) {
          const targetSync = new DatabaseSync(targetDatabaseUrl);
          const targetData = await targetSync.exportAllData();
          
          console.log('\n📊 Target Database Status:');
          console.table(targetData.counts);
          
          console.log('\n🔄 Sync Status:');
          const syncStatus = Object.keys(sourceData.counts).map(table => ({
            table,
            source: sourceData.counts[table],
            target: targetData.counts[table],
            synced: sourceData.counts[table] === targetData.counts[table] ? '✅' : '❌'
          }));
          console.table(syncStatus);
        }
        break;

      default:
        console.log(`
🗄️  Database Synchronization Tool

Usage:
  npm run db:export              - Export current database to backup file
  npm run db:import <file>       - Import backup file to target database  
  npm run db:sync                - Sync source database to target database
  npm run db:status              - Check database status and sync state

Environment Variables:
  DATABASE_URL                   - Source database URL (required)
  TARGET_DATABASE_URL           - Target database URL (for import/sync)
  DEV_DATABASE_URL              - Alternative target database URL

Examples:
  npm run db:export
  npm run db:sync
  npm run db:status
        `);
        break;
    }
  } catch (error) {
    console.error('❌ Operation failed:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}