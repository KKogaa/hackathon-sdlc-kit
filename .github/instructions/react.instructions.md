---
applyTo: "**/*.tsx,**/*.jsx"
description: React coding standards for the frontend. Design (tokens, components, states, accessibility) is in the role-frontend skill.
---

# Coding standards: React

Default stack, unless `## Project` in `AGENTS.md` says otherwise: React with Vite, React Router, TanStack Query for server data, Vitest and Testing Library. Use what `scaffold` installed. Don't add a state, styling or UI library without a decision.

## Components

- Function components and hooks only. One exported component per file, named like the file.
- Type props with a `Props` type next to the component. Destructure them in the signature.
- Keep components small: split when one does layout, data and logic at once. Pages compose; components render.
- Presentational components take data and callbacks as props. They don't fetch.
- Composition over configuration: pass `children` instead of adding a tenth boolean prop.
- In React 19, `ref` is a normal prop: no `forwardRef`.

## Data and state

- **Server data** goes through the typed API client and TanStack Query hooks, one hook per endpoint (`useItems`, `useCreateItem`), kept in one folder. Never `fetch` inside a component, and never copy server data into `useState`.
- Each query hook exposes loading, error and empty, and the screen renders all of them.
- After a mutation, invalidate the queries it affects instead of patching state by hand.
- **Local UI state** with `useState` or `useReducer`, as close to where it's used as possible. Lift it only when two siblings need it. Context only for truly app-wide values (theme, current user), not as a global store.
- Derive values during render. If you can compute it from props or state, it is not state.

## Effects

- `useEffect` is for syncing with something outside React (a subscription, a timer, the DOM). Not for fetching, not for derived state, not for reacting to an event (do that in the handler).
- Every effect has a correct dependency list and cleans up what it starts. Never silence `react-hooks/exhaustive-deps`.

## Rendering

- Lists use a stable `key` from the data (an id), never the array index for lists that change.
- No `useMemo`, `useCallback` or `memo` by default. Add them only for a measured problem or a hook dependency that must be stable.
- Semantic HTML first: `button` for actions, `a` for navigation, `label` for inputs, headings in order. A `div` with `onClick` is a bug.
- Forms: one form library if scaffold installed one (React Hook Form with the contract's Zod schema), otherwise controlled inputs. Validate with the same schema the API uses.

## Tests

- Vitest and Testing Library. Query like a user would: `getByRole`, `getByLabelText`, `getByText`. No test ids unless nothing else works, and no testing of internal state or hooks' internals.
- Mock the API client (or the network with MSW, if installed), never the component under test.
- Use `userEvent` for interactions and `findBy…` for async results. No arbitrary `waitFor` timeouts.
