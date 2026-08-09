# AGENTS.md

## Layout

- The actual project lives in `be-ticketing/` (this directory). The repo root (`C:\be-ticketing`) contains only a stray empty `package-lock.json` — ignore it; always run commands with `workdir` = `be-ticketing`.
- Stock NestJS 11 starter: no custom app code yet (`src/` has only the scaffold `AppModule`/`AppController`/`AppService`). `README.md` is the unmodified NestJS boilerplate — do not trust it for repo specifics.

## Commands (run in `be-ticketing/`)

- `npm run start:dev` — watch-mode dev server (port: `process.env.PORT ?? 3000`, see `src/main.ts`)
- `npm run test` — unit tests (Jest, `rootDir: src`, matches `*.spec.ts`)
- `npm run test:e2e` — e2e via `test/jest-e2e.json` (supertest against the compiled app)
- `npm run lint` — ESLint with `--fix`; scoped to `{src,apps,libs,test}/**/*.ts`
- `npm run build` — `nest build` (emits to `dist/`, deletes it first via `nest-cli.json`)
- `npm run format` — Prettier (single quotes, trailing commas per `.prettierrc`)

## Conventions / gotchas

- Scaffold new modules/controllers/services with `npx nest g <schematic> <name>` so files land in `src/` per `nest-cli.json`.
- Unit tests live next to source as `*.spec.ts`; e2e specs go in `test/*.e2e-spec.ts` (jest-e2e.json runs only `.e2e-spec.ts$`).
- ESLint runs type-aware rules (`recommendedTypeChecked`), but `@typescript-eslint/no-explicit-any` is off — `any` is allowed.
- TypeScript uses `module`/`moduleResolution: nodenext`; `strictNullChecks` is on but `noImplicitAny` is off.
