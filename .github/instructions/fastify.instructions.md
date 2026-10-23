---
applyTo: "api/**/*.ts"
description: Fastify backend coding standards, used when the backend is TypeScript. Kickoff points applyTo at the backend folder.
---

# Coding standards: Fastify (TypeScript backend)

Use these only if `## Project` in `AGENTS.md` says the backend is TypeScript + Fastify. Stack: Fastify 5 on Node LTS, Zod through `fastify-type-provider-zod`, Vitest. Use the versions `scaffold` installed.

## App structure

The architecture is pragmatic hexagonal (`backend-architecture.instructions.md`). In Fastify:

- `buildApp(deps)` in `app.ts` is the **composition root**: it creates the adapters (or takes them from `deps`, which is how tests pass in-memory ones), builds the use cases with them, and registers each feature's routes. `server.ts` only calls `buildApp()` and `listen()`. Tests never open a port.
- Use cases are plain functions or classes in `<feature>/application/`, taking their ports as arguments: `createItem({ items, clock })`. They never import Fastify.
- Ports are TypeScript interfaces in `<feature>/application/ports.ts`. Adapters implement them: `DrizzleItemRepository`, `InMemoryItemRepository`.
- Each feature's `adapters/http/routes.ts` is a Fastify plugin that receives its use cases as plugin options and is registered with a prefix. Handlers stay thin: the schema validates, the handler maps the input, calls the use case, maps the result.
- Wrap a plugin in `fastify-plugin` only when it must share decorators or hooks with its parent (auth, request context). Pass use cases through options, not `decorate`, so each feature only sees what it uses.
- Close resources (DB pool, clients) in an `onClose` hook registered by the composition root.
- Config: parse `process.env` with a Zod schema once at startup, fail fast if it's invalid, and pass the typed config into `buildApp()`.

## Routes and the Contracts

- Every route declares `schema` with `body`, `querystring`, `params` and **`response`** for each status, built from the shared contract schemas. Use `.withTypeProvider<ZodTypeProvider>()` so the handler's types come from the schema.
- The `response` schema is the contract: Fastify serializes through it and **drops fields it doesn't declare**. If a field goes missing in the response, check the schema first.
- `async` handlers **return** the payload. Set the status with `reply.code(201)` before returning. Never mix `return` and `reply.send()` in one handler.
- Paths, methods, status codes and field names match `design.md` exactly.

## Errors

- One `setErrorHandler` maps errors to the documented error shape: validation errors to 400 with details, domain errors to their status, anything else to 500 with a generic message, logged with the full error.
- Use cases throw domain errors (`class ItemNotFound extends DomainError`), with no status code. The error handler maps each domain error class to its status in one table. Don't build error replies in each handler.
- Set a `setNotFoundHandler` that returns the same error shape.

## Logging and external calls

- Log with `request.log` (pino) inside requests and `app.log` outside, as objects: `request.log.info({ itemId }, "item created")`. No `console.log`.
- Outbound calls (LLM, third-party APIs) are adapters in `<feature>/adapters/<service>/` implementing a port, with a timeout (`AbortSignal.timeout(ms)`). Map their failures to a domain error, plus the demo fallback when the issue is `priority:p0`.
- CORS through `@fastify/cors`, limited to the frontend's origin from config.

## Tests

- **Use cases:** Vitest unit tests that call the use case with in-memory adapters. Most WHEN/THEN scenarios are tested here.
- **Routes:** `const app = await buildApp({ config, ...inMemoryDeps })` and `app.inject({ method, url, payload })`. Assert the status and the body against the contract schema, including a validation failure (400) for each route that takes input. Call `app.close()` after each test.
- Replace adapters by passing fakes into `buildApp()`, never with `vi.mock` of modules.
