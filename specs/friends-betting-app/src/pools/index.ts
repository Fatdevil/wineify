import { Bet } from '../bets';
import { Participant } from '../participants';

export interface Pool {
    totalUnits: number;
    participantUnits: Record<string, number>;
    houseCutPercent: number;
}

export function createPool(): Pool {
    return {
        totalUnits: 0,
        participantUnits: {},
        houseCutPercent: 0,
    };
}

export function addStake(pool: Pool, participant: Participant, units: number): void {
    pool.totalUnits += units;
    if (!pool.participantUnits[participant.name]) {
        pool.participantUnits[participant.name] = 0;
    }
    pool.participantUnits[participant.name] += units;
}

export function calculatePayouts(pool: Pool, payoutRule: number): Record<string, number> {
    const payouts: Record<string, number> = {};
    const totalPayout = pool.totalUnits * (payoutRule / 100);
    
    for (const participant in pool.participantUnits) {
        const participantStake = pool.participantUnits[participant];
        payouts[participant] = (participantStake / pool.totalUnits) * totalPayout;
    }
    
    return payouts;
}