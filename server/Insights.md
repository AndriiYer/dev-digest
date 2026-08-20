# Insights — server

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
