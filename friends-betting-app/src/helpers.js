const numberFormatter = new Intl.NumberFormat('en-US');
const dateTimeFormatter = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
  hour: 'numeric',
  minute: '2-digit'
});

export function formatNumber(value) {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return '0';
  }
  return numberFormatter.format(value);
}

export function formatDateTime(value) {
  if (!value) {
    return 'Unknown';
  }

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return 'Unknown';
  }

  return dateTimeFormatter.format(date);
}

export function formatOdds(value) {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return '0.00x';
  }

  return `${value.toFixed(2)}x`;
}

export function formatNetUnits(value) {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return '0 units';
  }

  const prefix = value >= 0 ? '+' : '';
  return `${prefix}${formatNumber(value)} units`;
}

export function createStatusBadge(label, appearance) {
  const badge = document.createElement('span');
  badge.className = `status-pill status-${appearance}`;
  badge.textContent = label;
  return badge;
}

export function clearChildren(element) {
  while (element.firstChild) {
    element.removeChild(element.firstChild);
  }
}

export function createParagraph(text, className = 'muted') {
  const p = document.createElement('p');
  p.className = className;
  p.textContent = text;
  return p;
}
