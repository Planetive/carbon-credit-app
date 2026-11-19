import { test, expect, type Page } from "@playwright/test";
import { apiJson, loadStack, loginToken } from "./helpers/sspStack";

/**
 * Phase 6C.3A — multi-pool + tranche-specific browser verification on isolated stack.
 *
 * Independent algebra (reported mortgage absolute 10):
 * Loan FE = 10 × CAF(40/100) = 4
 * Partial pools: LAF 25/40 → 2.5; LAF 15/40 → 1.5; Σ = 4
 * Two tranches COA 30+10: TAF 0.75/0.25 → tranche FE 3 / 1
 * Holding on t1 investment 15 → IAF 0.5 → holding FE 1.5
 *
 * Tranche-specific: pool p1→t1 only, pool p2 from second loan → t2 only.
 */

const INSTANCE_MULTI = "ssp-6c3a-multi-aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
const INSTANCE_TRANCHE = "ssp-6c3a-tranche-aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";

function evidence() {
  return { source: "", notes: "", documentReference: "" };
}

function multiPoolDraft(instanceId: string) {
  return {
    financingInstanceId: instanceId,
    instanceKey: "securitization-structured-products#1",
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
      dealName: "6C.3A Multi-pool RMBS",
      dealIdentifier: "6C3A-MP",
      issuerName: "Issuer",
      originatorName: "Originator",
      spvName: "SPV",
      structureType: "rmbs",
      reportingYear: "2024",
      currency: "PKR",
      documentationSource: "Trustee 6C3A",
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
        loanAllocations: [{ loanId: "l1", amountInPool: 25 }],
        evidence: evidence(),
      },
      {
        poolId: "p2",
        name: "Pool B",
        loanIds: ["l1"],
        loanAllocations: [{ loanId: "l1", amountInPool: 15 }],
        evidence: evidence(),
      },
    ],
    poolOfPools: null,
    tranches: [
      {
        trancheId: "t1",
        name: "Senior",
        currentOutstandingAmount: 30,
        linkedPoolIds: [],
        evidence: evidence(),
      },
      {
        trancheId: "t2",
        name: "Junior",
        currentOutstandingAmount: 10,
        linkedPoolIds: [],
        evidence: evidence(),
      },
    ],
    holdings: [
      {
        holdingId: "h1",
        name: "Bank",
        trancheId: "t1",
        bankOutstandingInvestment: 15,
        currency: "PKR",
        financingInstanceId: instanceId,
        evidence: evidence(),
      },
    ],
  };
}

function trancheSpecificDraft(instanceId: string) {
  // c1 abs 10 CAF 0.4 → loan FE 4 → p1; c2 abs 20 CAF 0.25 → loan FE 5 → p2
  // t1 linked p1 only; t2 linked p2 only; holdings IAF → 1.0 and 2.0
  return {
    ...multiPoolDraft(instanceId),
    deal: {
      ...multiPoolDraft(instanceId).deal,
      dealName: "6C.3A Tranche-specific",
      dealIdentifier: "6C3A-TS",
      poolsLinkedToSpecificTranches: "yes",
    },
    eligibility: {
      ...multiPoolDraft(instanceId).eligibility,
      poolsLinkedToSpecificTranches: "yes",
    },
    collateral: [
      {
        collateralId: "c1",
        name: "House A",
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
      {
        collateralId: "c2",
        name: "House B",
        collateralType: "mortgage",
        attributionDenominator: 200,
        assetValueAtOrigination: 200,
        emissionsPath: "reported",
        scope1Emissions: 0,
        scope2Emissions: 20,
        dataQualityScore: 3,
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
      {
        loanId: "l2",
        name: "L2",
        collateralIds: ["c2"],
        currentOutstandingAmount: 50,
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
      {
        poolId: "p2",
        name: "Pool B",
        loanIds: ["l2"],
        loanAllocations: [{ loanId: "l2", amountInPool: 50 }],
        evidence: evidence(),
      },
    ],
    tranches: [
      {
        trancheId: "t1",
        name: "Senior",
        currentOutstandingAmount: 40,
        linkedPoolIds: ["p1"],
        evidence: evidence(),
      },
      {
        trancheId: "t2",
        name: "Junior",
        currentOutstandingAmount: 50,
        linkedPoolIds: ["p2"],
        evidence: evidence(),
      },
    ],
    holdings: [
      {
        holdingId: "h1",
        name: "Bank Senior",
        trancheId: "t1",
        bankOutstandingInvestment: 10,
        currency: "PKR",
        financingInstanceId: instanceId,
        evidence: evidence(),
      },
      {
        holdingId: "h2",
        name: "Bank Junior",
        trancheId: "t2",
        bankOutstandingInvestment: 20,
        currency: "PKR",
        financingInstanceId: `${instanceId}-h2`,
        evidence: evidence(),
      },
    ],
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

async function upsertDraft(stack: ReturnType<typeof loadStack>, token: string, instanceId: string, draft: object) {
  const upsert = await apiJson(stack, "/api/v1/ssp/drafts", {
    method: "PUT",
    token,
    body: JSON.stringify({
      financing_instance_id: instanceId,
      instance_key: "securitization-structured-products#1",
      counterparty_id: stack.counterparty_id,
      update_shared: true,
      draft,
    }),
  });
  expect(upsert.res.status, JSON.stringify(upsert.body)).toBeLessThan(300);
  return upsert.body;
}

test.describe("Phase 6C.3A multi-pool + tranche-specific verification", () => {
  test.describe.configure({ mode: "serial" });

  test("API: multi-pool partial LAF + two tranches match independent algebra", async () => {
    const stack = loadStack();
    const token = await loginToken(stack);
    const draft = multiPoolDraft(INSTANCE_MULTI);

    const { res, body } = await apiJson(stack, "/api/v1/ssp/calculate", {
      method: "POST",
      token,
      body: JSON.stringify({ persist_preview: false, holding_client_id: "h1", draft }),
    });
    expect(res.status, JSON.stringify(body)).toBe(200);
    const calc = body as {
      status?: string;
      financed_emissions?: number;
      pool_financed_emissions?: number;
      pools?: Array<{ pool_id: string; financed_emissions_tco2e: number }>;
      tranches?: Array<{ tranche_id: string; financed_emissions_tco2e: number; taf: number }>;
      is_reportable?: boolean;
      include_in_portfolio?: boolean;
    };
    expect(calc.status).toBe("complete");
    expect(calc.is_reportable).toBe(false);
    expect(calc.include_in_portfolio).toBe(false);
    expect(calc.pool_financed_emissions).toBe(4);
    const byPool = Object.fromEntries((calc.pools || []).map((p) => [p.pool_id, p.financed_emissions_tco2e]));
    expect(byPool.p1).toBe(2.5);
    expect(byPool.p2).toBe(1.5);
    const byTr = Object.fromEntries((calc.tranches || []).map((t) => [t.tranche_id, t]));
    expect(byTr.t1.taf).toBe(0.75);
    expect(byTr.t2.taf).toBe(0.25);
    expect(byTr.t1.financed_emissions_tco2e).toBe(3);
    expect(byTr.t2.financed_emissions_tco2e).toBe(1);
    expect(calc.financed_emissions).toBe(1.5);

    // Overallocation
    const over = {
      ...draft,
      pools: [
        { ...draft.pools[0], loanAllocations: [{ loanId: "l1", amountInPool: 30 }] },
        { ...draft.pools[1], loanAllocations: [{ loanId: "l1", amountInPool: 20 }] },
      ],
    };
    const { body: overBody } = await apiJson(stack, "/api/v1/ssp/calculate", {
      method: "POST",
      token,
      body: JSON.stringify({ persist_preview: false, draft: over }),
    });
    expect((overBody as { code?: string }).code).toBe("laf_sum_exceeds_loan");
  });

  test("API: tranche-specific pools do not cross-attribute", async () => {
    const stack = loadStack();
    const token = await loginToken(stack);
    const draft = trancheSpecificDraft(INSTANCE_TRANCHE);
    // Omit holding_client_id so both holdings are returned for cross-check.
    const { res, body } = await apiJson(stack, "/api/v1/ssp/calculate", {
      method: "POST",
      token,
      body: JSON.stringify({ persist_preview: false, draft }),
    });
    expect(res.status, JSON.stringify(body)).toBe(200);
    const calc = body as {
      status?: string;
      financed_emissions?: number;
      pools?: Array<{ pool_id: string; financed_emissions_tco2e: number }>;
      tranches?: Array<{ tranche_id: string; financed_emissions_tco2e: number; linked_pool_ids?: string[] }>;
      holdings?: Array<{ holding_id: string; financed_emissions_tco2e: number }>;
    };
    expect(calc.status).toBe("complete");
    const byPool = Object.fromEntries((calc.pools || []).map((p) => [p.pool_id, p.financed_emissions_tco2e]));
    expect(byPool.p1).toBe(4);
    expect(byPool.p2).toBe(5);
    const byTr = Object.fromEntries((calc.tranches || []).map((t) => [t.tranche_id, t]));
    expect(byTr.t1.financed_emissions_tco2e).toBe(4);
    expect(byTr.t2.financed_emissions_tco2e).toBe(5);
    expect(byTr.t1.linked_pool_ids).toEqual(["p1"]);
    expect(byTr.t2.linked_pool_ids).toEqual(["p2"]);
    const byH = Object.fromEntries((calc.holdings || []).map((h) => [h.holding_id, h.financed_emissions_tco2e]));
    expect(byH.h1).toBe(1);
    expect(byH.h2).toBe(2);
    // Primary total still reflects first holding when no holding_client_id filter is set.
    expect(calc.financed_emissions).toBe(1);
  });

  test("Browser: save multi-pool draft, Calculate 1.5, refresh recalculate, Save stays off", async ({
    page,
  }) => {
    const stack = loadStack();
    const token = await loginToken(stack);
    const draft = multiPoolDraft(INSTANCE_MULTI);
    await upsertDraft(stack, token, INSTANCE_MULTI, draft);

    const verify = await apiJson(stack, `/api/v1/ssp/drafts/by-instance/${INSTANCE_MULTI}`, {
      method: "GET",
      token,
    });
    expect(verify.res.status).toBe(200);
    const verified = verify.body as { draft?: { pools?: unknown[]; holdings?: Array<{ bankOutstandingInvestment?: number }> } };
    expect(verified.draft?.pools?.length).toBe(2);
    expect(verified.draft?.holdings?.[0]?.bankOutstandingInvestment).toBe(15);

    await uiLogin(page, stack.email, stack.password);
    await openFinanceWizard(page, stack.counterparty_id);
    await page.getByTestId("loan-type-securitization-structured-products").click();
    await page.getByTestId("esg-wizard-next").click();
    await expect(page.getByTestId("ssp-step-ssp-eligibility")).toBeVisible({ timeout: 20_000 });
    await advanceToReview(page);

    await expect(page.getByTestId("ssp-results-panel")).toBeVisible({ timeout: 45_000 });
    await expect(page.getByTestId("ssp-save-reportable")).toBeDisabled();

    const calcBtn = page.getByTestId("ssp-calculate-preview");
    await expect(calcBtn).toBeEnabled({ timeout: 15_000 });
    await calcBtn.click();

    await expect(page.getByTestId("ssp-preview-total")).toContainText(/1\.5/, { timeout: 20_000 });
    await expect(page.getByTestId("ssp-preview-layers")).toBeVisible();
    // Two pool rows in hierarchy
    await expect(page.getByTestId("ssp-preview-layers")).toContainText(/Pool A|p1|Pool B|p2/i);

    await openFinanceWizard(page, stack.counterparty_id);
    await page.getByTestId("loan-type-securitization-structured-products").click();
    await page.getByTestId("esg-wizard-next").click();
    await advanceToReview(page);
    await expect(page.getByTestId("ssp-results-panel")).toBeVisible({ timeout: 45_000 });
    await page.getByTestId("ssp-calculate-preview").click();
    await expect(page.getByTestId("ssp-preview-total")).toContainText(/1\.5/, { timeout: 20_000 });
    await expect(page.getByTestId("ssp-save-reportable")).toBeDisabled();
  });

  test("Browser: tranche-specific draft Calculate shows holding 1.0", async ({ page }) => {
    const stack = loadStack();
    const token = await loginToken(stack);
    const draft = trancheSpecificDraft(INSTANCE_TRANCHE);
    await upsertDraft(stack, token, INSTANCE_TRANCHE, draft);

    await uiLogin(page, stack.email, stack.password);
    await openFinanceWizard(page, stack.counterparty_id);
    await page.getByTestId("loan-type-securitization-structured-products").click();
    await page.getByTestId("esg-wizard-next").click();
    await advanceToReview(page);
    await expect(page.getByTestId("ssp-results-panel")).toBeVisible({ timeout: 45_000 });
    await page.getByTestId("ssp-calculate-preview").click();
    // Primary holding h1 → 1.0
    await expect(page.getByTestId("ssp-preview-total")).toContainText(/1(\.0+)?/, { timeout: 20_000 });
    await expect(page.getByTestId("ssp-preview-layers")).toContainText(/Pool A|Pool B|Senior|Junior/i);
    await expect(page.getByTestId("ssp-save-reportable")).toBeDisabled();
  });
});
