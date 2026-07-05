import DashboardLayout from "@/components/DashboardLayout";
import { CheckCircle, XCircle, Loader2, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { apiFetch } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

interface PendingThesisStep {
  id: string;
  status: string;
  note?: string;
  student_id: string;
  index_number: string;
  first_name: string;
  last_name: string;
  program_name: string;
}

const ThesisClearance = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [steps, setSteps] = useState<PendingThesisStep[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const [rejectModal, setRejectModal] = useState<{ stepId: string; name: string } | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const load = async () => {
    try {
      const data = await apiFetch<PendingThesisStep[]>("/clearance/supervisor/pending");
      setSteps(data || []);
    } catch {
      toast({ title: "Failed to load", description: "Could not fetch pending thesis clearances", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleApprove = async (stepId: string) => {
    setProcessing(stepId);
    try {
      await apiFetch(`/clearance/${stepId}/approve`, {
        method: "PUT",
        body: JSON.stringify({ cleared_by: user?.name }),
      });
      toast({ title: "Thesis Step Approved" });
      setSteps(prev => prev.filter(s => s.id !== stepId));
    } catch (err: any) {
      toast({ title: "Failed", description: err.message, variant: "destructive" });
    } finally {
      setProcessing(null);
    }
  };

  const handleReject = async (stepId: string, reason: string) => {
    setProcessing(stepId);
    try {
      await apiFetch(`/clearance/${stepId}/reject`, {
        method: "PUT",
        body: JSON.stringify({ reason: reason || `Rejected by ${user?.name}` }),
      });
      toast({ title: "Thesis Step Rejected" });
      setRejectModal(null);
      setRejectReason("");
      setSteps(prev => prev.filter(s => s.id !== stepId));
    } catch (err: any) {
      toast({ title: "Failed", description: err.message, variant: "destructive" });
    } finally {
      setProcessing(null);
    }
  };

  return (
    <DashboardLayout>
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-1">
          <ShieldCheck size={17} className="text-secondary-foreground" />
          <span className="text-xs font-semibold uppercase tracking-widest text-secondary-foreground">Supervisor</span>
        </div>
        <h1 className="text-3xl font-bold font-display text-foreground">Thesis Clearance</h1>
        <p className="text-muted-foreground mt-1">Students awaiting your thesis submission approval</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24 text-muted-foreground text-sm">
          <Loader2 size={18} className="animate-spin mr-2" /> Loading...
        </div>
      ) : steps.length === 0 ? (
        <div className="bg-card rounded-xl border border-border p-16 text-center">
          <CheckCircle size={40} className="mx-auto text-success mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">All clear</h3>
          <p className="text-sm text-muted-foreground">No students are currently awaiting thesis clearance approval.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {steps.map(step => {
            const isProcessing = processing === step.id;
            return (
              <div key={step.id} className="bg-card rounded-xl border border-border p-5 flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-sm font-bold text-muted-foreground shrink-0">
                  {step.first_name?.[0]}{step.last_name?.[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground">{step.first_name} {step.last_name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{step.index_number} · {step.program_name || "—"}</p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button
                    onClick={() => handleApprove(step.id)}
                    disabled={isProcessing}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-success/10 text-success text-xs font-medium hover:bg-success/20 transition-colors disabled:opacity-50 border border-success/30"
                  >
                    {isProcessing ? <Loader2 size={11} className="animate-spin" /> : <CheckCircle size={11} />}
                    Approve
                  </button>
                  <button
                    onClick={() => { setRejectModal({ stepId: step.id, name: `${step.first_name} ${step.last_name}` }); setRejectReason(""); }}
                    disabled={isProcessing}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-destructive/30 text-destructive text-xs font-medium hover:bg-destructive/10 transition-colors disabled:opacity-50"
                  >
                    <XCircle size={11} /> Reject
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {rejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-card rounded-xl border border-border p-6 w-full max-w-md shadow-xl">
            <h3 className="text-base font-semibold text-foreground mb-1">Reject Thesis Submission</h3>
            <p className="text-xs text-muted-foreground mb-4">
              Provide a reason for rejecting <strong>{rejectModal.name}</strong>'s thesis submission. They will be notified.
            </p>
            <textarea
              value={rejectReason}
              onChange={e => setRejectReason(e.target.value)}
              placeholder="e.g. Thesis not yet in final bound form"
              rows={3}
              className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none mb-4"
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => { setRejectModal(null); setRejectReason(""); }}
                className="px-4 py-2 rounded-lg border border-border text-sm font-medium text-foreground hover:bg-muted transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleReject(rejectModal.stepId, rejectReason)}
                disabled={processing === rejectModal.stepId}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-destructive text-destructive-foreground text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {processing === rejectModal.stepId ? <Loader2 size={13} className="animate-spin" /> : <XCircle size={13} />}
                Confirm Reject
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};

export default ThesisClearance;
