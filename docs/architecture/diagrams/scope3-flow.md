# Scope 3 Flow Diagram

## Purpose

This file shows how Scope 3 works today and what the target flow should be later.

## Current Scope 3 flow

Paste this into Graphviz Online:

```dot
digraph CurrentScope3Flow {
  rankdir=TB;
  node [shape=box style="rounded,filled" fontname="Arial"];

  UserInput [label="User edits category UI", shape=ellipse, fillcolor="#ECEFF1"];
  CategoryComponent [label="Extracted category component", fillcolor="#C8E6C9"];
  ParentHandler [label="Scope3Section handler", fillcolor="#FFCCBC"];
  ParentState [label="Scope3Section state update", fillcolor="#FFCCBC"];
  Recalc [label="Recalculate emissions", fillcolor="#FFCCBC"];
  Sync [label="Sync to emissionData", fillcolor="#FFCCBC"];
  Save [label="Save handler", fillcolor="#FFCCBC"];
  Supabase [label="Supabase", shape=cylinder, fillcolor="#E1BEE7"];

  UserInput -> CategoryComponent;
  CategoryComponent -> ParentHandler;
  ParentHandler -> ParentState;
  ParentState -> Recalc;
  Recalc -> Sync;
  Sync -> Save;
  Save -> Supabase;
}
```

## Current real paths

```txt
features/emission-calculator/scope3/categories/*
  ↓ props + callbacks
components/emissions/scope3/Scope3Section.tsx
  ↓
supabase.from(...)
```

## Current detailed picture

```txt
Presentational section
  ↓
onUpdateRow / onAddRow / onSave
  ↓
Scope3Section
  ├─ owns rows
  ├─ owns saving flags
  ├─ owns load/save logic
  ├─ owns useEmissionSync
  └─ writes to Supabase
```

## Target Scope 3 flow

Paste this into Graphviz Online:

```dot
digraph TargetScope3Flow {
  rankdir=TB;
  node [shape=box style="rounded,filled" fontname="Arial"];

  UserInput [label="User edits category UI", shape=ellipse, fillcolor="#ECEFF1"];
  CategoryUI [label="Scope 3 category section", fillcolor="#C8E6C9"];
  FeatureHook [label="Feature hook", fillcolor="#C8E6C9"];
  Adapter [label="Scope 3 adapter", fillcolor="#C8E6C9"];
  SupabaseClient [label="integrations/supabase/client", fillcolor="#E1F5FE"];
  Supabase [label="Supabase", shape=cylinder, fillcolor="#E1BEE7"];

  UserInput -> CategoryUI;
  CategoryUI -> FeatureHook;
  FeatureHook -> Adapter;
  Adapter -> SupabaseClient;
  SupabaseClient -> Supabase;
}
```

## Target detailed picture

```txt
Category UI
  ↓
category hook
  ↓
adapter
  ↓
Supabase
```

## Why this target is better

- UI stays simple
- save/load logic is easier to test
- data access is easier to reuse
- one huge orchestrator becomes smaller

## Navigation

- Back: [`high-level-architecture.md`](./high-level-architecture.md)
- Next: [`feature-boundary.md`](./feature-boundary.md)
- Related: [`../emission-calculator/scope3.md`](../emission-calculator/scope3.md)
