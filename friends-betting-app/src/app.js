import {
  getEvents,
  getMyBets,
  getResults,
  getSettlements,
  markSettlementReceived,
  getLeaderboard,
  getProfileStats
} from './api.js';
import {
  formatDateTime,
  formatNetUnits,
  formatNumber,
  formatOdds,
  createStatusBadge,
  clearChildren,
  createParagraph
} from './helpers.js';
import { renderLeaderboard } from './Leaderboard.js';
import { createProfileStatsCard } from './ProfileStats.js';

const state = {
  events: [],
  bets: [],
  settlements: [],
  results: null,
  leaderboard: [],
  profileStats: null,
  selectedEventId: null,
  status: {
    events: 'idle',
    bets: 'idle',
    settlements: 'idle',
    results: 'idle',
    leaderboard: 'idle',
    profile: 'idle'
  },
  errors: {
    events: null,
    bets: null,
    settlements: null,
    results: null,
    leaderboard: null,
    profile: null
  },
  ui: {
    activeSection: 'events',
    markingSettlementId: null,
    profileLevelUp: false
  },
  meta: {
    currentUserId: null,
    lastProfileXp: 0
  }
};

const navItems = [
  { id: 'events', label: 'Events' },
  { id: 'bets', label: 'My Bets' },
  { id: 'results', label: 'Results' },
  { id: 'settlements', label: 'Settlements' },
  { id: 'leaderboard', label: 'Leaderboard' },
  { id: 'profile', label: 'My Profile' }
];

const sectionRefs = new Map();
const navRefs = new Map();

function getCurrentUserId() {
  if (typeof window === 'undefined' || !window.localStorage) {
    return null;
  }

  return window.localStorage.getItem('userId');
}

const eventStatusStyles = {
  open: { label: 'Open', appearance: 'info' },
  closed: { label: 'Closed', appearance: 'warning' },
  settled: { label: 'Settled', appearance: 'accent' }
};

const betStatusStyles = {
  pending: { label: 'Pending', appearance: 'warning' },
  won: { label: 'Win', appearance: 'success' },
  lost: { label: 'Loss', appearance: 'danger' },
  refunded: { label: 'Refund', appearance: 'muted' }
};

const settlementStatusStyles = {
  pending: { label: 'Pending', appearance: 'warning' },
  completed: { label: 'Received', appearance: 'success' },
  received: { label: 'Received', appearance: 'success' }
};

function init() {
  const app = document.querySelector('#app');
  if (!app) {
    return;
  }

  state.meta.currentUserId = getCurrentUserId();

  app.className = 'dashboard';
  app.append(createHeader(), createNav(), createMain());
  setActiveSection('events');
  loadInitialData();
}

document.addEventListener('DOMContentLoaded', init);

function createHeader() {
  const header = document.createElement('header');
  header.className = 'dashboard__header';

  const title = document.createElement('h1');
  title.textContent = 'Friends Betting Dashboard';
  title.className = 'dashboard__title';

  const subtitle = document.createElement('p');
  subtitle.textContent = 'Track your wagers, results and payouts in one place.';
  subtitle.className = 'dashboard__subtitle';

  header.append(title, subtitle);
  return header;
}

function createNav() {
  const nav = document.createElement('nav');
  nav.className = 'dashboard__nav';

  navItems.forEach((item) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = item.label;
    button.className = 'nav-pill';
    button.addEventListener('click', () => setActiveSection(item.id));
    navRefs.set(item.id, button);
    nav.append(button);
  });

  return nav;
}

function createMain() {
  const main = document.createElement('main');
  main.className = 'dashboard__main';

  sectionRefs.set('events', createSection('events'));
  sectionRefs.set('bets', createSection('bets'));
  sectionRefs.set('results', createSection('results'));
  sectionRefs.set('settlements', createSection('settlements'));
  sectionRefs.set('leaderboard', createSection('leaderboard'));
  sectionRefs.set('profile', createSection('profile'));

  sectionRefs.forEach(({ section }) => {
    main.append(section);
  });

  return main;
}

function createSection(id) {
  const section = document.createElement('section');
  section.dataset.section = id;
  section.className = 'dashboard__section hidden';

  const body = document.createElement('div');
  body.className = 'section-body';

  section.append(body);
  return { section, body };
}

function setActiveSection(id) {
  state.ui.activeSection = id;

  navRefs.forEach((button, navId) => {
    button.classList.toggle('nav-pill--active', navId === id);
  });

  sectionRefs.forEach(({ section }, sectionId) => {
    section.classList.toggle('hidden', sectionId !== id);
  });
}

async function loadInitialData() {
  await Promise.all([loadEvents(), loadBets(), loadSettlements(), loadLeaderboard()]);
  await loadProfileStats({ showLoading: false });
}

async function loadEvents() {
  updateStatus('events', 'loading');
  renderEvents();

  try {
    state.events = await getEvents();
    updateStatus('events', 'success');
  } catch (error) {
    updateStatus('events', 'error', error);
  }

  renderEvents();
}

async function loadBets() {
  updateStatus('bets', 'loading');
  renderBets();

  try {
    state.bets = await getMyBets();
    updateStatus('bets', 'success');
  } catch (error) {
    updateStatus('bets', 'error', error);
  }

  renderBets();
}

async function loadSettlements() {
  updateStatus('settlements', 'loading');
  renderSettlements();

  try {
    state.settlements = await getSettlements();
    updateStatus('settlements', 'success');
  } catch (error) {
    updateStatus('settlements', 'error', error);
  }

  renderSettlements();
}

async function loadLeaderboard() {
  updateStatus('leaderboard', 'loading');
  renderLeaderboardSection();

  try {
    state.leaderboard = await getLeaderboard();
    updateStatus('leaderboard', 'success');
  } catch (error) {
    updateStatus('leaderboard', 'error', error);
  }

  renderLeaderboardSection();
}

async function loadProfileStats({ showLoading = true } = {}) {
  const userId = state.meta.currentUserId;

  if (!userId) {
    state.profileStats = null;
    updateStatus('profile', 'idle');
    renderProfile();
    return;
  }

  if (showLoading) {
    updateStatus('profile', 'loading');
    renderProfile();
  }

  try {
    const stats = await getProfileStats(userId);
    const previousXp = state.profileStats?.xp ?? 0;
    state.profileStats = stats;
    state.ui.profileLevelUp = (stats?.xp ?? 0) > previousXp;
    state.meta.lastProfileXp = stats?.xp ?? 0;
    updateStatus('profile', 'success');
  } catch (error) {
    updateStatus('profile', 'error', error);
  }

  renderProfile();
}

function updateStatus(section, status, error = null) {
  state.status[section] = status;
  state.errors[section] = error;
}

function renderEvents() {
  const { body } = sectionRefs.get('events');
  clearChildren(body);

  const status = state.status.events;
  if (status === 'loading') {
    body.append(createParagraph('Loading events…'));
    return;
  }

  if (status === 'error') {
    body.append(createParagraph('Unable to load events. Please try again.', 'error'));
    return;
  }

  if (!state.events.length) {
    body.append(createParagraph('No events yet. Check back soon!'));
    return;
  }

  state.events.forEach((event) => {
    body.append(createEventCard(event));
  });
}

function createEventCard(event) {
  const card = document.createElement('article');
  card.className = 'card';

  const header = document.createElement('div');
  header.className = 'card__header';

  const title = document.createElement('h3');
  title.className = 'card__title';
  title.textContent = event.title;

  const statusInfo = eventStatusStyles[event.status] ?? { label: event.status, appearance: 'muted' };
  const statusBadge = createStatusBadge(statusInfo.label, statusInfo.appearance);

  header.append(title, statusBadge);

  const description = document.createElement('p');
  description.className = 'card__description';
  description.textContent = event.description;

  const metaList = document.createElement('div');
  metaList.className = 'card__meta';

  const closes = document.createElement('div');
  closes.innerHTML = `<span>Closes:</span> ${formatDateTime(event.closesAt)}`;

  const pool = document.createElement('div');
  pool.innerHTML = `<span>Pool:</span> ${formatNumber(event.totalPool)} units`;

  metaList.append(closes, pool);

  card.append(header, description, metaList);

  if (event.status === 'settled') {
    const action = document.createElement('div');
    action.className = 'card__actions';

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'button';
    button.textContent = 'View results';
    button.addEventListener('click', () => showResultsForEvent(event.id));

    action.append(button);
    card.append(action);
  }

  return card;
}

function renderBets() {
  const { body } = sectionRefs.get('bets');
  clearChildren(body);

  const status = state.status.bets;
  if (status === 'loading') {
    body.append(createParagraph('Loading your bets…'));
    return;
  }

  if (status === 'error') {
    body.append(createParagraph('Unable to load bets right now.', 'error'));
    return;
  }

  if (!state.bets.length) {
    body.append(createParagraph('You have not placed any bets yet.'));
    return;
  }

  state.bets.forEach((bet) => {
    body.append(createBetCard(bet));
  });
}

function createBetCard(bet) {
  const card = document.createElement('article');
  card.className = 'card';

  const header = document.createElement('div');
  header.className = 'card__header';

  const title = document.createElement('div');
  title.innerHTML = `<h3 class="card__title">${bet.eventTitle}</h3><p class="card__subtitle">Outcome: ${bet.outcome}</p>`;

  const statusInfo = betStatusStyles[bet.status] ?? { label: bet.status, appearance: 'muted' };
  const statusBadge = createStatusBadge(statusInfo.label, statusInfo.appearance);

  header.append(title, statusBadge);

  const details = document.createElement('dl');
  details.className = 'definition-list';

  details.append(
    createDefinition('Stake', `${formatNumber(bet.stake)} units`),
    createDefinition('Odds', formatOdds(bet.odds)),
    createDefinition('Potential payout', `${formatNumber(bet.potentialPayout)} units`)
  );

  if (bet.settledAt) {
    details.append(createDefinition('Settled', formatDateTime(bet.settledAt)));
  }

  card.append(header, details);
  return card;
}

function createDefinition(label, value) {
  const wrapper = document.createElement('div');

  const dt = document.createElement('dt');
  dt.textContent = label;
  dt.className = 'definition-list__title';

  const dd = document.createElement('dd');
  dd.textContent = value;
  dd.className = 'definition-list__value';

  wrapper.append(dt, dd);
  return wrapper;
}

function renderSettlements() {
  const { body } = sectionRefs.get('settlements');
  clearChildren(body);

  const status = state.status.settlements;
  if (status === 'loading') {
    body.append(createParagraph('Loading settlements…'));
    return;
  }

  if (status === 'error') {
    body.append(createParagraph('Unable to load settlements.', 'error'));
    return;
  }

  if (!state.settlements.length) {
    body.append(createParagraph('No outstanding settlements. Nice!'));
    return;
  }

  state.settlements.forEach((settlement) => {
    body.append(createSettlementCard(settlement));
  });
}

function renderLeaderboardSection() {
  const refs = sectionRefs.get('leaderboard');
  if (!refs) {
    return;
  }

  const { body } = refs;
  clearChildren(body);

  const status = state.status.leaderboard;
  if (status === 'loading') {
    body.append(createParagraph('Loading leaderboard…'));
    return;
  }

  if (status === 'error') {
    body.append(createParagraph('Unable to load the leaderboard. Please try again later.', 'error'));
    return;
  }

  renderLeaderboard(body, state.leaderboard);
}

function renderProfile() {
  const refs = sectionRefs.get('profile');
  if (!refs) {
    return;
  }

  const { body } = refs;
  clearChildren(body);

  if (!state.meta.currentUserId) {
    body.append(createParagraph('Log in to track your personal stats and XP.'));
    return;
  }

  const status = state.status.profile;
  if (status === 'loading') {
    body.append(createParagraph('Loading your stats…'));
    return;
  }

  if (status === 'error') {
    body.append(createParagraph('Unable to load your stats right now.', 'error'));
    return;
  }

  if (!state.profileStats) {
    body.append(createParagraph('Complete a settlement to start earning XP.'));
    return;
  }

  const card = createProfileStatsCard(state.profileStats);
  if (state.ui.profileLevelUp) {
    card.classList.add('profile-stats--level-up');
    window.setTimeout(() => {
      card.classList.remove('profile-stats--level-up');
    }, 900);
    state.ui.profileLevelUp = false;
  }

  body.append(card);
}

function createSettlementCard(settlement) {
  const card = document.createElement('article');
  card.className = 'card';

  const header = document.createElement('div');
  header.className = 'card__header';

  const info = document.createElement('div');
  info.innerHTML = `<h3 class="card__title">${settlement.counterparty}</h3>`;
  if (settlement.dueDate) {
    const due = document.createElement('p');
    due.className = 'card__subtitle';
    due.textContent = `Due ${formatDateTime(settlement.dueDate)}`;
    info.append(due);
  }

  const statusKey = typeof settlement.status === 'string' ? settlement.status.toLowerCase() : settlement.status;
  const statusInfo = settlementStatusStyles[statusKey] ?? {
    label: settlement.status,
    appearance: 'muted'
  };
  const statusBadge = createStatusBadge(statusInfo.label, statusInfo.appearance);

  header.append(info, statusBadge);

  const amountRow = document.createElement('div');
  amountRow.className = 'settlement__amount-row';
  amountRow.innerHTML = `<span>Amount</span><span>${formatNumber(settlement.amount)} units</span>`;

  card.append(header, amountRow);

  if (settlement.status !== 'received') {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'button';
    button.textContent =
      state.ui.markingSettlementId === settlement.id ? 'Marking…' : 'Mark received';
    button.disabled = state.ui.markingSettlementId === settlement.id;
    button.addEventListener('click', () => handleMarkSettlement(settlement.id));
    card.append(button);
  }

  return card;
}

async function handleMarkSettlement(id) {
  state.ui.markingSettlementId = id;
  renderSettlements();

  try {
    const response = await markSettlementReceived(id);
    state.settlements = state.settlements.map((settlement) => {
      if (settlement.id !== id) {
        return settlement;
      }

      const statusValue = response?.settlement?.status ?? 'completed';
      return { ...settlement, status: statusValue.toLowerCase?.() ?? statusValue };
    });

    if (response?.stats) {
      const stats = response.stats;
      if (stats.userId === state.meta.currentUserId) {
        const previousXp = state.profileStats?.xp ?? 0;
        state.profileStats = stats;
        state.ui.profileLevelUp = (stats.xp ?? 0) > previousXp;
        state.meta.lastProfileXp = stats.xp ?? 0;
        updateStatus('profile', 'success');
        renderProfile();
      }
    } else if (state.meta.currentUserId) {
      await loadProfileStats({ showLoading: false });
    }

    await loadLeaderboard();
  } catch (error) {
    window.alert('Unable to mark settlement as received. Please try again.');
    console.error(error);
  } finally {
    state.ui.markingSettlementId = null;
    renderSettlements();
  }
}

function showResultsForEvent(eventId) {
  state.selectedEventId = eventId;
  setActiveSection('results');
  loadResults(eventId);
}

async function loadResults(eventId) {
  updateStatus('results', 'loading');
  renderResults();

  try {
    state.results = await getResults(eventId);
    updateStatus('results', 'success');
  } catch (error) {
    updateStatus('results', 'error', error);
  }

  renderResults();
}

function renderResults() {
  const { body } = sectionRefs.get('results');
  clearChildren(body);

  if (!state.selectedEventId) {
    body.append(createParagraph('Select an event to see results.'));
    return;
  }

  const status = state.status.results;
  if (status === 'loading') {
    body.append(createParagraph('Loading results…'));
    return;
  }

  if (status === 'error') {
    body.append(createParagraph('Unable to load results for this event.', 'error'));
    return;
  }

  if (!state.results) {
    body.append(createParagraph('No results available.'));
    return;
  }

  const { results = [], totalPayout = 0, netUnits = 0 } = state.results;
  if (!results.length) {
    body.append(createParagraph('No settled competitions yet.'));
    return;
  }

  const summary = document.createElement('section');
  summary.className = 'card';
  summary.innerHTML = `
    <h3 class="card__title">Summary</h3>
    <div class="summary-row"><span>Total payout</span><span>${formatNumber(totalPayout)} units</span></div>
    <div class="summary-row"><span>Net position</span><span class="${netUnits >= 0 ? 'text-success' : 'text-danger'}">${formatNetUnits(netUnits)}</span></div>
  `;

  body.append(summary);

  results.forEach((result) => {
    const card = document.createElement('article');
    card.className = 'card';

    const header = document.createElement('header');
    header.className = 'card__header';
    const title = document.createElement('h3');
    title.className = 'card__title';
    title.textContent = result.competition;
    const settled = document.createElement('p');
    settled.className = 'card__subtitle';
    settled.textContent = `Settled ${formatDateTime(result.settledAt)}`;

    header.append(title);
    card.append(header, settled);

    const details = document.createElement('dl');
    details.className = 'definition-list';
    details.append(
      createDefinition('Winning outcome', result.winningOutcome),
      createDefinition('Payout / unit', `${formatNumber(result.payoutPerUnit)} units`)
    );

    card.append(details);
    body.append(card);
  });
}
