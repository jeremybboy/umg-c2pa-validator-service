# Public test trust anchor

This is the public C2PA Conformance Test Root embedded by Conformulator in
[`CertificateManager.svelte`](https://github.com/contentauth/c2pa-conformance-tool/blob/bfdfaf4a6ffe221f288ba78047886983bf41f3be/src/lib/CertificateManager.svelte),
constant `TEST_ROOT_CERT_PEM`; verified against the upstream source for this implementation.

Copyright 2026 Content Authenticity Initiative. Source licensed under Apache-2.0;
see `LICENSE.txt`. This repository includes only the public root, never a signing key.

Certificate SHA-256 fingerprint:
`41:BD:E3:25:75:33:13:FC:3D:C6:32:F1:8C:2B:7F:AD:E7:29:B9:4A:64:29:FE:E5:24:E3:47:11:0C:34:6D:BA`.

Enabled only in session-local Test Mode. No certificate is downloaded from an input asset
and promoted to trust. A successful test-chain result does not imply official-list trust
or C2PA product conformance. Updating the anchor requires source/fingerprint review.
