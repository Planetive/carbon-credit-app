# Frontend Layering Rules

This project follows three primary layers:

- `pages`: route containers and route-specific composition.
- `features`: domain logic and reusable domain UI/hooks.
- `shared`: cross-domain reusable UI, hooks, types, and utilities.

## Layer responsibilities

- `pages/*`
  - Own route entry files and sub-page route entries.
  - Compose `features` and `shared` modules.
  - Keep business logic minimal in page entries.

- `features/*`
  - Domain-centric modules (`api`, `hooks`, `types`, `utils`, complex components).
  - Reused across multiple pages in one business domain.

- `shared/*`
  - Framework-level/common UI primitives and truly generic helpers.
  - No page-specific behavior.

## Import direction

- Allowed: `pages -> features -> shared`
- Allowed: `pages -> shared`
- Allowed: `features -> shared`
- Not allowed: `shared -> features` or `shared -> pages`
- Not allowed: `features -> pages`

## App shell separation

- App-shell components (headers, layout wrappers, footers) live in `components/layout`.
- Primitive components remain under `components/ui`.

## Route module organization

- Parent route entries should live at `pages/<parent>/index.tsx`.
- Child routes should live at `pages/<parent>/sub-pages/<child>/index.tsx`.
- Child-route-specific helpers should stay beside child route entries unless promoted to `features` or `shared`.
