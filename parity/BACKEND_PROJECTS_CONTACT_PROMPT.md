# Backend prompt — Project inputs + Contact submissions

Copy everything below the line into a **backend** Cursor chat (`carbon-credit-backend`).

---

## Context

SPA dual-reads:

1. **User projects** — `project_inputs` / optional `project_reports`
2. **Marketing contact** — public insert + admin list/update/delete on `contact_submissions`

Both tables are **KEEP**. SPA clients: `src/api/projects.ts`, `src/api/contact.ts`.

---

## A) Project inputs (`/api/v1/me/project-inputs`)

### Auth

Bearer JWT. Scope to current user (set `organization_id` from org context when inserting).

### Schema notes

Accept/return both `type` and `subcategory` (SPA alias drift). Prefer persisting `subcategory` if that column exists; mirror into `type` in the JSON response.

### Routes

| Method | Path | Behavior |
|--------|------|----------|
| GET | `/api/v1/me/project-inputs` | List for current user, `created_at DESC` |
| POST | `/api/v1/me/project-inputs` | Insert; `user_id` from JWT |
| GET | `/api/v1/me/project-inputs/{id}` | Owned row or 404 |
| DELETE | `/api/v1/me/project-inputs/{id}` | Owned delete or 404 |
| GET | `/api/v1/me/project-reports` | Optional; missing table → `[]` |

### Smoke

```bash
TOKEN=...
curl -s http://localhost:8000/api/v1/me/project-inputs -H "Authorization: Bearer $TOKEN"
```

---

## B) Contact submissions

### Public create (no JWT)

`POST /api/v1/contact-submissions`

Body:

```json
{
  "name": "Ada",
  "email": "ada@example.com",
  "company": null,
  "phone": null,
  "subject": "Hello",
  "message": "Message text",
  "status": "new"
}
```

- No auth required (`auth: false` on SPA)
- Validate email/name/message non-empty
- Return created row

### Admin routes (`X-Admin-Key` only — same as ESG admin)

Reuse `require_platform_admin` / `ADMIN_API_KEY` (or `ADMIN_PASSWORD`).

| Method | Path |
|--------|------|
| GET | `/api/v1/admin/contact-submissions` |
| PATCH | `/api/v1/admin/contact-submissions/{id}` body `{ "status": "in_progress" }` |
| DELETE | `/api/v1/admin/contact-submissions/{id}` |

`status` enum: `new` | `in_progress` | `completed` | `spam`.

List: `ORDER BY created_at DESC`.

### Smoke

```bash
curl -s -X POST http://localhost:8000/api/v1/contact-submissions \
  -H "Content-Type: application/json" \
  -d '{"name":"Ada","email":"ada@example.com","subject":"Hi","message":"Test","status":"new"}'

curl -s http://localhost:8000/api/v1/admin/contact-submissions \
  -H "X-Admin-Key: $ADMIN_API_KEY"
```

---

## Do not

- Change GHG/finance formulas
- Drop KEEP tables
- Require JWT on public contact POST
- Require JWT on admin contact routes (admin key only)

Commit locally; do not push unless asked.
