import DashboardLayout from "@/components/DashboardLayout";
import { CheckCircle, XCircle, Search, Filter, Upload } from "lucide-react";
import { useState, useRef } from "react";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useAdminDepartment } from "@/hooks/use-admin-department";
import { readSheetFile, SHEET_ACCEPT } from "@/lib/sheet-import";

interface FeeRecord {
  name: string;
  index: string;
  department: string;
  program: string;
  totalFees: number;
  amountPaid: number;
  outstanding: number;
  cleared: boolean;
}

const initialRecords: FeeRecord[] = [
  { name: "Kwame Mensah", index: "UMaT/PG/0234/22", department: "Computer Science", program: "MSc. IT", totalFees: 5200, amountPaid: 5200, outstanding: 0, cleared: true },
  { name: "Ama Serwaa", index: "UMaT/PG/0198/22", department: "Computer Science", program: "MSc. IT", totalFees: 5200, amountPaid: 5200, outstanding: 0, cleared: true },
  { name: "Yaw Boateng", index: "UMaT/PG/0312/22", department: "Computer Science", program: "MPhil CS", totalFees: 5200, amountPaid: 3400, outstanding: 1800, cleared: false },
  { name: "Efua Dankwah", index: "UMaT/PG/0287/22", department: "Computer Science", program: "MSc. IT", totalFees: 5200, amountPaid: 5200, outstanding: 0, cleared: true },
  { name: "Kofi Adjei", index: "UMaT/PG/0345/22", department: "Computer Science", program: "MPhil CS", totalFees: 5200, amountPaid: 2600, outstanding: 2600, cleared: false },
  { name: "Abena Owusu", index: "UMaT/PG/0401/23", department: "Mining Engineering", program: "MSc. Mining Eng", totalFees: 6000, amountPaid: 6000, outstanding: 0, cleared: true },
  { name: "Yaw Frimpong", index: "UMaT/PG/0178/21", department: "Mining Engineering", program: "MSc. Mining Eng", totalFees: 6000, amountPaid: 4500, outstanding: 1500, cleared: false },
  { name: "Esi Appiah", index: "UMaT/PG/0145/21", department: "Electrical Engineering", program: "MSc. Electrical Eng", totalFees: 5500, amountPaid: 5500, outstanding: 0, cleared: true },
  { name: "Akua Mensah", index: "UMaT/PG/0112/21", department: "Electrical Engineering", program: "MSc. Electrical Eng", totalFees: 5500, amountPaid: 3000, outstanding: 2500, cleared: false },
  { name: "Nana Agyei", index: "UMaT/PG/0420/23", department: "Mechanical Engineering", program: "MSc. Mechanical Eng", totalFees: 5800, amountPaid: 5800, outstanding: 0, cleared: true },
];

const departments = [...new Set(initialRecords.map((f) => f.department))];
const programs = [...new Set(initialRecords.map((f) => f.program))];

const FeesStatus = () => {
  const { user } = useAuth();
  const { isSuperAdmin, adminDepartment } = useAdminDepartment();
  const isAccountant = user?.role === "Accountant";
  const [records, setRecords] = useState<FeeRecord[]>(initialRecords);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "cleared" | "owing">("all");
  const [deptFilter, setDeptFilter] = useState<string>("all");
  const [progFilter, setProgFilter] = useState<string>("all");
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [importPreview, setImportPreview] = useState<FeeRecord[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleToggleClearance = (index: string) => {
    setRecords((prev) =>
      prev.map((r) => {
        if (r.index !== index) return r;
        const newCleared = !r.cleared;
        toast({
          title: newCleared ? "Student Cleared" : "Clearance Revoked",
          description: `${r.name} (${r.index}) has been ${newCleared ? "cleared" : "revoked"}.`,
        });
        return { ...r, cleared: newCleared };
      })
    );
  };

  const parsePaymentRows = (rows: string[][]): FeeRecord[] => {
    if (rows.length < 2) return [];
    const headers = rows[0].map((h) => h.trim().toLowerCase().replace(/"/g, ""));
    const nameIdx = headers.findIndex((h) => h.includes("name") || h.includes("student"));
    const indexIdx = headers.findIndex((h) => h.includes("index") || h.includes("id") || h.includes("number"));
    const deptIdx = headers.findIndex((h) => h.includes("department") || h.includes("dept"));
    const progIdx = headers.findIndex((h) => h.includes("programme") || h.includes("program"));
    const totalIdx = headers.findIndex((h) => h.includes("total") || h.includes("fee"));
    const paidIdx = headers.findIndex((h) => h.includes("paid") || h.includes("amount"));

    return rows.slice(1).filter((r) => r.some((c) => c !== "")).map((cols) => {
      const totalFees = parseFloat(cols[totalIdx >= 0 ? totalIdx : 4] || "0") || 0;
      const amountPaid = parseFloat(cols[paidIdx >= 0 ? paidIdx : 5] || "0") || 0;
      return {
        name: cols[nameIdx >= 0 ? nameIdx : 0] || "",
        index: cols[indexIdx >= 0 ? indexIdx : 1] || "",
        department: cols[deptIdx >= 0 ? deptIdx : 2] || "",
        program: cols[progIdx >= 0 ? progIdx : 3] || "",
        totalFees,
        amountPaid,
        outstanding: Math.max(0, totalFees - amountPaid),
        cleared: amountPaid >= totalFees,
      };
    }).filter((r) => r.name && r.index);
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const rows = await readSheetFile(file);
      const parsed = parsePaymentRows(rows);
      if (parsed.length === 0) {
        toast({ title: "Import failed", description: "Could not parse records. Ensure columns include Name, Index Number, Department, Programme, Total Fees, Amount Paid.", variant: "destructive" });
        e.target.value = "";
        return;
      }
      setImportPreview(parsed);
      setShowImport(false);
      toast({ title: "File parsed", description: `${parsed.length} payment records ready to import` });
    } catch (err) {
      toast({ title: "Invalid file", description: (err as Error).message, variant: "destructive" });
    }
    e.target.value = "";
  };

  const confirmImport = () => {
    setRecords((prev) => {
      const existingIndexes = new Set(prev.map((r) => r.index));
      const newRecords = importPreview.filter((r) => !existingIndexes.has(r.index));
      const updatedRecords = prev.map((existing) => {
        const update = importPreview.find((r) => r.index === existing.index);
        if (!update) return existing;
        const newPaid = existing.amountPaid + update.amountPaid;
        return {
          ...existing,
          amountPaid: newPaid,
          outstanding: Math.max(0, existing.totalFees - newPaid),
          cleared: newPaid >= existing.totalFees,
        };
      });
      return [...updatedRecords, ...newRecords];
    });
    toast({ title: "Payments imported", description: `${importPreview.length} records processed and added to the system` });
    setImportPreview([]);
  };

  const filtered = records.filter((f) => {
    const matchesSearch = f.name.toLowerCase().includes(search.toLowerCase()) || f.index.includes(search);
    const matchesStatus = statusFilter === "all" || (statusFilter === "cleared" ? f.cleared : !f.cleared);
    const effectiveDept = isSuperAdmin ? deptFilter : (adminDepartment || "all");
    const matchesDept = effectiveDept === "all" || f.department === effectiveDept;
    const matchesProg = progFilter === "all" || f.program === progFilter;
    return matchesSearch && matchesStatus && matchesDept && matchesProg;
  });

  const allDepts = [...new Set(records.map((f) => f.department))];
  const allProgs = [...new Set(records.map((f) => f.program))];
  const deptRecords = adminDepartment ? records.filter((f) => f.department === adminDepartment) : records;
  const totalCleared = deptRecords.filter((f) => f.cleared).length;
  const totalOwing = deptRecords.filter((f) => !f.cleared).length;
  const totalOutstanding = deptRecords.reduce((s, f) => s + f.outstanding, 0);

  return (
    <DashboardLayout>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold font-display text-foreground">Students Fees</h1>
          <p className="text-muted-foreground mt-1">
            {isSuperAdmin ? "Financial clearance for postgraduate students" : `${adminDepartment} — Financial clearance`}
          </p>
        </div>
        {isAccountant && (
          <button
            onClick={() => setShowImport(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-border text-sm font-medium text-foreground hover:bg-muted transition-colors"
          >
            <Upload size={14} /> Import Manual Payments
          </button>
        )}
      </div>

      {/* Import Modal */}
      {showImport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/30 backdrop-blur-sm p-4" onClick={() => setShowImport(false)}>
          <div className="bg-card rounded-2xl border border-border p-6 max-w-md w-full shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-display text-lg font-bold text-foreground mb-2">Import Manual Payments</h3>
            <p className="text-sm text-muted-foreground mb-4">Upload a CSV or Excel file containing the list of students who made payments manually at their respective departments. The system will read the file and add payments to the history by department.</p>
            <p className="text-xs text-muted-foreground mb-3">Expected columns: Student Name, Index Number, Department, Programme, Total Fees, Amount Paid</p>
            <input ref={fileRef} type="file" accept={SHEET_ACCEPT} className="hidden" onChange={handleImportFile} />
            <div
              onClick={() => fileRef.current?.click()}
              className="border-2 border-dashed border-border rounded-xl p-8 text-center cursor-pointer hover:border-secondary/50 transition-colors"
            >
              <Upload size={28} className="mx-auto text-muted-foreground mb-2" />
              <p className="text-sm text-foreground font-medium">Click to upload CSV or Excel file</p>
              <p className="text-xs text-muted-foreground mt-1">Accepted: .csv, .xlsx, .xls</p>
            </div>
            <button onClick={() => setShowImport(false)} className="w-full mt-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors">Cancel</button>
          </div>
        </div>
      )}

      {/* Import Preview */}
      {importPreview.length > 0 && (
        <div className="bg-card rounded-xl border border-border p-5 mb-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-display text-sm font-bold text-foreground">Payment Import Preview ({importPreview.length} records)</h3>
            <div className="flex gap-2">
              <button onClick={() => setImportPreview([])} className="px-3 py-1.5 text-xs border border-border rounded-lg text-muted-foreground hover:text-foreground transition-colors">Discard</button>
              <button onClick={confirmImport} className="px-4 py-1.5 text-xs rounded-lg gradient-gold text-secondary-foreground font-medium hover:opacity-90 transition-opacity">Confirm Import</button>
            </div>
          </div>
          <div className="overflow-x-auto max-h-60 overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-card">
                <tr className="border-b border-border">
                  <th className="text-left px-3 py-2 text-xs font-semibold text-muted-foreground">Name</th>
                  <th className="text-left px-3 py-2 text-xs font-semibold text-muted-foreground">Index</th>
                  <th className="text-left px-3 py-2 text-xs font-semibold text-muted-foreground">Department</th>
                  <th className="text-left px-3 py-2 text-xs font-semibold text-muted-foreground">Programme</th>
                  <th className="text-right px-3 py-2 text-xs font-semibold text-muted-foreground">Paid (GHS)</th>
                </tr>
              </thead>
              <tbody>
                {importPreview.map((r, i) => (
                  <tr key={i} className="border-b border-border last:border-0">
                    <td className="px-3 py-2 text-foreground">{r.name}</td>
                    <td className="px-3 py-2 font-mono text-muted-foreground">{r.index}</td>
                    <td className="px-3 py-2 text-muted-foreground">{r.department}</td>
                    <td className="px-3 py-2 text-muted-foreground">{r.program}</td>
                    <td className="px-3 py-2 text-right text-foreground">{r.amountPaid.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-6">
        <div className="bg-card rounded-xl border border-border px-5 py-4 flex items-center gap-3">
          <CheckCircle size={20} className="text-success" />
          <div>
            <p className="text-xl font-bold font-display text-foreground">{totalCleared}</p>
            <p className="text-xs text-muted-foreground">Cleared</p>
          </div>
        </div>
        <div className="bg-card rounded-xl border border-border px-5 py-4 flex items-center gap-3">
          <XCircle size={20} className="text-destructive" />
          <div>
            <p className="text-xl font-bold font-display text-foreground">{totalOwing}</p>
            <p className="text-xs text-muted-foreground">Outstanding</p>
          </div>
        </div>
        <div className="bg-card rounded-xl border border-border px-5 py-4 flex items-center gap-3">
          <Filter size={20} className="text-warning" />
          <div>
            <p className="text-xl font-bold font-display text-foreground">GHS {totalOutstanding.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">Total Owed</p>
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name or index..." className="w-full pl-11 pr-4 py-3 rounded-lg border border-input bg-card text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
        </div>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as any)} className="px-4 py-3 rounded-lg border border-input bg-card text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring">
          <option value="all">All Statuses</option>
          <option value="cleared">Cleared Only</option>
          <option value="owing">Owing Only</option>
        </select>
        <button onClick={() => setShowFilterPanel(!showFilterPanel)} className="px-4 py-3 rounded-lg border border-input bg-card text-foreground text-sm hover:bg-muted transition-colors flex items-center gap-2">
          <Filter size={14} /> Filters {(deptFilter !== "all" || progFilter !== "all") && <span className="w-2 h-2 rounded-full bg-primary" />}
        </button>
      </div>

      {showFilterPanel && (
        <div className="bg-card rounded-xl border border-border p-5 mb-4">
          <h3 className="text-sm font-semibold text-foreground mb-3">Filter by {isSuperAdmin ? "Department & " : ""}Programme</h3>
          <div className={`grid grid-cols-1 ${isSuperAdmin ? "sm:grid-cols-2" : ""} gap-4`}>
            {isSuperAdmin && (
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-2 block">Departments</label>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
                    <input type="checkbox" checked={deptFilter === "all"} onChange={() => setDeptFilter("all")} className="rounded border-input" />
                    All Departments
                  </label>
                  {allDepts.map((d) => (
                    <label key={d} className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
                      <input type="checkbox" checked={deptFilter === d} onChange={() => setDeptFilter(deptFilter === d ? "all" : d)} className="rounded border-input" />
                      {d}
                    </label>
                  ))}
                </div>
              </div>
            )}
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-2 block">Programmes</label>
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
                  <input type="checkbox" checked={progFilter === "all"} onChange={() => setProgFilter("all")} className="rounded border-input" />
                  All Programmes
                </label>
                {allProgs.map((p) => (
                  <label key={p} className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
                    <input type="checkbox" checked={progFilter === p} onChange={() => setProgFilter(progFilter === p ? "all" : p)} className="rounded border-input" />
                    {p}
                  </label>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      <p className="text-sm text-muted-foreground mb-4">Showing {filtered.length} of {records.length} students</p>

      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left px-6 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Student</th>
                <th className="text-left px-6 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Index</th>
                <th className="text-left px-6 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Programme</th>
                <th className="text-left px-6 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Department</th>
                <th className="text-right px-6 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total Fees</th>
                <th className="text-right px-6 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Paid</th>
                <th className="text-right px-6 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Outstanding</th>
                <th className="text-center px-6 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
                <th className="text-right px-6 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((f) => (
                <tr key={f.index} className="border-b border-border last:border-0 hover:bg-muted/50 transition-colors">
                  <td className="px-6 py-4 text-sm font-medium text-foreground">{f.name}</td>
                  <td className="px-6 py-4 text-sm font-mono text-muted-foreground">{f.index}</td>
                  <td className="px-6 py-4 text-sm text-muted-foreground">{f.program}</td>
                  <td className="px-6 py-4 text-sm text-muted-foreground">{f.department}</td>
                  <td className="px-6 py-4 text-sm text-right text-muted-foreground">GHS {f.totalFees.toLocaleString()}</td>
                  <td className="px-6 py-4 text-sm text-right text-muted-foreground">GHS {f.amountPaid.toLocaleString()}</td>
                  <td className="px-6 py-4 text-sm text-right font-semibold text-foreground">
                    {f.outstanding > 0 ? (
                      <span className="text-destructive">GHS {f.outstanding.toLocaleString()}</span>
                    ) : (
                      <span className="text-success">GHS 0</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${f.cleared ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"}`}>
                      {f.cleared ? "Cleared" : "Owing"}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button onClick={() => handleToggleClearance(f.index)} className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${f.cleared ? "border border-border text-muted-foreground hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30" : "gradient-gold text-secondary-foreground hover:opacity-90"}`}>
                      {f.cleared ? "Revoke" : "Clear"}
                    </button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-6 py-12 text-center text-sm text-muted-foreground">No students match the selected filters</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default FeesStatus;
