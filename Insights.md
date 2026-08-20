# Insights (root)

Project-wide gotchas and decisions worth knowing before touching more than
one package. Package-specific insights live in each package's own
`Insights.md` (linked from that package's `CLAUDE.md`).

- **Fresh clone won't boot without installing `reviewer-core`'s own deps.**
  `server` imports `reviewer-core`'s TypeScript source directly via a
  tsconfig path alias (never a built package) — if `reviewer-core/node_modules`
  is missing, the API crashes at boot with `ERR_MODULE_NOT_FOUND`.
  `scripts/dev.sh` now installs it automatically; if you bypass the script,
  run `npm ci` inside `reviewer-core/` yourself. Fixed in `66727c8`, `19287e7`.
- **DB migrations are not applied automatically on server boot.** Run
  `pnpm db:migrate` inside `server/` after pulling schema changes.
