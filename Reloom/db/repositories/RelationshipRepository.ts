import { db } from '../index';
import { relationships } from '../schema';
import { eq, or, and, desc } from 'drizzle-orm';

export interface Relationship {
    id: number;
    sourcePersonId: number;
    targetPersonId: number;
    relationType: string | null;
    strength: number | null;
}

export const RelationshipRepository = {
    async getAll(): Promise<Relationship[]> {
        return db.select().from(relationships).orderBy(desc(relationships.id));
    },

    async getForPerson(personId: number): Promise<Relationship[]> {
        return db.select().from(relationships)
            .where(or(
                eq(relationships.sourcePersonId, personId),
                eq(relationships.targetPersonId, personId)
            ))
            .orderBy(desc(relationships.id));
    },

    async add(sourcePersonId: number, targetPersonId: number, relationType?: string, strength?: number): Promise<void> {
        const existing = await db.select().from(relationships).where(
            or(
                and(eq(relationships.sourcePersonId, sourcePersonId), eq(relationships.targetPersonId, targetPersonId)),
                and(eq(relationships.sourcePersonId, targetPersonId), eq(relationships.targetPersonId, sourcePersonId))
            )
        );
        if (existing.length > 0) return;

        await db.insert(relationships).values({
            sourcePersonId,
            targetPersonId,
            relationType: relationType || null,
            strength: strength || null
        });
    },

    async delete(id: number): Promise<void> {
        await db.delete(relationships).where(eq(relationships.id, id));
    },

    async deleteForPerson(personId: number): Promise<void> {
        await db.delete(relationships).where(or(
            eq(relationships.sourcePersonId, personId),
            eq(relationships.targetPersonId, personId)
        ));
    }
};
