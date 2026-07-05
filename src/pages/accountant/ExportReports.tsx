import DashboardLayout from "@/components/DashboardLayout";
import { FileText, Loader2, Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { exportData } from "@/lib/exportUtils";
import { useEffect, useState, useCallback } from "react";
import { apiFetch } from "@/lib/api";
import { useAdminDepartment } from "@/hooks/use-admin-department";

interface FeeRecord {
  id: string;
  index_number: string;
  first_name: string;
  last_name: string;
  program_name: string;
  department_name: string;
  academic_year: string;
  semester: string;
  total_amount: number;
  amount_paid: number;
  outstanding: number;
  status: string;
  is_cleared: boolean;
}

const currentYear = new Date().getFullYear();
const academicYearOptions = [
  `${currentYear - 1}/${currentYear}`,
  `${currentYear}/${currentYear + 1}`,
  `${currentYear + 1}/${currentYear + 2}`,
];

const ExportReports = () => {
  const { toast } = useToast();
  const { adminDepartment } = useAdminDepartment();
  const [fees, setFees] = useState<FeeRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterYear, setFilterYear] = useState<string>("all");
  const [filterSemester, setFilterSemester] = useState<string>("all");
  const [filterProgram, setFilterProgram] = useState<string>("all");

  const loadFees = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const response = await apiFetch<{ data: FeeRecord[] } | FeeRecord[]>("/fees?limit=10000");
      const data = Array.isArray(response) ? response : response.data || [];
      setFees(data);
    } catch {
      // backend offline
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  // Auto-refresh every 30 seconds for real-time data
  useEffect(() => {
    loadFees();
    const interval = setInterval(() => loadFees(true), 10000);
    return () => clearInterval(interval);
  }, [loadFees]);

  const allYears = [...new Set(fees.map((f) => f.academic_year).filter(Boolean))].sort();
  const allSemesters = [...new Set(fees.map((f) => f.semester).filter(Boolean))].sort();
  const allPrograms = [...new Set(fees.map((f) => f.program_name).filter(Boolean))].sort();

  const filteredFees = fees.filter((f) => {
    if (filterYear !== "all" && f.academic_year !== filterYear) return false;
    if (filterSemester !== "all" && f.semester !== filterSemester) return false;
    if (filterProgram !== "all" && f.program_name !== filterProgram) return false;
    if (adminDepartment && f.department_name !== adminDepartment) return false;
    return true;
  });

  const handleExport = async (report: string, format: "csv" | "pdf") => {
    console.log("handleExport called", { report, format, filteredFeesCount: filteredFees.length });
    
    let freshFees: FeeRecord[] = fees;
    try {
      const response = await apiFetch<{ data: FeeRecord[] } | FeeRecord[]>("/fees?limit=10000");
      freshFees = Array.isArray(response) ? response : response.data || [];
      setFees(freshFees);
    } catch {
      // Use cached data if fetch fails
    }

    const freshFiltered = freshFees.filter((f) => {
      if (filterYear !== "all" && f.academic_year !== filterYear) return false;
      if (filterSemester !== "all" && f.semester !== filterSemester) return false;
      if (filterProgram !== "all" && f.program_name !== filterProgram) return false;
      if (adminDepartment && f.department_name !== adminDepartment) return false;
      return true;
    });

    if (freshFiltered.length === 0) {
      toast({ title: "No data", description: "No fee records match the current filters", variant: "destructive" });
      return;
    }

    let headers: string[] = [];
    let rows: string[][] = [];
    let title = "";
    const filterSuffix = filterYear !== "all" ? ` (${filterYear})` : "";

    if (report === "collection") {
      title = `Fee Collection Summary${filterSuffix}`;
      const grouped = freshFiltered.reduce((acc, f) => {
        const program = f.program_name || "Unassigned";
        const sem = f.semester || "Unknown";
        const year = f.academic_year || "N/A";
        const key = `${program}|${sem}|${year}`;
        if (!acc[key]) acc[key] = { program, semester: sem, academic_year: year, count: 0, collected: 0, total: 0 };
        acc[key].count++;
        acc[key].collected += Number(f.amount_paid) || 0;
        acc[key].total += Number(f.total_amount) || 0;
        return acc;
      }, {} as Record<string, { program: string; semester: string; academic_year: string; count: number; collected: number; total: number }>);
      headers = ["#", "Program", "Semester", "Academic Year", "Students", "Collected (GHS)", "Total Fees (GHS)"];
      rows = Object.values(grouped).map((g, i) => [
        String(i + 1),
        g.program,
        g.semester,
        g.academic_year,
        String(g.count),
        g.collected.toFixed(2),
        g.total.toFixed(2),
      ]);
    } else if (report === "outstanding") {
      title = `Outstanding Balances Report${filterSuffix}`;
      const owing = freshFiltered.filter((f) => Number(f.outstanding) > 0);
      headers = ["#", "Student Name", "Index Number", "Program", "Semester", "Academic Year", "Outstanding (GHS)"];
      rows = owing.map((f, i) => [
        String(i + 1),
        `${f.first_name} ${f.last_name}`,
        f.index_number,
        f.program_name,
        f.semester,
        f.academic_year,
        Number(f.outstanding).toFixed(2),
      ]);
    } else if (report === "compliance") {
      title = `Payment Compliance Report${filterSuffix}`;
      const byProgram = freshFiltered.reduce((acc, f) => {
        if (!acc[f.program_name]) acc[f.program_name] = { total: 0, cleared: 0, partial: 0, unpaid: 0 };
        acc[f.program_name].total++;
        if (f.is_cleared) acc[f.program_name].cleared++;
        else if (f.amount_paid > 0) acc[f.program_name].partial++;
        else acc[f.program_name].unpaid++;
        return acc;
      }, {} as Record<string, { total: number; cleared: number; partial: number; unpaid: number }>);
      headers = ["#", "Program", "Total", "Cleared", "Partial", "Unpaid", "Compliance (%)"];
      rows = Object.entries(byProgram).map(([prog, data], i) => [
        String(i + 1),
        prog,
        String(data.total),
        String(data.cleared),
        String(data.partial),
        String(data.unpaid),
        ((data.cleared / data.total) * 100).toFixed(1),
      ]);
    }

    try {
      exportData({
        title,
        subtitle: `Generated: ${new Date().toLocaleDateString("en-GB")} ${new Date().toLocaleTimeString("en-GB")}`,
        headers,
        rows,
        fileName: `UMaT_${title.replace(/\s+/g, "_")}`,
        format,
      });
      toast({ title: "Report Exported", description: `${title} downloaded as ${format.toUpperCase()}` });
    } catch (err) {
      toast({ title: "Export failed", description: String(err), variant: "destructive" });
    }
  };

  const reports = [
    { id: "collection", name: "Fee Collection Summary", description: "Total fees collected by program, semester, and academic year" },
    { id: "outstanding", name: "Outstanding Balances Report", description: "Students with unpaid fees and amounts owed" },
    { id: "compliance", name: "Payment Compliance Report", description: "Compliance rates — cleared, partial, unpaid across all programs" },
  ];

  return (
    <DashboardLayout>
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold font-display text-foreground">Export Financial Reports</h1>
            <p className="text-muted-foreground mt-1">Generate and download financial reports from live database records</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-3 mt-4">
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Academic Year</label>
            <select value={filterYear} onChange={(e) => setFilterYear(e.target.value)} className="px-3 py-2 rounded-lg border border-input bg-card text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring">
              <option value="all">All Years</option>
              {allYears.map((y) => <option key={y} value={y}>{y}</option>)}
              {academicYearOptions.filter((y) => !allYears.includes(y)).map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Semester</label>
            <select value={filterSemester} onChange={(e) => setFilterSemester(e.target.value)} className="px-3 py-2 rounded-lg border border-input bg-card text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring">
              <option value="all">All Semesters</option>
              {allSemesters.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Programme</label>
            <select value={filterProgram} onChange={(e) => setFilterProgram(e.target.value)} className="px-3 py-2 rounded-lg border border-input bg-card text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring">
              <option value="all">All Programmes</option>
              {allPrograms.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div className="flex items-end">
            <button
              onClick={() => { setFilterYear("all"); setFilterSemester("all"); setFilterProgram("all"); }}
              className="px-3 py-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Clear filters
            </button>
          </div>
        </div>
        {filterYear !== "all" || filterSemester !== "all" || filterProgram !== "all" ? (
          <p className="text-xs text-muted-foreground mt-2">
            Showing {filteredFees.length} of {fees.length} records
          </p>
        ) : null}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground text-sm">
          <Loader2 size={18} className="animate-spin mr-2" /> Loading fee records...
        </div>
      ) : fees.length === 0 ? (
        <div className="bg-card rounded-xl border border-border p-8 text-center">
          <FileText size={36} className="mx-auto text-muted-foreground mb-3" />
          <p className="text-sm text-muted-foreground mb-1">No fee records available.</p>
          <p className="text-xs text-muted-foreground">Upload fee data from the Students Fees page to generate reports.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {reports.map((r) => (
            <div key={r.id} className="bg-card rounded-xl border border-border p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start sm:items-center gap-4">
                <div className="w-10 h-10 shrink-0 rounded-lg bg-muted flex items-center justify-center">
                  <FileText size={20} className="text-muted-foreground" />
                </div>
                <div>
                  <h3 className="font-medium text-foreground">{r.name}</h3>
                  <p className="text-sm text-muted-foreground">{r.description}</p>
                </div>
              </div>
              <div className="flex gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => handleExport(r.id, "csv")}
                  disabled={filteredFees.length === 0}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-border text-sm font-medium text-foreground hover:bg-muted transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Download size={14} /> CSV
                </button>
                <button
                  type="button"
                  onClick={() => handleExport(r.id, "pdf")}
                  disabled={filteredFees.length === 0}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg gradient-gold text-secondary-foreground font-medium hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Download size={14} /> PDF
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </DashboardLayout>
  );
};

export default ExportReports;
