import { useQuery } from '@tanstack/react-query';
import api from '../lib/api';
import type { Bet } from '../types';

interface BetsResponse {
  bets: Bet[];
}

const statusStyles: Record<Bet['status'], string> = {
  pending: 'bg-yellow-500/20 text-yellow-100',
  won: 'bg-emerald-500/20 text-emerald-200',
  lost: 'bg-rose-500/20 text-rose-200',
  refunded: 'bg-slate-500/20 text-slate-200'
};

const statusLabel: Record<Bet['status'], string> = {
  pending: 'Pending',
  won: 'Win',
  lost: 'Loss',
  refunded: 'Refund'
};

const fetchBets = async (): Promise<Bet[]> => {
  const { data } = await api.get<BetsResponse>('/bets/mine');
  return data.bets;
};

export default function MyBets() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['bets'],
    queryFn: fetchBets
  });

  if (isLoading) {
    return <p className="text-sm text-slate-300">Loading your bets…</p>;
  }

  if (isError) {
    return <p className="text-sm text-red-400">Unable to load bets right now.</p>;
  }

  if (!data?.length) {
    return <p className="text-sm text-slate-300">You have not placed any bets yet.</p>;
  }

  return (
    <div className="space-y-4">
      {data.map((bet) => (
        <article key={bet.id} className="rounded-xl bg-slate-800/60 p-4 ring-1 ring-slate-700">
          <div className="mb-2 flex items-center justify-between">
            <div>
              <h3 className="text-base font-semibold text-white">{bet.eventTitle}</h3>
              <p className="text-xs text-slate-400">Outcome: {bet.outcome}</p>
            </div>
            <span className={`rounded-full px-3 py-1 text-xs font-semibold uppercase ${statusStyles[bet.status]}`}>
              {statusLabel[bet.status]}
            </span>
          </div>
          <dl className="grid grid-cols-2 gap-2 text-xs text-slate-300">
            <div>
              <dt className="font-semibold text-slate-200">Stake</dt>
              <dd>{bet.stake.toLocaleString()} units</dd>
            </div>
            <div>
              <dt className="font-semibold text-slate-200">Odds</dt>
              <dd>{bet.odds.toFixed(2)}x</dd>
            </div>
            <div>
              <dt className="font-semibold text-slate-200">Potential Payout</dt>
              <dd>{bet.potentialPayout.toLocaleString()} units</dd>
            </div>
            {bet.settledAt && (
              <div>
                <dt className="font-semibold text-slate-200">Settled</dt>
                <dd>{new Date(bet.settledAt).toLocaleString()}</dd>
              </div>
            )}
          </dl>
        </article>
      ))}
    </div>
  );
}
