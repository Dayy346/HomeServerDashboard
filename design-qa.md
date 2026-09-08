# Design QA — Dayyan's HomeLab

## Comparison target

- Source visual truth: `C:\Users\dayya\.codex\generated_images\01a0819d-8146-76f0-b71e-27e8386a7c1d\exec-49dfc14d-8821-4ce2-9fd6-05c9923ffcd4.png`
- Source pixels: 1488 × 1058 (desktop dashboard mock).
- Implementation: browser-rendered `http://localhost:3000/` in the Codex in-app browser.
- Implementation capture: in-app browser visual capture, desktop viewport 1440 × 1024 CSS pixels at device scale 1; captured 2026-09-08.
- State: host API connected on the Windows development PC; Docker, Linux mounts, and NVIDIA telemetry intentionally unavailable on this machine. The UI showed the designed empty/error states for those server-only features.

## Full-view comparison

Both views use the same black-first command-center hierarchy: narrow rail navigation, compact host-status strip, a dominant left NVIDIA telemetry area, a Docker fleet area on the right, and a live-log surface below the primary telemetry. The implementation retains the source’s restrained blue signal color, green health indicator, graphite surfaces, thin dividers, and dense operational typography while using real API-driven content.

Focused comparison was required for the telemetry/fleet region and the live-log transition because they carry the source’s main hierarchy. The initial implementation placed the service-health panel below the CPU panel, pushing the log area too far below the 1024px fold. It was corrected by placing service health beneath the fleet panel, matching the source’s two-column rhythm; the refined desktop capture shows the log toolbar at the fold.

## Findings

- [P3] Live Linux-only content could not be exercised on the development PC.
  Location: NVIDIA charts, Docker fleet/log selection, storage mounts, and network-rate fields.
  Evidence: the rendered Windows state correctly presents missing NVIDIA values and the actionable Docker access message; the source uses populated Linux data.
  Impact: visual fidelity of populated rows and container terminal interaction remains a server verification item, not a layout defect.
  Fix: deploy the backend directly on the homelab, confirm its service user belongs to the `docker` group, then verify with active AI/Docker workloads.

- [P3] The implementation uses the project’s system font stack instead of the source mock’s rendered display font.
  Location: title and dense secondary labels.
  Evidence: hierarchy, weight, scale, and all-caps tracking closely match the mock, but browser font rendering naturally differs from the generated reference.
  Impact: minor only; the operational density and contrast remain strong.
  Fix: optional future pass with a self-hosted technical sans font if a stronger typographic signature is desired.

## Required fidelity surfaces

- Fonts and typography: clear display hierarchy, compact all-caps metadata, legible 11–16px operational copy, truncation on long container names, and monospaced logs. P3 font-family difference noted above.
- Spacing and layout rhythm: two-column telemetry/fleet composition, thin gutters, aligned status strip, and the corrected log placement preserve the source’s visual rhythm.
- Colors and visual tokens: pure-black background, graphite surfaces, off-white text, muted blue telemetry, and green health states are consistently tokenized in `globals.css`.
- Image quality and asset fidelity: the source has no standalone raster assets. Standard interface icons use the Phosphor icon library; no hand-drawn SVG or CSS art substitutes were used.
- Copy and content: title is exactly `Dayyan's HomeLab`; labels describe live host, Docker, and AI-workload operations and expose actionable unavailable states.

## Interaction and accessibility checks

- Tested sidebar Downloads navigation, live polling state, responsive mobile layout at 390 × 844, and desktop layout at 1440 × 1024.
- The terminal action gives a copied, explicit `docker exec` command rather than attempting an unsafe embedded browser shell.
- Buttons include accessible names; terminal modal has dialog semantics and a labelled close control; status color is accompanied by text.
- Browser console was checked: no frontend console errors were present.

## Implementation checklist

- [x] Recreate the selected black-first command-center direction.
- [x] Add real-time GPU/CPU client chart sampling.
- [x] Add host uptime, load, storage-mount, and network-rate backend data.
- [x] Add Docker fleet, log-reading, service-health, and terminal-command workflows.
- [x] Preserve Pi-hole, downloads, quick links, and OS updates.
- [x] Verify type-check, lint, production build, desktop browser render, and mobile layout.

## Final result

final result: passed
