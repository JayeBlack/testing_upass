import DashboardLayout from "@/components/DashboardLayout";
import { useState, useRef } from "react";
import { useToast } from "@/hooks/use-toast";
import { Upload, Plus, Trash2, CheckCircle, AlertTriangle } from "lucide-react";

interface GradeRow {
  id: string;
  indexNumber: string;
  studentName: string;
  courseName: string;
  grade: string;
  valid: boolean;
  errors: string[];
}

const VALID_GRADES = ["A+", "A", "B+", "B", "C+", "C", "D+", "D", "E", "F"];
const VALID_INDEX_PATTERN = /^UMaT\/PG\/\d{4}\/\d{2}$/;

const validateRow = (row: Partial<GradeRow>): { valid: boolean; errors: string[] } => {
  const errors: string[] = [];
  if (!row.indexNumber || !VALID_INDEX_PATTERN.test(row.indexNumber)) errors.push("Invalid index number format (UMaT/PG/XXXX/YY)");
  if (!row.grade || !VALID_GRADES.includes(row.grade.toUpperCase())) errors.push(`Invalid grade. Use: ${VALID_GRADES.join(", ")}`);
  if (!row.studentName?.trim()) errors.push("Student name required");
  if (!row.courseName?.trim()) errors.push("Course name required");
  return { valid: errors.length === 0, errors };
};

const gradePoints: Record<string, number> = {
  "A+": 4.0, A: 4.0, "B+": 3.5, B: 3.0, "C+": 2.5, C: 2.0, "D+": 1.5, D: 1.0, E: 0.5, F: 0.0,
};

const GradeEntry = () => {
  const [rows, setRows] = useState<GradeRow[]>([]);
  const [cwaResults, setCwaResults] = useState<{ index: string; name: string; cwa: number }[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const addRow = () => {
    setRows((prev) => [
      ...prev,
      { id: `r${Date.now()}`, indexNumber: "", studentName: "", courseName: "", grade: "", valid: true, errors: [] },
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

  const handleCSVUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const lines = text.split("\n").filter((l) => l.trim());
      const newRows: GradeRow[] = lines.slice(1).map((line, i) => {
        const [indexNumber = "", studentName = "", courseName = "", grade = ""] = line.split(",").map((s) => s.trim());
        const { valid, errors } = validateRow({ indexNumber, studentName, courseName, grade });
        return { id: `csv${i}${Date.now()}`, indexNumber, studentName, courseName, grade: grade.toUpperCase(), valid, errors };
      });
      setRows((prev) => [...prev, ...newRows]);
      const invalidCount = newRows.filter((r) => !r.valid).length;
      toast({
        title: `${newRows.length} rows imported`,
        description: invalidCount > 0 ? `${invalidCount} rows have validation errors` : "All rows validated successfully",
      });
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const calculateCWA = () => {
    const validRows = rows.filter((r) => r.valid);
    if (validRows.length === 0) {
      toast({ title: "No valid grades", description: "Fix validation errors first", variant: "destructive" });
      return;
    }
    const byStudent = validRows.reduce<Record<string, { name: string; grades: number[] }>>((acc, r) => {
      if (!acc[r.indexNumber]) acc[r.indexNumber] = { name: r.studentName, grades: [] };
      acc[r.indexNumber].grades.push(gradePoints[r.grade.toUpperCase()] ?? 0);
      return acc;
    }, {});
    const results = Object.entries(byStudent).map(([index, { name, grades }]) => ({
      index,
      name,
      cwa: (grades.reduce((s, g) => s + g, 0) / grades.length) * 25,
    }));
    setCwaResults(results);
    toast({ title: "CWA calculated", description: `Computed for ${results.length} student(s)` });
  };

  const publishResults = () => {
    toast({ title: "Results published", description: "Grades are now visible on student portals" });
  };

  const deletePublished = () => {
    setCwaResults([]);
    setRows([]);
    toast({ title: "Results deleted", description: "Published results have been removed" });
  };

  const allValid = rows.length > 0 && rows.every((r) => r.valid);

  return (
    <DashboardLayout>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold font-display text-foreground">Grade Entry</h1>
          <p className="text-muted-foreground mt-1">Input grades manually or upload via CSV</p>
        </div>
        <div className="flex gap-3">
          <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={handleCSVUpload} />
          <button onClick={() => fileRef.current?.click()} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-border text-sm font-medium text-foreground hover:bg-muted transition-colors">
            <Upload size={14} /> Upload CSV
          </button>
          <button onClick={addRow} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg gradient-gold text-secondary-foreground text-sm font-medium hover:opacity-90 transition-opacity">
            <Plus size={14} /> Add Row
          </button>
        </div>
      </div>

      <p className="text-xs text-muted-foreground mb-2">CSV format: Index Number, Student Name, Course Name, Grade</p>

      {rows.length > 0 && (
        <div className="bg-card rounded-xl border border-border overflow-hidden mb-6">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Index Number</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Student Name</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Course</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Grade</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Status</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
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
                      <select value={r.grade} onChange={(e) => updateRow(r.id, "grade", e.target.value)} className="w-full px-2 py-1.5 rounded border border-input bg-background text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring">
                        <option value="">Select</option>
                        {VALID_GRADES.map((g) => <option key={g} value={g}>{g}</option>)}
                      </select>
                    </td>
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
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {rows.length > 0 && (
        <div className="flex gap-3 mb-8">
          <button onClick={calculateCWA} disabled={!allValid} className="px-5 py-2.5 rounded-lg gradient-gold text-secondary-foreground text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50">
            Calculate CWA
          </button>
          <button onClick={publishResults} disabled={!allValid} className="px-5 py-2.5 rounded-lg border border-border text-sm font-medium text-foreground hover:bg-muted transition-colors disabled:opacity-50">
            Publish to Student Portals
          </button>
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
          <div className="p-4 border-b border-border">
            <h2 className="font-display text-lg font-bold text-foreground">CWA Results</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left px-6 py-3 text-xs font-semibold text-muted-foreground uppercase">Index</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-muted-foreground uppercase">Name</th>
                  <th className="text-center px-6 py-3 text-xs font-semibold text-muted-foreground uppercase">CWA</th>
                </tr>
              </thead>
              <tbody>
                {cwaResults.map((r) => (
                  <tr key={r.index} className="border-b border-border last:border-0">
                    <td className="px-6 py-3 text-sm font-mono text-muted-foreground">{r.index}</td>
                    <td className="px-6 py-3 text-sm text-foreground">{r.name}</td>
                    <td className="px-6 py-3 text-sm text-center font-semibold text-foreground">{r.cwa.toFixed(1)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};

export default GradeEntry;
