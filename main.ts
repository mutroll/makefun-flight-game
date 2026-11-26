// Kestrel Run — hand-in program (Node 22, standard library only).
// Copies game/ and screenshots/ from beside this file into /output and writes
// /output/dossier.json with the vendored make.fun library, exactly as the kit
// describes. Outside the grader, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
//
// The output directory is owned by the grader in the scoring sandbox, so this
// program never removes it and never changes its permissions: it only creates
// it when it is missing and writes files inside it.

import { cpSync, existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// Create the output directory only if it is missing; never delete it.
mkdirSync(out, { recursive: true });

// Clear stale contents from a previous local run, file by file, leaving the
// directory itself in place.
for (const name of ['game', 'screenshots', 'dossier.json']) {
  const target = join(out, name);
  if (existsSync(target)) rmSync(target, { recursive: true, force: true });
}

cpSync(join(here, 'game'), join(out, 'game'), { recursive: true });
if (existsSync(join(here, 'screenshots'))) {
  cpSync(join(here, 'screenshots'), join(out, 'screenshots'), { recursive: true });
} else {
  mkdirSync(join(out, 'screenshots'), { recursive: true });
}

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
