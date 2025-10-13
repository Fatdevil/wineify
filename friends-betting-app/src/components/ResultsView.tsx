import { useQuery } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';
import api from '../lib/api';
import type { ResultDetail } from '../types';

interface ResultsResponse {
  results: ResultDetail[];
  totalPayout: number;
  netUnits: number;
}

const fetchResults = async (eventId: string): Promise<ResultsResponse> => {
  const { data } = await api.get<ResultsResponse>(`/results/${eventId}`);
  return data;
};

export default function ResultsView() {
  const { eventId } = useParams();

  const {
    data,
    isLoading,
    isError
  } = useQuery({
    queryKey: ['results', eventId],
    queryFn: () => fetchResults(eventId as string),
    enabled: Boolean(eventId)
  });

  if (!eventId) {
    return <p className="text-sm text-slate-300">Select an event to see results.</p>;
  }

  if (isLoading) {
    return <p className="text-sm text-slate-300">Loading results…</p>;
  }

  if (isError || !data) {
    return <p className="text-sm text-red-400">Unable to load results for this event.</p>;
  }

  if (!data.results.length) {
    return <p className="text-sm text-slate-300">No settled competitions yet.</p>;
  }

  return (
    <div className="space-y-4">
      <section className="rounded-xl bg-slate-800/60 p-4 ring-1 ring-slate-700">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-300">Summary</h2>
        <div className="mt-2 flex flex-col gap-2 text-sm text-slate-200">
          <div className="flex items-center justify-between">
            <span>Total payout</span>
            <span className="font-semibold text-emerald-300">{data.totalPayout.toLocaleString()} units</span>
          </div>
          <div className="flex items-center justify-between">
            <span>Net position</span>
            <span className={data.netUnits >= 0 ? 'font-semibold text-emerald-300' : 'font-semibold text-rose-300'}>
              {data.netUnits >= 0 ? '+' : ''}
              {data.netUnits.toLocaleString()} units
            </span>
          </div>
        </div>
      </section>

      {data.results.map((result) => (
        <article key={result.id} className="rounded-xl bg-slate-800/60 p-4 ring-1 ring-slate-700">
          <header className="mb-2">
            <h3 className="text-base font-semibold text-white">{result.competition}</h3>
            <p className="text-xs text-slate-400">Settled {new Date(result.settledAt).toLocaleString()}</p>
          </header>
          <dl className="grid grid-cols-2 gap-2 text-xs text-slate-300">
            <div>
              <dt className="font-semibold text-slate-200">Winning outcome</dt>
              <dd>{result.winningOutcome}</dd>
            </div>
            <div>
              <dt className="font-semibold text-slate-200">Payout / unit</dt>
              <dd>{result.payoutPerUnit.toLocaleString()} units</dd>
            </div>
          </dl>
        </article>
      ))}
    </div>
  );
}
