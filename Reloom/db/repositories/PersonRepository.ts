import { db } from '../index';
import { people, entries, journals, journalTags, reminders, relationships, personGroups, contacts } from '../schema';
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
        if (allPeople.length === 0) return [];

        const [entryCounts, journalCounts, lastEntryActivity, lastJournalActivity] = await Promise.all([
            db.select({
                personId: entries.personId,
                count: sql<number>`count(*)`
            }).from(entries).groupBy(entries.personId),

            db.select({
                personId: journalTags.personId,
                count: sql<number>`count(*)`
            }).from(journalTags).groupBy(journalTags.personId),

            // Last real interaction per person (latest note or tagged journal),
            // so recency reflects activity instead of profile edits.
            db.select({
                personId: entries.personId,
                last: sql<number>`max(${entries.createdAt})`
            }).from(entries).groupBy(entries.personId),

            db.select({
                personId: journalTags.personId,
                last: sql<number>`max(${journals.createdAt})`
            }).from(journalTags).innerJoin(journals, eq(journalTags.journalId, journals.id)).groupBy(journalTags.personId),
        ]);

        const activityMap = new Map<number, number>();
        entryCounts.forEach(e => activityMap.set(e.personId, e.count));
        journalCounts.forEach(j => {
            activityMap.set(j.personId, (activityMap.get(j.personId) || 0) + j.count);
        });

        const lastActivityMap = new Map<number, number>();
        lastEntryActivity.forEach(e => {
            const t = Number(e.last);
            if (!isNaN(t)) lastActivityMap.set(e.personId, t);
        });
        lastJournalActivity.forEach(j => {
            const t = Number(j.last);
            if (!isNaN(t)) lastActivityMap.set(j.personId, Math.max(t, lastActivityMap.get(j.personId) || 0));
        });

        let suggestions: any[] = [];
        const now = Date.now();

        allPeople.forEach(p => {
            const totalActivity = activityMap.get(p.id) || 0;
            const createdTime = p.createdAt ? new Date(p.createdAt).getTime() : now;
            const daysSinceCreated = isNaN(createdTime) ? 0 : (now - createdTime) / (1000 * 60 * 60 * 24);
            const lastActivity = lastActivityMap.get(p.id);
            const daysSinceActivity = lastActivity ? (now - lastActivity) / (1000 * 60 * 60 * 24) : Number.POSITIVE_INFINITY;

            let missingFields = 0;
            if (!p.elevatorPitch) missingFields++;
            if (!p.birthdate) missingFields++;
            if (!p.gender) missingFields++;
            if (!p.firstMet) missingFields++;
            if (!p.locationHome && !p.locationWork && !p.locationOther && !p.city) missingFields++;

            if (totalActivity === 0 && daysSinceCreated > 7) {
                suggestions.push({ person: p, reason: 'Needs attention', type: 'needs-attention', score: daysSinceCreated });
            } else if (totalActivity > 0 && daysSinceActivity > 21) {
                suggestions.push({ person: p, reason: 'Cooling off', type: 'cool-off', score: daysSinceActivity });
            } else if (totalActivity > 0 && missingFields >= 3) {
                suggestions.push({ person: p, reason: 'Missing details', type: 'missing-info', score: missingFields });
            } else if (totalActivity > 0) {
                suggestions.push({ person: p, reason: 'Active', type: 'frequent', score: totalActivity });
            }
        });

        if (suggestions.length === 0) return [];

        const frequents = suggestions.filter(s => s.type === 'frequent').sort((a, b) => b.score - a.score);
        const needsAttention = suggestions.filter(s => s.type === 'needs-attention').sort((a, b) => b.score - a.score);
        const coolOffs = suggestions.filter(s => s.type === 'cool-off').sort((a, b) => b.score - a.score);
        const missingInfos = suggestions.filter(s => s.type === 'missing-info').sort((a, b) => b.score - a.score);

        // Round-robin across categories so no single type can starve the others.
        const pools = [frequents, needsAttention, coolOffs, missingInfos];
        const finalSelection: any[] = [];
        for (let i = 0; finalSelection.length < limit; i++) {
            let progressed = false;
            for (const pool of pools) {
                if (i < pool.length && finalSelection.length < limit) {
                    finalSelection.push(pool[i]);
                    progressed = true;
                }
            }
            if (!progressed) break;
        }

        return finalSelection.slice(0, limit);
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
