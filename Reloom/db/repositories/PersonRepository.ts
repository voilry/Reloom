import { db } from '../index';
import { people, entries, journalTags, reminders } from '../schema';
import { eq, desc, isNotNull, asc, sql } from 'drizzle-orm';
import { InferSelectModel, InferInsertModel } from 'drizzle-orm';

export type Person = InferSelectModel<typeof people>;
export type NewPerson = InferInsertModel<typeof people>;

export class PersonRepository {
    static async getAll(sortBy: 'name' | 'newest' | 'oldest' = 'newest') {
        let order;
        switch (sortBy) {
            case 'name': order = asc(people.name); break;
            case 'oldest': order = asc(people.createdAt); break;
            case 'newest':
            default: order = desc(people.createdAt); break;
        }
        return await db.select().from(people).orderBy(desc(people.isPinned), order);
    }

    static async togglePin(id: number, isPinned: boolean) {
        const result = await db.update(people).set({ isPinned }).where(eq(people.id, id)).returning();
        return result[0];
    }

    static async getById(id: number) {
        const result = await db.select().from(people).where(eq(people.id, id));
        return result[0] || null;
    }

    static async create(person: NewPerson) {
        const result = await db.insert(people).values(person).returning();
        return result[0];
    }

    static async update(id: number, data: Partial<NewPerson>) {
        const result = await db.update(people).set({ 
            ...data,
            updatedAt: new Date()
        }).where(eq(people.id, id)).returning();
        return result[0];
    }

    static async delete(id: number) {
        // Ideally delete related entries too (cascade or manual)
        await db.delete(entries).where(eq(entries.personId, id));
        await db.delete(people).where(eq(people.id, id));
    }

    static async getUpcomingBirthdays(limit = 3) {
        // This is a bit complex in SQLite/Drizzle without raw SQL for date parts.
        // For now, let's fetch all (if dataset small) or use a raw query if Drizzle supports it easily here.
        // Simplified: Fetch all with birthdays, filter in JS for MVP to avoid raw SQL complexity errors.
        const all = await db.select().from(people).where(isNotNull(people.birthdate));
        const today = new Date();
        const nextMonth = new Date();
        nextMonth.setDate(today.getDate() + 30);

        return all.filter(p => {
            if (!p.birthdate) return false;
            const bd = new Date(p.birthdate);
            const thisYearBd = new Date(today.getFullYear(), bd.getMonth(), bd.getDate());
            if (thisYearBd < today) {
                thisYearBd.setFullYear(today.getFullYear() + 1);
            }
            return thisYearBd >= today && thisYearBd <= nextMonth;
        }).sort((a, b) => {
            const dateA = new Date(a.birthdate!).setFullYear(today.getFullYear());
            const dateB = new Date(b.birthdate!).setFullYear(today.getFullYear());
            return dateA - dateB;
        }).slice(0, limit);
    }

    static async getReconnectSuggestions(limit = 4) {
        const allPeople = await db.select().from(people);
        // "at start it won't show unless user have spent sometime and added much"
        if (allPeople.length < 3) return [];

        const entryCounts = await db.select({
            personId: entries.personId,
            count: sql<number>`count(*)`
        }).from(entries).groupBy(entries.personId);

        const journalCounts = await db.select({
            personId: journalTags.personId,
            count: sql<number>`count(*)`
        }).from(journalTags).groupBy(journalTags.personId);

        const activityMap = new Map<number, number>();
        entryCounts.forEach(e => activityMap.set(e.personId, e.count));
        journalCounts.forEach(j => {
            activityMap.set(j.personId, (activityMap.get(j.personId) || 0) + j.count);
        });

        // Check if user has "spent some time and added much" (total activity threshold)
        const totalActivityGlobally = Array.from(activityMap.values()).reduce((a, b) => a + b, 0);
        if (totalActivityGlobally < 5) return [];

        let suggestions: any[] = [];
        const now = Date.now();

        allPeople.forEach(p => {
            const totalActivity = activityMap.get(p.id) || 0;
            const daysSinceUpdate = (now - new Date(p.updatedAt).getTime()) / (1000 * 60 * 60 * 24);
            const daysSinceCreated = (now - new Date(p.createdAt).getTime()) / (1000 * 60 * 60 * 24);

            let missingFields = 0;
            if (!p.elevatorPitch) missingFields++;
            if (!p.birthdate) missingFields++;
            if (!p.gender) missingFields++;
            if (!p.firstMet) missingFields++;
            if (!p.locationHome && !p.locationWork) missingFields++;

            if (totalActivity > 0 && missingFields >= 3) {
                suggestions.push({ person: p, reason: 'Missing details', type: 'missing-info', score: missingFields });
            } else if (totalActivity >= 3 && daysSinceUpdate > 10) {
                suggestions.push({ person: p, reason: 'Cooling off', type: 'cool-off', score: daysSinceUpdate });
            } else if (totalActivity >= 3 && daysSinceUpdate <= 10) {
                suggestions.push({ person: p, reason: 'Active', type: 'frequent', score: totalActivity });
            } else if (totalActivity === 0 && daysSinceCreated > 7) {
                suggestions.push({ person: p, reason: 'Needs attention', type: 'needs-attention', score: daysSinceCreated });
            }
        });

        if (suggestions.length === 0) return [];

        const missingInfos = suggestions.filter(s => s.type === 'missing-info').sort((a, b) => b.score - a.score);
        const frequents = suggestions.filter(s => s.type === 'frequent').sort((a, b) => b.score - a.score);
        const coolOffs = suggestions.filter(s => s.type === 'cool-off').sort((a, b) => b.score - a.score);
        const needsAttention = suggestions.filter(s => s.type === 'needs-attention').sort((a, b) => b.score - a.score);

        const finalSelection = [];
        if (missingInfos.length > 0) finalSelection.push(missingInfos[0]);
        if (coolOffs.length > 0) finalSelection.push(coolOffs[0]);
        if (frequents.length > 0) finalSelection.push(frequents[0]);
        if (missingInfos.length > 1) finalSelection.push(missingInfos[1]);
        if (coolOffs.length > 1) finalSelection.push(coolOffs[1]);
        if (needsAttention.length > 0) finalSelection.push(needsAttention[0]);

        // Dedup and limit
        const uniqueSelection = Array.from(new Set(finalSelection)).slice(0, limit);
        return uniqueSelection;
    }

    static async getPeopleSortedByActivity() {
        const allPeople = await db.select().from(people);
        
        const journalCounts = await db.select({
            personId: journalTags.personId,
            count: sql<number>`count(*)`
        }).from(journalTags).groupBy(journalTags.personId);

        const reminderCounts = await db.select({
            personId: reminders.personId,
            count: sql<number>`count(*)`
        }).from(reminders).where(isNotNull(reminders.personId)).groupBy(reminders.personId);

        const activityMap = new Map<number, number>();
        journalCounts.forEach(j => {
            activityMap.set(j.personId, j.count);
        });
        reminderCounts.forEach(r => {
            if (r.personId !== null) {
                activityMap.set(r.personId, (activityMap.get(r.personId) || 0) + r.count);
            }
        });

        return allPeople.sort((a, b) => {
            const countA = activityMap.get(a.id) || 0;
            const countB = activityMap.get(b.id) || 0;
            if (countA === countB) {
                return a.name.localeCompare(b.name);
            }
            return countB - countA;
        });
    }

    static async getPeopleSortedByNotesFrequency() {
        const allPeople = await db.select().from(people);
        
        const noteCounts = await db.select({
            personId: entries.personId,
            count: sql<number>`count(*)`
        }).from(entries).groupBy(entries.personId);

        const activityMap = new Map<number, number>();
        noteCounts.forEach(n => {
            activityMap.set(n.personId, n.count);
        });

        return allPeople.sort((a, b) => {
            const countA = activityMap.get(a.id) || 0;
            const countB = activityMap.get(b.id) || 0;
            if (countA === countB) {
                return a.name.localeCompare(b.name);
            }
            return countB - countA;
        });
    }

    static async clearAll(): Promise<void> {
        await db.delete(people);
    }
}
