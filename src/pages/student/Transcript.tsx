import DashboardLayout from "@/components/DashboardLayout";
import { Printer, Download, GraduationCap, Loader2 } from "lucide-react";
import { useState, useEffect } from "react";
import { apiFetch, API_BASE_URL } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";

interface GradeRow {
  id: number;
  code: string;
  course_name: string;
  credits: number;
  marks: number;
  grade: string;
  semester: number;
  academic_year: string;
}

interface SemesterBlock {
  label: string;
  semester: number;
  academic_year: string;
  courses: GradeRow[];
  cwa: number;
}

function letterGrade(marks: number): string {
  if (marks >= 80) return "A";
  if (marks >= 75) return "A-";
  if (marks >= 70) return "B+";
  if (marks >= 65) return "B";
  if (marks >= 60) return "B-";
  if (marks >= 55) return "C+";
  if (marks >= 50) return "C";
  return "F";
}

function calcCWA(courses: GradeRow[]): number {
  const totalCredits = courses.reduce((s, c) => s + c.credits, 0);
  if (totalCredits === 0) return 0;
  const weighted = courses.reduce((s, c) => s + c.marks * c.credits, 0);
  return weighted / totalCredits;
}

const Transcript = () => {
  const { user } = useAuth();
  const [semesters, setSemesters] = useState<SemesterBlock[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const grades = await apiFetch<GradeRow[]>(`/results/student/${user.id}`);
        // Group by academic_year + semester
        const map = new Map<string, GradeRow[]>();
        for (const g of grades) {
          const key = `${g.academic_year}__${g.semester}`;
          if (!map.has(key)) map.set(key, []);
          map.get(key)!.push(g);
        }
        const blocks: SemesterBlock[] = [];
        map.forEach((courses, key) => {
          const [academic_year, semStr] = key.split("__");
          const semester = parseInt(semStr);
          blocks.push({
            label: `Semester ${semester}, ${academic_year}`,
            semester,
            academic_year,
            courses,
            cwa: calcCWA(courses),
          });
        });
        // Sort by year then semester
        blocks.sort((a, b) =>
          a.academic_year !== b.academic_year
            ? a.academic_year.localeCompare(b.academic_year)
            : a.semester - b.semester
        );
        setSemesters(blocks);
      } catch (err) {
        console.error("Failed to load transcript:", err);
      } finally {
        setLoading(false);
      }
    })();
  }, [user]);

  const allCourses = semesters.flatMap((s) => s.courses);
  const overallCWA = allCourses.length > 0 ? calcCWA(allCourses).toFixed(2) : "—";

  const handlePrint = () => window.print();

  const handleDownloadPDF = async () => {
    if (!user || semesters.length === 0) return;
    setDownloading(true);
    try {
      const { default: jsPDF } = await import("jspdf");
      const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const pageW = doc.internal.pageSize.getWidth();
      const pageH = doc.internal.pageSize.getHeight();
      const MARGIN = 15;
      const availW = pageW - MARGIN * 2;

      // ── Header ──
      doc.setFontSize(13);
      doc.setFont("helvetica", "bold");
      doc.text("UNIVERSITY OF MINES AND TECHNOLOGY", pageW / 2, 18, { align: "center" });
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.text("School of Postgraduate Studies — Tarkwa", pageW / 2, 24, { align: "center" });
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text("OFFICIAL ACADEMIC TRANSCRIPT", pageW / 2, 32, { align: "center" });

      // Divider
      doc.setDrawColor(30, 58, 95);
      doc.setLineWidth(0.5);
      doc.line(MARGIN, 35, pageW - MARGIN, 35);

      // Student info
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(50, 50, 50);
      const infoY = 41;
      doc.text(`Name: ${user.name}`, MARGIN, infoY);
      doc.text(`Index No: ${user.indexNumber || "—"}`, MARGIN + availW / 2, infoY);
      doc.text(`Programme: ${user.program || "—"}`, MARGIN, infoY + 6);
      doc.text(`Department: ${user.department || "—"}`, MARGIN + availW / 2, infoY + 6);
      doc.text(`Overall CWA: ${overallCWA}`, MARGIN, infoY + 12);
      doc.text(`Date Issued: ${new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" })}`, MARGIN + availW / 2, infoY + 12);

      doc.setDrawColor(200, 200, 200);
      doc.setLineWidth(0.3);
      doc.line(MARGIN, infoY + 16, pageW - MARGIN, infoY + 16);

      let y = infoY + 22;
      const rowH = 7;
      const headerH = 7;
      const cols = [22, availW - 22 - 18 - 18 - 22, 18, 18, 22]; // code, name, credits, marks, grade
      const colHeaders = ["Code", "Course Title", "Credits", "Marks", "Grade"];

      for (const sem of semesters) {
        // Check page space
        if (y + headerH + sem.courses.length * rowH + 14 > pageH - 20) {
          doc.addPage();
          y = 20;
        }

        // Semester heading
        doc.setFontSize(9);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(30, 58, 95);
        doc.text(sem.label, MARGIN, y);
        doc.setTextColor(80, 80, 80);
        doc.setFont("helvetica", "normal");
        doc.text(`Semester CWA: ${sem.cwa.toFixed(2)}`, pageW - MARGIN, y, { align: "right" });
        y += 4;

        // Table header
        doc.setFillColor(30, 58, 95);
        doc.rect(MARGIN, y, availW, headerH, "F");
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(8);
        doc.setFont("helvetica", "bold");
        let x = MARGIN;
        for (let i = 0; i < colHeaders.length; i++) {
          doc.text(colHeaders[i], x + 1.5, y + 4.8);
          x += cols[i];
        }
        y += headerH;

        // Rows
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        sem.courses.forEach((c, idx) => {
          if (idx % 2 === 1) {
            doc.setFillColor(245, 247, 250);
            doc.rect(MARGIN, y, availW, rowH, "F");
          }
          doc.setDrawColor(210, 210, 210);
          doc.setLineWidth(0.1);
          doc.line(MARGIN, y + rowH, MARGIN + availW, y + rowH);

          doc.setTextColor(40, 40, 40);
          const grade = c.grade || letterGrade(c.marks);
          const values = [c.code, c.course_name, String(c.credits), String(c.marks), grade];
          let cx = MARGIN;
          for (let i = 0; i < values.length; i++) {
            const maxChars = Math.floor(cols[i] / 2.2);
            const text = values[i].length > maxChars ? values[i].slice(0, maxChars - 1) + "…" : values[i];
            doc.text(text, cx + 1.5, y + 4.8);
            cx += cols[i];
          }
          y += rowH;
        });
        y += 8;
      }

      // Footer
      doc.setFontSize(7);
      doc.setFont("helvetica", "italic");
      doc.setTextColor(150, 150, 150);
      doc.text(
        `Generated: ${new Date().toLocaleString()} — UMaT Postgraduate Support System`,
        pageW / 2,
        pageH - 8,
        { align: "center" }
      );

      doc.save(`transcript_${user.indexNumber || user.name.replace(/\s+/g, "_")}.pdf`);
    } catch (err) {
      console.error("PDF generation failed:", err);
    } finally {
      setDownloading(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 size={36} className="animate-spin text-secondary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold font-display text-foreground">Academic Transcript</h1>
          <p className="text-muted-foreground mt-1">
            {user?.name} · {user?.indexNumber || "—"} · {user?.program || "—"}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-border text-sm font-medium text-foreground hover:bg-muted transition-colors"
          >
            <Printer size={16} /> Print
          </button>
          <button
            onClick={handleDownloadPDF}
            disabled={downloading || semesters.length === 0}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg gradient-gold text-secondary-foreground text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {downloading ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
            {downloading ? "Generating..." : "Download PDF"}
          </button>
        </div>
      </div>

      {/* CWA Summary */}
      <div className="bg-card rounded-xl border border-border px-6 py-4 mb-6 inline-flex items-center gap-3">
        <GraduationCap size={20} className="text-secondary" />
        <span className="text-sm text-muted-foreground">Cumulative Weighted Average (CWA):</span>
        <span className="text-2xl font-bold font-display text-foreground">{overallCWA}</span>
      </div>

      {semesters.length === 0 ? (
        <div className="bg-card rounded-xl border border-border p-12 text-center">
          <GraduationCap size={48} className="text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-muted-foreground">No results available yet.</p>
          <p className="text-xs text-muted-foreground/60 mt-1">Your grades will appear here once published by the Exams Office.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {semesters.map((sem) => (
            <div key={sem.label} className="bg-card rounded-xl border border-border overflow-hidden">
              <div className="px-6 py-4 border-b border-border flex items-center justify-between">
                <h2 className="font-display font-bold text-foreground">{sem.label}</h2>
                <span className="text-sm text-muted-foreground">
                  CWA: <span className="font-bold text-foreground">{sem.cwa.toFixed(2)}</span>
                </span>
              </div>
              <table className="w-full hidden sm:table">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Code</th>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Course</th>
                    <th className="text-center px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Credits</th>
                    <th className="text-center px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Marks (%)</th>
                    <th className="text-center px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Grade</th>
                  </tr>
                </thead>
                <tbody>
                  {sem.courses.map((c) => (
                    <tr key={c.id} className="border-b border-border last:border-0 hover:bg-muted/50 transition-colors">
                      <td className="px-6 py-3 text-sm font-mono font-medium text-foreground">{c.code}</td>
                      <td className="px-6 py-3 text-sm text-foreground">{c.course_name}</td>
                      <td className="px-6 py-3 text-sm text-center text-muted-foreground">{c.credits}</td>
                      <td className="px-6 py-3 text-sm text-center text-muted-foreground">{c.marks}</td>
                      <td className="px-6 py-3 text-sm text-center font-semibold text-foreground">{c.grade || letterGrade(c.marks)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {/* Mobile */}
              <div className="sm:hidden divide-y divide-border">
                {sem.courses.map((c) => (
                  <div key={c.id} className="px-4 py-3 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-foreground">{c.course_name}</p>
                      <p className="text-xs text-muted-foreground font-mono">{c.code} · {c.credits} credits</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-foreground">{c.grade || letterGrade(c.marks)}</p>
                      <p className="text-xs text-muted-foreground">{c.marks}%</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </DashboardLayout>
  );
};

export default Transcript;
