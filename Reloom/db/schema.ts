import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

// People
export const people = sqliteTable('people', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    name: text('name').notNull(),
    elevatorPitch: text('elevator_pitch'), // Short "Headline"
    description: text('description'), // Long formatted text
    avatarUri: text('avatar_uri'),
    gender: text('gender'), // "Male", "Female", "Other", etc.
    birthdate: text('birthdate'), // ISO YYYY-MM-DD
    firstMet: text('first_met'), // ISO YYYY-MM-DD
    isPinned: integer('is_pinned', { mode: 'boolean' }).default(false),
    // New Direct Location Fields
    locationHome: text('location_home'),
    locationWork: text('location_work'),
    locationOther: text('location_other'),
    city: text('city'),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()), // ...
    updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
});

// Entry Types (e.g., "Gift Ideas", "Politics")
export const entryTypes = sqliteTable('entry_types', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    label: text('label').notNull().unique(),
    isSystem: integer('is_system', { mode: 'boolean' }).default(false), // e.g. for standard fields if we had any
});

// Entries
export const entries = sqliteTable('entries', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    personId: integer('person_id').references(() => people.id).notNull(),
    typeId: integer('type_id').references(() => entryTypes.id).notNull(),
    content: text('content').notNull(),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
});

// Relationships
export const relationships = sqliteTable('relationships', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    sourcePersonId: integer('source_person_id').references(() => people.id).notNull(),
    targetPersonId: integer('target_person_id').references(() => people.id).notNull(),
    relationType: text('relation_type'), // e.g. "Sister", "Coworker"
    strength: integer('strength'), // Optional: for graph visualization weight
});



// Journals (Daily Log)
export const journals = sqliteTable('journals', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    date: text('date').notNull(), // ISO Date String YYYY-MM-DD
    title: text('title'), // Optional title
    content: text('content'), // The full text of the journal
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
});

// Journal Tags (People mentions)
export const journalTags = sqliteTable('journal_tags', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    journalId: integer('journal_id').references(() => journals.id).notNull(),
    personId: integer('person_id').references(() => people.id).notNull(),
});

// Reminders & Upcoming Events
export const reminders = sqliteTable('reminders', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    title: text('title').notNull(),
    description: text('description'),
    date: text('date').notNull(), // ISO Date String YYYY-MM-DD
    time: text('time'), // ISO Time String HH:MM
    personId: integer('person_id').references(() => people.id), // Optional: Link to a person
    notificationId: text('notification_id'), // To cancel/update local notifications
    completed: integer('completed', { mode: 'boolean' }).default(false),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
});

// Groups (Tags/Categories for People)
export const groups = sqliteTable('groups', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    name: text('name').notNull(),
    icon: text('icon'), // Lucide icon name
    color: text('color'), // Hex color
    isSystem: integer('is_system', { mode: 'boolean' }).default(false), // e.g. "Favorites"
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
});

// Person Groups (Junction)
export const personGroups = sqliteTable('person_groups', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    personId: integer('person_id').references(() => people.id).notNull(),
    groupId: integer('group_id').references(() => groups.id).notNull(),
});

// Contacts (Phone, Email, Social Media)
export const contacts = sqliteTable('contacts', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    personId: integer('person_id').references(() => people.id).notNull(),
    platform: text('platform').notNull(), // "Phone", "Email", "Instagram", "WhatsApp", "X", "LinkedIn"
    value: text('value').notNull(),       // the number, email, or handle
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
});
