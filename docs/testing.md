# Testing and a short demonstration

## Automated checks

```sh
npm ci
npm run check
npm test
npm run build:mac
npm run test:app
```

The signed-file regression is opt-in because supplied audio is not public:

```sh
C2PA_TEST_ASSET="/path/to/a-signed-test.wav" npm test
C2PA_TEST_ASSET="/path/to/a-signed-test.wav" npm run test:app
```

Use audio signed under the bundled Conformulator test root for that positive test. The test makes an altered temporary copy; it does not change the source. With no supplied fixture, the signed-asset tests are explicitly skipped, not reported as successful validation. Generated unsigned tones require no external audio.

App-test screenshots go to ignored `artifacts/ui/`; signed-file captures and exported reports can contain private manifest data and must not be committed.

## Manual acceptance

1. Open the built Mac app and drop signed WAV audio. Confirm the audio player works and preview does not alter the original file.
2. Under the default local policy, inspect binding and signature separately from signer trust.
3. Enable **Test Mode** for a file signed under the shared test root. Expect a dashed green trust result labelled **test certificate used**; switch it off to compare defaults.
4. Expand the graph. Pan, zoom, Fit, collapse a branch and select ingredients to view full titles, actions, tools and source declarations.
5. View the raw manifest and optionally export the local JSON report.
6. Open AI Detection and run its simulation. Its result must say **Simulated**; switching tabs must not alter C2PA evidence.
7. Open DDEX. It is a visibly empty illustrative placeholder.
8. Try unsigned and malformed audio. No credentials and inspection errors must remain distinct; neither implies an AI verdict.
9. Quit and reopen: Test Mode starts off and no previous audio file is reopened automatically.

## Suggested 40-second recording

- 0–8 seconds: show the intake screen and drop the audio file.
- 8–20 seconds: show the three checks, enable Test Mode and point to the explicit test-certificate label.
- 20–32 seconds: expand the ingredient tree and select an ingredient.
- 32–40 seconds: show the labelled AI simulation and DDEX placeholder as adjacent modules, then return to Content Credentials.

Takeaway: the real reader is one independent module in an illustrative intake workflow.
