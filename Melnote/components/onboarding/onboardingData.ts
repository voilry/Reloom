import type { Person } from '../../db/repositories/PersonRepository';

export type CardStyle = 'list' | 'gallery';

export interface SamplePerson extends Person {
    /** Relationship label shown in the social web. */
    relation: string;
    /** Short headline shown under a person's name. */
    pitch: string;
}

function samplePerson(
    id: number,
    name: string,
    relation: string,
    pitch: string
): SamplePerson {
    return {
        id,
        name,
        relation,
        pitch,
        elevatorPitch: pitch,
        description: null,
        avatarUri: null,
        gender: null,
        birthdate: null,
        firstMet: null,
        isPinned: false,
        locationHome: null,
        locationWork: null,
        locationOther: null,
        city: null,
        createdAt: new Date(0),
        updatedAt: new Date(0),
    };
}

export const SAMPLE_PEOPLE: SamplePerson[] = [
    samplePerson(1, 'Maya Chen', 'Friend', 'Moving to Lisbon in April'),
    samplePerson(2, 'Theo Alvarez', 'Work', 'Opening a ceramics studio'),
    samplePerson(3, 'June Park', 'Family', 'Sunday lunch at hers'),
    samplePerson(4, 'Sam Okafor', 'Friend', 'Runs the bakery on 5th'),
];

export interface SampleGroup {
    name: string;
    count: number;
    color: string;
    icon: string;
}

export const SAMPLE_GROUPS: SampleGroup[] = [
    { name: 'Family', count: 4, color: '#F43F5E', icon: 'Heart' },
    { name: 'Work', count: 8, color: '#6366F1', icon: 'Briefcase' },
    { name: 'Close friends', count: 5, color: '#10B981', icon: 'Users' },
];

export const SAMPLE_CONTACT = {
    platform: 'Instagram',
    value: '@maya.chen',
};

export const SAMPLE_NOTE =
    'She loves drinking coffee at 7 in the morning.';
