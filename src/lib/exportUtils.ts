import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

type ExportFormat = "csv" | "pdf";

interface ExportOptions {
  title: string;
  subtitle?: string;
  headers: string[];
  rows: string[][];
  fileName: string;
  format: ExportFormat;
}

function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(url);
}

export function exportData({ title, subtitle, headers, rows, fileName, format }: ExportOptions) {
  if (format === "csv") {
    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(",")),
    ].join("\n");
    downloadBlob(new Blob([csvContent], { type: "text/csv" }), `${fileName}.csv`);
  } else {
    const doc = new jsPDF({ orientation: rows[0]?.length > 5 ? "landscape" : "portrait" });

    // Header
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text("UNIVERSITY OF MINES AND TECHNOLOGY", doc.internal.pageSize.getWidth() / 2, 20, { align: "center" });
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text("School of Postgraduate Studies", doc.internal.pageSize.getWidth() / 2, 27, { align: "center" });

    doc.setFontSize(13);
    doc.setFont("helvetica", "bold");
    doc.text(title, doc.internal.pageSize.getWidth() / 2, 38, { align: "center" });

    if (subtitle) {
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.text(subtitle, doc.internal.pageSize.getWidth() / 2, 44, { align: "center" });
    }

    autoTable(doc, {
      head: [headers],
      body: rows,
      startY: subtitle ? 50 : 44,
      theme: "grid",
      headStyles: { fillColor: [30, 58, 95], fontSize: 8, fontStyle: "bold" },
      bodyStyles: { fontSize: 8 },
      styles: { cellPadding: 3 },
    });

    // Footer
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(7);
      doc.setFont("helvetica", "italic");
      const y = doc.internal.pageSize.getHeight() - 10;
      doc.text(`Generated on ${new Date().toLocaleString()} — Computer Generated Document`, 14, y);
      doc.text(`Page ${i} of ${pageCount}`, doc.internal.pageSize.getWidth() - 14, y, { align: "right" });
    }

    doc.save(`${fileName}.pdf`);
  }
}
