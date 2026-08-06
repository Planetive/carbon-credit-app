# Backend prompt — Counterparty questionnaires (JWT)

> **Status (SPA):** Wired when `VITE_USE_JWT_AUTH` is on via `PortfolioClient` (`getQuestionnaire`, `createQuestionnaire`, `updateQuestionnaire`, `upsertCounterpartyQuestionnaire`).

Copy everything below the line into a **backend** Cursor chat (`carbon-credit-backend`) if re-implementing.

---

## Context

SPA finance wizard reads/writes `counterparty_questionnaires` via `PortfolioClient`:

- `createQuestionnaire`
- `getQuestionnaire(counterpartyId)`
- `updateQuestionnaire`
- upsert-by-counterparty path used from ESGWizard

Financed emissions already have `questionnaire_id` on `/api/v1/financed-emissions`.

Do not change PCAF formulas.

---

## Required routes

Auth: Bearer JWT + current org context (same as counterparties).

### List / get

- `GET /api/v1/counterparties/{counterparty_id}/questionnaire` → single row or `404`/`null`
- Optionally `GET /api/v1/questionnaires?counterparty_id=`

### Upsert

- `PUT /api/v1/counterparties/{counterparty_id}/questionnaire`

Body: flexible JSON matching KEEP table `counterparty_questionnaires` columns the SPA already writes (pass-through dict is fine). At minimum preserve fields ESGWizard saves today (scopes, verification flags, corporate structure, etc.).

Behavior:

- Scope by `organization_id` of the counterparty
- If row exists for `(organization_id, counterparty_id)` → update
- Else insert with `user_id` = JWT user
- Return full row including `id`

### Patch by id (optional)

- `PATCH /api/v1/questionnaires/{id}`

---

## KEEP table

`public.counterparty_questionnaires` (or migrated `app.` equivalent if already ETL’d — prefer existing live table the SPA uses).

Missing table → clear 503/empty with log; do not 500 stack traces to client.

---

## Smoke

```bash
TOKEN=...
CP=...
curl -s "http://localhost:8000/api/v1/counterparties/$CP/questionnaire" \
  -H "Authorization: Bearer $TOKEN"

curl -s -X PUT "http://localhost:8000/api/v1/counterparties/$CP/questionnaire" \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"has_emissions":"yes","verification_status":"verified"}'
```

After this lands, SPA will dual-read `PortfolioClient` questionnaire methods (same pattern as financed CRUD).

---

## Do not

- Duplicate questionnaire data into financed `inputs` only
- Change financed `/calculate` semantics

Commit locally; do not push unless asked.
