import {
  SHIP_COINS,
  SHIP_SCORE,
  SPECIALTIES,
  WEAPON_COINS,
  WEAPON_SCORE,
  type SpecialtyId,
} from "./constants";
import { maxHighScore, type SaveData } from "./save";

export interface LockReason {
  score?: number;
  coins?: number;
}

export function shipLock(ship: number, save: SaveData): LockReason | null {
  const score = SHIP_SCORE[ship] ?? 0;
  const coins = SHIP_COINS[ship] ?? 0;
  return reason(score, coins, maxHighScore(save), save.totalCoins);
}

export function weaponLock(weapon: number, save: SaveData): LockReason | null {
  const score = WEAPON_SCORE[weapon] ?? 0;
  const coins = WEAPON_COINS[weapon] ?? 0;
  return reason(score, coins, maxHighScore(save), save.totalCoins);
}

export function specialtyLock(id: SpecialtyId, save: SaveData): LockReason | null {
  const spec = SPECIALTIES.find((item) => item.id === id);
  if (!spec) return null;
  return reason(spec.costInHighScore, spec.costInCoins, maxHighScore(save), save.totalCoins);
}

function reason(
  needScore: number,
  needCoins: number,
  haveScore: number,
  haveCoins: number,
): LockReason | null {
  const missingScore = needScore > haveScore;
  const missingCoins = needCoins > haveCoins;
  if (!missingScore && !missingCoins) return null;
  return {
    score: missingScore ? needScore : undefined,
    coins: missingCoins ? needCoins : undefined,
  };
}

export function lockMessage(
  dict: Record<string, string>,
  titleKey: string,
  reason: LockReason,
): string {
  const lines = [dict[titleKey] ?? titleKey];
  if (reason.score !== undefined) {
    lines.push((dict.unlock_highScore ?? "To unlock it, achieve a highscore of ##.").replace("##", String(reason.score)));
  }
  if (reason.coins !== undefined) {
    lines.push((dict.unlock_totalCoins ?? "To unlock, reach a total of ## coins.").replace("##", String(reason.coins)));
  }
  return lines.join("\n");
}
