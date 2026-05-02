import { db } from '../index';
import { journals, journalTags, people } from '../schema';
import { eq, desc, and, inArray, sql } from 'drizzle-orm';
import { InferSelectModel, InferInsertModel } from 'drizzle-orm';

export type Journal = InferSelectModel<typeof journals>;
export type NewJournal = InferInsertModel<typeof journals>;

export class JournalRepository {
    static async getAll() {
        const journalList = await db.select().from(journals).orderBy(desc(journals.date));
        
        const journalIds = journalList.map(j => j.id);
        if (journalIds.length === 0) return [];

        // Single query to get all tags for all visible journals
        const allTags = await db
            .select({ 
                journalId: journalTags.journalId,
                person: people 
            })
            .from(journalTags)
            .innerJoin(people, eq(journalTags.personId, people.id))
            .where(inArray(journalTags.journalId, journalIds));

        // Group tags by journalId
        const tagsMap = allTags.reduce((acc, current) => {
            if (!acc[current.journalId]) acc[current.journalId] = [];
            acc[current.journalId].push(current);
            return acc;
        }, {} as Record<number, any[]>);

        return journalList.map(j => ({
            ...j,
            tags: tagsMap[j.id] || []
        }));
    }

    static async getByDate(date: string) {
        const result = await db.select().from(journals).where(eq(journals.date, date));
        return result[0] || null;
    }

    static async create(data: NewJournal) {
        const result = await db.insert(journals).values(data).returning();
        return result[0];
    }

    static async update(id: number, content: string, title?: string) {
        const result = await db.update(journals).set({ content, title }).where(eq(journals.id, id)).returning();
        return result[0];
    }

    static async tagPerson(journalId: number, personId: number) {
        return await db.insert(journalTags).values({ journalId, personId }).returning();
    }

    static async getTaggedPeople(journalId: number) {
        return await db
            .select({ person: people })
            .from(journalTags)
            .innerJoin(people, eq(journalTags.personId, people.id))
            .where(eq(journalTags.journalId, journalId));
    }

    static async getJournalsForPerson(personId: number) {
        return await db
            .select({ journal: journals })
            .from(journalTags)
            .innerJoin(journals, eq(journalTags.journalId, journals.id))
            .where(eq(journalTags.personId, personId))
            .orderBy(desc(journals.date));
    }
    static async getById(id: number) {
        const result = await db.select().from(journals).where(eq(journals.id, id));
        return result[0] || null;
    }

    static async removeTag(journalId: number, personId: number) {
        await db.delete(journalTags)
            .where(and(eq(journalTags.journalId, journalId), eq(journalTags.personId, personId)));
    }

    static async removeAllTags(journalId: number) {
        await db.delete(journalTags).where(eq(journalTags.journalId, journalId));
    }

    static async delete(id: number) {
        // Delete tags first
        await db.delete(journalTags).where(eq(journalTags.journalId, id));
        await db.delete(journals).where(eq(journals.id, id));
    }
    static async getHighlights(limit = 3) {
        // Return random recent journals for Memory Lane
        return await db.select()
            .from(journals)
            .orderBy(sql`RANDOM()`)
            .limit(limit);
    }
}
