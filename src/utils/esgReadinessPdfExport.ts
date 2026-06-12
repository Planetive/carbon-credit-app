import jsPDF from "jspdf";
import type { ReadinessComputation } from "@/features/esg-readiness/scoring";

const BRAND_COLORS = {
  primary: "#14B8A6",
  primaryDark: "#0D9488",
  text: "#1F2937",
  textLight: "#6B7280",
  border: "#E5E7EB",
  danger: "#EF4444",
};

const PAGE_BOTTOM = 280;

const hexToRgb = (hex: string) => {
  const value = hex.replace("#", "");
  return {
    r: parseInt(value.slice(0, 2), 16),
    g: parseInt(value.slice(2, 4), 16),
    b: parseInt(value.slice(4, 6), 16),
  };
};

const ensureSpace = (pdf: jsPDF, yPos: number, needed: number): number => {
  if (yPos + needed <= PAGE_BOTTOM) return yPos;
  pdf.addPage();
  return 20;
};

const addSectionTitle = (pdf: jsPDF, title: string, yPos: number): number => {
  yPos = ensureSpace(pdf, yPos, 18);
  const primaryDark = hexToRgb(BRAND_COLORS.primaryDark);
  const primary = hexToRgb(BRAND_COLORS.primary);
  pdf.setFontSize(13);
  pdf.setTextColor(primaryDark.r, primaryDark.g, primaryDark.b);
  pdf.setFont("helvetica", "bold");
  pdf.text(title, 15, yPos);
  pdf.setDrawColor(primary.r, primary.g, primary.b);
  pdf.setLineWidth(0.3);
  pdf.line(15, yPos + 2, 195, yPos + 2);
  return yPos + 10;
};

const addWrappedText = (
  pdf: jsPDF,
  text: string,
  x: number,
  yPos: number,
  maxWidth: number,
  lineHeight = 5
): number => {
  const textRgb = hexToRgb(BRAND_COLORS.text);
  pdf.setFontSize(9);
  pdf.setTextColor(textRgb.r, textRgb.g, textRgb.b);
  pdf.setFont("helvetica", "normal");
  const lines = pdf.splitTextToSize(text, maxWidth);
  for (const line of lines) {
    yPos = ensureSpace(pdf, yPos, lineHeight);
    pdf.text(line, x, yPos);
    yPos += lineHeight;
  }
  return yPos;
};

const addTable = (
  pdf: jsPDF,
  headers: string[],
  rows: string[][],
  yPos: number,
  columnWidths: number[]
): number => {
  const rowHeight = 8;
  const headerHeight = 10;
  const cellPadding = 2;
  const startX = 15;
  const primaryDark = hexToRgb(BRAND_COLORS.primaryDark);
  const border = hexToRgb(BRAND_COLORS.border);
  const textRgb = hexToRgb(BRAND_COLORS.text);

  const drawHeader = (atY: number) => {
    pdf.setFillColor(primaryDark.r, primaryDark.g, primaryDark.b);
    pdf.rect(startX, atY, 180, headerHeight, "F");
    pdf.setFontSize(8);
    pdf.setTextColor(255, 255, 255);
    pdf.setFont("helvetica", "bold");
    let xPos = startX + cellPadding;
    headers.forEach((header, index) => {
      const maxWidth = columnWidths[index] - cellPadding * 2;
      const lines = pdf.splitTextToSize(header, maxWidth);
      pdf.text(lines[0], xPos, atY + 6);
      xPos += columnWidths[index];
    });
  };

  yPos = ensureSpace(pdf, yPos, headerHeight + rowHeight);
  drawHeader(yPos);
  let currentY = yPos + headerHeight;

  pdf.setTextColor(textRgb.r, textRgb.g, textRgb.b);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(7);

  rows.forEach((row, rowIndex) => {
    const cellLines = row.map((cell, cellIndex) => {
      const maxWidth = columnWidths[cellIndex] - cellPadding * 2;
      return pdf.splitTextToSize(cell, maxWidth);
    });
    const maxLines = Math.max(1, ...cellLines.map((lines) => lines.length));
    const actualRowHeight = rowHeight + (maxLines - 1) * 4;

    if (currentY + actualRowHeight > PAGE_BOTTOM) {
      pdf.addPage();
      currentY = 20;
      drawHeader(currentY);
      currentY += headerHeight;
    }

    if (rowIndex % 2 === 0) {
      pdf.setFillColor(250, 250, 250);
      pdf.rect(startX, currentY, 180, actualRowHeight, "F");
    }

    pdf.setDrawColor(border.r, border.g, border.b);
    pdf.setLineWidth(0.1);
    pdf.line(startX, currentY + actualRowHeight, startX + 180, currentY + actualRowHeight);

    let xPos = startX + cellPadding;
    row.forEach((cell, cellIndex) => {
      const maxWidth = columnWidths[cellIndex] - cellPadding * 2;
      const lines = pdf.splitTextToSize(cell, maxWidth);
      lines.forEach((line, lineIndex) => {
        pdf.text(line, xPos, currentY + 5 + lineIndex * 4);
      });
      xPos += columnWidths[cellIndex];
    });

    currentY += actualRowHeight;
  });

  return currentY + 8;
};

export interface EsgReadinessPdfOptions {
  resultData: ReadinessComputation;
  submittedAt?: string | null;
  organizationName?: string;
  userName?: string;
}

export async function exportEsgReadinessPdf({
  resultData,
  submittedAt,
  organizationName = "Organization",
  userName = "User",
}: EsgReadinessPdfOptions): Promise<void> {
  const pdf = new jsPDF("p", "mm", "a4");
  const primaryDark = hexToRgb(BRAND_COLORS.primaryDark);
  const textLight = hexToRgb(BRAND_COLORS.textLight);
  const textRgb = hexToRgb(BRAND_COLORS.text);
  const dateLabel = submittedAt
    ? new Date(submittedAt).toLocaleDateString()
    : new Date().toLocaleDateString();

  let yPos = 20;

  pdf.setFontSize(20);
  pdf.setTextColor(primaryDark.r, primaryDark.g, primaryDark.b);
  pdf.setFont("helvetica", "bold");
  pdf.text("ESG Assessment Results", 15, yPos);
  yPos += 10;

  pdf.setFontSize(10);
  pdf.setTextColor(textLight.r, textLight.g, textLight.b);
  pdf.setFont("helvetica", "normal");
  pdf.text(`Organization: ${organizationName}`, 15, yPos);
  yPos += 5;
  pdf.text(`Prepared for: ${userName}`, 15, yPos);
  yPos += 5;
  pdf.text(`Assessment date: ${dateLabel}`, 15, yPos);
  yPos += 5;
  pdf.text("Powered by Rethink Carbon", 15, yPos);
  yPos += 12;

  yPos = addSectionTitle(pdf, "Overall Readiness Score", yPos);
  pdf.setFontSize(28);
  pdf.setTextColor(textRgb.r, textRgb.g, textRgb.b);
  pdf.setFont("helvetica", "bold");
  pdf.text(`${Math.round(resultData.overallReadinessPercent)}%`, 15, yPos);
  yPos += 8;
  pdf.setFontSize(11);
  pdf.setFont("helvetica", "normal");
  pdf.text(`Maturity band: ${resultData.maturityBand}`, 15, yPos);
  yPos += 5;
  pdf.text(`Completion: ${resultData.completionPercent}%`, 15, yPos);
  yPos += 10;

  yPos = addSectionTitle(pdf, "Pillar Performance", yPos);
  for (const row of resultData.pillarSummary) {
    yPos = ensureSpace(pdf, yPos, 12);
    pdf.setFontSize(9);
    pdf.setTextColor(textRgb.r, textRgb.g, textRgb.b);
    pdf.setFont("helvetica", "bold");
    pdf.text(`${row.pillar}: ${row.pillarPercent}%`, 15, yPos);
    pdf.setFont("helvetica", "normal");
    pdf.text(`(${row.interpretation})`, 120, yPos);
    yPos += 6;
  }
  yPos += 4;

  yPos = addSectionTitle(pdf, "Strengths & Gaps", yPos);
  yPos = addWrappedText(pdf, `Top strong pillar(s): ${resultData.topStrongPillars.join(", ")}`, 15, yPos, 180);
  yPos = addWrappedText(
    pdf,
    `${resultData.weakestPillars.length > 1 ? "Joint weakest pillars" : "Weakest pillar"}: ${resultData.weakestPillars.join(", ")}`,
    15,
    yPos,
    180
  );
  yPos += 4;

  yPos = addSectionTitle(pdf, "Pillar Summary", yPos);
  yPos = addTable(
    pdf,
    ["Pillar", "Q", "Max", "Score", "%", "Wt", "Contrib", "Band"],
    resultData.pillarSummary.map((row) => [
      row.pillar,
      String(row.questions),
      String(row.possibleMax),
      String(row.actualScore),
      `${row.pillarPercent}%`,
      `${Math.round(row.weight * 100)}%`,
      `${row.weightedContribution}%`,
      row.interpretation,
    ]),
    yPos,
    [42, 10, 14, 16, 14, 12, 18, 24]
  );

  yPos = addSectionTitle(pdf, "Red Flags", yPos);
  if (resultData.redFlags.length === 0) {
    yPos = addWrappedText(pdf, "No red flags triggered.", 15, yPos, 180);
  } else {
    for (const flag of resultData.redFlags) {
      yPos = addWrappedText(
        pdf,
        `${flag.questionId}: ${flag.questionText} (Score: ${flag.score})`,
        15,
        yPos,
        180
      );
      yPos += 2;
    }
  }
  yPos += 4;

  yPos = addSectionTitle(pdf, "Findings & Recommendations", yPos);
  yPos = addTable(
    pdf,
    ["Finding", "Why it matters", "Action", "Severity"],
    resultData.findings.map((finding) => [
      finding.finding,
      finding.whyItMatters,
      finding.recommendedImmediateAction,
      finding.severity,
    ]),
    yPos,
    [42, 48, 48, 22]
  );

  const pageCount = (pdf as { internal: { pages: unknown[] } }).internal.pages.length - 1;
  for (let i = 1; i <= pageCount; i++) {
    pdf.setPage(i);
    pdf.setFontSize(8);
    pdf.setTextColor(textLight.r, textLight.g, textLight.b);
    pdf.setFont("helvetica", "normal");
    pdf.text(`Page ${i} of ${pageCount}`, 195, 290, { align: "right" });
  }

  const fileDate = new Date().toISOString().split("T")[0];
  pdf.save(`ESG_Assessment_Results_${fileDate}.pdf`);
}
