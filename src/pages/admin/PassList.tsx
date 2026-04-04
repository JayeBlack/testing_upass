import DashboardLayout from "@/components/DashboardLayout";
import { Download } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

interface Graduand {
  name: string;
  index: string;
  program: string;
  department: string;
  cwa: number;
  year: string;
  status: string;
}

const graduands: Graduand[] = [
  { name: "Akua Mensah", index: "UMaT/PG/0112/21", program: "MSc. IT", department: "Computer Science", cwa: 72.5, year: "2025", status: "Eligible" },
  { name: "Kofi Darko", index: "UMaT/PG/0089/21", program: "MPhil CS", department: "Computer Science", cwa: 78.4, year: "2025", status: "Eligible" },
  { name: "Esi Appiah", index: "UMaT/PG/0145/21", program: "MSc. Mining Eng", department: "Mining Engineering", cwa: 68.3, year: "2025", status: "Eligible" },
  { name: "Yaw Frimpong", index: "UMaT/PG/0178/21", program: "MSc. IT", department: "Computer Science", cwa: 48.9, year: "2025", status: "Ineligible" },
  { name: "Abena Kyei", index: "UMaT/PG/0201/21", program: "MPhil CS", department: "Computer Science", cwa: 74.1, year: "2025", status: "Eligible" },
  { name: "Nana Agyei", index: "UMaT/PG/0420/23", program: "MSc. Mechanical Eng", department: "Mechanical Engineering", cwa: 71.2, year: "2024", status: "Eligible" },
  { name: "Ama Boateng", index: "UMaT/PG/0333/22", program: "MSc. Electrical Eng", department: "Electrical Engineering", cwa: 65.8, year: "2024", status: "Eligible" },
];

const departments = [...new Set(graduands.map((g) => g.department))];
const programs = [...new Set(graduands.map((g) => g.program))];
const years = [...new Set(graduands.map((g) => g.year))].sort().reverse();

const PassList = () => {
  const [deptFilter, setDeptFilter] = useState<string>("all");
  const [progFilter, setProgFilter] = useState<string>("all");
  const [yearFilter, setYearFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const { toast } = useToast();

  const filtered = graduands.filter((g) => {
    const matchesDept = deptFilter === "all" || g.department === deptFilter;
    const matchesProg = progFilter === "all" || g.program === progFilter;
    const matchesYear = yearFilter === "all" || g.year === yearFilter;
    const matchesStatus = statusFilter === "all" || g.status === statusFilter;
    return matchesDept && matchesProg && matchesYear && matchesStatus;
  });

  const handleExportCSV = () => {
    const csvContent = [
      "Name,Index Number,Programme,Department,CWA,Eligibility",
      ...filtered.map((g) => `${g.name},${g.index},${g.program},${g.department},${g.cwa.toFixed(1)},${g.status}`),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `UMaT_Pass_List${yearFilter !== "all" ? `_${yearFilter}` : ""}${deptFilter !== "all" ? `_${deptFilter.replace(/\s+/g, "_")}` : ""}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "CSV exported", description: "Pass list has been downloaded" });
  };

  return (
    <DashboardLayout>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold font-display text-foreground">Pass List</h1>
          <p className="text-muted-foreground mt-1">Graduands eligible for convocation</p>
        </div>
        <button onClick={handleExportCSV} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg gradient-gold text-secondary-foreground font-medium text-sm hover:opacity-90 transition-opacity">
          <Download size={14} /> Export CSV
        </button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <select value={yearFilter} onChange={(e) => setYearFilter(e.target.value)} className="px-4 py-3 rounded-lg border border-input bg-card text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring">
          <option value="all">All Years</option>
          {years.map((y) => <option key={y} value={y}>{y}</option>)}
        </select>
        <select value={deptFilter} onChange={(e) => setDeptFilter(e.target.value)} className="px-4 py-3 rounded-lg border border-input bg-card text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring">
          <option value="all">All Departments</option>
          {departments.map((d) => <option key={d} value={d}>{d}</option>)}
        </select>
        <select value={progFilter} onChange={(e) => setProgFilter(e.target.value)} className="px-4 py-3 rounded-lg border border-input bg-card text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring">
          <option value="all">All Programmes</option>
          {programs.map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="px-4 py-3 rounded-lg border border-input bg-card text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring">
          <option value="all">All Status</option>
          <option value="Eligible">Eligible</option>
          <option value="Ineligible">Ineligible</option>
        </select>
      </div>

      <p className="text-sm text-muted-foreground mb-4">Showing {filtered.length} of {graduands.length} graduands</p>

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
                <th className="text-center px-6 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Eligibility</th>
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
                <tr><td colSpan={6} className="px-6 py-12 text-center text-sm text-muted-foreground">No graduands match the selected filters</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default PassList;
