import type { Art } from "./assets";
import { HEIGHT, TICK, WIDTH } from "./constants";
import { draw } from "./render";
import { idleInput, step, type Input, type World } from "./sim";

export interface ControlPad {
  up: boolean;
  down: boolean;
  left: boolean;
  right: boolean;
  shootHeld: boolean;
  queueShoot: boolean;
  queueBomb: boolean;
  queueShield: boolean;
  mouseX: number;
  mouseY: number;
  mouseHeld: boolean;
}

export function createPad(world: World): ControlPad {
  return {
    up: false,
    down: false,
    left: false,
    right: false,
    shootHeld: false,
    queueShoot: false,
    queueBomb: false,
    queueShield: false,
    mouseX: world.playerX + world.playerW / 2,
    mouseY: world.playerY - 80,
    mouseHeld: false,
  };
}

export function startLoop(
  canvas: HTMLCanvasElement,
  getWorld: () => World,
  art: Art,
  dict: Record<string, string>,
  pad: ControlPad,
  onUi: () => void,
): () => void {
  const keys = new Set<string>();
  let shootDown = false;
  let bombDown = false;
  let shieldDown = false;
  let acc = 0;
  let last = performance.now();
  let uiKey = "";
  let frame = 0;

  const onKeyDown = (event: KeyboardEvent) => {
    if (["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(event.code)) {
      event.preventDefault();
    }
    if (event.code === "Escape") {
      event.preventDefault();
      const world = getWorld();
      if (world.phase !== "over") world.paused = !world.paused;
      publish();
      return;
    }
    keys.add(event.code);
  };
  const onKeyUp = (event: KeyboardEvent) => {
    keys.delete(event.code);
  };
  const onPointer = (event: PointerEvent) => {
    const point = toGame(canvas, event.clientX, event.clientY);
    pad.mouseX = point.x;
    pad.mouseY = point.y;
  };
  const onPointerDown = (event: PointerEvent) => {
    onPointer(event);
    if (event.button === 0) pad.mouseHeld = true;
  };
  const onPointerUp = () => {
    pad.mouseHeld = false;
  };

  window.addEventListener("keydown", onKeyDown);
  window.addEventListener("keyup", onKeyUp);
  canvas.addEventListener("pointermove", onPointer);
  canvas.addEventListener("pointerdown", onPointerDown);
  window.addEventListener("pointerup", onPointerUp);

  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas is unavailable");

  const loop = (now: number) => {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    const world = getWorld();
    if (!world.paused) {
      acc += dt;
      let guard = 0;
      while (acc >= TICK && guard < 5) {
        const shootPressed = (keys.has("Space") && !shootDown) || pad.queueShoot;
        const bombPressed = (keys.has("KeyB") && !bombDown) || pad.queueBomb;
        const shieldPressed = (keys.has("KeyE") && !shieldDown) || pad.queueShield;
        shootDown = keys.has("Space");
        bombDown = keys.has("KeyB");
        shieldDown = keys.has("KeyE");
        pad.queueShoot = false;
        pad.queueBomb = false;
        pad.queueShield = false;
        step(getWorld(), readInput(keys, pad, shootPressed, bombPressed, shieldPressed));
        acc -= TICK;
        guard += 1;
      }
    }
    draw(context, getWorld(), art, dict);
    frame += 1;
    if (frame % 10 === 0) publish();
    request = requestAnimationFrame(loop);
  };

  let request = requestAnimationFrame(loop);
  publish();

  function publish() {
    const world = getWorld();
    const key = `${world.phase}|${world.paused}|${world.gameOver?.finalScore ?? "-"}|${world.lives}|${world.score}|${world.toasts.length}`;
    if (key !== uiKey) {
      uiKey = key;
      onUi();
    }
  }

  return () => {
    cancelAnimationFrame(request);
    window.removeEventListener("keydown", onKeyDown);
    window.removeEventListener("keyup", onKeyUp);
    canvas.removeEventListener("pointermove", onPointer);
    canvas.removeEventListener("pointerdown", onPointerDown);
    window.removeEventListener("pointerup", onPointerUp);
  };
}

function readInput(
  keys: Set<string>,
  pad: ControlPad,
  shootPressed: boolean,
  bombPressed: boolean,
  shieldPressed: boolean,
): Input {
  return {
    ...idleInput(),
    up: keys.has("ArrowUp") || keys.has("KeyW") || pad.up,
    down: keys.has("ArrowDown") || keys.has("KeyS") || pad.down,
    left: keys.has("ArrowLeft") || keys.has("KeyA") || pad.left,
    right: keys.has("ArrowRight") || keys.has("KeyD") || pad.right,
    shootPressed,
    shootHeld: pad.shootHeld || pad.mouseHeld,
    bombPressed,
    shieldPressed,
    mouseX: pad.mouseX,
    mouseY: pad.mouseY,
  };
}

function toGame(canvas: HTMLCanvasElement, clientX: number, clientY: number) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: ((clientX - rect.left) / rect.width) * WIDTH,
    y: ((clientY - rect.top) / rect.height) * HEIGHT,
  };
}
