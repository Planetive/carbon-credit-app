# Emission Calculator Data Flow

This file explains how data moves through the calculator today.

It focuses especially on the current Scope 3 pattern because that is where the architecture is most active.

## Purpose

This file explains:

- how state flows through the calculator
- how `emissionData` sync works
- how save and load work
- how presentational components talk back to the parent

## High-level flow

```txt
User input
  ↓
section component
  ↓
parent update handler
  ↓
row state changes
  ↓
emissions recalculate
  ↓
emissionData sync
  ↓
save handler
  ↓
Supabase
```

## Current Scope 3 flow

Today many Scope 3 category components are presentational.

That means the flow usually looks like this:

```txt
Category UI
  ↓
onUpdateRow(...)
  ↓
Scope3Section updates rows
  ↓
totals and emissions update
  ↓
useEmissionSync or sync effect updates emissionData
  ↓
save handler writes to Supabase
```

## State owner

For the current Scope 3 migration, the main state owner is still:

- `src/components/emissions/scope3/Scope3Section.tsx`

Examples of state it owns:

- row arrays
- saving flags
- deleting flags
- active sub-flow state like `productType`

Why this matters:

- extracted UI sections stay simple
- behavior stays the same while UI moves

## Presentational component flow

A presentational category component usually gets:

- `rows`
- totals
- saving flags
- `onAddRow`
- `onUpdateRow`
- `onRemoveRow`
- `onSave`

Simple picture:

```txt
Presentational component
  ├─ reads props
  ├─ renders fields
  └─ calls callbacks

Parent component
  ├─ owns state
  ├─ recalculates data
  └─ saves to Supabase
```

## `emissionData` sync

The calculator also keeps a larger shared object:

- `emissionData`

This acts as a broader feature-level state object used across the calculator.

In Scope 3, sync usually works like this:

```txt
category row state
  ↓
sync effect / useEmissionSync
  ↓
setEmissionData(...)
  ↓
category entry inside emissionData.scope3 updates
```

Important point:

- extracted category UI does not usually write to `emissionData` directly
- the parent still controls that behavior

## Save flow

Typical save flow:

```txt
Save button click
  ↓
parent save handler
  ↓
build insert/update/delete payloads
  ↓
Supabase table write
  ↓
state refresh / db ids / success toast
```

In Scope 3 this is still mostly handled in `Scope3Section`.

## Load flow

Typical load flow:

```txt
active category changes
  ↓
useEffect runs
  ↓
Supabase query
  ↓
rows loaded into local state
  ↓
UI renders from that state
```

## Where hooks fit in

Current old-path hook example:

- `src/components/emissions/scope3/hooks/useEmissionSync.ts`

Hooks are useful because they can hold:

- sync logic
- loading logic
- feature-level state logic

Target direction:

```txt
UI
  ↓
feature hook
  ↓
adapter
  ↓
Supabase
```

## Where adapters fit in

Adapters should be the place where we translate between:

- UI state shape
- database shape

That keeps raw DB handling out of presentational components.

## Current state vs target state

### Current

```txt
UI component
  ↓
Scope3Section handler
  ↓
Scope3Section save/load logic
  ↓
Supabase
```

### Target

```txt
UI component
  ↓
feature hook
  ↓
adapter
  ↓
Supabase
```

## Best practices

- keep one clear state owner during migration
- do not duplicate save logic inside extracted UI components
- use callbacks from parent to child
- move data access into adapters when the UI is already stable

## What belongs in this file

- state flow
- sync flow
- save/load flow
- parent/child communication rules

## What should not belong in this file

- route design details
- folder placement rules not related to data flow

## Navigation

- Back: [`scope3.md`](./scope3.md)
- Next: [`state-management.md`](./state-management.md)
- Related: [`supabase.md`](./supabase.md)
