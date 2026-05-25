# Planetive Architecture Docs

This folder explains how the frontend is structured today, why it looks this way, and where we are taking it next.

These docs are written for two groups:

- new developers who need to understand the codebase fast
- managers who want to see the direction of the system

## Purpose

This documentation should help you answer simple questions quickly:

- Where should new code go?
- Why do we still have both `pages/` and `features/`?
- Why is `Scope3Section` being split up?
- How does data move from UI to Supabase?
- What is the target architecture after the migration is finished?
- Where do site-wide tags like Google Analytics live?

## The short version

The app is moving from a route-first structure to a feature-first structure.

Old style:

- large route files in `src/pages/`
- large shared orchestrator files like `src/components/emissions/scope3/Scope3Section.tsx`
- business logic spread across many places

Current style:

- routes still enter through `src/App.tsx`
- many route files in `src/pages/` are now thin stubs
- real feature code is moving into `src/features/`
- Scope 3 UI is being extracted category by category

Target style:

- routes stay thin
- features own their screens, hooks, adapters, and types
- shared folders stay generic
- giant orchestration files are replaced with smaller feature-owned parts

## Architecture in one picture

```txt
Browser
  ↓
App.tsx
  ↓
pages/                ← route entry points, often thin
  ↓
features/             ← business logic and feature-owned screens
  ↓
shared platform       ← contexts, shared UI, hooks, utilities
  ↓
integrations/supabase
  ↓
Supabase
```

Current Scope 3 still has one bridge layer:

```txt
UKCalculatorScreen
  ↓
components/emissions/scope3/Scope3Section
  ↓
features/emission-calculator/scope3/categories/*
  ↓
Supabase
```

## What exists today

- `src/App.tsx` still owns routing
- `src/pages/` still exists because it keeps route imports stable while we migrate
- `src/features/` now holds most new architecture work
- `src/components/emissions/` still contains some legacy bridge files and orchestrators
- `src/integrations/supabase/` is the shared database client layer

Real examples:

- `src/pages/EmissionCalculator.tsx` is now a thin stub
- `src/features/emission-calculator/methodologies/uk/UKCalculatorScreen.tsx` holds the real UK calculator screen
- `src/components/emissions/scope3/Scope3Section.tsx` still owns a lot of Scope 3 logic
- `src/features/emission-calculator/scope3/categories/` now holds extracted Scope 3 category UI
- `index.html` holds site-wide browser tags like Google Analytics, Search Console verification, favicon links, and organization metadata

## Why we moved away from giant files

Some files became too large and hard to change safely.

The best example is `Scope3Section`:

- many categories
- many state variables
- save and load logic
- calculations
- factor loading
- UI for many different workflows

That made onboarding slower and refactors risky.

So the migration strategy became:

1. move UI into feature-owned files
2. keep parent state in place at first
3. keep route paths stable
4. clean up logic ownership later

## What this docs set covers

- architecture rules: [`principles.md`](./principles.md)
- folder-by-folder explanation: [`folder-structure.md`](./folder-structure.md)
- routing setup: [`routing.md`](./routing.md)
- shared platform pieces: [`shared-platform.md`](./shared-platform.md)
- emission calculator docs: [`emission-calculator/overview.md`](./emission-calculator/overview.md)
- Scope 3 migration story: [`emission-calculator/scope3.md`](./emission-calculator/scope3.md)
- architecture diagrams: [`diagrams/high-level-architecture.md`](./diagrams/high-level-architecture.md)
- decision records: [`decisions/ADR-001-feature-first-architecture.md`](./decisions/ADR-001-feature-first-architecture.md)

## Best practices

- Start here, then read the calculator and Scope 3 docs if you work on emissions
- Use real paths from the codebase when discussing architecture
- Keep these docs updated when a migration phase changes the structure

## What belongs in this folder

- practical architecture explanations
- migration notes
- diagrams
- decisions and trade-offs
- onboarding-friendly examples

## What should not go here

- release notes
- product requirement documents
- API reference details that belong with the feature itself
- vague high-level language with no file examples

## Suggested reading order

1. [`README.md`](./README.md)
2. [`principles.md`](./principles.md)
3. [`folder-structure.md`](./folder-structure.md)
4. [`routing.md`](./routing.md)
5. [`emission-calculator/overview.md`](./emission-calculator/overview.md)
6. [`emission-calculator/scope3.md`](./emission-calculator/scope3.md)
7. [`emission-calculator/migration-history.md`](./emission-calculator/migration-history.md)

## Navigation

- Next: [`principles.md`](./principles.md)
- Calculator docs: [`emission-calculator/overview.md`](./emission-calculator/overview.md)
- Diagrams: [`diagrams/high-level-architecture.md`](./diagrams/high-level-architecture.md)
