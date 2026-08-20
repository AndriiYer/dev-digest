# Insights — reviewer-core

- **Consumed as source, never built.** `server` type-checks/imports this
  package's `src/` directly via a tsconfig path alias — `npm run build` is
  `tsc --noEmit` and produces no `dist/`. Don't assume a compiled artifact
  exists anywhere.
- **Deliberately on npm, not pnpm.** CI (`.github/workflows/reviewer-core.yml`,
  `server-unit.yml`) runs `npm ci` here explicitly before touching `server`,
  since `server` depends on this package's `node_modules` being present even
  though it only imports source files.
