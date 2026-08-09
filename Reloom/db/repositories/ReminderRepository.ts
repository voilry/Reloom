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
            setTimeout(async () => {
                try {
                    // Check if reminder still exists before updating
                    const check = await db.select().from(reminders).where(eq(reminders.id, newReminder.id));
                    if (check.length > 0 && !check[0].completed) {
                        const notificationId = await this.scheduleNotifications(
                            data.title, 
                            data.description || '', 
                            data.date, 
                            data.time as string, 
                            data.nudgeType || 'on_time', 
                            data.customNudgesCount || 0
                        );
                        if (notificationId) {
                            // Re-verify reminder still exists after async schedule
                            const recheck = await db.select().from(reminders).where(eq(reminders.id, newReminder.id));
                            if (recheck.length > 0 && !recheck[0].completed) {
                                await db.update(reminders).set({ notificationId }).where(eq(reminders.id, newReminder.id)).catch(() => {});
                            } else {
                                const ids = notificationId.split(',').map(id => id.trim()).filter(Boolean);
                                await Promise.all(ids.map(nid => Notifications.cancelScheduledNotificationAsync(nid).catch(() => {})));
                            }
                        }
                    }
                } catch (err) {
                    console.error('Error scheduling notification in background:', err);
                }
            }, 300);
        }

        return newReminder;
    }

    static async update(id: number, data: Partial<NewReminder>) {
        const result = await db.update(reminders).set(data).where(eq(reminders.id, id)).returning();
        const updatedReminder = result[0];

        setTimeout(async () => {
            try {
                const existing = await db.select().from(reminders).where(eq(reminders.id, id));
                if (existing.length > 0) {
                    const current = existing[0];
                    if (current.notificationId) {
                        const ids = current.notificationId.split(',')
                            .map(id => id.trim())
                            .filter(id => Boolean(id) && id !== 'null' && id !== 'undefined');
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

                    await db.update(reminders).set({ notificationId: newNotificationId }).where(eq(reminders.id, id)).catch(() => {});
                }
            } catch (err) {
                console.error('Error updating notification background state:', err);
            }
        }, 300);

        return updatedReminder;
    }

    static async delete(id: number) {
        const existing = await db.select().from(reminders).where(eq(reminders.id, id));
        if (existing.length > 0 && existing[0].notificationId) {
            const ids = existing[0].notificationId.split(',')
                .map(id => id.trim())
                .filter(id => Boolean(id) && id !== 'null' && id !== 'undefined');
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
        if (nudgeType === 'off' || !dateStr || !timeStr) return null;

        const dateParts = dateStr.split('-').map(Number);
        if (dateParts.length < 3 || dateParts.some(isNaN)) return null;
        const [year, month, day] = dateParts;

        // Clean time string (support "09:30 AM", "9:5", "14:30")
        const cleanTime = timeStr.trim().toUpperCase();
        let hours = 0;
        let minutes = 0;

        if (cleanTime.includes('AM') || cleanTime.includes('PM')) {
            const isPM = cleanTime.includes('PM');
            const timeWithoutPeriod = cleanTime.replace(/AM|PM/g, '').trim();
            const timeParts = timeWithoutPeriod.split(':').map(Number);
            hours = timeParts[0] || 0;
            minutes = timeParts[1] || 0;
            if (isPM && hours < 12) hours += 12;
            if (!isPM && hours === 12) hours = 0;
        } else {
            const timeParts = cleanTime.split(':').map(Number);
            hours = timeParts[0] || 0;
            minutes = timeParts[1] || 0;
        }

        if (isNaN(hours) || isNaN(minutes)) return null;

        const triggerDate = new Date(year, month - 1, day, hours, minutes);
        if (isNaN(triggerDate.getTime()) || triggerDate.getTime() < Date.now()) return null;

        // Calculate offsets in minutes
        const offsets: number[] = [0]; // always include on-time (0 mins before)
        if (nudgeType === 'nudge') {
            offsets.push(30);
        } else if (nudgeType === 'deep') {
            offsets.push(30, 120);
        } else if (nudgeType === 'extreme') {
            offsets.push(10, 30, 120, 1440);
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
