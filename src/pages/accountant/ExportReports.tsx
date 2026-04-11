import DashboardLayout from "@/components/DashboardLayout";
import { FileText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import ExportDropdown from "@/components/ExportDropdown";
import { exportData } from "@/lib/exportUtils";

const reports = [
  { id: 1, name: "Fee Collection Summary", description: "Total fees collected by program and semester", period: "2023/2024" },
  { id: 2, name: "Outstanding Balances Report", description: "Students with unpaid fees and amounts owed", period: "2023/2024" },
  { id: 3, name: "Payment Compliance Report", description: "Compliance rates across all programs", period: "2023/2024" },
  { id: 4, name: "Revenue Trend Report", description: "Monthly revenue collection trends", period: "2023/2024" },
  { id: 5, name: "Defaulters List", description: "Complete list of students with outstanding fees", period: "2023/2024" },
];

const reportData: Record<number, { headers: string[]; rows: string[][] }> = {
  1: {
    headers: ["#", "Program", "Semester", "Students", "Amount Collected (GHS)"],
    rows: [
      ["1", "MSc. IT", "First", "45", "675000.00"],
      ["2", "MSc. IT", "Second", "42", "630000.00"],
      ["3", "MPhil CS", "First", "30", "525000.00"],
      ["4", "MPhil CS", "Second", "28", "490000.00"],
      ["5", "MSc. Mining Eng", "First", "38", "608000.00"],
      ["6", "MSc. Mining Eng", "Second", "35", "560000.00"],
    ],
  },
  2: {
    headers: ["#", "Student Name", "Index Number", "Program", "Outstanding (GHS)"],
    rows: [
      ["1", "Yaw Frimpong", "UMaT/PG/0178/21", "MSc. IT", "7500.00"],
      ["2", "Kwesi Mensah", "UMaT/PG/0210/22", "MPhil CS", "12000.00"],
      ["3", "Ama Serwaa", "UMaT/PG/0315/22", "MSc. Mining Eng", "5200.00"],
      ["4", "Kofi Adjei", "UMaT/PG/0198/21", "MSc. IT", "9800.00"],
      ["5", "Efua Donkor", "UMaT/PG/0267/22", "MPhil CS", "3500.00"],
    ],
  },
  3: {
    headers: ["#", "Program", "Total Students", "Paid", "Partial", "Unpaid", "Compliance (%)"],
    rows: [
      ["1", "MSc. IT", "45", "38", "4", "3", "84.4"],
      ["2", "MPhil CS", "30", "27", "2", "1", "90.0"],
      ["3", "MSc. Mining Eng", "38", "33", "3", "2", "86.8"],
      ["4", "MSc. Mechanical Eng", "25", "20", "3", "2", "80.0"],
      ["5", "MSc. Electrical Eng", "28", "24", "2", "2", "85.7"],
    ],
  },
  4: {
    headers: ["#", "Month", "Collections (GHS)", "Cumulative (GHS)"],
    rows: [
      ["1", "September 2023", "450000.00", "450000.00"],
      ["2", "October 2023", "380000.00", "830000.00"],
      ["3", "November 2023", "290000.00", "1120000.00"],
      ["4", "December 2023", "150000.00", "1270000.00"],
      ["5", "January 2024", "520000.00", "1790000.00"],
      ["6", "February 2024", "310000.00", "2100000.00"],
    ],
  },
  5: {
    headers: ["#", "Student Name", "Index Number", "Program", "Amount Owed (GHS)", "Last Payment"],
    rows: [
      ["1", "Yaw Frimpong", "UMaT/PG/0178/21", "MSc. IT", "7500.00", "15/09/2023"],
      ["2", "Kwesi Mensah", "UMaT/PG/0210/22", "MPhil CS", "12000.00", "20/10/2023"],
      ["3", "Ama Serwaa", "UMaT/PG/0315/22", "MSc. Mining Eng", "5200.00", "05/11/2023"],
      ["4", "Kofi Adjei", "UMaT/PG/0198/21", "MSc. IT", "9800.00", "N/A"],
      ["5", "Efua Donkor", "UMaT/PG/0267/22", "MPhil CS", "3500.00", "12/01/2024"],
    ],
  },
};

const ExportReports = () => {
  const { toast } = useToast();

  const handleExport = (report: typeof reports[0], format: "csv" | "pdf") => {
    const data = reportData[report.id];
    exportData({
      title: report.name,
      subtitle: `Academic Year: ${report.period}`,
      headers: data.headers,
      rows: data.rows,
      fileName: `UMaT_${report.name.replace(/\s+/g, "_")}_${report.period.replace("/", "-")}`,
      format,
    });
    toast({ title: "Report Exported", description: `${report.name} downloaded as ${format.toUpperCase()}` });
  };

  return (
    <DashboardLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold font-display text-foreground">Export Financial Reports</h1>
        <p className="text-muted-foreground mt-1">Generate and download financial reports in CSV or PDF format</p>
      </div>

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
                <p className="text-xs text-muted-foreground mt-0.5">Academic Year: {r.period}</p>
              </div>
            </div>
            <ExportDropdown onExport={(format) => handleExport(r, format)} label="Download" compact />
          </div>
        ))}
      </div>
    </DashboardLayout>
  );
};

export default ExportReports;
