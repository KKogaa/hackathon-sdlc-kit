---
applyTo: "api/**"
description: Pragmatic hexagonal architecture for the backend, whichever stack. Kickoff points applyTo at the backend folder.
---

# Backend architecture: pragmatic hexagonal

The domain and the use cases sit in the middle and know nothing about HTTP, the database or the LLM provider. Those are **adapters** that plug into **ports**. *Pragmatic* means: only the ports and layers that earn their place in a time-boxed project. The stack files (`fastify` or `quarkus`) say how each piece looks in that framework.

## Layout: by feature first, then by layer

One folder (or package) per feature, matching the OpenSpec change it comes from. Inside it, always the same layers:

```
<feature>/
  domain/        entities and value objects, business rules, domain errors. Pure code.
  application/   one use case per user action (create-item, list-items), and ports.ts / the port interfaces it needs
  adapters/
    http/        routes or resources: request -> use case -> response, matching the Contracts
    persistence/ the repository port's implementation (database), plus an in-memory one
    <service>/   one per external service (llm, payments...), implementing its port
shared/          base errors, config, clock and id ports. Small: if only one feature uses it, it belongs there.
```

The app's entry point (the **composition root**) is the only place that creates adapters and wires them into use cases.

## The dependency rule

- `domain` imports nothing outside the language's standard library and `shared/` errors: no framework, ORM, HTTP or SDK types, no annotations.
- `application` imports `domain` and its own ports. Never an adapter, never the framework's request or response types.
- `adapters` import `application` and `domain`. Features don't import each other's adapters. If feature A needs B, it calls B's use case or goes through a port.
- When a rule is in the way, the code is in the wrong layer: move it, don't break the rule.

## What to make a port (and what not to)

- **A port per thing outside the process:** the database, each external API or LLM, and time or ids when a rule depends on them. Defined by the use case, in its terms (`ItemRepository.findOverdue()`), not in the database's (`query(sql)`).
- **No port for the use cases themselves.** HTTP adapters call the use case class or function directly. No input-port interfaces, no command buses.
- **Thin features stay thin.** A plain read or a CRUD action with no rules can have a use case that just calls the repository, and no `domain` folder. Add the domain layer when the first business rule appears.
- One use case per user action, named as a verb (`CreateItem`, `createItem`). It takes a plain input (a command record or object), returns a domain result or throws a domain error. It owns the transaction boundary.

## Models and mapping

- The HTTP adapter maps request DTOs (from the Contracts) to the use case input, and the result to the response DTO. The contract shape never leaks into `domain`, so a contract change touches only the adapter.
- Persistence models (ORM entities, table rows) stay in `adapters/persistence` and are mapped to domain objects there.
- Mapping is a small function next to the adapter. No mapping framework.

## Errors

- The domain and use cases throw domain errors (`ItemNotFound`, `InvalidQuantity`) that say what went wrong in business terms, without HTTP status codes.
- The one error mapper in the HTTP layer turns them into the documented error shape and status.
- Adapters for external services turn failures (timeouts, 5xx) into a domain-level error or the demo fallback. A provider's SDK exception never reaches a use case.

## Tests, and why this helps parallel work

- **Use cases get unit tests** with in-memory adapters for their ports: no framework, no server, no network, milliseconds each. Most WHEN/THEN scenarios are tested here.
- **HTTP adapters get a few tests through the framework** (`app.inject` or `@QuarkusTest`): status, body shape, validation errors.
- **Persistence and external adapters** get a test against the real thing when it's cheap (a test database), otherwise they're covered by the demo smoke test.
- The in-memory adapters also let the backend serve the Contracts before the database exists, so the frontend can integrate early, and a task group can split cleanly into *use case + in-memory adapter* and *database adapter*, in different files.
