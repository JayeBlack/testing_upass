import DashboardLayout from "@/components/DashboardLayout";
import { Navigate } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { ShieldCheck, Link2, X, Trash2, Users, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { apiFetch, ApiError } from "@/lib/api";

interface Student {
  id: string;
  index_number: string;
  first_name: string;
  last_name: string;
  program_name: string;
  department_name: string;
}

interface Supervisor {
  id: string;
  first_name: string;
  last_name: string;
  department_name: string;
  is_active: boolean;
}

interface Assignment {
  id: string;
  student_id: string;
  supervisor_id: string;
  is_primary: boolean;
  student_name: string;
  index_number: string;
  program_name: string;
  department_name: string;
  supervisor_name: string;
}

const SupervisorAssignments = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [students, setStudents] = useState<Student[]>([]);
  const [supervisors, setSupervisors] = useState<Supervisor[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [studentId, setStudentId] = useState("");
  const [supervisorId, setSupervisorId] = useState("");
  const [isPrimary, setIsPrimary] = useState(true);
  const [deptFilter, setDeptFilter] = useState("all");
  const [saving, setSaving] = useState(false);

  if (!user?.isSuperAdmin) return <Navigate to="/dashboard" replace />;

  const load = async () => {
    setLoading(true);
    try {
      const [studentsData, supervisorsData, assignmentsData] = await Promise.all([
        apiFetch<Student[]>("/students"),
        apiFetch<Supervisor[]>("/supervisors"),
        apiFetch<Assignment[]>("/supervisors/assignments"),
      ]);
      setStudents(studentsData || []);
      setSupervisors(supervisorsData || []);
      setAssignments(assignmentsData || []);
    } catch {
      // backend offline
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const departments = useMemo(
    () => [...new Set([...students.map((s) => s.department_name), ...supervisors.map((s) => s.department_name)].filter(Boolean))],
    [students, supervisors]
  );

  const rows = useMemo(() => {
    return students
      .filter((s) => deptFilter === "all" || s.department_name === deptFilter)
      .map((s) => {
        const links = assignments
          .filter((a) => a.student_id === s.id)
          .map((a) => {
            const sv = supervisors.find((sv) => sv.id === a.supervisor_id);
            return { assignment: a, supervisor: sv };
          });
        return { student: s, links };
      });
  }, [students, assignments, supervisors, deptFilter]);

  const handleAssign = async () => {
    if (!studentId || !supervisorId) {
      toast({ title: "Select both", description: "Pick a student and a supervisor", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      await apiFetch(`/supervisors/${supervisorId}/assign`, {
        method: "POST",
        body: JSON.stringify({ student_id: studentId, is_primary: isPrimary }),
      });
      const st = students.find((x) => x.id === studentId);
      const sv = supervisors.find((x) => x.id === supervisorId);
      toast({ title: "Assignment created", description: `${sv?.first_name} ${sv?.last_name} → ${st?.first_name} ${st?.last_name}` });
      setStudentId("");
      setSupervisorId("");
      setIsPrimary(true);
      setOpen(false);
      load();
    } catch (err) {
      toast({ title: "Failed", description: err instanceof ApiError ? err.message : "Error", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleUnassign = async (assignmentId: string) => {
    try {
      await apiFetch(`/supervisors/assignments/${assignmentId}`, { method: "DELETE" });
      setAssignments((prev) => prev.filter((a) => a.id !== assignmentId));
      toast({ title: "Assignment removed" });
    } catch (err) {
      toast({ title: "Failed", description: err instanceof ApiError ? err.message : "Error", variant: "destructive" });
    }
  };

  return (
    <DashboardLayout>
      <div className="flex items-start justify-between mb-8 gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <ShieldCheck size={18} className="text-secondary-foreground" />
            <span className="text-xs font-semibold uppercase tracking-widest text-secondary-foreground">Super Admin</span>
          </div>
          <h1 className="text-3xl font-bold font-display text-foreground">Supervisor Assignments</h1>
          <p className="text-muted-foreground mt-1">
            {loading ? "Loading..." : `${assignments.length} active links · ${supervisors.length} supervisors · ${students.length} students`}
          </p>
        </div>
        <div className="flex gap-3">
          <select
            value={deptFilter}
            onChange={(e) => setDeptFilter(e.target.value)}
            className="px-4 py-2.5 rounded-lg border border-input bg-card text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="all">All Departments</option>
            {departments.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
          <button
            onClick={() => setOpen(true)}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg gradient-gold text-secondary-foreground font-medium text-sm hover:opacity-90 transition-opacity"
          >
            <Link2 size={15} /> New Assignment
          </button>
        </div>
      </div>

      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="overflow-x-auto">
          {loading ? (
            <div className="flex items-center justify-center py-16 text-muted-foreground text-sm">
              <Loader2 size={18} className="animate-spin mr-2" /> Loading assignments...
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left px-6 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Student</th>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Programme</th>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Department</th>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Supervisors</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(({ student, links }) => (
                  <tr key={student.id} className="border-b border-border last:border-0 align-top">
                    <td className="px-6 py-4">
                      <p className="text-sm font-medium text-foreground">{student.first_name} {student.last_name}</p>
                      <p className="text-xs text-muted-foreground font-mono">{student.index_number}</p>
                    </td>
                    <td className="px-6 py-4 text-sm text-muted-foreground">{student.program_name}</td>
                    <td className="px-6 py-4 text-sm text-muted-foreground">{student.department_name}</td>
                    <td className="px-6 py-4">
                      {links.length === 0 ? (
                        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground italic">
                          <Users size={12} /> No supervisor assigned
                        </span>
                      ) : (
                        <div className="flex flex-col gap-2">
                          {links.map(({ assignment, supervisor }) => (
                            <div key={assignment.id} className="inline-flex items-center gap-2 bg-muted/60 rounded-lg pl-3 pr-1 py-1.5">
                              <span className="text-sm text-foreground">
                                {supervisor ? `${supervisor.first_name} ${supervisor.last_name}` : "Unknown"}
                              </span>
                              {assignment.is_primary && (
                                <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-primary/10 text-primary uppercase tracking-wider">Primary</span>
                              )}
                              <button
                                onClick={() => handleUnassign(assignment.id)}
                                className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                                title="Remove assignment"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-6 py-12 text-center text-sm text-muted-foreground">No students found</td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/30 backdrop-blur-sm p-4" onClick={() => setOpen(false)}>
          <div className="bg-card rounded-2xl border border-border p-6 max-w-lg w-full shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-display text-lg font-bold text-foreground">New Supervisor Assignment</h3>
              <button onClick={() => setOpen(false)} className="p-1 rounded hover:bg-muted transition-colors">
                <X size={18} className="text-muted-foreground" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium text-muted-foreground">Student *</label>
                <select
                  value={studentId}
                  onChange={(e) => setStudentId(e.target.value)}
                  className="w-full mt-1 px-4 py-2.5 rounded-lg border border-input bg-background text-foreground text-sm focus:ring-2 focus:ring-ring outline-none"
                >
                  <option value="">— Select student —</option>
                  {students.map((s) => (
                    <option key={s.id} value={s.id}>{s.first_name} {s.last_name} · {s.index_number}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground">Supervisor *</label>
                <select
                  value={supervisorId}
                  onChange={(e) => setSupervisorId(e.target.value)}
                  className="w-full mt-1 px-4 py-2.5 rounded-lg border border-input bg-background text-foreground text-sm focus:ring-2 focus:ring-ring outline-none"
                >
                  <option value="">— Select supervisor —</option>
                  {supervisors.filter((sv) => sv.is_active).map((sv) => (
                    <option key={sv.id} value={sv.id}>{sv.first_name} {sv.last_name} · {sv.department_name}</option>
                  ))}
                </select>
              </div>

              <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
                <input
                  type="checkbox"
                  checked={isPrimary}
                  onChange={(e) => setIsPrimary(e.target.checked)}
                  className="w-4 h-4 rounded border-input"
                />
                Mark as primary supervisor
              </label>

              <Button onClick={handleAssign} disabled={saving} className="w-full gradient-gold text-secondary-foreground hover:opacity-90">
                {saving ? <Loader2 size={14} className="animate-spin mr-1.5" /> : null}
                Create Assignment
              </Button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};

export default SupervisorAssignments;
