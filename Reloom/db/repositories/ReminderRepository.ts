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
        let notificationId = null;
        if (data.date && data.time && !data.completed) {
            notificationId = await this.scheduleNotification(data.title, data.description || '', data.date, data.time);
        }

        const result = await db.insert(reminders).values({ ...data, notificationId }).returning();
        return result[0];
    }

    static async update(id: number, data: Partial<NewReminder>) {
        const existing = await db.select().from(reminders).where(eq(reminders.id, id));
        if (existing.length > 0) {
            const current = existing[0];
            
            // Cancel existing notification
            if (current.notificationId) {
                await Notifications.cancelScheduledNotificationAsync(current.notificationId);
            }

            // Reschedule if not completed and has time
            let notificationId = null;
            if (data.completed === false || (data.completed === undefined && !current.completed)) {
                const newTitle = data.title ?? current.title;
                const newDesc = data.description ?? current.description;
                const newDate = data.date ?? current.date;
                const newTime = data.time ?? current.time;
                
                if (newDate && newTime) {
                    notificationId = await this.scheduleNotification(newTitle, newDesc || '', newDate, newTime);
                }
            }
            data.notificationId = notificationId;
        }

        const result = await db.update(reminders).set(data).where(eq(reminders.id, id)).returning();
        return result[0];
    }

    static async delete(id: number) {
        const existing = await db.select().from(reminders).where(eq(reminders.id, id));
        if (existing.length > 0 && existing[0].notificationId) {
            await Notifications.cancelScheduledNotificationAsync(existing[0].notificationId);
        }
        await db.delete(reminders).where(eq(reminders.id, id));
    }

    private static async scheduleNotification(title: string, body: string, dateStr: string, timeStr: string) {
        const [year, month, day] = dateStr.split('-').map(Number);
        const [hour, minute] = timeStr.split(':').map(Number);
        const triggerDate = new Date(year, month - 1, day, hour, minute);

        if (triggerDate.getTime() < Date.now()) return null;

        const id = await Notifications.scheduleNotificationAsync({
            content: {
                title,
                body: body || 'You have a reminder from Reloom.',
                sound: true,
            },
            trigger: { 
                type: Notifications.SchedulableTriggerInputTypes.DATE,
                date: triggerDate 
            },
        });
        return id;
    }
}
