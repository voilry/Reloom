import { db } from '../index';
import { groups, personGroups, people } from '../schema';
import { eq, and, desc, inArray, asc } from 'drizzle-orm';
import { InferSelectModel, InferInsertModel } from 'drizzle-orm';

export type Group = InferSelectModel<typeof groups>;
export type NewGroup = InferInsertModel<typeof groups>;

export class GroupRepository {
    // Get all groups (System groups first, then alphabetical or creating order)
    static async getAll() {
        return await db.select().from(groups);
    }

    static async create(group: NewGroup) {
        // Ensure color is present, defaults are handled by DB but NewGroup type might be strict
        const result = await db.insert(groups).values(group).returning();
        return result[0];
    }

    static async delete(id: number) {
        await db.delete(personGroups).where(eq(personGroups.groupId, id));
        await db.delete(groups).where(eq(groups.id, id));
    }

    static async update(id: number, data: Partial<NewGroup>) {
        const result = await db.update(groups).set(data).where(eq(groups.id, id)).returning();
        return result[0];
    }

    // Junction Ops
    static async addPersonToGroup(personId: number, groupId: number) {
        // Check if exists
        const existing = await db.select()
            .from(personGroups)
            .where(and(
                eq(personGroups.personId, personId),
                eq(personGroups.groupId, groupId)
            ));

        if (existing.length > 0) return existing[0];

        const result = await db.insert(personGroups).values({
            personId,
            groupId
        }).returning();
        return result[0];
    }

    static async removePersonFromGroup(personId: number, groupId: number) {
        await db.delete(personGroups)
            .where(and(
                eq(personGroups.personId, personId),
                eq(personGroups.groupId, groupId)
            ));
    }

    static async getGroupsForPerson(personId: number) {
        const rows = await db.select({
            group: groups
        })
            .from(personGroups)
            .innerJoin(groups, eq(personGroups.groupId, groups.id))
            .where(eq(personGroups.personId, personId));

        return rows.map(r => r.group);
    }

    static async getPeopleInGroup(groupId: number, sortBy: 'name' | 'newest' | 'oldest' = 'newest') {
        let order;
        switch (sortBy) {
            case 'name': order = asc(people.name); break;
            case 'oldest': order = asc(people.createdAt); break;
            case 'newest':
            default: order = desc(people.createdAt); break;
        }

        const rows = await db.select({
            person: people
        })
            .from(personGroups)
            .innerJoin(people, eq(personGroups.personId, people.id))
            .where(eq(personGroups.groupId, groupId))
            .orderBy(desc(people.isPinned), order);

        return rows.map(r => r.person);
    }
}
