export function calculatePayouts(pool: number, winners: Array<{ userId: string; stake: number }>, houseCut: number = 0): Array<{ userId: string; payout: number }> {
    const totalStake = winners.reduce((total, winner) => total + winner.stake, 0);
    const totalPayout = pool * (1 - houseCut);
    const payouts = winners.map(winner => {
        const share = winner.stake / totalStake;
        return {
            userId: winner.userId,
            payout: totalPayout * share
        };
    });
    return payouts;
}

export function distributePayouts(payouts: Array<{ userId: string; payout: number }>, ledger: Map<string, number>): void {
    payouts.forEach(({ userId, payout }) => {
        const currentBalance = ledger.get(userId) || 0;
        ledger.set(userId, currentBalance + payout);
    });
}