import { db } from '../index';
import { entries, entryTypes } from '../schema';
import { eq, and, desc, sql } from 'drizzle-orm';
import { InferSelectModel, InferInsertModel } from 'drizzle-orm';

export type Entry = InferSelectModel<typeof entries>;
export type NewEntry = InferInsertModel<typeof entries>;
export type EntryType = InferSelectModel<typeof entryTypes>;

export class EntryRepository {
    static async getForPerson(personId: number) {
        return await db
            .select({
                id: entries.id,
                content: entries.content,
                type: entryTypes.label,
                createdAt: entries.createdAt,
            })
            .from(entries)
            .innerJoin(entryTypes, eq(entries.typeId, entryTypes.id))
            .where(eq(entries.personId, personId))
            .orderBy(desc(entries.createdAt));
    }

    static async getCustomTypesForPerson(personId: number) {
        return await db
            .select({
                id: entryTypes.id,
                label: entryTypes.label,
                isSystem: entryTypes.isSystem
            })
            .from(entryTypes)
            .innerJoin(entries, eq(entries.typeId, entryTypes.id))
            .where(and(
                eq(entries.personId, personId),
                sql`entry_types.label NOT IN ('Note', 'Memory', 'Food & Drink', 'Family', 'Work', 'Travel', 'Gift Idea', 'Goal')`,
                sql`(is_system = 0 OR is_system IS NULL)`
            ))
            .groupBy(entryTypes.id)
            .orderBy(entryTypes.label);
    }

    static async getCustomTypes() {
        return await db
            .select()
            .from(entryTypes)
            .where(and(
                sql`label NOT IN ('Note', 'Memory', 'Food & Drink', 'Family', 'Work', 'Travel', 'Gift Idea', 'Goal')`,
                sql`(is_system = 0 OR is_system IS NULL)`
            ))
            .orderBy(entryTypes.label);
    }

    static async getAllTypes() {
        return await db.select().from(entryTypes).orderBy(entryTypes.label);
    }

    static async createType(label: string) {
        // Check if exists
        const existing = await db.select().from(entryTypes).where(eq(entryTypes.label, label));
        if (existing.length > 0) return existing[0];

        const result = await db.insert(entryTypes).values({ label }).returning();
        return result[0];
    }

    static async addEntry(personId: number, typeLabel: string, content: string, addTimestamp: boolean = false) {
        let type = await this.createType(typeLabel);

        // Check for existing entry of same type for this person
        const existing = await db
            .select()
            .from(entries)
            .where(and(
                eq(entries.personId, personId),
                eq(entries.typeId, type.id)
            ))
            .orderBy(desc(entries.createdAt))
            .limit(1);

        if (existing.length > 0) {
            let newSection = content;
            if (addTimestamp) {
                const now = new Date();
                const timeString = now.toLocaleDateString() + ' at ' + now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                newSection = `*Added: ${timeString}*\n---\n${content}`;
            }
            
            const combinedContent = `${existing[0].content}\n\n${newSection}`;
            await db.update(entries)
                .set({ content: combinedContent, createdAt: new Date() })
                .where(eq(entries.id, existing[0].id));
            return existing[0];
        }

        const result = await db.insert(entries).values({
            personId,
            typeId: type.id,
            content,
        }).returning();

        return result[0];
    }

    static async mergeAllEntriesForPerson(personId: number) {
        const allEntries = await this.getForPerson(personId);
        const typesToMerge = new Map<string, any[]>();

        allEntries.forEach(e => {
            if (!typesToMerge.has(e.type)) {
                typesToMerge.set(e.type, []);
            }
            typesToMerge.get(e.type)?.push(e);
        });

        for (const [typeLabel, entriesList] of typesToMerge.entries()) {
            if (entriesList.length > 1) {
                // Sort by date ascending to merge in order
                const sorted = entriesList.sort((a, b) => 
                    new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
                );
                
                const mergedContent = sorted.map(e => e.content).join('\n\n');
                const mainEntry = sorted[sorted.length - 1]; // Keep the most recent ID or first
                
                // Update the most recent one with combined content
                await this.update(mainEntry.id, mergedContent);

                // Delete the others
                for (let i = 0; i < sorted.length - 1; i++) {
                    await this.delete(sorted[i].id);
                }
            }
        }
    }
    static async delete(id: number) {
        await db.delete(entries).where(eq(entries.id, id));
    }

    static async getById(id: number) {
        const result = await db
            .select({
                id: entries.id,
                personId: entries.personId,
                typeId: entries.typeId,
                content: entries.content,
                type: entryTypes.label,
                createdAt: entries.createdAt,
            })
            .from(entries)
            .innerJoin(entryTypes, eq(entries.typeId, entryTypes.id))
            .where(eq(entries.id, id));
        return result[0] || null;
    }

    static async update(id: number, content: string) {
        await db.update(entries).set({ content }).where(eq(entries.id, id));
    }

    static async updateWithType(id: number, content: string, typeLabel: string) {
        const type = await this.createType(typeLabel);
        await db.update(entries).set({ content, typeId: type.id }).where(eq(entries.id, id));
    }
}
