const BASE_XP_THRESHOLD = 100;
const LEVEL_GROWTH_RATE = 1.1;

function getTransitionThreshold(level: number): number {
  if (level <= 0) {
    return BASE_XP_THRESHOLD;
  }

  const scaled = BASE_XP_THRESHOLD * Math.pow(LEVEL_GROWTH_RATE, Math.max(0, level - 1));
  return Math.round(scaled);
}

export function getTotalXpForLevel(level: number): number {
  if (level <= 1) {
    return 0;
  }

  let total = 0;
  for (let current = 1; current < level; current += 1) {
    total += getTransitionThreshold(current);
  }
  return total;
}

export function calculateLevel(totalXp: number): number {
  if (!Number.isFinite(totalXp) || totalXp <= 0) {
    return 1;
  }

  return Math.floor(Math.sqrt(totalXp / 100)) + 1;
}

export interface LevelProgress {
  level: number;
  nextLevelTotalXp: number;
  currentLevelFloorXp: number;
  xpIntoLevel: number;
  xpForNextLevel: number;
}

export function getLevelProgress(totalXp: number): LevelProgress {
  const clampedXp = Math.max(0, Math.floor(totalXp));
  const level = calculateLevel(clampedXp);
  const currentLevelFloorXp = getTotalXpForLevel(level);
  const nextLevelTotalXp = getTotalXpForLevel(level + 1);
  const xpIntoLevel = Math.max(0, clampedXp - currentLevelFloorXp);
  const xpForNextLevel = Math.max(1, nextLevelTotalXp - currentLevelFloorXp);

  return {
    level,
    nextLevelTotalXp,
    currentLevelFloorXp,
    xpIntoLevel,
    xpForNextLevel,
  };
}

export { BASE_XP_THRESHOLD, LEVEL_GROWTH_RATE };
