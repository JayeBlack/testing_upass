type ExportFormat = "csv" | "pdf";

interface ExportOptions {
  title: string;
  subtitle?: string;
  headers: string[];
  rows: string[][];
  fileName: string;
  format: ExportFormat;
}

function triggerDownload(content: string | Blob, fileName: string, mimeType: string) {
  const blob = content instanceof Blob ? content : new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.style.display = "none";
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  requestAnimationFrame(() => {
    anchor.click();
    setTimeout(() => {
      URL.revokeObjectURL(url);
      document.body.removeChild(anchor);
    }, 500);
  });
}

function csvEscape(val: string): string {
  const s = String(val);
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

/**
 * Shorten common program name patterns for PDF readability.
 * Preserves degree type (MSc/MPhil/PhD) at the end.
 */
function shortenProgramName(name: string): string {
  // Detect degree type
  const hasPhD = /\b(PhD|Doctor of Philosophy)\b/i.test(name);
  const hasMPhil = /\b(MPhil|Master of Philosophy)\b/i.test(name);
  const hasMSc = /\b(MSc|Master of Science)\b/i.test(name);
  const degreeLabel = hasPhD ? "(PhD)" : hasMPhil ? "(MPhil)" : hasMSc ? "(MSc)" : "";

  // Remove degree prefixes and ALL parenthetical content
  let s = name
    .replace(/^(Doctor of Philosophy|PhD|Master of Philosophy|MPhil|Master of Science|MSc)\s*/i, "")
    .replace(/^Postgraduate\s+/i, "")
    .replace(/\s*\([^)]*\)\s*/g, "")
    .trim();

  // Shorten common words
  s = s
    .replace(/\bEngineering\b/gi, "Eng.")
    .replace(/\bManagement\b/gi, "Mgt.")
    .replace(/\bTechnology\b/gi, "Tech.")
    .replace(/\bInformation\b/gi, "Info.")
    .replace(/\bEnvironmental\b/gi, "Envi.")
    .replace(/\bCommunication\b/gi, "Comm.")
    .replace(/\bResources\b/gi, "Res.")
    .replace(/\bDevelopment\b/gi, "Dev.")
    .replace(/\bAdministration\b/gi, "Admin.")
    .replace(/\bComputing\b/gi, "Comp.")
    .replace(/\bMechanical\b/gi, "Mech.")
    .replace(/\bElectrical\b/gi, "Elect.")
    .replace(/\bElectronic\b/gi, "Elec.")
    .replace(/\bChemical\b/gi, "Chem.")
    .replace(/\bPetroleum\b/gi, "Petrol.")
    .replace(/\bGeological\b/gi, "Geo.")
    .replace(/\bMathematical\b/gi, "Maths")
    .replace(/\bMathematics\b/gi, "Maths")
    .replace(/\bStatistics\b/gi, "Stats")
    .trim();

  // Drop filler words
  s = s.replace(/\b(in|and|the|of|for)\b/gi, "").replace(/\s+/g, " ").trim();

  // Append degree label
  if (degreeLabel) s = `${s} ${degreeLabel}`;

  return s.trim() || name;
}

/**
 * Truncate text to fit within a given column width.
 * If a degree label like "(MSc)" is present at the end, it is always preserved
 * even when truncation is needed: "Comp. Engin..(MSc)"
 */
function truncateToFit(text: string, colWidthMm: number, fontSize: number): string {
  const charWidth = fontSize * 0.35;
  const maxChars = Math.floor(colWidthMm / charWidth);
  if (maxChars <= 0) return "";

  // Extract trailing degree label if present
  const degreeMatch = text.match(/\s*(\([^)]+\))\s*$/);
  const degreeSuffix = degreeMatch ? degreeMatch[1] : "";
  const baseText = degreeMatch ? text.slice(0, degreeMatch.index).trim() : text;

  // Reserve space for ".." + degree suffix
  const suffixLen = degreeSuffix.length + 2; // ".." + "(MSc)"
  const baseMax = maxChars - suffixLen;

  if (baseText.length + suffixLen <= maxChars) {
    // Everything fits
    return text;
  }

  if (baseMax <= 0) {
    // Not enough room for base text at all, just show degree
    return degreeSuffix.slice(0, maxChars - 2) + "..";
  }

  // Truncate base text and append ".." + degree suffix
  return baseText.slice(0, baseMax - 2) + ".." + degreeSuffix;
}

export function exportData({ title, subtitle, headers, rows, fileName, format }: ExportOptions) {
  const safeName = fileName.replace(/[^a-zA-Z0-9_-]/g, "_");

  if (format === "csv") {
    const lines: string[] = [];
    lines.push(headers.join(","));
    for (const row of rows) {
      lines.push(row.map((cell) => csvEscape(cell)).join(","));
    }
    const bom = "\uFEFF";
    const csvContent = bom + lines.join("\r\n");
    triggerDownload(csvContent, `${safeName}.csv`, "text/csv;charset=utf-8;");
    return;
  }

  import("jspdf").then(async ({ default: jsPDF }) => {
    const doc = new jsPDF({ orientation: "landscape", unit: "mm" });
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();

    // ── Report header ──
    doc.setFontSize(13);
    doc.setFont("helvetica", "bold");
    doc.text("UNIVERSITY OF MINES AND TECHNOLOGY", pageW / 2, 16, { align: "center" });
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text("School of Postgraduate Studies — Tarkwa", pageW / 2, 22, { align: "center" });
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text(title, pageW / 2, 30, { align: "center" });
    if (subtitle) {
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      doc.text(subtitle, pageW / 2, 36, { align: "center" });
    }

    const MARGIN = 10;
    const availW = pageW - MARGIN * 2;
    const colCount = headers.length;
    const colW = availW / colCount; // equal-width columns
    const rowH = 6.5; // fixed row height
    const headerH = 6.5;

    // Determine which column is "program" for shortening
    const programColIdx = headers.findIndex((h) => /program/i.test(h));

    let tableTop = subtitle ? 42 : 38;

    // ── Draw table ──
    function drawTable(startY: number, endY: number): number {
      let currentY = startY;

      // Header
      doc.setFillColor(30, 58, 95);
      doc.rect(MARGIN, currentY, availW, headerH, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(8);
      doc.setFont("helvetica", "bold");
      for (let i = 0; i < colCount; i++) {
        const x = MARGIN + i * colW;
        doc.text(String(headers[i]), x + 1.5, currentY + 4.2, { align: "left" });
      }
      currentY += headerH;

      // Rows
      doc.setTextColor(30, 30, 30);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);

      let rowIndex = 0;
      while (rowIndex < rows.length && currentY + rowH <= endY) {
        const row = rows[rowIndex];
        const yPos = currentY;

        // Alternating background
        if (rowIndex % 2 === 1) {
          doc.setFillColor(245, 245, 245);
          doc.rect(MARGIN, yPos, availW, rowH, "F");
        }

        // Full cell borders (horizontal + vertical grid)
        doc.setDrawColor(180, 180, 180);
        doc.setLineWidth(0.15);
        // Horizontal lines
        doc.line(MARGIN, yPos, MARGIN + availW, yPos);
        doc.line(MARGIN, yPos + rowH, MARGIN + availW, yPos + rowH);
        // Vertical lines
        for (let i = 0; i <= colCount; i++) {
          const lx = MARGIN + i * colW;
          doc.line(lx, yPos, lx, yPos + rowH);
        }

        // Cell text
        for (let i = 0; i < colCount; i++) {
          const raw = String(row[i] || "");
          const processed = (i === programColIdx) ? shortenProgramName(raw) : raw;
          const display = truncateToFit(processed, colW, 8);
          doc.text(display, MARGIN + i * colW + 1.5, yPos + 4.2, { align: "left" });
        }

        currentY += rowH;
        rowIndex++;
      }

      return rowIndex;
    }

    // ── Paginate ──
    const footerH = 10;
    let rowOffset = 0;
    let pageNum = 1;
    const allRows = rows.slice(); // non-destructive copy

    while (rowOffset < allRows.length) {
      if (pageNum > 1) {
        doc.addPage();
        doc.setFontSize(13);
        doc.setFont("helvetica", "bold");
        doc.text("UNIVERSITY OF MINES AND TECHNOLOGY", pageW / 2, 16, { align: "center" });
        doc.setFontSize(9);
        doc.setFont("helvetica", "normal");
        doc.text("School of Postgraduate Studies — Tarkwa", pageW / 2, 22, { align: "center" });
        doc.setFontSize(11);
        doc.setFont("helvetica", "bold");
        doc.text(`${title} (Page ${pageNum})`, pageW / 2, 30, { align: "center" });
        tableTop = 38;
      }

      // Slice only the rows for this page into the shared `rows` ref used by drawTable
      const pageRows = allRows.slice(rowOffset);
      // Temporarily replace rows content for drawTable
      rows.length = 0;
      pageRows.forEach((r) => rows.push(r));

      const rowsOnThisPage = drawTable(tableTop, pageH - footerH);
      rowOffset += rowsOnThisPage;

      // Footer
      const footerY = pageH - 6;
      doc.setFontSize(7);
      doc.setFont("helvetica", "italic");
      doc.setTextColor(130, 130, 130);
      doc.text(`Generated: ${new Date().toLocaleString()} — Page ${pageNum}`, MARGIN, footerY);

      pageNum++;
    }

    doc.save(`${safeName}.pdf`);
  }).catch((err) => {
    console.error("PDF generation error:", err);
    throw err;
  });
}