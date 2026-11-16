# Security

This proof of concept reads untrusted media through a native C2PA SDK and previews audio locally. Use maintained runtimes; do not use this demo as a production approval gateway.

Report sensitive findings through GitHub's private security reporting when available, or contact the maintainer privately before opening a public issue. Do not include private audio, manifests, credentials or keys in public reports.

The intended runtime boundary is local media selection, a narrow desktop bridge and an independent validator worker. Renderer content must not gain arbitrary filesystem, network or shell access. Test certificates are public anchors for explicit Test Mode, not production trust.
