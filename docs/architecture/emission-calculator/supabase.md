# Supabase in the Emission Calculator

This file explains how the calculator talks to Supabase.

## Purpose

Use this file to understand:

- where Supabase access starts
- what is shared vs feature-specific
- how Scope 3 currently saves and loads data

## Shared integration layer

The shared client lives in:

- `src/integrations/supabase/client.ts`

This is the common entry point for database access.

It is shared across many parts of the app.

## Current calculator pattern

Today, some feature data logic still talks to Supabase directly from larger components.

Scope 3 is the clearest example:

- `src/components/emissions/scope3/Scope3Section.tsx`

That file still contains category save/load behavior for several tables.

## Current save/load shape

```txt
UI action
  ↓
Scope3Section handler
  ↓
supabase.from(...)
  ↓
table write or read
  ↓
local state update
```

## Why this is only a partial end state

This works, but it is not the cleanest long-term structure.

The problem is that one large UI owner also becomes a data-access owner.

That makes the file harder to maintain.

## Better target shape

```txt
UI component
  ↓
feature hook
  ↓
adapter
  ↓
supabase client
  ↓
table
```

## Current real examples

Shared client:

- `src/integrations/supabase/client.ts`

Current finance Scope 3 adapter:

- `src/features/scope3/adapters/scope3SupabaseAdapter.ts`

Current transitional calculator owner:

- `src/components/emissions/scope3/Scope3Section.tsx`

## What belongs in adapters

Adapters should usually own:

- query shapes
- insert/update payload mapping
- table-specific conversions
- DB response normalization

## What should not stay inside large UI files forever

- repeated `supabase.from(...)` flows
- payload mapping for many categories
- database shape decisions mixed with JSX

## Best practices

- keep the shared client setup in `integrations/`
- move feature-specific persistence into feature adapters over time
- keep UI components unaware of raw table details when possible

## What belongs in this file

- database interaction shape
- shared client vs feature adapter responsibilities

## What should not belong in this file

- deep schema documentation for every table
- unrelated backend setup

## Navigation

- Back: [`state-management.md`](./state-management.md)
- Next: [`migration-history.md`](./migration-history.md)
