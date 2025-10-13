import { useQuery } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { Link } from 'react-router-dom';
import api from '../lib/api';
import type { EventSummary } from '../types';

interface EventsResponse {
  events: EventSummary[];
}

const statusLabels: Record<EventSummary['status'], string> = {
  open: 'Open',
  closed: 'Closed',
  settled: 'Settled'
};

const statusColors: Record<EventSummary['status'], string> = {
  open: 'bg-emerald-500/20 text-emerald-200',
  closed: 'bg-yellow-500/20 text-yellow-200',
  settled: 'bg-indigo-500/20 text-indigo-200'
};

const fetchEvents = async (): Promise<EventSummary[]> => {
  const { data } = await api.get<EventsResponse>('/events');
  return data.events;
};

export default function EventList() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['events'],
    queryFn: fetchEvents
  });

  if (isLoading) {
    return <p className="text-sm text-slate-300">Loading events…</p>;
  }

  if (isError) {
    return <p className="text-sm text-red-400">Unable to load events. Please try again.</p>;
  }

  if (!data?.length) {
    return <p className="text-sm text-slate-300">No events yet. Check back soon!</p>;
  }

  return (
    <div className="space-y-4">
      {data.map((event) => (
        <article
          key={event.id}
          className="rounded-xl bg-slate-800/60 p-4 shadow-sm ring-1 ring-slate-700"
        >
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-white">{event.title}</h3>
            <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusColors[event.status]}`}>
              {statusLabels[event.status]}
            </span>
          </div>
          <p className="mb-4 text-sm text-slate-300">{event.description}</p>
          <div className="flex flex-wrap gap-4 text-xs text-slate-400">
            <div>
              <span className="font-semibold text-slate-200">Closes:</span>{' '}
              {dayjs(event.closesAt).format('MMM D, YYYY h:mm A')}
            </div>
            <div>
              <span className="font-semibold text-slate-200">Pool:</span> {event.totalPool.toLocaleString()} units
            </div>
          </div>
          {event.status === 'settled' && (
            <div className="mt-4">
              <Link
                to={`/results/${event.id}`}
                className="inline-flex items-center rounded-lg bg-accent px-4 py-2 text-xs font-semibold text-white shadow"
              >
                View results
              </Link>
            </div>
          )}
        </article>
      ))}
    </div>
  );
}
