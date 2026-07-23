import DashboardLayout from "@/components/DashboardLayout";
import { Navigate } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { ShieldCheck, Link2, Trash2, Users, Loader2 } from "lucide-react";
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
  const [tableSearch, setTableSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 20;
  const [saving, setSaving] = useState(false);
  const [studentSearch, setStudentSearch] = useState("");
  const [supervisorSearch, setSupervisorSearch] = useState("");

  if (!user?.isSuperAdmin) return <Navigate to="/dashboard" replace />;

  const load = async () => {
    setLoading(true);
    try {
      const [studentsData, supervisorsData, assignmentsData] = await Promise.all([
        apiFetch<any>("/students"),
        apiFetch<any>("/supervisors"),
        apiFetch<any>("/supervisors/assignments"),
      ]);
const svArray = Array.isArray(supervisorsData)
        ? supervisorsData
        : Array.isArray(supervisorsData?.data)
        ? supervisorsData.data
        : Array.isArray(supervisorsData?.supervisors)
        ? supervisorsData.supervisors
        : [];
      setSupervisors(svArray.map((sv: any) => ({ ...sv, id: String(sv.id) })));
      setAssignments((Array.isArray(assignmentsData) ? assignmentsData : assignmentsData?.assignments ?? []).map((a: any) => ({ ...a, id: String(a.id), student_id: String(a.student_id), supervisor_id: String(a.supervisor_id) })));
      setStudents((Array.isArray(studentsData) ? studentsData : studentsData?.data ?? []).map((s: any) => ({ ...s, id: String(s.id) })));
    } catch {
      // backend offline
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const [departments, setDepartments] = useState<string[]>([]);

  useEffect(() => {
    apiFetch<any>("/departments")
      .then((data) => {
        const depts = Array.isArray(data) ? data : data?.data ?? [];
        setDepartments(depts.map((d: any) => d.name).sort());
      })
      .catch(() => {});
  }, []);

  const allRows = useMemo(() => {
    const q = tableSearch.toLowerCase();
    return students
      .filter((s) => deptFilter === "all" || s.department_name === deptFilter)
      .filter((s) => !q || `${s.first_name} ${s.last_name}`.toLowerCase().includes(q) || s.index_number.toLowerCase().includes(q))
      .map((s) => {
        const links = assignments
          .filter((a) => a.student_id === s.id)
          .map((a) => {
            const sv = supervisors.find((sv) => sv.id === a.supervisor_id);
            return { assignment: a, supervisor: sv };
          });
        return { student: s, links };
      });
  }, [students, assignments, supervisors, deptFilter, tableSearch]);

  const totalPages = Math.max(1, Math.ceil(allRows.length / PAGE_SIZE));
  const rows = allRows.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

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
      setStudentSearch("");
      setSupervisorSearch("");
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
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between mb-8">
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <ShieldCheck size={18} className="text-secondary-foreground" />
            <span className="text-xs font-semibold uppercase tracking-widest text-secondary-foreground">Super Admin</span>
          </div>
          <h1 className="text-3xl font-bold font-display text-foreground">Supervisor Assignments</h1>
          <p className="text-muted-foreground mt-1">
            {loading ? "Loading..." : `${assignments.length} active links · ${supervisors.length} supervisors · ${students.length} students`}
          </p>
        </div>
        <div className="flex w-full flex-col gap-3 xl:w-auto xl:min-w-[420px]">
          <input
            value={tableSearch}
            onChange={(e) => { setTableSearch(e.target.value); setCurrentPage(1); }}
            placeholder="Search by name or index..."
            className="w-full px-4 py-2.5 rounded-lg border border-input bg-card text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <div className="flex flex-col gap-3 sm:flex-row">
            <select
              value={deptFilter}
              onChange={(e) => { setDeptFilter(e.target.value); setCurrentPage(1); }}
              className="w-full px-4 py-2.5 rounded-lg border border-input bg-card text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring sm:w-48"
            >
              <option value="all">All Departments</option>
              {departments.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
            <button
              onClick={() => setOpen(!open)}
              className="inline-flex w-full items-center justify-center gap-2 px-5 py-2.5 rounded-lg gradient-gold text-secondary-foreground font-medium text-sm hover:opacity-90 transition-opacity shrink-0 sm:w-auto"
            >
              <Link2 size={15} /> New Assignment
            </button>
          </div>
        </div>
      </div>

      {open && (
        <div className="bg-card rounded-2xl border border-border p-6 shadow-xl mb-6">
          <div className="flex items-center justify-between mb-5">
            <h3 className="font-display text-lg font-bold text-foreground">New Supervisor Assignment</h3>
            <button onClick={() => { setOpen(false); setStudentSearch(""); setSupervisorSearch(""); setStudentId(""); setSupervisorId(""); }} className="p-2 rounded-lg border border-border text-sm text-foreground hover:bg-muted transition-colors">Close</button>
          </div>
          <div className="space-y-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Student *</label>
              <input
                value={studentSearch}
                onChange={(e) => { setStudentSearch(e.target.value); setStudentId(""); }}
                placeholder="Search by name or index number..."
                className="w-full mt-1 px-4 py-2.5 rounded-lg border border-input bg-background text-foreground text-sm focus:ring-2 focus:ring-ring outline-none"
              />
              {studentSearch && !studentId && (
                <div className="mt-1 max-h-48 overflow-y-auto rounded-lg border border-border bg-card shadow-md">
                  {(() => {
                    const q = studentSearch.toLowerCase();
                    const filtered = students.filter((s) =>
                      `${s.first_name} ${s.last_name}`.toLowerCase().includes(q) || s.index_number.toLowerCase().includes(q)
                    ).slice(0, 20);
                    return filtered.length === 0
                      ? <p className="px-4 py-3 text-sm text-muted-foreground">No students found</p>
                      : filtered.map((s) => (
                        <button key={s.id} type="button"
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => { setStudentId(s.id); setStudentSearch(`${s.first_name} ${s.last_name} · ${s.index_number}`); }}
                          className="w-full text-left px-4 py-2.5 text-sm hover:bg-muted transition-colors"
                        >
                          <span className="font-medium text-foreground">{s.first_name} {s.last_name}</span>
                          <span className="ml-2 text-xs text-muted-foreground font-mono">{s.index_number}</span>
                        </button>
                      ));
                  })()}
                </div>
              )}
              {studentId && <p className="mt-1 text-xs text-success">✓ Student selected</p>}
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Supervisor *</label>
              <input
                value={supervisorSearch}
                onChange={(e) => { setSupervisorSearch(e.target.value); setSupervisorId(""); }}
                placeholder="Search by name or department..."
                className="w-full mt-1 px-4 py-2.5 rounded-lg border border-input bg-background text-foreground text-sm focus:ring-2 focus:ring-ring outline-none"
              />
              {supervisorSearch && !supervisorId && (
                <div className="mt-1 max-h-48 overflow-y-auto rounded-lg border border-border bg-card shadow-md">
                  {(() => {
                    const q = supervisorSearch.toLowerCase();
                    const filtered = supervisors.filter((sv) =>
                      `${sv.first_name} ${sv.last_name}`.toLowerCase().includes(q) || sv.department_name?.toLowerCase().includes(q)
                    ).slice(0, 20);
                    return filtered.length === 0
                      ? <p className="px-4 py-3 text-sm text-muted-foreground">No supervisors found</p>
                      : filtered.map((sv) => (
                        <button key={sv.id} type="button"
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => { setSupervisorId(sv.id); setSupervisorSearch(`${sv.first_name} ${sv.last_name} · ${sv.department_name}`); }}
                          className="w-full text-left px-4 py-2.5 text-sm hover:bg-muted transition-colors"
                        >
                          <span className="font-medium text-foreground">{sv.first_name} {sv.last_name}</span>
                          <span className="ml-2 text-xs text-muted-foreground">{sv.department_name}</span>
                        </button>
                      ));
                  })()}
                </div>
              )}
              {supervisorId && <p className="mt-1 text-xs text-success">✓ Supervisor selected</p>}
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
      )}

      <div className="bg-card rounded-xl border border-border overflow-hidden">
        {/* Desktop table */}
        <div className="hidden sm:block overflow-x-auto">
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
        {/* Mobile card list */}
        <div className="sm:hidden divide-y divide-border">
          {loading ? (
            <div className="flex items-center justify-center py-16 text-muted-foreground text-sm"><Loader2 size={18} className="animate-spin mr-2" /> Loading...</div>
          ) : rows.length === 0 ? (
            <p className="px-4 py-12 text-center text-sm text-muted-foreground">No students found</p>
          ) : rows.map(({ student, links }) => (
            <div key={student.id} className="px-4 py-4">
              <p className="text-sm font-semibold text-foreground">{student.first_name} {student.last_name}</p>
              <p className="text-xs font-mono text-muted-foreground">{student.index_number}</p>
              <p className="text-xs text-muted-foreground mt-0.5 truncate">{student.program_name}</p>
              <div className="mt-2">
                {links.length === 0 ? (
                  <span className="text-xs text-muted-foreground italic">No supervisor assigned</span>
                ) : (
                  <div className="flex flex-col gap-1.5 mt-1">
                    {links.map(({ assignment, supervisor }) => (
                      <div key={assignment.id} className="inline-flex items-center gap-2 bg-muted/60 rounded-lg pl-3 pr-1 py-1.5 w-fit">
                        <span className="text-xs text-foreground">{supervisor ? `${supervisor.first_name} ${supervisor.last_name}` : "Unknown"}</span>
                        {assignment.is_primary && <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-primary/10 text-primary uppercase">Primary</span>}
                        <button onClick={() => handleUnassign(assignment.id)} className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive"><Trash2 size={13} /></button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4 px-1">
          <p className="text-sm text-muted-foreground">
            Showing {(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, allRows.length)} of {allRows.length}
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-3 py-2 rounded-lg border border-border text-sm font-medium text-foreground hover:bg-muted transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter(p => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
              .reduce<(number | string)[]>((acc, p, i, arr) => {
                if (i > 0 && (p as number) - (arr[i - 1] as number) > 1) acc.push("...");
                acc.push(p);
                return acc;
              }, [])
              .map((p, i) =>
                typeof p === "string" ? (
                  <span key={`e${i}`} className="px-2 text-muted-foreground">...</span>
                ) : (
                  <button
                    key={p}
                    onClick={() => setCurrentPage(p)}
                    className={`min-w-[36px] h-9 rounded-lg text-sm font-medium transition-colors ${
                      currentPage === p ? "gradient-gold text-secondary-foreground" : "border border-border text-foreground hover:bg-muted"
                    }`}
                  >
                    {p}
                  </button>
                )
              )}
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="px-3 py-2 rounded-lg border border-border text-sm font-medium text-foreground hover:bg-muted transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      )}

    </DashboardLayout>
  );
};

export default SupervisorAssignments;
