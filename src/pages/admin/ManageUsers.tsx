import DashboardLayout from "@/components/DashboardLayout";
import { Navigate } from "react-router-dom";
import { useState } from "react";
import { ShieldCheck, UserPlus, X, Trash2, Search, Power } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useDataStore, type SystemRole, type SystemUser, type Supervisor } from "@/contexts/DataStoreContext";

const ROLES: SystemRole[] = [
  "Student",
  "Supervisor",
  "Admin",
  "Dean",
  "ViceDean",
  "Registrar",
  "AdminAssistant",
  "Accountant",
  "AccountingAssistant",
  "ExamsOfficer",
];

const DEPARTMENTS = [
  "Computer Science",
  "Mining Engineering",
  "Electrical Engineering",
  "Mechanical Engineering",
  "Geomatic Engineering",
  "Finance Office",
  "School of Postgraduate Studies",
];

const roleColor = (role: SystemRole) => {
  if (role === "Admin") return "bg-secondary/15 text-secondary-foreground";
  if (role === "Supervisor") return "bg-primary/10 text-primary";
  if (role === "Student") return "bg-muted text-foreground";
  return "bg-accent/10 text-accent-foreground";
};

const ManageUsers = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const {
    systemUsers,
    supervisors,
    addSystemUser,
    toggleSystemUserActive,
    removeSystemUser,
    addSupervisor,
  } = useDataStore();

  const [showForm, setShowForm] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<"all" | SystemRole>("all");

  const [form, setForm] = useState({
    name: "",
    email: "",
    role: "Supervisor" as SystemRole,
    department: "",
    phone: "",
    staffId: "",
    title: "Dr.",
    specialization: "",
    isSuperAdmin: false,
  });

  if (!user?.isSuperAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  const filtered = systemUsers.filter((u) => {
    const matchesSearch =
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase());
    const matchesRole = roleFilter === "all" || u.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const resetForm = () =>
    setForm({
      name: "",
      email: "",
      role: "Supervisor",
      department: "",
      phone: "",
      staffId: "",
      title: "Dr.",
      specialization: "",
      isSuperAdmin: false,
    });

  const handleCreate = () => {
    if (!form.name.trim() || !form.email.trim() || !form.role) {
      toast({ title: "Missing fields", description: "Name, email, and role are required", variant: "destructive" });
      return;
    }
    if (systemUsers.some((u) => u.email.toLowerCase() === form.email.trim().toLowerCase())) {
      toast({ title: "Email already exists", description: "Choose a different email", variant: "destructive" });
      return;
    }

    const id = `u${Date.now()}`;
    const newUser: SystemUser = {
      id,
      name: form.name.trim(),
      email: form.email.trim().toLowerCase(),
      role: form.role,
      department: form.department || undefined,
      phone: form.phone || undefined,
      isActive: true,
      isSuperAdmin: form.role === "Admin" ? form.isSuperAdmin : false,
      createdAt: new Date().toISOString().slice(0, 10),
    };
    addSystemUser(newUser);

    // Mirror Supervisor into the supervisor roster so they appear in assignments
    if (form.role === "Supervisor") {
      const sv: Supervisor = {
        id: `sv${Date.now()}`,
        staffId: form.staffId.trim() || `UMaT/ST/${Math.floor(Math.random() * 900 + 100)}`,
        name: form.name.trim(),
        email: form.email.trim().toLowerCase(),
        title: form.title || "Dr.",
        department: form.department || "Computer Science",
        specialization: form.specialization || undefined,
        isActive: true,
      };
      addSupervisor(sv);
    }

    toast({ title: "User created", description: `${newUser.name} added as ${newUser.role}` });
    resetForm();
    setShowForm(false);
  };

  const handleDelete = (id: string) => {
    const u = systemUsers.find((x) => x.id === id);
    removeSystemUser(id);
    setConfirmDelete(null);
    toast({ title: "User removed", description: `${u?.name ?? "User"} removed from the system` });
  };

  const isSupervisorRole = form.role === "Supervisor";

  return (
    <DashboardLayout>
      <div className="flex items-start justify-between mb-8 gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <ShieldCheck size={18} className="text-secondary-foreground" />
            <span className="text-xs font-semibold uppercase tracking-widest text-secondary-foreground">Super Admin</span>
          </div>
          <h1 className="text-3xl font-bold font-display text-foreground">Manage Users</h1>
          <p className="text-muted-foreground mt-1">
            {systemUsers.length} users · {supervisors.length} supervisors on staff roster
          </p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg gradient-gold text-secondary-foreground font-medium text-sm hover:opacity-90 transition-opacity"
        >
          <UserPlus size={15} /> Add User
        </button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or email…"
            className="w-full pl-11 pr-4 py-3 rounded-lg border border-input bg-card text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value as typeof roleFilter)}
          className="px-4 py-3 rounded-lg border border-input bg-card text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="all">All Roles</option>
          {ROLES.map((r) => (
            <option key={r} value={r}>{r}</option>
          ))}
        </select>
      </div>

      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="overflow-x-auto">
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
                    {u.isSuperAdmin && (
                      <span className="ml-2 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-secondary/15 text-secondary-foreground uppercase tracking-wider">Super</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm text-muted-foreground">{u.email}</td>
                  <td className="px-6 py-4">
                    <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${roleColor(u.role)}`}>{u.role}</span>
                  </td>
                  <td className="px-6 py-4 text-sm text-muted-foreground">{u.department || "—"}</td>
                  <td className="px-6 py-4">
                    <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${u.isActive ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"}`}>
                      {u.isActive ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="inline-flex items-center gap-1">
                      <button
                        onClick={() => toggleSystemUserActive(u.id)}
                        title={u.isActive ? "Deactivate" : "Reactivate"}
                        className="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <Power size={15} />
                      </button>
                      <button
                        onClick={() => setConfirmDelete(u.id)}
                        title="Delete user"
                        className="p-2 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-sm text-muted-foreground">No users found</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/30 backdrop-blur-sm p-4" onClick={() => setShowForm(false)}>
          <div className="bg-card rounded-2xl border border-border p-6 max-w-lg w-full shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-display text-lg font-bold text-foreground">Add System User</h3>
              <button onClick={() => setShowForm(false)} className="p-1 rounded hover:bg-muted transition-colors">
                <X size={18} className="text-muted-foreground" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Full Name *</label>
                  <input
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="w-full mt-1 px-4 py-2.5 rounded-lg border border-input bg-background text-foreground text-sm focus:ring-2 focus:ring-ring outline-none"
                    placeholder="e.g. Dr. Ama Sarpong"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Email *</label>
                  <input
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    type="email"
                    className="w-full mt-1 px-4 py-2.5 rounded-lg border border-input bg-background text-foreground text-sm focus:ring-2 focus:ring-ring outline-none"
                    placeholder="user@umat.edu.gh"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Role *</label>
                  <select
                    value={form.role}
                    onChange={(e) => setForm({ ...form, role: e.target.value as SystemRole })}
                    className="w-full mt-1 px-4 py-2.5 rounded-lg border border-input bg-background text-foreground text-sm focus:ring-2 focus:ring-ring outline-none"
                  >
                    {ROLES.map((r) => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Department</label>
                  <select
                    value={form.department}
                    onChange={(e) => setForm({ ...form, department: e.target.value })}
                    className="w-full mt-1 px-4 py-2.5 rounded-lg border border-input bg-background text-foreground text-sm focus:ring-2 focus:ring-ring outline-none"
                  >
                    <option value="">— Select —</option>
                    {DEPARTMENTS.map((d) => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Phone</label>
                  <input
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    className="w-full mt-1 px-4 py-2.5 rounded-lg border border-input bg-background text-foreground text-sm focus:ring-2 focus:ring-ring outline-none"
                    placeholder="+233…"
                  />
                </div>
                {form.role === "Admin" && (
                  <div className="flex items-end">
                    <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
                      <input
                        type="checkbox"
                        checked={form.isSuperAdmin}
                        onChange={(e) => setForm({ ...form, isSuperAdmin: e.target.checked })}
                        className="w-4 h-4 rounded border-input"
                      />
                      Grant Super Admin
                    </label>
                  </div>
                )}
              </div>

              {isSupervisorRole && (
                <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-3">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Supervisor profile</p>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="text-xs font-medium text-muted-foreground">Title</label>
                      <select
                        value={form.title}
                        onChange={(e) => setForm({ ...form, title: e.target.value })}
                        className="w-full mt-1 px-3 py-2 rounded-lg border border-input bg-background text-foreground text-sm focus:ring-2 focus:ring-ring outline-none"
                      >
                        <option>Dr.</option>
                        <option>Prof.</option>
                        <option>Assoc Prof</option>
                        <option>Mr.</option>
                        <option>Mrs.</option>
                      </select>
                    </div>
                    <div className="col-span-2">
                      <label className="text-xs font-medium text-muted-foreground">Staff ID</label>
                      <input
                        value={form.staffId}
                        onChange={(e) => setForm({ ...form, staffId: e.target.value })}
                        className="w-full mt-1 px-3 py-2 rounded-lg border border-input bg-background text-foreground text-sm focus:ring-2 focus:ring-ring outline-none"
                        placeholder="UMaT/ST/123"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Specialization</label>
                    <input
                      value={form.specialization}
                      onChange={(e) => setForm({ ...form, specialization: e.target.value })}
                      className="w-full mt-1 px-3 py-2 rounded-lg border border-input bg-background text-foreground text-sm focus:ring-2 focus:ring-ring outline-none"
                      placeholder="e.g. Machine Learning"
                    />
                  </div>
                </div>
              )}

              <Button onClick={handleCreate} className="w-full gradient-gold text-secondary-foreground hover:opacity-90">
                Create User
              </Button>
            </div>
          </div>
        </div>
      )}

      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/30 backdrop-blur-sm p-4" onClick={() => setConfirmDelete(null)}>
          <div className="bg-card rounded-2xl border border-border p-6 max-w-sm w-full shadow-xl text-center" onClick={(e) => e.stopPropagation()}>
            <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
              <Trash2 size={22} className="text-destructive" />
            </div>
            <h3 className="font-display text-lg font-bold text-foreground mb-2">Delete User</h3>
            <p className="text-sm text-muted-foreground mb-5">
              Remove <strong>{systemUsers.find((u) => u.id === confirmDelete)?.name}</strong>? This cannot be undone.
            </p>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setConfirmDelete(null)}>Cancel</Button>
              <Button variant="destructive" className="flex-1" onClick={() => handleDelete(confirmDelete)}>Delete</Button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};

export default ManageUsers;