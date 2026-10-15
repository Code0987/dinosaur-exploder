import { projectileSource, shipSource, type Art } from "./assets";
import { HEIGHT, WIDTH } from "./constants";
import { achievementText, ACHIEVEMENTS } from "./achievements";
import { countdownLabel, isInvincible, showProgressBar, type Entity, type World } from "./sim";

export function draw(ctx: CanvasRenderingContext2D, world: World, art: Art, dict: Record<string, string>) {
  ctx.clearRect(0, 0, WIDTH, HEIGHT);
  drawBackground(ctx, world, art);
  for (const entity of world.entities) {
    if (entity.kind === "trail") drawTrail(ctx, entity, art);
  }
  for (const entity of world.entities) {
    if (entity.kind !== "trail" && entity.kind !== "explosion" && entity.kind !== "flame") {
      drawEntity(ctx, entity, art);
    }
  }
  drawPlayer(ctx, world, art);
  for (const entity of world.entities) {
    if (entity.kind === "flame") drawFlame(ctx, entity);
    if (entity.kind === "explosion") drawExplosion(ctx, entity, art);
  }
  drawBossBars(ctx, world);
  drawHud(ctx, world, art, dict);
  if (world.flash > 0) {
    ctx.fillStyle = `rgba(190, 10, 15, ${0.5 * Math.min(1, world.flash / 0.5)})`;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
  }
  if (world.phase === "countdown") drawCenterText(ctx, String(countdownLabel(world)), 96, "#ffffff");
  if (world.phase === "banner") {
    drawCenterText(ctx, `${(dict.level ?? "LEVEL").toUpperCase()} ${world.level.currentLevel}`, 28, "#ffffff");
  }
}

function drawBackground(ctx: CanvasRenderingContext2D, world: World, art: Art) {
  const travel = Math.max(0, art.backgroundHeight - HEIGHT);
  const offset = smoothPingPong(world.scroll, travel);
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
  ctx.drawImage(art.background, 0, -offset, art.backgroundWidth, art.backgroundHeight);
}

function smoothPingPong(distance: number, travel: number): number {
  if (travel <= 1) return 0;
  const span = travel * 2;
  const wrapped = ((distance % span) + span) % span;
  return (travel * (1 - Math.cos((Math.PI * wrapped) / travel))) / 2;
}

function drawPlayer(ctx: CanvasRenderingContext2D, world: World, art: Art) {
  if (!world.visible) return;
  ctx.save();
  ctx.globalAlpha = world.opacity;
  const cx = world.playerX + world.playerW / 2;
  const cy = world.playerY + world.playerH / 2;
  ctx.translate(cx, cy);
  ctx.rotate((world.rotation * Math.PI) / 180);
  ctx.drawImage(shipSource(art, world.ship), -world.playerW / 2, -world.playerH / 2, world.playerW, world.playerH);
  if (world.shieldActive) {
    ctx.beginPath();
    ctx.arc(0, 0, Math.max(world.playerW, world.playerH) / 2 + 10, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(51, 153, 255, 0.15)";
    ctx.strokeStyle = "rgba(51, 204, 255, 0.9)";
    ctx.lineWidth = 4;
    ctx.fill();
    ctx.stroke();
  }
  ctx.restore();
  if (isInvincible(world) && !world.shieldActive && world.opacity === 1) {
    ctx.globalAlpha = 1;
  }
}

function drawTrail(ctx: CanvasRenderingContext2D, entity: Entity, art: Art) {
  ctx.save();
  ctx.globalAlpha = entity.opacity * 0.45;
  const cx = entity.x + entity.w / 2;
  const cy = entity.y + entity.h / 2;
  ctx.translate(cx, cy);
  ctx.rotate((entity.rotation * Math.PI) / 180);
  ctx.drawImage(shipSource(art, entity.ship), -entity.w / 2, -entity.h / 2, entity.w, entity.h);
  ctx.restore();
}

function drawEntity(ctx: CanvasRenderingContext2D, entity: Entity, art: Art) {
  const image = spriteFor(entity, art);
  if (!image) return;
  ctx.save();
  ctx.translate(entity.x + entity.drawW / 2, entity.y + entity.drawH / 2);
  ctx.rotate((entity.rotation * Math.PI) / 180);
  ctx.drawImage(image, -entity.drawW / 2, -entity.drawH / 2, entity.drawW, entity.drawH);
  ctx.restore();
}

function spriteFor(entity: Entity, art: Art): CanvasImageSource | null {
  switch (entity.kind) {
    case "green":
      return art.green;
    case "red":
      return art.red;
    case "orange":
      return art.orange;
    case "coin":
      return art.coin;
    case "heart":
      return art.heart;
    case "asteroid":
      return art.asteroids[entity.ship] ?? art.asteroids[0];
    case "ally":
      return art.ally;
    case "allyDrop":
      return art.allyDrop;
    case "enemyProjectile":
      return art.enemyShot;
    case "projectile":
      return projectileSource(art, entity.ship, entity.weapon);
    default:
      return null;
  }
}

function drawExplosion(ctx: CanvasRenderingContext2D, entity: Entity, art: Art) {
  const frame = Math.min(art.explosions.length - 1, Math.floor((entity.age / 0.4) * art.explosions.length));
  const image = art.explosions[frame];
  if (image) ctx.drawImage(image, entity.x, entity.y, 96, 96);
}

function drawFlame(ctx: CanvasRenderingContext2D, entity: Entity) {
  ctx.globalAlpha = entity.opacity;
  ctx.fillStyle = entity.age < entity.ttl / 2 ? "#ff8a00" : "#cc2200";
  ctx.beginPath();
  ctx.arc(entity.x, entity.y, 4 + (1 - entity.opacity) * 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
}

function drawBossBars(ctx: CanvasRenderingContext2D, world: World) {
  const bosses = world.entities.filter((entity) => entity.kind === "red" || entity.kind === "orange");
  bosses.forEach((boss, index) => {
    const x = WIDTH - 215;
    const y = 15 + index * 35;
    ctx.fillStyle = "#3a0000";
    ctx.fillRect(x, y, 200, 25);
    const ratio = boss.maxLives > 0 ? Math.max(0, boss.lives / boss.maxLives) : 0;
    ctx.fillStyle = "#e10600";
    ctx.fillRect(x, y, 200 * ratio, 25);
    ctx.strokeStyle = "#ffb4b4";
    ctx.strokeRect(x, y, 200, 25);
  });
}

function drawHud(
  ctx: CanvasRenderingContext2D,
  world: World,
  art: Art,
  dict: Record<string, string>,
) {
  ctx.textBaseline = "top";
  ctx.font = '12px "Public Pixel", monospace';
  const score = (dict.score ?? "score").toUpperCase();
  const high = (dict.high_score ?? "high score").toUpperCase();
  ctx.fillStyle = "#ffe14a";
  ctx.fillText(`${score}: ${world.score}`, 16, 24);
  ctx.drawImage(art.green, 16 + ctx.measureText(`${score}: ${world.score}`).width + 8, 20, 25, 20);
  ctx.fillText(`${high}: ${world.save.highScores[world.mode]}`, 16, 46);

  ctx.fillStyle = "#ff9a1f";
  ctx.fillText(`${(dict.bombs_left ?? "bombs left").toUpperCase()}: ${world.bombs}`, 16, 84);
  for (let i = 0; i < world.maxBombs; i += 1) {
    ctx.globalAlpha = i < world.bombs ? 1 : 0.25;
    ctx.drawImage(art.bomb, 16 + (i % 8) * 20, 104 + Math.floor(i / 8) * 20, 16, 16);
  }
  ctx.globalAlpha = 1;

  ctx.fillStyle = "#c084fc";
  ctx.fillText(`${(dict.coin ?? "coin").toUpperCase()}: ${world.runCoins}`, 16, 150);
  ctx.drawImage(art.coin, 170, 146, 22, 22);

  const shield = (dict.shield ?? "shield").toUpperCase();
  if (world.shieldActive) {
    ctx.fillStyle = "#67e8f9";
    ctx.fillText(`${shield}: ${world.shieldTime.toFixed(1)}S`, 16, 186);
  } else if (world.shieldCooldown > 0) {
    ctx.fillStyle = "#fb923c";
    ctx.fillText(`${shield}: CD ${world.shieldCooldown.toFixed(1)}S`, 16, 186);
  } else {
    ctx.fillStyle = "#84cc16";
    ctx.fillText(`${shield}: ${(dict.ready ?? "ready").toUpperCase()}`, 16, 186);
  }

  ctx.fillStyle = "#f87171";
  ctx.fillText(`${(dict.lives ?? "lives").toUpperCase()}: ${world.lives}`, 16, HEIGHT - 130);
  for (let i = 0; i < world.maxLives; i += 1) {
    ctx.drawImage(i < world.lives ? art.heart : art.heartLost, 16 + i * 24, HEIGHT - 108, 22, 22);
  }

  ctx.fillStyle = "#93c5fd";
  ctx.fillText(`${(dict.level ?? "level").toUpperCase()}: ${world.level.currentLevel}`, 16, HEIGHT - 70);
  if (showProgressBar(world)) {
    ctx.fillStyle = "#374151";
    ctx.fillRect(16, HEIGHT - 48, 100, 10);
    ctx.fillStyle = "#84cc16";
    ctx.fillRect(17, HEIGHT - 47, Math.max(0, Math.min(99, world.barWidth)), 8);
  }

  const heatX = WIDTH - 130;
  const heatY = HEIGHT - 36;
  ctx.fillStyle = "#374151";
  ctx.fillRect(heatX, heatY, 100, 15);
  const heatRatio = world.heat / 100;
  ctx.fillStyle = heatColor(world.heat);
  ctx.fillRect(heatX + 1, heatY + 1, 98 * heatRatio, 13);

  for (const toast of world.toasts.slice(-3)) {
    const def = ACHIEVEMENTS.find((item) => item.id === toast.text);
    const label = def ? achievementText(dict, def) : toast.text;
    const width = Math.min(WIDTH - 40, ctx.measureText(label).width + 24);
    const y = 230 + world.toasts.slice(-3).indexOf(toast) * 36;
    ctx.fillStyle = "rgba(0,0,0,0.78)";
    ctx.fillRect((WIDTH - width) / 2, y, width, 28);
    ctx.strokeStyle = "#facc15";
    ctx.strokeRect((WIDTH - width) / 2, y, width, 28);
    ctx.fillStyle = "#fef9c3";
    ctx.fillText(label, (WIDTH - width) / 2 + 12, y + 8);
  }
}

function heatColor(heat: number): string {
  if (heat >= 90) return "#ef4444";
  if (heat >= 75) return "#f97316";
  if (heat >= 50) return "#facc15";
  return "#84cc16";
}

function drawCenterText(ctx: CanvasRenderingContext2D, text: string, size: number, color: string) {
  ctx.save();
  ctx.font = `${size}px "Public Pixel", monospace`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.lineWidth = 6;
  ctx.strokeStyle = "#000";
  ctx.fillStyle = color;
  ctx.strokeText(text, WIDTH / 2, HEIGHT / 2);
  ctx.fillText(text, WIDTH / 2, HEIGHT / 2);
  ctx.restore();
}
