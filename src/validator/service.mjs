import { Reader, Context } from '@contentauth/c2pa-node';
import { createReadStream } from 'node:fs';
import { readFile, stat } from 'node:fs/promises';
import { createHash, X509Certificate } from 'node:crypto';
import path from 'node:path';
import { makeReport } from './report.mjs';

export const MAX_AUDIO_BYTES = 256 * 1024 * 1024;
export const TEST_ROOT_SHA256 = '41BDE325753313FC3DC632F18C2B7FADE729B94A6429FEE524E347110C346DBA';
const types = { '.wav': 'audio/wav', '.mp3': 'audio/mpeg' };
export const audioType = file => types[path.extname(file).toLowerCase()] ?? null;

export async function inspectionContext(testMode = false) {
  if (typeof testMode !== 'boolean') throw new TypeError('Test Mode must be a boolean');
  const verify = { verifyAfterReading: true, verifyTrust: true, remoteManifestFetch: false, ocspFetch: false };
  const settings = { verify };
  if (testMode) {
    const pem = await readFile(new URL('../../resources/test-trust/conformance-test-root.pem', import.meta.url), 'utf8');
    const fingerprint = new X509Certificate(pem).fingerprint256.replaceAll(':', '');
    if (fingerprint !== TEST_ROOT_SHA256) throw new Error('The bundled test root failed its fingerprint check');
    settings.trust = { userAnchors: pem };
  }
  return new Context(settings, { maxSizeInBytes: MAX_AUDIO_BYTES });
}

export async function inspectFile(file, { testMode = false } = {}) {
  const started = performance.now();
  const policy = {
    mode: testMode ? 'test' : 'default', offline: true,
    label: testMode ? 'Test Mode · C2PA Conformance Test Root' : 'Local default policy · no added test anchors',
    productionTrust: false, testRootSha256: testMode ? TEST_ROOT_SHA256 : null,
    onlineCertificateStatus: 'Not requested',
  };
  let asset = { name: path.basename(file) };
  try {
    const info = await stat(file);
    const mimeType = audioType(file);
    if (!info.isFile() || !mimeType) throw new Error('Choose a WAV or MP3 audio file');
    if (info.size > MAX_AUDIO_BYTES) throw new Error('This demo accepts files up to 256 MiB');
    asset = { ...asset, bytes: info.size, mimeType };
    const context = await inspectionContext(testMode);
    const hash = createHash('sha256');
    for await (const chunk of createReadStream(file)) hash.update(chunk);
    asset.sha256 = hash.digest('hex');
    const reader = await Reader.fromAsset({ path: file, mimeType }, context);
    const document = reader ? reader.json() : null;
    const after = await stat(file);
    if (after.size !== info.size || after.mtimeMs !== info.mtimeMs) throw new Error('The file changed during inspection; select it again');
    return { ...makeReport(document, { asset, policy, embedded: reader?.isEmbedded() ?? false }),
      elapsedMs: Math.round(performance.now() - started) };
  } catch (error) {
    // Error text can carry local filenames; full source paths are omitted from this report.
    const message = String(error.message ?? error).replaceAll(file, path.basename(file));
    return { ...makeReport(null, { asset, policy, error: message }), elapsedMs: Math.round(performance.now() - started) };
  }
}
