import { db } from '../index';
import { people, entries, journals, journalTags, entryTypes, relationships, groups, personGroups, reminders, contacts } from '../schema';
import * as FileSystem from 'expo-file-system/legacy';

export const DataRepository = {
    async clearAllData(): Promise<void> {
        await db.delete(journalTags);
        await db.delete(journals);
        await db.delete(relationships);
        await db.delete(personGroups);
        await db.delete(groups);
        await db.delete(reminders);
        await db.delete(contacts);
        await db.delete(entries);
        await db.delete(people);
        await db.delete(entryTypes);
    },

    async exportAllData(): Promise<any> {
        const [p, e, r, j, jt, et, g, pg, rem, c] = await Promise.all([
            db.select().from(people),
            db.select().from(entries),
            db.select().from(relationships),
            db.select().from(journals),
            db.select().from(journalTags),
            db.select().from(entryTypes),
            db.select().from(groups),
            db.select().from(personGroups),
            db.select().from(reminders),
            db.select().from(contacts)
        ]);

        // Process avatars sequentially to avoid memory bloat during Base64 encoding
        const peopleWithImages: any[] = [];
        for (const person of p) {
            if (person.avatarUri && person.avatarUri.startsWith('file://')) {
                try {
                    const base64 = await FileSystem.readAsStringAsync(person.avatarUri, { encoding: FileSystem.EncodingType.Base64 });
                    peopleWithImages.push({ ...person, _avatarBase64: base64 });
                    continue;
                } catch (e) {
                    console.log('Could not encode image for', person.name);
                }
            }
            peopleWithImages.push(person);
        }

        return {
            version: "0.1 alpha",
            exportedAt: new Date().toISOString(),
            data: {
                people: peopleWithImages,
                entries: e,
                relationships: r,
                journals: j,
                journalTags: jt,
                entryTypes: et,
                groups: g,
                personGroups: pg,
                reminders: rem,
                contacts: c
            }
        };
    },

    async importData(importedInput: any): Promise<void> {
        console.log('Starting data import...');

        // Support both wrapped and unwrapped formats for maximum compatibility
        const imported = importedInput?.data ? importedInput.data : importedInput;

        if (!imported || typeof imported !== 'object') {
            throw new Error("File content is not a valid data object");
        }

        const {
            people: p,
            entries: e,
            relationships: r,
            journals: j,
            journalTags: jt,
            entryTypes: et,
            groups: g,
            personGroups: pg,
            reminders: rem,
            contacts: c
        } = imported;

        const createdAvatarUris: string[] = [];

        const mapDates = (item: any) => {
            const newItem = { ...item };
            if (newItem.createdAt) {
                const parsed = new Date(newItem.createdAt);
                if (!isNaN(parsed.getTime())) newItem.createdAt = parsed;
            }
            if (newItem.updatedAt) {
                const parsed = new Date(newItem.updatedAt);
                if (!isNaN(parsed.getTime())) newItem.updatedAt = parsed;
            }
            return newItem;
        };

        const mapPersonImages = async (person: any) => {
            const newPerson = mapDates(person);
            if (newPerson._avatarBase64) {
                try {
                    const avatarsDir = `${FileSystem.documentDirectory}avatars/`;
                    const dirInfo = await FileSystem.getInfoAsync(avatarsDir);
                    if (!dirInfo.exists) {
                        await FileSystem.makeDirectoryAsync(avatarsDir, { intermediates: true });
                    }
                    const filename = `avatar_${Date.now()}_${Math.random().toString(36).substring(7)}.jpg`;
                    const fileUri = `${avatarsDir}${filename}`;
                    await FileSystem.writeAsStringAsync(fileUri, newPerson._avatarBase64, { encoding: FileSystem.EncodingType.Base64 });
                    newPerson.avatarUri = fileUri;
                    createdAvatarUris.push(fileUri);
                } catch (e) {
                    console.error("Failed to decode image during import", e);
                }
                delete newPerson._avatarBase64;
            }
            return newPerson;
        };

        // Prepare people images sequentially to prevent heap memory exhaustion
        const mappedPeople: any[] = [];
        if (p?.length) {
            for (const person of p) {
                const mapped = await mapPersonImages(person);
                mappedPeople.push(mapped);
            }
        }

        try {
            await db.transaction(async (tx) => {
                console.log('Clearing existing records inside transaction...');
                await tx.delete(journalTags);
                await tx.delete(journals);
                await tx.delete(relationships);
                await tx.delete(personGroups);
                await tx.delete(groups);
                await tx.delete(reminders);
                await tx.delete(contacts);
                await tx.delete(entries);
                await tx.delete(people);
                await tx.delete(entryTypes);

                console.log('Restoring entry types...');
                if (et?.length) {
                    for (const item of et) {
                        await tx.insert(entryTypes).values(item).onConflictDoNothing();
                    }
                }

                console.log(`Restoring ${mappedPeople.length} people...`);
                if (mappedPeople.length) {
                    await tx.insert(people).values(mappedPeople);
                }

                console.log(`Restoring ${e?.length || 0} entries...`);
                if (e?.length) {
                    const mappedEntries = e.map(mapDates);
                    await tx.insert(entries).values(mappedEntries);
                }

                console.log(`Restoring ${j?.length || 0} journals...`);
                if (j?.length) {
                    const mappedJournals = j.map(mapDates);
                    await tx.insert(journals).values(mappedJournals);
                }

                console.log('Restoring junction maps...');
                if (r?.length) await tx.insert(relationships).values(r);
                if (jt?.length) await tx.insert(journalTags).values(jt);

                console.log(`Restoring ${g?.length || 0} groups...`);
                if (g?.length) {
                    const mappedGroups = g.map(mapDates);
                    await tx.insert(groups).values(mappedGroups);
                }
                if (pg?.length) await tx.insert(personGroups).values(pg);

                console.log(`Restoring ${rem?.length || 0} reminders...`);
                if (rem?.length) {
                    const mappedReminders = rem.map(mapDates);
                    await tx.insert(reminders).values(mappedReminders);
                }

                console.log(`Restoring ${c?.length || 0} contacts...`);
                if (c?.length) {
                    const mappedContacts = c.map(mapDates);
                    await tx.insert(contacts).values(mappedContacts);
                }
            });

            console.log('Import successful!');
        } catch (error: any) {
            console.error('Import process failed at database level:', error);
            // Clean up avatar files created on disk prior to failure
            for (const fileUri of createdAvatarUris) {
                try {
                    await FileSystem.deleteAsync(fileUri, { idempotent: true });
                } catch (e) {}
            }
            throw new Error(`Database error: ${error.message || "Unknown constraint violation"}`);
        }
    }
};
