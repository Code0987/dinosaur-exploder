import { MODES, type GameModeId } from "./constants";

export interface LevelState {
  currentLevel: number;
  enemiesToDefeat: number;
  defeatedEnemies: number;
  bossesToDefeat: number;
  defeatedBosses: number;
  enemySpawnRate: number;
  enemySpeed: number;
  asteroidsSpawnRate: number;
  asteroidsVerticalSpeed: number;
  asteroidsHorizontalSpeed: number;
  mode: GameModeId;
}

export function createLevel(mode: GameModeId): LevelState {
  const tuning = MODES[mode];
  return {
    currentLevel: 1,
    enemiesToDefeat: tuning.initialEnemies,
    defeatedEnemies: 0,
    bossesToDefeat: tuning.bossesToDefeat,
    defeatedBosses: 0,
    enemySpawnRate: tuning.initialSpawnRate,
    enemySpeed: tuning.initialSpeed,
    asteroidsSpawnRate: tuning.initialAsteroidRate,
    asteroidsVerticalSpeed: 0.8,
    asteroidsHorizontalSpeed: 0.2,
    mode,
  };
}

export function levelProgress(level: LevelState): number {
  const enemies = level.enemiesToDefeat > 0 ? level.defeatedEnemies / level.enemiesToDefeat : 0;
  const bosses = level.bossesToDefeat > 0 ? level.defeatedBosses / level.bossesToDefeat : 0;
  return Math.max(enemies, bosses);
}

export function shouldAdvance(level: LevelState): boolean {
  return (
    level.defeatedEnemies >= level.enemiesToDefeat ||
    level.defeatedBosses >= level.bossesToDefeat
  );
}

export function nextLevel(level: LevelState): void {
  const tuning = MODES[level.mode];
  level.currentLevel += 1;
  level.defeatedEnemies = 0;
  level.enemiesToDefeat += tuning.enemiesIncrement;
  level.defeatedBosses = 0;
  level.enemySpawnRate = Math.max(
    tuning.minSpawnRate,
    level.enemySpawnRate * tuning.spawnRateDecay,
  );
  level.enemySpeed += tuning.speedIncrement;
  level.asteroidsSpawnRate += tuning.asteroidRateIncrement;
}

export function isSingleBossLevel(level: LevelState): boolean {
  return level.bossesToDefeat < 2 && level.currentLevel % 5 === 0;
}
