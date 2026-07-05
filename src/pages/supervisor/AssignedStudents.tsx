import DashboardLayout from "@/components/DashboardLayout";
import { Users, FileText, Clock, Loader2 } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { apiFetch } from "@/lib/api";

interface Student {
  id: number;
  name: string;
  index_number: string;
  program_name: string;
  department_name: string;
}

interface Submission {
  id: number;
  student_id: number;
  stage: string;
  status: string;
  submitted_at: string;
}

const AssignedStudents = () => {
  const { user } = useAuth();
  const [students, setStudents] = useState<Student[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const studentsRef = useRef<Student[]>([]);
  const studentIdsRef = useRef<number[]>([]);

  const fetchSubmissions = useCallback(async () => {
    const ids = studentIdsRef.current;
    if (ids.length === 0) { setSubmissions([]); return; }
    try {
      const allSubs = await apiFetch<any[]>("/thesis/pending");
      const filtered = allSubs.filter((s: any) => ids.includes(s.student_id));
      setSubmissions(filtered);
    } catch {
      setSubmissions([]);
    }
  }, []);

  useEffect(() => {
    if (!user?.id) return;
    const load = async () => {
      setLoading(true);
      try {
        const supervisorData = await apiFetch<any>("/supervisors/current/submissions");
        const list: Student[] = supervisorData.students || [];
        const ids: number[] = supervisorData.studentIds || [];
        studentsRef.current = list;
        studentIdsRef.current = ids;
        setStudents(list);
        await fetchSubmissions();
      } catch {
        // backend not reachable
      } finally {
        setLoading(false);
      }
    };
    load();

    // Poll for updates every 10 seconds
    const interval = setInterval(() => {
      fetchSubmissions();
    }, 10000);

    return () => clearInterval(interval);
  }, [user?.id, fetchSubmissions]);

  const pendingCount = submissions.filter((s) => s.status === "Pending").length;
  const awaitingApproval = submissions.filter((s) => s.status === "Reviewed" || s.status === "Awaiting Approval").length;

  const latestStage = useCallback((studentId: number) => {
    const studentSubs = submissions.filter((s) => s.student_id === studentId);
    
    if (studentSubs.length === 0) return "Not started";
    
    // Sort by date descending (most recent first)
    const sorted = studentSubs.sort((a, b) => {
      const dateA = new Date(a.submitted_at).getTime();
      const dateB = new Date(b.submitted_at).getTime();
      return dateB - dateA;
    });
    
    const latest = sorted[0];
    return `${latest.stage} — ${latest.status}`;
  }, [submissions]);

  return (
    <DashboardLayout>
      <div className="mb-8">
        <div>
          <div>
            <h1 className="text-3xl font-bold font-display text-foreground">Assigned Students</h1>
            <p className="text-muted-foreground mt-1">Students under your supervision</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-8">
        <div className="bg-card rounded-xl border border-border p-5 flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg gradient-gold flex items-center justify-center">
            <Users size={18} className="text-secondary-foreground" />
          </div>
          <div>
            <p className="text-2xl font-bold font-display text-foreground">{loading ? "—" : students.length}</p>
            <p className="text-xs text-muted-foreground">Total Students</p>
          </div>
        </div>
        <div className="bg-card rounded-xl border border-border p-5 flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
            <FileText size={18} className="text-muted-foreground" />
          </div>
          <div>
            <p className="text-2xl font-bold font-display text-foreground">
              {loading ? "—" : pendingCount}
            </p>
            <p className="text-xs text-muted-foreground">Pending Reviews</p>
          </div>
        </div>
        <div className="bg-card rounded-xl border border-border p-5 flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
            <Clock size={18} className="text-muted-foreground" />
          </div>
          <div>
            <p className="text-2xl font-bold font-display text-foreground">
              {loading ? "—" : awaitingApproval}
            </p>
            <p className="text-xs text-muted-foreground">Awaiting Approval</p>
          </div>
        </div>
      </div>

      <div className="bg-card rounded-xl border border-border overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16 text-muted-foreground text-sm">
            <Loader2 size={18} className="animate-spin mr-2" /> Loading students...
          </div>
        ) : students.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground text-sm">No students assigned yet.</div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left px-6 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Student</th>
                <th className="text-left px-6 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Index</th>
                <th className="text-left px-6 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Program</th>
                <th className="text-left px-6 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Current Stage</th>
              </tr>
            </thead>
            <tbody>
              {students.map((s) => (
                <tr key={s.id} className="border-b border-border last:border-0 hover:bg-muted/50 transition-colors">
                  <td className="px-6 py-4 text-sm font-medium text-foreground">{s.name}</td>
                  <td className="px-6 py-4 text-sm font-mono text-muted-foreground">{s.index_number}</td>
                  <td className="px-6 py-4 text-sm text-muted-foreground">{s.program_name || "N/A"}</td>
                  <td className="px-6 py-4 text-sm text-foreground">
                    <span className={`inline-flex items-center gap-1.5 ${
                      latestStage(s.id).includes("Pending") ? "text-warning" :
                      latestStage(s.id).includes("Approved") ? "text-success" :
                      latestStage(s.id).includes("Rejected") ? "text-destructive" :
                      latestStage(s.id).includes("Reviewed") ? "text-blue-500" :
                      "text-muted-foreground"
                    }`}>
                      {latestStage(s.id)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </DashboardLayout>
  );
};

export default AssignedStudents;
