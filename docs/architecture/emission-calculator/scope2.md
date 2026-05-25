# Scope 2

Scope 2 covers purchased electricity, heat, and steam.

Like Scope 1, Scope 2 is already much closer to the target architecture than Scope 3.

## Purpose

This file explains:

- where Scope 2 code lives
- how it is structured today
- how to keep it clean

## Main paths

- `src/features/emission-calculator/scope2/Scope2Shell.tsx`
- `src/features/emission-calculator/scope2/components/*`
- `src/components/emissions/Scope2Emissions.tsx` ← thin compatibility stub

Examples:

- `ElectricityEmissions.tsx`
- `HeatSteamEmissions.tsx`

## Current shape

```txt
UKCalculatorScreen
  ↓
components/emissions/Scope2Emissions.tsx
  ↓
features/emission-calculator/scope2/Scope2Shell.tsx
  ↓
features/emission-calculator/scope2/components/*
```

## What belongs in Scope 2

- electricity UI
- heat and steam UI
- Scope 2 shell composition
- Scope 2-specific helpers

## What should not belong in Scope 2

- Scope 1 direct-emission logic
- Scope 3 sold products logic
- generic shared app infrastructure

## Why Scope 2 matters in the architecture story

Scope 2 shows the clean direction we want:

- thin old entry path
- feature-owned shell
- focused components

This is the same general direction Scope 3 is moving toward, just with more complexity.

## Best practices

- keep new Scope 2 changes in the feature folder
- treat the old component path as a compatibility layer only
- keep Scope 2 logic close to Scope 2 UI

## Navigation

- Back: [`scope1.md`](./scope1.md)
- Next: [`scope3.md`](./scope3.md)
