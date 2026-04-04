import DashboardLayout from "@/components/DashboardLayout";
import { Users, Search, Trash2, X, Upload } from "lucide-react";
import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useAdminDepartment } from "@/hooks/use-admin-department";

interface Student {
  id: string;
  name: string;
  index: string;
  email: string;
  program: string;
  department: string;
  status: "Active" | "Inactive";
}

const initialStudents: Student[] = [
  { id: "1", name: "Kwame Mensah", index: "UMaT/PG/0234/22", email: "kwame.mensah@umat.edu.gh", program: "MSc. IT", department: "Computer Science", status: "Active" },
  { id: "2", name: "Ama Serwaa", index: "UMaT/PG/0198/22", email: "ama.serwaa@umat.edu.gh", program: "MSc. IT", department: "Computer Science", status: "Active" },
  { id: "3", name: "Yaw Boateng", index: "UMaT/PG/0312/22", email: "yaw.boateng@umat.edu.gh", program: "MPhil CS", department: "Computer Science", status: "Active" },
  { id: "4", name: "Efua Dankwah", index: "UMaT/PG/0287/22", email: "efua.dankwah@umat.edu.gh", program: "MSc. IT", department: "Computer Science", status: "Inactive" },
  { id: "5", name: "Kofi Adjei", index: "UMaT/PG/0345/22", email: "kofi.adjei@umat.edu.gh", program: "MPhil CS", department: "Computer Science", status: "Active" },
  { id: "6", name: "Abena Owusu", index: "UMaT/PG/0401/23", email: "abena.owusu@umat.edu.gh", program: "MSc. Mining Eng", department: "Mining Engineering", status: "Active" },
  { id: "7", name: "Esi Appiah", index: "UMaT/PG/0145/21", email: "esi.appiah@umat.edu.gh", program: "MSc. Electrical Eng", department: "Electrical Engineering", status: "Active" },
  { id: "8", name: "Nana Agyei", index: "UMaT/PG/0420/23", email: "nana.agyei@umat.edu.gh", program: "MSc. Mechanical Eng", department: "Mechanical Engineering", status: "Active" },
];

const ManageStudents = () => {
  const [students, setStudents] = useState<Student[]>(initialStudents);
  const [search, setSearch] = useState("");
  const [showEnrollForm, setShowEnrollForm] = useState(false);
  const [showBulkUpload, setShowBulkUpload] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [deptFilter, setDeptFilter] = useState("all");
  const fileRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const { isSuperAdmin, adminDepartment } = useAdminDepartment();

  const departments = [...new Set(students.map((s) => s.department))];

  const [form, setForm] = useState({
    name: "", index: "", email: "", program: "", department: "", status: "Active" as "Active" | "Inactive",
  });

  const filtered = students.filter((s) => {
    const matchesSearch = s.name.toLowerCase().includes(search.toLowerCase()) || s.index.includes(search);
    // Departmental admin: always filter by their department
    const effectiveDept = isSuperAdmin ? deptFilter : (adminDepartment || "all");
    const matchesDept = effectiveDept === "all" || s.department === effectiveDept;
    return matchesSearch && matchesDept;
  });

  const handleEnroll = () => {
    if (!form.name.trim() || !form.index.trim() || !form.email.trim() || !form.program.trim() || !form.department.trim()) {
      toast({ title: "Missing fields", description: "Please fill in all required fields", variant: "destructive" });
      return;
    }
    const newStudent: Student = { id: `s${Date.now()}`, ...form };
    setStudents((prev) => [newStudent, ...prev]);
    setForm({ name: "", index: "", email: "", program: "", department: "", status: "Active" });
    setShowEnrollForm(false);
    toast({ title: "Student enrolled", description: `${form.name} has been added to the system` });
  };

  const handleBulkUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const lines = text.split("\n").filter((l) => l.trim());
      const newStudents: Student[] = lines.slice(1).map((line, i) => {
        const cols = line.split(",").map((s) => s.trim());
        return {
          id: `bulk${i}${Date.now()}`,
          name: cols[0] || "",
          index: cols[1] || "",
          email: cols[2] || "",
          program: cols[3] || "",
          department: cols[4] || "",
          status: "Active" as const,
        };
      }).filter((s) => s.name && s.index);

      setStudents((prev) => [...newStudents, ...prev]);
      setShowBulkUpload(false);
      toast({
        title: `${newStudents.length} students enrolled`,
        description: "Students from the uploaded file have been added to the system",
      });
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const handleDelete = (id: string) => {
    const student = students.find((s) => s.id === id);
    setStudents((prev) => prev.filter((s) => s.id !== id));
    setDeleteConfirm(null);
    toast({ title: "Student removed", description: `${student?.name} has been removed from the system` });
  };

  return (
    <DashboardLayout>
      <div className="flex items-center justify-between mb-8">
        <div>
         <h1 className="text-3xl font-bold font-display text-foreground">Manage Students</h1>
          <p className="text-muted-foreground mt-1">
            {isSuperAdmin ? `${students.length} registered postgraduate students` : `${adminDepartment} — ${filtered.length} students`}
          </p>
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

      {/* Bulk Upload Modal */}
      {showBulkUpload && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/30 backdrop-blur-sm p-4" onClick={() => setShowBulkUpload(false)}>
          <div className="bg-card rounded-2xl border border-border p-6 max-w-md w-full shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display text-lg font-bold text-foreground">Bulk Student Upload</h3>
              <button onClick={() => setShowBulkUpload(false)} className="p-1 rounded hover:bg-muted transition-colors"><X size={18} className="text-muted-foreground" /></button>
            </div>
            <p className="text-sm text-muted-foreground mb-3">Upload an Excel or CSV file containing student details. The system will read the file and enroll students automatically.</p>
            <p className="text-xs text-muted-foreground mb-4 bg-muted p-3 rounded-lg">Expected columns: Name, Index Number, Email, Programme, Department</p>
            <input ref={fileRef} type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={handleBulkUpload} />
            <div onClick={() => fileRef.current?.click()} className="border-2 border-dashed border-border rounded-xl p-8 text-center cursor-pointer hover:border-secondary/50 transition-colors">
              <Upload size={28} className="mx-auto text-muted-foreground mb-2" />
              <p className="text-sm text-foreground font-medium">Click to upload file</p>
              <p className="text-xs text-muted-foreground mt-1">CSV or Excel file (max 10MB)</p>
            </div>
            <button onClick={() => setShowBulkUpload(false)} className="w-full mt-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors">Cancel</button>
          </div>
        </div>
      )}

      {/* Enroll Form Modal */}
      {showEnrollForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/30 backdrop-blur-sm p-4" onClick={() => setShowEnrollForm(false)}>
          <div className="bg-card rounded-2xl border border-border p-6 max-w-lg w-full shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-display text-lg font-bold text-foreground">Enroll New Student</h3>
              <button onClick={() => setShowEnrollForm(false)} className="p-1 rounded hover:bg-muted transition-colors"><X size={18} className="text-muted-foreground" /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium text-muted-foreground">Full Name *</label>
                <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full mt-1 px-4 py-2.5 rounded-lg border border-input bg-background text-foreground text-sm focus:ring-2 focus:ring-ring outline-none" placeholder="e.g. Kwame Mensah" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Index Number *</label>
                  <input value={form.index} onChange={(e) => setForm({ ...form, index: e.target.value })} className="w-full mt-1 px-4 py-2.5 rounded-lg border border-input bg-background text-foreground text-sm focus:ring-2 focus:ring-ring outline-none" placeholder="e.g. UMaT/PG/0234/22" />
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
                    <option value="MSc. IT">MSc. Information Technology</option>
                    <option value="MPhil CS">MPhil Computer Science</option>
                    <option value="MSc. Mining Eng">MSc. Mining Engineering</option>
                    <option value="MSc. Electrical Eng">MSc. Electrical Engineering</option>
                    <option value="MSc. Mechanical Eng">MSc. Mechanical Engineering</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Department *</label>
                  <select value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} className="w-full mt-1 px-4 py-2.5 rounded-lg border border-input bg-background text-foreground text-sm focus:ring-2 focus:ring-ring outline-none">
                    <option value="">Select department</option>
                    <option value="Computer Science">Computer Science</option>
                    <option value="Mining Engineering">Mining Engineering</option>
                    <option value="Electrical Engineering">Electrical Engineering</option>
                    <option value="Mechanical Engineering">Mechanical Engineering</option>
                  </select>
                </div>
              </div>
              <Button onClick={handleEnroll} className="w-full gradient-gold text-secondary-foreground hover:opacity-90">Enroll Student</Button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/30 backdrop-blur-sm p-4" onClick={() => setDeleteConfirm(null)}>
          <div className="bg-card rounded-2xl border border-border p-6 max-w-sm w-full shadow-xl text-center" onClick={(e) => e.stopPropagation()}>
            <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
              <Trash2 size={24} className="text-destructive" />
            </div>
            <h3 className="font-display text-lg font-bold text-foreground mb-2">Delete Student</h3>
            <p className="text-sm text-muted-foreground mb-5">Are you sure you want to remove <strong>{students.find((s) => s.id === deleteConfirm)?.name}</strong>? This cannot be undone.</p>
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
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name or index number..." className="w-full pl-11 pr-4 py-3 rounded-lg border border-input bg-card text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
        </div>
        <select value={deptFilter} onChange={(e) => setDeptFilter(e.target.value)} className="px-4 py-3 rounded-lg border border-input bg-card text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring">
          <option value="all">All Departments</option>
          {departments.map((d) => <option key={d} value={d}>{d}</option>)}
        </select>
      </div>

      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="overflow-x-auto">
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
                  <td className="px-6 py-4 text-sm font-medium text-foreground">{s.name}</td>
                  <td className="px-6 py-4 text-sm font-mono text-muted-foreground">{s.index}</td>
                  <td className="px-6 py-4 text-sm text-muted-foreground">{s.program}</td>
                  <td className="px-6 py-4 text-sm text-muted-foreground">{s.department}</td>
                  <td className="px-6 py-4">
                    <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${s.status === "Active" ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"}`}>{s.status}</span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button onClick={() => setDeleteConfirm(s.id)} className="p-2 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors" title="Delete student">
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={6} className="px-6 py-12 text-center text-sm text-muted-foreground">No students found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default ManageStudents;
