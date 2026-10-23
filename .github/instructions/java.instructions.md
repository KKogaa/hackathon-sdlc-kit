---
applyTo: "**/*.java"
description: Java coding standards, used when the backend is Java + Quarkus.
---

# Coding standards: Java

Java 21 LTS or newer, as `scaffold` set it in the build. Use the modern language: this is not Java 8.

## Language

- **Records** for DTOs, value objects, request and response bodies, and config groups. No Lombok.
- `sealed` interfaces plus records for closed sets of alternatives, handled with an exhaustive `switch` expression and pattern matching.
- `switch` expressions over `if`/`else` chains on one value. Text blocks for multi-line strings (SQL, prompts).
- `var` for local variables when the type is obvious from the right-hand side. Not for fields, parameters or return types.
- Fields `private final` by default. Prefer immutable objects and `List.of`, `Map.of`, `stream().toList()`.

## Null and Optional

- Never return `null` for a collection: return an empty one.
- `Optional` only as a return type for "maybe not found". Never as a field or parameter, never `Optional.get()` without a check: use `orElseThrow(() -> new NotFoundException(...))`.
- Validate required inputs at the boundary (Bean Validation), so the inside of the code can assume non-null.

## Exceptions

- Throw unchecked, domain-specific exceptions (`ItemNotFoundException extends RuntimeException`) with a message that says what failed and for which id.
- Don't catch `Exception` or `Throwable` except at the one place that maps errors to responses. Never catch and ignore, and never `e.printStackTrace()`.
- When you wrap, keep the cause: `throw new UpstreamException("LLM call failed", e)`.
- `try`-with-resources for anything closeable.

## Structure and naming

- Package by feature first (`com.example.app.items`), then by the hexagonal layers inside it (`domain`, `application`, `adapters.*`), as `backend-architecture.instructions.md` describes.
- Classes `PascalCase`, methods and fields `camelCase`, constants `UPPER_SNAKE_CASE`. Names say intent: `findOverdueInvoices`, not `getData`.
- Small classes with one job. Keep methods short and avoid more than about 3 parameters: pass a record instead.
- Streams for simple transforms. A plain loop is fine when it's clearer, and never put side effects inside `map`.
- Time: `java.time` (`Instant` for timestamps, `LocalDate` for dates), never `Date` or `Calendar`. Money: `BigDecimal` or long minor units, never `double`.

## Formatting and tests

- Follow the formatter the build configures, and don't reformat code you didn't change.
- JUnit 5 with AssertJ (or Hamcrest through RestAssured). Test names say the scenario: `returns404WhenItemDoesNotExist`.
