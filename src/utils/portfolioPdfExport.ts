type PortfolioCompanyRow = {
  name: string;
  counterpartyType: string;
  sector: string;
  geography: string;
  amount: number;
  probabilityOfDefault: number;
  lossGivenDefault: number;
  tenor: number;
  /** Distinct data quality scores from saved finance emissions (e.g. "1, 2") or "—" */
  financeDataQualityScores?: string;
  /** Distinct data quality scores from saved facilitated emissions */
  facilitatedDataQualityScores?: string;
};

/** Read data quality scores from `emission_calculations.results` JSON (aggregate row), with optional DB column fallback. */
export const formatDataQualityScoresFromStoredResults = (results: unknown, fallbackScore?: unknown): string => {
  if (!results || typeof results !== "object") return "—";
  const r = results as Record<string, unknown>;
  const all = Array.isArray(r.allResults) ? (r.allResults as Record<string, unknown>[]) : [];
  const scores = all
    .map((row) => row?.dataQualityScore)
    .filter((n): n is number => typeof n === "number" && Number.isFinite(n))
    .map((n) => Math.round(n));
  const uniq = [...new Set(scores)].sort((a, b) => a - b);
  if (uniq.length > 0) return uniq.join(", ");
  const agg = r.dataQualityScore;
  if (typeof agg === "number" && Number.isFinite(agg)) return String(Math.round(agg));
  if (typeof fallbackScore === "number" && Number.isFinite(fallbackScore)) {
    return String(Math.round(fallbackScore));
  }
  if (typeof fallbackScore === "string" && fallbackScore.trim() !== "") {
    const parsed = Number(fallbackScore);
    if (Number.isFinite(parsed)) return String(Math.round(parsed));
  }
  return "—";
};

/** @deprecated Prefer `formatDataQualityScoresFromStoredResults` */
export const formatPcafFromStoredResults = formatDataQualityScoresFromStoredResults;

export type PortfolioPdfReportInput = {
  organizationName: string;
  displayName: string;
  generatedAt: string;
  financeEmissions: number;
  facilitatedEmissions: number;
  companies: PortfolioCompanyRow[];
};

type BreakdownRow = {
  label: string;
  count: number;
  amount: number;
};

type PortfolioPdfReportData = PortfolioPdfReportInput & {
  totalCompanies: number;
  totalExposure: number;
  avgProbabilityOfDefault: number;
  avgLossGivenDefault: number;
  avgTenor: number;
  sectorBreakdown: BreakdownRow[];
  geographyBreakdown: BreakdownRow[];
};

const escapeHtml = (unsafe: string): string =>
  String(unsafe ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

const fmt = (value: number, digits = 2) =>
  (Number(value) || 0).toLocaleString(undefined, {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });

const fmtInt = (value: number) =>
  (Number(value) || 0).toLocaleString(undefined, { maximumFractionDigits: 0 });

const getReportCSS = (): string => `
  * { box-sizing: border-box; margin: 0; padding: 0; }
  .report { width: 800px; font-family: 'DM Sans', Arial, sans-serif; color: #1f2a23; background: #fff; line-height: 1.45; }
  .cover-title, .section-title, .toc-title, .page-header > div:first-child { font-family: 'Playfair Display', serif; }
  .cover { width: 800px; height: 1131px; background: #d9e0e3; position: relative; overflow: hidden; page-break-after: always; }
  .cover-border-top { position: absolute; top: 0; left: 0; width: 100%; height: 30px; background: #0c4a3f; }
  .cover-border-bottom { position: absolute; bottom: 0; left: 0; width: 100%; height: 30px; background: #0c4a3f; }
  .cover-border-left { position: absolute; top: 0; left: 0; width: 30px; height: 100%; background: #0c4a3f; }
  .cover-border-right { position: absolute; top: 0; right: 0; width: 30px; height: 100%; background: #0c4a3f; }
  .cover-inner { position: absolute; top: 30px; right: 30px; bottom: 30px; left: 30px; padding: 28px 30px 34px; }
  .cover-header { display: flex; justify-content: space-between; align-items: center; }
  .cover-brand { display: flex; align-items: center; margin-top: 14px; }
  .cover-logo { height: 86px; width: auto; object-fit: contain; }
  .cover-year { font-size: 34px; color: #0A3D2E; }
  .cover-body { margin-top: 190px; padding-left: 20px; }
  .cover-title { font-size: 56px; line-height: 1.04; color: #0A3D2E; margin-bottom: 24px; }
  .cover-company { font-size: 36px; color: #0A3D2E; margin-bottom: 8px; }
  .cover-period { font-size: 24px; color: #0A3D2E; margin-bottom: 14px; }
  .cover-footer { position: absolute; right: 20px; bottom: 8px; left: 20px; font-size: 10px; color: #3d4b42; text-align: center; }
  .inner-page { width: 800px; min-height: 1131px; background: #fff; page-break-after: always; position: relative; }
  .page-header { background: #0c4a3f; color: #fff; padding: 14px 34px; display: flex; justify-content: space-between; align-items: center; font-size: 12px; }
  .header-left { display: flex; align-items: center; }
  .header-logo {
    height: 30px;
    width: auto;
    object-fit: contain;
    /* Improve visibility on dark green header */
    filter: brightness(0) invert(1) contrast(1.2);
    opacity: 0.95;
  }
  .page-content { padding: 28px 34px 66px; }
  .section-title { font-size: 30px; color: #0A3D2E; margin-bottom: 8px; }
  .sub-title { font-size: 14px; color: #40544b; margin-bottom: 14px; }
  .toc-title { font-size: 34px; color: #0A3D2E; margin-bottom: 20px; }
  .toc-row { display: flex; justify-content: space-between; align-items: center; padding: 8px 0; border-bottom: 1px dashed #d4dfd9; font-size: 14px; color: #1f2a23; }
  .kpis { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; margin-bottom: 16px; }
  .kpi { border: 1px solid #d6e3dc; border-radius: 10px; padding: 12px; background: #f9fcfa; }
  .kpi-label { font-size: 11px; color: #5a6d63; margin-bottom: 4px; text-transform: uppercase; letter-spacing: 0.04em; }
  .kpi-value { font-size: 20px; font-weight: 700; color: #0A3D2E; }
  .table { width: 100%; border-collapse: collapse; border: 1px solid #d6e3dc; margin-top: 14px; }
  .table th { background: #0A3D2E; color: #fff; text-align: left; font-size: 11px; padding: 9px; }
  .table td { border-top: 1px solid #e5ede9; font-size: 11px; color: #2f4a3d; padding: 8px 9px; }
  .table td.num, .table th.num { text-align: right; font-variant-numeric: tabular-nums; }
  .note-box { margin-top: 14px; border: 1px solid #d6e3dc; border-radius: 10px; padding: 12px; background: #f9fcfa; font-size: 12px; color: #33443c; }
  .page-number { position: absolute; left: 0; right: 0; bottom: 20px; text-align: center; font-size: 10px; color: #6c7e74; }
  .back-cover { width: 800px; min-height: 1131px; background: #123b2f; display: flex; align-items: flex-end; justify-content: flex-end; padding: 56px 62px; page-break-after: always; }
  .powered-by { color: #ffffff; text-align: right; }
  .powered-by-label { font-size: 12px; letter-spacing: 0.08em; text-transform: uppercase; opacity: 0.75; margin-bottom: 8px; }
  .powered-by-name { font-size: 26px; font-family: 'Playfair Display', serif; }
`;

export const buildPortfolioReportData = (input: PortfolioPdfReportInput): PortfolioPdfReportData => {
  const companies = input.companies || [];
  const totalCompanies = companies.length;
  const totalExposure = companies.reduce((sum, c) => sum + (Number(c.amount) || 0), 0);
  const avgProbabilityOfDefault =
    totalCompanies > 0
      ? companies.reduce((sum, c) => sum + (Number(c.probabilityOfDefault) || 0), 0) / totalCompanies
      : 0;
  const avgLossGivenDefault =
    totalCompanies > 0 ? companies.reduce((sum, c) => sum + (Number(c.lossGivenDefault) || 0), 0) / totalCompanies : 0;
  const avgTenor = totalCompanies > 0 ? companies.reduce((sum, c) => sum + (Number(c.tenor) || 0), 0) / totalCompanies : 0;

  const buildBreakdown = (key: "sector" | "geography"): BreakdownRow[] => {
    const map = new Map<string, BreakdownRow>();
    companies.forEach((c) => {
      const label = (c[key] || "N/A").trim() || "N/A";
      const prev = map.get(label) || { label, count: 0, amount: 0 };
      prev.count += 1;
      prev.amount += Number(c.amount) || 0;
      map.set(label, prev);
    });
    return Array.from(map.values()).sort((a, b) => b.amount - a.amount);
  };

  return {
    ...input,
    totalCompanies,
    totalExposure,
    avgProbabilityOfDefault,
    avgLossGivenDefault,
    avgTenor,
    sectorBreakdown: buildBreakdown("sector"),
    geographyBreakdown: buildBreakdown("geography"),
  };
};

const getReportContent = (data: PortfolioPdfReportData): string => {
  const rowsPerPage = 16;
  const companyChunks: PortfolioCompanyRow[][] = [];
  for (let i = 0; i < Math.max(data.companies.length, 1); i += rowsPerPage) {
    companyChunks.push(data.companies.slice(i, i + rowsPerPage));
  }
  if (data.companies.length === 0) companyChunks.push([]);

  const companyStartPage = 4;
  const sectorPage = companyStartPage + companyChunks.length;
  const geographyPage = sectorPage + 1;
  const closingPage = geographyPage + 1;
  const logoPath = "/new_short_logo.svg";

  let pageNo = 1;
  const page = (body: string) => {
    pageNo += 1;
    return `
      <div class="inner-page">
        <div class="page-header">
          <div class="header-left">
            <img class="header-logo" src="${logoPath}" alt="Rethink Carbon logo" />
          </div>
          <div>${escapeHtml(data.displayName)} | Portfolio Report</div>
        </div>
        <div class="page-content">${body}</div>
        <div class="page-number">${pageNo}</div>
      </div>
    `;
  };

  const companyPagesHtml = companyChunks
    .map((chunk, index) => {
      const start = index * rowsPerPage + 1;
      const end = index * rowsPerPage + chunk.length;
      return page(`
        <div class="section-title">Detailed Company Breakdown</div>
        <table class="table">
          <thead>
            <tr>
              <th>Company</th>
              <th>Counterparty Type</th>
              <th>Sector</th>
              <th>Geography</th>
              <th class="num">Exposure (PKR)</th>
              <th class="num">PD %</th>
              <th class="num">LGD %</th>
              <th class="num">Tenor (months)</th>
              <th class="num">Fin. data quality score</th>
              <th class="num">Fac. data quality score</th>
            </tr>
          </thead>
          <tbody>
            ${
              chunk.length > 0
                ? chunk
                    .map(
                      (c) => `
              <tr>
                <td>${escapeHtml(c.name)}</td>
                <td>${escapeHtml(c.counterpartyType || "N/A")}</td>
                <td>${escapeHtml(c.sector || "N/A")}</td>
                <td>${escapeHtml(c.geography || "N/A")}</td>
                <td class="num">${fmtInt(c.amount)}</td>
                <td class="num">${fmt(c.probabilityOfDefault, 2)}</td>
                <td class="num">${fmt(c.lossGivenDefault, 2)}</td>
                <td class="num">${fmt(c.tenor, 0)}</td>
                <td class="num">${escapeHtml(c.financeDataQualityScores ?? "—")}</td>
                <td class="num">${escapeHtml(c.facilitatedDataQualityScores ?? "—")}</td>
              </tr>`
                    )
                    .join("")
                : `<tr><td colspan="10">No portfolio companies available.</td></tr>`
            }
          </tbody>
        </table>
      `);
    })
    .join("");

  const breakdownTable = (rows: BreakdownRow[], label: string) => `
    <div class="section-title">${label}</div>
    <table class="table">
      <thead>
        <tr>
          <th>${label.includes("Sector") ? "Sector" : "Geography"}</th>
          <th class="num">Companies</th>
          <th class="num">Exposure (PKR)</th>
          <th class="num">Share of Total</th>
        </tr>
      </thead>
      <tbody>
        ${
          rows.length > 0
            ? rows
                .map(
                  (r) => `
          <tr>
            <td>${escapeHtml(r.label)}</td>
            <td class="num">${fmt(r.count, 0)}</td>
            <td class="num">${fmtInt(r.amount)}</td>
            <td class="num">${data.totalExposure > 0 ? fmt((r.amount / data.totalExposure) * 100, 1) : "0.0"}%</td>
          </tr>`
                )
                .join("")
            : `<tr><td colspan="4">No data available.</td></tr>`
        }
      </tbody>
    </table>
  `;

  const generatedDate = new Date(data.generatedAt);

  return `
    <div class="report">
      <div class="cover">
        <div class="cover-border-top"></div><div class="cover-border-bottom"></div><div class="cover-border-left"></div><div class="cover-border-right"></div>
        <div class="cover-inner">
          <div class="cover-header">
            <div class="cover-brand">
              <img class="cover-logo" src="${logoPath}" alt="Rethink Carbon logo" />
            </div>
            <div class="cover-year">${generatedDate.getFullYear()}</div>
          </div>
          <div class="cover-body">
            <div class="cover-title">Portfolio Emissions Report</div>
            <div class="cover-company">${escapeHtml(data.organizationName)}</div>
            <div class="cover-period">${escapeHtml(
              generatedDate.toLocaleDateString(undefined, { month: "long", year: "numeric" })
            )}</div>
          </div>
          <div class="cover-footer">Confidential report generated from portfolio, finance, and facilitated emissions data.</div>
        </div>
      </div>

      ${page(`
        <div class="toc-title">Table of Contents</div>
        <div class="toc-row"><span>Executive Summary</span><span>3</span></div>
        <div class="toc-row"><span>Detailed Company Breakdown</span><span>${companyStartPage}</span></div>
        <div class="toc-row"><span>Sector-wise Breakdown</span><span>${sectorPage}</span></div>
        <div class="toc-row"><span>Geography-wise Breakdown</span><span>${geographyPage}</span></div>
        <div class="toc-row"><span>Closing Notes</span><span>${closingPage}</span></div>
      `)}

      ${page(`
        <div class="section-title">Executive Summary</div>
        <div class="sub-title">Generated on ${escapeHtml(
          generatedDate.toLocaleString(undefined, {
            year: "numeric",
            month: "long",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })
        )}</div>
        <div class="kpis">
          <div class="kpi"><div class="kpi-label">Total Companies</div><div class="kpi-value">${fmt(data.totalCompanies, 0)}</div></div>
          <div class="kpi"><div class="kpi-label">Total Portfolio Exposure (PKR)</div><div class="kpi-value">${fmtInt(data.totalExposure)}</div></div>
          <div class="kpi"><div class="kpi-label">Finance Emissions (tCO2e)</div><div class="kpi-value">${fmt(data.financeEmissions, 2)}</div></div>
          <div class="kpi"><div class="kpi-label">Facilitated Emissions (tCO2e)</div><div class="kpi-value">${fmt(data.facilitatedEmissions, 2)}</div></div>
          <div class="kpi"><div class="kpi-label">Average PD (%)</div><div class="kpi-value">${fmt(data.avgProbabilityOfDefault, 2)}</div></div>
          <div class="kpi"><div class="kpi-label">Average LGD (%)</div><div class="kpi-value">${fmt(data.avgLossGivenDefault, 2)}</div></div>
        </div>
        <div class="note-box">
          This summary consolidates current portfolio records and latest non-failed finance/facilitated calculations for the active user account.
          Data quality scores (1 = highest data quality) in the company table come from saved aggregate calculation results.
        </div>
      `)}

      ${companyPagesHtml}
      ${page(breakdownTable(data.sectorBreakdown, "Sector-wise Breakdown"))}
      ${page(breakdownTable(data.geographyBreakdown, "Geography-wise Breakdown"))}
      <div class="back-cover">
        <div class="powered-by">
          <div class="powered-by-label">Powered by</div>
          <div class="powered-by-name">Rethink Carbon</div>
        </div>
      </div>
    </div>
  `;
};

export const exportPortfolioPdfReport = async (input: PortfolioPdfReportInput) => {
  const html2canvas = (await import("html2canvas")).default;
  const { default: jsPDF } = await import("jspdf");

  const data = buildPortfolioReportData(input);
  const wrapper = document.createElement("div");
  wrapper.style.width = "800px";
  wrapper.style.position = "absolute";
  wrapper.style.left = "-99999px";
  wrapper.style.top = "0";
  wrapper.style.background = "#ffffff";
  wrapper.innerHTML = `<style>${getReportCSS()}</style>${getReportContent(data)}`;
  document.body.appendChild(wrapper);

  const reportPages = Array.from(wrapper.querySelectorAll(".cover, .inner-page, .back-cover")) as HTMLElement[];
  const pdf = new jsPDF("p", "mm", "a4");
  const pageWidth = 210;
  const pageHeight = 297;
  const margin = 0;
  const contentWidth = pageWidth;
  const contentHeight = pageHeight;
  const renderScale = 1.2;
  const jpegQuality = 0.62;

  for (let i = 0; i < reportPages.length; i++) {
    const canvas = await html2canvas(reportPages[i], {
      scale: renderScale,
      backgroundColor: "#ffffff",
      useCORS: true,
      allowTaint: true,
    });
    const imgData = canvas.toDataURL("image/jpeg", jpegQuality);
    if (i > 0) pdf.addPage();
    pdf.addImage(imgData, "JPEG", margin, margin, contentWidth, contentHeight);
  }

  document.body.removeChild(wrapper);
  const fileDate = new Date().toISOString().slice(0, 10);
  pdf.save(`Portfolio_Report_${fileDate}.pdf`);
};
