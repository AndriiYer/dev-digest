# Insights — server

Section structure and recording rules: see the `engineering-insights` skill
(`../.claude/skills/engineering-insights/SKILL.md`).

## What Works

_None yet._

## What Doesn't Work

_None yet._

## Codebase Patterns

_None yet._

## Tool & Library Notes

_None yet._

## Recurring Errors & Fixes

- **`ERR_MODULE_NOT_FOUND` on fresh clone.** Caused by `reviewer-core`'s own
  `node_modules` not being installed — `server` imports its TS source
  directly via path alias, so it needs its deps present even though it's
  "just" a sibling package. `scripts/dev.sh` installs it now; if running
  `server` standalone, `npm ci` inside `reviewer-core/` first.
- **Empty `LOG_LEVEL` used to crash pino.** An unset/blank `LOG_LEVEL` env
  var is now tolerated (falls back to a default) — fixed alongside the
  above in `66727c8`.
- **Migrations are not auto-applied on boot.** A common "why is my new
  column missing" trap — always `pnpm db:migrate` after pulling schema
  changes.
- **`pnpm db:migrate`/`pnpm db:seed` silently did nothing on Windows.** Both
  scripts guarded their CLI entrypoint with `if (import.meta.url ===
  \`file://${process.argv[1]}\`)`. On Windows this never matches —
  `import.meta.url` is forward-slash + percent-encoded (`file:///C:/...`)
  while `process.argv[1]` is a raw backslash path (`C:\...`) — so the block
  never ran: the process exited 0 with zero output (no error, no "✓
  migrations applied") and applied no migrations. Confirmed via a direct
  `postgres.js` probe showing 0 tables in `public` despite a "successful"
  `db:migrate` run. Fixed in both `src/db/migrate.ts` and `src/db/seed.ts` by
  comparing against `pathToFileURL(process.argv[1]).href` (`node:url`)
  instead of the raw template literal — treat any other
  `import.meta.url === \`file://${...}\`` guard in this codebase as suspect
  on Windows.

## Session Notes

_None yet._

## Open Questions

_None yet._
