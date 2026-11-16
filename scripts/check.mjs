import { readdir, readFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import path from 'node:path';

async function walk(directory) {
  const result = [];
  for (const item of await readdir(directory, { withFileTypes: true })) {
    const name = path.join(directory, item.name);
    if (item.isDirectory()) result.push(...await walk(name)); else result.push(name);
  }
  return result;
}
for (const directory of ['src', 'frontend', 'scripts', 'tests', 'examples']) {
  for (const file of await walk(directory)) if (/\.(?:mjs|cjs|js)$/.test(file)) execFileSync(process.execPath, ['--check', file], { stdio: 'inherit' });
}
const tracked = execFileSync('git', ['ls-files', '-z'], { encoding: 'utf8' }).split('\0').filter(Boolean);
for (const file of tracked) {
  if (/\.(?:wav|mp3|flac|docx|p12|pfx|key|c2pa)$/i.test(file)) throw new Error(`Private/media artifact tracked: ${file}`);
  if (!/\.(?:png|icns)$/.test(file)) {
    const content = await readFile(file, 'utf8');
    if (/-----BEGIN (?:[A-Z]+ )?PRIVATE KEY-----/.test(content)) throw new Error(`Private key tracked: ${file}`);
  }
}
const html = await readFile('frontend/index.html', 'utf8');
if (!html.includes('Content-Security-Policy') || !html.includes('Simulated') || !html.includes('Placeholder')) throw new Error('Required UI boundaries missing');
const readme = await readFile('README.md', 'utf8');
if (!readme.includes('docs/assets/repository-overview.svg')) throw new Error('README overview missing');
execFileSync('git', ['diff', '--check'], { stdio: 'inherit' });
console.log('JavaScript syntax, public tracked-file boundaries, overview and whitespace checks passed.');
