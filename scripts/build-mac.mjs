import { packager } from '@electron/packager';
import { execFileSync } from 'node:child_process';
import { mkdir, writeFile, access } from 'node:fs/promises';
import path from 'node:path';

if (process.platform !== 'darwin') throw new Error('The Mac app must be packaged on macOS');
await mkdir('artifacts', { recursive: true });
execFileSync('swift', ['scripts/render-icon.swift', 'artifacts/AppIcon.iconset'], { stdio: 'inherit' });
execFileSync('iconutil', ['-c', 'icns', 'artifacts/AppIcon.iconset', '-o', 'artifacts/AppIcon.icns'], { stdio: 'inherit' });
let output = 'dist';
try {
  await access(path.join(output, `UMG C2PA Validator Service-darwin-${process.arch}`));
  output = path.join('dist', `build-${Date.now()}`);
} catch { /* First build uses the short output path. Later builds preserve older bundles. */ }
const directories = await packager({
  dir: '.', name: 'UMG C2PA Validator Service', platform: 'darwin', arch: process.arch,
  appBundleId: 'io.github.jeremybboy.umg-c2pa-validator-service', appVersion: '0.1.0',
  icon: 'artifacts/AppIcon.icns', out: output, overwrite: false,
  asar: { unpack: '**/*.node' }, prune: true,
  ignore: [
    /^\/(?!(?:src|frontend|resources|assets|node_modules)(?:\/|$)|package\.json$|LICENSE$).+/,
    /\.(?:wav|mp3|flac|m4a|docx|key|p12|pfx|c2pa)$/i,
  ],
});
const app = path.resolve(directories[0], 'UMG C2PA Validator Service.app');
execFileSync('codesign', ['--force', '--deep', '--sign', '-', app], { stdio: 'inherit' });
execFileSync('codesign', ['--verify', '--deep', '--strict', app], { stdio: 'inherit' });
await writeFile('artifacts/packaged-app.json', JSON.stringify({ app, executable: path.join(app, 'Contents/MacOS/UMG C2PA Validator Service') }, null, 2));
console.log(`Mac application: ${app}`);
