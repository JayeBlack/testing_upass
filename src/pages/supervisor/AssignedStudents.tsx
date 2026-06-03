import DashboardLayout from "@/components/DashboardLayout";
import { Users, FileText, Clock, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { apiFetch } from "@/lib/api";

interface Student {
  id: string;
  name: string;
  index_number: string;
  program_name: string;
  department_name: string;
}

interface SubmissionStage {
  student_id: string;
  stage: string;
  status: string;
}

const AssignedStudents = () => {
  const { user } = useAuth();
  const [students, setStudents] = useState<Student[]>([]);
  const [stages, setStages] = useState<SubmissionStage[]>([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        // Fetch assigned students from backend - need to map user.id to supervisor record id first
        const supervisors = await apiFetch<any[]>("/supervisors");
        const currentSupervisor = supervisors.find((s: any) => String(s.user_id) === String(user?.id));
        
        if (!currentSupervisor) {
          setLoading(false);
          return;
        }

        const data = await apiFetch<Student[]>(`/supervisors/${currentSupervisor.id}/students`);
        setStudents(data || []);

        if (data && data.length > 0) {
          const ids = data.map((s) => s.id);

          // Fetch latest submission stage per student from Supabase
          const { data: subs } = await supabase
            .from("thesis_submissions")
            .select("student_id, stage, status")
            .in("student_id", ids)
            .order("submitted_at", { ascending: false });

          setStages(subs || []);
          setPendingCount((subs || []).filter((s) => s.status === "Pending").length);
        }
      } catch {
        // backend not reachable — leave empty
      } finally {
        setLoading(false);
      }
    };
    if (user?.id) load();

    // Real-time subscription
    const channel = supabase
      .channel('student_submissions_changes')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'thesis_submissions' },
        () => { if (user?.id) load(); }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user?.id]);

  const latestStage = (studentId: string) => {
    const sub = stages.find((s) => s.student_id === studentId);
    return sub?.stage ?? "Not started";
  };

  return (
    <DashboardLayout>
      <div className="mb-8">
        <h1 className="text-3xl font-bold font-display text-foreground">Assigned Students</h1>
        <p className="text-muted-foreground mt-1">Students under your supervision</p>
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
            <p className="text-2xl font-bold font-display text-foreground">{loading ? "—" : pendingCount}</p>
            <p className="text-xs text-muted-foreground">Pending Reviews</p>
          </div>
        </div>
        <div className="bg-card rounded-xl border border-border p-5 flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
            <Clock size={18} className="text-muted-foreground" />
          </div>
          <div>
            <p className="text-2xl font-bold font-display text-foreground">
              {loading ? "—" : students.filter((s) => {
                const studentSubs = stages.filter((st) => st.student_id === s.id);
                return !studentSubs.some((st) => st.status === "Approved");
              }).length}
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
                  <td className="px-6 py-4 text-sm text-muted-foreground">{s.program_name}</td>
                  <td className="px-6 py-4 text-sm text-foreground">{latestStage(s.id)}</td>
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
