import { formatNumber } from './helpers.js';

function createStatChip(label, value) {
  const chip = document.createElement('div');
  chip.className = 'profile-stats__chip';
  chip.innerHTML = `<span class="profile-stats__chip-label">${label}</span><span class="profile-stats__chip-value">${value}</span>`;
  return chip;
}

function createXpProgress(stats, { highlightLevelUp = false } = {}) {
  const wrapper = document.createElement('div');
  wrapper.className = 'xp-progress';
  if (highlightLevelUp) {
    wrapper.classList.add('xp-progress--level-up');
  }

  const xpIntoLevel = Math.max(0, stats.xpIntoLevel ?? 0);
  const xpForNextLevel = Math.max(1, stats.xpForNextLevel ?? 1);
  const progressPercent = Math.min(100, Math.round((xpIntoLevel / xpForNextLevel) * 100));

  const label = document.createElement('div');
  label.className = 'xp-progress__label';
  label.innerHTML = `
    <span class="xp-progress__level">Level ${stats.level ?? 1}</span>
    <span class="xp-progress__meter">${xpIntoLevel}/${xpForNextLevel} XP</span>
  `;

  const track = document.createElement('div');
  track.className = 'xp-progress__track';

  const fill = document.createElement('div');
  fill.className = 'xp-progress__fill';
  fill.style.width = `${progressPercent}%`;

  const marker = document.createElement('span');
  marker.className = 'xp-progress__value';
  const nextLevelTarget = stats.nextLevelXp ?? (stats.xp ?? 0) + xpForNextLevel;
  marker.textContent = `Next level at ${nextLevelTarget} XP · ${stats.xp} total XP`;

  track.append(fill);
  wrapper.append(label, track, marker);

  return wrapper;
}

export function createProfileStatsCard(stats, options = {}) {
  const card = document.createElement('article');
  card.className = 'card profile-stats';

  const heading = document.createElement('header');
  heading.className = 'profile-stats__header';
  heading.innerHTML = `<h3 class="profile-stats__title">${stats.username}</h3>`;

  const chips = document.createElement('div');
  chips.className = 'profile-stats__chips';
  chips.append(
    createStatChip('Wins', stats.totalWins),
    createStatChip('Losses', stats.totalLosses),
    createStatChip('Net Units', formatNumber(stats.totalUnits))
  );

  const streak = document.createElement('p');
  streak.className = 'profile-stats__streak';
  streak.textContent = stats.streak > 0 ? `Streak: ${'🔥'.repeat(Math.min(stats.streak, 5))}${stats.streak > 5 ? '+' : ''}` : 'No active streak';

  const xp = createXpProgress(stats, options);

  card.append(heading, chips, streak, xp);
  return card;
}
