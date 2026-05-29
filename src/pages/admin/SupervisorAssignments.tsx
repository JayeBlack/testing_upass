import DashboardLayout from "@/components/DashboardLayout";
import { Navigate } from "react-router-dom";
import { useMemo, useState } from "react";
import { ShieldCheck, Link2, X, Trash2, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useDataStore } from "@/contexts/DataStoreContext";

const SupervisorAssignments = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { students, supervisors, assignments, assignSupervisor, unassignSupervisor } = useDataStore();

  const [open, setOpen] = useState(false);
  const [studentId, setStudentId] = useState("");
  const [supervisorId, setSupervisorId] = useState("");
  const [isPrimary, setIsPrimary] = useState(true);
  const [deptFilter, setDeptFilter] = useState("all");

  if (!user?.isSuperAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  const departments = useMemo(
    () => [...new Set([...students.map((s) => s.department), ...supervisors.map((s) => s.department)])],
    [students, supervisors]
  );

  const rows = useMemo(() => {
    return students
      .filter((s) => deptFilter === "all" || s.department === deptFilter)
      .map((s) => {
        const links = assignments
          .filter((a) => a.studentId === s.id)
          .map((a) => {
            const sv = supervisors.find((sv) => sv.id === a.supervisorId);
            return { assignment: a, supervisor: sv };
          });
        return { student: s, links };
      });
  }, [students, assignments, supervisors, deptFilter]);

  const handleAssign = () => {
    if (!studentId || !supervisorId) {
      toast({ title: "Select both", description: "Pick a student and a supervisor", variant: "destructive" });
      return;
    }
    assignSupervisor(studentId, supervisorId, isPrimary);
    const st = students.find((x) => x.id === studentId);
    const sv = supervisors.find((x) => x.id === supervisorId);
    toast({ title: "Assignment created", description: `${sv?.name} → ${st?.name}` });
    setStudentId("");
    setSupervisorId("");
    setIsPrimary(true);
    setOpen(false);
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
            {assignments.length} active links · {supervisors.length} supervisors · {students.length} students
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
                    <p className="text-sm font-medium text-foreground">{student.name}</p>
                    <p className="text-xs text-muted-foreground font-mono">{student.index}</p>
                  </td>
                  <td className="px-6 py-4 text-sm text-muted-foreground">{student.program}</td>
                  <td className="px-6 py-4 text-sm text-muted-foreground">{student.department}</td>
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
                              {supervisor ? `${supervisor.title} ${supervisor.name}` : "Unknown"}
                            </span>
                            {assignment.isPrimary && (
                              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-primary/10 text-primary uppercase tracking-wider">Primary</span>
                            )}
                            <button
                              onClick={() => unassignSupervisor(assignment.id)}
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
                    <option key={s.id} value={s.id}>{s.name} · {s.index}</option>
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
                  {supervisors.filter((sv) => sv.isActive).map((sv) => (
                    <option key={sv.id} value={sv.id}>{sv.title} {sv.name} · {sv.department}</option>
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

              <Button onClick={handleAssign} className="w-full gradient-gold text-secondary-foreground hover:opacity-90">
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