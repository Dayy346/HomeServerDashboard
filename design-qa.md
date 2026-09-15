# Capacity gauges — design QA

Date: 2026-09-15

## Reference and implementation

- Reference: `C:\Users\dayya\AppData\Local\Temp\codex-clipboard-29149c47-c894-4be6-be74-e3beabc8e6d6.png`
- Implementation preview: `http://localhost:3000/` (reviewed in the Codex in-app browser)

## Checks

- The CPU and memory cards now use two compact semicircular gauges, replacing the two CPU/RAM time-series charts.
- The gauges have centered percentage labels and compact context: load average for CPU and used/total memory for RAM.
- Their warning colors change only at higher utilization, avoiding the repeated green “everything is fine” treatment from the previous screen.
- The compact storage summary again includes a fill bar, while the detailed mount bars remain in the storage section.
- On the narrow in-app preview, the two gauges stack cleanly without overflow; the existing 700px breakpoint preserves a single-column phone layout.
- The header, sidebar, Pi-hole, and container states no longer rely on repeated glowing green dots. Connection and service state use quiet neutral/purple labels instead.

## Result

Passed for layout and responsive behavior. The local preview has no local backend running, so its gauge values are placeholders; the actual live values will appear after the backend and frontend are deployed together on the homelab.
