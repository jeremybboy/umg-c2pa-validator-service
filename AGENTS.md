# Repository contract

Build a local macOS music-intake demonstration with real C2PA inspection, explicitly simulated AI analysis and an illustrative DDEX section.

- After the one-time scaffold, work on a dedicated branch, stage explicit paths, commit and open a PR; the human owner merges.
- Never merge, force-push, broadly stage, delete user work, or push directly to main after bootstrap.
- Keep reusable validation under `src/validator/`, desktop integration under `src/desktop/` and browser-rendered UI under `frontend/`.
- Treat binding integrity, claim signature, signer trust, declared origin and AI detection as separate evidence.
- Test Mode may add pinned public test anchors only to its own context; no automatic trust of an asset's certificates and no disabled verification.
- Do not commit supplied audio, reports containing its metadata, corporate documents, signing keys, credentials, local paths or generated app bundles.
- The application must work locally without a server, cloud API, telemetry or AI detector connection.
- Before publishing: inspect the diff/changed paths, check whitespace, run applicable tests, verify packaged behavior and visually inspect UI/diagrams.
- Installation/run/test/package commands belong in README and package scripts once implemented.

See `docs/architecture.md` for boundaries and the implementation brief for acceptance criteria.
