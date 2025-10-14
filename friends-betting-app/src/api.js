const API_BASE_URL = 'http://localhost:3000/api';
const REFRESH_TOKEN_KEY = 'wineify.refreshToken';

let accessToken = null;
let refreshToken = null;
let currentUser = null;

const isBrowser = typeof window !== 'undefined';

if (isBrowser) {
  const storedRefresh = window.localStorage.getItem(REFRESH_TOKEN_KEY);
  if (storedRefresh) {
    refreshToken = storedRefresh;
  }
}

const parseBody = async (response) => {
  if (response.status === 204) {
    return null;
  }

  const text = await response.text();

  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch {
    throw new Error('Invalid JSON response received from API');
  }
};

const extractErrorMessage = async (response) => {
  try {
    const payload = await response.clone().json();
    if (payload?.message) {
      return payload.message;
    }
  } catch {
    // ignore parse errors
  }

  return `Request failed with status ${response.status}`;
};

const setSession = (payload) => {
  accessToken = payload?.accessToken ?? null;
  refreshToken = payload?.refreshToken ?? null;
  currentUser = payload?.user ?? currentUser;

  if (isBrowser) {
    if (refreshToken) {
      window.localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
    } else {
      window.localStorage.removeItem(REFRESH_TOKEN_KEY);
    }
  }
};

export const clearSession = () => {
  accessToken = null;
  refreshToken = null;
  currentUser = null;

  if (isBrowser) {
    window.localStorage.removeItem(REFRESH_TOKEN_KEY);
  }
};

const refreshSession = async () => {
  if (!refreshToken) {
    throw new Error('Missing refresh token.');
  }

  const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  });

  if (!response.ok) {
    clearSession();
    const message = await extractErrorMessage(response);
    throw new Error(message);
  }

  const data = await parseBody(response);
  setSession(data);
  currentUser = data?.user ?? currentUser;

  return data;
};

const buildRequestInit = (options = {}) => {
  const headers = { 'Content-Type': 'application/json', ...(options.headers ?? {}) };

  const init = {
    ...options,
    headers,
  };

  if (options.body && typeof options.body !== 'string') {
    init.body = JSON.stringify(options.body);
  }

  if (!init.body) {
    delete init.body;
  }

  if (!init.body) {
    delete headers['Content-Type'];
  }

  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  }

  return init;
};

const request = async (path, options = {}, retry = true) => {
  const init = buildRequestInit(options);
  const response = await fetch(`${API_BASE_URL}${path}`, init);

  if (response.status === 401 && retry && refreshToken) {
    try {
      await refreshSession();
      return request(path, options, false);
    } catch (error) {
      throw error instanceof Error ? error : new Error('Authentication required.');
    }
  }

  if (!response.ok) {
    const message = await extractErrorMessage(response);
    throw new Error(message);
  }

  return parseBody(response);
};

const authRequest = async (path, credentials) => {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(credentials),
  });

  if (!response.ok) {
    const message = await extractErrorMessage(response);
    throw new Error(message);
  }

  const data = await parseBody(response);
  setSession(data);
  currentUser = data?.user ?? currentUser;
  return data;
};

export const initializeSession = async () => {
  if (!refreshToken) {
    return null;
  }

  try {
    const data = await refreshSession();
    return data?.user ?? null;
  } catch {
    return null;
  }
};

export const registerUser = (email, password) => authRequest('/auth/register', { email, password });

export const loginUser = (email, password) => authRequest('/auth/login', { email, password });

export const logoutUser = async ({ all = false } = {}) => {
  if (!accessToken) {
    clearSession();
    return;
  }

  const body = all || !refreshToken ? { all: true } : { refreshToken };

  try {
    await request('/auth/logout', { method: 'POST', body }, false);
  } finally {
    clearSession();
  }
};

export const getCurrentUser = () => currentUser;

export const isAuthenticated = () => Boolean(accessToken && currentUser);

export async function getEvents() {
  const data = await request('/events');
  return Array.isArray(data?.events) ? data.events : [];
}

export async function getMyBets() {
  const data = await request('/bets');
  return Array.isArray(data?.bets) ? data.bets : [];
}

export async function getSettlements() {
  const data = await request('/settlements');
  return Array.isArray(data?.settlements) ? data.settlements : [];
}

export async function markSettlementReceived(id) {
  return request(`/settlements/${id}/mark-received`, {
    method: 'POST',
  });
}

export async function createEventInvite(eventId, payload = {}) {
  if (!eventId) {
    throw new Error('Missing event identifier');
  }

  return request(`/events/${eventId}/invites`, {
    method: 'POST',
    body: payload,
  });
}

export async function joinEventWithInvite(inviteCode) {
  if (!inviteCode) {
    throw new Error('Invite code is required.');
  }

  return request('/invites/join', {
    method: 'POST',
    body: { inviteCode },
  });
}

export async function getEventMembers(eventId) {
  if (!eventId) {
    throw new Error('Missing event identifier');
  }

  const data = await request(`/events/${eventId}/members`);
  return Array.isArray(data?.members) ? data.members : [];
}

export async function getResults(eventId) {
  if (!eventId) {
    throw new Error('Missing event identifier');
  }

  return request(`/results/${eventId}`);
}

export async function getLeaderboard() {
  const data = await request('/stats/leaderboard');
  return Array.isArray(data?.leaderboard) ? data.leaderboard : [];
}

export async function getProfileStats(userId) {
  if (!userId) {
    throw new Error('Missing user identifier');
  }

  const data = await request(`/stats/${userId}`);
  return data?.stats ?? null;
}

export async function getAchievements() {
  const data = await request('/achievements');
  return Array.isArray(data?.achievements) ? data.achievements : [];
}

export async function getMyAchievements(userId) {
  if (!userId) {
    return [];
  }

  const data = await request(`/achievements/mine?userId=${encodeURIComponent(userId)}`);
  return Array.isArray(data?.achievements) ? data.achievements : [];
}

export async function getNotificationsList(limit = 25) {
  const params = new URLSearchParams();
  if (limit) {
    params.set('limit', String(limit));
  }

  const data = await request(`/notifications?${params.toString()}`);
  return Array.isArray(data?.notifications) ? data.notifications : [];
}

export async function markNotificationAsRead(id) {
  if (!id) {
    throw new Error('Notification id is required.');
  }

  return request(`/notifications/${id}/read`, {
    method: 'POST',
  });
}
