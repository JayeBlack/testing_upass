import DashboardLayout from "@/components/DashboardLayout";
import { BarChart3, TrendingUp, TrendingDown, Minus, FileText, Loader } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { apiFetch } from "@/lib/api";

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
  courses: { code: string; name: string; credits: number; grade: string; marks: number }[];
  cwa: number;
}

const calcCwa = (courses: { marks: number; credits: number }[]) => {
  if (courses.length === 0) return 0;
  const totalCredits = courses.reduce((s, c) => s + c.credits, 0);
  if (totalCredits === 0) return 0;
  return courses.reduce((s, c) => s + c.marks * c.credits, 0) / totalCredits;
};

const Results = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [semesterData, setSemesterData] = useState<SemesterResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchResults = async () => {
      try {
        if (!user?.id) {
          setError("User not authenticated");
          setLoading(false);
          return;
        }

        const grades = await apiFetch(`/results/student/${user.id}`);
        
        if (!grades || grades.length === 0) {
          setSemesterData([]);
          setLoading(false);
          return;
        }

        const grouped: Record<string, GradeData[]> = {};
        grades.forEach((g: GradeData) => {
          const key = `${g.academic_year}-S${g.semester}`;
          if (!grouped[key]) grouped[key] = [];
          grouped[key].push(g);
        });

        const semesters: SemesterResult[] = Object.entries(grouped)
          .sort(([keyA], [keyB]) => keyB.localeCompare(keyA))
          .map(([key, courses]) => {
            const [academicYear, semester] = key.split("-");
            const sem = parseInt(semester.replace("S", ""));
            return {
              label: `Semester ${sem}, ${academicYear}`,
              short: `S${sem} ${academicYear.split("/").map(y => y.slice(-2)).join("/")}`,
              courses: courses.map((c) => ({
                code: c.code,
                name: c.course_name,
                credits: c.credits,
                grade: c.grade,
                marks: c.marks,
              })),
              cwa: 0,
            };
          });

        semesters.forEach((s) => {
          s.cwa = calcCwa(s.courses);
        });

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

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center py-16">
          <div className="text-center">
            <Loader size={40} className="animate-spin text-primary mx-auto mb-4" />
            <p className="text-muted-foreground">Loading your results...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout>
        <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-4 text-destructive">
          <p><strong>Error loading results:</strong> {error}</p>
        </div>
      </DashboardLayout>
    );
  }

  if (semesterData.length === 0) {
    return (
      <DashboardLayout>
        <div className="mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold font-display text-foreground">Academic Results</h1>
            <p className="text-muted-foreground mt-1">Performance overview across all semesters</p>
          </div>
        </div>
        <div className="bg-card rounded-xl border border-border p-12 text-center">
          <BarChart3 size={40} className="mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">No results available</h3>
          <p className="text-sm text-muted-foreground">Your results will appear here once they are published by the exams officer</p>
        </div>
      </DashboardLayout>
    );
  }

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
          Request Transcript
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-card rounded-xl border border-border px-5 py-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg gradient-gold flex items-center justify-center">
            <BarChart3 size={20} className="text-secondary-foreground" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Overall CWA</p>
            <p className="text-2xl font-bold font-display text-foreground">{overallCwa.toFixed(1)}</p>
          </div>
        </div>

        {semesterData.map((sem, i) => {
          const prev = i > 0 ? semesterData[i - 1].cwa : null;
          const diff = prev !== null ? sem.cwa - prev : null;
          const TrendIcon = diff === null ? Minus : diff >= 0 ? TrendingUp : TrendingDown;
          const trendColor = diff === null ? "text-muted-foreground" : diff >= 0 ? "text-success" : "text-destructive";
          return (
            <div key={sem.label} className="bg-card rounded-xl border border-border px-5 py-4">
              <div className="flex items-center justify-between mb-1">
                <p className="text-xs text-muted-foreground">{sem.short}</p>
                <div className={`flex items-center gap-1 ${trendColor}`}>
                  <TrendIcon size={14} />
                  {diff !== null && <span className="text-xs font-medium">{diff >= 0 ? "+" : ""}{diff.toFixed(1)}</span>}
                </div>
              </div>
              <p className="text-xl font-bold font-display text-foreground">{sem.cwa.toFixed(1)}</p>
            </div>
          );
        })}
      </div>

      <div className="bg-card rounded-xl border border-border p-6 mb-6">
        <h2 className="font-display font-bold text-foreground mb-5">CWA Performance Analysis</h2>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={semesterData.map((s) => ({ name: s.short, cwa: parseFloat(s.cwa.toFixed(1)) }))}>
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
          <span className="text-lg font-bold text-foreground">{overallCwa.toFixed(1)}%</span>
        </div>
      </div>

      <div className="space-y-6">
        {semesterData.map((sem) => (
          <div key={sem.label} className="bg-card rounded-xl border border-border overflow-hidden">
            <div className="px-6 py-4 border-b border-border flex items-center justify-between">
              <h2 className="font-display font-bold text-foreground">{sem.label}</h2>
              <span className="text-sm text-muted-foreground">
                CWA: <span className="font-bold text-foreground">{sem.cwa.toFixed(1)}</span>
              </span>
            </div>

            <table className="w-full hidden sm:table">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Code</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Course</th>
                  <th className="text-center px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Credits</th>
                  <th className="text-center px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Grade</th>
                  <th className="text-center px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Marks (%)</th>
                </tr>
              </thead>
              <tbody>
                {sem.courses.map((c, i) => (
                  <tr key={i} className="border-b border-border last:border-0 hover:bg-muted/50 transition-colors">
                    <td className="px-6 py-3 text-sm font-mono font-medium text-foreground">{c.code}</td>
                    <td className="px-6 py-3 text-sm text-foreground">{c.name}</td>
                    <td className="px-6 py-3 text-sm text-center text-muted-foreground">{c.credits}</td>
                    <td className="px-6 py-3 text-sm text-center font-semibold text-foreground">{c.grade}</td>
                    <td className="px-6 py-3 text-sm text-center text-muted-foreground">{c.marks}</td>
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
                    <p className="text-sm font-semibold text-foreground">{c.grade}</p>
                    <p className="text-xs text-muted-foreground">{c.marks}%</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </DashboardLayout>
  );
};

export default Results;
