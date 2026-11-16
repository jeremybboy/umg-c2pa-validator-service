# Architecture

## Current first implementation

The Mac application uses Electron for its window and local media preview. A separate Node.js module calls the official pinned `@contentauth/c2pa-node` reader. Keeping the reader contract independent of Electron makes the integration example reusable by another intake service or CLI.

The renderer has no Node integration. A narrow preload bridge exposes file selection and inspection, while a utility process performs validation so the window remains responsive. The app requires no localhost web server. A custom local protocol exposes only bundled frontend files and a random-token URL for the currently selected audio; the renderer cannot browse arbitrary files. Local playback supports byte-range requests.

`src/validator/` owns SDK configuration, explicit outcome mapping and declared history. `src/desktop/` owns process/window integration. `frontend/` owns the black intake interface, audio preview, graph and labelled demonstration sections.

Test Mode is explicit, off by default and session-only. It adds a fingerprint-checked public conformance test root to a separate offline SDK context; actual failures remain failures. Default inspection identifies its local policy without claiming an official trust-list implementation. Both contexts leave signature, trust and after-read verification enabled; remote-manifest and OCSP fetching are disabled.

AI detection returns a visibly simulated demonstration outcome. DDEX is an empty labelled placeholder. Neither influences real C2PA validation.

The static **How it works** tab explains the JavaScript/Node.js integration and the native Rust core behind `@contentauth/c2pa-node`, following the [CAI SDK overview](https://opensource.contentauthenticity.org/docs/introduction/). It separates our `inspectFile` adapter/report mapping from SDK validation. Tab navigation performs no inspection and changes no validation policy or results; Python and C/C++ are described only as alternative SDK bindings.

Supplied WAV/DOCX files remain outside source control. The wordmark is newly authored text, not an extracted corporate image. Dependencies, public test roots and borrowed code require license/source attribution.

## Reader contract

`inspectFile(path, { testMode: boolean })` returns schema version 1: file name/size/MIME/SHA-256, named offline policy, independent check states/evidence, active manifest summary, declared history, raw SDK JSON and timing. It does not return the source path. Check states are `pass`, `fail`, `warning`, `unknown` or `not-applicable`; report status separately distinguishes absent credentials, unreadable manifests and inspection errors. Explicit failures win over successes. Ingredient outcomes are not recursively attributed to the current asset. Additional SDK failures or an invalid SDK validation state produce a separate review flag even when the three displayed subchecks pass; three checks are not presented as full C2PA conformance.

The service accepts WAV/MP3 up to 256 MiB; waveform decoding is capped at 96 MiB. The desktop worker has a 45-second timeout and is replaced when a new inspection starts. UI revision counters prevent late results from replacing a newer selection. These are proof-of-concept limits, not a hardened multi-tenant ingestion service.

The history mapper translates canonical IPTC source types, preserves declared tools/instruments, and limits expansion to 128 nodes/eight levels with cycle notices. It does not infer a media origin from filenames, inspect external ingredient files, or implement the full Conformulator rubric system.

## Runtime and packaging

Electron, the native reader addon and the public test root are bundled in the Mac app. The native addon is unpacked from the application archive. Packaging allowlists runtime directories and excludes source audio/documents/keys; generated bundles and local reports are ignored by Git. Local builds are ad-hoc signed and verified; notarized public distribution is a separate release task. This initial bundle targets the build Mac's architecture and is roughly 300 MiB because it includes its desktop runtime.

No detector API, telemetry, web server, signing operation, watermark/fingerprint recovery or production supply-chain service is implemented.
