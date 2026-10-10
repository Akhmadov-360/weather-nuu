# Computed-style snapshot tool

Proves "no visible change" across a CSS refactor (used for the Tailwind v4 migration).

1. `node scripts/style-snapshot/receiver.mjs .superpowers/style-snapshots/before`
2. Open the app, paste `capture.js` into the console, then `await captureStyles('room-dark-1440')`.
3. Repeat on the migrated build with another output dir.
4. `node scripts/style-snapshot/diff.mjs .superpowers/style-snapshots/before .superpowers/style-snapshots/after`

Exit code 1 when anything differs. Canvas (ECharts) content is not compared.
