// Pure presentation mapping: all positive outcomes require explicit SDK evidence.
const definitions = [
  ['binding', 'Content binding', 'Does this audio match the manifest?'],
  ['signature', 'Claim signature', 'Is the claim signature valid?'],
  ['trust', 'Signer trust', 'Is the signer trusted under this policy?'],
];
const list = value => Array.isArray(value) ? value : [];
const text = value => typeof value === 'string' ? value : '';
const agentName = value => typeof value === 'string' ? value : text(value?.name);

export function sourceLabel(uri) {
  const match = /^https?:\/\/cv\.iptc\.org\/newscodes\/digitalsourcetype\/([^/]+)$/.exec(uri);
  const labels = {
    digitalCapture: 'Contains Captured Media',
    digitalCreation: 'Contains Non-GenAI digital creation',
    trainedAlgorithmicMedia: 'Contains GenAI Media',
    compositeWithTrainedAlgorithmicMedia: 'Contains GenAI edits',
  };
  return match && labels[match[1]] ? labels[match[1]] : `Declared source: ${uri}`;
}

export function activeStatuses(document) {
  const results = [];
  const active = document?.validation_results?.activeManifest;
  for (const level of ['success', 'informational', 'failure']) {
    for (const entry of list(active?.[level])) {
      if (text(entry.code)) results.push({ ...entry, level });
    }
  }
  // Do not recursively mix ingredient results into the current asset's checks.
  for (const entry of list(document?.validation_status)) {
    const url = text(entry.url);
    if (text(entry.code) && (!url || url.includes(`/${document.active_manifest}/`))) {
      results.push({ ...entry, level: 'legacy' });
    }
  }
  return results;
}

function checksFrom(document, policy, status) {
  const checks = definitions.map(([id, label, question]) => ({
    id, label, question, state: status === 'absent' ? 'not-applicable' : 'unknown',
    summary: status === 'absent' ? 'No embedded Content Credentials' : 'Not separately reported', evidence: [],
  }));
  if (status !== 'present') return checks;
  function apply(index, state, summary, evidence) {
    const check = checks[index];
    check.evidence.push(evidence);
    if (check.state === 'fail') return;
    if (state === 'warning' && check.state === 'pass') return;
    check.state = state; check.summary = summary;
  }
  for (const entry of activeStatuses(document)) {
    const code = text(entry.code);
    const fail = entry.level === 'failure' || /\.(?:mismatch|invalid|untrusted|revoked|expired|missing|malformed)$/.test(code);
    if (/^assertion\.(?:dataHash|bmffHash|boxesHash|collectionHash)\./.test(code)) {
      if (fail) apply(0, 'fail', 'Audio does not match the protected content binding', entry);
      else if (code.endsWith('.match')) apply(0, 'pass', 'Audio matches the protected content binding', entry);
    }
    if (code.startsWith('claimSignature.')) {
      if (fail) apply(1, 'fail', 'Signature verification failed', entry);
      else if (code === 'claimSignature.validated') apply(1, 'pass', 'The claim signature is valid', entry);
    }
    if (code.startsWith('signingCredential.')) {
      if (fail) apply(2, 'fail', 'Signer is not trusted or its credential failed validation', entry);
      else if (code === 'signingCredential.trusted') apply(2, 'pass', policy.mode === 'test'
        ? 'Trusted in Test Mode — test certificate used' : 'Trusted under the selected local policy', entry);
      else if (code.includes('ocsp')) apply(2, 'warning', 'Certificate status not checked online', entry);
    }
  }
  return checks;
}

function generator(manifest) {
  return agentName(list(manifest?.claim_generator_info)[0]) || text(manifest?.claim_generator);
}
function actionsOf(manifest) {
  return list(manifest?.assertions).filter(a => /^c2pa\.actions(?:\.|$)/.test(a.label ?? ''))
    .flatMap(a => list(a.data?.actions)).slice(0, 64).map(a => ({
      action: text(a.action), source: text(a.digitalSourceType), software: agentName(a.softwareAgent),
      instrument: text(a.parameters?.['c2paseq:midiRender']?.instrument?.name),
      description: text(a.description), parameters: a.parameters ?? null,
    }));
}

export function historyFrom(document) {
  const manifests = document?.manifests ?? {};
  let remaining = 128;
  function visit(id, title, relationship, ancestry, depth, ingredient = null) {
    if (--remaining < 0 || depth > 8 || ancestry.has(id)) return {
      id: `${id}/limit/${remaining}`, title: 'Further history in raw manifest', relationship,
      availability: 'Display limit or repeated reference', sources: [], actions: [], children: [],
    };
    const manifest = id && Object.hasOwn(manifests, id) ? manifests[id] : null;
    const actions = actionsOf(manifest);
    const sources = [...new Set(actions.map(a => a.source).filter(Boolean))].map(uri => ({ uri, label: sourceLabel(uri) }));
    const node = {
      id: id || `unsigned/${remaining}`, title: title || text(manifest?.title) || 'Untitled ingredient',
      manifestId: id || null, relationship, generator: generator(manifest), sources, actions,
      instrument: actions.map(a => a.instrument).find(Boolean) ?? '', hasManifest: !!manifest,
      availability: manifest ? (depth === 0 ? 'Current asset' : 'Embedded history; source audio not supplied')
        : id ? 'Referenced manifest is not embedded' : 'No Content Credentials declared for this ingredient',
      original: ingredient ?? null, children: [],
    };
    if (manifest) {
      const path = new Set(ancestry).add(id);
      for (const input of list(manifest.ingredients)) {
        if (remaining <= 0) break;
        const linked = text(input.active_manifest) || text(input.c2pa_manifest?.identifier);
        node.children.push(visit(linked, text(input.title), text(input.relationship), path, depth + 1, input));
      }
    }
    return node;
  }
  const id = text(document?.active_manifest);
  return id && Object.hasOwn(manifests, id) ? visit(id, text(manifests[id].title), '', new Set(), 0) : null;
}

export function makeReport(document, { asset = {}, policy = { mode: 'default' }, error = null, embedded = true } = {}) {
  const active = document?.manifests?.[document?.active_manifest];
  const status = error ? 'error' : document === null ? 'absent' : active ? 'present' : 'unreadable';
  const checks = checksFrom(document, policy, status);
  const statuses = activeStatuses(document);
  return {
    schemaVersion: 1, status, asset, policy, embedded: status === 'present' && embedded,
    checks, allChecksPassed: status === 'present' && checks.every(c => c.state === 'pass'),
    sdkValidationState: text(document?.validation_state),
    hasValidationFailures: statuses.some(s => s.level === 'failure')
      || /invalid/i.test(text(document?.validation_state)),
    hasAdditionalFindings: statuses.some(s => s.level === 'failure' || s.level === 'informational'),
    manifest: active ? {
      id: document.active_manifest, title: text(active.title), generator: generator(active),
      signer: text(active.signature_info?.common_name) || text(active.signature_info?.issuer),
    } : null,
    history: status === 'present' ? historyFrom(document) : null,
    raw: document, error,
  };
}
