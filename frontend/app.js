import { ProvenanceGraph } from './graph.mjs';
const $ = id => document.getElementById(id);
let asset = null, report = null, revision = 0, previewRevision = 0, simulationRevision = 0, expanded = false;
const api = window.intake;
const checkLabels = [['binding', 'Content binding'], ['signature', 'Claim signature'], ['trust', 'Signer trust']];
const stateLabels = { pass: 'PASS', fail: 'FAIL', warning: 'REVIEW', unknown: 'UNKNOWN', 'not-applicable': 'N/A' };
const graph = new ProvenanceGraph($('provenance-graph'), $('node-detail'), $('graph-zoom'), showDetails);

function showDetails(title, value) {
  $('details-title').textContent = title;
  $('details-content').textContent = typeof value === 'string' ? value : JSON.stringify(value, null, 2);
  if (!$('details-dialog').open) $('details-dialog').showModal();
}
$('close-details').addEventListener('click', () => $('details-dialog').close());
function message(value = '', error = false) { $('app-message').textContent = value; $('app-message').classList.toggle('error', error); }
function formatBytes(bytes) { return `${(bytes / (1024 * 1024)).toFixed(1)} MiB`; }
function duration(seconds) { return Number.isFinite(seconds) ? `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}` : ''; }
function renderChecks(checks, pending = false) {
  $('checks').replaceChildren();
  for (let index = 0; index < 3; index++) {
    const check = checks?.[index] ?? { id: checkLabels[index][0], label: checkLabels[index][1], state: 'unknown', summary: pending ? 'Inspection in progress…' : 'Select an audio file' };
    const card = document.createElement('article');
    card.className = `check ${pending ? 'unknown' : check.state}`; card.dataset.check = check.id;
    const title = document.createElement('h3'); title.textContent = check.label;
    const state = document.createElement('div'); state.className = 'check-state';
    const testPass = !pending && report?.policy.mode === 'test' && check.id === 'trust' && check.state === 'pass';
    state.textContent = pending ? 'CHECKING' : testPass ? 'PASS · TEST MODE' : stateLabels[check.state];
    card.classList.toggle('test-pass', testPass);
    const summary = document.createElement('p'); summary.textContent = check.summary;
    card.append(title, state, summary);
    if (check.evidence?.length && !pending) {
      const button = document.createElement('button'); button.className = 'evidence-button'; button.textContent = 'View evidence';
      button.addEventListener('click', () => showDetails(check.label, { summary: check.summary, policy: report.policy, evidence: check.evidence }));
      card.append(button);
    }
    $('checks').append(card);
  }
}

async function validate() {
  const current = ++revision;
  report = null;
  $('history-section').hidden = true; $('raw-button').disabled = true; $('export-button').disabled = true;
  const testMode = $('test-mode').checked;
  $('mode-badge').hidden = !testMode; $('test-note').hidden = !testMode;
  $('policy-label').textContent = testMode ? 'Test Mode · C2PA Conformance Test Root · local validation'
    : 'Local default policy · no added test anchors';
  if (!asset) { renderChecks(); return; }
  renderChecks(null, true); $('validation-summary').textContent = 'Reading and validating Content Credentials…';
  try {
    const result = await api.inspect(asset.id, testMode);
    if (current !== revision) return;
    report = result;
    renderChecks(report.checks);
    $('policy-label').textContent = `${report.policy.label} · ${report.elapsedMs} ms · certificate revocation not checked online`;
    $('validation-summary').textContent = report.status === 'present'
      ? `Content Credentials present${report.hasValidationFailures ? ' · validation issues require review'
        : report.allChecksPassed ? ' · all three checks passed' : ' · review the results below'}`
      : report.status === 'absent' ? 'No embedded Content Credentials found.'
      : report.status === 'error' ? 'Unable to inspect this file.' : 'Credentials detected; active manifest unavailable.';
    $('raw-button').disabled = !report.raw; $('export-button').disabled = false;
    if (report.history) { $('history-section').hidden = false; graph.setRoot(report.history); }
    if (report.error) message(report.error, true);
    else if (report.hasValidationFailures) message('SDK validation failures require review — open the manifest report.', true);
    else message(report.hasAdditionalFindings ? 'Additional SDK findings are available in the manifest report.' : 'Inspection complete.');
  } catch (error) {
    if (current !== revision) return;
    renderChecks(); $('validation-summary').textContent = 'Inspection did not complete.'; message(error.message, true);
  }
}

async function preview(selected) {
  const current = ++previewRevision;
  $('audio').src = selected.mediaURL; $('audio').load();
  $('preview-status').textContent = 'Preparing waveform…';
  const canvas = $('waveform'), ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  if (selected.bytes > 96 * 1024 * 1024) { $('preview-status').textContent = 'Large file · use the audio player'; return; }
  let context;
  try {
    const data = await fetch(selected.mediaURL).then(response => response.arrayBuffer());
    if (current !== previewRevision) return;
    context = new AudioContext();
    const decoded = await context.decodeAudioData(data);
    if (current !== previewRevision) return;
    const samples = decoded.getChannelData(0), columns = canvas.width, stride = Math.max(1, Math.floor(samples.length / columns));
    ctx.strokeStyle = '#b8b8b8'; ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = 0; x < columns; x++) {
      let peak = 0;
      for (let i = x * stride; i < Math.min(samples.length, (x + 1) * stride); i++) peak = Math.max(peak, Math.abs(samples[i]));
      const height = Math.max(1, peak * canvas.height * .45);
      ctx.moveTo(x + .5, canvas.height / 2 - height); ctx.lineTo(x + .5, canvas.height / 2 + height);
    }
    ctx.stroke();
    $('preview-status').textContent = `${duration(decoded.duration)} · ${decoded.sampleRate / 1000} kHz · ${decoded.numberOfChannels} ch`;
  } catch {
    if (current === previewRevision) $('preview-status').textContent = 'Waveform unavailable; try the player';
  } finally { if (context) await context.close(); }
}

async function acceptAudio(selected) {
  if (!selected) return;
  asset = selected; message();
  $('empty-intake').hidden = true; $('loaded-intake').hidden = false;
  $('file-name').textContent = selected.name;
  $('file-meta').textContent = `${selected.mimeType === 'audio/wav' ? 'WAV' : 'MP3'} · ${formatBytes(selected.bytes)} · local file`;
  $('simulate-ai').disabled = false; $('simulate-ai').textContent = 'Run simulated analysis';
  $('ai-result').hidden = true; simulationRevision++;
  preview(selected); await validate();
}
async function chooseAudio() { try { await acceptAudio(await api.chooseAudio()); } catch (error) { message(error.message, true); } }
$('choose-audio').addEventListener('click', chooseAudio);
$('replace-audio').addEventListener('click', chooseAudio);
api.onOpen(chooseAudio);
$('file-input').addEventListener('change', async event => {
  try { if (event.target.files[0]) await acceptAudio(await api.dropAudio(event.target.files[0])); }
  catch (error) { message(error.message, true); }
  event.target.value = '';
});
document.addEventListener('dragover', event => { event.preventDefault(); $('drop-zone').classList.add('dragging'); });
document.addEventListener('dragleave', event => { if (!event.relatedTarget) $('drop-zone').classList.remove('dragging'); });
document.addEventListener('drop', async event => {
  event.preventDefault(); $('drop-zone').classList.remove('dragging');
  const file = event.dataTransfer.files[0];
  if (!file) return;
  try { await acceptAudio(await api.dropAudio(file)); } catch (error) { message(error.message, true); }
});
$('test-mode').addEventListener('change', validate);
$('raw-button').addEventListener('click', () => showDetails('Content Credentials · SDK manifest report', report.raw));
$('export-button').addEventListener('click', async () => {
  try { if (await api.exportReport(report)) message('Inspection report saved.'); } catch (error) { message(error.message, true); }
});
const tabs = [...document.querySelectorAll('[role=tab]')];
function selectTab(tab) {
  for (const item of tabs) {
    const selected = item === tab; item.setAttribute('aria-selected', String(selected)); item.tabIndex = selected ? 0 : -1;
    $(`${item.dataset.tab}-panel`).hidden = !selected;
  }
}
tabs.forEach((tab, index) => {
  tab.addEventListener('click', () => selectTab(tab));
  tab.addEventListener('keydown', event => {
    const target = event.key === 'ArrowRight' ? (index + 1) % tabs.length : event.key === 'ArrowLeft' ? (index + tabs.length - 1) % tabs.length : -1;
    if (target >= 0) { event.preventDefault(); selectTab(tabs[target]); tabs[target].focus(); }
  });
});
$('simulate-ai').addEventListener('click', async () => {
  const current = ++simulationRevision;
  $('simulate-ai').disabled = true; $('simulate-ai').textContent = 'Running simulation…'; $('ai-result').hidden = true;
  await new Promise(resolve => setTimeout(resolve, 700));
  if (current !== simulationRevision) return;
  $('ai-result').replaceChildren();
  const title = document.createElement('h3'); title.textContent = 'Simulated result · review suggested';
  const description = document.createElement('p'); description.textContent = 'Example scenario: an AI-generated-content signal was flagged for an operator to review.';
  const note = document.createElement('p'); note.className = 'subtle'; note.textContent = 'Scripted demonstration only — no audio analysis was performed.';
  $('ai-result').append(title, description, note); $('ai-result').hidden = false;
  $('simulate-ai').disabled = false; $('simulate-ai').textContent = 'Run simulated analysis again';
});
$('zoom-in').addEventListener('click', () => graph.zoom(1.2));
$('zoom-out').addEventListener('click', () => graph.zoom(1 / 1.2));
$('fit-graph').addEventListener('click', () => graph.fit());
$('expand-all').addEventListener('click', () => graph.expandAll());
function expand(value) {
  expanded = value; $('graph-shell').classList.toggle('expanded', value);
  $('close-graph').hidden = !value; $('expand-graph').setAttribute('aria-expanded', String(value));
  requestAnimationFrame(() => { graph.fit(); if (value) $('close-graph').focus(); else $('expand-graph').focus(); });
}
$('expand-graph').addEventListener('click', () => expand(true));
$('close-graph').addEventListener('click', () => expand(false));
document.addEventListener('keydown', event => { if (event.key === 'Escape' && expanded && !$('details-dialog').open) expand(false); });
renderChecks();
