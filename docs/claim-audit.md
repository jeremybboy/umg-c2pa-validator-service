# Claim and counterexample audit

Audience: music-ingest operators and technical decision makers. Preserve a simple demonstration while avoiding conclusions the evidence cannot support.

| Proposed shortcut | Falsifier / check | Verdict and wording |
| --- | --- | --- |
| A valid signature means the signer is trusted | Correct signature from an unconfigured test CA | Fails; show signature and trust independently. |
| Test Mode makes any credential valid | PCM altered after signing; unrelated or invalid certificate chain | Fails; Test Mode adds one explicit public anchor and keeps validation enabled. |
| No credentials means AI-generated | A generated unsigned tone with no origin metadata | Fails; No Content Credentials yields N/A, with no AI conclusion. |
| Contains GenAI Media is a detector result | A manifest declares an IPTC source type without any detector call | Fails; source labels explicitly summarize declarations. |
| An ingredient in the graph was independently checked as audio | Embedded ingredient manifest exists but its source audio file is missing | Fails; show declared history and availability separately. |
| A small demo proves enterprise integration is easy | Real production intake needs authentication, policy, audit retention, failure handling and operations | Needs refinement; this app demonstrates a reusable reader/report boundary, not measured production effort. |
| A simulation can illustrate an adjacent analysis module | Viewer could mistake a scripted flag for measured AI evidence | Survives only with persistent Simulated labels and no invented detection confidence. |

The production integration claim is deliberately narrow: a local intake interface can call a reusable C2PA inspection module and present its evidence alongside other workflow modules. Remaining hard case: representative production delivery packages and organization-specific trust policies, which are outside this first demo.
