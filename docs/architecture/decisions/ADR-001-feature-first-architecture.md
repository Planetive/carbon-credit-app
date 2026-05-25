# ADR-001: Feature-First Architecture

## Context

The frontend grew over time with a lot of logic in:

- `src/pages/`
- `src/components/emissions/`

That made it harder to see which code belonged to which business area.

At the same time, the product grew into several clear domains:

- emission calculator
- ESG management
- ESG readiness
- admin
- auth

## Problem

The older structure made it too easy for domain logic to spread across route files and shared folders.

That led to:

- large files
- weak ownership boundaries
- harder onboarding
- slower refactors

## Decision

We will move business-owned frontend code into `src/features/`.

Feature folders should own:

- screens
- hooks
- adapters
- feature types
- domain-specific components

Route files in `src/pages/` should become thin over time.

## Consequences

### Good

- better ownership
- easier onboarding
- easier refactoring
- cleaner file placement

### Trade-off

- migration takes time
- old and new structures coexist for a while
- re-export stubs are needed during the transition

## Future Direction

- continue moving feature-owned code into `src/features/`
- keep reducing heavy logic in `pages/` and legacy component paths
- treat `features/` as the default home for new business logic

## Related docs

- [`../README.md`](../README.md)
- [`../principles.md`](../principles.md)
