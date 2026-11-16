# Local verification — first implementation

Checked on an Apple Silicon Mac on 2026-11-16 using Node 24.14.0, Electron 45.3.3 and `@contentauth/c2pa-node` 0.12.0, pinned in the lockfile.

- **11/11 reader/model tests passed**, including the optional supplied signed-WAV regression: valid binding/signature/test trust, default trust comparison, real PCM-byte alteration detected, and unchanged source SHA-256.
- A generated unsigned MP3 also produced the expected no-credentials/N/A outcome through the real SDK.
- The packaged app passed actual-window automation for file import, waveform/player metadata readiness, default-off Test Mode, unsigned N/A in Test Mode, renderer isolation, scripted AI analysis, DDEX placeholder, signed-file trust switching, raw-manifest dialog, graph expansion/zoom/Fit and minimum-window layout.
- JavaScript syntax, whitespace and staged-public-file checks passed; the Mac application was ad-hoc signed and verified.
- Intake, signed-file and graph screenshots were visually inspected. Only the empty intake screenshot is published; captures containing supplied-file metadata remain local and ignored.

This evidence does not establish audible playback quality, physical trackpad behavior, every external producer's credentials, online revocation checking, official-list trust or enterprise integration readiness. The signed asset remains local: CI runs generated-file tests and explicitly skips the optional signed-file/graph integration when `C2PA_TEST_ASSET` is unset. Remaining manual checks are in `testing.md`.
