import { clearChildren, formatDateTime } from './helpers.js';

function normalizeEarnedEntries(entries = []) {
  return entries
    .map((entry) => {
      if (entry?.achievement) {
        return {
          code: entry.achievement.code,
          title: entry.achievement.title,
          description: entry.achievement.description,
          xpReward: entry.achievement.xpReward,
          achievedAt: entry.achievedAt,
        };
      }

      return entry;
    })
    .filter((entry) => entry?.code);
}

function createAchievementCard(achievement, unlockedInfo) {
  const unlocked = Boolean(unlockedInfo);
  const card = document.createElement('article');
  card.className = `card achievement-card${unlocked ? '' : ' achievement-card--locked'}`;

  const title = document.createElement('h3');
  title.className = 'achievement-card__title';
  title.textContent = achievement.title;

  const description = document.createElement('p');
  description.className = 'achievement-card__description';
  description.textContent = achievement.description;

  const reward = document.createElement('span');
  reward.className = 'achievement-card__reward';
  reward.textContent = `+${achievement.xpReward} XP`;

  const footer = document.createElement('div');
  footer.className = 'achievement-card__footer';
  footer.append(reward);

  if (unlocked && unlockedInfo?.achievedAt) {
    const unlockedAt = document.createElement('span');
    unlockedAt.className = 'achievement-card__meta';
    unlockedAt.textContent = `Unlocked ${formatDateTime(unlockedInfo.achievedAt)}`;
    footer.append(unlockedAt);
  } else {
    const lockedLabel = document.createElement('span');
    lockedLabel.className = 'achievement-card__meta';
    lockedLabel.textContent = 'Locked';
    footer.append(lockedLabel);
  }

  card.append(title, description, footer);
  return card;
}

export function renderAchievementsView(container, { all = [], earned = [] } = {}) {
  clearChildren(container);

  const earnedEntries = normalizeEarnedEntries(earned);
  const earnedByCode = new Map(earnedEntries.map((entry) => [entry.code, entry]));

  const grid = document.createElement('div');
  grid.className = 'achievement-grid';

  all.forEach((achievement) => {
    const unlockedInfo = earnedByCode.get(achievement.code);
    grid.append(createAchievementCard(achievement, unlockedInfo));
  });

  container.append(grid);
}
