import { NavLink, Route, Routes, Navigate } from 'react-router-dom';
import EventList from './components/EventList';
import MyBets from './components/MyBets';
import ResultsView from './components/ResultsView';
import Settlements from './components/Settlements';

const navItems = [
  { to: '/events', label: 'Events' },
  { to: '/bets', label: 'My Bets' },
  { to: '/results', label: 'Results' },
  { to: '/settlements', label: 'Settlements' }
];

export default function App() {
  return (
    <div className="mx-auto flex min-h-screen max-w-3xl flex-col bg-surface px-4 pb-16 pt-6">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-white">Friends Betting Dashboard</h1>
        <p className="mt-1 text-sm text-slate-400">Track your wagers, results and payouts in one place.</p>
      </header>

      <nav className="mb-6 flex gap-2 overflow-x-auto pb-2">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold transition ${
                isActive ? 'bg-accent text-white shadow' : 'bg-slate-800/60 text-slate-300'
              }`
            }
          >
            {item.label}
          </NavLink>
        ))}
      </nav>

      <main className="flex-1 space-y-6">
        <Routes>
          <Route index element={<Navigate to="/events" replace />} />
          <Route path="/events" element={<EventList />} />
          <Route path="/bets" element={<MyBets />} />
          <Route path="/results" element={<p className="text-sm text-slate-300">Select an event from the list to view results.</p>} />
          <Route path="/results/:eventId" element={<ResultsView />} />
          <Route path="/settlements" element={<Settlements />} />
          <Route path="*" element={<Navigate to="/events" replace />} />
        </Routes>
      </main>
    </div>
  );
}
