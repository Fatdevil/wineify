export interface EventSummary {
  id: string;
  title: string;
  description: string;
  status: 'open' | 'closed' | 'settled';
  closesAt: string;
  totalPool: number;
}

export interface Bet {
  id: string;
  eventId: string;
  eventTitle: string;
  outcome: string;
  odds: number;
  stake: number;
  potentialPayout: number;
  status: 'pending' | 'won' | 'lost' | 'refunded';
  settledAt?: string;
}

export interface ResultDetail {
  id: string;
  eventId: string;
  eventTitle: string;
  competition: string;
  winningOutcome: string;
  payoutPerUnit: number;
  settledAt: string;
}

export interface Settlement {
  id: string;
  counterparty: string;
  amount: number;
  status: 'pending' | 'received';
  dueDate?: string;
}
