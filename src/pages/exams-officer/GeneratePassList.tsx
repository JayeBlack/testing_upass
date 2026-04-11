import DashboardLayout from "@/components/DashboardLayout";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { useDataStore } from "@/contexts/DataStoreContext";
import { useAdminDepartment } from "@/hooks/use-admin-department";
import ExportDropdown from "@/components/ExportDropdown";
import { exportData } from "@/lib/exportUtils";

const GeneratePassList = () => {
  const { graduands } = useDataStore();
  const { isSuperAdmin, adminDepartment } = useAdminDepartment();
  const [deptFilter, setDeptFilter] = useState("all");
  const [progFilter, setProgFilter] = useState("all");
  const [yearFilter, setYearFilter] = useState("all");
  const { toast } = useToast();

  const departments = [...new Set(graduands.map((g) => g.department))];
  const programs = [...new Set(graduands.map((g) => g.program))];
  const years = [...new Set(graduands.map((g) => g.year))].sort().reverse();

  const filtered = graduands.filter((g) => {
    const effectiveDept = isSuperAdmin ? deptFilter : (adminDepartment || "all");
    const matchesDept = effectiveDept === "all" || g.department === effectiveDept;
    return matchesDept &&
      (progFilter === "all" || g.program === progFilter) &&
      (yearFilter === "all" || g.year === yearFilter);
  });

  const handleExport = (format: "csv" | "pdf") => {
    const headers = ["Name", "Index Number", "Programme", "Department", "CWA", "Status"];
    const rows = filtered.map((g) => [g.name, g.index, g.program, g.department, g.cwa.toFixed(1), g.status]);
    exportData({
      title: "Pass List — Exams Office",
      subtitle: `Generated on ${new Date().toLocaleDateString()}`,
      headers,
      rows,
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

      <p className="text-sm text-muted-foreground mb-4">Showing {filtered.length} of {graduands.length} students</p>

      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="overflow-x-auto">
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
              {filtered.map((g) => (
                <tr key={g.index} className="border-b border-border last:border-0 hover:bg-muted/50 transition-colors">
                  <td className="px-6 py-4 text-sm font-medium text-foreground">{g.name}</td>
                  <td className="px-6 py-4 text-sm font-mono text-muted-foreground">{g.index}</td>
                  <td className="px-6 py-4 text-sm text-muted-foreground">{g.program}</td>
                  <td className="px-6 py-4 text-sm text-muted-foreground">{g.department}</td>
                  <td className="px-6 py-4 text-sm text-center font-semibold text-foreground">{g.cwa.toFixed(1)}</td>
                  <td className="px-6 py-4 text-center">
                    <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${g.status === "Eligible" ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"}`}>{g.status}</span>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={6} className="px-6 py-12 text-center text-sm text-muted-foreground">No results match the selected filters</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default GeneratePassList;
