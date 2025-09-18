export interface LedgerEntry {
    userId: string;
    amount: number;
    reference: string;
    timestamp: Date;
}

export class Ledger {
    private entries: LedgerEntry[] = [];

    public addEntry(entry: LedgerEntry): void {
        this.entries.push(entry);
    }

    public getEntriesForUser(userId: string): LedgerEntry[] {
        return this.entries.filter(entry => entry.userId === userId);
    }

    public getAllEntries(): LedgerEntry[] {
        return this.entries;
    }

    public calculateBalanceForUser(userId: string): number {
        return this.entries
            .filter(entry => entry.userId === userId)
            .reduce((balance, entry) => balance + entry.amount, 0);
    }
}