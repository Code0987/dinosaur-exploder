import { HEIGHT, SHIP_SIZES, WIDTH } from "./constants";

export function asset(path: string): string {
  const base = import.meta.env.BASE_URL ?? "./";
  return `${base}${path.replace(/^\//, "")}`;
}

export interface Art {
  background: CanvasImageSource;
  backgroundWidth: number;
  backgroundHeight: number;
  green: CanvasImageSource;
  red: CanvasImageSource;
  orange: CanvasImageSource;
  coin: CanvasImageSource;
  heart: CanvasImageSource;
  heartLost: CanvasImageSource;
  bomb: CanvasImageSource;
  asteroids: CanvasImageSource[];
  ally: CanvasImageSource;
  allyDrop: CanvasImageSource;
  enemyShot: CanvasImageSource;
  explosions: CanvasImageSource[];
  ships: CanvasImageSource[];
  projectiles: CanvasImageSource[][];
}

let cached: Promise<Art> | null = null;

export function loadArt(): Promise<Art> {
  cached ??= buildArt();
  return cached;
}

async function buildArt(): Promise<Art> {
  const texture = (file: string) => loadImage(asset(`assets/textures/${file}`));
  const [
    background,
    green,
    red,
    orange,
    coin,
    heart,
    heartLost,
    bomb,
    asteroids,
    ally,
    allyDrop,
    enemyShot,
    explosion,
    ...ships
  ] = await Promise.all([
    texture("background.png"),
    texture("greenDino.png"),
    texture("redDino.png"),
    texture("orangeDino.png"),
    texture("coin.png"),
    texture("life.png"),
    texture("lifeLost.png"),
    texture("bomb.png"),
    texture("asteroids.png"),
    texture("blue_ship.png"),
    texture("blue_ship_drop.png"),
    texture("enemyProjectile.png"),
    texture("explosion.png"),
    ...[1, 2, 3, 4, 5, 6, 7, 8].map((ship) => texture(`spaceship${ship}.png`)),
  ]);

  const projectileRows = await Promise.all(
    [1, 2, 3, 4, 5, 6, 7, 8].map((ship) =>
      Promise.all([1, 2, 3].map((weapon) => texture(`projectiles/projectile${ship}_${weapon}.png`))),
    ),
  );

  const frames: CanvasImageSource[] = [];
  const frameWidth = Math.floor(explosion.width / 16);
  const frameHeight = explosion.height;
  for (let index = 0; index < 16; index += 1) {
    const canvas = document.createElement("canvas");
    canvas.width = frameWidth;
    canvas.height = frameHeight;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Could not slice the explosion sheet");
    context.drawImage(explosion, index * frameWidth, 0, frameWidth, frameHeight, 0, 0, frameWidth, frameHeight);
    frames.push(canvas);
  }

  const fitted = fitBackground(background);

  return {
    background: fitted.image,
    backgroundWidth: fitted.width,
    backgroundHeight: fitted.height,
    green: raster(green, 80, 60),
    red: raster(red, 100, 80),
    orange: raster(orange, 100, 150),
    coin: raster(coin, 40, 40),
    heart,
    heartLost,
    bomb,
    asteroids: [raster(asteroids, 80, 80), raster(asteroids, 120, 120), raster(asteroids, 160, 160)],
    ally: raster(ally, 80, 80),
    allyDrop: raster(allyDrop, 50, 50),
    enemyShot: raster(enemyShot, 30, 17),
    explosions: frames,
    ships,
    projectiles: projectileRows,
  };
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`Failed to load ${url}`));
    image.src = url;
  });
}

function fitBackground(image: HTMLImageElement): { image: HTMLCanvasElement; width: number; height: number } {
  const scale = Math.max(WIDTH / image.width, (HEIGHT * 2) / image.height);
  const width = Math.ceil(image.width * scale);
  const height = Math.ceil(image.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Could not prepare the background");
  context.imageSmoothingEnabled = true;
  context.drawImage(image, 0, 0, width, height);
  return { image: canvas, width, height };
}

function raster(image: HTMLImageElement, width: number, height: number): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Could not prepare a sprite");
  context.imageSmoothingEnabled = true;
  context.drawImage(image, 0, 0, width, height);
  return canvas;
}

export function shipSource(art: Art, ship: number): CanvasImageSource {
  return art.ships[Math.min(art.ships.length, Math.max(1, ship)) - 1] ?? art.ships[0];
}

export function projectileSource(art: Art, ship: number, weapon: number): CanvasImageSource {
  const row = art.projectiles[ship - 1] ?? art.projectiles[0];
  return row[weapon - 1] ?? row[0];
}

export const SHIP_DRAW = SHIP_SIZES;
