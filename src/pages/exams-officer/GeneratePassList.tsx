import DashboardLayout from "@/components/DashboardLayout";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { useAdminDepartment } from "@/hooks/use-admin-department";
import ExportDropdown from "@/components/ExportDropdown";
import { exportData } from "@/lib/exportUtils";
import { apiFetch } from "@/lib/api";
import { Loader2 } from "lucide-react";

interface Graduand {
  id: string;
  student_id: string;
  index_number: string;
  first_name: string;
  last_name: string;
  program_name: string;
  department_name: string;
  academic_year: string;
  cwa: number;
  status: string;
}

const GeneratePassList = () => {
  const { isSuperAdmin, adminDepartment } = useAdminDepartment();
  const { toast } = useToast();
  const [graduands, setGraduands] = useState<Graduand[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [deptFilter, setDeptFilter] = useState("all");
  const [progFilter, setProgFilter] = useState("all");
  const [yearFilter, setYearFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [minCwa, setMinCwa] = useState("50");
  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: 6 }, (_, i) => {
    const y = currentYear - 2 + i;
    return `${y}/${y + 1}`;
  });

  const [academicYear, setAcademicYear] = useState(`${currentYear}/${currentYear + 1}`);

  const load = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const data = await apiFetch<Graduand[]>("/passlist");
      setGraduands(data || []);
    } catch {
      // backend offline
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const res = await apiFetch<{ message: string }>("/passlist/generate", {
        method: "POST",
        body: JSON.stringify({ academic_year: academicYear, min_cwa: Number(minCwa) }),
      });
      toast({ title: "Pass list generated", description: res.message });
      load();
    } catch (err: any) {
      toast({ title: "Failed", description: err.message, variant: "destructive" });
    } finally {
      setGenerating(false);
    }
  };

  const departments = [...new Set(graduands.map((g) => g.department_name).filter(Boolean))];
  const programs = [...new Set(graduands.map((g) => g.program_name).filter(Boolean))];
  const years = [...new Set(graduands.map((g) => g.academic_year).filter(Boolean))].sort().reverse();

  const filtered = graduands.filter((g) => {
    const effectiveDept = isSuperAdmin ? deptFilter : (adminDepartment || "all");
    const matchesDept = effectiveDept === "all" || g.department_name === effectiveDept;
    return matchesDept &&
      (progFilter === "all" || g.program_name === progFilter) &&
      (yearFilter === "all" || g.academic_year === yearFilter);
  });

  // Pagination
  const itemsPerPage = 50;
  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedGraduands = filtered.slice(startIndex, endIndex);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [deptFilter, progFilter, yearFilter]);

  const handleExport = (format: "csv" | "pdf") => {
    const headers = ["Name", "Index Number", "Programme", "Department", "CWA", "Status"];
    const rows = filtered.map((g) => [
      `${g.first_name} ${g.last_name}`, g.index_number, g.program_name, g.department_name,
      Number(g.cwa).toFixed(2), g.status,
    ]);
    exportData({
      title: "Pass List — Exams Office",
      subtitle: `Generated on ${new Date().toLocaleDateString()}`,
      headers, rows,
      fileName: "UMaT_Pass_List_ExamsOffice",
      format,
    });
    toast({ title: `${format.toUpperCase()} exported`, description: "Pass list downloaded" });
  };

  return (
    <DashboardLayout>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold font-display text-foreground">Generate Pass List</h1>
          <p className="text-muted-foreground mt-1">Filter by programme, department, and academic year</p>
        </div>
        <ExportDropdown onExport={handleExport} />
      </div>

      {/* Generate panel */}
      <div className="bg-card rounded-xl border border-border p-5 mb-6 flex flex-col sm:flex-row sm:items-end gap-4">
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1 block">Academic Year</label>
          <select
            value={academicYear}
            onChange={(e) => setAcademicYear(e.target.value)}
            className="px-4 py-2.5 rounded-lg border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring w-36"
          >
            {yearOptions.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1 block">Min CWA</label>
          <input
            type="number" min={0} max={100} value={minCwa}
            onChange={(e) => setMinCwa(e.target.value)}
            className="px-4 py-2.5 rounded-lg border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring w-24"
          />
        </div>
        <button
          onClick={handleGenerate}
          disabled={generating}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg gradient-gold text-secondary-foreground text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-60"
        >
          {generating ? <Loader2 size={14} className="animate-spin" /> : null}
          Generate Pass List
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <select value={yearFilter} onChange={(e) => setYearFilter(e.target.value)} className="px-4 py-3 rounded-lg border border-input bg-card text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring">
          <option value="all">All Years</option>
          {years.map((y) => <option key={y} value={y}>{y}</option>)}
        </select>
        <select value={progFilter} onChange={(e) => setProgFilter(e.target.value)} className="px-4 py-3 rounded-lg border border-input bg-card text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring">
          <option value="all">All Programmes</option>
          {programs.map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
        {isSuperAdmin && (
          <select value={deptFilter} onChange={(e) => setDeptFilter(e.target.value)} className="px-4 py-3 rounded-lg border border-input bg-card text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring">
            <option value="all">All Departments</option>
            {departments.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
        )}
      </div>

      <p className="text-sm text-muted-foreground mb-4">Showing {paginatedGraduands.length} of {filtered.length} students {filtered.length !== graduands.length ? `(filtered from ${graduands.length} total)` : ""}</p>

      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="overflow-x-auto">
          {loading ? (
            <div className="flex items-center justify-center py-16 text-muted-foreground text-sm">
              <Loader2 size={18} className="animate-spin mr-2" /> Loading pass list...
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left px-6 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Name</th>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Index</th>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Programme</th>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Department</th>
                  <th className="text-center px-6 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">CWA</th>
                  <th className="text-center px-6 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody>
                {paginatedGraduands.map((g) => (
                  <tr key={g.id} className="border-b border-border last:border-0 hover:bg-muted/50 transition-colors">
                    <td className="px-6 py-4 text-sm font-medium text-foreground">{g.first_name} {g.last_name}</td>
                    <td className="px-6 py-4 text-sm font-mono text-muted-foreground">{g.index_number}</td>
                    <td className="px-6 py-4 text-sm text-muted-foreground">{g.program_name}</td>
                    <td className="px-6 py-4 text-sm text-muted-foreground">{g.department_name}</td>
                    <td className="px-6 py-4 text-sm text-center font-semibold text-foreground">{Number(g.cwa).toFixed(2)}</td>
                    <td className="px-6 py-4 text-center">
                      <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${g.status === "Eligible" ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"}`}>
                        {g.status}
                      </span>
                    </td>
                  </tr>
                ))}
                {paginatedGraduands.length === 0 && !loading && (
                  <tr><td colSpan={6} className="px-6 py-12 text-center text-sm text-muted-foreground">No results match the selected filters. Click "Generate Pass List" to compute from grades.</td></tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default GeneratePassList;
