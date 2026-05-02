import { expoDb } from '../index';

export const SettingsRepository = {
    async get(key: string): Promise<string | null> {
        const rows = await expoDb.getAllSync(`SELECT value FROM settings WHERE key = ?`, [key]) as any[];
        return rows.length > 0 ? rows[0].value : null;
    },

    async set(key: string, value: string): Promise<void> {
        await expoDb.runSync(
            `INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)`,
            [key, value]
        );
    },

    async getAll(): Promise<Record<string, string>> {
        const rows = await expoDb.getAllSync(`SELECT * FROM settings`) as any[];
        return rows.reduce((acc: any, row: any) => {
            acc[row.key] = row.value;
            return acc;
        }, {});
    }
};
