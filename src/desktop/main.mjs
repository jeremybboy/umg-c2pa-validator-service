import { app, BrowserWindow, Menu, dialog, ipcMain, protocol, utilityProcess, session } from 'electron';
import { readFile, stat, writeFile } from 'node:fs/promises';
import { createReadStream } from 'node:fs';
import { Readable } from 'node:stream';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { randomUUID } from 'node:crypto';

const root = fileURLToPath(new URL('../../', import.meta.url));
const startURL = 'intake://app/index.html';
const assets = new Map();
let window, activeWorker;
protocol.registerSchemesAsPrivileged([{ scheme: 'intake', privileges: { standard: true, secure: true, supportFetchAPI: true, stream: true } }]);

function assertSender(event) {
  if (event.sender !== window?.webContents || event.senderFrame?.url !== startURL) throw new Error('Unsupported inspection caller');
}
async function registerAudio(file) {
  if (typeof file !== 'string' || !path.isAbsolute(file)) throw new Error('Choose a local audio file');
  const mimeType = { '.wav': 'audio/wav', '.mp3': 'audio/mpeg' }[path.extname(file).toLowerCase()];
  const info = await stat(file);
  if (!mimeType || !info.isFile()) throw new Error('Choose a WAV or MP3 audio file');
  if (info.size > 256 * 1024 * 1024) throw new Error('This demo accepts files up to 256 MiB');
  const id = randomUUID();
  // Only the currently selected file remains addressable by the renderer.
  assets.clear(); assets.set(id, { file, mimeType });
  return { id, name: path.basename(file), bytes: info.size, mimeType, mediaURL: `intake://app/media/${id}` };
}
function inspect(entry, testMode) {
  activeWorker?.kill();
  return new Promise((resolve, reject) => {
    const worker = utilityProcess.fork(path.join(root, 'src/desktop/worker.mjs'), [], { serviceName: 'C2PA audio inspector' });
    activeWorker = worker;
    let settled = false;
    const timer = setTimeout(() => finish(new Error('Inspection timed out; try a smaller file')), 45000);
    function finish(error, report) {
      if (settled) return; settled = true; clearTimeout(timer);
      if (activeWorker === worker) activeWorker = null;
      worker.kill();
      if (error) reject(error); else resolve(report);
    }
    worker.on('message', message => message.error ? finish(new Error(message.error)) : finish(null, message.report));
    worker.on('exit', code => finish(new Error(`Inspection worker stopped (${code})`)));
    worker.once('spawn', () => worker.postMessage({ file: entry.file, testMode }));
  });
}

app.whenReady().then(async () => {
  session.defaultSession.setPermissionRequestHandler((_contents, _permission, callback) => callback(false));
  session.defaultSession.setPermissionCheckHandler(() => false);
  session.defaultSession.webRequest.onBeforeRequest((details, callback) => callback({ cancel: !details.url.startsWith('intake://app/') }));
  const staticFiles = {
    '/index.html': ['frontend/index.html', 'text/html'], '/app.css': ['frontend/app.css', 'text/css'],
    '/app.js': ['frontend/app.js', 'text/javascript'], '/graph.mjs': ['frontend/graph.mjs', 'text/javascript'],
    '/wordmark.svg': ['assets/wordmark.svg', 'image/svg+xml'],
  };
  protocol.handle('intake', async request => {
    const url = new URL(request.url);
    if (url.hostname !== 'app') return new Response('Not found', { status: 404 });
    if (url.pathname.startsWith('/media/')) {
      const entry = assets.get(url.pathname.slice('/media/'.length));
      if (!entry) return new Response('No selected audio', { status: 404 });
      const info = await stat(entry.file);
      const headers = { 'Content-Type': entry.mimeType, 'Accept-Ranges': 'bytes', 'Cache-Control': 'no-store' };
      const range = request.headers.get('range');
      let start = 0, end = info.size - 1;
      if (range) {
        const match = /^bytes=(\d+)-(\d*)$/.exec(range);
        if (!match) return new Response(null, { status: 416 });
        start = Number(match[1]); end = match[2] ? Math.min(Number(match[2]), end) : end;
        if (start > end || start >= info.size) return new Response(null, { status: 416 });
        headers['Content-Range'] = `bytes ${start}-${end}/${info.size}`;
      }
      headers['Content-Length'] = String(Math.max(0, end - start + 1));
      return new Response(info.size ? Readable.toWeb(createReadStream(entry.file, { start, end })) : null,
        { status: range ? 206 : 200, headers });
    }
    const selected = staticFiles[url.pathname];
    if (!selected) return new Response('Not found', { status: 404 });
    return new Response(await readFile(path.join(root, selected[0])), { headers: { 'Content-Type': selected[1] } });
  });
  window = new BrowserWindow({
    width: 1380, height: 980, minWidth: 1000, minHeight: 720, backgroundColor: '#0b0b0b',
    title: 'UMG C2PA Validator Service',
    webPreferences: { preload: path.join(root, 'src/desktop/preload.cjs'), contextIsolation: true, nodeIntegration: false, sandbox: true },
  });
  window.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  window.webContents.on('will-navigate', (event, url) => { if (url !== startURL) event.preventDefault(); });
  ipcMain.handle('audio:choose', async event => {
    assertSender(event);
    const result = await dialog.showOpenDialog(window, { title: 'Inspect an audio delivery', properties: ['openFile'], filters: [{ name: 'Audio', extensions: ['wav', 'mp3'] }] });
    return result.canceled ? null : registerAudio(result.filePaths[0]);
  });
  ipcMain.handle('audio:drop', (event, file) => { assertSender(event); return registerAudio(file); });
  ipcMain.handle('audio:inspect', (event, input) => {
    assertSender(event);
    const entry = assets.get(input?.id);
    if (!entry || typeof input.testMode !== 'boolean') throw new Error('Select an audio file before inspection');
    return inspect(entry, input.testMode);
  });
  ipcMain.handle('report:save', async (event, report) => {
    assertSender(event);
    if (!report || report.schemaVersion !== 1) throw new Error('No inspection report is available');
    const value = JSON.stringify(report, null, 2);
    if (Buffer.byteLength(value) > 32 * 1024 * 1024) throw new Error('Report exceeds the demonstration export limit');
    const result = await dialog.showSaveDialog(window, { defaultPath: 'c2pa-inspection.json', filters: [{ name: 'JSON report', extensions: ['json'] }] });
    if (result.canceled) return false;
    await writeFile(result.filePath, value, 'utf8'); return true;
  });
  Menu.setApplicationMenu(Menu.buildFromTemplate([
    { label: app.name, submenu: [{ role: 'about' }, { type: 'separator' }, { role: 'hide' }, { role: 'hideOthers' }, { role: 'unhide' }, { type: 'separator' }, { role: 'quit' }] },
    { label: 'File', submenu: [{ label: 'Open Audio…', accelerator: 'CmdOrCtrl+O', click: () => window.webContents.send('menu:open') }, { role: 'close' }] },
    { label: 'Edit', submenu: [{ role: 'copy' }, { role: 'selectAll' }] },
    { label: 'View', submenu: [{ role: 'resetZoom' }, { role: 'zoomIn' }, { role: 'zoomOut' }, { role: 'togglefullscreen' }] },
  ]));
  await window.loadURL(startURL);
});
app.on('window-all-closed', () => app.quit());
app.on('before-quit', () => activeWorker?.kill());
