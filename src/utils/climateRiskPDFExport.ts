import jsPDF from 'jspdf';
import { ScenarioResult } from '@/pages/scenario-building/types';

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
    
    img.src = '/logoo.png';
  });
};

// Add header with logo
const addHeader = async (pdf: jsPDF, yPos: number): Promise<number> => {
  try {
    const logoData = await loadLogo();
    // Add logo (scaled to fit) - centered
    const logoWidth = 50;
    const logoHeight = 18;
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

// Add table
const addTable = (
  pdf: jsPDF,
  headers: string[],
  rows: string[][],
  yPos: number,
  columnWidths: number[]
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
      currentY = 20;
      
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
      `Page ${i} of ${pageCount} | Generated by ReThink Carbon | ${new Date().toLocaleDateString()}`,
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
  selectedScenario?: string
): Promise<void> => {
  const pdf = new jsPDF('p', 'mm', 'a4');
  let yPos = 15;
  
  // Add header with logo
  yPos = await addHeader(pdf, yPos);
  
  // TCFD Report title
  pdf.setFontSize(18);
  pdf.setTextColor(BRAND_COLORS.primaryDark);
  pdf.setFont('helvetica', 'bold');
  pdf.text('TCFD Climate Risk Disclosure Report', 15, yPos);
  
  yPos += 10;
  
  // TCFD Framework badge
  pdf.setFillColor(BRAND_COLORS.primaryDark);
  pdf.setDrawColor(BRAND_COLORS.primaryDark);
  pdf.roundedRect(15, yPos, 50, 8, 2, 2, 'FD');
  pdf.setFontSize(9);
  pdf.setTextColor(255, 255, 255);
  pdf.setFont('helvetica', 'bold');
  pdf.text('TCFD Compliant', 20, yPos + 5.5);
  
  yPos += 15;
  
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
        pdf.addPage();
        yPos = 20;
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
      pdf.addPage();
      yPos = 20;
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
      pdf.addPage();
      yPos = 20;
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
      pdf.addPage();
      yPos = 20;
    }
    const lines = pdf.splitTextToSize(`• ${text}`, 177);
    lines.forEach((line: string) => {
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
      pdf.addPage();
      yPos = 20;
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
  
  yPos = addTable(pdf, metricsHeaders, metricsRows, yPos, metricsWidths);
  
  // Top Exposures
  if (yPos > 250) {
    pdf.addPage();
    yPos = 20;
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
  
  // TCFD Compliance Statement
  if (yPos > 250) {
    pdf.addPage();
    yPos = 20;
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
      pdf.addPage();
      yPos = 20;
    }
    const lines = pdf.splitTextToSize(text, 180);
    lines.forEach((line: string) => {
      pdf.text(line, 15, yPos);
      yPos += 6;
    });
    yPos += 2;
  });
  
  // Footer
  const pageCount = (pdf as any).internal.pages.length;
  for (let i = 1; i <= pageCount; i++) {
    pdf.setPage(i);
    pdf.setFontSize(8);
    pdf.setTextColor(BRAND_COLORS.textLight);
    pdf.setFont('helvetica', 'normal');
    pdf.text(
      `Page ${i} of ${pageCount} | TCFD Climate Risk Disclosure Report | ReThink Carbon | ${new Date().toLocaleDateString()}`,
      15,
      285
    );
  }
  
  // Save PDF
  pdf.save(`TCFD_Climate_Risk_Report_${results.scenarioType.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`);
};

