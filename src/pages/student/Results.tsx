import DashboardLayout from "@/components/DashboardLayout";
import { BarChart3, TrendingUp, TrendingDown, Minus, FileText, Loader, Download } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { apiFetch } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import umatLogo from "@/assets/umat-logo.png";

interface GradeData {
  id: string;
  code: string;
  course_name: string;
  credits: number;
  grade: string;
  marks: number;
  semester: number;
  academic_year: string;
}

interface SemesterResult {
  label: string;
  short: string;
  semester: number;
  academic_year: string;
  courses: { code: string; name: string; credits: number; grade: string; marks: number }[];
  cwa: number;
}

const calcCwa = (courses: { marks: number; credits: number }[]) => {
  if (courses.length === 0) return 0;
  const totalCredits = courses.reduce((s, c) => s + c.credits, 0);
  if (totalCredits === 0) return 0;
  return courses.reduce((s, c) => s + c.marks * c.credits, 0) / totalCredits;
};

const gradeColor = (grade: string) => {
  if (["A+", "A", "A-"].includes(grade)) return "text-green-600";
  if (["B+", "B", "B-"].includes(grade)) return "text-blue-600";
  if (["C+", "C", "C-"].includes(grade)) return "text-yellow-600";
  return "text-destructive";
};

const Results = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [semesterData, setSemesterData] = useState<SemesterResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState<string | null>(null);

  useEffect(() => {
    const fetchResults = async () => {
      try {
        if (!user?.id) { setError("User not authenticated"); setLoading(false); return; }
        const grades = await apiFetch(`/results/student/${user.id}`);
        if (!grades || grades.length === 0) { setSemesterData([]); setLoading(false); return; }

        const grouped: Record<string, GradeData[]> = {};
        grades.forEach((g: GradeData) => {
          const key = `${g.academic_year}-S${g.semester}`;
          if (!grouped[key]) grouped[key] = [];
          grouped[key].push(g);
        });

        const semesters: SemesterResult[] = Object.entries(grouped)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([key, courses]) => {
            const [academicYear, semStr] = key.split("-");
            const sem = parseInt(semStr.replace("S", ""));
            return {
              label: `Semester ${sem}, ${academicYear}`,
              short: `S${sem} ${academicYear.split("/").map(y => y.slice(-2)).join("/")}`,
              semester: sem,
              academic_year: academicYear,
              courses: courses.map((c) => ({ code: c.code, name: c.course_name, credits: c.credits, grade: c.grade, marks: c.marks })),
              cwa: 0,
            };
          });

        semesters.forEach((s) => { s.cwa = calcCwa(s.courses); });
        setSemesterData(semesters);
        setError(null);
      } catch (err) {
        setError((err as Error).message);
        setSemesterData([]);
      } finally {
        setLoading(false);
      }
    };
    fetchResults();
  }, [user?.id]);

  const allCourses = semesterData.flatMap((s) => s.courses);
  const overallCwa = calcCwa(allCourses);

  const handleDownload = async (sem: SemesterResult) => {
    setDownloading(sem.label);
    try {
      const { default: jsPDF } = await import("jspdf");
      const { default: autoTable } = await import("jspdf-autotable");
      const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const pageW = doc.internal.pageSize.getWidth();
      const pageH = doc.internal.pageSize.getHeight();

      doc.setDrawColor(34, 87, 50);
      doc.setLineWidth(1.2);
      doc.rect(8, 8, pageW - 16, pageH - 16);
      doc.setLineWidth(0.4);
      doc.rect(11, 11, pageW - 22, pageH - 22);

      try {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.src = umatLogo;
        await new Promise((res, rej) => { img.onload = res; img.onerror = rej; });
        doc.addImage(img, "PNG", pageW / 2 - 14, 15, 28, 28);
      } catch { /* skip logo */ }

      const photoY = 15;
      try {
        if (user?.avatarUrl) {
          const photoImg = new Image();
          photoImg.crossOrigin = "anonymous";
          photoImg.src = user.avatarUrl;
          await new Promise((res, rej) => { photoImg.onload = res; photoImg.onerror = rej; });
          doc.addImage(photoImg, "JPEG", pageW - 45, photoY, 28, 32);
          doc.setDrawColor(34, 87, 50);
          doc.setLineWidth(0.5);
          doc.rect(pageW - 45, photoY, 28, 32);
        } else {
          doc.setFillColor(240, 240, 240);
          doc.rect(pageW - 45, photoY, 28, 32, "F");
          doc.setDrawColor(180, 180, 180);
          doc.setLineWidth(0.4);
          doc.rect(pageW - 45, photoY, 28, 32);
          doc.setFontSize(7);
          doc.setTextColor(150, 150, 150);
          doc.text("PHOTO", pageW - 31, photoY + 17, { align: "center" });
          doc.setTextColor(0, 0, 0);
        }
      } catch { /* skip photo */ }

      doc.setFontSize(13);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(34, 87, 50);
      doc.text("UNIVERSITY OF MINES AND TECHNOLOGY", pageW / 2, 50, { align: "center" });
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(80, 80, 80);
      doc.text("Tarkwa, Ghana  |  www.umat.edu.gh", pageW / 2, 56, { align: "center" });
      doc.text("School of Postgraduate Studies", pageW / 2, 62, { align: "center" });

      doc.setFillColor(34, 87, 50);
      doc.roundedRect(18, 67, pageW - 36, 11, 2, 2, "F");
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(255, 255, 255);
      doc.text("SEMESTER ACADEMIC RESULTS STATEMENT", pageW / 2, 74.5, { align: "center" });
      doc.setTextColor(0, 0, 0);

      doc.setFillColor(248, 250, 248);
      doc.roundedRect(18, 82, pageW - 36, 36, 2, 2, "F");
      doc.setDrawColor(34, 87, 50);
      doc.setLineWidth(0.3);
      doc.roundedRect(18, 82, pageW - 36, 36, 2, 2, "S");

      const leftX = 24;
      const valX = 75;
      let iy = 91;
      const infoRows = [
        ["Student Name", user?.name || "N/A"],
        ["Index Number", user?.indexNumber || "N/A"],
        ["Programme", user?.program || "N/A"],
        ["Department", user?.department || "N/A"],
      ];
      infoRows.forEach(([label, value]) => {
        doc.setFontSize(9);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(80, 80, 80);
        doc.text(`${label}:`, leftX, iy);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(0, 0, 0);
        doc.text(value, valX, iy);
        iy += 7;
      });

      const sy = 124;
      doc.setFillColor(34, 87, 50);
      doc.roundedRect(18, sy, pageW - 36, 8, 1, 1, "F");
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(255, 255, 255);
      doc.text(`${sem.label.toUpperCase()}`, leftX + 2, sy + 5.5);
      doc.text(`CWA: ${sem.cwa.toFixed(2)}%`, pageW - 22, sy + 5.5, { align: "right" });
      doc.setTextColor(0, 0, 0);

      autoTable(doc, {
        startY: sy + 12,
        head: [["#", "Code", "Course Name", "Credits", "Grade", "Marks"]],
        body: sem.courses.map((c, i) => [String(i + 1), c.code, c.name, String(c.credits), c.grade, `${c.marks}%`]),
        theme: "grid",
        headStyles: { fillColor: [34, 87, 50], textColor: 255, fontStyle: "bold", fontSize: 9, halign: "center" },
        bodyStyles: { fontSize: 8.5, textColor: [30, 30, 30] },
        columnStyles: {
          0: { halign: "center", cellWidth: 10 },
          1: { halign: "center", cellWidth: 22 },
          2: { halign: "left", cellWidth: "auto" },
          3: { halign: "center", cellWidth: 18 },
          4: { halign: "center", cellWidth: 16 },
          5: { halign: "center", cellWidth: 18 },
        },
        alternateRowStyles: { fillColor: [245, 250, 245] },
        margin: { left: 18, right: 18 },
        tableLineColor: [200, 220, 200],
        tableLineWidth: 0.2,
      });

      const finalY = (doc as any).lastAutoTable.finalY + 6;
      const totalCredits = sem.courses.reduce((s, c) => s + c.credits, 0);
      doc.setFillColor(245, 250, 245);
      doc.roundedRect(18, finalY, pageW - 36, 22, 2, 2, "F");
      doc.setDrawColor(34, 87, 50);
      doc.setLineWidth(0.3);
      doc.roundedRect(18, finalY, pageW - 36, 22, 2, 2, "S");
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(34, 87, 50);
      doc.text("SUMMARY", leftX, finalY + 7);

      const summaryItems = [
        { label: "Total Credit Hours", value: String(totalCredits) },
        { label: "Semester CWA", value: `${sem.cwa.toFixed(2)}%` },
        { label: "Courses Taken", value: String(sem.courses.length) },
      ];
      const colW = (pageW - 36 - 12) / 3;
      summaryItems.forEach((item, i) => {
        const sx = 24 + i * colW;
        doc.setFont("helvetica", "normal");
        doc.setTextColor(80, 80, 80);
        doc.setFontSize(8);
        doc.text(item.label, sx, finalY + 14);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(10);
        doc.text(item.value, sx, finalY + 20);
      });

      if (semesterData.length > 1) {
        const ocwaY = finalY + 28;
        doc.setFillColor(34, 87, 50);
        doc.roundedRect(18, ocwaY, pageW - 36, 10, 2, 2, "F");
        doc.setFontSize(10);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(255, 255, 255);
        doc.text(`Overall Cumulative Weighted Average (CWA): ${overallCwa.toFixed(2)}%`, pageW / 2, ocwaY + 6.5, { align: "center" });
        doc.setTextColor(0, 0, 0);
      }

      const footY = pageH - 28;
      doc.setDrawColor(34, 87, 50);
      doc.setLineWidth(0.5);
      doc.line(18, footY, pageW - 18, footY);
      doc.setFontSize(7.5);
      doc.setFont("helvetica", "italic");
      doc.setTextColor(100, 100, 100);
      doc.text("This is a computer-generated academic results statement.", pageW / 2, footY + 5, { align: "center" });
      doc.text("For official transcripts, contact the Registrar's Office — School of Postgraduate Studies, UMaT.", pageW / 2, footY + 10, { align: "center" });
      doc.text(`Generated: ${new Date().toLocaleDateString("en-GB")} at ${new Date().toLocaleTimeString("en-GB")}`, pageW / 2, footY + 15, { align: "center" });
      doc.setFontSize(7);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(160, 160, 160);
      doc.text(`Ref: REF-${Date.now().toString(36).toUpperCase()}`, pageW - 22, footY + 20, { align: "right" });

      doc.save(`UMaT_Results_${sem.academic_year.replace("/", "-")}_Sem${sem.semester}_${user?.indexNumber || "student"}.pdf`);
      toast({ title: "Results downloaded", description: `${sem.label} results saved as PDF` });
    } catch {
      toast({ title: "Download failed", description: "Could not generate results PDF", variant: "destructive" });
    } finally {
      setDownloading(null);
    }
  };

  if (loading) return (
    <DashboardLayout>
      <div className="flex items-center justify-center py-16">
        <div className="text-center">
          <Loader size={40} className="animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading your results...</p>
        </div>
      </div>
    </DashboardLayout>
  );

  if (error) return (
    <DashboardLayout>
      <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-4 text-destructive">
        <p><strong>Error loading results:</strong> {error}</p>
      </div>
    </DashboardLayout>
  );

  if (semesterData.length === 0) return (
    <DashboardLayout>
      <div className="mb-8">
        <h1 className="text-3xl font-bold font-display text-foreground">Academic Results</h1>
        <p className="text-muted-foreground mt-1">Performance overview across all semesters</p>
      </div>
      <div className="bg-card rounded-xl border border-border p-12 text-center">
        <BarChart3 size={40} className="mx-auto text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold text-foreground mb-2">No results available</h3>
        <p className="text-sm text-muted-foreground">Your results will appear here once published by the exams officer</p>
      </div>
    </DashboardLayout>
  );

  return (
    <DashboardLayout>
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold font-display text-foreground">Academic Results</h1>
          <p className="text-muted-foreground mt-1">Performance overview across all semesters</p>
        </div>
        <button
          onClick={() => navigate("/documents")}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg gradient-gold text-secondary-foreground font-medium text-sm hover:opacity-90 transition-opacity"
        >
          <FileText size={16} />
          Request Official Transcript
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-card rounded-xl border border-border px-5 py-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg gradient-gold flex items-center justify-center">
            <BarChart3 size={20} className="text-secondary-foreground" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Overall CWA</p>
            <p className="text-2xl font-bold font-display text-foreground">{overallCwa.toFixed(2)}%</p>
          </div>
        </div>
        {semesterData.map((sem, i) => {
          const prev = i > 0 ? semesterData[i - 1].cwa : null;
          const diff = prev !== null ? sem.cwa - prev : null;
          const TrendIcon = diff === null ? Minus : diff >= 0 ? TrendingUp : TrendingDown;
          const trendColor = diff === null ? "text-muted-foreground" : diff >= 0 ? "text-green-600" : "text-destructive";
          return (
            <div key={sem.label} className="bg-card rounded-xl border border-border px-5 py-4">
              <div className="flex items-center justify-between mb-1">
                <p className="text-xs text-muted-foreground">{sem.short}</p>
                <div className={`flex items-center gap-1 ${trendColor}`}>
                  <TrendIcon size={14} />
                  {diff !== null && <span className="text-xs font-medium">{diff >= 0 ? "+" : ""}{diff.toFixed(1)}</span>}
                </div>
              </div>
              <p className="text-xl font-bold font-display text-foreground">{sem.cwa.toFixed(2)}%</p>
              <p className="text-xs text-muted-foreground mt-0.5">{sem.courses.length} courses</p>
            </div>
          );
        })}
      </div>

      <div className="bg-card rounded-xl border border-border p-6 mb-6">
        <h2 className="font-display font-bold text-foreground mb-5">CWA Performance Analysis</h2>
        {(() => {
          const chartData = semesterData.map((s) => ({ name: s.short, cwa: parseFloat(s.cwa.toFixed(2)) }));
          return (
            <>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="name" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
                    <YAxis domain={[0, 100]} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
                    <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", color: "hsl(var(--foreground))" }} />
                    <Bar dataKey="cwa" radius={[6, 6, 0, 0]}>
                      {semesterData.map((_, i) => <Cell key={i} fill="hsl(var(--primary))" />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-4 p-3 rounded-lg bg-muted/50 border border-border flex items-center justify-between">
                <span className="text-sm font-medium text-foreground">Overall CWA</span>
                <span className="text-lg font-bold text-foreground">{overallCwa.toFixed(2)}%</span>
              </div>
            </>
          );
        })()}
      </div>

      <div className="space-y-6">
        {semesterData.map((sem) => (
          <div key={sem.label} className="bg-card rounded-xl border border-border overflow-hidden">
            <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-muted/30">
              <div>
                <h2 className="font-display font-bold text-foreground">{sem.label}</h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {sem.courses.length} courses · {sem.courses.reduce((s, c) => s + c.credits, 0)} credit hours
                </p>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">Semester CWA</p>
                  <p className="text-lg font-bold font-display text-foreground">{sem.cwa.toFixed(2)}%</p>
                </div>
                <button
                  onClick={() => handleDownload(sem)}
                  disabled={downloading === sem.label}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg gradient-gold text-secondary-foreground text-xs font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  {downloading === sem.label ? <Loader size={13} className="animate-spin" /> : <Download size={13} />}
                  Download
                </button>
              </div>
            </div>

            <table className="w-full hidden sm:table">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">#</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Code</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Course</th>
                  <th className="text-center px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Credits</th>
                  <th className="text-center px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Grade</th>
                  <th className="text-center px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Marks</th>
                </tr>
              </thead>
              <tbody>
                {sem.courses.map((c, i) => (
                  <tr key={i} className="border-b border-border last:border-0 hover:bg-muted/50 transition-colors">
                    <td className="px-6 py-3 text-sm text-muted-foreground">{i + 1}</td>
                    <td className="px-6 py-3 text-sm font-mono font-medium text-foreground">{c.code}</td>
                    <td className="px-6 py-3 text-sm text-foreground">{c.name}</td>
                    <td className="px-6 py-3 text-sm text-center text-muted-foreground">{c.credits}</td>
                    <td className={`px-6 py-3 text-sm text-center font-bold ${gradeColor(c.grade)}`}>{c.grade}</td>
                    <td className="px-6 py-3 text-sm text-center text-muted-foreground">{c.marks}%</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="sm:hidden divide-y divide-border">
              {sem.courses.map((c, i) => (
                <div key={i} className="px-4 py-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-foreground">{c.name}</p>
                    <p className="text-xs text-muted-foreground font-mono">{c.code} · {c.credits} credits</p>
                  </div>
                  <div className="text-right">
                    <p className={`text-sm font-bold ${gradeColor(c.grade)}`}>{c.grade}</p>
                    <p className="text-xs text-muted-foreground">{c.marks}%</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="px-6 py-3 bg-muted/20 border-t border-border flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs text-muted-foreground">
                Total Credits: <strong className="text-foreground">{sem.courses.reduce((s, c) => s + c.credits, 0)}</strong>
              </span>
              <span className="text-xs text-muted-foreground">
                Semester CWA: <strong className="text-foreground">{sem.cwa.toFixed(2)}%</strong>
              </span>
            </div>
          </div>
        ))}
      </div>
    </DashboardLayout>
  );
};

export default Results;
