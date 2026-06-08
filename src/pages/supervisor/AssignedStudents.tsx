import DashboardLayout from "@/components/DashboardLayout";
import { Users, FileText, Clock, Loader2 } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
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
  student_index: string;
  stage: string;
  status: string;
}

const AssignedStudents = () => {
  const { user } = useAuth();
  const [students, setStudents] = useState<Student[]>([]);
  const [stages, setStages] = useState<SubmissionStage[]>([]);
  const [loading, setLoading] = useState(true);
  const studentsRef = useRef<Student[]>([]);

  const fetchStages = useCallback(async () => {
    const list = studentsRef.current;
    if (list.length === 0) { setStages([]); return; }
    const assignedIndexSet = new Set(
      list.map((s) => s.index_number?.trim().toLowerCase()).filter(Boolean)
    );
    const { data: subs } = await supabase
      .from("thesis_submissions")
      .select("student_index, stage, status")
      .order("submitted_at", { ascending: false });
    const filtered = (subs || []).filter((s: any) =>
      assignedIndexSet.has(s.student_index?.trim().toLowerCase())
    );
    setStages(filtered);
  }, []);

  useEffect(() => {
    if (!user?.id) return;
    const load = async () => {
      setLoading(true);
      try {
        const supervisorStudents = await apiFetch<any>("/supervisors/current/submissions");
        const list: Student[] = supervisorStudents.students || [];
        studentsRef.current = list;
        setStudents(list);
        await fetchStages();
      } catch {
        // backend not reachable
      } finally {
        setLoading(false);
      }
    };
    load();

    const channel = supabase
      .channel("assigned_students_stages")
      .on("postgres_changes",
        { event: "*", schema: "public", table: "thesis_submissions" },
        () => fetchStages()
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user?.id, fetchStages]);

  const latestStage = (indexNumber: string) => {
    const sub = stages.find((s) => s.student_index?.trim().toLowerCase() === indexNumber?.trim().toLowerCase());
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
            <p className="text-2xl font-bold font-display text-foreground">
              {loading ? "—" : stages.filter((s) => s.status === "Pending").length}
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
              {loading ? "—" : stages.filter((s) => s.status !== "Approved" && s.status !== "Rejected").length}
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
                  <td className="px-6 py-4 text-sm text-foreground">{latestStage(s.index_number)}</td>
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
