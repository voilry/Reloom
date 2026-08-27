import { db } from '../index';
import { people, entries, journalTags, reminders, relationships, personGroups, contacts } from '../schema';
import { eq, desc, isNotNull, asc, sql, or } from 'drizzle-orm';
import { InferSelectModel, InferInsertModel } from 'drizzle-orm';
import * as Notifications from 'expo-notifications';

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
        // Query reminders first to cancel scheduled OS notifications
        try {
            const personReminders = await db.select().from(reminders).where(eq(reminders.personId, id));
            await Promise.allSettled(
                personReminders.map(r => {
                    if (r.notificationId) {
                        return Notifications.cancelScheduledNotificationAsync(r.notificationId).catch(() => {});
                    }
                    return Promise.resolve();
                })
            );
        } catch (e) {
            console.error('Failed to cancel notifications for deleted person:', e);
        }

        // Fallback explicit delete for child and junction records
        await db.delete(entries).where(eq(entries.personId, id));
        await db.delete(journalTags).where(eq(journalTags.personId, id));
        await db.delete(personGroups).where(eq(personGroups.personId, id));
        await db.delete(contacts).where(eq(contacts.personId, id));
        await db.delete(reminders).where(eq(reminders.personId, id));
        await db.delete(relationships).where(or(eq(relationships.sourcePersonId, id), eq(relationships.targetPersonId, id)));
        await db.delete(people).where(eq(people.id, id));
    }

    static async getUpcomingBirthdays(limit = 3) {
        const all = await db.select().from(people).where(isNotNull(people.birthdate));
        const today = new Date();
        const currentYear = today.getFullYear();

        const todayStart = new Date(currentYear, today.getMonth(), today.getDate());
        const nextMonth = new Date(todayStart.getTime() + 30 * 24 * 60 * 60 * 1000);

        const itemsWithTargetDate = all.map(p => {
            if (!p.birthdate) return null;
            const normalized = p.birthdate.trim().replace(/\//g, '-');
            const parts = normalized.split('-').map(Number);
            if (parts.length < 3 || parts.some(isNaN)) return null;

            const [, bMonthStr, bDayStr] = parts;
            const bMonth = bMonthStr - 1; // 0-indexed month
            const bDay = bDayStr;

            // Handle Feb 29 in non-leap years
            let targetDate = new Date(currentYear, bMonth, bDay);
            if (bMonth === 1 && bDay === 29 && targetDate.getMonth() !== 1) {
                targetDate = new Date(currentYear, 1, 28);
            }

            if (targetDate < todayStart) {
                targetDate = new Date(currentYear + 1, bMonth, bDay);
                if (bMonth === 1 && bDay === 29 && targetDate.getMonth() !== 1) {
                    targetDate = new Date(currentYear + 1, 1, 28);
                }
            }

            return { person: p, targetDate };
        }).filter((x): x is { person: Person, targetDate: Date } => x !== null);

        return itemsWithTargetDate
            .filter(x => x.targetDate >= todayStart && x.targetDate <= nextMonth)
            .sort((a, b) => a.targetDate.getTime() - b.targetDate.getTime())
            .map(x => x.person)
            .slice(0, limit);
    }

    static async getReconnectSuggestions(limit = 4) {
        const allPeople = await db.select().from(people);
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

        const totalActivityGlobally = Array.from(activityMap.values()).reduce((a, b) => a + b, 0);
        if (totalActivityGlobally < 5) return [];

        let suggestions: any[] = [];
        const now = Date.now();

        allPeople.forEach(p => {
            const totalActivity = activityMap.get(p.id) || 0;
            const updatedTime = p.updatedAt ? new Date(p.updatedAt).getTime() : now;
            const createdTime = p.createdAt ? new Date(p.createdAt).getTime() : now;
            const daysSinceUpdate = isNaN(updatedTime) ? 0 : (now - updatedTime) / (1000 * 60 * 60 * 24);
            const daysSinceCreated = isNaN(createdTime) ? 0 : (now - createdTime) / (1000 * 60 * 60 * 24);

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

        const finalSelection: any[] = [];
        if (missingInfos.length > 0) finalSelection.push(missingInfos[0]);
        if (coolOffs.length > 0) finalSelection.push(coolOffs[0]);
        if (frequents.length > 0) finalSelection.push(frequents[0]);
        if (missingInfos.length > 1) finalSelection.push(missingInfos[1]);
        if (coolOffs.length > 1) finalSelection.push(coolOffs[1]);
        if (needsAttention.length > 0) finalSelection.push(needsAttention[0]);

        const validSelection = finalSelection.filter(Boolean);
        const uniqueSelection = Array.from(new Set(validSelection)).slice(0, limit);
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
