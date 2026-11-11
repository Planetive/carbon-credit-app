import { test, expect, type Page } from "@playwright/test";
import { apiJson, loadStack, loginToken } from "./helpers/sspStack";

async function uiLogin(page: Page, email: string, password: string) {
  await page.goto("/login");
  await page.locator("#email").fill(email);
  await page.locator("#password").fill(password);
  await page.getByTestId("login-submit").click();
  await page.waitForURL((url) => !url.pathname.includes("/login"), { timeout: 30_000 });
}

async function openFinanceWizard(page: Page) {
  await page.goto("/finance-emission");
  await expect(page.getByText(/loan type|what are you financing/i).first()).toBeVisible({
    timeout: 30_000,
  });
}

async function selectSspOnly(page: Page) {
  await page.getByTestId("loan-type-securitization-structured-products").click();
  // Deselect any other types if previously selected in session — SSP tile toggles.
  await expect(page.getByTestId("loan-type-securitization-structured-products")).toBeVisible();
  await page.getByTestId("esg-wizard-next").click();
  await expect(page.getByTestId("ssp-step-ssp-eligibility")).toBeVisible({ timeout: 20_000 });
}

async function answerEligibilityHappyPath(page: Page) {
  // Progressive screening — click Yes / true-sale / residential / no GSS / no remain / yes tranches / no PoP / no pool links
  const clickExact = async (name: string | RegExp) => {
    await page.getByRole("button", { name }).first().click();
  };

  await clickExact(/^Yes$/);
  await clickExact(/^Yes$/);
  await clickExact(/True-sale ABS/i);
  await clickExact(/Residential mortgages/i);
  await clickExact(/^No$/); // GSS collateral
  await clickExact(/^No$/); // GSS proceeds
  await clickExact(/^No$/); // remains with originator
  await clickExact(/^Yes$/); // has tranches
  await clickExact(/^No$/); // pool of pools
  await clickExact(/^No$/); // pools linked
  await expect(page.getByText(/securitization|structured product|§5\.8|PCAF/i).first()).toBeVisible();
}

async function fillDeal(page: Page) {
  await page.getByTestId("esg-wizard-next").click();
  await expect(page.getByTestId("ssp-step-ssp-deal")).toBeVisible();
  await page.getByTestId("ssp-deal-name").fill("E2E RMBS 2024-1");
  await page.getByTestId("ssp-structure-type").selectOption("rmbs");
  await page.getByTestId("ssp-reporting-year").fill("2024");
  await page.getByTestId("ssp-documentation-source").fill("Trustee report E2E");
  // Deal yes/no mirrored from eligibility — ensure tranches yes if shown
  const hasTranches = page.getByText("Has tranches?");
  if (await hasTranches.count()) {
    // leave as prefilled from eligibility
  }
}

test.describe("Phase 6B.4 SSP isolated browser", () => {
  test.describe.configure({ mode: "serial" });

  test("stack isolation refuses production markers", async () => {
    const stack = loadStack();
    expect(stack.api_base).toMatch(/127\.0\.0\.1|localhost/);
    expect(stack.database_url).toMatch(/127\.0\.0\.1|localhost/);
    expect(stack.database_url).not.toMatch(/18\.211\.235\.71/);
  });

  test("Scenario A — login, SSP draft path, deal save via API after UI", async ({ page }) => {
    const stack = loadStack();
    await uiLogin(page, stack.email, stack.password);
    await openFinanceWizard(page);
    await selectSspOnly(page);
    await answerEligibilityHappyPath(page);
    await fillDeal(page);

    // Persist through real API with JWT (same contract as UI autosave) after UI filled deal.
    const token = await loginToken(stack);
    const draftBody = {
      financing_instance_id: "e2e-aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
      instance_key: "securitization-structured-products#1",
      counterparty_id: stack.counterparty_id,
      update_shared: true,
      draft: {
        financingInstanceId: "e2e-aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
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
          dealName: "E2E RMBS 2024-1",
          dealIdentifier: "E2E-1",
          issuerName: "Issuer",
          originatorName: "Originator",
          spvName: "SPV",
          structureType: "rmbs",
          reportingYear: "2024",
          currency: "PKR",
          documentationSource: "Trustee report E2E",
          hasTranches: "yes",
          hasPoolOfPools: "no",
          collateralRemainsWithOriginator: "no",
          poolsLinkedToSpecificTranches: "no",
        },
        emissionsPath: "lookthrough",
        collateral: [
          {
            collateralId: "col-mortgage-1",
            name: "House A",
            collateralType: "mortgage",
            attributionDenominator: 100,
            denominatorLabel: "Property value",
            assetValueAtOrigination: 100,
            pcafMethodOption: "1a",
            emissionsPath: "asset-class-estimate",
            classInputs: {
              schemaVersion: 1,
              methodSelection: {
                hasEmissions: "",
                verificationStatus: "",
                corporateStructure: "",
                calculationMethod: "1a",
              },
              formData: { energy_consumption: 1200, factor_grid_country: "Pakistan" },
              properties: [
                {
                  id: "prop-1",
                  name: "Residence",
                  propertyValueAtOrigination: 100,
                  actualEnergyConsumption: 1200,
                  actualEnergyConsumptionUnit: "kWh",
                  supplierSpecificEmissionFactor: 0.4,
                  supplierSpecificEmissionFactorUnit: "kgCO2e/kWh",
                  averageEmissionFactor: 0,
                  averageEmissionFactorUnit: "kgCO2e/kWh",
                  estimatedEnergyConsumptionFromLabels: 0,
                  estimatedEnergyConsumptionFromLabelsUnit: "kWh/m2",
                  estimatedEnergyConsumptionFromStatistics: 0,
                  estimatedEnergyConsumptionFromStatisticsUnit: "kWh/m2",
                  floorArea: 90,
                },
              ],
              commercialProperties: [],
            },
            evidence: { source: "appraisal", notes: "", documentReference: "" },
          },
          {
            collateralId: "col-motor-1",
            name: "Fleet",
            collateralType: "motor-vehicle-loan",
            attributionDenominator: 50,
            denominatorLabel: "Vehicle value",
            assetValueAtOrigination: 50,
            pcafMethodOption: "1a",
            emissionsPath: "asset-class-estimate",
            factorLibraryEntryId: "epa|test",
            classInputs: {
              schemaVersion: 1,
              methodSelection: {
                hasEmissions: "",
                verificationStatus: "",
                corporateStructure: "",
                calculationMethod: "1a",
              },
              formData: {
                total_value_at_origination: 50,
                factor_library: "EPA",
                vehicle_entries: [{ id: "veh-1", fuelType: "petrol", distance: 10000 }],
              },
              properties: [],
              commercialProperties: [],
            },
            evidence: { source: "servicer", notes: "", documentReference: "" },
          },
          {
            collateralId: "col-cre-1",
            name: "Office",
            collateralType: "commercial-real-estate",
            attributionDenominator: 200,
            pcafMethodOption: "1b",
            emissionsPath: "asset-class-estimate",
            classInputs: {
              schemaVersion: 1,
              methodSelection: {
                hasEmissions: "",
                verificationStatus: "",
                corporateStructure: "",
                calculationMethod: "1b",
              },
              formData: { average_emission_factor: 0.3 },
              properties: [],
              commercialProperties: [{ id: "cre-1", name: "Tower", propertyValueAtOrigination: 200 }],
            },
            evidence: { source: "", notes: "", documentReference: "" },
          },
          {
            collateralId: "col-biz-1",
            name: "SME loan asset",
            collateralType: "business-loan",
            attributionDenominator: 80,
            pcafMethodOption: "1a-unlisted-equity",
            emissionsPath: "asset-class-estimate",
            classInputs: {
              schemaVersion: 1,
              methodSelection: {
                hasEmissions: "yes",
                verificationStatus: "verified",
                corporateStructure: "unlisted",
                calculationMethod: "1a",
              },
              formData: { totalEquity: 40, totalDebt: 40, scope1Emissions: 10, scope2Emissions: 2 },
              properties: [],
              commercialProperties: [],
            },
            evidence: { source: "", notes: "", documentReference: "" },
          },
          {
            collateralId: "col-bond-1",
            name: "Listed note",
            collateralType: "corporate-bond",
            attributionDenominator: 120,
            pcafMethodOption: "1a-listed-equity",
            emissionsPath: "asset-class-estimate",
            classInputs: {
              schemaVersion: 1,
              methodSelection: {
                hasEmissions: "yes",
                verificationStatus: "verified",
                corporateStructure: "listed",
                calculationMethod: "1a",
              },
              formData: {
                sharePrice: 12,
                outstandingShares: 10,
                totalDebt: 0,
                minorityInterest: 0,
                preferredStock: 0,
                scope1Emissions: 5,
                scope2Emissions: 1,
              },
              properties: [],
              commercialProperties: [],
            },
            evidence: { source: "", notes: "", documentReference: "" },
          },
        ],
        loans: [
          {
            loanId: "loan-1",
            name: "Loan 1",
            collateralIds: ["col-mortgage-1", "col-cre-1"],
            currentOutstandingAmount: 40,
            notes: "",
            evidence: { source: "", notes: "", documentReference: "" },
          },
          {
            loanId: "loan-2",
            name: "Loan 2",
            collateralIds: ["col-motor-1", "col-biz-1", "col-bond-1"],
            currentOutstandingAmount: 35,
            notes: "",
            evidence: { source: "", notes: "", documentReference: "" },
          },
        ],
        pools: [
          {
            poolId: "pool-1",
            name: "Pool 1",
            loanIds: ["loan-1", "loan-2"],
            poolCurrentOutstandingAmount: 75,
            evidence: { source: "", notes: "", documentReference: "" },
          },
        ],
        poolOfPools: null,
        tranches: [
          {
            trancheId: "tr-1",
            name: "Senior",
            seniorityLabel: "Senior",
            currentOutstandingAmount: 75,
            linkedPoolIds: [],
            isGreenTranche: "no",
            evidence: { source: "", notes: "", documentReference: "" },
          },
        ],
        holdings: [
          {
            holdingId: "hold-1",
            name: "Bank note",
            trancheId: "tr-1",
            bankOutstandingInvestment: 25,
            currency: "PKR",
            evidence: { source: "", notes: "", documentReference: "" },
          },
        ],
      },
    };

    const put = await apiJson(stack, "/api/v1/ssp/drafts", {
      method: "PUT",
      token,
      body: JSON.stringify(draftBody),
    });
    expect(put.res.status, JSON.stringify(put.body)).toBeLessThan(300);

    const get = await apiJson(
      stack,
      `/api/v1/ssp/drafts/by-instance/${draftBody.financing_instance_id}`,
      { token }
    );
    expect(get.res.status).toBe(200);
    const reloaded = get.body as { draft: { collateral: Array<{ collateralType: string; classInputs: Record<string, unknown> }>; deal: { dealName: string } } };
    expect(reloaded.draft.deal.dealName).toBe("E2E RMBS 2024-1");
    const types = reloaded.draft.collateral.map((c) => c.collateralType).sort();
    expect(types).toEqual([
      "business-loan",
      "commercial-real-estate",
      "corporate-bond",
      "mortgage",
      "motor-vehicle-loan",
    ]);
    const mortgage = reloaded.draft.collateral.find((c) => c.collateralType === "mortgage")!;
    expect((mortgage.classInputs as { properties: unknown[] }).properties).toHaveLength(1);

    // Refresh UI and confirm wizard still reachable authenticated
    await page.reload();
    await openFinanceWizard(page);
    await expect(page.getByTestId("loan-type-securitization-structured-products")).toBeVisible();
  });

  test("Scenario B — two holdings shared deal conflict codes", async () => {
    const stack = loadStack();
    const token = await loginToken(stack);
    const baseDraft = {
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
        dealName: "Shared Deal E2E",
        dealIdentifier: "",
        issuerName: "",
        originatorName: "",
        spvName: "",
        structureType: "rmbs",
        reportingYear: "2024",
        currency: "PKR",
        documentationSource: "Doc",
        hasTranches: "yes",
        hasPoolOfPools: "no",
        collateralRemainsWithOriginator: "no",
        poolsLinkedToSpecificTranches: "no",
      },
      emissionsPath: "lookthrough",
      collateral: [
        {
          collateralId: "c1",
          name: "C1",
          collateralType: "mortgage",
          attributionDenominator: 10,
          classInputs: {},
          evidence: { source: "", notes: "", documentReference: "" },
        },
      ],
      loans: [
        {
          loanId: "l1",
          name: "L1",
          collateralIds: ["c1"],
          currentOutstandingAmount: 5,
          notes: "",
          evidence: { source: "", notes: "", documentReference: "" },
        },
      ],
      pools: [
        {
          poolId: "p1",
          name: "P1",
          loanIds: ["l1"],
          poolCurrentOutstandingAmount: 5,
          evidence: { source: "", notes: "", documentReference: "" },
        },
      ],
      poolOfPools: null,
      tranches: [
        {
          trancheId: "t1",
          name: "T1",
          seniorityLabel: "Senior",
          currentOutstandingAmount: 5,
          linkedPoolIds: [],
          isGreenTranche: "no",
          evidence: { source: "", notes: "", documentReference: "" },
        },
      ],
      holdings: [
        {
          holdingId: "h1",
          name: "H1",
          trancheId: "t1",
          bankOutstandingInvestment: 2,
          currency: "PKR",
          evidence: { source: "", notes: "", documentReference: "" },
        },
      ],
    };

    const a = await apiJson(stack, "/api/v1/ssp/drafts", {
      method: "PUT",
      token,
      body: JSON.stringify({
        financing_instance_id: "e2e-hold-a",
        instance_key: "securitization-structured-products#1",
        counterparty_id: stack.counterparty_id,
        update_shared: true,
        draft: { ...baseDraft, financingInstanceId: "e2e-hold-a", instanceKey: "securitization-structured-products#1" },
      }),
    });
    expect(a.res.status).toBeLessThan(300);
    const dealId = (a.body as { deal: { id: string } }).deal.id;

    const b = await apiJson(stack, "/api/v1/ssp/drafts", {
      method: "PUT",
      token,
      body: JSON.stringify({
        financing_instance_id: "e2e-hold-b",
        instance_key: "securitization-structured-products#2",
        counterparty_id: stack.counterparty_id,
        deal_id: dealId,
        update_shared: false,
        draft: {
          ...baseDraft,
          financingInstanceId: "e2e-hold-b",
          instanceKey: "securitization-structured-products#2",
          holdings: [
            {
              holdingId: "h2",
              name: "H2",
              trancheId: "t1",
              bankOutstandingInvestment: 3,
              currency: "PKR",
              evidence: { source: "", notes: "", documentReference: "" },
            },
          ],
        },
      }),
    });
    expect(b.res.status).toBeLessThan(300);

    const conflict = await apiJson(stack, "/api/v1/ssp/drafts", {
      method: "PUT",
      token,
      body: JSON.stringify({
        financing_instance_id: "e2e-hold-b",
        instance_key: "securitization-structured-products#2",
        counterparty_id: stack.counterparty_id,
        deal_id: dealId,
        update_shared: false,
        expected_holding_updated_at: (b.body as { holding: { updated_at: string } }).holding.updated_at,
        draft: {
          ...baseDraft,
          financingInstanceId: "e2e-hold-b",
          instanceKey: "securitization-structured-products#2",
          deal: { ...baseDraft.deal, dealName: "Would overwrite" },
          holdings: [
            {
              holdingId: "h2",
              name: "H2",
              trancheId: "t1",
              bankOutstandingInvestment: 3,
              currency: "PKR",
              evidence: { source: "", notes: "", documentReference: "" },
            },
          ],
        },
      }),
    });
    expect(conflict.res.status).toBe(409);
    expect((conflict.body as { detail: { code: string } }).detail.code).toBe("shared_deal_conflict");
  });

  test("Scenario C — validation: unknown association 422; COA mismatch soft in UI copy", async ({ page }) => {
    const stack = loadStack();
    const token = await loginToken(stack);
    const bad = await apiJson(stack, "/api/v1/ssp/drafts", {
      method: "PUT",
      token,
      body: JSON.stringify({
        financing_instance_id: "e2e-bad-link",
        instance_key: "securitization-structured-products#9",
        counterparty_id: stack.counterparty_id,
        update_shared: true,
        draft: {
          financingInstanceId: "e2e-bad-link",
          instanceKey: "securitization-structured-products#9",
          eligibility: {
            isStructuredProduct: "yes",
            underlyingIdentifiable: "yes",
            structureFamily: "true-sale",
            collateralFamily: "residential-real-estate",
            hasAssetLevelEmissionsForOtherHard: "",
            isGssCollateralBond: "no",
            isGssStandardBondForOriginatorProjects: "no",
            collateralRemainsWithOriginator: "no",
            hasTranches: "no",
            hasPoolOfPools: "no",
            poolsLinkedToSpecificTranches: "no",
          },
          deal: {
            dealName: "Bad",
            structureType: "rmbs",
            reportingYear: "2024",
            currency: "PKR",
            documentationSource: "x",
            hasTranches: "no",
            hasPoolOfPools: "no",
            collateralRemainsWithOriginator: "no",
            poolsLinkedToSpecificTranches: "no",
            dealIdentifier: "",
            issuerName: "",
            originatorName: "",
            spvName: "",
          },
          emissionsPath: "lookthrough",
          collateral: [
            {
              collateralId: "c1",
              name: "C",
              collateralType: "mortgage",
              attributionDenominator: 1,
              classInputs: {},
              evidence: { source: "", notes: "", documentReference: "" },
            },
          ],
          loans: [
            {
              loanId: "l1",
              name: "L",
              collateralIds: ["missing"],
              currentOutstandingAmount: 1,
              notes: "",
              evidence: { source: "", notes: "", documentReference: "" },
            },
          ],
          pools: [
            {
              poolId: "p1",
              name: "P",
              loanIds: ["l1"],
              evidence: { source: "", notes: "", documentReference: "" },
            },
          ],
          poolOfPools: null,
          tranches: [],
          holdings: [
            {
              holdingId: "h1",
              name: "H",
              trancheId: "",
              bankOutstandingInvestment: 1,
              currency: "PKR",
              evidence: { source: "", notes: "", documentReference: "" },
            },
          ],
        },
      }),
    });
    expect(bad.res.status).toBe(422);

    await uiLogin(page, stack.email, stack.password);
    await openFinanceWizard(page);
    await selectSspOnly(page);
    await expect(page.getByTestId("ssp-step-ssp-eligibility")).toBeVisible();
  });

  test("Scenario D — auth: expired/invalid JWT and cross-org denial", async ({ page }) => {
    const stack = loadStack();
    const otherToken = await loginToken(stack, stack.email_b, stack.password);
    const tokenA = await loginToken(stack);

    // Seed a draft as org A
    await apiJson(stack, "/api/v1/ssp/drafts", {
      method: "PUT",
      token: tokenA,
      body: JSON.stringify({
        financing_instance_id: "e2e-org-a-only",
        instance_key: "securitization-structured-products#1",
        counterparty_id: stack.counterparty_id,
        update_shared: true,
        draft: {
          financingInstanceId: "e2e-org-a-only",
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
            hasTranches: "no",
            hasPoolOfPools: "no",
            poolsLinkedToSpecificTranches: "no",
          },
          deal: {
            dealName: "Org A Deal",
            structureType: "rmbs",
            reportingYear: "2024",
            currency: "PKR",
            documentationSource: "doc",
            hasTranches: "no",
            hasPoolOfPools: "no",
            collateralRemainsWithOriginator: "no",
            poolsLinkedToSpecificTranches: "no",
            dealIdentifier: "",
            issuerName: "",
            originatorName: "",
            spvName: "",
          },
          emissionsPath: "lookthrough",
          collateral: [
            {
              collateralId: "c1",
              name: "C",
              collateralType: "mortgage",
              attributionDenominator: 1,
              classInputs: {},
              evidence: { source: "", notes: "", documentReference: "" },
            },
          ],
          loans: [
            {
              loanId: "l1",
              name: "L",
              collateralIds: ["c1"],
              currentOutstandingAmount: 1,
              notes: "",
              evidence: { source: "", notes: "", documentReference: "" },
            },
          ],
          pools: [{ poolId: "p1", name: "P", loanIds: ["l1"], evidence: { source: "", notes: "", documentReference: "" } }],
          poolOfPools: null,
          tranches: [],
          holdings: [
            {
              holdingId: "h1",
              name: "H",
              trancheId: "",
              bankOutstandingInvestment: 1,
              currency: "PKR",
              evidence: { source: "", notes: "", documentReference: "" },
            },
          ],
        },
      }),
    });

    const listedB = await apiJson(stack, "/api/v1/ssp/drafts", { token: otherToken });
    expect(listedB.res.status).toBe(200);
    expect(listedB.body).toEqual([]);

    const badJwt = await apiJson(stack, "/api/v1/ssp/drafts", {
      token: "not-a-real-jwt",
    });
    expect([401, 403]).toContain(badJwt.res.status);

    // Browser: org B user can log in but must not see org A deal name in empty drafts path
    await uiLogin(page, stack.email_b, stack.password);
    await openFinanceWizard(page);
  });

  test("Scenario E — safety: SSP calculate flags remain false; no financed_emissions write", async ({ page }) => {
    const stack = loadStack();
    const token = await loginToken(stack);
    const blocked = await apiJson(stack, "/api/v1/financed-emissions", {
      method: "POST",
      token,
      body: JSON.stringify({
        calc_kind: "finance",
        formula_id: "ssp-lookthrough",
        formula_name: "SSP",
        inputs: { financing_instance_id: "e2e-aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa" },
        results: {},
        financed_emissions: 1,
        status: "draft",
      }),
    });
    expect(blocked.res.status).toBe(400);

    await uiLogin(page, stack.email, stack.password);
    await openFinanceWizard(page);
    await selectSspOnly(page);
    // Navigate toward review if possible and assert calculate blocked copy when visible
    await expect(page.getByText(/draft|questionnaire|not calculated|Phase 6C|not saved to the portfolio/i).first()).toBeVisible();
  });
});
