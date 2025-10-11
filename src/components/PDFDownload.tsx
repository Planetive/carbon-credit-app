import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Download, Eye } from 'lucide-react';

interface PDFDownloadProps {
  containerId: string;
  fileName?: string;
  companyName?: string;
  assessmentDate?: string;
  userName?: string;
  overallScore?: number;
  overallRecommendations?: string;
  environmentalScore?: number;
  socialScore?: number;
  governanceScore?: number;
  environmentalStrengths?: string;
  environmentalImprovements?: string;
  socialStrengths?: string;
  socialImprovements?: string;
  governanceStrengths?: string;
  governanceImprovements?: string;
}

export const PDFDownload: React.FC<PDFDownloadProps> = ({
  containerId,
  fileName = 'esg-assessment-results',
  companyName = 'Your Company',
  assessmentDate = new Date().toLocaleDateString(),
  userName = 'User',
  overallScore = 0,
  overallRecommendations = '',
  environmentalScore = 0,
  socialScore = 0,
  governanceScore = 0,
  environmentalStrengths = '',
  environmentalImprovements = '',
  socialStrengths = '',
  socialImprovements = '',
  governanceStrengths = '',
  governanceImprovements = ''
}) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [isPreviewing, setIsPreviewing] = useState(false);

  const escapeHtml = (unsafe: string) =>
    unsafe
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');

  const asListItems = (text: string) => {
    const items = text.split('\n').map(line => line.trim()).filter(Boolean);
    if (items.length === 0) return '';
    return `<ul class="list"><li>${items.map(escapeHtml).join('</li><li>')}</li></ul>`;
  };

  const getReportCSS = () => `
    :root { --brand: #6AA261; --text: #333; --muted: #555; --border: #e9ecef; --bg: #f5f5f5; }
    body { margin: 0; padding: 0; background: var(--bg); font-family: Arial, sans-serif; color: var(--text); }
    .report { max-width: 800px; margin: 0 auto; background: #fff; padding: 28px; }
    .header { text-align: center; padding-bottom: 16px; border-bottom: 3px solid var(--brand); margin-bottom: 22px; }
    .title { color: var(--brand); font-size: 26px; margin: 0; font-weight: 800; letter-spacing: 0.3px; }
    .details { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; background: #f8f9fa; padding: 14px; border-radius: 10px; margin: 18px 0 24px; }
    .details .item { font-size: 13px; }
    .details .label { color: #666; font-weight: 600; margin-right: 6px; }
    .overall { border: 1px solid var(--border); border-radius: 12px; padding: 18px; margin-bottom: 18px; box-shadow: 0 2px 10px rgba(0,0,0,0.04); }
    .overall .section-title { color: var(--brand); font-size: 16px; font-weight: 700; margin: 0 0 8px; }
    .overall .score { font-size: 30px; font-weight: 800; margin: 2px 0 10px; }
    .overall .reco-title { color: var(--brand); font-size: 14px; font-weight: 700; margin: 12px 0 6px; }
    .overall .reco { font-size: 13px; color: var(--muted); line-height: 1.5; white-space: pre-line; }
    .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; }
    .card { border: 1px solid var(--border); border-radius: 12px; padding: 16px; box-shadow: 0 2px 10px rgba(0,0,0,0.04); }
    .card .name { display: flex; align-items: center; gap: 8px; color: var(--brand); font-weight: 800; font-size: 15px; margin-bottom: 8px; }
    .dot { width: 10px; height: 10px; border-radius: 999px; display: inline-block; }
    .dot.e { background: #10B981; }
    .dot.s { background: #3B82F6; }
    .dot.g { background: #8B5CF6; }
    .card .score { font-size: 22px; font-weight: 800; margin: 4px 0 12px; }
    .sub { margin-top: 8px; }
    .sub .sub-title { font-size: 13px; color: var(--brand); font-weight: 700; margin-bottom: 6px; }
    .list { margin: 0; padding-left: 18px; }
    .list li { font-size: 12.5px; color: var(--muted); margin: 4px 0; }
    @media (max-width: 760px) { .details { grid-template-columns: 1fr; } .grid { grid-template-columns: 1fr; } }
  `;

  const getReportContent = () => `
    <div class="report">
      <div class="header">
        <h1 class="title">ESG Health Check Report</h1>
        <i><p>This is the start of your journey towards sustainability</p></i>
      </div>
      <div class="details">
        <div class="item"><span class="label">Name:</span>${escapeHtml(userName || '')}</div>
        <div class="item"><span class="label">Organization:</span>${escapeHtml(companyName || '')}</div>
        <div class="item"><span class="label">Date:</span>${escapeHtml(assessmentDate || '')}</div>
      </div>

      <div class="overall">
        <div class="section-title">Overall Score</div>
        <div class="score">${overallScore}%</div>
        ${overallRecommendations ? `
          <div class="reco-title">Overall Recommendations</div>
          <div class="reco">${escapeHtml(overallRecommendations)}</div>
        ` : ''}
      </div>

      <div class="grid">
        <div class="card">
          <div class="name"><span class="dot e"></span>Environmental</div>
          <div class="score">${environmentalScore}%</div>
          ${environmentalStrengths ? `
            <div class="sub">
              <div class="sub-title">Strengths</div>
              ${asListItems(environmentalStrengths)}
            </div>
          ` : ''}
          ${environmentalImprovements ? `
            <div class="sub">
              <div class="sub-title">Areas for Improvement</div>
              ${asListItems(environmentalImprovements)}
            </div>
          ` : ''}
        </div>

        <div class="card">
          <div class="name"><span class="dot s"></span>Social</div>
          <div class="score">${socialScore}%</div>
          ${socialStrengths ? `
            <div class="sub">
              <div class="sub-title">Strengths</div>
              ${asListItems(socialStrengths)}
            </div>
          ` : ''}
          ${socialImprovements ? `
            <div class="sub">
              <div class="sub-title">Areas for Improvement</div>
              ${asListItems(socialImprovements)}
            </div>
          ` : ''}
        </div>

        <div class="card">
          <div class="name"><span class="dot g"></span>Governance</div>
          <div class="score">${governanceScore}%</div>
          ${governanceStrengths ? `
            <div class="sub">
              <div class="sub-title">Strengths</div>
              ${asListItems(governanceStrengths)}
            </div>
          ` : ''}
          ${governanceImprovements ? `
            <div class="sub">
              <div class="sub-title">Areas for Improvement</div>
              ${asListItems(governanceImprovements)}
            </div>
          ` : ''}
        </div>
      </div>
    </div>
  `;

  const generatePDF = async () => {
    setIsGenerating(true);
    try {
      const html2canvas = (await import('html2canvas')).default;
      const { default: jsPDF } = await import('jspdf');

      // Build an offscreen container with our template
      const wrapper = document.createElement('div');
      wrapper.style.width = '800px';
      wrapper.style.position = 'absolute';
      wrapper.style.left = '-99999px';
      wrapper.style.top = '0';
      wrapper.style.background = '#ffffff';
      wrapper.innerHTML = `<style>${getReportCSS()}</style>${getReportContent()}`;
      document.body.appendChild(wrapper);

      const target = wrapper.querySelector('.report') as HTMLElement;
      const canvas = await html2canvas(target, { scale: 2, backgroundColor: '#ffffff', useCORS: true, allowTaint: true });

      // Remove from DOM after render
      document.body.removeChild(wrapper);

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');

      const pageWidth = 210; // A4 width in mm
      const pageHeight = 297; // A4 height in mm
      const margin = 10;
      const contentWidth = pageWidth - margin * 2;
      const imgWidth = contentWidth;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      let heightLeft = imgHeight;
      let position = margin;

      pdf.addImage(imgData, 'PNG', margin, position, imgWidth, imgHeight);
      heightLeft -= (pageHeight - margin * 2);

      while (heightLeft > 0) {
        position = heightLeft - imgHeight + margin;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', margin, position, imgWidth, imgHeight);
        heightLeft -= (pageHeight - margin * 2);
      }

      pdf.save(`${fileName}.pdf`);
    } catch (error) {
      console.error('PDF generation failed:', error);
      alert('Failed to generate PDF. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const previewPDF = async () => {
    setIsPreviewing(true);
    try {
      const previewWindow = window.open('', '_blank');
      if (previewWindow) {
        previewWindow.document.write(`
          <html>
            <head>
              <meta charset="utf-8" />
              <meta name="viewport" content="width=device-width, initial-scale=1" />
              <title>ESG Health Check Report - Preview</title>
              <style>${getReportCSS()}</style>
            </head>
            <body>
              ${getReportContent()}
              <div style="max-width:800px;margin:16px auto;padding:0 28px;">
                <button onclick="window.print()" style="background:#6AA261;color:#fff;border:none;border-radius:8px;padding:12px 18px;font-size:14px;cursor:pointer;">Print / Save as PDF</button>
              </div>
            </body>
          </html>
        `);
        previewWindow.document.close();
      }
    } catch (error) {
      console.error('Preview generation failed:', error);
      alert('Failed to generate preview. Please try again.');
    } finally {
      setIsPreviewing(false);
    }
  };

  return (
    <div className="flex gap-3 mb-6">
      <Button
        onClick={previewPDF}
        disabled={isPreviewing}
        variant="outline"
        className="flex items-center gap-2"
      >
        <Eye className="w-4 h-4" />
        {isPreviewing ? 'Generating Preview...' : 'Preview PDF'}
      </Button>
      
      <Button
        onClick={generatePDF}
        disabled={isGenerating}
        className="flex items-center gap-2 bg-green-600 hover:bg-green-700"
      >
        <Download className="w-4 h-4" />
        {isGenerating ? 'Generating PDF...' : 'Download PDF'}
      </Button>
    </div>
  );
};