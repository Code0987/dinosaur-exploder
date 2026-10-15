import { ACHIEVEMENTS } from "./achievements";
import {
  ALLY_DISTANCE,
  ALLY_DURATION,
  ALLY_LIFE,
  COINS_PER_BOMB,
  COOL_PER_SECOND,
  DIRECTIONS,
  ENEMY_SHOT_SPEED,
  HEAT_PER_SHOT,
  HEIGHT,
  MAX_HEAT,
  MODES,
  PICKUP_SPEED,
  PLAYER_STEP,
  PROJECTILE_HIT,
  SHIELD_COOLDOWN,
  SHIELD_DURATION,
  SHIP_SIZES,
  SLOW_HEAT,
  SLOW_SHOT_SECONDS,
  TICK,
  WIDTH,
  type Direction,
  type GameModeId,
  type SpecialtyId,
} from "./constants";
import { createLevel, isSingleBossLevel, levelProgress, nextLevel, shouldAdvance, type LevelState } from "./level";
import type { SaveData } from "./save";

export type Sfx = "shoot" | "explode" | "playerHit" | "coin" | "heart";

export type Phase = "countdown" | "play" | "banner" | "dying" | "over";

export type Kind =
  | "projectile"
  | "enemyProjectile"
  | "green"
  | "red"
  | "orange"
  | "coin"
  | "heart"
  | "asteroid"
  | "allyDrop"
  | "ally"
  | "explosion"
  | "trail"
  | "flame";

export interface Entity {
  id: number;
  kind: Kind;
  x: number;
  y: number;
  w: number;
  h: number;
  drawW: number;
  drawH: number;
  vx: number;
  vy: number;
  perTick: boolean;
  rotation: number;
  lives: number;
  maxLives: number;
  dir: Direction;
  paused: boolean;
  age: number;
  ttl: number;
  opacity: number;
  shotTime: number;
  speed: number;
  scale: number;
  ship: number;
  weapon: number;
  dead: boolean;
}

export interface Input {
  up: boolean;
  down: boolean;
  left: boolean;
  right: boolean;
  shootPressed: boolean;
  shootHeld: boolean;
  bombPressed: boolean;
  shieldPressed: boolean;
  mouseX: number;
  mouseY: number;
}

export interface Rng {
  int(min: number, max: number): number;
  float(min: number, max: number): number;
}

export interface GameOverStats {
  finalScore: number;
  highScore: number;
  levelReached: number;
  survivedSeconds: number;
}

export interface Toast {
  text: string;
  time: number;
}

export interface World {
  mode: GameModeId;
  ship: number;
  weapon: number;
  specialty: SpecialtyId;
  level: LevelState;
  phase: Phase;
  countdown: number;
  bannerTime: number;
  dyingTime: number;
  paused: boolean;
  score: number;
  runCoins: number;
  lives: number;
  maxLives: number;
  bombs: number;
  maxBombs: number;
  coinBombProgress: number;
  lastBombLevel: number;
  playerX: number;
  playerY: number;
  playerW: number;
  playerH: number;
  baseW: number;
  baseH: number;
  scale: number;
  rotation: number;
  heat: number;
  sinceShot: number;
  damageTimer: number;
  levelGrace: number;
  blinkTime: number;
  opacity: number;
  visible: boolean;
  shieldActive: boolean;
  shieldTime: number;
  shieldCooldown: number;
  allyId: number | null;
  allyUsed: boolean;
  onFire: boolean;
  emission: number;
  emissionAug: number;
  entities: Entity[];
  nextId: number;
  overlaps: Set<string>;
  enemyAcc: number;
  asteroidAcc: number;
  coinAcc: number;
  enemyPaused: boolean;
  asteroidPaused: boolean;
  sessionTime: number;
  sessionRunning: boolean;
  flash: number;
  scroll: number;
  barWidth: number;
  barTarget: number;
  toasts: Toast[];
  shotsFired: number;
  gameOver: GameOverStats | null;
  save: SaveData;
  rng: Rng;
  onSave?: (save: SaveData) => void;
  onSfx?: (name: Sfx) => void;
  onToast?: (text: string) => void;
}

export function mathRng(): Rng {
  return {
    int: (min, max) => min + Math.floor(Math.random() * (max - min + 1)),
    float: (min, max) => min + Math.random() * (max - min),
  };
}

export function mulberry32(seed: number): Rng {
  let state = seed >>> 0;
  const next = () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    int: (min, max) => min + Math.floor(next() * (max - min + 1)),
    float: (min, max) => min + next() * (max - min),
  };
}

export function idleInput(): Input {
  return {
    up: false,
    down: false,
    left: false,
    right: false,
    shootPressed: false,
    shootHeld: false,
    bombPressed: false,
    shieldPressed: false,
    mouseX: WIDTH / 2,
    mouseY: HEIGHT / 2,
  };
}

export function createWorld(options: {
  mode: GameModeId;
  ship: number;
  weapon: number;
  specialty: SpecialtyId;
  save: SaveData;
  rng?: Rng;
  onSave?: (save: SaveData) => void;
  onSfx?: (name: Sfx) => void;
  onToast?: (text: string) => void;
}): World {
  const tuning = MODES[options.mode];
  const size = SHIP_SIZES[options.ship] ?? SHIP_SIZES[1];
  let maxLives = tuning.startingLives;
  let lives = maxLives;
  let maxBombs = 3;
  let bombs = 3;
  let scale = 1;
  if (options.specialty === "more_hearts") {
    maxLives += 2;
    lives = maxLives;
  } else if (options.specialty === "more_bombs") {
    maxBombs += 5;
    bombs = maxBombs;
  } else if (options.specialty === "smaller_hitbox") {
    scale = 0.5;
  }
  const five = lives === 5;
  const world: World = {
    mode: options.mode,
    ship: options.ship,
    weapon: options.weapon,
    specialty: options.specialty,
    level: createLevel(options.mode),
    phase: "countdown",
    countdown: 3,
    bannerTime: 0,
    dyingTime: 0,
    paused: false,
    score: 0,
    runCoins: 0,
    lives,
    maxLives,
    bombs,
    maxBombs,
    coinBombProgress: 0,
    lastBombLevel: 1,
    playerX: WIDTH / 2 - 45,
    playerY: Math.max(80, HEIGHT - 170 - size.h * scale),
    playerW: size.w * scale,
    playerH: size.h * scale,
    baseW: size.w,
    baseH: size.h,
    scale,
    rotation: 0,
    heat: 0,
    sinceShot: 10,
    damageTimer: 0,
    levelGrace: 0,
    blinkTime: 99,
    opacity: 1,
    visible: true,
    shieldActive: false,
    shieldTime: 0,
    shieldCooldown: 0,
    allyId: null,
    allyUsed: false,
    onFire: false,
    emission: five ? -0.1 : 0,
    emissionAug: five ? 0.1 : 0.2,
    entities: [],
    nextId: 1,
    overlaps: new Set(),
    enemyAcc: 0,
    asteroidAcc: 0,
    coinAcc: 0,
    enemyPaused: false,
    asteroidPaused: false,
    sessionTime: 0,
    sessionRunning: true,
    flash: 0,
    scroll: 0,
    barWidth: 0,
    barTarget: 0,
    toasts: [],
    shotsFired: 0,
    gameOver: null,
    save: options.save,
    rng: options.rng ?? mathRng(),
    onSave: options.onSave,
    onSfx: options.onSfx,
    onToast: options.onToast,
  };
  return world;
}

export function isInvincible(world: World): boolean {
  return world.damageTimer > 0 || world.shieldTime > 0 || world.levelGrace > 0 || world.shieldActive;
}

export function step(world: World, input: Input): void {
  if (world.paused || world.phase === "over") return;

  world.scroll += 50 * TICK;
  decayToasts(world);
  if (world.flash > 0) world.flash = Math.max(0, world.flash - TICK);

  if (world.phase === "dying") {
    world.dyingTime -= TICK;
    ageVisuals(world);
    if (world.dyingTime <= 0) finishGameOver(world);
    return;
  }

  if (world.sessionRunning) world.sessionTime += TICK;
  if (world.phase === "countdown" || world.phase === "play" || world.phase === "banner") {
    tickSurvival(world, TICK);
  }

  if (world.phase === "countdown") {
    updatePlayer(world, input);
    updateEntities(world);
    collisions(world);
    cleanup(world);
    world.countdown -= TICK;
    if (world.countdown <= 0) {
      world.phase = "play";
      world.countdown = 0;
    }
    return;
  }

  if (world.phase === "banner") {
    updatePlayer(world, input);
    updateEntities(world);
    collisions(world);
    cleanup(world);
    world.bannerTime -= TICK;
    if (world.bannerTime <= 0) endBanner(world);
    return;
  }

  updatePlayer(world, input);
  spawners(world);
  updateEntities(world);
  collisions(world);
  cleanup(world);
  animateBar(world);
}

function decayToasts(world: World) {
  for (const toast of world.toasts) toast.time -= TICK;
  world.toasts = world.toasts.filter((toast) => toast.time > 0);
}

function ageVisuals(world: World) {
  for (const entity of world.entities) {
    if (entity.kind === "explosion" || entity.kind === "trail" || entity.kind === "flame") {
      entity.age += TICK;
      if (entity.ttl > 0 && entity.age >= entity.ttl) entity.dead = true;
      if (entity.kind === "trail") entity.opacity = Math.max(0, 1 - entity.age / entity.ttl);
    }
  }
  cleanup(world);
}

function tickSurvival(world: World, dt: number) {
  let changed = false;
  for (const def of ACHIEVEMENTS) {
    if (def.kind !== "survive") continue;
    const progress = progressOf(world, def.id);
    if (progress.completed) continue;
    progress.progress += dt;
    if (progress.progress >= def.target) {
      progress.completed = true;
      changed = true;
      pushToast(world, def.id);
    }
  }
  if (changed) world.onSave?.(world.save);
}

function updatePlayer(world: World, input: Input) {
  if (world.mode === "EXPERT") {
    const centerX = world.playerX + world.playerW / 2;
    const centerY = world.playerY + world.playerH / 2;
    const angle = (Math.atan2(input.mouseY - centerY, input.mouseX - centerX) * 180) / Math.PI;
    world.rotation = angle + 90;
    const ally = allyEntity(world);
    if (ally) ally.rotation = world.rotation;
  } else {
    world.rotation = 0;
  }

  let dx = 0;
  let dy = 0;
  if (input.up && world.playerY >= 0) dy -= PLAYER_STEP;
  if (input.down && world.playerY < HEIGHT - world.playerH) dy += PLAYER_STEP;
  if (input.left && world.playerX >= 0) dx -= PLAYER_STEP;
  if (input.right && world.playerX < WIDTH - world.playerW) dx += PLAYER_STEP;
  if (dx !== 0 || dy !== 0) {
    world.playerX += dx;
    world.playerY += dy;
    const ally = allyEntity(world);
    if (ally) {
      ally.x += dx;
      ally.y += dy;
    }
    spawnTrail(world);
  }

  world.sinceShot += TICK;
  world.heat = Math.max(0, world.heat - COOL_PER_SECOND * TICK);
  const wantShot = input.shootPressed || (world.mode === "EXPERT" && input.shootHeld);
  if (wantShot) tryShoot(world);

  if (input.bombPressed) useBomb(world);
  if (input.shieldPressed) activateShield(world);
  tickShield(world);
  tickInvulnerability(world);
  if (world.onFire) spawnFlames(world);

  const ally = allyEntity(world);
  if (ally) {
    ally.age += TICK;
    if (ally.age >= ALLY_DURATION) removeAlly(world);
  }
}

function tickInvulnerability(world: World) {
  if (world.damageTimer > 0) world.damageTimer = Math.max(0, world.damageTimer - TICK);
  if (world.levelGrace > 0) world.levelGrace = Math.max(0, world.levelGrace - TICK);
  if (isInvincible(world)) {
    world.blinkTime += TICK;
    if (world.blinkTime < 1.5) {
      const cycle = Math.floor(world.blinkTime / 0.1);
      world.opacity = cycle % 2 === 0 ? 0.4 : 1;
    } else {
      world.opacity = 1;
    }
  } else {
    world.opacity = 1;
    world.blinkTime = 99;
  }
}

function beginInvulnerability(world: World) {
  world.blinkTime = 0;
}

function tickShield(world: World) {
  if (world.shieldActive) {
    world.shieldTime -= TICK;
    if (world.shieldTime <= 0) {
      world.shieldActive = false;
      world.shieldTime = 0;
      world.shieldCooldown = SHIELD_COOLDOWN;
    }
  } else if (world.shieldCooldown > 0) {
    world.shieldCooldown = Math.max(0, world.shieldCooldown - TICK);
  }
}

function activateShield(world: World) {
  if (world.shieldActive || world.shieldCooldown > 0) return;
  world.shieldActive = true;
  world.shieldTime = SHIELD_DURATION;
  beginInvulnerability(world);
}

function tryShoot(world: World) {
  if (world.heat >= SLOW_HEAT && world.sinceShot < SLOW_SHOT_SECONDS) return;
  fireProjectile(world, world.playerX, world.playerY, world.playerW, world.playerH, world.rotation, world.ship, world.weapon);
  const ally = allyEntity(world);
  if (ally) {
    fireProjectile(world, ally.x, ally.y, ally.w, ally.h, world.rotation, 1, 1, true);
  }
  world.heat = Math.min(MAX_HEAT, world.heat + HEAT_PER_SHOT);
  world.sinceShot = 0;
  world.shotsFired += 1;
  world.onSfx?.("shoot");
}

function fireProjectile(
  world: World,
  x: number,
  y: number,
  w: number,
  h: number,
  rotation: number,
  ship: number,
  weapon: number,
  allyShot = false,
) {
  const speed = 600 * (allyShot ? world.weapon : weapon);
  const direction = rotation - 90;
  const dir = fromAngle(direction);
  const imageW = 60;
  add(world, {
    kind: "projectile",
    x: x + w / 2 - imageW / 2 + 3,
    y: y + h / 2 - 25,
    w: PROJECTILE_HIT,
    h: PROJECTILE_HIT,
    drawW: 60,
    drawH: 35,
    vx: dir.x * speed,
    vy: dir.y * speed,
    perTick: false,
    rotation: direction,
    ship: allyShot ? 1 : ship,
    weapon: allyShot ? 1 : weapon,
  });
}

function useBomb(world: World) {
  if (world.bombs <= 0) return;
  world.bombs -= 1;
  for (let i = -5; i <= 5; i += 1) {
    const direction = world.rotation - 90 + i * 10;
    const dir = fromAngle(direction);
    const speed = 600 * world.weapon;
    add(world, {
      kind: "projectile",
      x: world.playerX + world.playerW / 2 - 30 + 3,
      y: world.playerY + world.playerH / 2 - world.baseH / 2,
      w: PROJECTILE_HIT,
      h: PROJECTILE_HIT,
      drawW: 60,
      drawH: 35,
      vx: dir.x * speed,
      vy: dir.y * speed,
      perTick: false,
      rotation: direction,
      ship: world.ship,
      weapon: world.weapon,
    });
  }
  world.onSfx?.("shoot");
}

function spawners(world: World) {
  if (!world.enemyPaused) {
    world.enemyAcc += TICK;
    if (world.enemyAcc >= world.level.enemySpawnRate) {
      world.enemyAcc = 0;
      const level = world.level.currentLevel;
      if (level % 10 === 0) {
        spawnBoss(world, "orange");
        world.enemyPaused = true;
      } else if (level % 5 === 0) {
        spawnBoss(world, "red");
        world.enemyPaused = true;
      } else if (world.rng.int(0, 2) < 2) {
        spawnGreen(world, modeDirection(world));
      }
    }
  }

  if (!world.asteroidPaused) {
    world.asteroidAcc += TICK;
    if (world.asteroidAcc >= world.level.asteroidsSpawnRate) {
      world.asteroidAcc = 0;
      if (world.level.currentLevel % 10 !== 0) spawnAsteroid(world);
    }
  }

  world.coinAcc += TICK;
  if (world.coinAcc >= 1) {
    world.coinAcc = 0;
    if (world.rng.int(0, 100) < 10) spawnCoin(world, modeDirection(world));
  }
}

function modeDirection(world: World): Direction {
  if (world.mode !== "EXPERT") return "UP";
  return DIRECTIONS[world.rng.int(0, DIRECTIONS.length - 1)];
}

export function spawnGreen(world: World, dir: Direction = "UP") {
  const drawW = 80;
  const drawH = 60;
  const spot = edgeSpot(world, dir, drawW, drawH);
  const speed = world.level.enemySpeed;
  const travel = greenTravel(dir, speed);
  add(world, {
    kind: "green",
    x: spot.x,
    y: spot.y,
    w: 65,
    h: 55,
    drawW,
    drawH,
    vx: travel.vx,
    vy: travel.vy,
    perTick: true,
    rotation: travel.rotation,
    dir,
    lives: 1,
    maxLives: 1,
    speed,
    shotTime: 0,
  });
}

function spawnBoss(world: World, kind: "red" | "orange") {
  const count = world.mode === "EXPERT" ? 2 : 1;
  let first = modeDirection(world);
  spawnOneBoss(world, kind, first);
  if (count > 1) {
    let second = modeDirection(world);
    let guard = 0;
    while (second === first && guard < 8) {
      second = DIRECTIONS[world.rng.int(0, 3)];
      guard += 1;
    }
    spawnOneBoss(world, kind, second);
  }
}

function spawnOneBoss(world: World, kind: "red" | "orange", dir: Direction) {
  const drawW = 100;
  const drawH = kind === "red" ? 80 : 150;
  const spot = bossSpot(dir);
  const lives = kind === "red" ? world.level.currentLevel * 2 : world.level.currentLevel * 3;
  const speed = kind === "red" ? world.level.enemySpeed : world.level.enemySpeed / 2;
  const travel = kind === "red" ? redTravel(dir, speed) : { vx: 0, vy: 0, rotation: 0 };
  add(world, {
    kind,
    x: spot.x,
    y: spot.y,
    w: 65,
    h: 55,
    drawW,
    drawH,
    vx: travel.vx,
    vy: travel.vy,
    perTick: true,
    rotation: travel.rotation,
    dir,
    lives,
    maxLives: lives,
    speed,
    shotTime: 0,
  });
}

function spawnAsteroid(world: World) {
  const tier = world.rng.int(0, 2);
  const draw = [80, 120, 160][tier];
  const hit = [60, 100, 140][tier];
  const lives = tier + 1;
  const vertical = world.level.asteroidsVerticalSpeed * world.rng.int(1, 10);
  const horizontal = world.level.asteroidsHorizontalSpeed * world.rng.int(-3, 3);
  add(world, {
    kind: "asteroid",
    x: world.rng.int(30, WIDTH - 30),
    y: -90,
    w: hit,
    h: hit,
    drawW: draw,
    drawH: draw,
    vx: horizontal,
    vy: vertical,
    perTick: true,
    lives,
    maxLives: lives,
    speed: vertical,
    ship: tier,
  });
}

export function spawnCoin(world: World, dir: Direction) {
  const spot = pickupSpot(world, dir);
  const travel = pickupTravel(dir);
  add(world, {
    kind: "coin",
    x: spot.x,
    y: spot.y,
    w: 40,
    h: 40,
    drawW: 40,
    drawH: 40,
    vx: travel.vx,
    vy: travel.vy,
    perTick: false,
    dir,
  });
}

function spawnHeart(world: World, x: number, y: number, dir: Direction) {
  const travel = pickupTravel(dir);
  add(world, {
    kind: "heart",
    x,
    y,
    w: 22,
    h: 22,
    drawW: 22,
    drawH: 22,
    vx: travel.vx,
    vy: travel.vy,
    perTick: false,
    dir,
  });
}

function spawnAllyDrop(world: World, x: number, y: number, dir: Direction) {
  const travel = pickupTravel(dir);
  add(world, {
    kind: "allyDrop",
    x,
    y,
    w: 50,
    h: 50,
    drawW: 50,
    drawH: 50,
    vx: travel.vx,
    vy: travel.vy,
    perTick: false,
    dir,
  });
}

export function spawnEnemyShot(world: World, x: number, y: number, rotation: number) {
  const dir = fromAngle(rotation);
  add(world, {
    kind: "enemyProjectile",
    x,
    y,
    w: 20,
    h: 20,
    drawW: 30,
    drawH: 17,
    vx: dir.x * ENEMY_SHOT_SPEED,
    vy: dir.y * ENEMY_SHOT_SPEED,
    perTick: false,
    rotation,
  });
}

function updateEntities(world: World) {
  for (const entity of world.entities) {
    if (entity.dead) continue;
    if (entity.kind === "explosion" || entity.kind === "trail" || entity.kind === "flame") {
      entity.age += TICK;
      if (entity.age >= entity.ttl) entity.dead = true;
      if (entity.kind === "trail") entity.opacity = Math.max(0, 1 - entity.age / entity.ttl);
      if (entity.kind === "flame") {
        entity.x += entity.vx * TICK;
        entity.y += entity.vy * TICK;
        entity.opacity = Math.max(0, 1 - entity.age / entity.ttl);
      }
      continue;
    }
    if (entity.paused) continue;
    if (entity.kind === "orange") updateOrange(world, entity);
    else if (entity.kind === "red") updateRed(world, entity);
    else if (entity.kind === "green") updateGreen(world, entity);
    else move(entity);

    if (entity.kind !== "red" && entity.kind !== "orange" && entity.kind !== "ally") {
      if (outside(entity)) entity.dead = true;
    }
  }
}

function move(entity: Entity) {
  const scale = entity.perTick ? 1 : TICK;
  entity.x += entity.vx * scale;
  entity.y += entity.vy * scale;
}

function updateGreen(world: World, entity: Entity) {
  move(entity);
  entity.shotTime += TICK;
  if (entity.shotTime >= 1.5 && entity.y > 0) {
    entity.shotTime = 0;
    const center = hitCenter(entity);
    spawnEnemyShot(world, center.x, center.y, entity.rotation + 90);
    world.onSfx?.("shoot");
  }
}

function updateRed(world: World, entity: Entity) {
  if (entity.dir === "LEFT" || entity.dir === "RIGHT") {
    if (entity.y < 0 && entity.vy < 0) entity.vy *= -1;
    if (entity.y > HEIGHT - entity.w - 40 && entity.vy > 0) entity.vy *= -1;
  } else {
    if (entity.x < 0 && entity.vx < 0) entity.vx *= -1;
    if (entity.x > WIDTH - entity.w - 40 && entity.vx > 0) entity.vx *= -1;
  }
  move(entity);
  entity.shotTime += TICK;
  if (entity.shotTime >= world.level.enemySpawnRate * 1.3) {
    entity.shotTime = 0;
    const center = hitCenter(entity);
    const spread = world.rng.int(-45, 45);
    spawnEnemyShot(world, center.x + 50 + 3, center.y, entity.rotation + 90 + spread);
    world.onSfx?.("shoot");
  }
}

function updateOrange(world: World, entity: Entity) {
  const px = world.playerX;
  const py = world.playerY;
  if (entity.x < px) moveOrange(entity, entity.speed, 0);
  if (entity.x > px) moveOrange(entity, -entity.speed, 0);
  if (entity.y < py) moveOrange(entity, 0, entity.speed);
  if (entity.y > py) moveOrange(entity, 0, -entity.speed);
  rotateOrange(entity, px, py);
}

function moveOrange(entity: Entity, dx: number, dy: number) {
  if (dy < 0 && entity.y < 0) return;
  if (dy > 0 && entity.y >= HEIGHT - entity.h) return;
  if (dx > 0 && entity.x >= WIDTH - entity.w) return;
  if (dx < 0 && entity.x < 0) return;
  entity.x += dx;
  entity.y += dy;
}

function rotateOrange(entity: Entity, px: number, py: number) {
  const opposite = Math.abs(entity.x - px);
  const adjacent = Math.abs(entity.y - py);
  let rotation = adjacent < 0.001 ? 90 : (Math.atan(opposite / adjacent) * 180) / Math.PI;
  if (entity.x < px && entity.y > py) entity.rotation = rotation - 180;
  else if (entity.x > px && entity.y > py) entity.rotation = 90 - rotation + 90;
  else if (entity.x > px && entity.y < py) entity.rotation = rotation;
  else if (entity.x < px && entity.y < py) entity.rotation = 90 - rotation - 90;
}

function collisions(world: World) {
  const now = new Set<string>();
  const projectiles = alive(world, "projectile");
  const shots = alive(world, "enemyProjectile");
  const greens = alive(world, "green");
  const reds = alive(world, "red");
  const oranges = alive(world, "orange");
  const asteroids = alive(world, "asteroid");

  for (const shot of projectiles) {
    if (shot.dead) continue;
    for (const enemyShot of shots) {
      if (enemyShot.dead || shot.dead) continue;
      if (!hit(shot, enemyShot)) continue;
      shot.dead = true;
      enemyShot.dead = true;
    }
    if (shot.dead) continue;
    for (const green of greens) {
      if (green.dead || shot.dead) continue;
      if (!hit(shot, green)) continue;
      shot.dead = true;
      killGreen(world, green, true);
    }
    if (shot.dead) continue;
    for (const red of reds) {
      if (red.dead || shot.dead) continue;
      if (!hit(shot, red)) continue;
      shot.dead = true;
      damageBoss(world, red, "red");
    }
    if (shot.dead) continue;
    for (const orange of oranges) {
      if (orange.dead || shot.dead) continue;
      if (!hit(shot, orange)) continue;
      shot.dead = true;
      damageBoss(world, orange, "orange");
    }
    if (shot.dead) continue;
    for (const asteroid of asteroids) {
      if (asteroid.dead || shot.dead) continue;
      if (!hit(shot, asteroid)) continue;
      shot.dead = true;
      explode(world, shot.x, shot.y);
      asteroid.lives -= 1;
      if (asteroid.lives <= 0) asteroid.dead = true;
    }
  }

  const player = playerBox(world);
  touchBegin(world, now, "player", player, shots, (shot) => {
    shot.dead = true;
    damagePlayer(world);
  });
  touchBegin(world, now, "player", player, greens, (green) => {
    green.dead = true;
    explode(world, green.x - 25, green.y - 30);
    damagePlayer(world);
  });
  touchBegin(world, now, "player", player, reds, () => damagePlayer(world));
  touchBegin(world, now, "player", player, oranges, () => damagePlayer(world));
  touchBegin(world, now, "player", player, asteroids, (asteroid) => {
    asteroid.dead = true;
    damagePlayer(world);
  });
  touchBegin(world, now, "player", player, alive(world, "coin"), (coin) => {
    coin.dead = true;
    collectCoin(world);
  });
  touchBegin(world, now, "player", player, alive(world, "heart"), (heart) => {
    heart.dead = true;
    healPlayer(world);
  });
  touchBegin(world, now, "player", player, alive(world, "allyDrop"), (drop) => {
    drop.dead = true;
    collectAlly(world);
  });

  const ally = allyEntity(world);
  if (ally && !ally.dead) {
    touchBegin(world, now, "ally", ally, shots, (shot) => {
      shot.dead = true;
      damageAlly(world);
    });
    touchBegin(world, now, "ally", ally, greens, (green) => {
      green.dead = true;
      damageAlly(world);
    });
    touchBegin(world, now, "ally", ally, reds, () => damageAlly(world));
    touchBegin(world, now, "ally", ally, oranges, () => damageAlly(world));
    touchBegin(world, now, "ally", ally, asteroids, (asteroid) => {
      asteroid.dead = true;
      damageAlly(world);
    });
  }

  world.overlaps = now;
}

function touchBegin(
  world: World,
  now: Set<string>,
  owner: string,
  box: { x: number; y: number; w: number; h: number },
  others: Entity[],
  onBegin: (entity: Entity) => void,
) {
  for (const entity of others) {
    if (entity.dead) continue;
    if (!rectsOverlap(box, entity)) continue;
    const key = `${owner}:${entity.id}`;
    now.add(key);
    if (!world.overlaps.has(key)) onBegin(entity);
  }
}

function killGreen(world: World, green: Entity, scored: boolean) {
  green.dead = true;
  explode(world, green.x - 25, green.y - 30);
  world.onSfx?.("explode");
  if (world.rng.int(0, 100) < 5) spawnHeart(world, green.x, green.y, green.dir);
  if (!world.allyUsed && world.rng.int(0, 100) < 1) spawnAllyDrop(world, green.x, green.y, green.dir);
  if (!scored) return;
  addScore(world, 1);
  world.level.defeatedEnemies += 1;
  onDinosaurKilled(world);
  refreshBar(world);
  if (shouldAdvance(world.level)) beginLevelUp(world);
}

function damageBoss(world: World, boss: Entity, kind: "red" | "orange") {
  explode(world, boss.x - 25, boss.y - 30);
  world.onSfx?.("explode");
  boss.lives -= 1;
  if (boss.lives > 0) return;
  boss.dead = true;
  spawnHeart(world, boss.x, boss.y, kind === "red" ? boss.dir : "UP");
  const coins = kind === "red" ? world.level.currentLevel : world.level.currentLevel * 2;
  for (let i = 0; i < coins; i += 1) {
    const dir = kind === "red" ? boss.dir : "UP";
    const travel = pickupTravel(dir);
    add(world, {
      kind: "coin",
      x: boss.x + world.rng.int(-25, 25),
      y: boss.y + world.rng.int(-25, 25),
      w: 40,
      h: 40,
      drawW: 40,
      drawH: 40,
      vx: travel.vx,
      vy: travel.vy,
      perTick: false,
      dir,
    });
  }
  addScore(world, Math.floor(world.level.currentLevel / world.level.bossesToDefeat));
  world.level.defeatedBosses += 1;
  onBossDefeated(world);
  refreshBar(world);
  if (shouldAdvance(world.level)) beginLevelUp(world);
}

function damagePlayer(world: World) {
  if (isInvincible(world) || world.phase === "dying" || world.gameOver) return;
  world.lives -= 1;
  world.damageTimer = MODES[world.mode].grace;
  beginInvulnerability(world);
  world.flash = 0.5;
  world.emission += world.emissionAug;
  world.onFire = world.emission > 0.01;
  world.onSfx?.("playerHit");
  if (world.lives <= 0) {
    world.lives = 0;
    world.phase = "dying";
    world.dyingTime = 0.8;
    world.visible = false;
    world.sessionRunning = false;
    world.enemyPaused = true;
    world.asteroidPaused = true;
    for (const entity of world.entities) {
      if (entity.kind === "green") entity.paused = true;
    }
    explode(world, world.playerX + world.playerW / 2 - 64, world.playerY + world.playerH / 2 - 64);
    world.onSfx?.("explode");
  }
}

function healPlayer(world: World) {
  world.lives = Math.min(world.maxLives, world.lives + 1);
  world.emission -= world.emissionAug;
  if (world.lives >= 3) world.onFire = false;
  world.onSfx?.("heart");
}

function collectCoin(world: World) {
  world.runCoins += 1;
  world.save.totalCoins += 1;
  addScore(world, 2);
  world.coinBombProgress += 1;
  if (world.coinBombProgress >= COINS_PER_BOMB) {
    world.coinBombProgress = 0;
    world.bombs = Math.min(world.maxBombs, world.bombs + 1);
  }
  onCoins(world);
  world.onSfx?.("coin");
  world.onSave?.(world.save);
}

function collectAlly(world: World) {
  if (allyEntity(world)) return;
  const ally = add(world, {
    kind: "ally",
    x: world.playerX + ALLY_DISTANCE,
    y: world.playerY,
    w: 80,
    h: 80,
    drawW: 80,
    drawH: 80,
    lives: ALLY_LIFE,
    maxLives: ALLY_LIFE,
    rotation: world.rotation,
    ttl: ALLY_DURATION,
  });
  world.allyId = ally.id;
  world.allyUsed = true;
}

function damageAlly(world: World) {
  const ally = allyEntity(world);
  if (!ally) return;
  ally.lives -= 1;
  if (ally.lives <= 0) removeAlly(world);
}

function removeAlly(world: World) {
  const ally = allyEntity(world);
  if (ally) ally.dead = true;
  world.allyId = null;
}

function addScore(world: World, amount: number) {
  world.score += amount;
  const best = world.save.highScores[world.mode];
  if (world.score > best) {
    world.save.highScores[world.mode] = world.score;
    world.onSave?.(world.save);
  }
  onScore(world);
}

function beginLevelUp(world: World) {
  if (world.phase === "banner" || world.phase === "dying") return;
  nextLevel(world.level);
  if (world.level.currentLevel > world.lastBombLevel) {
    world.bombs = Math.min(world.maxBombs, world.bombs + 1);
    world.lastBombLevel = world.level.currentLevel;
  }
  world.phase = "banner";
  world.bannerTime = 2;
  world.enemyPaused = true;
  world.asteroidPaused = true;
  world.sessionRunning = false;
  for (const entity of world.entities) {
    if (entity.kind === "green") entity.paused = true;
  }
  world.barTarget = 0;
}

function endBanner(world: World) {
  world.phase = "play";
  world.enemyPaused = false;
  world.asteroidPaused = false;
  world.sessionRunning = true;
  for (const entity of world.entities) {
    if (entity.kind === "green") entity.paused = false;
  }
  world.levelGrace = 3;
  beginInvulnerability(world);
  refreshBar(world);
}

function refreshBar(world: World) {
  world.barTarget = Math.min(1, levelProgress(world.level)) * 99;
}

function animateBar(world: World) {
  const delta = world.barTarget - world.barWidth;
  world.barWidth += delta * 0.2;
  if (Math.abs(delta) < 0.4) world.barWidth = world.barTarget;
}

function finishGameOver(world: World) {
  world.phase = "over";
  world.gameOver = {
    finalScore: world.score,
    highScore: world.save.highScores[world.mode],
    levelReached: world.level.currentLevel,
    survivedSeconds: Math.floor(world.sessionTime),
  };
  world.onSave?.(world.save);
}

function onDinosaurKilled(world: World) {
  award(world, "kills", (progress) => {
    progress.progress += 1;
    return progress.progress;
  });
}

function onBossDefeated(world: World) {
  award(world, "boss", (progress) => {
    progress.progress = 1;
    return 1;
  });
}

function onCoins(world: World) {
  award(world, "coins", () => world.runCoins);
}

function onScore(world: World) {
  award(world, "score", () => world.score);
}

function award(
  world: World,
  kind: "kills" | "score" | "coins" | "boss",
  read: (progress: { progress: number; completed: boolean }) => number,
) {
  let changed = false;
  for (const def of ACHIEVEMENTS) {
    if (def.kind !== kind) continue;
    const progress = progressOf(world, def.id);
    if (progress.completed) continue;
    const value = read(progress);
    if (kind !== "kills") progress.progress = value;
    if (value >= def.target) {
      progress.completed = true;
      changed = true;
      pushToast(world, def.id);
    } else if (kind === "kills") {
      changed = true;
    }
  }
  if (changed) world.onSave?.(world.save);
}

function pushToast(world: World, id: string) {
  world.toasts.push({ text: id, time: 3.2 });
  world.onToast?.(id);
}

function progressOf(world: World, id: string) {
  const found = world.save.achievements.find((item) => item.id === id);
  if (found) return found;
  const created = { id, progress: 0, completed: false };
  world.save.achievements.push(created);
  return created;
}

function explode(world: World, x: number, y: number) {
  add(world, {
    kind: "explosion",
    x,
    y,
    w: 128,
    h: 128,
    drawW: 128,
    drawH: 128,
    ttl: 0.4,
  });
}

function spawnTrail(world: World) {
  add(world, {
    kind: "trail",
    x: world.playerX,
    y: world.playerY,
    w: world.playerW,
    h: world.playerH,
    drawW: world.playerW,
    drawH: world.playerH,
    rotation: world.rotation,
    scale: world.scale,
    ship: world.ship,
    ttl: 0.15,
    opacity: 1,
  });
}

function spawnFlames(world: World) {
  const count = Math.max(1, Math.round(world.emission * 4));
  for (let i = 0; i < count; i += 1) {
    add(world, {
      kind: "flame",
      x: world.playerX + world.rng.float(0, world.playerW),
      y: world.playerY + world.rng.float(0, world.playerH),
      w: 6,
      h: 6,
      drawW: 8,
      drawH: 8,
      vx: world.rng.float(-20, 20),
      vy: world.rng.float(-30, 10),
      ttl: world.rng.float(0.1, 0.45),
      opacity: 1,
    });
  }
}

function cleanup(world: World) {
  world.entities = world.entities.filter((entity) => !entity.dead);
  if (world.allyId !== null && !world.entities.some((entity) => entity.id === world.allyId)) {
    world.allyId = null;
  }
}

function add(world: World, partial: Partial<Entity> & { kind: Kind }): Entity {
  const entity: Entity = {
    id: world.nextId++,
    kind: partial.kind,
    x: partial.x ?? 0,
    y: partial.y ?? 0,
    w: partial.w ?? partial.drawW ?? 10,
    h: partial.h ?? partial.drawH ?? 10,
    drawW: partial.drawW ?? partial.w ?? 10,
    drawH: partial.drawH ?? partial.h ?? 10,
    vx: partial.vx ?? 0,
    vy: partial.vy ?? 0,
    perTick: partial.perTick ?? false,
    rotation: partial.rotation ?? 0,
    lives: partial.lives ?? 1,
    maxLives: partial.maxLives ?? partial.lives ?? 1,
    dir: partial.dir ?? "UP",
    paused: partial.paused ?? false,
    age: 0,
    ttl: partial.ttl ?? 0,
    opacity: partial.opacity ?? 1,
    shotTime: partial.shotTime ?? 0,
    speed: partial.speed ?? 0,
    scale: partial.scale ?? 1,
    ship: partial.ship ?? 1,
    weapon: partial.weapon ?? 1,
    dead: false,
  };
  world.entities.push(entity);
  return entity;
}

function alive(world: World, kind: Kind): Entity[] {
  return world.entities.filter((entity) => entity.kind === kind && !entity.dead);
}

function allyEntity(world: World): Entity | undefined {
  if (world.allyId === null) return undefined;
  return world.entities.find((entity) => entity.id === world.allyId && !entity.dead);
}

function playerBox(world: World) {
  return { x: world.playerX, y: world.playerY, w: world.playerW, h: world.playerH };
}

function hit(a: Entity, b: Entity): boolean {
  return rectsOverlap(a, b);
}

function rectsOverlap(
  a: { x: number; y: number; w: number; h: number },
  b: { x: number; y: number; w: number; h: number },
): boolean {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

function outside(entity: Entity): boolean {
  return entity.x + entity.w < -80 || entity.x > WIDTH + 80 || entity.y + entity.h < -80 || entity.y > HEIGHT + 80;
}

function hitCenter(entity: Entity) {
  return { x: entity.x + entity.w / 2, y: entity.y + entity.h / 2 };
}

function fromAngle(degrees: number) {
  const radians = (degrees * Math.PI) / 180;
  return { x: Math.cos(radians), y: Math.sin(radians) };
}

function greenTravel(dir: Direction, speed: number) {
  switch (dir) {
    case "DOWN":
      return { vx: 0, vy: -speed, rotation: 180 };
    case "LEFT":
      return { vx: speed, vy: 0, rotation: 270 };
    case "RIGHT":
      return { vx: -speed, vy: 0, rotation: 90 };
    default:
      return { vx: 0, vy: speed, rotation: 0 };
  }
}

function redTravel(dir: Direction, speed: number) {
  switch (dir) {
    case "DOWN":
      return { vx: -speed, vy: 0, rotation: 180 };
    case "LEFT":
      return { vx: 0, vy: -speed, rotation: 270 };
    case "RIGHT":
      return { vx: 0, vy: speed, rotation: 90 };
    default:
      return { vx: speed, vy: 0, rotation: 0 };
  }
}

function pickupTravel(dir: Direction) {
  switch (dir) {
    case "DOWN":
      return { vx: 0, vy: -PICKUP_SPEED };
    case "LEFT":
      return { vx: PICKUP_SPEED, vy: 0 };
    case "RIGHT":
      return { vx: -PICKUP_SPEED, vy: 0 };
    default:
      return { vx: 0, vy: PICKUP_SPEED };
  }
}

function edgeSpot(world: World, dir: Direction, drawW: number, drawH: number) {
  switch (dir) {
    case "DOWN":
      return { x: world.rng.int(0, WIDTH - drawW), y: HEIGHT - 30 };
    case "LEFT":
      return { x: -50, y: world.rng.int(0, HEIGHT - drawH) };
    case "RIGHT":
      return { x: WIDTH - 40, y: world.rng.int(0, HEIGHT - drawH) };
    default:
      return { x: world.rng.int(0, WIDTH - drawW), y: -50 };
  }
}

function pickupSpot(world: World, dir: Direction) {
  switch (dir) {
    case "DOWN":
      return { x: world.rng.int(0, WIDTH - 80), y: HEIGHT - 80 };
    case "LEFT":
      return { x: 0, y: world.rng.int(0, HEIGHT - 80) };
    case "RIGHT":
      return { x: WIDTH - 80, y: world.rng.int(0, HEIGHT - 80) };
    default:
      return { x: world.rng.int(0, WIDTH - 80), y: 0 };
  }
}

function bossSpot(dir: Direction) {
  switch (dir) {
    case "DOWN":
      return { x: WIDTH / 2 - 45, y: HEIGHT - 110 };
    case "LEFT":
      return { x: 50, y: HEIGHT / 2 - 45 };
    case "RIGHT":
      return { x: WIDTH - 110, y: HEIGHT / 2 - 45 };
    default:
      return { x: WIDTH / 2 - 45, y: 50 };
  }
}

export function formatSurvived(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return `${minutes}m ${String(rest).padStart(2, "0")}s`;
}

export function countdownLabel(world: World): number {
  return Math.max(1, Math.ceil(world.countdown));
}

export function showProgressBar(world: World): boolean {
  return !isSingleBossLevel(world.level);
}
