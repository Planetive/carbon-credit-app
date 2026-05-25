# Shared Platform

This file explains the parts of the frontend that support all features.

These are the pieces that should stay generic and stable while feature code changes more often.

## Purpose

Use this file to understand:

- what counts as shared platform code
- what should stay generic
- what should not slowly turn into feature code

## Main shared platform areas

### 1. `src/components/ui/`

This is the shared design system layer.

Examples:

- buttons
- inputs
- cards
- dialogs
- selects
- tooltips

These components should not know anything about:

- Scope 3
- ESG readiness
- admin scoring
- specific Supabase tables

## 2. `src/components/layout/`

This is the app shell layer.

Examples:

- header
- footer
- layout wrappers

What belongs here:

- navigation
- page shell structure
- app chrome

What should not go here:

- feature calculations
- feature save/load logic

## 3. `src/contexts/`

These are app-wide state containers.

Important examples:

- `AuthContext`
- `OrganizationContext`

These are useful because many routes and features need them.

Simple flow:

```txt
App
  ↓
Context provider
  ↓
feature screen
```

What belongs here:

- user auth state
- organization selection or context

What should not go here:

- one feature's local workflow state
- one category's form rows

## 4. `src/hooks/`

This is for generic reusable hooks.

Examples:

- scroll helpers
- small app-wide behavior hooks

What belongs here:

- hooks used by many unrelated parts of the app

What should not go here:

- feature-specific save logic
- calculator-only row update logic

If a hook is specific to one feature, it should usually move into that feature.

## 5. `src/integrations/`

This is where external service setup lives.

Most important for the frontend:

- `src/integrations/supabase/client.ts`
- `src/integrations/supabase/portfolioClient.ts`

What belongs here:

- shared client setup
- integration-level configuration

What should not go here:

- feature-specific data mapping
- feature-specific query rules

## 6. `src/utils/`

This is for generic helpers that are not tied to one feature.

Examples:

- export helpers
- formatting helpers
- generic utility functions

What belongs here:

- broad helper logic used by multiple features

What should not go here:

- Scope 3 category rules
- business-specific decision trees
- feature-specific state conversion code

## 7. Site-level tags in `index.html`

Some browser-level integrations live outside React and are loaded directly in:

- `index.html`

This is the right place for things that must run on every page as soon as the HTML loads.

Current examples in this project:

- Google Search Console verification meta tag
- Google Analytics `gtag.js`
- favicon and apple touch icon links
- SEO and social meta tags
- structured data for the organization

Real example from this project:

- Google Analytics is currently added in `index.html`
- measurement ID: `G-S28GK7VYQZ`

Simple flow:

```txt
Browser opens site
  ↓
index.html loads
  ↓
Google Analytics script loads
  ↓
page view tracking starts
```

### Why this lives in `index.html`

This is a site-wide concern, not one feature's concern.

It belongs in `index.html` because:

- it should load for the whole website
- it should not depend on a single route or screen
- it should work even before React fully renders

### What belongs in `index.html`

- analytics tags
- search verification tags
- favicon links
- canonical/meta/OG tags that apply site-wide
- organization-level structured data

### What should not go in `index.html`

- feature-specific logic
- route-specific data fetching
- app business logic
- anything that should only run on one screen

If tracking becomes more advanced later, a small wrapper helper can be added in app code for custom events, but the base site tag should still stay at the HTML entry level.

## Shared platform vs feature code

Use this simple check:

### If the code says:

- "button"
- "dialog"
- "auth user"
- "organization"
- "supabase client"

it may belong in shared platform.

### If the code says:

- "processing sold products"
- "waste generated"
- "ESG health check"
- "admin scoring"

it probably belongs in `src/features/`.

## Real project examples

### Good shared platform examples

- `src/components/ui/button.tsx`
- `src/components/layout/AppHeader.tsx`
- `src/contexts/AuthContext.tsx`
- `src/integrations/supabase/client.ts`
- `index.html` for site-wide tags like Google Analytics and Search Console verification

### Not good as shared platform if they keep growing

- `src/components/emissions/scope3/Scope3Section.tsx`

That file is shared in path only. In practice, it is feature logic and should keep moving toward feature ownership.

## Best practices

- keep shared code simple
- avoid feature words in shared utilities
- move domain logic into features early
- do not hide business logic in generic-looking folders

## What belongs in this file

- shared layer explanation
- examples of generic platform code
- rules for keeping shared code clean

## What should not belong in this file

- detailed route diagrams
- detailed Scope 3 migration timeline

## Navigation

- Back: [`routing.md`](./routing.md)
- Next: [`emission-calculator/overview.md`](./emission-calculator/overview.md)
- Related: [`folder-structure.md`](./folder-structure.md)
