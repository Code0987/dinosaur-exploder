import { describe, expect, it } from "vitest";
import { createLevel, nextLevel, shouldAdvance } from "./level";
import { emptySave } from "./save";
import { createWorld, idleInput, mulberry32, spawnCoin, spawnEnemyShot, spawnGreen, step } from "./sim";
import { shipLock, specialtyLock, weaponLock } from "./unlocks";

function world() {
  return createWorld({
    mode: "NORMAL",
    ship: 1,
    weapon: 1,
    specialty: "none",
    save: emptySave(),
    rng: mulberry32(7),
  });
}

describe("level curve", () => {
  it("advances after the normal enemy quota and scales the next level", () => {
    const level = createLevel("NORMAL");
    level.defeatedEnemies = 5;
    expect(shouldAdvance(level)).toBe(true);
    nextLevel(level);
    expect(level.currentLevel).toBe(2);
    expect(level.enemiesToDefeat).toBe(10);
    expect(level.enemySpawnRate).toBeCloseTo(0.675);
    expect(level.enemySpeed).toBeCloseTo(1.7);
  });

  it("asks expert mode for two bosses", () => {
    const level = createLevel("EXPERT");
    level.defeatedBosses = 1;
    expect(shouldAdvance(level)).toBe(false);
    level.defeatedBosses = 2;
    expect(shouldAdvance(level)).toBe(true);
  });
});

describe("unlocks", () => {
  it("keeps ship 3 locked until both the score and the coins are met", () => {
    const save = emptySave();
    expect(shipLock(3, save)?.score).toBe(100);
    save.highScores.NORMAL = 100;
    expect(shipLock(3, save)?.coins).toBe(10);
    save.totalCoins = 10;
    expect(shipLock(3, save)).toBeNull();
    expect(shipLock(1, emptySave())).toBeNull();
  });

  it("locks weapon 2 and the tank specialty on a fresh save", () => {
    const save = emptySave();
    expect(weaponLock(2, save)).toEqual({ score: 50, coins: 5 });
    expect(specialtyLock("more_hearts", save)).toEqual({ score: 20, coins: 20 });
    expect(specialtyLock("none", save)).toBeNull();
  });
});

describe("combat", () => {
  it("scores a green dinosaur and levels up after five kills", () => {
    const game = world();
    game.phase = "play";
    for (let kill = 0; kill < 5; kill += 1) {
      spawnGreen(game, "UP");
      const green = game.entities.find((entity) => entity.kind === "green" && !entity.dead);
      if (!green) throw new Error("missing green");
      green.x = game.playerX + 8;
      green.y = game.playerY - 20;
      green.vx = 0;
      green.vy = 0;
      step(game, { ...idleInput(), shootPressed: true });
    }
    expect(game.score).toBe(5);
    expect(game.level.currentLevel).toBe(2);
    expect(game.phase).toBe("banner");
    expect(game.save.highScores.NORMAL).toBe(5);
  });

  it("ignores a second hit during the damage grace period", () => {
    const game = world();
    game.phase = "play";
    spawnEnemyShot(game, game.playerX, game.playerY, 90);
    step(game, idleInput());
    expect(game.lives).toBe(2);
    spawnEnemyShot(game, game.playerX, game.playerY, 90);
    step(game, idleInput());
    expect(game.lives).toBe(2);
    expect(game.damageTimer).toBeGreaterThan(0);
  });

  it("banks coins onto the score, the lifetime total, and bomb progress", () => {
    const game = world();
    spawnCoin(game, "UP");
    const coin = game.entities.find((entity) => entity.kind === "coin");
    if (!coin) throw new Error("missing coin");
    coin.x = game.playerX;
    coin.y = game.playerY;
    step(game, idleInput());
    expect(game.score).toBe(2);
    expect(game.runCoins).toBe(1);
    expect(game.save.totalCoins).toBe(1);
    expect(game.coinBombProgress).toBe(1);
  });

  it("spawns one red boss on level 5 and two in expert mode", () => {
    const game = world();
    game.phase = "play";
    game.level.currentLevel = 5;
    game.enemyAcc = game.level.enemySpawnRate;
    step(game, idleInput());
    expect(game.entities.filter((entity) => entity.kind === "red")).toHaveLength(1);
    expect(game.entities.find((entity) => entity.kind === "red")?.lives).toBe(10);

    const expert = createWorld({
      mode: "EXPERT",
      ship: 1,
      weapon: 1,
      specialty: "none",
      save: emptySave(),
      rng: mulberry32(3),
    });
    expert.phase = "play";
    expert.level.currentLevel = 5;
    expert.enemyAcc = expert.level.enemySpawnRate;
    step(expert, idleInput());
    expect(expert.entities.filter((entity) => entity.kind === "red")).toHaveLength(2);
  });

  it("slows the expert cannon once the weapon overheats", () => {
    const game = createWorld({
      mode: "EXPERT",
      ship: 1,
      weapon: 1,
      specialty: "none",
      save: emptySave(),
      rng: mulberry32(1),
    });
    game.phase = "play";
    const input = { ...idleInput(), shootHeld: true, mouseX: game.playerX, mouseY: game.playerY - 200 };
    for (let tick = 0; tick < 40; tick += 1) step(game, input);
    expect(game.heat).toBeGreaterThanOrEqual(90);
    expect(game.shotsFired).toBeLessThan(40);
    expect(game.shotsFired).toBeGreaterThan(8);
  });
});
