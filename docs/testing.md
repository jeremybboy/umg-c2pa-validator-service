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
6. Open **How it works**, between Content Credentials and AI Detection. Follow audio → our Node service → existing Rust-backed SDK → report; expand **Under the hood**, then return and confirm the validation results are unchanged.
7. Open AI Detection and run its simulation. Its result must say **Simulated**; switching tabs must not alter C2PA evidence.
8. Open DDEX. It is a visibly empty illustrative placeholder.
9. Try unsigned and malformed audio. No credentials and inspection errors must remain distinct; neither implies an AI verdict.
10. Quit and reopen: Test Mode starts off and no previous audio file is reopened automatically.

## Suggested 40-second recording

- 0–8 seconds: show the intake screen and drop the audio file.
- 8–18 seconds: show the three checks, enable Test Mode and point to the explicit test-certificate label.
- 18–28 seconds: open **How it works** and show the existing SDK inside the integration flow.
- 28–36 seconds: return to credentials, expand the ingredient tree and select an ingredient.
- 36–40 seconds: show the labelled AI simulation and DDEX placeholder as adjacent modules.

Takeaway: the real reader is one independent module in an illustrative intake workflow.
