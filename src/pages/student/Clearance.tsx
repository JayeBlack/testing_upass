import DashboardLayout from "@/components/DashboardLayout";
import { CheckCircle, Clock, XCircle, Loader2, FileText } from "lucide-react";
import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { apiFetch } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

interface ClearanceStep {
  id: string;
  department: string;
  description: string;
  status: "cleared" | "pending" | "not_started";
  cleared_by?: string;
  cleared_at?: string;
  note?: string;
  step_order: number;
}

const statusConfig = {
  cleared:     { icon: <CheckCircle size={18} />, label: "Cleared",     className: "text-success bg-success/10" },
  pending:     { icon: <Clock size={18} />,       label: "Pending",     className: "text-warning bg-warning/10" },
  not_started: { icon: <XCircle size={18} />,     label: "Not Started", className: "text-muted-foreground bg-muted" },
};

const Clearance = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [steps, setSteps] = useState<ClearanceStep[]>([]);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);
  const [studentId, setStudentId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const me = await apiFetch<any>("/students/me");
        if (!me?.id) { setLoading(false); return; }
        setStudentId(me.id);

        let data = await apiFetch<ClearanceStep[]>(`/clearance/student/${me.id}`);
        if (!data || data.length === 0) {
          await apiFetch(`/clearance/init/${me.id}`, { method: "POST" });
          data = await apiFetch<ClearanceStep[]>(`/clearance/student/${me.id}`);
        }
        setSteps(data || []);
      } catch {
        // backend offline
      } finally {
        setLoading(false);
      }
    })();
  }, [user?.id]);

  const completedCount = steps.filter((s) => s.status === "cleared").length;
  const progress = steps.length > 0 ? Math.round((completedCount / steps.length) * 100) : 0;
  const allCleared = steps.length > 0 && steps.every(s => s.status === "cleared");
  const hasApplied = steps.some(s => s.status === "pending" || s.status === "cleared");
  const canApply = steps.length > 0 && !hasApplied;

  const handleApply = async () => {
    if (!studentId) return;
    setApplying(true);
    try {
      await apiFetch(`/clearance/apply/${studentId}`, { method: "POST" });
      const data = await apiFetch<ClearanceStep[]>(`/clearance/student/${studentId}`);
      setSteps(data || []);
      toast({ title: "Application Submitted", description: "Your clearance steps are now pending review." });
    } catch (err: any) {
      toast({ title: "Failed", description: err.message, variant: "destructive" });
    } finally {
      setApplying(false);
    }
  };

  const handleDownloadCertificate = async () => {
    const { default: jsPDF } = await import("jspdf");
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const pageW = doc.internal.pageSize.getWidth();

    // Header
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("UNIVERSITY OF MINES AND TECHNOLOGY", pageW / 2, 25, { align: "center" });
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text("School of Postgraduate Studies — Tarkwa", pageW / 2, 32, { align: "center" });

    // Divider
    doc.setDrawColor(180, 150, 50);
    doc.setLineWidth(0.8);
    doc.line(20, 37, pageW - 20, 37);

    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text("GRADUATION CLEARANCE CERTIFICATE", pageW / 2, 50, { align: "center" });

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text("This is to certify that", pageW / 2, 65, { align: "center" });

    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text(`${user?.name ?? "Student"}`, pageW / 2, 75, { align: "center" });

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text("has successfully completed all graduation clearance requirements", pageW / 2, 85, { align: "center" });
    doc.text("as listed below:", pageW / 2, 91, { align: "center" });

    // Steps list
    let y = 105;
    steps.forEach((step, i) => {
      doc.setFont("helvetica", "bold");
      doc.text(`${i + 1}. ${step.department}`, 30, y);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.text(`   ${step.description}`, 30, y + 5);
      if (step.cleared_by) {
        doc.setTextColor(80, 130, 80);
        doc.text(`   ✓ Cleared by ${step.cleared_by}${step.cleared_at ? ` on ${new Date(step.cleared_at).toLocaleDateString()}` : ""}`, 30, y + 10);
        doc.setTextColor(30, 30, 30);
      }
      doc.setFontSize(10);
      y += 18;
    });

    // Footer
    doc.setDrawColor(180, 150, 50);
    doc.setLineWidth(0.5);
    doc.line(20, y + 10, pageW - 20, y + 10);
    doc.setFontSize(9);
    doc.setFont("helvetica", "italic");
    doc.setTextColor(130, 130, 130);
    doc.text(`Generated: ${new Date().toLocaleString()}`, pageW / 2, y + 17, { align: "center" });

    doc.save(`clearance_certificate_${user?.name?.replace(/\s+/g, "_") ?? "student"}.pdf`);
  };

  return (
    <DashboardLayout>
      <div className="mb-8 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold font-display text-foreground">Graduation Clearance</h1>
          <p className="text-muted-foreground mt-1">Complete all steps to receive your clearance certificate</p>
        </div>
        {allCleared && (
          <button
            onClick={handleDownloadCertificate}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg gradient-gold text-secondary-foreground text-sm font-medium hover:opacity-90 transition-opacity"
          >
            <FileText size={15} /> Download Certificate
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24 text-muted-foreground text-sm">
          <Loader2 size={18} className="animate-spin mr-2" /> Loading clearance status...
        </div>
      ) : steps.length === 0 ? (
        <div className="bg-card rounded-xl border border-border p-16 text-center">
          <CheckCircle size={40} className="mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">No clearance steps found</h3>
          <p className="text-sm text-muted-foreground">Your clearance steps will appear here once initialised by the admin.</p>
        </div>
      ) : (
        <>
          {/* Progress bar */}
          <div className="bg-card rounded-xl border border-border p-5 mb-6">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-medium text-foreground">{completedCount} of {steps.length} steps completed</p>
              <p className="text-sm font-bold text-foreground">{progress}%</p>
            </div>
            <div className="w-full h-3 rounded-full bg-muted overflow-hidden">
              <div className="h-full rounded-full gradient-gold transition-all duration-500" style={{ width: `${progress}%` }} />
            </div>
          </div>

          {/* Apply button */}
          {canApply && (
            <div className="bg-card rounded-xl border border-border p-5 mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-foreground">Ready to apply for clearance?</p>
                <p className="text-xs text-muted-foreground mt-0.5">This will submit your clearance request to all departments for review.</p>
              </div>
              <button
                onClick={handleApply}
                disabled={applying}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg gradient-gold text-secondary-foreground text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50 shrink-0"
              >
                {applying ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle size={14} />}
                Apply for Clearance
              </button>
            </div>
          )}

          {/* Steps */}
          <div className="space-y-3">
            {steps.map((step, i) => {
              const cfg = statusConfig[step.status] ?? statusConfig.not_started;
              return (
                <div key={step.id} className="bg-card rounded-xl border border-border p-4 sm:p-5">
                  <div className="flex items-start gap-4">
                    <div className={`shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold ${
                      step.status === "cleared" ? "gradient-gold text-secondary-foreground" : "bg-muted text-muted-foreground"
                    }`}>
                      {i + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                        <div>
                          <p className="text-sm font-semibold text-foreground">{step.department}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">{step.description}</p>
                        </div>
                        <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1 rounded-full self-start ${cfg.className}`}>
                          {cfg.icon}
                          {cfg.label}
                        </span>
                      </div>
                      {step.cleared_by && (
                        <p className="text-xs text-muted-foreground mt-2">
                          Cleared by <strong className="text-foreground">{step.cleared_by}</strong>
                          {step.cleared_at && ` on ${new Date(step.cleared_at).toLocaleDateString()}`}
                        </p>
                      )}
                      {step.note && step.status !== "cleared" && (
                        <p className="text-xs text-destructive mt-2 flex items-center gap-1">
                          <XCircle size={12} /> {step.note}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </DashboardLayout>
  );
};

export default Clearance;
