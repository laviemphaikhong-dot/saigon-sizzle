// Saigon Sizzle — the hand-in program for best-cooking-game-20261125-0137 (Node 22, stdlib only).
// The game is the static game/ folder beside this file: a Vietnamese street-food kitchen (pho,
// banh mi, goi cuon, com tam, ca phe sua da) that a desktop browser plays offline straight from
// game/index.html — no build step, no network. This program checks the screenshots, copies game/
// and screenshots/ into the output dir, and writes the dossier.json the judge reads.
//
// Play it: serve game/ with any static file server and open index.html in a desktop browser.
// Hand it in: mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
// (MAKEFUN_OUTPUT_DIR stands in for /output outside the grader's container.)

import { cpSync, existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// The screenshots are the first thing the judge sees, so check them before copying anything:
// the folder beside this file must hold 3 or 4 image files and none may exceed the scorer's
// 262144-byte cap. Fail loudly here rather than hand in an entry the gate would refuse.
const shotDir = join(here, 'screenshots');
const shotNames = existsSync(shotDir)
  ? readdirSync(shotDir).filter((name) => /\.(png|jpe?g)$/i.test(name))
  : [];
if (shotNames.length < 3 || shotNames.length > 4) {
  process.stderr.write(`saigon sizzle: expected 3 or 4 screenshots in ${shotDir}, found ${shotNames.length}\n`);
  process.exit(1);
}
for (const name of shotNames) {
  const size = statSync(join(shotDir, name)).size;
  if (size > 262144) {
    process.stderr.write(`saigon sizzle: screenshot ${name} is ${size} bytes, over the 262144-byte cap\n`);
    process.exit(1);
  }
}

mkdirSync(out, { recursive: true });
cpSync(join(here, 'game'), join(out, 'game'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
if (existsSync(join(here, 'screenshots'))) cpSync(join(here, 'screenshots'), join(out, 'screenshots'), { recursive: true });

// The scorer's own caps (reference/gate.json): only text_max_bytes shapes the bytes; the others refuse an entry the
// scorer would refuse (more than 4 screenshots or one over 256 KiB; more than 993 files in game/ or 48 MiB of game
// files, in all, or a path under game/ over 1000 bytes: game/ counts beside /output's own 1000-entry cap, its
// screenshots/ and dossier.json).
writeFileSync(
  join(out, 'dossier.json'),
  buildDossier(out, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    game_max_files: 993,
    game_max_bytes: 50331648,
    game_path_max_bytes: 1000,
  }),
);

// One line for the log, counted from what actually landed in the output dir (never assumed),
// so a short copy or a missing screenshot shows up here instead of at the scorer.
function countFiles(dir: string): number {
  let total = 0;
  for (const name of readdirSync(dir)) {
    if (statSync(join(dir, name)).isDirectory()) total += countFiles(join(dir, name));
    else total += 1;
  }
  return total;
}
const gameFileCount = countFiles(join(out, 'game'));
const shotCount = readdirSync(join(out, 'screenshots')).filter((name) => /\.(png|jpe?g)$/i.test(name)).length;
const dossierBytes = statSync(join(out, 'dossier.json')).size;
console.log(`saigon sizzle: handed in ${gameFileCount} game files, ${shotCount} screenshots, dossier ${dossierBytes} bytes`);
