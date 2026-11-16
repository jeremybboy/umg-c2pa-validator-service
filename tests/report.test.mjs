import test from 'node:test';
import assert from 'node:assert/strict';
import { activeStatuses, makeReport, historyFrom, sourceLabel } from '../src/validator/report.mjs';

function fixture(success = [], failure = []) {
  return { active_manifest: 'root', manifests: { root: { title: 'Example audio', claim_generator: 'Example tool', assertions: [], ingredients: [] } },
    validation_results: { activeManifest: { success: success.map(code => ({ code })), failure: failure.map(code => ({ code })), informational: [] } } };
}
const good = ['assertion.dataHash.match', 'claimSignature.validated', 'signingCredential.trusted'];
test('three passes require three explicit independent SDK successes', () => {
  const report = makeReport(fixture(good), { policy: { mode: 'test' } });
  assert.equal(report.allChecksPassed, true);
  assert.match(report.checks[2].summary, /test certificate used/);
  assert.equal(makeReport(fixture(['claimSignature.insideValidity'])).checks[1].state, 'unknown');
  assert.equal(makeReport(fixture([])).allChecksPassed, false);
});
test('signature validity is not signer trust, including in Test Mode', () => {
  const report = makeReport(fixture(good.slice(0, 2), ['signingCredential.untrusted']), { policy: { mode: 'test' } });
  assert.equal(report.checks[1].state, 'pass'); assert.equal(report.checks[2].state, 'fail');
  assert.equal(report.allChecksPassed, false);
});
test('failures override successes and ingredient outcomes stay scoped', () => {
  const document = fixture(good, ['assertion.dataHash.mismatch', 'claimSignature.mismatch']);
  document.validation_results.ingredientDeltas = [{ failure: [{ code: 'signingCredential.untrusted' }] }];
  const report = makeReport(document);
  assert.equal(report.checks[0].state, 'fail'); assert.equal(report.checks[1].state, 'fail'); assert.equal(report.checks[2].state, 'pass');
  assert.equal(activeStatuses(document).length, 5);
  document.validation_status = [{ code: 'signingCredential.untrusted', url: 'self#jumbf=/c2pa/other/c2pa.signature' }];
  assert.equal(makeReport(document).checks[2].state, 'pass');
});
test('no credentials and inspection errors are different outcomes', () => {
  const absent = makeReport(null); assert.equal(absent.status, 'absent');
  assert.ok(absent.checks.every(c => c.state === 'not-applicable'));
  const failed = makeReport(null, { error: 'Cannot read media' });
  assert.equal(failed.status, 'error'); assert.ok(failed.checks.every(c => c.state === 'unknown'));
  assert.equal(makeReport({}).status, 'unreadable');
});
test('additional SDK failures remain visible even if the three primary checks pass', () => {
  const document = fixture(good, ['assertion.hashedURI.mismatch']);
  const report = makeReport(document);
  assert.equal(report.allChecksPassed, true);
  assert.equal(report.hasValidationFailures, true);
  const globalFailure = fixture(good); globalFailure.validation_state = 'Invalid';
  assert.equal(makeReport(globalFailure).hasValidationFailures, true);
});
test('only canonical declared IPTC terms get AI or captured labels', () => {
  assert.equal(sourceLabel('http://cv.iptc.org/newscodes/digitalsourcetype/trainedAlgorithmicMedia'), 'Contains GenAI Media');
  assert.equal(sourceLabel('https://cv.iptc.org/newscodes/digitalsourcetype/digitalCapture'), 'Contains Captured Media');
  assert.equal(sourceLabel('http://cv.iptc.org/newscodes/digitalsourcetype/compositeWithTrainedAlgorithmicMedia'), 'Contains GenAI edits');
  assert.match(sourceLabel('https://example.org/trainedAlgorithmicMedia'), /^Declared source:/);
});
test('history retains instruments and relationships without inventing audio validation', () => {
  const document = fixture(good);
  document.manifests.root.ingredients = [{ title: 'MIDI stem', relationship: 'componentOf', active_manifest: 'stem' }, { title: 'Unsigned sample', relationship: 'componentOf' }];
  document.manifests.stem = { title: 'MIDI stem', claim_generator: 'Example tool', assertions: [{ label: 'c2pa.actions.v2', data: { actions: [{ action: 'c2pa.rendered', parameters: { 'c2paseq:midiRender': { instrument: { name: 'Example synth' } } } }] } }], ingredients: [{ active_manifest: 'root' }] };
  const history = historyFrom(document);
  assert.equal(history.children[0].instrument, 'Example synth');
  assert.equal(history.children[0].relationship, 'componentOf');
  assert.match(history.children[0].availability, /source audio not supplied/);
  assert.match(history.children[0].children[0].availability, /repeated reference/);
  assert.equal(history.children[1].hasManifest, false);
  assert.equal(history.children[0].actions.length, 1);
});
