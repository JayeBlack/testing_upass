import DashboardLayout from "@/components/DashboardLayout";
import { Search, Trash2, X, Upload, KeyRound, Loader2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { apiFetch, ApiError } from "@/lib/api";

interface Student {
  id: string;
  name: string;
  first_name: string;
  last_name: string;
  index_number: string;
  email: string;
  program_name: string;
  department_name: string;
  status: string;
}

const ManageStudents = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [deptFilter, setDeptFilter] = useState("all");
  const [showEnrollForm, setShowEnrollForm] = useState(false);
  const [showBulkUpload, setShowBulkUpload] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: "", index: "", email: "", program: "", department: "" });

  const load = async () => {
    setLoading(true);
    try {
      const data = await apiFetch<Student[]>("/students");
      setStudents(data || []);
    } catch {
      // backend offline
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const departments = [...new Set(students.map((s) => s.department_name).filter(Boolean))];

  const filtered = students.filter((s) => {
    const name = `${s.first_name || ""} ${s.last_name || ""}`.trim().toLowerCase();
    const matchSearch = name.includes(search.toLowerCase()) || s.index_number.includes(search);
    const matchDept = deptFilter === "all" || s.department_name === deptFilter;
    return matchSearch && matchDept;
  });

  const handleEnroll = async () => {
    if (!form.name || !form.index || !form.email || !form.program || !form.department) {
      toast({ title: "Missing fields", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      await apiFetch("/students/enroll", {
        method: "POST",
        body: JSON.stringify({ 
          name: form.name, 
          email: form.email, 
          index: form.index, 
          program: form.program, 
          department: form.department, 
          admission_year: new Date().getFullYear() 
        }),
      });
      toast({ title: "Student enrolled", description: form.name });
      setForm({ name: "", index: "", email: "", program: "", department: "" });
      setShowEnrollForm(false);
      load();
    } catch (err) {
      toast({ title: "Failed", description: err instanceof ApiError ? err.message : "Error", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleBulkUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const formData = new FormData();
      formData.append("file", file);
      const parseRes = await apiFetch<{ rows: any[] }>("/students/parse-bulk", { method: "POST", body: formData, headers: {} });
      if (!parseRes.rows?.length) { 
        toast({ title: "No valid rows found", variant: "destructive" }); 
        e.target.value = "";
        return; 
      }
      const enrollRes = await apiFetch<{ enrolled: any[]; errors?: string[] }>("/students/enroll-bulk", {
        method: "POST",
        body: JSON.stringify({ 
          students: parseRes.rows.map((r) => ({ 
            ...r, 
            admission_year: new Date().getFullYear() 
          })) 
        }),
      });
      const msg = enrollRes.errors?.length 
        ? `${enrollRes.enrolled.length} enrolled. ${enrollRes.errors.length} errors.`
        : `${enrollRes.enrolled.length} students enrolled`;
      toast({ title: "Bulk enrollment completed", description: msg });
      setShowBulkUpload(false);
      load();
    } catch (err) {
      toast({ title: "Failed", description: err instanceof ApiError ? err.message : "Error", variant: "destructive" });
    }
    e.target.value = "";
  };

  const handleDelete = async (id: string) => {
    try {
      await apiFetch(`/students/${id}`, { method: "DELETE" });
      setStudents((prev) => prev.filter((s) => s.id !== id));
      setDeleteConfirm(null);
      toast({ title: "Student removed" });
    } catch (err) {
      toast({ title: "Failed", description: err instanceof ApiError ? err.message : "Error", variant: "destructive" });
    }
  };

  const handleResetPassword = async (s: Student) => {
    if (!confirm(`Reset ${s.first_name} ${s.last_name}'s password to their index number?`)) return;
    try {
      const res = await apiFetch<{ default_password: string }>("/auth/admin/reset-password", { 
        method: "POST", 
        body: JSON.stringify({ user_id: Number(s.id) }) 
      });
      toast({ title: "Password reset", description: `New password: ${res.default_password}` });
    } catch (err) {
      toast({ title: "Failed", description: err instanceof ApiError ? err.message : "Error", variant: "destructive" });
    }
  };

  return (
    <DashboardLayout>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold font-display text-foreground">Manage Students</h1>
          <p className="text-muted-foreground mt-1">{loading ? "Loading..." : `${students.length} registered postgraduate students`}</p>
        </div>
        <div className="flex gap-3">
          <button onClick={() => setShowBulkUpload(true)} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-border text-sm font-medium text-foreground hover:bg-muted transition-colors">
            <Upload size={14} /> Bulk Upload
          </button>
          <button onClick={() => setShowEnrollForm(true)} className="px-5 py-2.5 rounded-lg gradient-gold text-secondary-foreground font-medium text-sm hover:opacity-90 transition-opacity">
            + Enroll Student
          </button>
        </div>
      </div>

      {showBulkUpload && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/30 backdrop-blur-sm p-4" onClick={() => setShowBulkUpload(false)}>
          <div className="bg-card rounded-2xl border border-border p-6 max-w-md w-full shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display text-lg font-bold text-foreground">Bulk Student Upload</h3>
              <button onClick={() => setShowBulkUpload(false)} className="p-1 rounded hover:bg-muted"><X size={18} className="text-muted-foreground" /></button>
            </div>
            <p className="text-sm text-muted-foreground mb-3">Upload an Excel or CSV file containing student details.</p>
            <p className="text-xs text-muted-foreground mb-4 bg-muted p-3 rounded-lg">Expected columns: Name, Index Number, Email, Programme, Department</p>
            <input ref={fileRef} type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={handleBulkUpload} />
            <div onClick={() => fileRef.current?.click()} className="border-2 border-dashed border-border rounded-xl p-8 text-center cursor-pointer hover:border-secondary/50 transition-colors">
              <Upload size={28} className="mx-auto text-muted-foreground mb-2" />
              <p className="text-sm text-foreground font-medium">Click to upload file</p>
              <p className="text-xs text-muted-foreground mt-1">CSV or Excel (max 10MB)</p>
            </div>
          </div>
        </div>
      )}

      {showEnrollForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/30 backdrop-blur-sm p-4" onClick={() => setShowEnrollForm(false)}>
          <div className="bg-card rounded-2xl border border-border p-6 max-w-lg w-full shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-display text-lg font-bold text-foreground">Enroll New Student</h3>
              <button onClick={() => setShowEnrollForm(false)} className="p-1 rounded hover:bg-muted"><X size={18} className="text-muted-foreground" /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium text-muted-foreground">Full Name *</label>
                <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full mt-1 px-4 py-2.5 rounded-lg border border-input bg-background text-foreground text-sm focus:ring-2 focus:ring-ring outline-none" placeholder="e.g. Kwame Mensah" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Index Number *</label>
                  <input value={form.index} onChange={(e) => setForm({ ...form, index: e.target.value })} className="w-full mt-1 px-4 py-2.5 rounded-lg border border-input bg-background text-foreground text-sm focus:ring-2 focus:ring-ring outline-none" placeholder="UMaT/PG/0234/22" />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Email *</label>
                  <input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} type="email" className="w-full mt-1 px-4 py-2.5 rounded-lg border border-input bg-background text-foreground text-sm focus:ring-2 focus:ring-ring outline-none" placeholder="student@umat.edu.gh" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Programme *</label>
                  <select value={form.program} onChange={(e) => setForm({ ...form, program: e.target.value })} className="w-full mt-1 px-4 py-2.5 rounded-lg border border-input bg-background text-foreground text-sm focus:ring-2 focus:ring-ring outline-none">
                    <option value="">Select programme</option>
                    <option>MSc. Information Technology</option>
                    <option>MPhil Computer Science</option>
                    <option>MSc. Mining Engineering</option>
                    <option>MSc. Electrical Engineering</option>
                    <option>MSc. Mechanical Engineering</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Department *</label>
                  <select value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} className="w-full mt-1 px-4 py-2.5 rounded-lg border border-input bg-background text-foreground text-sm focus:ring-2 focus:ring-ring outline-none">
                    <option value="">Select department</option>
                    <option>Computer Science</option>
                    <option>Mining Engineering</option>
                    <option>Electrical Engineering</option>
                    <option>Mechanical Engineering</option>
                  </select>
                </div>
              </div>
              <Button onClick={handleEnroll} disabled={saving} className="w-full gradient-gold text-secondary-foreground hover:opacity-90">
                {saving ? <Loader2 size={14} className="animate-spin mr-1.5" /> : null}
                Enroll Student
              </Button>
            </div>
          </div>
        </div>
      )}

      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/30 backdrop-blur-sm p-4" onClick={() => setDeleteConfirm(null)}>
          <div className="bg-card rounded-2xl border border-border p-6 max-w-sm w-full shadow-xl text-center" onClick={(e) => e.stopPropagation()}>
            <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4"><Trash2 size={24} className="text-destructive" /></div>
            <h3 className="font-display text-lg font-bold text-foreground mb-2">Delete Student</h3>
            <p className="text-sm text-muted-foreground mb-5">
              Remove <strong>{students.find((s) => s.id === deleteConfirm)?.first_name} {students.find((s) => s.id === deleteConfirm)?.last_name}</strong>? This cannot be undone.
            </p>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setDeleteConfirm(null)}>Cancel</Button>
              <Button variant="destructive" className="flex-1" onClick={() => handleDelete(deleteConfirm)}>Delete</Button>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name or index number..." className="w-full pl-11 pr-4 py-3 rounded-lg border border-input bg-card text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
        </div>
        <select value={deptFilter} onChange={(e) => setDeptFilter(e.target.value)} className="px-4 py-3 rounded-lg border border-input bg-card text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring">
          <option value="all">All Departments</option>
          {departments.map((d) => <option key={d} value={d}>{d}</option>)}
        </select>
      </div>

      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="overflow-x-auto">
          {loading ? (
            <div className="flex items-center justify-center py-16 text-muted-foreground text-sm"><Loader2 size={18} className="animate-spin mr-2" /> Loading students...</div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left px-6 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Name</th>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Index</th>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Programme</th>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Department</th>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
                  <th className="text-right px-6 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((s) => (
                  <tr key={s.id} className="border-b border-border last:border-0 hover:bg-muted/50 transition-colors">
                    <td className="px-6 py-4 text-sm font-medium text-foreground">{s.first_name} {s.last_name}</td>
                    <td className="px-6 py-4 text-sm font-mono text-muted-foreground">{s.index_number}</td>
                    <td className="px-6 py-4 text-sm text-muted-foreground">{s.program_name}</td>
                    <td className="px-6 py-4 text-sm text-muted-foreground">{s.department_name}</td>
                    <td className="px-6 py-4"><span className={`text-xs font-medium px-2.5 py-1 rounded-full ${s.status === "Active" ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"}`}>{s.status}</span></td>
                    <td className="px-6 py-4 text-right">
                      <div className="inline-flex items-center gap-1 justify-end">
                        {user?.isSuperAdmin && (
                          <button onClick={() => handleResetPassword(s)} className="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors" title="Reset password"><KeyRound size={16} /></button>
                        )}
                        <button onClick={() => setDeleteConfirm(s.id)} className="p-2 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"><Trash2 size={16} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && !loading && <tr><td colSpan={6} className="px-6 py-12 text-center text-sm text-muted-foreground">No students found</td></tr>}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default ManageStudents;
