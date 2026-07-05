import DashboardLayout from "@/components/DashboardLayout";
import {
  CheckCircle, XCircle, Clock, Search, Loader2, ShieldCheck,
  Users, ListChecks, ChevronDown, ChevronUp, AlertTriangle
} from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import { useToast } from "@/hooks/use-toast";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";

interface ClearanceStep {
  id: string;
  department: string;
  description: string;
  status: "cleared" | "not_started" | "pending";
  cleared_by?: string;
  cleared_at?: string;
  note?: string;
  step_order: number;
}

interface StudentClearance {
  student_id: string;
  index_number: string;
  first_name: string;
  last_name: string;
  program_name: string;
  department_name: string;
  steps: ClearanceStep[];
}

// Colour + icon config per clearance department
const STEP_META: Record<string, { color: string; bg: string; border: string; abbr: string }> = {
  "School Fees":          { color: "text-amber-700",   bg: "bg-amber-50",   border: "border-amber-200",  abbr: "FEES" },
  "Library":              { color: "text-blue-700",    bg: "bg-blue-50",    border: "border-blue-200",   abbr: "LIB"  },
  "Department":           { color: "text-violet-700",  bg: "bg-violet-50",  border: "border-violet-200", abbr: "DEPT" },
  "Thesis Submission":    { color: "text-indigo-700",  bg: "bg-indigo-50",  border: "border-indigo-200", abbr: "THES" },
  "ICT Directorate":      { color: "text-cyan-700",    bg: "bg-cyan-50",    border: "border-cyan-200",   abbr: "ICT"  },
  "Dean of Postgraduate": { color: "text-secondary-foreground", bg: "bg-secondary/10", border: "border-secondary/30", abbr: "DEAN" },
};

const allCleared = (steps: ClearanceStep[]) => steps.length > 0 && steps.every(s => s.status === "cleared");
const nonDeanCleared = (steps: ClearanceStep[]) =>
  steps.filter(s => s.department !== "Dean of Postgraduate").every(s => s.status === "cleared");

const StepBadge = ({ step }: { step: ClearanceStep }) => {
  const dept = step.department ?? "Unknown";
  const meta = STEP_META[dept] ?? { color: "text-foreground", bg: "bg-muted", border: "border-border", abbr: dept.slice(0, 4).toUpperCase() };
  const cleared = step.status === "cleared";
  return (
    <div
      title={`${step.department}${cleared ? ` — Cleared by ${step.cleared_by}` : step.note ? ` — ${step.note}` : ""}`}
      className={`relative flex flex-col items-center justify-center w-14 h-14 rounded-xl border-2 transition-all
        ${cleared
          ? "bg-success/10 border-success/40"
          : `${meta.bg} ${meta.border} opacity-60`
        }`}
    >
      <span className={`text-[10px] font-bold tracking-wide ${cleared ? "text-success" : meta.color}`}>
        {meta.abbr}
      </span>
      <span className="mt-0.5">
        {cleared
          ? <CheckCircle size={14} className="text-success" />
          : <XCircle size={14} className="text-muted-foreground/50" />
        }
      </span>
    </div>
  );
};

const ClearanceApprovals = () => {
  const { user } = useAuth();
  const { toast } = useToast();

  const [students, setStudents] = useState<StudentClearance[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [programFilter, setProgramFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all"); // all | pending | complete | dean_ready

  // Default Dean/ViceDean to dean_ready filter after user loads
  useEffect(() => {
    if (user?.role === "Dean" || user?.role === "ViceDean") {
      setStatusFilter("dean_ready");
    }
  }, [user?.role]);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [selected, setSelected] = useState<Set<string>>(new Set()); // step ids for bulk
  const [bulkMode, setBulkMode] = useState(false);
  const [processing, setProcessing] = useState<string | null>(null);
  const [bulkLoading, setBulkLoading] = useState(false);

  const isDean = user?.role === "Dean" || user?.role === "ViceDean";
  const isAccountant = user?.role === "Accountant" || user?.role === "AccountingAssistant";
  const isRegistrar = user?.role === "Registrar" || user?.role === "AdminAssistant";

  // Reject reason modal state
  const [rejectModal, setRejectModal] = useState<{ stepId: string; department: string } | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const data = await apiFetch<StudentClearance[]>("/clearance/all-students");
      // Only include students that have clearance steps initialised
      setStudents((data || []).filter(s => s.steps && s.steps.length > 0));
    } catch {
      toast({ title: "Failed to load", description: "Could not fetch clearance data", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const programs = useMemo(() => [...new Set(students.map(s => s.program_name).filter(Boolean))].sort(), [students]);

  const filtered = useMemo(() => {
    return students.filter(s => {
      const name = `${s.first_name} ${s.last_name}`.toLowerCase();
      const matchSearch = name.includes(search.toLowerCase()) || s.index_number.toLowerCase().includes(search.toLowerCase());
      const matchProgram = programFilter === "all" || s.program_name === programFilter;
      const matchStatus =
        statusFilter === "all" ? true :
        statusFilter === "complete" ? allCleared(s.steps) :
        statusFilter === "dean_ready" ? (nonDeanCleared(s.steps) && !allCleared(s.steps)) :
        statusFilter === "pending" ? !allCleared(s.steps) : true;
      return matchSearch && matchProgram && matchStatus;
    });
  }, [students, search, programFilter, statusFilter]);

  const stats = useMemo(() => ({
    total: students.length,
    fullyCleared: students.filter(s => allCleared(s.steps)).length,
    deanReady: students.filter(s => nonDeanCleared(s.steps) && !allCleared(s.steps)).length,
    pending: students.filter(s => !allCleared(s.steps)).length,
  }), [students]);

  const toggleExpand = (id: string) => setExpanded(prev => {
    const n = new Set(prev);
    n.has(id) ? n.delete(id) : n.add(id);
    return n;
  });

  const handleApprove = async (stepId: string, studentId: string) => {
    setProcessing(stepId);
    try {
      await apiFetch(`/clearance/${stepId}/approve`, {
        method: "PUT",
        body: JSON.stringify({ cleared_by: user?.name }),
      });
      toast({ title: "Step Approved" });
      load();
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
      toast({ title: "Step Rejected" });
      setRejectModal(null);
      setRejectReason("");
      load();
    } catch (err: any) {
      toast({ title: "Failed", description: err.message, variant: "destructive" });
    } finally {
      setProcessing(null);
    }
  };

  const handleBulkApprove = async () => {
    if (selected.size === 0) return;
    setBulkLoading(true);
    try {
      const res = await apiFetch<{ approved: number; errors?: string[] }>("/clearance/bulk-approve", {
        method: "POST",
        body: JSON.stringify({ step_ids: [...selected], cleared_by: user?.name }),
      });
      toast({
        title: `${res.approved} steps approved`,
        description: res.errors?.length ? `${res.errors.length} skipped (Dean gate or already cleared)` : undefined,
      });
      setSelected(new Set());
      setBulkMode(false);
      load();
    } catch (err: any) {
      toast({ title: "Bulk approve failed", description: err.message, variant: "destructive" });
    } finally {
      setBulkLoading(false);
    }
  };

  // Determine which steps a user can act on
  const canActOnStep = (step: ClearanceStep) => {
    if (step.status === "cleared") return false;
    if (isDean) return step.department === "Dean of Postgraduate";
    if (isAccountant) return step.department === "School Fees";
    if (isRegistrar) return ["Library", "Department", "ICT Directorate"].includes(step.department);
    // Admin can act on all non-Dean steps
    return step.department !== "Dean of Postgraduate";
  };

  const toggleSelectStep = (stepId: string) => {
    setSelected(prev => {
      const n = new Set(prev);
      n.has(stepId) ? n.delete(stepId) : n.add(stepId);
      return n;
    });
  };

  const selectAllVisible = () => {
    const ids = filtered.flatMap(s => s.steps.filter(st => canActOnStep(st)).map(st => st.id));
    setSelected(new Set(ids));
  };

  return (
    <DashboardLayout>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <ShieldCheck size={17} className="text-secondary-foreground" />
            <span className="text-xs font-semibold uppercase tracking-widest text-secondary-foreground">
              {isDean ? "Dean's Office" : "Admin"}
            </span>
          </div>
          <h1 className="text-3xl font-bold font-display text-foreground">Clearance Approvals</h1>
          <p className="text-muted-foreground mt-1">Review and approve student graduation clearance requests</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => { setBulkMode(b => !b); setSelected(new Set()); }}
            className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border text-sm font-medium transition-colors ${bulkMode ? "bg-secondary/10 border-secondary/40 text-secondary-foreground" : "border-border text-foreground hover:bg-muted"}`}
          >
            <ListChecks size={15} /> {bulkMode ? "Cancel Bulk" : "Bulk Approve"}
          </button>
          {bulkMode && selected.size > 0 && (
            <button
              onClick={handleBulkApprove}
              disabled={bulkLoading}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg gradient-gold text-secondary-foreground text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {bulkLoading ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle size={14} />}
              Approve {selected.size} Selected
            </button>
          )}
          {bulkMode && (
            <button onClick={selectAllVisible} className="px-4 py-2.5 rounded-lg border border-border text-sm font-medium text-foreground hover:bg-muted transition-colors">
              Select All Visible
            </button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        {[
          { label: "Total Students", value: stats.total, icon: <Users size={18} className="text-muted-foreground" />, active: false },
          { label: "Fully Cleared", value: stats.fullyCleared, icon: <CheckCircle size={18} className="text-success" />, active: statusFilter === "complete" },
          { label: "Dean Ready", value: stats.deanReady, icon: <ShieldCheck size={18} className="text-secondary-foreground" />, active: statusFilter === "dean_ready" },
          { label: "Pending", value: stats.pending, icon: <Clock size={18} className="text-warning" />, active: statusFilter === "pending" },
        ].map(({ label, value, icon, active }) => (
          <button
            key={label}
            onClick={() => setStatusFilter(
              label === "Fully Cleared" ? (statusFilter === "complete" ? "all" : "complete") :
              label === "Dean Ready" ? (statusFilter === "dean_ready" ? "all" : "dean_ready") :
              label === "Pending" ? (statusFilter === "pending" ? "all" : "pending") : "all"
            )}
            className={`bg-card rounded-xl border p-4 text-left transition-all hover:shadow-sm ${active ? "border-secondary/50 shadow-sm" : "border-border"}`}
          >
            <div className="flex items-center gap-3">
              {icon}
              <div>
                <p className="text-2xl font-bold font-display text-foreground">{value}</p>
                <p className="text-xs text-muted-foreground">{label}</p>
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by name or index number…"
            className="w-full pl-11 pr-4 py-2.5 rounded-lg border border-input bg-card text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <select
          value={programFilter}
          onChange={e => setProgramFilter(e.target.value)}
          className="px-4 py-2.5 rounded-lg border border-input bg-card text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="all">All Programmes</option>
          {programs.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="px-4 py-2.5 rounded-lg border border-input bg-card text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="all">All Statuses</option>
          <option value="pending">Pending</option>
          <option value="dean_ready">Ready for Dean</option>
          <option value="complete">Fully Cleared</option>
        </select>
      </div>

      {/* Dean notice */}
      {isDean && (
        <div className="flex items-start gap-3 bg-secondary/5 border border-secondary/20 rounded-xl px-4 py-3 mb-6">
          <AlertTriangle size={16} className="text-secondary-foreground mt-0.5 shrink-0" />
          <p className="text-sm text-secondary-foreground">
            As Dean, you can only give final approval once <strong>all other steps</strong> have been cleared. Students with green badges across all departments (except Dean) are ready for your approval.
          </p>
        </div>
      )}

      {/* Student list */}
      {loading ? (
        <div className="flex items-center justify-center py-24 text-muted-foreground text-sm">
          <Loader2 size={18} className="animate-spin mr-2" /> Loading clearance data...
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-card rounded-xl border border-border p-16 text-center">
          <Users size={36} className="mx-auto text-muted-foreground mb-3" />
          <p className="text-sm text-muted-foreground">No students match your filters</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(student => {
            const isExpanded = expanded.has(student.student_id);
            const fullyDone = allCleared(student.steps);
            const readyForDean = nonDeanCleared(student.steps) && !fullyDone;
            const deanStep = student.steps.find(s => s.department === "Dean of Postgraduate");
            const clearedCount = student.steps.filter(s => s.status === "cleared").length;

            return (
              <div key={student.student_id} className={`bg-card rounded-xl border transition-all ${fullyDone ? "border-success/30" : readyForDean ? "border-secondary/30" : "border-border"}`}>
                {/* Card header */}
                <div className="flex items-center gap-4 px-5 py-4">
                  {/* Bulk select */}
                  {bulkMode && (
                    <div className="shrink-0 flex flex-col gap-1">
                      {student.steps.filter(st => canActOnStep(st)).map(st => (
                        <label key={st.id} className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer">
                          <input
                            type="checkbox"
                            checked={selected.has(st.id)}
                            onChange={() => toggleSelectStep(st.id)}
                            className="w-3.5 h-3.5 rounded border-input"
                          />
                          {st.department}
                        </label>
                      ))}
                      {student.steps.filter(st => canActOnStep(st)).length === 0 && (
                        <span className="text-xs text-muted-foreground/50 italic">No steps</span>
                      )}
                    </div>
                  )}

                  {/* Avatar */}
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${fullyDone ? "gradient-gold text-secondary-foreground" : "bg-muted text-muted-foreground"}`}>
                    {(student.first_name?.[0] ?? "?")}{(student.last_name?.[0] ?? "")}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold text-foreground">{student.first_name} {student.last_name}</p>
                      {fullyDone && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-success/10 text-success uppercase tracking-wide">Fully Cleared</span>
                      )}
                      {readyForDean && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-secondary/10 text-secondary-foreground uppercase tracking-wide">Dean Ready</span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {student.index_number} · {student.program_name || student.department_name || "—"}
                    </p>
                    {/* Progress bar */}
                    <div className="mt-2 flex items-center gap-2">
                      <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${fullyDone ? "gradient-gold" : "bg-primary/40"}`}
                          style={{ width: `${student.steps.length > 0 ? Math.round((clearedCount / student.steps.length) * 100) : 0}%` }}
                        />
                      </div>
                      <span className="text-[10px] text-muted-foreground whitespace-nowrap">{clearedCount}/{student.steps.length}</span>
                    </div>
                  </div>

                  {/* Step badges */}
                  <div className="hidden sm:flex items-center gap-1.5 shrink-0">
                    {student.steps.map(step => <StepBadge key={step.id} step={step} />)}
                  </div>

                  {/* Expand toggle */}
                  <button onClick={() => toggleExpand(student.student_id)} className="p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground shrink-0">
                    {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </button>
                </div>

                {/* Expanded detail */}
                {isExpanded && (
                  <div className="border-t border-border px-5 py-4">
                    <div className="grid gap-2">
                      {student.steps.map(step => {
                        const cleared = step.status === "cleared";
                        const isDeanStep = step.department === "Dean of Postgraduate";
                        const deanBlocked = isDeanStep && !nonDeanCleared(student.steps);
                        const canAct = canActOnStep(step);
                        const isProcessing = processing === step.id;

                        return (
                          <div key={step.id} className={`flex items-center gap-3 rounded-lg px-4 py-3 border ${cleared ? "bg-success/5 border-success/20" : deanBlocked ? "bg-muted/30 border-border opacity-60" : "bg-muted/20 border-border"}`}>
                            {/* Status icon */}
                            <div className="shrink-0">
                              {cleared
                                ? <CheckCircle size={16} className="text-success" />
                                : deanBlocked
                                  ? <AlertTriangle size={16} className="text-muted-foreground/50" />
                                  : <XCircle size={16} className="text-destructive/50" />
                              }
                            </div>

                            {/* Step info */}
                            <div className="flex-1 min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <p className="text-sm font-medium text-foreground">{step.department}</p>
                                {isDeanStep && <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-secondary/10 text-secondary-foreground uppercase">Final</span>}
                              </div>
                              <p className="text-xs text-muted-foreground">{step.description}</p>
                              {cleared && step.cleared_by && (
                                <p className="text-xs text-success/80 mt-0.5">
                                  ✓ Cleared by {step.cleared_by}{step.cleared_at ? ` · ${new Date(step.cleared_at).toLocaleDateString()}` : ""}
                                </p>
                              )}
                              {step.note && !cleared && (
                                <p className="text-xs text-warning mt-0.5">⚠ {step.note}</p>
                              )}
                              {deanBlocked && (
                                <p className="text-xs text-muted-foreground mt-0.5 italic">Waiting for other steps to be cleared first</p>
                              )}
                            </div>

                            {/* Actions */}
                            {canAct && !cleared && !deanBlocked && (
                              <div className="flex gap-2 shrink-0">
                                <button
                                  onClick={() => handleApprove(step.id, student.student_id)}
                                  disabled={isProcessing}
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-success/10 text-success text-xs font-medium hover:bg-success/20 transition-colors disabled:opacity-50 border border-success/30"
                                >
                                  {isProcessing ? <Loader2 size={11} className="animate-spin" /> : <CheckCircle size={11} />}
                                  Approve
                                </button>
                                <button
                                  onClick={() => { setRejectModal({ stepId: step.id, department: step.department }); setRejectReason(""); }}
                                  disabled={isProcessing}
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-destructive/30 text-destructive text-xs font-medium hover:bg-destructive/10 transition-colors disabled:opacity-50"
                                >
                                  <XCircle size={11} /> Reject
                                </button>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
      {/* Reject reason modal */}
      {rejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-card rounded-xl border border-border p-6 w-full max-w-md shadow-xl">
            <h3 className="text-base font-semibold text-foreground mb-1">Reject Step</h3>
            <p className="text-xs text-muted-foreground mb-4">
              Provide a reason for rejecting <strong>{rejectModal.department}</strong>. The student will be notified.
            </p>
            <textarea
              value={rejectReason}
              onChange={e => setRejectReason(e.target.value)}
              placeholder="e.g. Outstanding library fines not cleared"
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

export default ClearanceApprovals;
