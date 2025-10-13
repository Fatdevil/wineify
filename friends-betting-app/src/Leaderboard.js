import { clearChildren } from './helpers.js';

function formatStreak(streak) {
  if (!streak || streak <= 0) {
    return '–';
  }

  const maxFlames = 5;
  const flameString = '🔥'.repeat(Math.min(streak, maxFlames));
  return streak > maxFlames ? `${flameString}+` : flameString;
}

function createLeaderboardRow(entry, index, maxXp) {
  const card = document.createElement('article');
  card.className = 'card leaderboard__entry';

  const header = document.createElement('div');
  header.className = 'leaderboard__entry-header';

  const rank = document.createElement('span');
  rank.className = 'leaderboard__rank';
  rank.textContent = `#${index + 1}`;

  const identity = document.createElement('div');
  identity.className = 'leaderboard__identity';
  identity.innerHTML = `
    <h3 class="leaderboard__name">${entry.username}</h3>
    <p class="leaderboard__meta">${entry.totalWins} wins · ${entry.totalLosses} losses</p>
  `;

  const streak = document.createElement('span');
  streak.className = 'leaderboard__streak';
  streak.textContent = formatStreak(entry.streak);

  header.append(rank, identity, streak);

  const xpBar = document.createElement('div');
  xpBar.className = 'xp-bar';

  const fill = document.createElement('div');
  fill.className = 'xp-bar__fill';

  const denominator = maxXp > 0 ? maxXp : 1;
  const progress = Math.max(4, Math.round((entry.xp / denominator) * 100));
  fill.style.width = `${Math.min(progress, 100)}%`;
  fill.dataset.xp = `${entry.xp} XP`;

  xpBar.append(fill);

  card.append(header, xpBar);
  return card;
}

export function renderLeaderboard(container, entries = []) {
  clearChildren(container);

  if (!entries.length) {
    const empty = document.createElement('p');
    empty.className = 'empty-state';
    empty.textContent = 'No stats yet. Settlements will populate the leaderboard once completed.';
    container.append(empty);
    return;
  }

  const maxXp = entries.reduce((highest, entry) => Math.max(highest, entry.xp), 0);

  entries.forEach((entry, index) => {
    container.append(createLeaderboardRow(entry, index, maxXp));
  });
}
