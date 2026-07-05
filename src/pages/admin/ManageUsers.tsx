import DashboardLayout from "@/components/DashboardLayout";
import { Navigate } from "react-router-dom";
import { useEffect, useState, useRef } from "react";
import { ShieldCheck, UserPlus, X, Trash2, Search, Power, KeyRound, Loader2, Eye, EyeOff, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { apiFetch, ApiError } from "@/lib/api";

type SystemRole = "Student" | "Supervisor" | "Admin" | "Dean" | "ViceDean" | "Registrar" | "AdminAssistant" | "Accountant" | "AccountingAssistant" | "ExamsOfficer";

interface SystemUser {
  id: string;
  name: string;
  email: string;
  role: SystemRole;
  department?: string;
  phone?: string;
  is_active: boolean;
  is_super_admin?: boolean;
  created_at: string;
}

const ROLES: SystemRole[] = ["Supervisor", "Admin", "Dean", "ViceDean", "Registrar", "AdminAssistant", "Accountant", "AccountingAssistant", "ExamsOfficer"];

const roleColor = (role: string) => {
  if (role === "Admin") return "bg-secondary/15 text-secondary-foreground";
  if (role === "Supervisor") return "bg-primary/10 text-primary";
  return "bg-accent/10 text-accent-foreground";
};

const ManageUsers = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [users, setUsers] = useState<SystemUser[]>([]);
  const [departments, setDepartments] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showBulkUpload, setShowBulkUpload] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [resetPasswordUser, setResetPasswordUser] = useState<SystemUser | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({ name: "", email: "", role: "Supervisor" as SystemRole, department: "", phone: "", staffId: "", title: "Dr.", specialization: "", isSuperAdmin: false });

  if (!user?.isSuperAdmin) return <Navigate to="/dashboard" replace />;

  const load = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const [usersData, deptsData] = await Promise.all([
        apiFetch<SystemUser[]>("/users"),
        apiFetch<{ id: number; name: string }[]>("/departments")
      ]);
      if (usersData) setUsers(usersData);
      if (deptsData) setDepartments(deptsData.map(d => d.name));
    } catch {
      // backend offline — keep existing data
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const filtered = users.filter((u) => {
    const matchSearch = u.name.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase());
    const matchRole = roleFilter === "all" || u.role === roleFilter;
    return matchSearch && matchRole;
  });

  const handleCreate = async () => {
    if (!form.name.trim() || !form.email.trim()) {
      toast({ title: "Missing fields", description: "Name and email are required", variant: "destructive" });
      return;
    }
    
    // DEBUG: Log form state
    console.log('=== FRONTEND CREATE USER DEBUG ===');
    console.log('Form state:', form);
    console.log('Department value:', form.department);
    console.log('Department is empty?', form.department === "");
    
    setSaving(true);
    try {
      const [first_name, ...rest] = form.name.trim().split(/\s+/);
      const last_name = rest.join(" ") || first_name;
      
      const payload: any = { 
        email: form.email.trim().toLowerCase(), 
        first_name, 
        last_name, 
        role: form.role, 
        phone: form.phone || undefined, 
        department: form.department && form.department.trim() !== "" ? form.department : undefined,
        is_super_admin: form.role === "Admin" ? form.isSuperAdmin : false
      };
      
      // Add supervisor-specific fields if creating a supervisor
      if (form.role === "Supervisor") {
        payload.title = form.title;
        payload.staff_id = form.staffId || undefined;
        payload.specialization = form.specialization || undefined;
      }
      
      console.log('Sending payload:', JSON.stringify(payload, null, 2));
      console.log('Department being sent:', payload.department);
      
      const res = await apiFetch<{ user: any; default_password: string }>("/auth/admin/create-staff", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      console.log('User created successfully:', res);
      console.log('=== END FRONTEND DEBUG ===\n');

      toast({ title: "Staff account created", description: `Default password: ${res.default_password}` });
      setForm({ name: "", email: "", role: "Supervisor", department: "", phone: "", staffId: "", title: "Dr.", specialization: "", isSuperAdmin: false });
      setShowForm(false);
      load();
    } catch (err) {
      console.error('Frontend error:', err);
      toast({ title: "Failed", description: err instanceof ApiError ? err.message : "Could not create account", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (u: SystemUser) => {
    try {
      await apiFetch(`/users/${u.id}/toggle`, { method: "PUT" });
      setUsers((prev) => prev.map((x) => x.id === u.id ? { ...x, is_active: !x.is_active } : x));
    } catch (err) {
      toast({ title: "Failed", description: err instanceof ApiError ? err.message : "Error", variant: "destructive" });
    }
  };

  const handleResetPassword = async () => {
    if (!resetPasswordUser) return;
    if (!newPassword || newPassword.trim().length < 6) {
      toast({ title: "Invalid password", description: "Password must be at least 6 characters", variant: "destructive" });
      return;
    }
    if (newPassword !== confirmPassword) {
      toast({ title: "Passwords don't match", description: "Please ensure both passwords match", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      await apiFetch("/auth/admin/set-password", { 
        method: "POST", 
        body: JSON.stringify({ 
          user_id: Number(resetPasswordUser.id),
          new_password: newPassword.trim()
        }) 
      });
      toast({ title: "Password updated", description: `Password changed successfully for ${resetPasswordUser.name}` });
      setResetPasswordUser(null);
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      toast({ title: "Failed", description: err instanceof ApiError ? err.message : "Error", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await apiFetch(`/users/${id}`, { method: "DELETE" });
      setUsers((prev) => prev.filter((u) => u.id !== id));
      setConfirmDelete(null);
      toast({ title: "User removed" });
    } catch (err) {
      toast({ title: "Failed", description: err instanceof ApiError ? err.message : "Error", variant: "destructive" });
    }
  };

  const handleBulkUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const formData = new FormData();
      formData.append("file", file);
      const parseRes = await apiFetch<{ rows: any[] }>("/users/parse-bulk", { method: "POST", body: formData });
      if (!parseRes.rows?.length) { 
        toast({ title: "No valid rows found", variant: "destructive" }); 
        e.target.value = "";
        return; 
      }
      const createRes = await apiFetch<{ created: any[]; errors?: string[] }>("/users/create-bulk", {
        method: "POST",
        body: JSON.stringify({ users: parseRes.rows }),
      });
      const msg = createRes.errors?.length 
        ? `${createRes.created.length} users created. ${createRes.errors.length} errors.`
        : `${createRes.created.length} users created`;
      toast({ title: "Bulk upload completed", description: msg });
      setShowBulkUpload(false);
      load();
    } catch (err) {
      toast({ title: "Failed", description: err instanceof ApiError ? err.message : "Error", variant: "destructive" });
    }
    e.target.value = "";
  };

  return (
    <DashboardLayout>
      <div className="flex items-start justify-between mb-8 gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <ShieldCheck size={18} className="text-secondary-foreground" />
            <span className="text-xs font-semibold uppercase tracking-widest text-secondary-foreground">Super Admin</span>
          </div>
          <h1 className="text-3xl font-bold font-display text-foreground">Manage Users</h1>
          <p className="text-muted-foreground mt-1">{loading ? "Loading..." : `${users.length} system users`}</p>
        </div>
        <div className="flex gap-3">
          <button onClick={() => setShowBulkUpload(true)} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-border text-sm font-medium text-foreground hover:bg-muted transition-colors">
            <Upload size={14} /> Bulk Upload
          </button>
          <button onClick={() => setShowForm(true)} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg gradient-gold text-secondary-foreground font-medium text-sm hover:opacity-90 transition-opacity">
            <UserPlus size={15} /> Add User
          </button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name or email…" className="w-full pl-11 pr-4 py-3 rounded-lg border border-input bg-card text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
        </div>
        <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} className="px-4 py-3 rounded-lg border border-input bg-card text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring">
          <option value="all">All Roles</option>
          {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
        </select>
      </div>

      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="overflow-x-auto">
          {loading ? (
            <div className="flex items-center justify-center py-16 text-muted-foreground text-sm"><Loader2 size={18} className="animate-spin mr-2" /> Loading users...</div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left px-6 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Name</th>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Email</th>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Role</th>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Department</th>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
                  <th className="text-right px-6 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((u) => (
                  <tr key={u.id} className="border-b border-border last:border-0 hover:bg-muted/50 transition-colors">
                    <td className="px-6 py-4 text-sm font-medium text-foreground">
                      {u.name}
                      {u.is_super_admin && <span className="ml-2 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-secondary/15 text-secondary-foreground uppercase tracking-wider">Super</span>}
                    </td>
                    <td className="px-6 py-4 text-sm text-muted-foreground">{u.email}</td>
                    <td className="px-6 py-4"><span className={`text-xs font-medium px-2.5 py-1 rounded-full ${roleColor(u.role)}`}>{u.role}</span></td>
                    <td className="px-6 py-4 text-sm text-muted-foreground">{u.department || "—"}</td>
                    <td className="px-6 py-4"><span className={`text-xs font-medium px-2.5 py-1 rounded-full ${u.is_active ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"}`}>{u.is_active ? "Active" : "Inactive"}</span></td>
                    <td className="px-6 py-4 text-right">
                      <div className="inline-flex items-center gap-1">
                        <button onClick={() => { setResetPasswordUser(u); setNewPassword(""); setConfirmPassword(""); setShowNewPassword(false); setShowConfirmPassword(false); }} title="Reset password" className="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"><KeyRound size={15} /></button>
                        <button onClick={() => handleToggle(u)} title={u.is_active ? "Deactivate" : "Reactivate"} className="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"><Power size={15} /></button>
                        <button onClick={() => setConfirmDelete(u.id)} title="Delete" className="p-2 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"><Trash2 size={15} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && !loading && (
                  <tr><td colSpan={6} className="px-6 py-12 text-center text-sm text-muted-foreground">No users found</td></tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {showBulkUpload && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/30 backdrop-blur-sm p-4" onClick={() => setShowBulkUpload(false)}>
          <div className="bg-card rounded-2xl border border-border p-6 max-w-md w-full shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display text-lg font-bold text-foreground">Bulk User Upload</h3>
              <button onClick={() => setShowBulkUpload(false)} className="p-1 rounded hover:bg-muted"><X size={18} className="text-muted-foreground" /></button>
            </div>
            <p className="text-sm text-muted-foreground mb-3">Upload an Excel or CSV file containing staff user details.</p>
            <p className="text-xs text-muted-foreground mb-4 bg-muted p-3 rounded-lg">Expected columns: Name, Email, Role, Department (optional), Phone (optional)</p>
            <input ref={fileRef} type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={handleBulkUpload} />
            <div onClick={() => fileRef.current?.click()} className="border-2 border-dashed border-border rounded-xl p-8 text-center cursor-pointer hover:border-secondary/50 transition-colors">
              <Upload size={28} className="mx-auto text-muted-foreground mb-2" />
              <p className="text-sm text-foreground font-medium">Click to upload file</p>
              <p className="text-xs text-muted-foreground mt-1">CSV or Excel (max 10MB)</p>
            </div>
          </div>
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/30 backdrop-blur-sm p-4" onClick={() => setShowForm(false)}>
          <div className="bg-card rounded-2xl border border-border p-6 max-w-lg w-full shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-display text-lg font-bold text-foreground">Add System User</h3>
              <button onClick={() => setShowForm(false)} className="p-1 rounded hover:bg-muted transition-colors"><X size={18} className="text-muted-foreground" /></button>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Full Name *</label>
                  <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full mt-1 px-4 py-2.5 rounded-lg border border-input bg-background text-foreground text-sm focus:ring-2 focus:ring-ring outline-none" placeholder="e.g. Dr. Ama Sarpong" />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Email *</label>
                  <input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} type="email" className="w-full mt-1 px-4 py-2.5 rounded-lg border border-input bg-background text-foreground text-sm focus:ring-2 focus:ring-ring outline-none" placeholder="user@umat.edu.gh" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Role *</label>
                  <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as SystemRole })} className="w-full mt-1 px-4 py-2.5 rounded-lg border border-input bg-background text-foreground text-sm focus:ring-2 focus:ring-ring outline-none">
                    {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Department</label>
                  <select value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} className="w-full mt-1 px-4 py-2.5 rounded-lg border border-input bg-background text-foreground text-sm focus:ring-2 focus:ring-ring outline-none">
                    <option value="">— Select —</option>
                    {departments.map((d) => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Phone</label>
                  <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="w-full mt-1 px-4 py-2.5 rounded-lg border border-input bg-background text-foreground text-sm focus:ring-2 focus:ring-ring outline-none" placeholder="+233…" />
                </div>
                {form.role === "Admin" && (
                  <div className="flex items-end">
                    <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
                      <input type="checkbox" checked={form.isSuperAdmin} onChange={(e) => setForm({ ...form, isSuperAdmin: e.target.checked })} className="w-4 h-4 rounded border-input" />
                      Grant Super Admin
                    </label>
                  </div>
                )}
              </div>
              {form.role === "Supervisor" && (
                <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-3">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Supervisor profile</p>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="text-xs font-medium text-muted-foreground">Title</label>
                      <select value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="w-full mt-1 px-3 py-2 rounded-lg border border-input bg-background text-foreground text-sm focus:ring-2 focus:ring-ring outline-none">
                        {["Dr.", "Prof.", "Assoc Prof", "Mr.", "Mrs."].map((t) => <option key={t}>{t}</option>)}
                      </select>
                    </div>
                    <div className="col-span-2">
                      <label className="text-xs font-medium text-muted-foreground">Staff ID</label>
                      <input value={form.staffId} onChange={(e) => setForm({ ...form, staffId: e.target.value })} className="w-full mt-1 px-3 py-2 rounded-lg border border-input bg-background text-foreground text-sm focus:ring-2 focus:ring-ring outline-none" placeholder="UMaT/ST/123" />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Specialization</label>
                    <input value={form.specialization} onChange={(e) => setForm({ ...form, specialization: e.target.value })} className="w-full mt-1 px-3 py-2 rounded-lg border border-input bg-background text-foreground text-sm focus:ring-2 focus:ring-ring outline-none" placeholder="e.g. Machine Learning" />
                  </div>
                </div>
              )}
              <Button onClick={handleCreate} disabled={saving} className="w-full gradient-gold text-secondary-foreground hover:opacity-90">
                {saving ? <Loader2 size={14} className="animate-spin mr-1" /> : null} Create User
              </Button>
            </div>
          </div>
        </div>
      )}

      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/30 backdrop-blur-sm p-4" onClick={() => setConfirmDelete(null)}>
          <div className="bg-card rounded-2xl border border-border p-6 max-w-sm w-full shadow-xl text-center" onClick={(e) => e.stopPropagation()}>
            <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4"><Trash2 size={22} className="text-destructive" /></div>
            <h3 className="font-display text-lg font-bold text-foreground mb-2">Delete User</h3>
            <p className="text-sm text-muted-foreground mb-5">Remove <strong>{users.find((u) => u.id === confirmDelete)?.name}</strong>? This cannot be undone.</p>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setConfirmDelete(null)}>Cancel</Button>
              <Button variant="destructive" className="flex-1" onClick={() => handleDelete(confirmDelete)}>Delete</Button>
            </div>
          </div>
        </div>
      )}

      {resetPasswordUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/30 backdrop-blur-sm p-4" onClick={() => { setResetPasswordUser(null); setNewPassword(""); setConfirmPassword(""); setShowNewPassword(false); setShowConfirmPassword(false); }}>
          <div className="bg-card rounded-2xl border border-border p-6 max-w-md w-full shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-secondary/10 flex items-center justify-center"><KeyRound size={18} className="text-secondary" /></div>
                <div>
                  <h3 className="font-display text-lg font-bold text-foreground">Reset Password</h3>
                  <p className="text-xs text-muted-foreground">{resetPasswordUser.name}</p>
                  {resetPasswordUser.department && (
                    <p className="text-xs text-muted-foreground/70">{resetPasswordUser.department}</p>
                  )}
                </div>
              </div>
              <button onClick={() => { setResetPasswordUser(null); setNewPassword(""); setConfirmPassword(""); setShowNewPassword(false); setShowConfirmPassword(false); }} className="p-1 rounded hover:bg-muted transition-colors"><X size={18} className="text-muted-foreground" /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium text-muted-foreground">New Password *</label>
                <div className="relative">
                  <input 
                    type={showNewPassword ? "text" : "password"}
                    value={newPassword} 
                    onChange={(e) => setNewPassword(e.target.value)} 
                    autoComplete="new-password"
                    className="w-full mt-1 px-4 pr-11 py-2.5 rounded-lg border border-input bg-background text-foreground text-sm focus:ring-2 focus:ring-ring outline-none" 
                    placeholder="Enter new password (min. 6 characters)"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Confirm Password *</label>
                <div className="relative">
                  <input 
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword} 
                    onChange={(e) => setConfirmPassword(e.target.value)} 
                    autoComplete="new-password"
                    className="w-full mt-1 px-4 pr-11 py-2.5 rounded-lg border border-input bg-background text-foreground text-sm focus:ring-2 focus:ring-ring outline-none" 
                    placeholder="Re-enter password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">User will be required to change this password on next login</p>
              <div className="flex gap-3">
                <Button variant="outline" className="flex-1" onClick={() => { setResetPasswordUser(null); setNewPassword(""); setConfirmPassword(""); setShowNewPassword(false); setShowConfirmPassword(false); }}>Cancel</Button>
                <Button className="flex-1 gradient-gold text-secondary-foreground" onClick={handleResetPassword}>Set Password</Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};

export default ManageUsers;
