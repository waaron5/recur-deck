# Capability probe (throwaway)

Evidence asset for [Verify the selected account's execution and file capabilities](../../issues/09-verify-account-capabilities.md). Not part of the workflow package.

- `SKILL.md`: the probe skill's instructions as uploaded.
- `probe.src.js`: unbundled source. Tests the sandbox runtime, tools, PptxGenJS, network egress (Node fetch and curl), image downloads, a 4-slide PPTX with speaker notes, re-open, and LibreOffice rendering.

## Rebuild the uploaded ZIP

claude.ai rejects skill ZIPs with more than 200 files, so a vendored `node_modules` (280 files) cannot ship. Bundle to one file instead:

```sh
mkdir -p build/recur-capability-probe/{scripts,assets}
cp SKILL.md build/recur-capability-probe/
cp "../../../../Recur x US Fleet Tracking_vS/Slide4.png" build/recur-capability-probe/assets/fixed-slide-4.png
npm install pptxgenjs@4.0.1
npx esbuild@0.25.10 probe.src.js --bundle --platform=node --target=node18 --outfile=build/recur-capability-probe/scripts/probe.js
(cd build && zip -qr ../recur-capability-probe.zip recur-capability-probe)
```

Result: 3 files, about 190 KB zipped.
