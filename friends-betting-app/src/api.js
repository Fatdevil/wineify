const API_BASE_URL = 'http://localhost:3000/api';

function buildHeaders(extra = {}) {
  const headers = { 'Content-Type': 'application/json', ...extra };

  if (typeof window !== 'undefined' && window?.localStorage) {
    const token = window.localStorage.getItem('jwt');
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
  }

  return headers;
}

async function fetchJson(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: buildHeaders(options.headers || {})
  });

  if (!response.ok) {
    const message = `Request failed with status ${response.status}`;
    throw new Error(message);
  }

  if (response.status === 204) {
    return null;
  }

  const text = await response.text();
  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch (error) {
    throw new Error('Invalid JSON response received from API');
  }
}

export async function getEvents() {
  const data = await fetchJson('/events');
  return Array.isArray(data?.events) ? data.events : [];
}

export async function getMyBets() {
  const data = await fetchJson('/bets/mine');
  return Array.isArray(data?.bets) ? data.bets : [];
}

export async function getSettlements() {
  const data = await fetchJson('/settlements');
  return Array.isArray(data?.settlements) ? data.settlements : [];
}

export async function markSettlementReceived(id) {
  await fetchJson(`/settlements/${id}/mark-received`, {
    method: 'POST'
  });
}

export async function getResults(eventId) {
  if (!eventId) {
    throw new Error('Missing event identifier');
  }

  return fetchJson(`/results/${eventId}`);
}
