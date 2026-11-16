import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { inspectFile, inspectionContext } from '../src/validator/service.mjs';

export function makeWav() {
  const samples = 24000, buffer = Buffer.alloc(44 + samples * 2);
  buffer.write('RIFF'); buffer.writeUInt32LE(buffer.length - 8, 4); buffer.write('WAVEfmt ', 8);
  buffer.writeUInt32LE(16, 16); buffer.writeUInt16LE(1, 20); buffer.writeUInt16LE(1, 22);
  buffer.writeUInt32LE(48000, 24); buffer.writeUInt32LE(96000, 28); buffer.writeUInt16LE(2, 32); buffer.writeUInt16LE(16, 34);
  buffer.write('data', 36); buffer.writeUInt32LE(samples * 2, 40);
  for (let i = 0; i < samples; i++) buffer.writeInt16LE(Math.round(Math.sin(i * 2 * Math.PI * 220 / 48000) * 6000), 44 + i * 2);
  return buffer;
}
test('real SDK: unsigned WAV has no credentials, not an AI verdict', async () => {
  const folder = await mkdtemp(path.join(tmpdir(), 'umg-c2pa-'));
  const file = path.join(folder, 'generated-example.wav'); await writeFile(file, makeWav());
  for (const testMode of [false, true]) {
    const result = await inspectFile(file, { testMode });
    assert.equal(result.status, 'absent'); assert.equal(result.allChecksPassed, false);
    assert.ok(result.checks.every(c => c.state === 'not-applicable'));
    assert.equal(result.asset.sha256.length, 64); assert.equal(result.policy.offline, true);
  }
});
test('contexts keep Test Mode local and verification enabled', async () => {
  const standard = JSON.parse(await (await inspectionContext(false)).toJson());
  const testing = JSON.parse(await (await inspectionContext(true)).toJson());
  assert.equal(standard.verify.verify_trust, true); assert.equal(standard.verify.verify_after_reading, true);
  assert.equal(standard.verify.remote_manifest_fetch, false); assert.equal(standard.verify.ocsp_fetch, false);
  assert.equal(standard.trust, undefined); assert.ok(testing.trust.anchors.length > 0);
  assert.ok(testing.trust.anchors[0].trust_anchors.includes('BEGIN CERTIFICATE'));
  assert.ok(!JSON.stringify(testing).includes('PRIVATE KEY'));
  const after = JSON.parse(await (await inspectionContext(false)).toJson()); assert.equal(after.trust, undefined);
});
test('missing and malformed audio stay errors', async () => {
  const folder = await mkdtemp(path.join(tmpdir(), 'umg-c2pa-bad-'));
  const file = path.join(folder, 'invalid.wav'); await writeFile(file, 'this is not audio');
  assert.equal((await inspectFile(file)).status, 'error');
  assert.equal((await inspectFile(path.join(folder, 'missing.wav'))).status, 'error');
});
test('real supplied fixture: default/test trust, PCM tamper and immutable source', { skip: !process.env.C2PA_TEST_ASSET }, async () => {
  const file = path.resolve(process.env.C2PA_TEST_ASSET);
  const baseline = await inspectFile(file), trusted = await inspectFile(file, { testMode: true });
  assert.equal(baseline.checks[0].state, 'pass'); assert.equal(baseline.checks[1].state, 'pass');
  assert.notEqual(baseline.checks[2].state, 'pass'); assert.equal(trusted.allChecksPassed, true);
  assert.equal(baseline.asset.sha256, trusted.asset.sha256);
  const altered = Buffer.from(await readFile(file)); let changed = false;
  for (let p = 12; p + 8 <= altered.length;) {
    const size = altered.readUInt32LE(p + 4);
    if (p + 8 + size > altered.length) break;
    if (altered.toString('ascii', p, p + 4) === 'data' && size) { altered[p + 8] ^= 1; changed = true; break; }
    p += 8 + size + (size % 2);
  }
  assert.ok(changed);
  const folder = await mkdtemp(path.join(tmpdir(), 'umg-c2pa-tamper-')), copy = path.join(folder, 'altered.wav');
  await writeFile(copy, altered);
  const result = await inspectFile(copy, { testMode: true });
  assert.equal(result.checks[0].state, 'fail'); assert.equal(result.allChecksPassed, false);
  assert.equal((await inspectFile(file)).asset.sha256, baseline.asset.sha256);
});
