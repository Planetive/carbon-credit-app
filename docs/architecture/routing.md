# Routing

This file explains how routing works today and what the target routing setup looks like.

## Purpose

Use this file to understand:

- why `src/App.tsx` still imports from `src/pages/`
- why `pages/` still exists
- how thin routing works
- what we want routing to look like at the end of the migration

## Current routing model

The app still enters through:

- `src/App.tsx`

That file owns:

- route paths
- layout wrapping
- protected routes
- redirects

Examples of real routes:

- `/emission-calculator-uk`
- `/emission-calculator-epa`
- `/emission-history`
- `/esg-management/*`
- `/admin/*`

## Current route flow

```txt
Browser
  ↓
App.tsx
  ↓
pages/*
  ↓
features/*   or   legacy page code
```

This means `pages/` is currently acting as a route adapter layer.

## Why `pages/` still exists

We did not remove `pages/` immediately because that would have forced a large, risky route rewrite.

Keeping `pages/` gave us a safer migration path:

- keep route imports stable
- keep `App.tsx` mostly unchanged
- move one feature at a time
- reduce risk while big files were being split

## Thin routing

Thin routing means the route file should not do heavy business work.

A thin route file should usually look like:

```txt
Route path
  ↓
Small page file
  ↓
Feature screen
```

Real examples:

- `src/pages/EmissionCalculator.tsx`
- `src/pages/EmissionHistory.tsx`
- `src/pages/ESGHealthCheck.tsx`

These now mostly point into `src/features/...`.

## What belongs in routing

- route paths
- route guards
- redirects
- layout wrappers
- entry-level composition

## What should not belong in routing

- large save handlers
- feature-level calculations
- long data loading chains
- deeply nested business state

## Protected route flow

The app uses wrappers such as:

- `ProtectedRoute`
- `CompanyProtectedRoute`
- `AdminProtectedRoute`
- `PermissionProtectedRoute`

Simple picture:

```txt
App.tsx route
  ↓
ProtectedRoute
  ↓
page or feature screen
```

This is good because access rules stay close to routing instead of being repeated inside every feature screen.

## Current mixed state

Routing is currently mixed in a practical way:

### Thin route entries already in place

- auth screens
- admin screens
- ESG readiness
- many ESG management pages
- UK calculator entry
- result/history routes

### Still-large route files

- `src/pages/EmissionCalculatorEPA.tsx`
- some dashboard and project-related pages
- finance facilitated pages

## Target routing model

At the end, routing should feel like this:

```txt
App.tsx
  ↓
thin route modules
  ↓
feature-owned screens
```

That can be done in two acceptable ways:

### Option A: keep `pages/` as thin route adapters

Example:

- `src/pages/EmissionCalculator.tsx`
  just re-exports
- `src/features/emission-calculator/methodologies/uk/UKCalculatorScreen.tsx`
  owns the real screen

### Option B: import feature screens directly in `App.tsx`

This removes most of the route adapter layer.

Both are acceptable. The main goal is the same:

- routing stays thin
- feature code owns behavior

## Best practices

- If a route file starts growing, move logic into `features/`
- Keep route-level wrappers in routing
- Prefer one clear feature screen per route
- Use redirects for URL compatibility instead of duplicating screens

## What belongs in this file

- route architecture
- routing responsibilities
- migration direction

## What should not belong in this file

- per-feature detailed state handling
- deep Scope 3 save/load details

## Navigation

- Back: [`folder-structure.md`](./folder-structure.md)
- Next: [`shared-platform.md`](./shared-platform.md)
- Related ADR: [`decisions/ADR-003-thin-routing.md`](./decisions/ADR-003-thin-routing.md)
