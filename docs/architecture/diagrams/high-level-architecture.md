# High-Level Architecture Diagram

## Purpose

This file gives a quick picture of how the frontend is structured today and where the architecture is heading.

## Current high-level view

Paste this into Graphviz Online:

```dot
digraph CurrentHighLevelArchitecture {
  rankdir=TB;
  node [shape=box style="rounded,filled" fontname="Arial"];

  Browser [label="Browser", shape=ellipse, fillcolor="#ECEFF1"];
  App [label="App.tsx", fillcolor="#BBDEFB"];
  Pages [label="src/pages", fillcolor="#FFF9C4"];
  Features [label="src/features", fillcolor="#C8E6C9"];
  Shared [label="shared platform", fillcolor="#E1F5FE"];
  Integrations [label="integrations/supabase", fillcolor="#E1F5FE"];
  Supabase [label="Supabase", shape=cylinder, fillcolor="#E1BEE7"];
  EmissionsBridge [label="src/components/emissions", fillcolor="#FFCCBC"];

  Browser -> App;
  App -> Pages;
  Pages -> Features;
  Features -> Shared;
  Shared -> Integrations;
  Integrations -> Supabase;
  Pages -> EmissionsBridge;
  EmissionsBridge -> Features;
}
```

## What this means

- `App.tsx` still owns routes
- `pages/` still acts as a route adapter layer
- `features/` is the main home for business logic
- `components/emissions/` still contains a migration bridge, especially for Scope 3

## Current architecture in plain words

```txt
Browser
  ↓
App.tsx
  ↓
pages/
  ↓
features/
  ↓
shared platform
  ↓
Supabase
```

With one important bridge:

```txt
UKCalculatorScreen
  ↓
Scope3Section
  ↓
feature-owned Scope 3 category components
```

## Target high-level view

Paste this into Graphviz Online:

```dot
digraph TargetHighLevelArchitecture {
  rankdir=TB;
  node [shape=box style="rounded,filled" fontname="Arial"];

  Browser [label="Browser", shape=ellipse, fillcolor="#ECEFF1"];
  App [label="App.tsx", fillcolor="#BBDEFB"];
  ThinRoutes [label="thin route entries", fillcolor="#BBDEFB"];
  FeatureScreens [label="feature-owned screens", fillcolor="#C8E6C9"];
  HooksAdapters [label="feature hooks and adapters", fillcolor="#C8E6C9"];
  Shared [label="shared UI and contexts", fillcolor="#E1F5FE"];
  Integrations [label="integrations/supabase", fillcolor="#E1F5FE"];
  Supabase [label="Supabase", shape=cylinder, fillcolor="#E1BEE7"];

  Browser -> App;
  App -> ThinRoutes;
  ThinRoutes -> FeatureScreens;
  FeatureScreens -> HooksAdapters;
  HooksAdapters -> Integrations;
  Integrations -> Supabase;
  FeatureScreens -> Shared;
}
```

## Best practices

- routing stays thin
- features own behavior
- shared platform stays generic
- legacy bridge layers should shrink over time

## Navigation

- Back: [`../README.md`](../README.md)
- Next: [`scope3-flow.md`](./scope3-flow.md)
