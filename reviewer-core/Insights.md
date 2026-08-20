# Insights — reviewer-core

Section structure and recording rules: see the `engineering-insights` skill
(`../.claude/skills/engineering-insights/SKILL.md`).

## What Works

_None yet._

## What Doesn't Work

_None yet._

## Codebase Patterns

- **Consumed as source, never built.** `server` type-checks/imports this
  package's `src/` directly via a tsconfig path alias — `npm run build` is
  `tsc --noEmit` and produces no `dist/`. Don't assume a compiled artifact
  exists anywhere.
- **Deliberately on npm, not pnpm.** CI (`.github/workflows/reviewer-core.yml`,
  `server-unit.yml`) runs `npm ci` here explicitly before touching `server`,
  since `server` depends on this package's `node_modules` being present even
  though it only imports source files.

## Tool & Library Notes

_None yet._

## Recurring Errors & Fixes

_None yet._

## Session Notes

_None yet._

## Open Questions

_None yet._
