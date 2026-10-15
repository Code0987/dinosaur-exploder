import { freshAchievements, normalizeAchievements, type AchievementProgress } from "./achievements";
import type { GameModeId } from "./constants";

export interface Settings {
  volume: number;
  muted: boolean;
  sfxVolume: number;
  sfxMuted: boolean;
  language: string;
}

export interface SaveData {
  highScores: Record<GameModeId, number>;
  totalCoins: number;
  achievements: AchievementProgress[];
  settings: Settings;
}

const KEY = "dinosaur-exploder-web-v1";

export function defaultSettings(): Settings {
  return {
    volume: 1,
    muted: false,
    sfxVolume: 1,
    sfxMuted: false,
    language: "English",
  };
}

export function emptySave(): SaveData {
  return {
    highScores: { EASY: 0, NORMAL: 0, EXPERT: 0 },
    totalCoins: 0,
    achievements: freshAchievements(),
    settings: defaultSettings(),
  };
}

export function maxHighScore(save: SaveData): number {
  return Math.max(save.highScores.EASY, save.highScores.NORMAL, save.highScores.EXPERT);
}

export function loadSave(): SaveData {
  if (typeof localStorage === "undefined") return emptySave();
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return emptySave();
    const parsed = JSON.parse(raw) as Partial<SaveData>;
    const base = emptySave();
    return {
      highScores: {
        EASY: parsed.highScores?.EASY ?? 0,
        NORMAL: parsed.highScores?.NORMAL ?? 0,
        EXPERT: parsed.highScores?.EXPERT ?? 0,
      },
      totalCoins: parsed.totalCoins ?? 0,
      achievements: normalizeAchievements(parsed.achievements),
      settings: { ...base.settings, ...parsed.settings },
    };
  } catch {
    return emptySave();
  }
}

export function persistSave(save: SaveData): void {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify(save));
}
