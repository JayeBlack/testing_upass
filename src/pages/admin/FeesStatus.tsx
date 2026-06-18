import DashboardLayout from "@/components/DashboardLayout";
import { CheckCircle, XCircle, Search, Filter, Upload, Loader2 } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useAdminDepartment } from "@/hooks/use-admin-department";
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

const currentYear = new Date().getFullYear();
const academicYearOptions = [
  `${currentYear - 1}/${currentYear}`,
  `${currentYear}/${currentYear + 1}`,
  `${currentYear + 1}/${currentYear + 2}`,
];

const FeesStatus = () => {
  const { user } = useAuth();
  const { isSuperAdmin, adminDepartment } = useAdminDepartment();
  const isAccountant = user?.role === "Accountant";
  const isAccountingAssistant = user?.role === "AccountingAssistant";
  const isRegistrar = user?.role === "Registrar";
  const isAdminAssistant = user?.role === "AdminAssistant";
  const isViewOnlyUser = isRegistrar || isAdminAssistant || user?.role === "Dean" || user?.role === "ViceDean" || user?.role === "ExamsOfficer" || user?.role === "Admin";
  const canModifyFees = isAccountant || isAccountingAssistant;
  const [records, setRecords] = useState<FeeRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "cleared" | "owing">("all");
  const [deptFilter, setDeptFilter] = useState<string>("all");
  const [progFilter, setProgFilter] = useState<string>("all");
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [importSemester, setImportSemester] = useState("Semester 1");
  const [importAcademicYear, setImportAcademicYear] = useState(academicYearOptions[1]);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadFees();
    // Auto-refresh every 15 seconds for real-time updates
    const interval = setInterval(loadFees, 15000);
    return () => clearInterval(interval);
  }, []);

  const loadFees = async () => {
    setLoading(true);
    try {
      console.log(`[FeesStatus] ${user?.role} fetching fees from /api/fees...`);
      const data = await apiFetch<FeeRecord[]>("/fees");
      console.log(`[FeesStatus] ${user?.role} received ${data?.length || 0} records`);
      setRecords(data || []);
    } catch (err: any) {
      console.error(`[FeesStatus] ${user?.role} error:`, err);
      toast({ 
        title: "Failed to load fees", 
        description: err.message || "Check console for details", 
        variant: "destructive" 
      });
    } finally {
      setLoading(false);
    }
  };

  const handleToggleClearance = async (feeId: string) => {
    try {
      await apiFetch(`/fees/${feeId}/clearance`, { method: "PUT" });
      toast({ title: "Clearance toggled" });
      loadFees();
    } catch (err: any) {
      toast({ title: "Failed", description: err.message, variant: "destructive" });
    }
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      // Step 1: Parse the file
      const parsed = await apiFetch<{ rows: any[] }>("/fees/parse-bulk", {
        method: "POST",
        body: formData,
        headers: {}, // Let browser set Content-Type with boundary
      });

      if (parsed.rows.length === 0) {
        toast({ title: "No records", description: "Could not parse any records", variant: "destructive" });
        setUploading(false);
        e.target.value = "";
        return;
      }

      // Step 2: Attach academic year and semester from dropdowns
      const feesWithMeta = parsed.rows.map((r: any) => ({
        ...r,
        academic_year: importAcademicYear,
        semester: importSemester,
      }));

      // Step 3: Directly import without preview
      const result = await apiFetch<{ created: any[]; errors?: string[] }>("/fees/upload-bulk", {
        method: "POST",
        body: JSON.stringify({ fees: feesWithMeta }),
      });

      if (result.errors && result.errors.length > 0) {
        toast({
          title: "Import completed with errors",
          description: `${result.created.length} records imported, ${result.errors.length} errors.`,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Import complete",
          description: `${result.created.length} fee records imported successfully`,
        });
      }

      setShowImport(false);
      loadFees();
    } catch (err: any) {
      console.error("Import error:", err);
      toast({ title: "Import failed", description: err.message, variant: "destructive" });
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const filtered = records.filter((f) => {
    const fullName = `${f.first_name} ${f.last_name}`;
    const matchesSearch = fullName.toLowerCase().includes(search.toLowerCase()) || f.index_number.includes(search);
    const matchesStatus = statusFilter === "all" || (statusFilter === "cleared" ? f.is_cleared : !f.is_cleared);
    const effectiveDept = isSuperAdmin ? deptFilter : (adminDepartment || "all");
    const matchesDept = effectiveDept === "all" || f.department_name === effectiveDept;
    const matchesProg = progFilter === "all" || f.program_name === progFilter;
    return matchesSearch && matchesStatus && matchesDept && matchesProg;
  });

  const allDepts = [...new Set(records.map((f) => f.department_name).filter(Boolean))];
  const allProgs = [...new Set(records.map((f) => f.program_name).filter(Boolean))];
  const deptRecords = adminDepartment ? records.filter((f) => f.department_name === adminDepartment) : records;
  const totalCleared = deptRecords.filter((f) => f.is_cleared).length;
  const totalOwing = deptRecords.filter((f) => !f.is_cleared).length;
  const totalOutstanding = deptRecords.reduce((s, f) => s + (Number(f.total_amount) - Number(f.amount_paid)), 0);

  return (
    <DashboardLayout>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold font-display text-foreground">Students Fees</h1>
          <p className="text-muted-foreground mt-1">
            {isViewOnlyUser 
              ? "View-only access to financial records" 
              : isSuperAdmin 
              ? "Financial clearance for postgraduate students" 
              : `${adminDepartment} — Financial clearance`}
          </p>
        </div>
        {canModifyFees && (
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
            <p className="text-sm text-muted-foreground mb-4">Upload a CSV or Excel file containing the list of students who made bank payments at their departments. The system will read and import the payments directly.</p>
            <p className="text-xs text-muted-foreground mb-3">Expected columns: Student Name, Index Number, Department, Programme, Total Fees, Amount Paid</p>

            {/* Semester & Academic Year selectors */}
            <div className="flex gap-3 mb-4">
              <div className="flex-1">
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Semester</label>
                <select value={importSemester} onChange={(e) => setImportSemester(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                  <option>Semester 1</option>
                  <option>Semester 2</option>
                </select>
              </div>
              <div className="flex-1">
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Academic Year</label>
                <select value={importAcademicYear} onChange={(e) => setImportAcademicYear(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                  {academicYearOptions.map((y) => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
            </div>

            <input ref={fileRef} type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={handleImportFile} disabled={uploading} />
            <div
              onClick={() => !uploading && fileRef.current?.click()}
              className="border-2 border-dashed border-border rounded-xl p-8 text-center cursor-pointer hover:border-secondary/50 transition-colors"
            >
              <Upload size={28} className="mx-auto text-muted-foreground mb-2" />
              <p className="text-sm text-foreground font-medium">{uploading ? "Processing..." : "Click to upload CSV or Excel file"}</p>
              <p className="text-xs text-muted-foreground mt-1">Accepted: .csv, .xlsx, .xls</p>
            </div>
            {uploading && (
              <div className="flex items-center justify-center gap-2 mt-4 text-sm text-muted-foreground">
                <Loader2 size={16} className="animate-spin" /> Parsing and importing records...
              </div>
            )}
            <button onClick={() => setShowImport(false)} className="w-full mt-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors">Cancel</button>
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

      <p className="text-sm text-muted-foreground mb-4">
        Showing {filtered.length} of {records.length} students
        {isViewOnlyUser && <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-muted">View Only</span>}
      </p>

      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="overflow-x-auto">
          {loading ? (
            <div className="flex items-center justify-center py-16 text-muted-foreground text-sm">
              <Loader2 size={18} className="animate-spin mr-2" /> Loading financial records...
            </div>
          ) : (
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
                <tr key={f.id} className="border-b border-border last:border-0 hover:bg-muted/50 transition-colors">
                  <td className="px-6 py-4 text-sm font-medium text-foreground">{f.first_name} {f.last_name}</td>
                  <td className="px-6 py-4 text-sm font-mono text-muted-foreground">{f.index_number}</td>
                  <td className="px-6 py-4 text-sm text-muted-foreground">{f.program_name}</td>
                  <td className="px-6 py-4 text-sm text-muted-foreground">{f.department_name}</td>
                  <td className="px-6 py-4 text-sm text-right text-muted-foreground">GHS {Number(f.total_amount).toLocaleString()}</td>
                  <td className="px-6 py-4 text-sm text-right text-muted-foreground">GHS {Number(f.amount_paid).toLocaleString()}</td>
                  <td className="px-6 py-4 text-sm text-right font-semibold text-foreground">
                    {(Number(f.total_amount) - Number(f.amount_paid)) > 0 ? (
                      <span className="text-destructive">GHS {(Number(f.total_amount) - Number(f.amount_paid)).toLocaleString()}</span>
                    ) : (
                      <span className="text-success">GHS 0</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${f.is_cleared ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"}`}>
                      {f.is_cleared ? "Cleared" : "Owing"}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    {canModifyFees ? (
                      <button onClick={() => handleToggleClearance(f.id)} className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${f.is_cleared ? "border border-border text-muted-foreground hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30" : "gradient-gold text-secondary-foreground hover:opacity-90"}`}>
                        {f.is_cleared ? "Revoke" : "Clear"}
                      </button>
                    ) : (
                      <span className="text-xs text-muted-foreground px-2">Read only</span>
                    )}
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && !loading && (
                <tr>
                  <td colSpan={9} className="px-6 py-12 text-center text-sm text-muted-foreground">
                    {records.length === 0 ? "No fee records available" : "No students match the selected filters"}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default FeesStatus;