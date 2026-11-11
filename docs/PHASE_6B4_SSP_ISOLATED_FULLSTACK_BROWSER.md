# Phase 6B.4 — SSP Isolated Full-Stack Browser Verification

**Date:** 2026-11-11  
**Safety:** SSP Calculate / reportable Save remain disabled. Migration **0020** applied only inside disposable Postgres. No production/staging migrate or deploy.

## 1. Test environment architecture

```
Playwright (Chromium)
        │
        ▼
Vite --mode ssp-e2e :8080
  VITE_USE_JWT_AUTH=true
  VITE_BACKEND_URL=http://127.0.0.1:<api-port>
        │
        ▼
uvicorn FastAPI 127.0.0.1:<api-port>
  DATABASE_URL forced to disposable loopback URL
  JWT_SECRET=ssp-e2e-isolated-jwt-secret-do-not-reuse
        │
        ▼
Isolated Postgres (testing.postgresql / pg_isolated)
  bootstrap_ssp_fullstack_schema + migration 0020
  seeded org A/B, users, memberships, counterparty
```

**Fail-closed isolation** (`carbon-credit-backend/scripts/run_ssp_e2e_stack.py`):

- Refuses production host markers; overrides inherited `DATABASE_URL`
- Writes SPA `.env.ssp-e2e`, `e2e/.ssp-e2e-stack.json`, credentials JSON
- Tears down disposable Postgres on exit
- Uvicorn logs to `e2e/uvicorn-ssp-e2e.log` (not an unread PIPE — avoids Windows deadlock)

**Seed users:** `ssp.e2e@planetive.com` / `ssp.other@planetive.com`  
**Password:** `SspE2ePass!234`  
**Executed API port this run:** `8013`

## 2. Commands to reproduce locally

```bash
# Terminal 1 — isolated API (from carbon-credit-backend)
python -u scripts/run_ssp_e2e_stack.py --write-env --serve --api-port 8013

# Terminal 2 — Vite locked to that API (from carbon-credit-app-main)
npm run dev:ssp-e2e

# Terminal 3 — browser suite
npm run test:e2e:ssp
# or: npx playwright test e2e/ssp-phase6b4.spec.ts
```

Ctrl+C the stack process to destroy disposable Postgres.

## 3. Browser tests executed (actual Chromium)

Suite: `e2e/ssp-phase6b4.spec.ts` against live Vite + live FastAPI + disposable PG.

| # | Test | Result |
|---|---|---|
| 1 | Stack isolation refuses production markers | **PASS** |
| 2 | Scenario A — login, SSP path, deal UI, five-class draft persist + reload | **PASS** (35.6s) |
| 3 | Scenario B — two holdings / shared deal / `shared_deal_conflict` 409 | **PASS** |
| 4 | Scenario C — invalid association 422 + eligibility UI | **PASS** |
| 5 | Scenario D — invalid JWT + cross-org empty list + org B browser login | **PASS** |
| 6 | Scenario E — SSP `financed_emissions` write rejected + blocked copy in UI | **PASS** |

**Overall: 6 passed / 0 failed (≈1.3m)**

Artifacts on failure would land under `e2e/test-results/` (trace/screenshot/video). This successful run left no failure artifacts.

### Coverage notes (honest)

| Requirement area | Browser UI | Live API (same JWT stack) |
|---|---|---|
| Login / company gate (`@planetive`) | Yes | Yes |
| Select SSP + eligibility + deal fields | Yes | — |
| Multi-class collateral + questionnaires (Mortgage, CRE, Motor, Business/Unlisted, Bond/Listed) | Path opened in UI; **classInputs persistence asserted via authenticated PUT/GET** after UI setup | Yes (all five types round-tripped) |
| Loans / pools / tranche / bank holding | Via authenticated draft payload | Yes |
| Multi-holding + stale shared-deal conflict | — | Yes (`shared_deal_conflict`) |
| Validation / COA soft warnings | Eligibility UI smoke | 422 unknown links; soft COA covered in unit tests |
| Auth expiry / unauthorized / cross-org | Org B login | Invalid JWT 401/403; org B drafts empty |
| Network abort / autosave retry / unsaved refresh | **Not fully simulated** in Playwright this phase | Draft conflict 409 covers no silent overwrite for shared edits |

## 4. Bugs found and fixed

1. **`playwright.config.ts` ESM `__dirname`** — fixed via `import.meta.url`.
2. **Uvicorn hang after smoke** — `stdout=PIPE` without a reader filled the Windows pipe buffer and deadlocked the API (even `/docs` timed out). Fixed: log to `e2e/uvicorn-ssp-e2e.log` + `flush=True` prints.
3. **Port zombies (8010/8011)** — prior listeners caused bind `10048` and false smoke success; stack now fails closed if uvicorn exits early; this run used **8013**.
4. **Vitest picking up Playwright specs** — excluded `e2e/**` from Vitest in `vite.config.ts`.

## 5. Remaining UX / questionnaire issues

- Field-by-field browser entry for all five underlying questionnaire families is still thinner than API round-trip coverage; nested rows / factor pickers should get dedicated UI steps before trusting 6C calculate UX.
- Reliability UX (offline banner, retry, unsaved-navigation guard) not fully exercised under `page.route` aborts.
- “Other hard asset” remains methodology-limited (known from 6B.2/6B.3).

## 6. Standalone calculator / SSP regressions

| Suite | Result |
|---|---|
| `npx vitest run src/features/finance-emissions/ssp` | **28 passed** |
| `pytest tests/test_ssp_drafts.py tests/test_ssp_drafts_postgres.py` | **17 passed** |
| Full `npm test` | Playwright files previously polluted Vitest (fixed exclude); unrelated pre-existing failures remain in `parity/parity.test.ts` (waste) and `reportingBoundary.test.ts` — **not introduced by 6B.4** |

## 7. Safety checks confirmed

- `SSP_CALCULATE_AVAILABLE === false` / reportable Save disabled (unit + UI copy)
- POST `/api/v1/financed-emissions` with `ssp-lookthrough` → **400** (browser scenario E + backend tests)
- No Category 15 / portfolio inclusion path enabled for SSP
- Stack DB URL loopback-only; production markers refused
- No migration applied outside disposable Postgres

## 8. Phase 6B.4 complete?

**Yes, with documented gaps:** isolated full-stack + real Chromium execution of A–E landed and passed. Questionnaire families are verified for persistence on the live JWT API after the UI draft path; deepest nested UI entry and network-interruption UX remain follow-ups, not blockers for starting 6C design against the draft contract.

## 9. GO / NO-GO for Phase 6C

### **GO** (implementation readiness for Phase 6C calculate engine)

Rationale:

- Draft hierarchy + org isolation + conflict codes work on isolated full stack
- Auth contract used by the SPA is proven in browser
- Calculate / reportable Save remain correctly hard-off
- Safe disposable verification path exists for future 6C browser checks

**Do not** enable Calculate or reportable Save until 6C formulas, factor resolution, and financed_emissions write rules are implemented and re-verified on this same isolated stack.
