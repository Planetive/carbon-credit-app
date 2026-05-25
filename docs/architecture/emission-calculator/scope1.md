# Scope 1

Scope 1 covers direct emissions.

In this project, Scope 1 has already been moved much further into the feature-first structure than Scope 3.

## Purpose

This file explains:

- where Scope 1 code lives
- what was migrated
- how Scope 1 should be extended

## Main paths

- `src/features/emission-calculator/scope1/Scope1Shell.tsx`
- `src/features/emission-calculator/scope1/components/*`
- `src/components/emissions/Scope1Emissions.tsx` ← thin compatibility stub

Examples of Scope 1 components:

- `FuelEmissions.tsx`
- `MobileFuelEmissions.tsx`
- `RefrigerantEmissions.tsx`
- `PassengerVehicleEmissions.tsx`
- `OnRoadGasolineEmissions.tsx`

## Current shape

```txt
UKCalculatorScreen
  ↓
components/emissions/Scope1Emissions.tsx
  ↓
features/emission-calculator/scope1/Scope1Shell.tsx
  ↓
features/emission-calculator/scope1/components/*
```

This is a good example of the migration pattern working well:

- old import path still works
- real implementation lives in `features/`

## What belongs in Scope 1

- direct-emission UI
- Scope 1 calculation formatting helpers
- Scope 1 shell composition

## What should not belong in Scope 1

- Scope 2 electricity logic
- Scope 3 category state
- shared app-wide helpers

## Best practices

- keep new Scope 1 work inside `src/features/emission-calculator/scope1/`
- keep the old `components/emissions/Scope1Emissions.tsx` path thin
- avoid moving logic back into the old component path

## Current status

Scope 1 is mostly in a clean state compared to Scope 3.

That makes it a good reference when deciding what the end state should feel like.

## Navigation

- Back: [`overview.md`](./overview.md)
- Next: [`scope2.md`](./scope2.md)
