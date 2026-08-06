# Backend prompt — Org invitations + membership (JWT)

> **Status (SPA):** Wired when `VITE_USE_JWT_AUTH` is on — invite / list pending / members / public peek / accept.
> Still missing on API: cancel invitation, refresh expired token, member role/permission update / remove.
> Backend commit referenced: `da13350` (local).

Copy everything below the line into a **backend** Cursor chat (`carbon-credit-backend`) if re-implementing.

---

## Context

SPA org list/create/switch/patch already use `/api/v1/organizations` + `/api/v1/me/profile` when `VITE_USE_JWT_AUTH` is on.

**Was Supabase-only** (now dual-read on SPA):

- `OrganizationContext.inviteUserToOrganization` / list members / accept invite
- `AcceptInvitationScreen.tsx`
- Tables: `organization_invitations`, `user_organizations`
- RPCs used today: `generate_invitation_token`, `get_default_permissions`

Do not change GHG formulas. Email sending can stay SPA-side (`emailService`) if the API returns `token` + invitation row.

---

## Required routes (org-scoped JWT)

### 1) Invite

`POST /api/v1/organizations/{org_id}/invitations`

Body:

```json
{
  "email": "user@example.com",
  "role": "admin|user|editor|viewer",
  "permissions": {}
}
```

Behavior:

- Caller must be admin (or `can_manage_organizations`) of `org_id`
- Create row in `organization_invitations` (status `pending`, expires +7 days)
- Generate opaque token (mirror `generate_invitation_token` or use secure random)
- If `permissions` omitted, apply same defaults as `get_default_permissions(role)`
- Return: `{ id, email, role, token, expires_at, status, organization_id }`

### 2) List invitations (optional but useful)

`GET /api/v1/organizations/{org_id}/invitations?status=pending`

### 3) List members

`GET /api/v1/organizations/{org_id}/members`

Return membership rows + profile display_name/email if available (match what SPA `getOrganizationUsers` expects).

### 4) Accept invitation (authenticated)

`POST /api/v1/invitations/accept`

Body: `{ "token": "..." }`

- Validate token, not expired, status pending
- Ensure invite email matches JWT user email (case-insensitive) **or** document if you allow override
- Insert/update `user_organizations` with role + permissions
- Mark invitation `accepted`
- Optionally set `profiles.current_organization_id` if null

### 5) Public peek (optional)

`GET /api/v1/invitations/by-token/{token}` (no auth or auth-optional) — enough for AcceptInvitationScreen to show org name / role before accept.

---

## Smoke

```bash
TOKEN=...
ORG=...
curl -s -X POST "http://localhost:8000/api/v1/organizations/$ORG/invitations" \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"email":"invitee@example.com","role":"viewer"}'
```

---

## Do not

- Require direct PostgREST from SPA for invitations when JWT is on
- Drop KEEP tables

Commit locally; do not push unless asked.
