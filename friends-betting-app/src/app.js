import {
  getEvents,
  getMyBets,
  getResults,
  getSettlements,
  markSettlementReceived,
  getLeaderboard,
  getProfileStats,
  getAchievements,
  getMyAchievements,
  initializeSession,
  registerUser,
  loginUser,
  logoutUser,
  getCurrentUser,
  createEventInvite,
  joinEventWithInvite,
  getEventMembers,
  getNotificationsList,
  markNotificationAsRead
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
import { renderAchievementsView } from './AchievementsView.js';

const state = {
  events: [],
  bets: [],
  settlements: [],
  results: null,
  leaderboard: [],
  profileStats: null,
  achievements: {
    catalog: [],
    mine: []
  },
  notifications: {
    items: [],
    status: 'idle',
    unread: 0,
  },
  selectedEventId: null,
  status: {
    events: 'idle',
    bets: 'idle',
    settlements: 'idle',
    results: 'idle',
    leaderboard: 'idle',
    profile: 'idle',
    achievements: 'idle',
    notifications: 'idle',
  },
  errors: {
    events: null,
    bets: null,
    settlements: null,
    results: null,
    leaderboard: null,
    profile: null,
    achievements: null,
    notifications: null,
  },
  ui: {
    activeSection: 'events',
    markingSettlementId: null,
    profileLevelUp: false,
    auth: {
      overlay: null,
      title: null,
      error: null,
      email: null,
      password: null,
      submit: null,
      toggle: null
    },
    authControls: {
      container: null,
      status: null,
      signIn: null,
      signOut: null
    },
    notifications: {
      container: null,
      button: null,
      badge: null,
      panel: null,
      list: null,
    },
    events: {
      joinForm: null,
      joinInput: null,
      joinStatus: null,
      joinFeedback: null,
      inviteStates: new Map(),
    },
  },
  meta: {
    currentUserId: null,
    lastProfileXp: 0,
    lastProfileLevel: 1,
    notificationPollId: null,
  },
  auth: {
    user: null,
    mode: 'login',
    status: 'idle',
    error: null
  }
};

const navItems = [
  { id: 'events', label: 'Events' },
  { id: 'bets', label: 'My Bets' },
  { id: 'results', label: 'Results' },
  { id: 'settlements', label: 'Settlements' },
  { id: 'leaderboard', label: 'Leaderboard' },
  { id: 'achievements', label: 'Achievements' },
  { id: 'profile', label: 'My Profile' }
];

const sectionRefs = new Map();
const navRefs = new Map();

const eventStatusStyles = {
  open: { label: 'Open', appearance: 'info' },
  closed: { label: 'Closed', appearance: 'warning' },
  settled: { label: 'Settled', appearance: 'accent' },
  scheduled: { label: 'Scheduled', appearance: 'info' },
  active: { label: 'Active', appearance: 'success' },
  completed: { label: 'Completed', appearance: 'accent' },
  cancelled: { label: 'Cancelled', appearance: 'muted' },
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

const NOTIFICATION_POLL_INTERVAL = 20_000;

const notificationMessages = {
  RESULT_POSTED: (payload) => `Result posted for event ${payload?.eventId ?? ''}`.trim(),
  SETTLEMENT_GENERATED: (payload) =>
    `New settlements ready for event ${payload?.eventId ?? ''} (${payload?.count ?? 0})`.trim(),
  SETTLEMENT_RECEIVED: (payload) => `Settlement ${payload?.obligationId ?? ''} marked received`.trim(),
};

async function restoreSession() {
  const restoredUser = await initializeSession();

  if (restoredUser) {
    state.auth.user = restoredUser;
    state.meta.currentUserId = restoredUser.id ?? null;
    hideAuthOverlay();
    updateAuthControls();
    await loadInitialData();
  } else if (!state.auth.user) {
    showAuthOverlay('login');
    updateAuthOverlay();
  }
}

function createAuthOverlay() {
  const overlay = document.createElement('div');
  overlay.className = 'auth-overlay hidden';

  const panel = document.createElement('div');
  panel.className = 'auth-panel';

  const title = document.createElement('h2');
  title.className = 'auth-panel__title';

  const errorMessage = document.createElement('p');
  errorMessage.className = 'auth-panel__error hidden';

  const form = document.createElement('form');
  form.className = 'auth-form';

  const emailLabel = document.createElement('label');
  emailLabel.textContent = 'Email';
  emailLabel.className = 'auth-form__label';

  const emailInput = document.createElement('input');
  emailInput.type = 'email';
  emailInput.required = true;
  emailInput.autocomplete = 'email';
  emailInput.className = 'auth-form__input';

  const passwordLabel = document.createElement('label');
  passwordLabel.textContent = 'Password';
  passwordLabel.className = 'auth-form__label';

  const passwordInput = document.createElement('input');
  passwordInput.type = 'password';
  passwordInput.required = true;
  passwordInput.minLength = 8;
  passwordInput.autocomplete = 'current-password';
  passwordInput.className = 'auth-form__input';

  const submitButton = document.createElement('button');
  submitButton.type = 'submit';
  submitButton.className = 'auth-form__submit';

  const toggleButton = document.createElement('button');
  toggleButton.type = 'button';
  toggleButton.className = 'auth-form__toggle';

  form.append(emailLabel, emailInput, passwordLabel, passwordInput, submitButton);
  panel.append(title, errorMessage, form, toggleButton);
  overlay.append(panel);

  form.addEventListener('submit', handleAuthSubmit);
  toggleButton.addEventListener('click', toggleAuthMode);

  state.ui.auth = {
    overlay,
    title,
    error: errorMessage,
    email: emailInput,
    password: passwordInput,
    submit: submitButton,
    toggle: toggleButton
  };

  updateAuthOverlay();

  return overlay;
}

function updateAuthOverlay() {
  const refs = state.ui.auth;
  if (!refs?.overlay) {
    return;
  }

  const mode = state.auth.mode;
  const isLoading = state.auth.status === 'loading';

  refs.title.textContent = mode === 'login' ? 'Sign in to Wineify' : 'Create your account';
  refs.submit.textContent = isLoading
    ? 'Please wait…'
    : mode === 'login'
      ? 'Sign in'
      : 'Register';
  refs.submit.disabled = isLoading;
  refs.email.disabled = isLoading;
  refs.password.disabled = isLoading;

  refs.toggle.textContent =
    mode === 'login' ? 'Need an account? Register' : 'Already have an account? Sign in';

  const hasError = Boolean(state.auth.error);
  refs.error.textContent = state.auth.error ?? '';
  refs.error.classList.toggle('hidden', !hasError);
}

function showAuthOverlay(mode = 'login') {
  state.auth.mode = mode;
  state.auth.error = null;

  const refs = state.ui.auth;
  if (!refs?.overlay) {
    return;
  }

  refs.overlay.classList.remove('hidden');
  refs.email.value = '';
  refs.password.value = '';
  updateAuthOverlay();
  refs.email.focus();
}

function hideAuthOverlay() {
  const refs = state.ui.auth;
  if (!refs?.overlay) {
    return;
  }

  refs.overlay.classList.add('hidden');
}

function updateAuthControls() {
  const controls = state.ui.authControls;
  if (!controls?.container) {
    return;
  }

  const user = state.auth.user;

  controls.status.textContent = user ? `Signed in as ${user.email}` : 'Not signed in';
  controls.signIn.classList.toggle('hidden', Boolean(user));
  controls.signOut.classList.toggle('hidden', !user);

  const notifications = state.ui.notifications;
  if (notifications?.container) {
    notifications.container.classList.toggle('hidden', !user);
    if (!user && notifications.panel) {
      notifications.panel.classList.add('hidden');
    }
  }
}

async function handleAuthSubmit(event) {
  event.preventDefault();

  const refs = state.ui.auth;
  if (!refs) {
    return;
  }

  const email = refs.email.value.trim();
  const password = refs.password.value;

  state.auth.status = 'loading';
  state.auth.error = null;
  updateAuthOverlay();

  try {
    const action = state.auth.mode === 'login' ? loginUser : registerUser;
    const payload = await action(email, password);
    state.auth.user = payload?.user ?? null;
    state.meta.currentUserId = state.auth.user?.id ?? null;
    hideAuthOverlay();
    updateAuthControls();
    await loadInitialData();
  } catch (error) {
    state.auth.error = error instanceof Error ? error.message : 'Unable to authenticate.';
  } finally {
    state.auth.status = 'idle';
    updateAuthOverlay();
  }
}

function toggleAuthMode() {
  state.auth.mode = state.auth.mode === 'login' ? 'register' : 'login';
  state.auth.error = null;
  updateAuthOverlay();
}

function resetDashboard() {
  stopNotificationPolling();
  state.events = [];
  state.bets = [];
  state.settlements = [];
  state.results = null;
  state.leaderboard = [];
  state.profileStats = null;
  state.achievements.catalog = [];
  state.achievements.mine = [];
  state.notifications.items = [];
  state.notifications.status = 'idle';
  state.notifications.unread = 0;
  state.selectedEventId = null;
  Object.keys(state.status).forEach((key) => {
    state.status[key] = 'idle';
    state.errors[key] = null;
  });
  state.meta.currentUserId = state.auth.user?.id ?? null;
  state.ui.events.inviteStates = new Map();
  state.ui.events.joinFeedback = null;

  updateNotificationsUI();

  sectionRefs.forEach(({ body }) => {
    clearChildren(body);
    body.append(createParagraph('Sign in to view this section.'));
  });
}

function init() {
  const app = document.querySelector('#app');
  if (!app) {
    return;
  }

  app.className = 'dashboard';
  const header = createHeader();
  const nav = createNav();
  const main = createMain();
  const overlay = createAuthOverlay();

  app.append(header, nav, main, overlay);

  state.auth.user = getCurrentUser() ?? null;
  state.meta.currentUserId = state.auth.user?.id ?? null;

  updateAuthControls();
  setActiveSection('events');
  resetDashboard();

  if (state.auth.user) {
    hideAuthOverlay();
    void loadInitialData();
  } else {
    showAuthOverlay('login');
    updateAuthOverlay();
  }

  void restoreSession();
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

  const notifications = createNotificationsWidget();

  const controls = document.createElement('div');
  controls.className = 'auth-controls';

  const status = document.createElement('span');
  status.className = 'auth-controls__status';

  const signInButton = document.createElement('button');
  signInButton.type = 'button';
  signInButton.className = 'auth-controls__button';
  signInButton.textContent = 'Sign in';
  signInButton.addEventListener('click', () => {
    state.auth.mode = 'login';
    showAuthOverlay('login');
    updateAuthOverlay();
  });

  const signOutButton = document.createElement('button');
  signOutButton.type = 'button';
  signOutButton.className = 'auth-controls__button hidden';
  signOutButton.textContent = 'Sign out';
  signOutButton.addEventListener('click', async () => {
    signOutButton.disabled = true;
    try {
      await logoutUser({ all: false });
    } finally {
      signOutButton.disabled = false;
    }

    state.auth.user = null;
    state.auth.error = null;
    state.meta.currentUserId = null;
    resetDashboard();
    updateAuthControls();
    showAuthOverlay('login');
    updateAuthOverlay();
  });

  controls.append(status, signInButton, signOutButton);
  header.append(title, subtitle, notifications, controls);

  state.ui.authControls = {
    container: controls,
    status,
    signIn: signInButton,
    signOut: signOutButton
  };

  return header;
}

function createNotificationsWidget() {
  const container = document.createElement('div');
  container.className = 'notifications hidden';

  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'notifications__button';
  button.setAttribute('aria-label', 'Notifications');
  button.textContent = '🔔';

  const badge = document.createElement('span');
  badge.className = 'notifications__badge hidden';
  button.append(badge);

  const panel = document.createElement('div');
  panel.className = 'notifications__panel hidden';

  const list = document.createElement('ul');
  list.className = 'notifications__list';
  panel.append(list);

  button.addEventListener('click', () => {
    panel.classList.toggle('hidden');
    if (!panel.classList.contains('hidden')) {
      void loadNotifications({ showLoading: false });
    }
  });

  container.append(button, panel);

  Object.assign(state.ui.notifications, { container, button, badge, panel, list });
  updateNotificationsUI();
  container.classList.toggle('hidden', !state.auth.user);

  return container;
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
  sectionRefs.set('achievements', createSection('achievements'));
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
  if (!state.auth.user) {
    return;
  }

  await Promise.all([
    loadEvents(),
    loadBets(),
    loadSettlements(),
    loadLeaderboard(),
    loadNotifications({ showLoading: false }),
  ]);
  await loadProfileStats({ showLoading: false });
  startNotificationPolling();
}

async function loadEvents() {
  if (!state.auth.user) {
    updateStatus('events', 'idle');
    renderEvents();
    return;
  }

  updateStatus('events', 'loading');
  renderEvents();

  try {
    const events = await getEvents();
    const currentUserId = state.meta.currentUserId;
    state.events = Array.isArray(events)
      ? events.map((event) => {
          const membership = Array.isArray(event.memberships)
            ? event.memberships.find((member) => member.userId === currentUserId)
            : null;

          return {
            ...event,
            title: event.title ?? event.name ?? 'Event',
            description: event.description ?? 'No description available.',
            status: (event.status ?? 'SCHEDULED').toLowerCase(),
            closesAt: event.closesAt ?? event.endsAt ?? event.startsAt ?? null,
            membershipRole: membership?.role ?? 'MEMBER',
          };
        })
      : [];
    updateStatus('events', 'success');
  } catch (error) {
    updateStatus('events', 'error', error);
  }

  renderEvents();
}

async function loadBets() {
  if (!state.auth.user) {
    updateStatus('bets', 'idle');
    renderBets();
    return;
  }

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
  if (!state.auth.user) {
    updateStatus('settlements', 'idle');
    renderSettlements();
    return;
  }

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
  if (!state.auth.user) {
    updateStatus('leaderboard', 'idle');
    renderLeaderboardSection();
    return;
  }

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
    state.achievements.mine = [];
    void loadAchievements({ showLoading: false });
    return;
  }

  if (showLoading) {
    updateStatus('profile', 'loading');
    renderProfile();
  }

  try {
    const stats = await getProfileStats(userId);
    const previousLevel = state.meta.lastProfileLevel ?? 1;
    state.profileStats = stats;
    state.ui.profileLevelUp = (stats?.level ?? 1) > previousLevel;
    state.meta.lastProfileXp = stats?.xp ?? 0;
    state.meta.lastProfileLevel = stats?.level ?? previousLevel;
    updateStatus('profile', 'success');
  } catch (error) {
    updateStatus('profile', 'error', error);
  }

  renderProfile();

  if (state.status.profile === 'success') {
    void loadAchievements({ showLoading: false });
  }
}

async function loadAchievements({ showLoading = true } = {}) {
  if (!state.auth.user) {
    updateStatus('achievements', 'idle');
    renderAchievementsSection();
    return;
  }

  if (showLoading) {
    updateStatus('achievements', 'loading');
    renderAchievementsSection();
  }

  try {
    const [catalog, mine] = await Promise.all([
      getAchievements(),
      state.meta.currentUserId ? getMyAchievements(state.meta.currentUserId) : Promise.resolve([])
    ]);

    state.achievements.catalog = Array.isArray(catalog) ? catalog : [];
    state.achievements.mine = Array.isArray(mine) ? mine : [];
    updateStatus('achievements', 'success');
  } catch (error) {
    updateStatus('achievements', 'error', error);
  }

  renderAchievementsSection();
}

async function loadNotifications({ showLoading = true } = {}) {
  if (!state.auth.user) {
    state.notifications.items = [];
    state.notifications.status = 'idle';
    state.notifications.unread = 0;
    updateNotificationsUI();
    return;
  }

  if (showLoading) {
    state.notifications.status = 'loading';
  }

  try {
    const notifications = await getNotificationsList();
    state.notifications.items = Array.isArray(notifications) ? notifications : [];
    state.notifications.unread = state.notifications.items.filter((notification) => !notification.readAt).length;
    state.notifications.status = 'success';
    state.errors.notifications = null;
  } catch (error) {
    state.notifications.status = 'error';
    state.errors.notifications = error instanceof Error ? error : new Error('Unable to load notifications.');
  }

  updateNotificationsUI();
}

function updateNotificationsUI() {
  const refs = state.ui.notifications;
  if (!refs) {
    return;
  }

  const unread = state.notifications.unread ?? 0;

  if (refs.badge) {
    refs.badge.textContent = unread > 99 ? '99+' : String(unread);
    refs.badge.classList.toggle('hidden', unread === 0);
  }

  if (!refs.list) {
    return;
  }

  clearChildren(refs.list);

  if (state.notifications.status === 'loading') {
    const item = document.createElement('li');
    item.append(createParagraph('Loading notifications…'));
    refs.list.append(item);
    return;
  }

  if (state.notifications.status === 'error') {
    const item = document.createElement('li');
    item.append(
      createParagraph(
        state.errors.notifications instanceof Error
          ? state.errors.notifications.message
          : 'Unable to load notifications.',
        'error',
      ),
    );
    refs.list.append(item);
    return;
  }

  if (!state.notifications.items.length) {
    const item = document.createElement('li');
    item.append(createParagraph('No notifications yet.'));
    refs.list.append(item);
    return;
  }

  state.notifications.items.forEach((notification) => {
    const item = document.createElement('li');
    item.className = 'notifications__item';
    if (!notification.readAt) {
      item.classList.add('notifications__item--unread');
    }

    const message = document.createElement('div');
    message.className = 'notifications__message';
    message.textContent = formatNotificationMessage(notification);

    const timestamp = document.createElement('time');
    timestamp.className = 'notifications__time';
    timestamp.textContent = formatDateTime(notification.createdAt);

    item.append(message, timestamp);

    if (!notification.readAt) {
      const markButton = document.createElement('button');
      markButton.type = 'button';
      markButton.className = 'notifications__action';
      markButton.textContent = 'Mark read';
      markButton.addEventListener('click', () => {
        markNotification(notification.id);
      });
      item.append(markButton);
    }

    refs.list.append(item);
  });
}

function formatNotificationMessage(notification) {
  const formatter = notificationMessages[notification.type];
  if (typeof formatter === 'function') {
    return formatter(notification.payload ?? {});
  }

  return notification.type?.replace(/_/g, ' ') ?? 'Notification';
}

async function markNotification(id) {
  try {
    await markNotificationAsRead(id);
    const target = state.notifications.items.find((notification) => notification.id === id);
    if (target && !target.readAt) {
      target.readAt = new Date().toISOString();
      state.notifications.unread = Math.max(0, state.notifications.unread - 1);
      updateNotificationsUI();
    }
  } catch (error) {
    console.error(error);
  }
}

function stopNotificationPolling() {
  if (state.meta.notificationPollId) {
    window.clearInterval(state.meta.notificationPollId);
    state.meta.notificationPollId = null;
  }
}

function startNotificationPolling() {
  stopNotificationPolling();

  if (!state.auth.user) {
    return;
  }

  void loadNotifications({ showLoading: false });
  state.meta.notificationPollId = window.setInterval(() => {
    void loadNotifications({ showLoading: false });
  }, NOTIFICATION_POLL_INTERVAL);
}

function updateStatus(section, status, error = null) {
  state.status[section] = status;
  state.errors[section] = error;
}

function renderEvents() {
  const { body } = sectionRefs.get('events');
  clearChildren(body);

  if (!state.auth.user) {
    body.append(createParagraph('Sign in to view upcoming events.'));
    return;
  }

  body.append(createJoinEventForm());

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
    const message = createParagraph('No events yet. Use an invite code to join your first event.');
    message.classList.add('muted');
    body.append(message);
    return;
  }

  state.events.forEach((event) => {
    body.append(createEventCard(event));
  });
}

function createJoinEventForm() {
  const section = document.createElement('section');
  section.className = 'card invite-card';

  const heading = document.createElement('h3');
  heading.className = 'card__title';
  heading.textContent = 'Join via invite code';

  const form = document.createElement('form');
  form.className = 'invite-card__form';

  const input = document.createElement('input');
  input.type = 'text';
  input.required = true;
  input.placeholder = 'Paste invite code';
  input.className = 'invite-card__input';

  const submit = document.createElement('button');
  submit.type = 'submit';
  submit.className = 'button';
  submit.textContent = 'Join event';

  const status = document.createElement('p');
  status.className = 'invite-card__status hidden';

  form.addEventListener('submit', handleJoinEventSubmit);
  form.append(input, submit);
  section.append(heading, form, status);

  state.ui.events.joinForm = form;
  state.ui.events.joinInput = input;
  state.ui.events.joinStatus = status;

  if (state.ui.events.joinFeedback) {
    const { type, message } = state.ui.events.joinFeedback;
    status.textContent = message;
    status.classList.toggle('hidden', !message);
    status.classList.toggle('error', type === 'error');
  } else {
    status.classList.add('hidden');
  }

  return section;
}

async function handleJoinEventSubmit(event) {
  event.preventDefault();

  const refs = state.ui.events;
  if (!refs.joinInput || !refs.joinStatus) {
    return;
  }

  const code = refs.joinInput.value.trim();
  if (!code) {
    refs.joinStatus.textContent = 'Invite code is required.';
    refs.joinStatus.classList.remove('hidden');
    refs.joinStatus.classList.add('error');
    state.ui.events.joinFeedback = { type: 'error', message: 'Invite code is required.' };
    return;
  }

  refs.joinStatus.classList.remove('hidden');
  refs.joinStatus.classList.remove('error');
  refs.joinStatus.textContent = 'Joining event…';
  state.ui.events.joinFeedback = null;

  try {
    await joinEventWithInvite(code);
    refs.joinInput.value = '';
    refs.joinStatus.textContent = 'Invite accepted! Loading events…';
    state.ui.events.joinFeedback = { type: 'success', message: 'Invite accepted!' };
    await loadEvents();
    await loadBets();
    await loadSettlements();
    await loadNotifications({ showLoading: false });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to join event.';
    refs.joinStatus.textContent = message;
    refs.joinStatus.classList.add('error');
    state.ui.events.joinFeedback = { type: 'error', message };
  }
}

function createEventCard(event) {
  const card = document.createElement('article');
  card.className = 'card';

  const header = document.createElement('div');
  header.className = 'card__header';

  const title = document.createElement('h3');
  title.className = 'card__title';
  title.textContent = event.title ?? event.name ?? 'Event';

  const statusKey = (event.status ?? 'scheduled').toLowerCase();
  const statusInfo = eventStatusStyles[statusKey] ?? { label: event.status ?? 'Pending', appearance: 'muted' };
  const statusBadge = createStatusBadge(statusInfo.label, statusInfo.appearance);

  header.append(title, statusBadge);

  const roleLine = document.createElement('p');
  roleLine.className = 'card__subtitle';
  roleLine.textContent = `Your role: ${event.membershipRole ?? 'MEMBER'}`;

  const tabs = document.createElement('div');
  tabs.className = 'card__tabs';

  const detailsTab = document.createElement('button');
  detailsTab.type = 'button';
  detailsTab.className = 'card__tab card__tab--active';
  detailsTab.textContent = 'Details';

  const invitesTab = document.createElement('button');
  invitesTab.type = 'button';
  invitesTab.className = 'card__tab';
  invitesTab.textContent = 'Invites';

  tabs.append(detailsTab, invitesTab);

  const detailsSection = document.createElement('div');
  detailsSection.className = 'card__section';

  const invitesSection = document.createElement('div');
  invitesSection.className = 'card__section hidden';

  const updateDetails = () => buildEventDetailsSection(event, detailsSection);
  const updateInvites = () => buildEventInvitesSection(event, invitesSection, updateInvites);

  updateDetails();

  detailsTab.addEventListener('click', () => {
    detailsTab.classList.add('card__tab--active');
    invitesTab.classList.remove('card__tab--active');
    detailsSection.classList.remove('hidden');
    invitesSection.classList.add('hidden');
  });

  invitesTab.addEventListener('click', () => {
    invitesTab.classList.add('card__tab--active');
    detailsTab.classList.remove('card__tab--active');
    detailsSection.classList.add('hidden');
    invitesSection.classList.remove('hidden');
    void ensureEventMembers(event.id, updateInvites);
    updateInvites();
  });

  card.append(header, roleLine, tabs, detailsSection, invitesSection);

  return card;
}

function buildEventDetailsSection(event, container) {
  clearChildren(container);

  const description = document.createElement('p');
  description.className = 'card__description';
  description.textContent = event.description ?? 'No description available.';

  const metaList = document.createElement('div');
  metaList.className = 'card__meta';

  const closesAt = event.closesAt ?? event.endsAt ?? event.startsAt ?? null;
  const closes = document.createElement('div');
  closes.innerHTML = `<span>Ends:</span> ${closesAt ? formatDateTime(closesAt) : 'TBD'}`;

  const participantCount = Array.isArray(event.participants) ? event.participants.length : 0;
  const participants = document.createElement('div');
  participants.innerHTML = `<span>Participants:</span> ${participantCount}`;

  metaList.append(closes, participants);

  container.append(description, metaList);

  const statusKey = (event.status ?? '').toLowerCase();
  if (['completed', 'settled'].includes(statusKey)) {
    const action = document.createElement('div');
    action.className = 'card__actions';

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'button';
    button.textContent = 'View results';
    button.addEventListener('click', () => showResultsForEvent(event.id));

    action.append(button);
    container.append(action);
  }
}

function getInviteState(eventId) {
  const map = state.ui.events.inviteStates;
  if (!map.has(eventId)) {
    map.set(eventId, {
      inviteCode: null,
      loading: false,
      error: null,
      members: [],
      membersLoaded: false,
      membersLoading: false,
      membersError: null,
    });
  }

  return map.get(eventId);
}

async function ensureEventMembers(eventId, onUpdate) {
  const inviteState = getInviteState(eventId);

  if (inviteState.membersLoaded || inviteState.membersLoading) {
    return;
  }

  inviteState.membersLoading = true;
  inviteState.membersError = null;
  onUpdate?.();

  try {
    const members = await getEventMembers(eventId);
    inviteState.members = Array.isArray(members) ? members : [];
    inviteState.membersLoaded = true;
  } catch (error) {
    inviteState.membersError = error instanceof Error ? error.message : 'Unable to load members.';
  } finally {
    inviteState.membersLoading = false;
    onUpdate?.();
  }
}

function buildEventInvitesSection(event, container, onUpdate) {
  const inviteState = getInviteState(event.id);
  clearChildren(container);

  const roleInfo = createParagraph(`Your role: ${event.membershipRole ?? 'MEMBER'}`);
  roleInfo.classList.add('muted');
  container.append(roleInfo);

  const isManager = ['ADMIN', 'OWNER'].includes(event.membershipRole ?? 'MEMBER');

  if (isManager) {
    const form = document.createElement('form');
    form.className = 'invite-form';

    const expiresLabel = document.createElement('label');
    expiresLabel.textContent = 'Expires (optional)';
    const expiresInput = document.createElement('input');
    expiresInput.type = 'datetime-local';
    expiresInput.name = 'expiresAt';

    const maxUsesLabel = document.createElement('label');
    maxUsesLabel.textContent = 'Max uses (optional)';
    const maxUsesInput = document.createElement('input');
    maxUsesInput.type = 'number';
    maxUsesInput.name = 'maxUses';
    maxUsesInput.min = '1';

    const submit = document.createElement('button');
    submit.type = 'submit';
    submit.className = 'button';
    submit.textContent = inviteState.loading ? 'Creating…' : 'Create invite';
    submit.disabled = inviteState.loading;

    form.append(expiresLabel, expiresInput, maxUsesLabel, maxUsesInput, submit);

    form.addEventListener('submit', async (eventSubmit) => {
      eventSubmit.preventDefault();
      inviteState.loading = true;
      inviteState.error = null;
      onUpdate?.();

      const payload = {};
      if (expiresInput.value) {
        const iso = new Date(expiresInput.value).toISOString();
        payload.expiresAt = iso;
      }
      if (maxUsesInput.value) {
        payload.maxUses = Number.parseInt(maxUsesInput.value, 10);
      }

      try {
        const response = await createEventInvite(event.id, payload);
        inviteState.inviteCode = response?.inviteCode ?? null;
      } catch (error) {
        inviteState.error = error instanceof Error ? error.message : 'Unable to create invite.';
      } finally {
        inviteState.loading = false;
        onUpdate?.();
      }
    });

    container.append(form);
  } else {
    container.append(createParagraph('Only event admins can generate new invite codes.'));
  }

  if (inviteState.loading) {
    container.append(createParagraph('Generating invite…'));
  }

  if (inviteState.error) {
    container.append(createParagraph(inviteState.error, 'error'));
  }

  if (inviteState.inviteCode) {
    const codeRow = document.createElement('div');
    codeRow.className = 'invite-code';

    const codeInput = document.createElement('input');
    codeInput.type = 'text';
    codeInput.readOnly = true;
    codeInput.value = inviteState.inviteCode;

    const copyButton = document.createElement('button');
    copyButton.type = 'button';
    copyButton.className = 'button button--secondary';
    copyButton.textContent = 'Copy';
    copyButton.addEventListener('click', async () => {
      try {
        if (navigator?.clipboard) {
          await navigator.clipboard.writeText(inviteState.inviteCode ?? '');
        }
      } catch {
        // ignore clipboard errors
      }
    });

    codeRow.append(codeInput, copyButton);
    container.append(codeRow);
  }

  const membersSection = document.createElement('div');
  membersSection.className = 'invite-members';

  const membersTitle = document.createElement('h4');
  membersTitle.textContent = 'Members';
  membersSection.append(membersTitle);

  if (inviteState.membersLoading) {
    membersSection.append(createParagraph('Loading members…'));
  } else if (inviteState.membersError) {
    membersSection.append(createParagraph(inviteState.membersError, 'error'));
  } else if (inviteState.members.length) {
    const list = document.createElement('ul');
    list.className = 'invite-members__list';

    inviteState.members.forEach((member) => {
      const item = document.createElement('li');
      const role = member.role ?? 'MEMBER';
      const label = member.user?.email ?? member.userId;
      item.textContent = `${label} — ${role}`;
      list.append(item);
    });

    membersSection.append(list);
  } else {
    membersSection.append(createParagraph('No members yet.'));
  }

  container.append(membersSection);
}

function renderBets() {
  const { body } = sectionRefs.get('bets');
  clearChildren(body);

  if (!state.auth.user) {
    body.append(createParagraph('Sign in to view your bets.'));
    return;
  }

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

  if (!state.auth.user) {
    body.append(createParagraph('Sign in to view settlements.'));
    return;
  }

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

  if (!state.auth.user) {
    body.append(createParagraph('Sign in to view the leaderboard.'));
    return;
  }

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

function renderAchievementsSection() {
  const refs = sectionRefs.get('achievements');
  if (!refs) {
    return;
  }

  const { body } = refs;
  clearChildren(body);

  if (!state.auth.user) {
    body.append(createParagraph('Sign in to track your achievements.'));
    return;
  }

  const status = state.status.achievements;

  if (status === 'loading') {
    body.append(createParagraph('Loading achievements…'));
    return;
  }

  if (status === 'error') {
    body.append(createParagraph('Unable to load achievements right now.', 'error'));
    return;
  }

  if (!state.achievements.catalog.length) {
    body.append(createParagraph('Achievements are coming soon. Check back later!'));
    return;
  }

  const gridContainer = document.createElement('div');

  if (!state.meta.currentUserId) {
    body.append(createParagraph('Sign in to start unlocking achievements.'));
  }

  renderAchievementsView(gridContainer, {
    all: state.achievements.catalog,
    earned: state.achievements.mine,
  });

  body.append(gridContainer);
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

  const card = createProfileStatsCard(state.profileStats, { highlightLevelUp: state.ui.profileLevelUp });
  state.ui.profileLevelUp = false;

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
  if (!state.auth.user) {
    showAuthOverlay('login');
    updateAuthOverlay();
    return;
  }

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
  if (!state.auth.user) {
    showAuthOverlay('login');
    updateAuthOverlay();
    return;
  }

  state.selectedEventId = eventId;
  setActiveSection('results');
  loadResults(eventId);
}

async function loadResults(eventId) {
  if (!state.auth.user) {
    updateStatus('results', 'idle');
    renderResults();
    return;
  }

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

  if (!state.auth.user) {
    body.append(createParagraph('Sign in to view results.'));
    return;
  }

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
