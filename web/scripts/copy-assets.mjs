import { cpSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const from = resolve(root, "../src/main/resources/assets");
const to = resolve(root, "public/assets");

mkdirSync(resolve(root, "public"), { recursive: true });
cpSync(from, to, { recursive: true });
console.log(`Copied game assets to ${to}`);
