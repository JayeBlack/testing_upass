import DashboardLayout from "@/components/DashboardLayout";
import { MessageSquare, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";

interface FeedbackRecord {
  id: string;
  student_name: string;
  stage: string;
  feedback: string;
  reviewed_at: string;
}

const Remarks = () => {
  const [records, setRecords] = useState<FeedbackRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const data = await apiFetch<FeedbackRecord[]>("/thesis/remarks");
        setRecords(data || []);
      } catch {
        setRecords([]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

  return (
    <DashboardLayout>
      <div className="mb-8">
        <h1 className="text-3xl font-bold font-display text-foreground">Remarks & Feedback</h1>
        <p className="text-muted-foreground mt-1">Feedback you have submitted on student submissions</p>
      </div>

      <div className="bg-card rounded-xl border border-border p-6">
        <h2 className="font-display text-lg font-bold text-foreground mb-4">Feedback History</h2>
        {loading ? (
          <div className="flex items-center justify-center py-12 text-muted-foreground text-sm">
            <Loader2 size={18} className="animate-spin mr-2" /> Loading...
          </div>
        ) : records.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-12">
            No feedback submitted yet. Feedback you send from Review Submissions will appear here.
          </p>
        ) : (
          <div className="space-y-4">
            {records.map((r) => (
              <div key={r.id} className="p-4 rounded-lg bg-muted/50 border-l-4 border-secondary">
                <div className="flex items-center gap-2 mb-2">
                  <MessageSquare size={14} className="text-secondary" />
                  <span className="text-sm font-medium text-foreground">{r.student_name} — {r.stage}</span>
                  <span className="text-xs text-muted-foreground ml-auto">{r.reviewed_at ? formatDate(r.reviewed_at) : ""}</span>
                </div>
                <p className="text-sm text-muted-foreground">{r.feedback}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Remarks;
