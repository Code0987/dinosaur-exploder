export const WIDTH = 550;
export const HEIGHT = 750;
export const TICK = 1 / 60;

export type GameModeId = "EASY" | "NORMAL" | "EXPERT";
export type Direction = "UP" | "DOWN" | "LEFT" | "RIGHT";
export type SpecialtyId = "none" | "more_hearts" | "more_bombs" | "smaller_hitbox";

export interface ModeTuning {
  startingLives: number;
  grace: number;
  bossesToDefeat: number;
  initialEnemies: number;
  enemiesIncrement: number;
  initialSpawnRate: number;
  minSpawnRate: number;
  spawnRateDecay: number;
  initialSpeed: number;
  speedIncrement: number;
  initialAsteroidRate: number;
  asteroidRateIncrement: number;
}

export const MODES: Record<GameModeId, ModeTuning> = {
  EASY: {
    startingLives: 5,
    grace: 2,
    bossesToDefeat: 1,
    initialEnemies: 3,
    enemiesIncrement: 2,
    initialSpawnRate: 1.5,
    minSpawnRate: 0.8,
    spawnRateDecay: 0.95,
    initialSpeed: 0.8,
    speedIncrement: 0.1,
    initialAsteroidRate: 2.5,
    asteroidRateIncrement: 0.05,
  },
  NORMAL: {
    startingLives: 3,
    grace: 1.5,
    bossesToDefeat: 1,
    initialEnemies: 5,
    enemiesIncrement: 5,
    initialSpawnRate: 0.75,
    minSpawnRate: 0.3,
    spawnRateDecay: 0.9,
    initialSpeed: 1.5,
    speedIncrement: 0.2,
    initialAsteroidRate: 1.5,
    asteroidRateIncrement: 0.1,
  },
  EXPERT: {
    startingLives: 3,
    grace: 1,
    bossesToDefeat: 2,
    initialEnemies: 5,
    enemiesIncrement: 5,
    initialSpawnRate: 0.75,
    minSpawnRate: 0.3,
    spawnRateDecay: 0.9,
    initialSpeed: 1.5,
    speedIncrement: 0.2,
    initialAsteroidRate: 1.5,
    asteroidRateIncrement: 0.1,
  },
};

export const SHIP_SIZES: Record<number, { w: number; h: number }> = {
  1: { w: 87, h: 102 },
  2: { w: 87, h: 72 },
  3: { w: 87, h: 133 },
  4: { w: 87, h: 120 },
  5: { w: 87, h: 144 },
  6: { w: 87, h: 136 },
  7: { w: 87, h: 87 },
  8: { w: 87, h: 116 },
};

export const SHIP_SCORE: Record<number, number> = {
  1: 0,
  2: 0,
  3: 100,
  4: 200,
  5: 300,
  6: 400,
  7: 600,
  8: 700,
};

export const SHIP_COINS: Record<number, number> = {
  1: 0,
  2: 0,
  3: 10,
  4: 50,
  5: 100,
  6: 150,
  7: 200,
  8: 250,
};

export const WEAPON_SCORE: Record<number, number> = { 1: 0, 2: 50, 3: 100 };
export const WEAPON_COINS: Record<number, number> = { 1: 0, 2: 5, 3: 10 };

export interface SpecialtyDef {
  id: SpecialtyId;
  nameKey: string;
  descriptionKey: string;
  icon: string;
  costInCoins: number;
  costInHighScore: number;
}

export const SPECIALTIES: SpecialtyDef[] = [
  {
    id: "more_hearts",
    nameKey: "specialty_more_hearts",
    descriptionKey: "specialty_more_hearts_description",
    icon: "more_hearts.png",
    costInCoins: 20,
    costInHighScore: 20,
  },
  {
    id: "more_bombs",
    nameKey: "specialty_more_bombs",
    descriptionKey: "specialty_more_bombs_description",
    icon: "more_bombs.png",
    costInCoins: 30,
    costInHighScore: 50,
  },
  {
    id: "smaller_hitbox",
    nameKey: "specialty_smaller_hitbox",
    descriptionKey: "specialty_smaller_hitbox_description",
    icon: "smaller_hitbox.png",
    costInCoins: 40,
    costInHighScore: 80,
  },
  {
    id: "none",
    nameKey: "specialty_none",
    descriptionKey: "specialty_none_description",
    icon: "none.png",
    costInCoins: 0,
    costInHighScore: 0,
  },
];

export const DIRECTIONS: Direction[] = ["UP", "DOWN", "LEFT", "RIGHT"];

export const MAX_HEAT = 100;
export const HEAT_PER_SHOT = 12;
export const COOL_PER_SECOND = 30;
export const SLOW_HEAT = 90;
export const SLOW_SHOT_SECONDS = 0.28;
export const PLAYER_STEP = 8;
export const SHIELD_DURATION = 3;
export const SHIELD_COOLDOWN = 8;
export const COINS_PER_BOMB = 15;
export const PROJECTILE_HIT = 50;
export const ENEMY_SHOT_SPEED = 300;
export const PICKUP_SPEED = 100;
export const ALLY_DISTANCE = 60;
export const ALLY_LIFE = 2;
export const ALLY_DURATION = 30;
