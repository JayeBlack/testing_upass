import DashboardLayout from "@/components/DashboardLayout";
import { Clock, Filter, Users, Shield, BookOpen, Banknote, FileText } from "lucide-react";
import { useState } from "react";

interface LogEntry {
  id: string;
  timestamp: string;
  user: string;
  role: string;
  action: string;
  category: string;
  details: string;
}

const mockLogs: LogEntry[] = [
  { id: "l1", timestamp: "2026-04-04 14:32:10", user: "Prof. Kofi Asante", role: "Admin", action: "Enrolled Student", category: "Students", details: "Enrolled Kwame Mensah (UMaT/PG/0500/26) into MSc. IT" },
  { id: "l2", timestamp: "2026-04-04 13:15:45", user: "Mr. Yaw Darko", role: "Accountant", action: "Cleared Student", category: "Fees", details: "Financial clearance granted for Ama Serwaa (UMaT/PG/0198/22)" },
  { id: "l3", timestamp: "2026-04-04 11:20:33", user: "Mrs. Akosua Mensah", role: "ExamsOfficer", action: "Published Results", category: "Results", details: "Semester 1 results published for MSc. IT (28 students)" },
  { id: "l4", timestamp: "2026-04-03 16:45:22", user: "Prof. Ama Boateng", role: "Dean", action: "Approved Clearance", category: "Clearance", details: "Graduation clearance approved for Kofi Darko (UMaT/PG/0089/21)" },
  { id: "l5", timestamp: "2026-04-03 14:10:18", user: "Mrs. Akosua Mensah", role: "ExamsOfficer", action: "Uploaded Grades", category: "Results", details: "CSV grade upload for Mining Engineering (15 students)" },
  { id: "l6", timestamp: "2026-04-03 10:30:05", user: "Prof. Kofi Asante", role: "Admin", action: "Deleted Student", category: "Students", details: "Removed Yaw Frimpong (UMaT/PG/0178/21) from the system" },
  { id: "l7", timestamp: "2026-04-02 15:20:40", user: "Mr. Yaw Darko", role: "Accountant", action: "Revoked Clearance", category: "Fees", details: "Financial clearance revoked for Kofi Adjei (UMaT/PG/0345/22)" },
  { id: "l8", timestamp: "2026-04-02 09:55:12", user: "Mrs. Akosua Mensah", role: "ExamsOfficer", action: "Generated Pass List", category: "Results", details: "Pass list generated for Computer Science (2025)" },
  { id: "l9", timestamp: "2026-04-01 14:45:30", user: "Prof. Kofi Asante", role: "Admin", action: "Bulk Enrollment", category: "Students", details: "12 students enrolled via Excel upload for Mining Engineering" },
  { id: "l10", timestamp: "2026-04-01 11:30:25", user: "Mr. Yaw Darko", role: "Accountant", action: "Sent Fee Notice", category: "Fees", details: "Fee payment reminder sent to 44 students with outstanding balances" },
  { id: "l11", timestamp: "2026-03-31 16:10:55", user: "Prof. Ama Boateng", role: "Dean", action: "Rejected Clearance", category: "Clearance", details: "Clearance rejected for Efua Dankwah — outstanding fees" },
  { id: "l12", timestamp: "2026-03-31 10:05:42", user: "Mrs. Akosua Mensah", role: "ExamsOfficer", action: "Deleted Results", category: "Results", details: "Deleted published results for MSc. Electrical Eng Semester 2" },
];

const categories = [...new Set(mockLogs.map((l) => l.category))];
const roles = [...new Set(mockLogs.map((l) => l.role))];

const categoryIcons: Record<string, React.ReactNode> = {
  Students: <Users size={14} />,
  Fees: <Banknote size={14} />,
  Results: <BookOpen size={14} />,
  Clearance: <Shield size={14} />,
};

const SystemLog = () => {
  const [catFilter, setCatFilter] = useState("all");
  const [roleFilter, setRoleFilter] = useState("all");

  const filtered = mockLogs.filter((l) => {
    return (catFilter === "all" || l.category === catFilter) &&
      (roleFilter === "all" || l.role === roleFilter);
  });

  return (
    <DashboardLayout>
      <div className="mb-8">
        <h1 className="text-3xl font-bold font-display text-foreground">System Log</h1>
        <p className="text-muted-foreground mt-1">Track all activities across the system</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Filter size={16} />
          <span>Filter:</span>
        </div>
        <select value={catFilter} onChange={(e) => setCatFilter(e.target.value)} className="px-4 py-2.5 rounded-lg border border-input bg-card text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring">
          <option value="all">All Categories</option>
          {categories.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} className="px-4 py-2.5 rounded-lg border border-input bg-card text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring">
          <option value="all">All Roles</option>
          {roles.map((r) => <option key={r} value={r}>{r}</option>)}
        </select>
      </div>

      <p className="text-sm text-muted-foreground mb-4">Showing {filtered.length} of {mockLogs.length} entries</p>

      <div className="space-y-3">
        {filtered.map((log) => (
          <div key={log.id} className="bg-card rounded-xl border border-border p-4 flex items-start gap-4">
            <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center shrink-0 mt-0.5">
              {categoryIcons[log.category] || <FileText size={14} />}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <span className="text-sm font-medium text-foreground">{log.action}</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">{log.category}</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary">{log.role}</span>
              </div>
              <p className="text-sm text-muted-foreground">{log.details}</p>
              <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                <span className="flex items-center gap-1"><Clock size={12} /> {log.timestamp}</span>
                <span>by {log.user}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </DashboardLayout>
  );
};

export default SystemLog;
