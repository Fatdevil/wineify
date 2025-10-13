import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';
import type { Settlement } from '../types';

interface SettlementsResponse {
  settlements: Settlement[];
}

const fetchSettlements = async (): Promise<Settlement[]> => {
  const { data } = await api.get<SettlementsResponse>('/settlements');
  return data.settlements;
};

const markReceivedRequest = async (id: string) => {
  await api.post(`/settlements/${id}/mark-received`);
};

export default function Settlements() {
  const queryClient = useQueryClient();
  const { data, isLoading, isError } = useQuery({
    queryKey: ['settlements'],
    queryFn: fetchSettlements
  });

  const mutation = useMutation({
    mutationFn: (id: string) => markReceivedRequest(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ['settlements'] });
      const previous = queryClient.getQueryData<Settlement[]>(['settlements']);

      queryClient.setQueryData<Settlement[]>(['settlements'], (old = []) =>
        old.map((settlement) =>
          settlement.id === id ? { ...settlement, status: 'received' } : settlement
        )
      );

      return { previous };
    },
    onError: (_err, _id, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['settlements'], context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['settlements'] });
    }
  });

  if (isLoading) {
    return <p className="text-sm text-slate-300">Loading settlements…</p>;
  }

  if (isError) {
    return <p className="text-sm text-red-400">Unable to load settlements.</p>;
  }

  if (!data?.length) {
    return <p className="text-sm text-slate-300">No outstanding settlements. Nice!</p>;
  }

  return (
    <div className="space-y-4">
      {data.map((settlement) => (
        <article key={settlement.id} className="rounded-xl bg-slate-800/60 p-4 ring-1 ring-slate-700">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h3 className="text-base font-semibold text-white">{settlement.counterparty}</h3>
              {settlement.dueDate && (
                <p className="text-xs text-slate-400">
                  Due {new Date(settlement.dueDate).toLocaleDateString()}
                </p>
              )}
            </div>
            <span
              className={`rounded-full px-3 py-1 text-xs font-semibold uppercase ${
                settlement.status === 'received'
                  ? 'bg-emerald-500/20 text-emerald-200'
                  : 'bg-yellow-500/20 text-yellow-100'
              }`}
            >
              {settlement.status === 'received' ? 'Received' : 'Pending'}
            </span>
          </div>
          <div className="flex items-center justify-between text-sm text-slate-200">
            <span>Amount</span>
            <span className="font-semibold">{settlement.amount.toLocaleString()} units</span>
          </div>
          {settlement.status !== 'received' && (
            <button
              type="button"
              onClick={() => mutation.mutate(settlement.id)}
              disabled={mutation.isPending && mutation.variables === settlement.id}
              className="mt-4 w-full rounded-lg bg-accent py-2 text-sm font-semibold text-white shadow disabled:cursor-not-allowed disabled:bg-accent/60"
            >
              {mutation.isPending && mutation.variables === settlement.id
                ? 'Marking…'
                : 'Mark received'}
            </button>
          )}
        </article>
      ))}
    </div>
  );
}
