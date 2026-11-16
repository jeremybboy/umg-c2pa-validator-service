import { readFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
const { app } = JSON.parse(await readFile('artifacts/packaged-app.json', 'utf8'));
execFileSync('open', [app], { stdio: 'inherit' });
