import { test, expect, type Page } from "@playwright/test";
import { apiJson, loadStack, loginToken } from "./helpers/sspStack";

/**
 * SSP Final Release Verification — both flags on in isolated UAT.
 *
 * Requires:
 *   python scripts/run_ssp_e2e_stack.py --write-env --serve --api-port 8011 --enable-ssp-reportable
 *   npm run dev:ssp-e2e
 */

const INSTANCE = "ssp-final-aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
const INSTANCE_B = "ssp-final-bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb";

function evidence() {
  return { source: "", notes: "", documentReference: "" };
}

function singlePoolDraft(instanceId: string, investment = 10, instanceKey = "securitization-structured-products#1") {
  return {
    financingInstanceId: instanceId,
    instanceKey,
    eligibility: {
      isStructuredProduct: "yes",
      underlyingIdentifiable: "yes",
      structureFamily: "true-sale",
      collateralFamily: "residential-real-estate",
      hasAssetLevelEmissionsForOtherHard: "",
      isGssCollateralBond: "no",
      isGssStandardBondForOriginatorProjects: "no",
      collateralRemainsWithOriginator: "no",
      hasTranches: "yes",
      hasPoolOfPools: "no",
      poolsLinkedToSpecificTranches: "no",
    },
    deal: {
      dealName: "Final Release RMBS",
      dealIdentifier: "FINAL-1",
      issuerName: "Issuer",
      originatorName: "Originator",
      spvName: "SPV",
      structureType: "rmbs",
      reportingYear: "2024",
      currency: "PKR",
      documentationSource: "Trustee Final",
      hasTranches: "yes",
      hasPoolOfPools: "no",
      collateralRemainsWithOriginator: "no",
      poolsLinkedToSpecificTranches: "no",
    },
    emissionsPath: "lookthrough",
    collateral: [
      {
        collateralId: "c1",
        name: "House",
        collateralType: "mortgage",
        attributionDenominator: 100,
        assetValueAtOrigination: 100,
        emissionsPath: "reported",
        scope1Emissions: 0,
        scope2Emissions: 10,
        dataQualityScore: 2,
        classInputs: {},
        evidence: evidence(),
      },
    ],
    loans: [
      {
        loanId: "l1",
        name: "L1",
        collateralIds: ["c1"],
        currentOutstandingAmount: 40,
        evidence: evidence(),
      },
    ],
    pools: [
      {
        poolId: "p1",
        name: "Pool A",
        loanIds: ["l1"],
        loanAllocations: [{ loanId: "l1", amountInPool: 40 }],
        evidence: evidence(),
      },
    ],
    poolOfPools: null,
    tranches: [
      {
        trancheId: "t1",
        name: "Senior",
        currentOutstandingAmount: 40,
        linkedPoolIds: [],
        evidence: evidence(),
      },
    ],
    holdings: [
      {
        holdingId: "h1",
        name: "Bank",
        trancheId: "t1",
        bankOutstandingInvestment: investment,
        currency: "PKR",
        financingInstanceId: instanceId,
        evidence: evidence(),
      },
    ],
  };
}

function popDraft(instanceId: string) {
  const base = singlePoolDraft(instanceId);
  return {
    ...base,
    eligibility: { ...base.eligibility, hasPoolOfPools: "yes" },
    deal: { ...base.deal, hasPoolOfPools: "yes", dealName: "Final PoP blocked" },
    pools: [
      {
        poolId: "p1",
        name: "A",
        loanIds: ["l1"],
        loanAllocations: [{ loanId: "l1", amountInPool: 20 }],
        poolCurrentOutstandingAmount: 20,
        evidence: evidence(),
      },
      {
        poolId: "p2",
        name: "B",
        loanIds: ["l1"],
        loanAllocations: [{ loanId: "l1", amountInPool: 20 }],
        poolCurrentOutstandingAmount: 20,
        evidence: evidence(),
      },
    ],
    poolOfPools: {
      poolOfPoolsId: "pop1",
      name: "PoP",
      poolIds: ["p1", "p2"],
      currentOutstandingAmount: 40,
      poolAllocations: [
        { poolId: "p1", amountInPop: 20 },
        { poolId: "p2", amountInPop: 20 },
      ],
    },
  };
}

async function dismissConsent(page: Page) {
  const gotIt = page.getByRole("button", { name: /^Got it$/i });
  if (await gotIt.isVisible().catch(() => false)) await gotIt.click();
}

async function uiLogin(page: Page, email: string, password: string) {
  await page.goto("/login");
  await page.locator("#email").fill(email);
  await page.locator("#password").fill(password);
  await page.getByTestId("login-submit").click();
  await page.waitForURL((url) => !url.pathname.includes("/login"), { timeout: 30_000 });
  await dismissConsent(page);
}

async function openFinanceWizard(page: Page, counterpartyId: string) {
  await page.goto(`/finance-emission?counterpartyId=${counterpartyId}`);
  await dismissConsent(page);
  await expect(page.getByText(/loan type|what are you financing/i).first()).toBeVisible({
    timeout: 30_000,
  });
}

async function advanceToReview(page: Page) {
  for (let i = 0; i < 12; i++) {
    await dismissConsent(page);
    if (await page.getByTestId("ssp-results-panel").isVisible().catch(() => false)) return;
    const next = page.getByTestId("esg-wizard-next");
    if (await next.isEnabled().catch(() => false)) {
      await next.click();
      await page.waitForTimeout(500);
    } else {
      await page.waitForTimeout(400);
      if (!(await next.isEnabled().catch(() => false))) break;
    }
  }
}

async function upsertDraft(
  stack: ReturnType<typeof loadStack>,
  token: string,
  instanceId: string,
  draft: object,
) {
  const key =
    (draft as { instanceKey?: string }).instanceKey ||
    "securitization-structured-products#1";
  const upsert = await apiJson(stack, "/api/v1/ssp/drafts", {
    method: "PUT",
    token,
    body: JSON.stringify({
      financing_instance_id: instanceId,
      instance_key: key,
      counterparty_id: stack.counterparty_id,
      update_shared: true,
      draft,
    }),
  });
  expect(upsert.res.status, JSON.stringify(upsert.body)).toBeLessThan(300);
  return upsert.body;
}

async function calculate(
  stack: ReturnType<typeof loadStack>,
  token: string,
  instanceId: string,
  draft: object,
  extra: Record<string, unknown> = {},
) {
  return apiJson(stack, "/api/v1/ssp/calculate", {
    method: "POST",
    token,
    body: JSON.stringify({
      financing_instance_id: instanceId,
      counterparty_id: stack.counterparty_id,
      holding_client_id: "h1",
      draft,
      ...extra,
    }),
  });
}

test.describe("SSP Final Release Verification", () => {
  test.describe.configure({ mode: "serial" });

  test("API: Save → reconcile portfolio/Cat15 export totals; replace; separate holdings; PoP blocked", async () => {
    const stack = loadStack();
    const token = await loginToken(stack);
    const draft = singlePoolDraft(INSTANCE);
    await upsertDraft(stack, token, INSTANCE, draft);

    const preview = await calculate(stack, token, INSTANCE, draft);
    expect(preview.res.status).toBe(200);
    const p = preview.body as {
      financed_emissions?: number;
      calculation_fingerprint?: string;
      scope_breakdown?: { scope1?: number; scope2?: number; scope3?: number | null };
      reporting_year?: string;
    };
    expect(p.financed_emissions).toBe(1);
    expect(p.calculation_fingerprint).toBeTruthy();

    const saved = await calculate(stack, token, INSTANCE, draft, {
      persist_reportable: true,
      expected_fingerprint: p.calculation_fingerprint,
    });
    expect(saved.res.status, JSON.stringify(saved.body)).toBe(200);
    const s = saved.body as {
      persisted_reportable?: boolean;
      reportable_record_id?: string;
      financed_emissions?: number;
      is_reportable?: boolean;
    };
    expect(s.persisted_reportable).toBe(true);
    expect(s.is_reportable).toBe(true);
    expect(s.financed_emissions).toBe(1);
    const recordId = s.reportable_record_id!;

    const again = await calculate(stack, token, INSTANCE, draft, {
      persist_reportable: true,
      expected_fingerprint: p.calculation_fingerprint,
    });
    expect(again.res.status).toBe(200);
    expect((again.body as { reportable_record_id?: string }).reportable_record_id).toBe(recordId);

    // Export / portfolio source of truth
    const list = await apiJson(stack, "/api/v1/financed-emissions?calc_kind=finance", {
      method: "GET",
      token,
    });
    expect(list.res.status).toBe(200);
    const rows = list.body as Array<{
      id?: string;
      formula_id?: string;
      financed_emissions?: string | number;
      company_type?: string;
      inputs?: Record<string, unknown>;
      results?: Record<string, unknown>;
      counterparty_id?: string;
    }>;
    const ssp = rows.filter((r) => String(r.formula_id || "").startsWith("ssp"));
    expect(ssp.length).toBeGreaterThanOrEqual(1);
    const primary = ssp.find((r) => r.inputs?.financing_instance_id === INSTANCE)!;
    expect(Number(primary.financed_emissions)).toBeCloseTo(1, 6);
    expect(primary.inputs?.reporting_year).toBe("2024");
    expect(primary.company_type).toBe("securitization-structured-products");
    expect(primary.results?.reporting_role).toBe("ssp_parent");
    expect(primary.results?.include_layers_independently).toBe(false);
    const scopes = (primary.results?.scope_breakdown || {}) as Record<string, unknown>;
    expect(Number(scopes.financed_scope2_tco2e)).toBeCloseTo(Number(p.scope_breakdown?.scope2), 6);

    // Category 15 candidate identity: one row per holding instance
    const cat15Candidates = rows.filter(
      (r) =>
        r.counterparty_id === stack.counterparty_id &&
        String(r.formula_id || "").startsWith("ssp") &&
        r.results?.reporting_role === "ssp_parent",
    );
    expect(cat15Candidates.map((r) => r.inputs?.financing_instance_id).filter(Boolean)).toContain(
      INSTANCE,
    );

    // Replace after edit
    const edited = singlePoolDraft(INSTANCE, 20);
    await upsertDraft(stack, token, INSTANCE, edited);
    const p2 = await calculate(stack, token, INSTANCE, edited);
    const s2 = await calculate(stack, token, INSTANCE, edited, {
      persist_reportable: true,
      expected_fingerprint: (p2.body as { calculation_fingerprint?: string }).calculation_fingerprint,
    });
    expect(s2.res.status).toBe(200);
    expect((s2.body as { reportable_record_id?: string }).reportable_record_id).toBe(recordId);
    expect((s2.body as { financed_emissions?: number }).financed_emissions).toBe(2);

    // Second holding stays separate
    const draftB = singlePoolDraft(INSTANCE_B, 10);
    await upsertDraft(stack, token, INSTANCE_B, draftB);
    const pb = await calculate(stack, token, INSTANCE_B, draftB);
    const sb = await calculate(stack, token, INSTANCE_B, draftB, {
      persist_reportable: true,
      expected_fingerprint: (pb.body as { calculation_fingerprint?: string }).calculation_fingerprint,
    });
    expect(sb.res.status).toBe(200);
    expect((sb.body as { reportable_record_id?: string }).reportable_record_id).not.toBe(recordId);

    const list2 = await apiJson(stack, "/api/v1/financed-emissions?calc_kind=finance", {
      method: "GET",
      token,
    });
    const ssp2 = (list2.body as typeof rows).filter((r) =>
      String(r.formula_id || "").startsWith("ssp"),
    );
    const instances = new Set(ssp2.map((r) => r.inputs?.financing_instance_id));
    expect(instances.has(INSTANCE)).toBe(true);
    expect(instances.has(INSTANCE_B)).toBe(true);
    const sum = ssp2
      .filter((r) => r.inputs?.financing_instance_id === INSTANCE || r.inputs?.financing_instance_id === INSTANCE_B)
      .reduce((acc, r) => acc + Number(r.financed_emissions || 0), 0);
    expect(sum).toBeCloseTo(3, 6);

    // PoP blocked
    const pop = popDraft(`${INSTANCE}-pop`);
    await upsertDraft(stack, token, `${INSTANCE}-pop`, pop);
    const popPrev = await calculate(stack, token, `${INSTANCE}-pop`, pop);
    const popSave = await calculate(stack, token, `${INSTANCE}-pop`, pop, {
      persist_reportable: true,
      expected_fingerprint: (popPrev.body as { calculation_fingerprint?: string })
        .calculation_fingerprint,
    });
    expect(popSave.res.status).toBe(422);
    expect((popSave.body as { detail?: { code?: string } }).detail?.code).toBe("SSP_POP_NOT_REPORTABLE");
  });

  test("Browser: Calculate → Save → confirmation; Save enabled; refresh recalculate still matches", async ({
    page,
  }) => {
    const stack = loadStack();
    const token = await loginToken(stack);
    // Wizard loads instance_key #1 for this loan type — reset that holding to a known FE.
    const uiInstance = INSTANCE;
    const draft = singlePoolDraft(uiInstance, 10, "securitization-structured-products#1");
    await upsertDraft(stack, token, uiInstance, draft);

    await uiLogin(page, stack.email, stack.password);
    await openFinanceWizard(page, stack.counterparty_id);
    await page.getByTestId("loan-type-securitization-structured-products").click();
    await page.getByTestId("esg-wizard-next").click();
    await expect(page.getByTestId("ssp-step-ssp-eligibility")).toBeVisible({ timeout: 20_000 });
    await advanceToReview(page);
    await expect(page.getByTestId("ssp-results-panel")).toBeVisible({ timeout: 45_000 });

    const saveBtn = page.getByTestId("ssp-save-reportable");
    // Flag is on, but Save stays disabled until a fingerprinted Calculate completes.
    await expect(saveBtn).toBeDisabled();

    await page.getByTestId("ssp-calculate-preview").click();
    await expect(page.getByTestId("ssp-preview-total")).toContainText(/1(\.0+)?/, {
      timeout: 20_000,
    });
    await expect(saveBtn).toBeEnabled({ timeout: 10_000 });

    await saveBtn.click();
    await expect(page.getByTestId("ssp-save-confirmation")).toBeVisible({ timeout: 20_000 });
    const recordId = (await page.getByTestId("ssp-reportable-record-id").innerText()).trim();
    expect(recordId.length).toBeGreaterThan(8);

    // Refresh wizard and recalculate — total still matches; saved record remains.
    await openFinanceWizard(page, stack.counterparty_id);
    await page.getByTestId("loan-type-securitization-structured-products").click();
    await page.getByTestId("esg-wizard-next").click();
    await advanceToReview(page);
    await page.getByTestId("ssp-calculate-preview").click();
    await expect(page.getByTestId("ssp-preview-total")).toContainText(/1(\.0+)?/, {
      timeout: 20_000,
    });

    const listed = await apiJson(stack, "/api/v1/financed-emissions?calc_kind=finance", {
      method: "GET",
      token,
    });
    expect(listed.res.status).toBe(200);
    const rows = listed.body as Array<{
      id?: string;
      financed_emissions?: string | number;
      formula_id?: string;
      inputs?: { financing_instance_id?: string; reporting_year?: string };
    }>;
    const saved = rows.find((r) => r.id === recordId);
    expect(saved, JSON.stringify(rows.map((r) => r.id))).toBeTruthy();
    expect(Number(saved?.financed_emissions)).toBeCloseTo(1, 6);
    expect(String(saved?.formula_id || "").startsWith("ssp")).toBe(true);
    expect(saved?.inputs?.reporting_year).toBe("2024");
  });
});
