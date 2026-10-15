export type AchievementKind = "kills" | "score" | "coins" | "boss" | "survive";

export interface AchievementDef {
  id: string;
  kind: AchievementKind;
  target: number;
  reward: number;
  descriptionKey: string;
}

export interface AchievementProgress {
  id: string;
  progress: number;
  completed: boolean;
}

export const ACHIEVEMENTS: AchievementDef[] = [
  { id: "kill-10", kind: "kills", target: 10, reward: 50, descriptionKey: "ach_kill_dinos" },
  { id: "kill-20", kind: "kills", target: 20, reward: 100, descriptionKey: "ach_kill_dinos" },
  { id: "kill-50", kind: "kills", target: 50, reward: 250, descriptionKey: "ach_kill_dinos" },
  { id: "coins-100", kind: "coins", target: 100, reward: 50, descriptionKey: "ach_collect_coins" },
  { id: "coins-500", kind: "coins", target: 500, reward: 200, descriptionKey: "ach_collect_coins" },
  { id: "boss-1", kind: "boss", target: 1, reward: 200, descriptionKey: "ach_defeat_boss" },
  { id: "survive-1", kind: "survive", target: 60, reward: 50, descriptionKey: "ach_survive_1min" },
  { id: "survive-3", kind: "survive", target: 180, reward: 150, descriptionKey: "ach_survive_mins" },
  { id: "score-5000", kind: "score", target: 5000, reward: 75, descriptionKey: "ach_reach_score" },
  { id: "score-10000", kind: "score", target: 10000, reward: 150, descriptionKey: "ach_reach_score" },
];

export function freshAchievements(): AchievementProgress[] {
  return ACHIEVEMENTS.map((item) => ({ id: item.id, progress: 0, completed: false }));
}

export function normalizeAchievements(saved: AchievementProgress[] | undefined): AchievementProgress[] {
  const byId = new Map((saved ?? []).map((item) => [item.id, item]));
  return ACHIEVEMENTS.map((item) => {
    const existing = byId.get(item.id);
    return {
      id: item.id,
      progress: existing?.progress ?? 0,
      completed: existing?.completed ?? false,
    };
  });
}

export function achievementText(
  dict: Record<string, string>,
  def: AchievementDef,
): string {
  const raw = dict[def.descriptionKey] ?? def.descriptionKey;
  if (def.kind === "survive") {
    const minutes = def.target / 60;
    if (minutes === 1) return dict.ach_survive_1min ?? raw;
    return (dict.ach_survive_mins ?? raw).replace("##", String(minutes));
  }
  return raw.replace("##", String(def.target));
}
