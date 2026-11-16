# Architecture

## Planned first implementation

The Mac application will use Electron for its window and local media preview. A separate Node.js module will call the official `@contentauth/c2pa-node` reader. Keeping the reader contract independent of Electron makes the integration example reusable by another intake service or CLI.

The renderer will have no Node integration. A narrow preload bridge will expose file selection and inspection, while a worker performs validation so the window remains responsive. The app will not require a localhost web server.

`src/validator/` owns SDK configuration, explicit outcome mapping and declared history. `src/desktop/` owns process/window integration. `frontend/` owns the black intake interface, audio preview, graph and labelled demonstration sections.

Test Mode will be explicit, off by default and session-only. It will add a pinned public conformance test root to a separate offline SDK context; actual failures remain failures. Default inspection will identify its policy without claiming an official trust-list implementation.

AI detection will return a visibly simulated demonstration outcome. DDEX will be an empty labelled placeholder. Neither will influence real C2PA validation.

Supplied WAV/DOCX files remain outside source control. The wordmark is newly authored text, not an extracted corporate image. Dependencies, public test roots and borrowed code require license/source attribution.
