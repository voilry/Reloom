import { drizzle } from 'drizzle-orm/expo-sqlite';
import { openDatabaseSync } from 'expo-sqlite';
import * as schema from './schema';

const DATABASE_NAME = 'peopledb.db';

export const expoDb = openDatabaseSync(DATABASE_NAME);

// Initialize system tables and ensure schema is up-to-date
expoDb.execSync(`
  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT
  );
`);

try {
  expoDb.execSync(`ALTER TABLE reminders ADD COLUMN icon TEXT;`);
} catch (e) {
  // column already exists
}

try {
  expoDb.execSync(`ALTER TABLE reminders ADD COLUMN color TEXT;`);
} catch (e) {
  // column already exists
}

export const db = drizzle(expoDb, { schema });
