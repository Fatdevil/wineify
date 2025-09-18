import { Event, SubCompetition } from '../types';

let events: Event[] = [];

export const createEvent = (name: string, payoutRule: number): Event => {
    const newEvent: Event = {
        id: events.length + 1,
        name,
        payoutRule,
        subCompetitions: [],
        joinCode: generateJoinCode(),
        status: 'draft',
    };
    events.push(newEvent);
    return newEvent;
};

export const getEvents = (): Event[] => {
    return events;
};

export const getEventById = (id: number): Event | undefined => {
    return events.find(event => event.id === id);
};

export const addSubCompetition = (eventId: number, subCompetition: SubCompetition): Event | undefined => {
    const event = getEventById(eventId);
    if (event) {
        event.subCompetitions.push(subCompetition);
        return event;
    }
    return undefined;
};

const generateJoinCode = (): string => {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
};