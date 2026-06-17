import { db } from '../index';
import { reminders, people } from '../schema';
import { eq, desc, and, asc } from 'drizzle-orm';
import { InferSelectModel, InferInsertModel } from 'drizzle-orm';
import * as Notifications from 'expo-notifications';

export type Reminder = InferSelectModel<typeof reminders>;
export type NewReminder = InferInsertModel<typeof reminders>;

export class ReminderRepository {
    static async getAll() {
        return await db.select({
            id: reminders.id,
            title: reminders.title,
            description: reminders.description,
            date: reminders.date,
            time: reminders.time,
            personId: reminders.personId,
            notificationId: reminders.notificationId,
            completed: reminders.completed,
            nudgeType: reminders.nudgeType,
            customNudgesCount: reminders.customNudgesCount,
            createdAt: reminders.createdAt,
            person: {
                id: people.id,
                name: people.name,
                avatarUri: people.avatarUri
            }
        })
        .from(reminders)
        .leftJoin(people, eq(reminders.personId, people.id))
        .orderBy(asc(reminders.date));
    }

    static async getByDate(date: string) {
        return await db.select({
            id: reminders.id,
            title: reminders.title,
            description: reminders.description,
            date: reminders.date,
            time: reminders.time,
            personId: reminders.personId,
            notificationId: reminders.notificationId,
            completed: reminders.completed,
            nudgeType: reminders.nudgeType,
            customNudgesCount: reminders.customNudgesCount,
            createdAt: reminders.createdAt,
            person: {
                id: people.id,
                name: people.name,
                avatarUri: people.avatarUri
            }
        })
        .from(reminders)
        .where(eq(reminders.date, date))
        .leftJoin(people, eq(reminders.personId, people.id))
        .orderBy(asc(reminders.time));
    }

    static async create(data: NewReminder) {
        const result = await db.insert(reminders).values({ ...data, notificationId: null }).returning();
        const newReminder = result[0];

        if (data.date && data.time && !data.completed) {
            // Delay notification scheduling slightly so it doesn't interrupt the UI modal closing transition
            setTimeout(() => {
                this.scheduleNotifications(
                    data.title, 
                    data.description || '', 
                    data.date, 
                    data.time as string, 
                    data.nudgeType || 'on_time', 
                    data.customNudgesCount || 0
                )
                .then(async (notificationId) => {
                    if (notificationId) {
                        await db.update(reminders).set({ notificationId }).where(eq(reminders.id, newReminder.id)).catch(() => {});
                    }
                })
                .catch(err => console.error('Error scheduling notification in background:', err));
            }, 600);
        }

        return newReminder;
    }

    static async update(id: number, data: Partial<NewReminder>) {
        const result = await db.update(reminders).set(data).where(eq(reminders.id, id)).returning();
        const updatedReminder = result[0];

        // Process notification changes in the background (delayed to avoid UI main thread lag)
        setTimeout(() => {
            db.select().from(reminders).where(eq(reminders.id, id))
                .then(existing => {
                    if (existing.length > 0) {
                        const current = existing[0];
                        (async () => {
                            // Cancel all previous sub-notifications
                            if (current.notificationId) {
                                const ids = current.notificationId.split(',').map(id => id.trim()).filter(Boolean);
                                await Promise.all(ids.map(nid => 
                                    Notifications.cancelScheduledNotificationAsync(nid).catch(() => {})
                                ));
                            }

                            let newNotificationId: string | null = null;
                            const isCompleted = data.completed ?? current.completed;

                            if (!isCompleted) {
                                const newTitle = data.title ?? current.title;
                                const newDesc = data.description ?? current.description;
                                const newDate = data.date ?? current.date;
                                const newTime = data.time ?? current.time;
                                const newNudgeType = data.nudgeType ?? current.nudgeType ?? 'on_time';
                                const newCustomCount = data.customNudgesCount ?? current.customNudgesCount ?? 0;
                                
                                if (newDate && newTime) {
                                    newNotificationId = await this.scheduleNotifications(
                                        newTitle, 
                                        newDesc || '', 
                                        newDate, 
                                        newTime, 
                                        newNudgeType, 
                                        newCustomCount
                                    ).catch(() => null);
                                }
                            }

                            // Always update db to match scheduled state (null or new IDs)
                            await db.update(reminders).set({ notificationId: newNotificationId }).where(eq(reminders.id, id)).catch(() => {});
                        })().catch(() => {});
                    }
                })
                .catch(() => {});
        }, 600);

        return updatedReminder;
    }

    static async delete(id: number) {
        const existing = await db.select().from(reminders).where(eq(reminders.id, id));
        if (existing.length > 0 && existing[0].notificationId) {
            const ids = existing[0].notificationId.split(',').map(id => id.trim()).filter(Boolean);
            await Promise.all(ids.map(nid => 
                Notifications.cancelScheduledNotificationAsync(nid).catch(() => {})
            ));
        }
        await db.delete(reminders).where(eq(reminders.id, id));
    }

    private static async scheduleNotifications(
        title: string, 
        body: string, 
        dateStr: string, 
        timeStr: string, 
        nudgeType: string = 'on_time', 
        customNudgesCount: number = 0
    ): Promise<string | null> {
        if (nudgeType === 'off') return null;

        const [year, month, day] = dateStr.split('-').map(Number);
        const [hour, minute] = timeStr.split(':').map(Number);
        const triggerDate = new Date(year, month - 1, day, hour, minute);

        if (triggerDate.getTime() < Date.now()) return null;

        // Calculate offsets in minutes
        const offsets: number[] = [0]; // always include on-time (0 mins before)
        if (nudgeType === 'nudge') {
            offsets.push(30); // 30m before
        } else if (nudgeType === 'deep') {
            offsets.push(30, 120); // 30m, 2h before
        } else if (nudgeType === 'extreme') {
            offsets.push(10, 30, 120, 1440); // 10m, 30m, 2h, 24h before
        } else if (nudgeType === 'custom' && customNudgesCount > 0) {
            const diffMs = triggerDate.getTime() - Date.now();
            const diffMins = Math.floor(diffMs / 60000);
            if (diffMins > 5) {
                const step = Math.floor(diffMins / customNudgesCount);
                for (let i = 1; i < customNudgesCount; i++) {
                    const offset = i * step;
                    if (offset > 0 && offset < diffMins) {
                        offsets.push(offset);
                    }
                }
            }
        }

        const notificationPromises = offsets.map(async (offset) => {
            const pingTime = new Date(triggerDate.getTime() - offset * 60000);
            if (pingTime.getTime() > Date.now()) {
                const labelSuffix = offset === 0 ? "" : ` (in ${offset}m)`;
                try {
                    return await Notifications.scheduleNotificationAsync({
                        content: {
                            title: title + labelSuffix,
                            body: body || 'You have a reminder from Reloom.',
                            sound: true,
                        },
                        trigger: { 
                            type: Notifications.SchedulableTriggerInputTypes.DATE,
                            date: pingTime
                        },
                    });
                } catch (e) {
                    console.error("Failed to schedule sub-notification:", e);
                    return null;
                }
            }
            return null;
        });

        const scheduledIds = (await Promise.all(notificationPromises)).filter(Boolean) as string[];

        return scheduledIds.length > 0 ? scheduledIds.join(',') : null;
    }
}
