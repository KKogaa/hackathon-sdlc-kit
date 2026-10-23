---
applyTo: "**/*.ts,**/*.tsx,**/*.mts,**/*.cts"
description: TypeScript coding standards, for the frontend and for a TypeScript (Fastify) backend.
---

# Coding standards: TypeScript

## Compiler and tooling

- `tsconfig` has `"strict": true`, `"noUncheckedIndexedAccess": true` and `"noImplicitOverride": true`. Never loosen them to make an error go away.
- ESM everywhere (`"type": "module"`). Lint with typescript-eslint, format with Prettier. Run them through the Commands table, never with your own flags.
- `tsc --noEmit` must pass: the type check is part of `check`, and it is what catches a lane drifting from the Contracts.

## Types

- No `any`. Use `unknown` at the edge and narrow it, or parse it with the schema. `as` casts only where you can explain why in a comment.
- No non-null assertions (`!`) to silence the compiler. Handle the `undefined`.
- Types for API data come from the shared contract schemas (`z.infer<typeof X>`), never redeclared by hand in a lane.
- Model alternatives as discriminated unions (`{ status: "ok"; data } | { status: "error"; error }`), not optional fields that only make sense together.
- Use string-literal unions or `as const` objects, not `enum`.
- `type` for unions and shapes, `interface` only when you need declaration merging or `extends` reads better. Be consistent within a file.
- Mark what shouldn't change as `readonly`. Don't mutate function arguments.
- Annotate exported functions' parameters and return types. Let inference do locals.

## Code

- Named exports, one main thing per file. No default exports (except where a framework requires one).
- `import type` for type-only imports.
- `async`/`await`, never `.then` chains. No floating promises: every promise is awaited, returned or explicitly `void`ed with a reason.
- Throw `Error` (or a subclass with a `code`), never strings or plain objects. Catch only where you can handle the error or add context.
- `const` by default, `let` only when reassigned, never `var`. `===` always.
- Prefer `map`, `filter` and early returns to index loops and flag variables. Keep it readable over clever.
- Dates cross boundaries as ISO 8601 strings. Money as integer minor units (cents) or a decimal string, never a float.
- Env vars are read and validated once in a `config` module, then imported. No `process.env.X` scattered through the code.

## Naming

- `camelCase` for values and functions, `PascalCase` for types and components, `UPPER_SNAKE_CASE` for true constants.
- Files: `kebab-case.ts`, except React components (`UserCard.tsx`). Tests sit next to the code: `thing.test.ts`.
