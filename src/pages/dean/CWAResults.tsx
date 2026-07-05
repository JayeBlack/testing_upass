import DashboardLayout from "@/components/DashboardLayout";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { useState, useEffect } from "react";
import { Filter, Loader2 } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";

interface StudentResult {
  id: string;
  first_name: string;
  last_name: string;
  index_number: string;
  program_name: string;
  department_name: string;
  department_id: number | null;
  admission_year: number | null;
  cwa: number;
}

const CWAResults = () => {
  const { user } = useAuth();
  const [students, setStudents] = useState<StudentResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [yearFilter, setYearFilter] = useState<string>("all");
  const [deptFilter, setDeptFilter] = useState<string>("all");

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch<StudentResult[]>("/results/cwa-overview");
      setStudents(data.map(s => ({ ...s, cwa: Number(s.cwa) })));
    } catch (err) {
      setError((err as Error).message);
      setStudents([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const isSuperAdmin = user?.isSuperAdmin || user?.role === "Admin";

  // Build department list for the dropdown (Admin only)
  const departments = [...new Map(
    students.filter(s => s.department_id && s.department_name)
      .map(s => [s.department_id, s.department_name])
  ).entries()].sort((a, b) => a[1].localeCompare(b[1]));

  const years = [...new Set(
    students.map(s => s.admission_year).filter((y): y is number => y !== null)
  )].sort();

  // Dean/ViceDean see all students (no dept scoping — their dept_id may not match student dept_ids)
  // Admin uses the dropdown to filter by department
  const effectiveDeptId = isSuperAdmin
    ? (deptFilter === "all" ? null : Number(deptFilter))
    : null;

  const filteredStudents = students.filter(s => {
    const matchYear = yearFilter === "all" || String(s.admission_year) === yearFilter;
    const matchDept = effectiveDeptId === null || s.department_id === effectiveDeptId;
    return matchYear && matchDept;
  });

  // Group by program for bar chart
  const programGroups = filteredStudents.reduce((acc, s) => {
    const prog = s.program_name || "Unknown";
    if (!acc[prog]) acc[prog] = [];
    acc[prog].push(s.cwa);
    return acc;
  }, {} as Record<string, number[]>);

  const programCWA = Object.entries(programGroups)
    .map(([program, cwas]) => ({
      program: program.length > 20 ? program.substring(0, 20) + "..." : program,
      cwa: parseFloat((cwas.reduce((a, b) => a + b, 0) / cwas.length).toFixed(2)),
    }))
    .filter(p => p.cwa > 0)
    .sort((a, b) => b.cwa - a.cwa);

  const studentsWithCWA = filteredStudents.filter(s => s.cwa > 0);

  const classDistribution = [
    { name: "First Class (≥80)",          value: studentsWithCWA.filter(s => s.cwa >= 80).length,              color: "hsl(var(--secondary))" },
    { name: "Second Class Upper (70-79)", value: studentsWithCWA.filter(s => s.cwa >= 70 && s.cwa < 80).length, color: "hsl(var(--primary))" },
    { name: "Second Class Lower (60-69)", value: studentsWithCWA.filter(s => s.cwa >= 60 && s.cwa < 70).length, color: "hsl(var(--muted-foreground))" },
    { name: "Third Class (50-59)",        value: studentsWithCWA.filter(s => s.cwa >= 50 && s.cwa < 60).length, color: "hsl(var(--destructive))" },
    { name: "Fail (<50)",                 value: studentsWithCWA.filter(s => s.cwa < 50).length,                color: "hsl(var(--border))" },
  ];

  const topStudents = [...studentsWithCWA]
    .sort((a, b) => b.cwa - a.cwa)
    .slice(0, 10);

  const avgCWA = studentsWithCWA.length > 0
    ? (studentsWithCWA.reduce((sum, s) => sum + s.cwa, 0) / studentsWithCWA.length).toFixed(2)
    : "—";

  const scopeLabel = isSuperAdmin
    ? "Performance analysis across all postgraduate programs"
    : `${user?.department || "Department"} — Performance analysis`;

  return (
    <DashboardLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold font-display text-foreground">CWA Results Overview</h1>
        <p className="text-muted-foreground mt-1">{scopeLabel}</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Filter size={16} />
          <span>Filter by:</span>
        </div>
        <select
          value={yearFilter}
          onChange={e => setYearFilter(e.target.value)}
          className="px-4 py-2.5 rounded-lg border border-input bg-card text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="all">All Admission Years</option>
          {years.map(y => <option key={y} value={String(y)}>{y}</option>)}
        </select>
        {isSuperAdmin && (
          <select
            value={deptFilter}
            onChange={e => setDeptFilter(e.target.value)}
            className="px-4 py-2.5 rounded-lg border border-input bg-card text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="all">All Departments</option>
            {departments.map(([id, name]) => <option key={id} value={String(id)}>{name}</option>)}
          </select>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground text-sm">
          <Loader2 size={18} className="animate-spin mr-2" /> Loading data...
        </div>
      ) : error ? (
        <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-4 text-destructive text-sm">
          <strong>Failed to load CWA data:</strong> {error}
        </div>
      ) : filteredStudents.length === 0 ? (
        <div className="bg-card rounded-xl border border-border p-12 text-center">
          <p className="text-muted-foreground text-sm">No CWA data found. Grades must be uploaded via Exams Officer &gt; Grade Entry before results appear here.</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-6">
            {[
              { label: "School Avg CWA",  value: avgCWA },
              { label: "Total Students",  value: String(filteredStudents.length) },
              { label: "First Class",     value: String(studentsWithCWA.filter(s => s.cwa >= 80).length) },
              { label: "With Results",    value: String(studentsWithCWA.length) },
            ].map(s => (
              <div key={s.label} className="bg-card rounded-xl border border-border p-5">
                <p className="text-2xl font-bold font-display text-foreground">{s.value}</p>
                <p className="text-sm text-muted-foreground mt-1">{s.label}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <div className="bg-card rounded-xl border border-border p-6">
              <h2 className="font-display text-lg font-bold text-foreground mb-4">Average CWA by Program</h2>
              {programCWA.length > 0 ? (
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={programCWA}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="program" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} angle={-15} textAnchor="end" height={80} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} />
                    <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                    <Bar dataKey="cwa" fill="hsl(var(--secondary))" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-16">No CWA data available</p>
              )}
            </div>

            <div className="bg-card rounded-xl border border-border p-6">
              <h2 className="font-display text-lg font-bold text-foreground mb-4">Class Distribution</h2>
              {studentsWithCWA.length > 0 ? (
                <>
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie
                        data={classDistribution.filter(c => c.value > 0)}
                        cx="50%" cy="50%" outerRadius={80}
                        dataKey="value"
                        label={({ value }) => value > 0 ? `${value}` : ""}
                      >
                        {classDistribution.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    {classDistribution.map(c => (
                      <div key={c.name} className="flex items-center gap-2 text-xs text-muted-foreground">
                        <div className="w-3 h-3 rounded-sm shrink-0" style={{ backgroundColor: c.color }} />
                        {c.name.split(" ")[0]} ({c.value})
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-16">No grade data available</p>
              )}
            </div>
          </div>

          <div className="bg-card rounded-xl border border-border p-6">
            <h2 className="font-display text-lg font-bold text-foreground mb-4">Top Performing Students</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left px-4 py-2 font-medium text-muted-foreground">#</th>
                    <th className="text-left px-4 py-2 font-medium text-muted-foreground">Student</th>
                    <th className="text-left px-4 py-2 font-medium text-muted-foreground">Index</th>
                    <th className="text-left px-4 py-2 font-medium text-muted-foreground">Program</th>
                    {isSuperAdmin && <th className="text-left px-4 py-2 font-medium text-muted-foreground">Department</th>}
                    <th className="text-left px-4 py-2 font-medium text-muted-foreground">CWA</th>
                  </tr>
                </thead>
                <tbody>
                  {topStudents.length > 0 ? topStudents.map((s, i) => (
                    <tr key={s.id} className="border-b border-border last:border-0">
                      <td className="px-4 py-3 text-muted-foreground">{i + 1}</td>
                      <td className="px-4 py-3 font-medium text-foreground">{s.first_name} {s.last_name}</td>
                      <td className="px-4 py-3 text-muted-foreground font-mono">{s.index_number}</td>
                      <td className="px-4 py-3 text-muted-foreground">{s.program_name}</td>
                      {isSuperAdmin && <td className="px-4 py-3 text-muted-foreground">{s.department_name}</td>}
                      <td className="px-4 py-3 font-bold text-foreground">{s.cwa.toFixed(2)}</td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan={isSuperAdmin ? 6 : 5} className="px-4 py-8 text-center text-muted-foreground">
                        No CWA results available
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </DashboardLayout>
  );
};

export default CWAResults;
