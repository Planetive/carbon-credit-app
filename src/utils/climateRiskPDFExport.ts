import jsPDF from 'jspdf';
import { ScenarioResult } from '@/features/climate-risk/core/types';

// Brand colors - Teal/Cyan theme
const BRAND_COLORS = {
  primary: '#14B8A6', // teal-500
  primaryDark: '#0D9488', // teal-600
  primaryLight: '#5EEAD4', // teal-300
  secondary: '#06B6D4', // cyan-500
  text: '#1F2937', // gray-800
  textLight: '#6B7280', // gray-500
  border: '#E5E7EB', // gray-200
  background: '#F9FAFB', // gray-50
  success: '#10B981', // green-500
  warning: '#F59E0B', // amber-500
  danger: '#EF4444', // red-500
};

// Emission Calculator (EPA) PDF palette — src/pages/EmissionCalculatorEPA.tsx
const REPORT_GREEN = {
  frame: { r: 26, g: 61, b: 46 }, // #1a3d2e borders, headers, back cover
  coverInner: { r: 232, g: 240, b: 235 }, // #e8f0eb
  coverTitle: { r: 26, g: 61, b: 46 }, // #1a3d2e
  coverMuted: { r: 90, g: 114, b: 96 }, // #5a7260
  topBarText: { r: 232, g: 240, b: 235 }, // #e8f0eb on green band
  backCover: { r: 26, g: 61, b: 46 },
};

const CONTENT_HEADER_H_MM = (52 / 800) * 210 * 0.85;
const CONTENT_START_Y = CONTENT_HEADER_H_MM + 6;

/** Same cover styling as `fullEmissionReportExport.ts` (Carbon Emissions Report). */
const TCFD_COVER_PAGE_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;500&family=DM+Sans:wght@300;400;500;700&display=swap');

  * { box-sizing: border-box; margin: 0; padding: 0; }
  .report { width: 800px; font-family: 'DM Sans', Arial, sans-serif; color: #1f2a23; background: #fff; line-height: 1.5; }

  .cover { width: 800px; height: 1131px; background: #d9e0e3; position: relative; overflow: hidden; }
  .cover-border-top { position: absolute; top: 0; left: 0; width: 100%; height: 30px; background: #0c4a3f; }
  .cover-border-bottom { position: absolute; bottom: 0; left: 0; width: 100%; height: 30px; background: #0c4a3f; }
  .cover-border-left { position: absolute; top: 0; left: 0; width: 30px; height: 100%; background: #0c4a3f; }
  .cover-border-right { position: absolute; top: 0; right: 0; width: 30px; height: 100%; background: #0c4a3f; }
  .cover-inner { position: absolute; top: 30px; right: 30px; bottom: 30px; left: 30px; padding: 28px 30px 34px; }
  .cover-header { display: flex; justify-content: space-between; align-items: center; min-height: 96px; }
  .cover-logo-wrap { display: flex; align-items: center; margin-top: 0; width: 360px; height: 96px; overflow: hidden; }
  .cover-logo-wrap img {
    height: 120px;
    width: auto;
    max-width: none;
    display: block;
    object-fit: contain;
    transform: scale(2.6) translate(-18px, 6px);
    transform-origin: left center;
  }
  .cover-year {
    font-family: 'Playfair Display', serif;
    font-size: 34px;
    color: #0A3D2E;
    height: 96px;
    display: flex;
    align-items: center;
    justify-content: flex-end;
    line-height: 1;
  }
  .cover-body { margin-top: 190px; padding-left: 20px; }
  .cover-title { font-family: 'Playfair Display', serif; font-size: 62px; line-height: 1.04; letter-spacing: -0.6px; color: #0A3D2E; margin-bottom: 26px; }
  .cover-company { font-family: 'Playfair Display', serif; font-size: 42px; color: #0A3D2E; margin-bottom: 8px; }
  .cover-period { font-family: 'Playfair Display', serif; font-size: 34px; color: #0A3D2E; margin-bottom: 18px; }
  .cover-footer { position: absolute; right: 20px; bottom: 8px; left: 20px; font-size: 10px; color: #3d4b42; text-align: center; font-family: 'DM Sans', Arial, sans-serif; }
`;

const escapeHtmlCover = (unsafe: string): string =>
  unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

/**
 * First page: pixel-identical layout to the Carbon Emissions Report cover (logo, year, title block, footer).
 */
const addTcfdEmissionStyleCoverPage = async (
  pdf: jsPDF,
  organizationName: string,
  periodLabel: string,
  year: string
): Promise<void> => {
  const company = organizationName.trim() || 'Organization';
  const safe = escapeHtmlCover;
  const inner = `
    <div class="report">
      <div class="cover">
        <div class="cover-border-top"></div><div class="cover-border-bottom"></div><div class="cover-border-left"></div><div class="cover-border-right"></div>
        <div class="cover-inner">
          <div class="cover-header">
            <div class="cover-logo-wrap">
              <img src="/new_logo.png" alt="Rethink Carbon logo" crossorigin="anonymous" />
            </div>
            <div class="cover-year">${safe(year)}</div>
          </div>
          <div class="cover-body">
            <div class="cover-title">TCFD Risk Analysis</div>
            <div class="cover-company">${safe(company)}</div>
            <div class="cover-period">${safe(periodLabel)}</div>
          </div>
          <div class="cover-footer">This report contains proprietary and confidential information of ${safe(company)} and is intended solely for internal use and authorized stakeholders.</div>
        </div>
      </div>
    </div>`;

  const html2canvas = (await import('html2canvas')).default;
  const wrapper = document.createElement('div');
  wrapper.style.width = '800px';
  wrapper.style.position = 'absolute';
  wrapper.style.left = '-99999px';
  wrapper.style.top = '0';
  wrapper.style.background = '#ffffff';
  wrapper.innerHTML = `<style>${TCFD_COVER_PAGE_CSS}</style>${inner}`;
  document.body.appendChild(wrapper);

  const coverEl = wrapper.querySelector('.cover') as HTMLElement;
  const canvas = await html2canvas(coverEl, {
    scale: 1.2,
    backgroundColor: '#d9e0e3',
    useCORS: true,
    allowTaint: true,
  });
  const imgData = canvas.toDataURL('image/jpeg', 0.62);
  document.body.removeChild(wrapper);

  pdf.addImage(imgData, 'JPEG', 0, 0, 210, 297);
};

/** Inner-page header — same structure as EPA `page-header` */
const addGreenContentHeader = (pdf: jsPDF, rightCaption: string): void => {
  const h = CONTENT_HEADER_H_MM;
  pdf.setFillColor(REPORT_GREEN.frame.r, REPORT_GREEN.frame.g, REPORT_GREEN.frame.b);
  pdf.rect(0, 0, 210, h, 'F');
  pdf.setTextColor(255, 255, 255);
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(10);
  pdf.text('Rethink Carbon', 15, h * 0.62);
  pdf.setTextColor(Math.round(255 * 0.7), Math.round(255 * 0.7), Math.round(255 * 0.7));
  pdf.setFontSize(8);
  pdf.text(rightCaption, 195, h * 0.62, { align: 'right' });
};

/** New content page with green header */
const addContentPageWithHeader = (pdf: jsPDF, rightCaption: string): number => {
  pdf.addPage();
  addGreenContentHeader(pdf, rightCaption);
  return CONTENT_START_Y;
};

/** Back cover — matches EPA `.back-cover` / `.powered-by` */
const addBrandedBackCover = (pdf: jsPDF): void => {
  pdf.addPage();
  pdf.setFillColor(REPORT_GREEN.backCover.r, REPORT_GREEN.backCover.g, REPORT_GREEN.backCover.b);
  pdf.rect(0, 0, 210, 297, 'F');
  const labelRgb = Math.round(255 * 0.6);
  pdf.setTextColor(labelRgb, labelRgb, labelRgb);
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(11);
  pdf.text('Powered by', 195, 252, { align: 'right' });
  pdf.setTextColor(255, 255, 255);
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(15);
  pdf.text('Rethink Carbon', 195, 262, { align: 'right' });
};

// Helper function to format currency
const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-PK', {
    style: 'currency',
    currency: 'PKR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

// Helper function to format number
const formatNumber = (num: number): string => {
  return new Intl.NumberFormat('en-US').format(num);
};

// Load logo image
const loadLogo = (): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    
    // Set timeout for logo loading
    const timeout = setTimeout(() => {
      reject(new Error('Logo loading timeout'));
    }, 5000);
    
    img.onload = () => {
      clearTimeout(timeout);
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          resolve(canvas.toDataURL('image/png'));
        } else {
          reject(new Error('Could not create canvas context'));
        }
      } catch (error) {
        reject(error);
      }
    };
    
    img.onerror = () => {
      clearTimeout(timeout);
      reject(new Error('Failed to load logo'));
    };
    
    img.src = '/new_logo.png';
  });
};

// Add header with logo
const addHeader = async (pdf: jsPDF, yPos: number): Promise<number> => {
  try {
    const logoData = await loadLogo();
    // Add logo (scaled to fit) - centered
    const logoWidth = 90;
    const logoHeight = 32;
    const pageWidth = 210; // A4 width in mm
    const logoX = (pageWidth - logoWidth) / 2; // Center the logo
    pdf.addImage(logoData, 'PNG', logoX, yPos, logoWidth, logoHeight);
    
    // Add horizontal line below logo
    pdf.setDrawColor(BRAND_COLORS.primaryDark);
    pdf.setLineWidth(0.5);
    pdf.line(15, yPos + logoHeight + 5, 195, yPos + logoHeight + 5);
    
    return yPos + logoHeight + 12;
  } catch (error) {
    console.error('Error loading logo:', error);
    // Fallback: just a line
    pdf.setDrawColor(BRAND_COLORS.primaryDark);
    pdf.setLineWidth(0.5);
    pdf.line(15, yPos + 5, 195, yPos + 5);
    return yPos + 12;
  }
};

// Add section title
const addSectionTitle = (pdf: jsPDF, title: string, yPos: number): number => {
  // Add spacing before section
  yPos += 5;
  pdf.setFontSize(14);
  pdf.setTextColor(BRAND_COLORS.primaryDark);
  pdf.setFont('helvetica', 'bold');
  pdf.text(title, 15, yPos);
  pdf.setDrawColor(BRAND_COLORS.primary);
  pdf.setLineWidth(0.3);
  pdf.line(15, yPos + 2, 195, yPos + 2);
  return yPos + 10;
};

// Add metric card
const addMetricCard = (
  pdf: jsPDF,
  label: string,
  value: string,
  x: number,
  y: number,
  width: number = 55
): void => {
  // Card background
  pdf.setFillColor(255, 255, 255);
  pdf.setDrawColor(BRAND_COLORS.border);
  pdf.setLineWidth(0.2);
  pdf.roundedRect(x, y, width, 20, 2, 2, 'FD');
  
  // Label
  pdf.setFontSize(8);
  pdf.setTextColor(BRAND_COLORS.textLight);
  pdf.setFont('helvetica', 'normal');
  pdf.text(label, x + 3, y + 6);
  
  // Value
  pdf.setFontSize(11);
  pdf.setTextColor(BRAND_COLORS.text);
  pdf.setFont('helvetica', 'bold');
  pdf.text(value, x + 3, y + 14);
};

type AddTableContinuePage = {
  /** Called after `pdf.addPage()` when a table spans pages (e.g. draw green header) */
  afterBreak?: (p: jsPDF) => void;
  /** Y position for continued table header row (default 20) */
  startY?: number;
};

// Add table
const addTable = (
  pdf: jsPDF,
  headers: string[],
  rows: string[][],
  yPos: number,
  columnWidths: number[],
  continuePage?: AddTableContinuePage
): number => {
  const rowHeight = 10;
  const headerHeight = 12;
  const cellPadding = 3;
  const startX = 15;
  
  // Table header
  pdf.setFillColor(BRAND_COLORS.primaryDark);
  pdf.setDrawColor(BRAND_COLORS.primaryDark);
  pdf.setLineWidth(0.3);
  pdf.rect(startX, yPos, 180, headerHeight, 'FD');
  
  pdf.setFontSize(9);
  pdf.setTextColor(255, 255, 255);
  pdf.setFont('helvetica', 'bold');
  
  let xPos = startX + cellPadding;
  headers.forEach((header, index) => {
    // Wrap text if needed
    const maxWidth = columnWidths[index] - (cellPadding * 2);
    const lines = pdf.splitTextToSize(header, maxWidth);
    pdf.text(lines[0], xPos, yPos + 7);
    xPos += columnWidths[index];
  });
  
  // Table rows
  pdf.setTextColor(BRAND_COLORS.text);
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(8);
  
  let currentY = yPos + headerHeight;
  rows.forEach((row, rowIndex) => {
    // Check if we need a new page
    const rowNeedsMultipleLines = row.some((cell, idx) => {
      const maxWidth = columnWidths[idx] - (cellPadding * 2);
      const lines = pdf.splitTextToSize(cell, maxWidth);
      return lines.length > 1;
    });
    const estimatedRowHeight = rowNeedsMultipleLines ? rowHeight * 1.5 : rowHeight;
    
    if (currentY + estimatedRowHeight > 280) {
      // New page
      pdf.addPage();
      if (continuePage?.afterBreak) {
        continuePage.afterBreak(pdf);
      }
      currentY = continuePage?.startY ?? 20;

      // Redraw header
      pdf.setFillColor(BRAND_COLORS.primaryDark);
      pdf.rect(startX, currentY, 180, headerHeight, 'FD');
      pdf.setTextColor(255, 255, 255);
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(9);
      xPos = startX + cellPadding;
      headers.forEach((header, index) => {
        const maxWidth = columnWidths[index] - (cellPadding * 2);
        const lines = pdf.splitTextToSize(header, maxWidth);
        pdf.text(lines[0], xPos, currentY + 7);
        xPos += columnWidths[index];
      });
      pdf.setTextColor(BRAND_COLORS.text);
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(8);
      currentY += headerHeight;
    }
    
    // Alternate row colors
    if (rowIndex % 2 === 0) {
      pdf.setFillColor(250, 250, 250);
      pdf.rect(startX, currentY, 180, rowHeight, 'FD');
    }
    
    // Draw cell borders
    pdf.setDrawColor(BRAND_COLORS.border);
    pdf.setLineWidth(0.1);
    xPos = startX;
    headers.forEach((_, index) => {
      if (index > 0) {
        pdf.line(xPos, currentY, xPos, currentY + rowHeight);
      }
      xPos += columnWidths[index];
    });
    
    // Add cell content
    xPos = startX + cellPadding;
    let maxLinesInRow = 1;
    row.forEach((cell, cellIndex) => {
      const maxWidth = columnWidths[cellIndex] - (cellPadding * 2);
      const lines = pdf.splitTextToSize(cell, maxWidth);
      maxLinesInRow = Math.max(maxLinesInRow, lines.length);
      
      // Draw text (first line only for now, or adjust row height)
      pdf.text(lines[0], xPos, currentY + 6);
      
      // If text wraps, draw additional lines
      if (lines.length > 1) {
        lines.slice(1).forEach((line, lineIndex) => {
          pdf.text(line, xPos, currentY + 6 + (lineIndex + 1) * 4);
        });
      }
      
      xPos += columnWidths[cellIndex];
    });
    
    // Adjust row height if text wrapped
    const actualRowHeight = maxLinesInRow > 1 ? rowHeight + (maxLinesInRow - 1) * 4 : rowHeight;
    
    // Row border
    pdf.setDrawColor(BRAND_COLORS.border);
    pdf.setLineWidth(0.1);
    pdf.line(startX, currentY + actualRowHeight, startX + 180, currentY + actualRowHeight);
    
    currentY += actualRowHeight;
  });
  
  return currentY + 10;
};

// Export Standard Climate Risk Report
export const exportClimateRiskReport = async (
  results: ScenarioResult,
  portfolioEntries: any[],
  selectedScenario?: string
): Promise<void> => {
  const pdf = new jsPDF('p', 'mm', 'a4');
  let yPos = 15;
  
  // Add header with logo
  yPos = await addHeader(pdf, yPos);
  
  // Report title
  pdf.setFontSize(18);
  pdf.setTextColor(BRAND_COLORS.primaryDark);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Climate Risk Analysis Report', 15, yPos);
  
  yPos += 10;
  
  // Report metadata
  pdf.setFontSize(9);
  pdf.setTextColor(BRAND_COLORS.textLight);
  pdf.setFont('helvetica', 'normal');
  pdf.text(`Scenario: ${results.scenarioType}`, 15, yPos);
  pdf.text(`Analysis Date: ${new Date().toLocaleDateString()}`, 15, yPos + 6);
  pdf.text(`Total Investments: ${portfolioEntries.length}`, 15, yPos + 12);
  
  yPos += 18;
  
  // Key Metrics Overview
  yPos = addSectionTitle(pdf, 'Key Metrics Overview', yPos);
  
  const metricsY = yPos;
  addMetricCard(pdf, 'Total Portfolio Value', formatCurrency(results.totalPortfolioValue), 15, metricsY, 55);
  addMetricCard(pdf, 'Expected Loss', formatCurrency(results.totalPortfolioLoss), 75, metricsY, 55);
  addMetricCard(pdf, 'Loss Percentage', `${results.portfolioLossPercentage.toFixed(2)}%`, 135, metricsY, 55);
  
  yPos += 30;
  
  // Risk Impact Summary
  yPos = addSectionTitle(pdf, 'Risk Impact Summary', yPos);
  
  pdf.setFontSize(9);
  pdf.setTextColor(BRAND_COLORS.text);
  pdf.setFont('helvetica', 'normal');
  
  // Baseline Risk
  pdf.text('Baseline Risk:', 15, yPos);
  pdf.setFont('helvetica', 'bold');
  pdf.text(`${results.baselineRisk.toFixed(2)}%`, 50, yPos);
  
  // Risk bar
  pdf.setFillColor(BRAND_COLORS.primaryLight);
  pdf.rect(60, yPos - 3, 50, 5, 'F');
  pdf.setFillColor(BRAND_COLORS.primaryDark);
  pdf.rect(60, yPos - 3, (results.baselineRisk * 10), 5, 'F');
  
  yPos += 10;
  
  // Scenario Risk
  pdf.setFont('helvetica', 'normal');
  pdf.text('Scenario Risk:', 15, yPos);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(BRAND_COLORS.danger);
  pdf.text(`${results.scenarioRisk.toFixed(2)}%`, 50, yPos);
  
  // Risk bar
  pdf.setFillColor(254, 226, 226);
  pdf.rect(60, yPos - 3, 50, 5, 'F');
  pdf.setFillColor(BRAND_COLORS.danger);
  pdf.rect(60, yPos - 3, Math.min(results.scenarioRisk * 10, 50), 5, 'F');
  
  yPos += 10;
  
  // Risk Increase
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(BRAND_COLORS.text);
  pdf.text('Risk Increase:', 15, yPos);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(BRAND_COLORS.warning);
  pdf.text(`+${results.riskIncrease.toFixed(2)}%`, 50, yPos);
  
  yPos += 15;
  
  // Top Risk Exposures
  yPos = addSectionTitle(pdf, 'Top Risk Exposures', yPos);
  
  const topExposuresHeaders = ['Rank', 'Company', 'Sector', 'Amount', 'Estimated Loss'];
  const topExposuresRows = results.topExposures.slice(0, 15).map((exposure, index) => [
    `${index + 1}`,
    exposure.company || 'N/A',
    exposure.sector || 'N/A',
    formatCurrency(exposure.amount || 0),
    formatCurrency(exposure.estimatedLoss || 0)
  ]);
  const topExposuresWidths = [15, 60, 40, 35, 30];
  
  yPos = addTable(pdf, topExposuresHeaders, topExposuresRows, yPos, topExposuresWidths);
  
  // Sector Breakdown
  if (yPos > 250) {
    pdf.addPage();
    yPos = 20;
  }
  
  yPos = addSectionTitle(pdf, 'Sector Risk Breakdown', yPos);
  
  const sectorHeaders = ['Sector', 'Amount', 'Percentage', 'Estimated Loss'];
  const sectorRows = results.sectorBreakdown.map(sector => [
    sector.sector || 'N/A',
    formatCurrency(sector.amount || 0),
    `${(sector.percentage || 0).toFixed(1)}%`,
    formatCurrency(sector.estimatedLoss || 0)
  ]);
  const sectorWidths = [85, 35, 25, 35];
  
  yPos = addTable(pdf, sectorHeaders, sectorRows, yPos, sectorWidths);
  
  // Asset Class Breakdown
  if (yPos > 250) {
    pdf.addPage();
    yPos = 20;
  }
  
  yPos = addSectionTitle(pdf, 'Asset Class Risk Breakdown', yPos);
  
  const assetClassHeaders = ['Asset Class', 'Amount', 'Percentage', 'Estimated Loss'];
  const assetClassRows = results.assetClassBreakdown.map(assetClass => [
    assetClass.assetClass || 'N/A',
    formatCurrency(assetClass.amount || 0),
    `${(assetClass.percentage || 0).toFixed(1)}%`,
    formatCurrency(assetClass.estimatedLoss || 0)
  ]);
  const assetClassWidths = [70, 40, 30, 40];
  
  yPos = addTable(pdf, assetClassHeaders, assetClassRows, yPos, assetClassWidths);
  
  // Footer
  const pageCount = (pdf as any).internal.pages.length;
  for (let i = 1; i <= pageCount; i++) {
    pdf.setPage(i);
    pdf.setFontSize(8);
    pdf.setTextColor(BRAND_COLORS.textLight);
    pdf.setFont('helvetica', 'normal');
    pdf.text(
      `Page ${i} of ${pageCount} | Generated by Rethink Carbon | ${new Date().toLocaleDateString()}`,
      15,
      285
    );
  }
  
  // Save PDF
  pdf.save(`Climate_Risk_Report_${results.scenarioType.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`);
};

// Export TCFD-compliant Report
export const exportTCFDReport = async (
  results: ScenarioResult,
  portfolioEntries: any[],
  selectedScenario?: string,
  organizationName?: string
): Promise<void> => {
  const pdf = new jsPDF('p', 'mm', 'a4');
  const innerHeaderRight = `${results.scenarioType} | TCFD Climate Risk Disclosure`;

  const now = new Date();
  const yearStr = String(now.getFullYear());
  const periodLabel = now.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
  const coverOrg =
    organizationName?.trim() ||
    'Organization';

  await addTcfdEmissionStyleCoverPage(pdf, coverOrg, periodLabel, yearStr);

  pdf.addPage();
  addGreenContentHeader(pdf, innerHeaderRight);
  let yPos = CONTENT_START_Y;

  // Executive Summary
  yPos = addSectionTitle(pdf, 'Executive Summary', yPos);
  
  pdf.setFontSize(9);
  pdf.setTextColor(BRAND_COLORS.text);
  pdf.setFont('helvetica', 'normal');
  
  const summaryText = [
    `This report presents a climate risk analysis conducted in accordance with the Task Force on Climate-related Financial Disclosures (TCFD) framework.`,
    `The analysis evaluates portfolio exposure under the ${results.scenarioType} scenario, assessing both transition and physical climate risks.`,
    `Key findings indicate a portfolio value of ${formatCurrency(results.totalPortfolioValue)} with an expected loss of ${formatCurrency(results.totalPortfolioLoss)} under the selected scenario.`,
    `The portfolio risk increases from ${results.baselineRisk.toFixed(2)}% to ${results.scenarioRisk.toFixed(2)}%, representing a ${results.riskIncrease.toFixed(2)}% increase in risk exposure.`
  ];
  
  summaryText.forEach((text, index) => {
    const lines = pdf.splitTextToSize(text, 180);
    lines.forEach((line: string) => {
      if (yPos > 270) {
        yPos = addContentPageWithHeader(pdf, innerHeaderRight);
      }
      pdf.text(line, 15, yPos);
      yPos += 6;
    });
    yPos += 3;
  });
  
  yPos += 8;
  
  // Scenario Description
  yPos = addSectionTitle(pdf, 'Scenario Description', yPos);
  
  pdf.setFontSize(9);
  pdf.setTextColor(BRAND_COLORS.text);
  pdf.setFont('helvetica', 'normal');
  
  const scenarioDesc = `The ${results.scenarioType} scenario represents a comprehensive climate stress test designed to assess portfolio resilience under specific climate-related conditions. This analysis follows TCFD recommendations for scenario analysis and stress testing.`;
  
  const descLines = pdf.splitTextToSize(scenarioDesc, 180);
  descLines.forEach((line: string) => {
    if (yPos > 270) {
      yPos = addContentPageWithHeader(pdf, innerHeaderRight);
    }
    pdf.text(line, 15, yPos);
    yPos += 6;
  });
  
  yPos += 10;
  
  // Governance (TCFD Pillar 1)
  yPos = addSectionTitle(pdf, '1. Governance', yPos);
  
  pdf.setFontSize(9);
  pdf.setTextColor(BRAND_COLORS.text);
  pdf.setFont('helvetica', 'normal');
  
  const governanceText = [
    'This climate risk analysis has been conducted as part of our commitment to transparent climate-related financial disclosures.',
    'The analysis methodology follows TCFD recommendations and industry best practices for climate scenario analysis.',
    `Analysis Date: ${new Date().toLocaleDateString()}`,
    `Scenario Type: ${results.scenarioType}`,
    `Portfolio Size: ${portfolioEntries.length} investments`
  ];
  
  governanceText.forEach((text) => {
    if (yPos > 270) {
      yPos = addContentPageWithHeader(pdf, innerHeaderRight);
    }
    pdf.text(`• ${text}`, 18, yPos);
    yPos += 6;
  });
  
  yPos += 8;
  
  // Strategy (TCFD Pillar 2)
  yPos = addSectionTitle(pdf, '2. Strategy', yPos);
  
  pdf.setFontSize(9);
  pdf.setTextColor(BRAND_COLORS.text);
  pdf.setFont('helvetica', 'normal');
  
  const strategyText = [
    'The scenario analysis reveals significant climate-related risks to the portfolio under the selected stress scenario.',
    `Total portfolio exposure: ${formatCurrency(results.totalPortfolioValue)}`,
    `Expected portfolio loss: ${formatCurrency(results.totalPortfolioLoss)} (${results.portfolioLossPercentage.toFixed(2)}% of portfolio value)`,
    `Risk increase: +${results.riskIncrease.toFixed(2)}% compared to baseline risk`,
    'These findings inform strategic decision-making and risk management practices.'
  ];
  
  strategyText.forEach((text) => {
    if (yPos > 270) {
      yPos = addContentPageWithHeader(pdf, innerHeaderRight);
    }
    const lines = pdf.splitTextToSize(`• ${text}`, 177);
    lines.forEach((line: string) => {
      if (yPos > 270) {
        yPos = addContentPageWithHeader(pdf, innerHeaderRight);
      }
      pdf.text(line, 18, yPos);
      yPos += 6;
    });
  });
  
  yPos += 8;
  
  // Risk Management (TCFD Pillar 3)
  yPos = addSectionTitle(pdf, '3. Risk Management', yPos);
  
  pdf.setFontSize(9);
  pdf.setTextColor(BRAND_COLORS.text);
  pdf.setFont('helvetica', 'normal');
  
  const riskMgmtText = [
    'The portfolio risk assessment identifies key areas of vulnerability:',
    '',
    `• Baseline Risk: ${results.baselineRisk.toFixed(2)}%`,
    `• Scenario Risk: ${results.scenarioRisk.toFixed(2)}%`,
    `• Risk Increase: +${results.riskIncrease.toFixed(2)}%`,
    '',
    'Top risk exposures and sector concentrations are detailed in the following sections.'
  ];
  
  riskMgmtText.forEach((text) => {
    if (yPos > 270) {
      yPos = addContentPageWithHeader(pdf, innerHeaderRight);
    }
    if (text) {
      pdf.text(text, 18, yPos);
    }
    yPos += 6;
  });
  
  yPos += 8;
  
  // Metrics and Targets (TCFD Pillar 4)
  yPos = addSectionTitle(pdf, '4. Metrics and Targets', yPos);
  
  // Key metrics table
  const metricsHeaders = ['Metric', 'Value'];
  const metricsRows = [
    ['Total Portfolio Value', formatCurrency(results.totalPortfolioValue)],
    ['Total Financed Emissions', `${formatNumber(results.totalFinancedEmissions)} tCO₂e`],
    ['Expected Portfolio Loss', formatCurrency(results.totalPortfolioLoss)],
    ['Portfolio Loss Percentage', `${results.portfolioLossPercentage.toFixed(2)}%`],
    ['Baseline Risk', `${results.baselineRisk.toFixed(2)}%`],
    ['Scenario Risk', `${results.scenarioRisk.toFixed(2)}%`],
    ['Risk Increase', `+${results.riskIncrease.toFixed(2)}%`],
    ['Number of Investments', `${portfolioEntries.length}`]
  ];
  const metricsWidths = [100, 80];
  
  const tcfdTableContinue = {
    afterBreak: (p: jsPDF) => addGreenContentHeader(p, innerHeaderRight),
    startY: CONTENT_START_Y,
  };
  yPos = addTable(pdf, metricsHeaders, metricsRows, yPos, metricsWidths, tcfdTableContinue);
  
  // Top Exposures
  if (yPos > 250) {
    yPos = addContentPageWithHeader(pdf, innerHeaderRight);
  }
  
  yPos = addSectionTitle(pdf, 'Top Risk Exposures', yPos);
  
  const topExposuresHeaders = ['Rank', 'Company', 'Sector', 'Amount', 'Estimated Loss'];
  const topExposuresRows = results.topExposures.slice(0, 15).map((exposure, index) => [
    `${index + 1}`,
    exposure.company || 'N/A',
    exposure.sector || 'N/A',
    formatCurrency(exposure.amount || 0),
    formatCurrency(exposure.estimatedLoss || 0)
  ]);
  const topExposuresWidths = [15, 60, 40, 35, 30];
  
  yPos = addTable(pdf, topExposuresHeaders, topExposuresRows, yPos, topExposuresWidths, tcfdTableContinue);
  
  // Sector Breakdown
  if (yPos > 250) {
    yPos = addContentPageWithHeader(pdf, innerHeaderRight);
  }
  
  yPos = addSectionTitle(pdf, 'Sector Risk Breakdown', yPos);
  
  const sectorHeaders = ['Sector', 'Amount', 'Percentage', 'Estimated Loss'];
  const sectorRows = results.sectorBreakdown.map(sector => [
    sector.sector || 'N/A',
    formatCurrency(sector.amount || 0),
    `${(sector.percentage || 0).toFixed(1)}%`,
    formatCurrency(sector.estimatedLoss || 0)
  ]);
  const sectorWidths = [85, 35, 25, 35];
  
  yPos = addTable(pdf, sectorHeaders, sectorRows, yPos, sectorWidths, tcfdTableContinue);
  
  // Asset Class Breakdown
  if (yPos > 250) {
    yPos = addContentPageWithHeader(pdf, innerHeaderRight);
  }
  
  yPos = addSectionTitle(pdf, 'Asset Class Risk Breakdown', yPos);
  
  const assetClassHeaders = ['Asset Class', 'Amount', 'Percentage', 'Estimated Loss'];
  const assetClassRows = results.assetClassBreakdown.map(assetClass => [
    assetClass.assetClass || 'N/A',
    formatCurrency(assetClass.amount || 0),
    `${(assetClass.percentage || 0).toFixed(1)}%`,
    formatCurrency(assetClass.estimatedLoss || 0)
  ]);
  const assetClassWidths = [70, 40, 30, 40];
  
  yPos = addTable(pdf, assetClassHeaders, assetClassRows, yPos, assetClassWidths, tcfdTableContinue);
  
  // TCFD Compliance Statement
  if (yPos > 250) {
    yPos = addContentPageWithHeader(pdf, innerHeaderRight);
  }
  
  yPos = addSectionTitle(pdf, 'TCFD Compliance Statement', yPos);
  
  pdf.setFontSize(9);
  pdf.setTextColor(BRAND_COLORS.text);
  pdf.setFont('helvetica', 'normal');
  
  const complianceText = [
    'This report has been prepared in accordance with the recommendations of the Task Force on Climate-related Financial Disclosures (TCFD).',
    'The analysis covers all four TCFD pillars:',
    '',
    '1. Governance: Climate-related risks and opportunities are integrated into governance processes.',
    '2. Strategy: The actual and potential impacts of climate-related risks and opportunities are assessed.',
    '3. Risk Management: Processes for identifying, assessing, and managing climate-related risks are in place.',
    '4. Metrics and Targets: Metrics and targets are used to assess and manage climate-related risks and opportunities.',
    '',
    'This scenario analysis provides a forward-looking assessment of climate-related financial impacts and supports informed decision-making.'
  ];
  
  complianceText.forEach((text) => {
    if (yPos > 270) {
      yPos = addContentPageWithHeader(pdf, innerHeaderRight);
    }
    const lines = pdf.splitTextToSize(text, 180);
    lines.forEach((line: string) => {
      if (yPos > 270) {
        yPos = addContentPageWithHeader(pdf, innerHeaderRight);
      }
      pdf.text(line, 15, yPos);
      yPos += 6;
    });
    yPos += 2;
  });
  
  addBrandedBackCover(pdf);

  const pageCount = (pdf as any).internal.pages.length;
  const contentBodyPages = Math.max(1, pageCount - 2);
  for (let i = 1; i <= pageCount; i++) {
    pdf.setPage(i);
    if (i === 1 || i === pageCount) {
      continue;
    }
    pdf.setFontSize(8);
    pdf.setTextColor(BRAND_COLORS.textLight);
    pdf.setFont('helvetica', 'normal');
    const bodyIndex = i - 1;
    pdf.text(
      `Page ${bodyIndex} of ${contentBodyPages} | TCFD Climate Risk Disclosure | Rethink Carbon | ${new Date().toLocaleDateString()}`,
      15,
      285
    );
  }

  pdf.save(`TCFD_Climate_Risk_Report_${results.scenarioType.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`);
};

