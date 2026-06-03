import DashboardLayout from "@/components/DashboardLayout";
import { FileText, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import ExportDropdown from "@/components/ExportDropdown";
import { exportData } from "@/lib/exportUtils";
import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";

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

const ExportReports = () => {
  const { toast } = useToast();
  const [fees, setFees] = useState<FeeRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch<FeeRecord[]>("/fees")
      .then(setFees)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleExport = (report: string, format: "csv" | "pdf") => {
    if (fees.length === 0) {
      toast({ title: "No data", description: "No fee records to export", variant: "destructive" });
      return;
    }

    let headers: string[] = [];
    let rows: string[][] = [];
    let title = "";

    if (report === "collection") {
      title = "Fee Collection Summary";
      const grouped = fees.reduce((acc, f) => {
        const key = `${f.program_name}|${f.semester}`;
        if (!acc[key]) acc[key] = { program: f.program_name, semester: f.semester, count: 0, collected: 0 };
        acc[key].count++;
        acc[key].collected += f.amount_paid;
        return acc;
      }, {} as Record<string, { program: string; semester: string; count: number; collected: number }>);
      headers = ["#", "Program", "Semester", "Students", "Amount Collected (GHS)"];
      rows = Object.values(grouped).map((g, i) => [
        String(i + 1),
        g.program,
        g.semester,
        String(g.count),
        g.collected.toFixed(2),
      ]);
    } else if (report === "outstanding") {
      title = "Outstanding Balances Report";
      const owing = fees.filter((f) => f.outstanding > 0);
      headers = ["#", "Student Name", "Index Number", "Program", "Outstanding (GHS)"];
      rows = owing.map((f, i) => [
        String(i + 1),
        `${f.first_name} ${f.last_name}`,
        f.index_number,
        f.program_name,
        f.outstanding.toFixed(2),
      ]);
    } else if (report === "compliance") {
      title = "Payment Compliance Report";
      const byProgram = fees.reduce((acc, f) => {
        if (!acc[f.program_name]) acc[f.program_name] = { total: 0, paid: 0 };
        acc[f.program_name].total++;
        if (f.is_cleared) acc[f.program_name].paid++;
        return acc;
      }, {} as Record<string, { total: number; paid: number }>);
      headers = ["#", "Program", "Total Students", "Cleared", "Partial", "Compliance (%)"];
      rows = Object.entries(byProgram).map(([prog, data], i) => [
        String(i + 1),
        prog,
        String(data.total),
        String(data.paid),
        String(data.total - data.paid),
        ((data.paid / data.total) * 100).toFixed(1),
      ]);
    } else if (report === "defaulters") {
      title = "Defaulters List";
      const defaulters = fees.filter((f) => !f.is_cleared);
      headers = ["#", "Student Name", "Index Number", "Program", "Amount Owed (GHS)"];
      rows = defaulters.map((f, i) => [
        String(i + 1),
        `${f.first_name} ${f.last_name}`,
        f.index_number,
        f.program_name,
        f.outstanding.toFixed(2),
      ]);
    }

    exportData({
      title,
      subtitle: `Academic Year: ${new Date().getFullYear()}/${new Date().getFullYear() + 1}`,
      headers,
      rows,
      fileName: `UMaT_${title.replace(/\s+/g, "_")}`,
      format,
    });
    toast({ title: "Report Exported", description: `${title} downloaded as ${format.toUpperCase()}` });
  };

  const reports = [
    { id: "collection", name: "Fee Collection Summary", description: "Total fees collected by program and semester" },
    { id: "outstanding", name: "Outstanding Balances Report", description: "Students with unpaid fees and amounts owed" },
    { id: "compliance", name: "Payment Compliance Report", description: "Compliance rates across all programs" },
    { id: "defaulters", name: "Defaulters List", description: "Complete list of students with outstanding fees" },
  ];

  return (
    <DashboardLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold font-display text-foreground">Export Financial Reports</h1>
        <p className="text-muted-foreground mt-1">Generate and download financial reports from database</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground text-sm">
          <Loader2 size={18} className="animate-spin mr-2" /> Loading fee records...
        </div>
      ) : fees.length === 0 ? (
        <div className="bg-card rounded-xl border border-border p-8 text-center text-muted-foreground text-sm">
          No fee records available. Upload fee data to generate reports.
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
              <ExportDropdown onExport={(format) => handleExport(r.id, format)} label="Download" compact />
            </div>
          ))}
        </div>
      )}
    </DashboardLayout>
  );
};

export default ExportReports;
