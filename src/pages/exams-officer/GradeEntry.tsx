import DashboardLayout from "@/components/DashboardLayout";
import { useState, useRef } from "react";
import { useToast } from "@/hooks/use-toast";
<<<<<<< HEAD
import { Upload, Plus, Trash2, CheckCircle, AlertTriangle, FileText, Loader2 } from "lucide-react";
=======
import { Upload, Plus, Trash2, CheckCircle, AlertTriangle, FileText, Loader } from "lucide-react";
>>>>>>> d169077ec8d0bac1082407d22f518c6e5eeb7052
import { readSheetFile, SHEET_ACCEPT } from "@/lib/sheet-import";
import { apiFetch } from "@/lib/api";

interface GradeRow {
  id: string;
  indexNumber: string;
  studentName: string;
  courseName: string;
  credits: string;
  marks: string;
  valid: boolean;
  errors: string[];
}

const VALID_INDEX_PATTERN = /^UMaT\/PG\/\d{4}\/\d{2}$/;

const marksToGrade = (m: number): string => {
  if (m >= 80) return "A";
  if (m >= 70) return "B";
  if (m >= 60) return "C";
  if (m >= 50) return "D";
  return "F";
};

const validateRow = (row: Partial<GradeRow>): { valid: boolean; errors: string[] } => {
  const errors: string[] = [];
  if (!row.indexNumber || !VALID_INDEX_PATTERN.test(row.indexNumber)) errors.push("Invalid index number format (UMaT/PG/XXXX/YY)");
  if (!row.studentName?.trim()) errors.push("Student name required");
  if (!row.courseName?.trim()) errors.push("Course name required");
  const credits = Number(row.credits);
  if (!row.credits || !Number.isFinite(credits) || credits <= 0) errors.push("Credit hours must be a positive number");
  const marks = Number(row.marks);
  if (row.marks === "" || row.marks === undefined || !Number.isFinite(marks) || marks < 0 || marks > 100) {
    errors.push("Marks must be between 0 and 100");
  }
  return { valid: errors.length === 0, errors };
};

interface CWAResult {
  index: string;
  name: string;
  cwa: number;
  courses: { courseName: string; credits: number; marks: number; grade: string }[];
}

type BatchStatus = "Draft" | "Published";

const currentYear = new Date().getFullYear();
const academicYearOptions = [
  `${currentYear - 1}/${currentYear}`,
  `${currentYear}/${currentYear + 1}`,
  `${currentYear + 1}/${currentYear + 2}`,
];

const GradeEntry = () => {
  const [rows, setRows] = useState<GradeRow[]>([]);
  const [cwaResults, setCwaResults] = useState<CWAResult[]>([]);
  const [status, setStatus] = useState<BatchStatus>("Draft");
<<<<<<< HEAD
  const [publishing, setPublishing] = useState(false);
=======
  const [isPublishing, setIsPublishing] = useState(false);
  const [batchId, setBatchId] = useState<string | null>(null);
>>>>>>> d169077ec8d0bac1082407d22f518c6e5eeb7052
  const [semester, setSemester] = useState("Semester 1");
  const [academicYear, setAcademicYear] = useState(academicYearOptions[1]);
  const fileRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const addRow = () => {
    setRows((prev) => [
      ...prev,
      { id: `r${Date.now()}`, indexNumber: "", studentName: "", courseName: "", credits: "", marks: "", valid: true, errors: [] },
    ]);
  };

  const updateRow = (id: string, field: keyof GradeRow, value: string) => {
    setRows((prev) =>
      prev.map((r) => {
        if (r.id !== id) return r;
        const updated = { ...r, [field]: value };
        const { valid, errors } = validateRow(updated);
        return { ...updated, valid, errors };
      })
    );
  };

  const removeRow = (id: string) => setRows((prev) => prev.filter((r) => r.id !== id));

  const handleCSVUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const data = await readSheetFile(file);
      const dataRows = data.slice(1).filter((r) => r.some((c) => c !== ""));
      const newRows: GradeRow[] = dataRows.map((cols, i) => {
        const [indexNumber = "", studentName = "", courseName = "", credits = "", marks = ""] = cols;
        const { valid, errors } = validateRow({ indexNumber, studentName, courseName, credits, marks });
        return { id: `imp${i}${Date.now()}`, indexNumber, studentName, courseName, credits, marks, valid, errors };
      });
      setRows((prev) => [...prev, ...newRows]);
      const invalidCount = newRows.filter((r) => !r.valid).length;
      toast({
        title: `${newRows.length} rows imported`,
        description: invalidCount > 0 ? `${invalidCount} rows have validation errors` : "All rows validated successfully",
      });
    } catch (err) {
      toast({ title: "Import failed", description: (err as Error).message, variant: "destructive" });
    }
    e.target.value = "";
  };

  const calculateCWA = () => {
    const validRows = rows.filter((r) => r.valid);
    if (validRows.length === 0) {
      toast({ title: "No valid grades", description: "Fix validation errors first", variant: "destructive" });
      return;
    }
    const byStudent = validRows.reduce<Record<string, CWAResult>>((acc, r) => {
      if (!acc[r.indexNumber]) acc[r.indexNumber] = { index: r.indexNumber, name: r.studentName, cwa: 0, courses: [] };
      const marks = Number(r.marks);
      const credits = Number(r.credits);
      acc[r.indexNumber].courses.push({ courseName: r.courseName, credits, marks, grade: marksToGrade(marks) });
      return acc;
    }, {});
    const results: CWAResult[] = Object.values(byStudent).map((s) => {
      const totalCredits = s.courses.reduce((sum, c) => sum + c.credits, 0);
      const weighted = s.courses.reduce((sum, c) => sum + c.marks * c.credits, 0);
      return { ...s, cwa: totalCredits > 0 ? weighted / totalCredits : 0 };
    });
    setCwaResults(results);
    toast({ title: "CWA calculated", description: `Computed for ${results.length} student(s)` });
  };

  const publishResults = async () => {
    if (cwaResults.length === 0) {
      toast({ title: "Calculate CWA first", description: "Run CWA calculation before publishing", variant: "destructive" });
      return;
    }

<<<<<<< HEAD
    setPublishing(true);
    try {
      const grades = rows.filter((r) => r.valid).map((r) => ({
        student_index: r.indexNumber,
        student_name: r.studentName,
        course_name: r.courseName,
        grade: marksToGrade(Number(r.marks)),
        marks: Number(r.marks),
        credits: Number(r.credits),
      }));
      const res = await apiFetch<{ message: string; errors?: string[] }>("/results/grades/by-index", {
        method: "POST",
        body: JSON.stringify({ grades, semester, academic_year: academicYear }),
      });
      if (res.errors?.length) {
        toast({ title: `Published with ${res.errors.length} error(s)`, description: res.errors.slice(0, 3).join(", "), variant: "destructive" });
      } else {
        toast({ title: "Results published", description: `${res.message} — visible to students` });
      }
      setStatus("Published");
    } catch (err: any) {
      toast({ title: "Publish failed", description: err.message, variant: "destructive" });
    } finally {
      setPublishing(false);
=======
    setIsPublishing(true);
    try {
      const grades = cwaResults.flatMap((student) =>
        student.courses.map((course) => ({
          indexNumber: student.index,
          courseName: course.courseName,
          marks: course.marks,
          grade: course.grade,
          credits: course.credits,
        }))
      );

      const response = await apiFetch<{ batchId: string }>("/results/batch-upload", {
        method: "POST",
        body: JSON.stringify({
          grades,
          semester: 1,
          academicYear: academicYear,
        }),
      });

      setBatchId(response.batchId);
      setStatus("Published");
      toast({ title: "Results published", description: "Marks, grades, and CWA are now visible to students and the dean" });
    } catch (err) {
      toast({ title: "Publication failed", description: (err as Error).message, variant: "destructive" });
    } finally {
      setIsPublishing(false);
    }
  };

  const deletePublished = async () => {
    if (!batchId) {
      setCwaResults([]);
      setRows([]);
      setStatus("Draft");
      toast({ title: "Results cleared", description: "Draft has been cleared" });
      return;
    }

    try {
      await apiFetch(`/results/batch/${batchId}`, { method: "DELETE" });
      setCwaResults([]);
      setRows([]);
      setStatus("Draft");
      setBatchId(null);
      toast({ title: "Results deleted", description: "Published results have been removed" });
    } catch (err) {
      toast({ title: "Delete failed", description: (err as Error).message, variant: "destructive" });
>>>>>>> d169077ec8d0bac1082407d22f518c6e5eeb7052
    }
  };

  const allValid = rows.length > 0 && rows.every((r) => r.valid);

  return (
    <DashboardLayout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold font-display text-foreground">Grade Entry</h1>
            <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${status === "Published" ? "bg-success/15 text-success" : "bg-muted text-muted-foreground"}`}>
              {status}
            </span>
          </div>
          <p className="text-muted-foreground mt-1">Enter marks (0–100); grade and CWA are computed automatically</p>
        </div>
        <div className="flex gap-3">
          <input ref={fileRef} type="file" accept={SHEET_ACCEPT} className="hidden" onChange={handleCSVUpload} />
          <button onClick={() => fileRef.current?.click()} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-border text-sm font-medium text-foreground hover:bg-muted transition-colors">
            <Upload size={14} /> Upload CSV / Excel
          </button>
          <button onClick={addRow} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg gradient-gold text-secondary-foreground text-sm font-medium hover:opacity-90 transition-opacity">
            <Plus size={14} /> Add Row
          </button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1 block">Semester</label>
          <select value={semester} onChange={(e) => setSemester(e.target.value)} className="px-4 py-2.5 rounded-lg border border-input bg-card text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring">
            <option>Semester 1</option>
            <option>Semester 2</option>
          </select>
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1 block">Academic Year</label>
          <select value={academicYear} onChange={(e) => setAcademicYear(e.target.value)} className="px-4 py-2.5 rounded-lg border border-input bg-card text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring">
            {academicYearOptions.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
      </div>

      <div className="mb-3 p-3 rounded-lg bg-muted/40 border border-border text-xs text-muted-foreground flex items-start gap-2">
        <FileText size={14} className="mt-0.5 shrink-0" />
        <div>
          <p><span className="font-semibold text-foreground">File format (.csv, .xlsx, .xls):</span> index_number, student_name, course_name, credit_hours, marks</p>
          <p className="mt-1"><span className="font-semibold text-foreground">UMaT grading:</span> 80–100 A · 70–79 B · 60–69 C · 50–59 D · 0–49 F</p>
        </div>
      </div>

      {rows.length > 0 && (
        <div className="bg-card rounded-xl border border-border overflow-hidden mb-6">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Index Number</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Student Name</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Course</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Credits</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Marks</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Grade</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Status</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const marksNum = Number(r.marks);
                  const derivedGrade = r.marks !== "" && Number.isFinite(marksNum) && marksNum >= 0 && marksNum <= 100 ? marksToGrade(marksNum) : "—";
                  return (
                    <tr key={r.id} className={`border-b border-border last:border-0 ${!r.valid ? "bg-destructive/5" : ""}`}>
                      <td className="px-4 py-2">
                        <input value={r.indexNumber} onChange={(e) => updateRow(r.id, "indexNumber", e.target.value)} placeholder="UMaT/PG/0234/22" className="w-full px-2 py-1.5 rounded border border-input bg-background text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring" />
                      </td>
                      <td className="px-4 py-2">
                        <input value={r.studentName} onChange={(e) => updateRow(r.id, "studentName", e.target.value)} placeholder="Student name" className="w-full px-2 py-1.5 rounded border border-input bg-background text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring" />
                      </td>
                      <td className="px-4 py-2">
                        <input value={r.courseName} onChange={(e) => updateRow(r.id, "courseName", e.target.value)} placeholder="Course name" className="w-full px-2 py-1.5 rounded border border-input bg-background text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring" />
                      </td>
                      <td className="px-4 py-2">
                        <input type="number" min={1} step={1} value={r.credits} onChange={(e) => updateRow(r.id, "credits", e.target.value)} placeholder="3" className="w-20 px-2 py-1.5 rounded border border-input bg-background text-sm text-foreground text-center focus:outline-none focus:ring-1 focus:ring-ring" />
                      </td>
                      <td className="px-4 py-2">
                        <input type="number" min={0} max={100} step="0.01" value={r.marks} onChange={(e) => updateRow(r.id, "marks", e.target.value)} placeholder="0–100" className="w-24 px-2 py-1.5 rounded border border-input bg-background text-sm text-foreground text-center focus:outline-none focus:ring-1 focus:ring-ring" />
                      </td>
                      <td className="px-4 py-2 text-center text-sm font-semibold text-foreground">{derivedGrade}</td>
                      <td className="px-4 py-2 text-center">
                        {r.valid ? <CheckCircle size={16} className="inline text-success" /> : (
                          <span className="inline-flex items-center gap-1 text-xs text-destructive" title={r.errors.join("; ")}>
                            <AlertTriangle size={14} /> {r.errors.length} error{r.errors.length > 1 ? "s" : ""}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-2">
                        <button onClick={() => removeRow(r.id)} className="p-1 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-destructive">
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {rows.length > 0 && (
        <div className="flex gap-3 mb-8 flex-wrap">
          <button onClick={calculateCWA} disabled={!allValid} className="px-5 py-2.5 rounded-lg gradient-gold text-secondary-foreground text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50">
            Calculate CWA
          </button>
<<<<<<< HEAD
          <button
            onClick={publishResults}
            disabled={!allValid || cwaResults.length === 0 || status === "Published" || publishing}
            className="px-5 py-2.5 rounded-lg border border-border text-sm font-medium text-foreground hover:bg-muted transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {publishing && <Loader2 size={14} className="animate-spin" />}
            {status === "Published" ? "Published" : "Publish Results"}
          </button>
          <button onClick={clearAll} className="px-5 py-2.5 rounded-lg border border-destructive/30 text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors">
            {status === "Published" ? "Clear & Start New" : "Clear Draft"}
          </button>
=======
          <button onClick={publishResults} disabled={!allValid || cwaResults.length === 0 || status === "Published" || isPublishing} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg border border-border text-sm font-medium text-foreground hover:bg-muted transition-colors disabled:opacity-50">
            {isPublishing ? <Loader size={14} className="animate-spin" /> : null}
            {status === "Published" ? "Published" : "Publish Results"}
          </button>
          {cwaResults.length > 0 && (
            <button onClick={deletePublished} disabled={isPublishing} className="px-5 py-2.5 rounded-lg border border-destructive/30 text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-50">
              {status === "Published" ? "Delete Published Results" : "Clear Draft"}
            </button>
          )}
>>>>>>> d169077ec8d0bac1082407d22f518c6e5eeb7052
        </div>
      )}

      {rows.length === 0 && (
        <div className="bg-card rounded-xl border border-border p-12 text-center">
          <Upload size={40} className="mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">No grades entered yet</h3>
          <p className="text-sm text-muted-foreground mb-4">Add rows manually or upload a CSV file to get started</p>
        </div>
      )}

      {cwaResults.length > 0 && (
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <div className="p-4 border-b border-border flex items-center justify-between">
            <h2 className="font-display text-lg font-bold text-foreground">CWA Results — {semester}, {academicYear}</h2>
            <span className="text-xs text-muted-foreground">Credit-weighted: Σ(marks × credits) / Σ(credits)</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left px-6 py-3 text-xs font-semibold text-muted-foreground uppercase">Index</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-muted-foreground uppercase">Name</th>
                  <th className="text-center px-6 py-3 text-xs font-semibold text-muted-foreground uppercase">Courses</th>
                  <th className="text-center px-6 py-3 text-xs font-semibold text-muted-foreground uppercase">Total Credits</th>
                  <th className="text-center px-6 py-3 text-xs font-semibold text-muted-foreground uppercase">CWA</th>
                </tr>
              </thead>
              <tbody>
                {cwaResults.map((r) => {
                  const totalCredits = r.courses.reduce((s, c) => s + c.credits, 0);
                  return (
                    <tr key={r.index} className="border-b border-border last:border-0">
                      <td className="px-6 py-3 text-sm font-mono text-muted-foreground">{r.index}</td>
                      <td className="px-6 py-3 text-sm text-foreground">{r.name}</td>
                      <td className="px-6 py-3 text-sm text-center text-muted-foreground">{r.courses.length}</td>
                      <td className="px-6 py-3 text-sm text-center text-muted-foreground">{totalCredits}</td>
                      <td className="px-6 py-3 text-sm text-center font-bold text-foreground">{r.cwa.toFixed(2)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};

export default GradeEntry;
