import { formatNumber } from './helpers.js';

const XP_PER_LEVEL = 100;

function createStatChip(label, value) {
  const chip = document.createElement('div');
  chip.className = 'profile-stats__chip';
  chip.innerHTML = `<span class="profile-stats__chip-label">${label}</span><span class="profile-stats__chip-value">${value}</span>`;
  return chip;
}

function createXpProgress(stats) {
  const wrapper = document.createElement('div');
  wrapper.className = 'xp-progress';

  const level = Math.floor(stats.xp / XP_PER_LEVEL) + 1;
  const currentProgress = stats.xp % XP_PER_LEVEL;
  const progressPercent = Math.min(100, Math.round((currentProgress / XP_PER_LEVEL) * 100));

  const label = document.createElement('div');
  label.className = 'xp-progress__label';
  label.textContent = `Level ${level}`;

  const track = document.createElement('div');
  track.className = 'xp-progress__track';

  const fill = document.createElement('div');
  fill.className = 'xp-progress__fill';
  fill.style.width = `${progressPercent}%`;

  const marker = document.createElement('span');
  marker.className = 'xp-progress__value';
  marker.textContent = `${stats.xp} XP`;

  track.append(fill);
  wrapper.append(label, track, marker);

  return wrapper;
}

export function createProfileStatsCard(stats) {
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

  const xp = createXpProgress(stats);

  card.append(heading, chips, streak, xp);
  return card;
}

export { XP_PER_LEVEL };
