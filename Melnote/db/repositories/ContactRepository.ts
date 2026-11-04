import { db } from '../index';
import { contacts } from '../schema';
import { eq } from 'drizzle-orm';

export interface ContactData {
    personId: number;
    platform: string;
    value: string;
}

export type Contact = typeof contacts.$inferSelect;

export const ContactRepository = {
    async getById(id: number) {
        const result = await db.select().from(contacts).where(eq(contacts.id, id));
        return result.length > 0 ? result[0] : null;
    },

    async getContactsForPerson(personId: number) {
        return await db.select().from(contacts).where(eq(contacts.personId, personId));
    },

    async addContact(data: ContactData) {
        const result = await db.insert(contacts).values(data).returning();
        return result[0];
    },

    async updateContact(id: number, data: Partial<ContactData>) {
        const result = await db.update(contacts).set(data).where(eq(contacts.id, id)).returning();
        return result[0];
    },

    async deleteContact(id: number) {
        await db.delete(contacts).where(eq(contacts.id, id));
    }
};
