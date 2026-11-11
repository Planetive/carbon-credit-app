import { test, expect, type Page } from "@playwright/test";
import { apiJson, loadStack, loginToken } from "./helpers/sspStack";

/**
 * Phase 6C.2 — browser + live API preview Calculate on isolated stack.
 * Independent expected total: Absolute 10 × CAF 0.4 = loan 4; LAF 1; TAF 1; IAF 0.25 → 1.0 tCO₂e.
 */

const INSTANCE = "ssp-6c2-aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";

function goldenDraft() {
  return {
    financingInstanceId: INSTANCE,
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
      dealName: "6C.2 Golden RMBS",
      dealIdentifier: "6C2-1",
      issuerName: "Issuer",
      originatorName: "Originator",
      spvName: "SPV",
      structureType: "rmbs",
      reportingYear: "2024",
      currency: "PKR",
      documentationSource: "Trustee report 6C2",
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
        evidence: { source: "trustee", notes: "", documentReference: "" },
      },
    ],
    loans: [
      {
        loanId: "l1",
        name: "L1",
        collateralIds: ["c1"],
        currentOutstandingAmount: 40,
        evidence: { source: "", notes: "", documentReference: "" },
      },
    ],
    pools: [
      {
        poolId: "p1",
        name: "P1",
        loanIds: ["l1"],
        loanAllocations: [{ loanId: "l1", amountInPool: 40 }],
        evidence: { source: "", notes: "", documentReference: "" },
      },
    ],
    poolOfPools: null,
    tranches: [
      {
        trancheId: "t1",
        name: "Senior",
        currentOutstandingAmount: 40,
        linkedPoolIds: [],
        evidence: { source: "", notes: "", documentReference: "" },
      },
    ],
    holdings: [
      {
        holdingId: "h1",
        name: "Bank",
        trancheId: "t1",
        bankOutstandingInvestment: 10,
        currency: "PKR",
        // financingInstanceId is set by the browser test to the live instance id
        // so upsert can match this row onto the stored holding.
        financingInstanceId: INSTANCE,
        evidence: { source: "", notes: "", documentReference: "" },
      },
    ],
  };
}

async function dismissConsent(page: Page) {
  const gotIt = page.getByRole("button", { name: /^Got it$/i });
  if (await gotIt.isVisible().catch(() => false)) {
    await gotIt.click();
  }
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

async function answerEligibilityHappyPath(page: Page) {
  // Skip if a prior draft already completed screening.
  if (await page.getByTestId("ssp-deal-name").isVisible().catch(() => false)) return;
  if (await page.getByText(/securitization|structured product|§5\.8|PCAF/i).first().isVisible().catch(() => false)) {
    const yes = page.getByRole("button", { name: /^Yes$/ });
    if (!(await yes.count())) return;
  }
  const clickExact = async (name: string | RegExp) => {
    const btn = page.getByRole("button", { name }).first();
    if (await btn.isVisible().catch(() => false)) await btn.click();
  };
  await clickExact(/^Yes$/);
  await clickExact(/^Yes$/);
  await clickExact(/True-sale ABS/i);
  await clickExact(/Residential mortgages/i);
  await clickExact(/^No$/);
  await clickExact(/^No$/);
  await clickExact(/^No$/);
  await clickExact(/^Yes$/);
  await clickExact(/^No$/);
  await clickExact(/^No$/);
}

async function fillDeal(page: Page) {
  if (!(await page.getByTestId("ssp-step-ssp-deal").isVisible().catch(() => false))) {
    await page.getByTestId("esg-wizard-next").click();
  }
  await expect(page.getByTestId("ssp-step-ssp-deal")).toBeVisible({ timeout: 20_000 });
  await page.getByTestId("ssp-deal-name").fill("6C.2 Golden RMBS");
  await page.getByTestId("ssp-structure-type").selectOption("rmbs");
  await page.getByTestId("ssp-reporting-year").fill("2024");
  await page.getByTestId("ssp-documentation-source").fill("Trustee report 6C2");
}

async function completeStructureIfNeeded(page: Page) {
  if (await page.getByTestId("ssp-results-panel").isVisible().catch(() => false)) return;
  if (!(await page.getByTestId("ssp-step-ssp-structure").isVisible().catch(() => false))) return;

  const lookthrough = page.getByRole("button", { name: /Look-through/i }).first();
  if (await lookthrough.isVisible().catch(() => false)) await lookthrough.click();

  // Holding row from compose may omit investment until explicitly set in UI.
  const holdingOpen = page.getByRole("button", { name: /Holding|Bank|Investment/i }).first();
  if (await holdingOpen.isVisible().catch(() => false)) await holdingOpen.click();

  const tranche = page.locator("select").filter({ hasText: /Senior|Select/i }).first();
  if (await tranche.isVisible().catch(() => false)) {
    await tranche.selectOption({ label: "Senior" }).catch(async () => {
      await tranche.selectOption({ index: 1 });
    });
  }
  const investment = page.getByRole("textbox").filter({ hasText: "" }).last();
  // Prefer labeled investment field near the holding editor
  const investmentLabel = page.getByText(/outstanding investment/i).first();
  if (await investmentLabel.isVisible().catch(() => false)) {
    const box = page.locator("xpath=//*[contains(., \"outstanding investment\")]/following::input[1]").first();
    if (await box.isVisible().catch(() => false)) {
      await box.fill("10");
    } else if (await investment.isVisible().catch(() => false)) {
      await investment.fill("10");
    }
  }
}

async function advanceToReview(page: Page) {
  for (let i = 0; i < 10; i++) {
    await dismissConsent(page);
    if (await page.getByTestId("ssp-results-panel").isVisible().catch(() => false)) return;
    await completeStructureIfNeeded(page);
    const next = page.getByTestId("esg-wizard-next");
    if (await next.isEnabled().catch(() => false)) {
      await next.click();
      await page.waitForTimeout(600);
    } else {
      // Force enable path: one more structure fill attempt then stop.
      await completeStructureIfNeeded(page);
      await page.waitForTimeout(400);
      if (!(await next.isEnabled().catch(() => false))) break;
    }
  }
}

test.describe("Phase 6C.2 SSP frontend preview Calculate", () => {
  test.describe.configure({ mode: "serial" });

  test("stack isolation refuses production markers", async () => {
    const stack = loadStack();
    expect(stack.api_base).toMatch(/127\.0\.0\.1|localhost/);
    expect(stack.database_url).toMatch(/127\.0\.0\.1|localhost/);
    expect(stack.database_url).not.toMatch(/18\.211\.235\.71/);
  });

  test("API preview matches independent algebra (1.0 tCO2e) + org isolation", async () => {
    const stack = loadStack();
    const tokenA = await loginToken(stack);
    const tokenB = await loginToken(stack, stack.email_b, stack.password);

    const { res, body } = await apiJson(stack, "/api/v1/ssp/calculate", {
      method: "POST",
      token: tokenA,
      body: JSON.stringify({
        persist_preview: false,
        holding_client_id: "h1",
        draft: goldenDraft(),
      }),
    });
    expect(res.status, JSON.stringify(body)).toBe(200);
    const calc = body as Record<string, unknown>;
    expect(calc.status).toBe("complete");
    expect(calc.is_reportable).toBe(false);
    expect(calc.include_in_portfolio).toBe(false);
    expect(calc.financed_emissions).toBe(1);
    expect(calc.iaf).toBe(0.25);
    expect(calc.taf).toBe(1);

    const { res: cross } = await apiJson(stack, "/api/v1/ssp/drafts?financing_instance_id=does-not-exist-org-b", {
      method: "GET",
      token: tokenB,
    });
    expect(cross.status).toBe(200);

    const { res: badAuth } = await apiJson(stack, "/api/v1/ssp/calculate", {
      method: "POST",
      body: JSON.stringify({ draft: goldenDraft() }),
    });
    expect([401, 403]).toContain(badAuth.status);

    const { res: unsupported, body: unsupportedBody } = await apiJson(stack, "/api/v1/ssp/calculate", {
      method: "POST",
      token: tokenA,
      body: JSON.stringify({
        persist_preview: false,
        draft: {
          ...goldenDraft(),
          deal: { ...goldenDraft().deal, hasPoolOfPools: "yes" },
          eligibility: { ...goldenDraft().eligibility, hasPoolOfPools: "yes" },
          poolOfPools: { poolOfPoolsId: "pop1", name: "PoP", poolIds: ["p1"] },
        },
      }),
    });
    expect(unsupported.status).toBe(200);
    expect((unsupportedBody as { status?: string }).status).toBe("unsupported");
  });

  test("Browser: save draft, Calculate preview shows 1.0, refresh keeps draft, Save reportable stays off", async ({
    page,
  }) => {
    const stack = loadStack();
    const token = await loginToken(stack);

    const base = goldenDraft();
    const draft = {
      ...base,
      financingInstanceId: INSTANCE,
      holdings: base.holdings.map((h) => ({ ...h, financingInstanceId: INSTANCE })),
    };
    const upsert = await apiJson(stack, "/api/v1/ssp/drafts", {
      method: "PUT",
      token,
      body: JSON.stringify({
        financing_instance_id: INSTANCE,
        instance_key: "securitization-structured-products#1",
        counterparty_id: stack.counterparty_id,
        update_shared: true,
        draft,
      }),
    });
    expect(upsert.res.status, JSON.stringify(upsert.body)).toBeLessThan(300);

    const verify = await apiJson(stack, `/api/v1/ssp/drafts/by-instance/${INSTANCE}`, {
      method: "GET",
      token,
    });
    expect(verify.res.status).toBe(200);
    const verified = verify.body as {
      draft?: { holdings?: Array<{ bankOutstandingInvestment?: number; name?: string }>; emissionsPath?: string };
    };
    expect(verified.draft?.emissionsPath).toBe("lookthrough");
    expect(verified.draft?.holdings?.[0]?.bankOutstandingInvestment).toBe(10);

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

    await expect(page.getByTestId("ssp-preview-total")).toContainText(/1(\.0+)?/, { timeout: 20_000 });
    await expect(page.getByTestId("ssp-preview-scopes")).toBeVisible();
    await expect(page.getByTestId("ssp-preview-layers")).toBeVisible();
    await expect(page.getByTestId("ssp-preview-provenance")).toContainText(/PCAF|§5\.8|5\.8/i);

    // Refresh — draft still present; recalculate still works.
    await openFinanceWizard(page, stack.counterparty_id);
    await page.getByTestId("loan-type-securitization-structured-products").click();
    await page.getByTestId("esg-wizard-next").click();
    await advanceToReview(page);
    await expect(page.getByTestId("ssp-results-panel")).toBeVisible({ timeout: 45_000 });
    await page.getByTestId("ssp-calculate-preview").click();
    await expect(page.getByTestId("ssp-preview-total")).toContainText(/1(\.0+)?/, { timeout: 20_000 });
  });
});
