export interface User {
    id: string;
    username: string;
    displayName: string;
    role: 'admin' | 'bettor';
}

export interface Event {
    id: string;
    title: string;
    payoutRule: '100%' | 'custom';
    joinCode: string;
    status: 'draft' | 'open' | 'closed' | 'settled';
    participants: Participant[];
    subCompetitions: SubCompetition[];
}

export interface SubCompetition {
    id: string;
    name: string;
    openTime: Date;
    closeTime: Date;
    status: 'open' | 'closed';
    participants: Participant[];
}

export interface Participant {
    id: string;
    name: string;
    notes?: string;
}

export interface Bet {
    id: string;
    bettorId: string;
    subCompetitionId: string;
    stakeUnits: number;
    timestamp: Date;
}

export interface Pool {
    totalUnits: number;
    participantUnits: Record<string, number>;
    houseCutPercent: number;
}

export interface Payout {
    bettorId: string;
    amount: number;
    houseCut: number;
}

export interface LedgerEntry {
    userId: string;
    amount: number;
    reference: string;
    timestamp: Date;
}

export interface JoinCode {
    value: string;
    expiration: Date;
    usageRules: string;
}

export interface Summary {
    userId: string;
    totalWon: number;
    totalLost: number;
    netOwed: Record<string, number>;
}