import jsPDF from "jspdf";
import { ResearchReport } from "@/hooks/useResearch";

const MARGIN = 20;
const PAGE_WIDTH = 210;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;

function checkPage(doc: jsPDF, y: number, needed = 12): number {
  if (y + needed > 280) {
    doc.addPage();
    return MARGIN;
  }
  return y;
}

function addSectionTitle(doc: jsPDF, title: string, y: number): number {
  y = checkPage(doc, y, 16);
  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(0, 180, 216);
  doc.text(title.toUpperCase(), MARGIN, y);
  y += 2;
  doc.setDrawColor(0, 180, 216);
  doc.setLineWidth(0.5);
  doc.line(MARGIN, y, MARGIN + CONTENT_WIDTH, y);
  return y + 8;
}

function addWrappedText(doc: jsPDF, text: string, y: number, fontSize = 10, bold = false): number {
  doc.setFontSize(fontSize);
  doc.setFont("helvetica", bold ? "bold" : "normal");
  doc.setTextColor(60, 60, 60);
  const lines = doc.splitTextToSize(text, CONTENT_WIDTH);
  for (const line of lines) {
    y = checkPage(doc, y);
    doc.text(line, MARGIN, y);
    y += fontSize * 0.45 + 1.5;
  }
  return y;
}

export function generateReportPdf(report: ResearchReport): void {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

  // --- Header ---
  doc.setFillColor(10, 15, 30);
  doc.rect(0, 0, PAGE_WIDTH, 50, "F");

  doc.setFontSize(22);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(255, 255, 255);
  doc.text("ICE PANDA", MARGIN, 20);

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(150, 160, 180);
  doc.text("INTELLIGENCE REPORT", MARGIN, 27);

  doc.setFontSize(16);
  doc.setTextColor(255, 255, 255);
  doc.text(report.target.fullName, MARGIN, 40);

  doc.setFontSize(9);
  doc.setTextColor(180, 190, 200);
  const subtitle = [report.target.title, report.target.company, report.target.location].filter(Boolean).join(" — ");
  doc.text(subtitle, MARGIN, 46);

  // Risk badge top-right
  const riskColors: Record<string, [number, number, number]> = {
    critical: [239, 68, 68],
    high: [249, 115, 22],
    moderate: [234, 179, 8],
    low: [34, 197, 94],
    clear: [16, 185, 129],
  };
  const rc = riskColors[report.riskLevel] || [100, 100, 100];
  doc.setFillColor(rc[0], rc[1], rc[2]);
  doc.roundedRect(PAGE_WIDTH - MARGIN - 40, 14, 40, 10, 2, 2, "F");
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(255, 255, 255);
  doc.text(report.riskLevel.toUpperCase(), PAGE_WIDTH - MARGIN - 20, 20.5, { align: "center" });

  let y = 60;

  // --- Metrics ---
  y = addSectionTitle(doc, "Key Metrics", y);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(60, 60, 60);
  doc.text(`Identity Confidence (IMCS): ${report.confidenceScore}%`, MARGIN, y);
  y += 6;
  doc.text(`Risk Score: ${report.riskScore}/100`, MARGIN, y);
  y += 6;
  const totalFindings = report.findings.reduce((s, f) => s + f.items.length, 0);
  doc.text(`Total Findings: ${totalFindings}`, MARGIN, y);
  y += 10;

  // --- Executive Summary ---
  y = addSectionTitle(doc, "Executive Summary", y);
  y = addWrappedText(doc, report.executiveSummary, y);
  y += 6;

  // --- Biography ---
  if (report.biography) {
    const bioKeys: { key: string; label: string }[] = [
      { key: "earlyLife", label: "Early Life" },
      { key: "education", label: "Education" },
      { key: "career", label: "Career" },
      { key: "notableAchievements", label: "Notable Achievements" },
      { key: "personalLife", label: "Personal Life" },
      { key: "publicPresence", label: "Public Presence" },
    ];
    const hasBio = bioKeys.some(b => {
      const v = report.biography?.[b.key as keyof typeof report.biography];
      return v && v !== "No public information available.";
    });
    if (hasBio) {
      y = addSectionTitle(doc, "Life Briefing", y);
      for (const b of bioKeys) {
        const val = report.biography?.[b.key as keyof typeof report.biography];
        if (!val || val === "No public information available.") continue;
        y = checkPage(doc, y, 14);
        doc.setFontSize(10);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(40, 40, 40);
        doc.text(b.label, MARGIN, y);
        y += 5;
        y = addWrappedText(doc, val, y);
        y += 4;
      }
    }
  }

  // --- Psych Profile ---
  if (report.psychProfile) {
    const psychKeys: { key: string; label: string }[] = [
      { key: "personalityTraits", label: "Personality Traits" },
      { key: "motivations", label: "Motivations" },
      { key: "communicationStyle", label: "Communication Style" },
      { key: "leadershipStyle", label: "Leadership Style" },
      { key: "riskTolerance", label: "Risk Tolerance" },
      { key: "potentialVulnerabilities", label: "Potential Vulnerabilities" },
    ];
    const hasPsych = psychKeys.some(p => {
      const v = report.psychProfile?.[p.key as keyof typeof report.psychProfile];
      return v && v !== "Insufficient public data for assessment.";
    });
    if (hasPsych) {
      y = addSectionTitle(doc, "Psychological Profile", y);
      for (const p of psychKeys) {
        const val = report.psychProfile?.[p.key as keyof typeof report.psychProfile];
        if (!val || val === "Insufficient public data for assessment.") continue;
        y = checkPage(doc, y, 14);
        doc.setFontSize(10);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(40, 40, 40);
        doc.text(p.label, MARGIN, y);
        y += 5;
        y = addWrappedText(doc, val, y);
        y += 4;
      }
    }
  }

  // --- Findings ---
  if (totalFindings > 0) {
    y = addSectionTitle(doc, "Findings", y);
    for (const cat of report.findings) {
      if (cat.items.length === 0) continue;
      y = checkPage(doc, y, 14);
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(30, 30, 30);
      doc.text(`${cat.category} (${cat.items.length})`, MARGIN, y);
      y += 6;

      for (const item of cat.items) {
        y = checkPage(doc, y, 20);
        // Severity badge
        const sevColors: Record<string, [number, number, number]> = {
          critical: [239, 68, 68], high: [249, 115, 22], moderate: [234, 179, 8], low: [34, 197, 94], info: [100, 116, 139],
        };
        const sc = sevColors[item.severity] || [100, 100, 100];
        doc.setFillColor(sc[0], sc[1], sc[2]);
        doc.roundedRect(MARGIN, y - 3.5, 18, 5, 1, 1, "F");
        doc.setFontSize(6);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(255, 255, 255);
        doc.text(item.severity.toUpperCase(), MARGIN + 9, y - 0.5, { align: "center" });

        doc.setFontSize(10);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(30, 30, 30);
        doc.text(item.title, MARGIN + 21, y);
        y += 5;

        y = addWrappedText(doc, item.summary, y, 9);

        doc.setFontSize(7);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(120, 120, 120);
        const meta = [`Source: ${item.source}`, `Reliability: ${item.reliability}`, `IMCS: ${item.confidence}%`, item.jurisdiction ? `Jurisdiction: ${item.jurisdiction}` : ""].filter(Boolean).join("  |  ");
        doc.text(meta, MARGIN, y);
        y += 8;
      }
      y += 4;
    }
  }

  // --- Sources ---
  if (report.sourcesConsulted?.length) {
    y = addSectionTitle(doc, "Sources Consulted", y);
    for (const src of report.sourcesConsulted) {
      y = checkPage(doc, y);
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(60, 60, 60);
      doc.text(`• ${src.name} — ${src.status} (${src.reliability})`, MARGIN, y);
      y += 5;
    }
  }

  // --- Footer on every page ---
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(150, 150, 150);
    doc.text(`ICE PANDA Intelligence Report — ${report.target.fullName} — Page ${i}/${pageCount}`, PAGE_WIDTH / 2, 292, { align: "center" });
  }

  const filename = `ICE_PANDA_${report.target.fullName.replace(/\s+/g, "_")}_Report.pdf`;
  doc.save(filename);
}
