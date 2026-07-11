import DashboardLayout from "@/components/DashboardLayout";
import { FileText, CheckCircle, Clock, Eye, Send, ArrowLeft, Bot, XCircle, Loader2, FileWarning, Download } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import AIFeedbackPanel from "@/components/supervisor/AIFeedbackPanel";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { apiFetch, logActivity } from "@/lib/api";
import { resolveSafeAssetUrl } from "@/lib/safe-url";

interface Submission {
  id: string;
  student_id: string;
  student_name: string;
  student_index: string | null;
  stage: string;
  status: string;
  feedback: string | null;
  file_path: string;
  file_name: string;
  submitted_at: string;
}

interface AssignedStudent {
  id: string;
  name: string;
  index_number: string;
}

const ReviewSubmissions = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [assignedStudents, setAssignedStudents] = useState<AssignedStudent[]>([]);
  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [docxHtml, setDocxHtml] = useState<string | null>(null);
  const [docxError, setDocxError] = useState(false);
  const [fileKind, setFileKind] = useState<"pdf" | "docx" | "doc" | "image" | "other" | null>(null);
  const [previewing, setPreviewing] = useState(false);
  const [newRemark, setNewRemark] = useState("");
  const [saving, setSaving] = useState(false);
  const [showAI, setShowAI] = useState(true);

  const loadSubmissions = async () => {
    setLoading(true);
    try {
      // Fetch supervisor's assigned students
      const supervisorStudents = await apiFetch<any>("/supervisors/current/submissions");
      const students = supervisorStudents.students || [];
      const studentIds = supervisorStudents.studentIds || [];
      setAssignedStudents(students);

      // Fetch all submissions from PostgreSQL backend
      const allSubmissionsResult = await apiFetch<any[]>("/thesis/pending");
      const allSubmissions = allSubmissionsResult.map((sub: any) => ({
        id: sub.id.toString(),
        student_id: sub.student_id,
        student_name: `${sub.first_name} ${sub.last_name}`,
        student_index: sub.index_number,
        stage: sub.stage,
        status: sub.status,
        feedback: sub.feedback,
        file_path: sub.file_url,
        file_name: sub.file_name,
        submitted_at: sub.submitted_at,
      }));

      // Build a set of assigned student IDs
      const assignedStudentIds = new Set(studentIds);

      // Filter to only show submissions from assigned students
      const filtered = allSubmissions.filter(sub => assignedStudentIds.has(sub.student_id));

      setSubmissions(filtered);
    } catch (err: any) {
      toast({ title: "Failed to load submissions", description: err.message, variant: "destructive" });
      setSubmissions([]);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadSubmissions();

    // Poll for updates every 30 seconds instead of real-time subscription
    const interval = setInterval(loadSubmissions, 30000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    return () => { 
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const openSubmission = async (sub: Submission) => {
    setSelectedSubmission(sub);
    setNewRemark(sub.feedback || "");
    setPreviewUrl(null);
    setDocxHtml(null);
    setDocxError(false);
    setFileKind(null);
    setPreviewing(true);

    // Mark as Reviewed when opened for the first time
    if (sub.status === "Pending") {
      await apiFetch(`/thesis/${sub.id}/review`, {
        method: "PUT",
        body: JSON.stringify({ status: "Reviewed" }),
      });
      setSelectedSubmission({ ...sub, status: "Reviewed" });
      logActivity("Reviewed submission", "thesis_submission", sub.id, { student: sub.student_name, stage: sub.stage });
    }

    try {
      // file_path is a full Cloudinary URL in production
      const fileUrl = sub.file_path.startsWith("http") ? sub.file_path : `${(import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api').replace('/api', '')}${sub.file_path}`;
      setPreviewUrl(fileUrl);
      const name = sub.file_name.toLowerCase();
      
      if (name.endsWith(".pdf")) setFileKind("pdf");
      else if (name.endsWith(".docx")) setFileKind("docx");
      else if (name.endsWith(".doc")) setFileKind("doc");
      else if (/\.(png|jpe?g|gif|webp|svg)$/.test(name)) setFileKind("image");
      else setFileKind("other");
    } catch (err: any) {
      toast({ title: "Failed to load file", description: err.message, variant: "destructive" });
    } finally {
      setPreviewing(false);
    }
  };

  const downloadFile = async () => {
    if (!selectedSubmission) return;
    try {
      const fileUrl = selectedSubmission.file_path.startsWith("http") ? selectedSubmission.file_path : `${(import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api').replace('/api', '')}${selectedSubmission.file_path}`;
      const safeUrl = resolveSafeAssetUrl(fileUrl, window.location.origin);
      if (!safeUrl) throw new Error("Invalid file URL");
      const response = await fetch(safeUrl);
      if (!response.ok) throw new Error("Failed to fetch file");
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = selectedSubmission.file_name;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => { URL.revokeObjectURL(blobUrl); document.body.removeChild(a); }, 500);
    } catch (err: any) {
      toast({ title: "Download failed", description: err.message, variant: "destructive" });
    }
  };

  const submitReview = async (status: "Approved" | "Rejected") => {
    if (!selectedSubmission) return;
    setSaving(true);
    try {
      await apiFetch(`/thesis/${selectedSubmission.id}/review`, {
        method: "PUT",
        body: JSON.stringify({ status }),
      });
      
      // Update feedback if provided
      if (newRemark.trim()) {
        await apiFetch(`/thesis/${selectedSubmission.id}/remarks`, {
          method: "POST",
          body: JSON.stringify({ remark_text: newRemark.trim() }),
        });
      }
      
      toast({ title: `Submission ${status.toLowerCase()}` });
      logActivity(`${status} submission`, "thesis_submission", selectedSubmission.id, { student: selectedSubmission.student_name, stage: selectedSubmission.stage });
      await loadSubmissions();
      setSelectedSubmission(null);
      setNewRemark("");
    } catch (err: any) {
      toast({ title: "Save failed", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const sendFeedbackOnly = async () => {
    if (!selectedSubmission || !newRemark.trim()) return;
    setSaving(true);
    try {
      await apiFetch(`/thesis/${selectedSubmission.id}/remarks`, {
        method: "POST",
        body: JSON.stringify({ remark_text: newRemark.trim() }),
      });
      toast({ title: "Feedback sent" });
      logActivity("Sent feedback", "thesis_submission", selectedSubmission.id, { student: selectedSubmission.student_name, stage: selectedSubmission.stage });
      await loadSubmissions();
      setSelectedSubmission(null);
      setNewRemark("");
    } catch (err: any) {
      toast({ title: "Save failed", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

  // ── Detail view ──
  if (selectedSubmission) {
    return (
      <DashboardLayout>
        <div className="mb-6">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => { setSelectedSubmission(null); setNewRemark(""); }}
            className="mb-3 -ml-2 text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft size={16} className="mr-1" /> Back to submissions
          </Button>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <h1 className="text-3xl font-bold font-display text-foreground">
                {selectedSubmission.student_name}
              </h1>
              <p className="text-muted-foreground mt-1">
                {selectedSubmission.stage} · Submitted {formatDate(selectedSubmission.submitted_at)}
                {selectedSubmission.student_index ? ` · ${selectedSubmission.student_index}` : ""}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 bg-muted/50 rounded-lg px-3 py-1.5">
                <Bot size={14} className="text-primary" />
                <span className="text-xs font-medium text-foreground">AI</span>
                <Switch checked={showAI} onCheckedChange={setShowAI} className="scale-75" />
              </div>
              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${
                selectedSubmission.status === "Pending" ? "bg-warning/10 text-warning" :
                selectedSubmission.status === "Reviewed" ? "bg-blue-500/10 text-blue-500" :
                selectedSubmission.status === "Rejected" ? "bg-destructive/10 text-destructive" :
                "bg-success/10 text-success"
              }`}>
                {selectedSubmission.status === "Pending" ? <Clock size={12} /> :
                 selectedSubmission.status === "Reviewed" ? <Send size={12} /> :
                 selectedSubmission.status === "Rejected" ? <XCircle size={12} /> : <CheckCircle size={12} />}
                {selectedSubmission.status}
              </span>
            </div>
          </div>
        </div>

        <div className={`grid gap-6 ${showAI ? "lg:grid-cols-[1fr_280px] xl:grid-cols-[1fr_300px]" : "grid-cols-1"}`}>
          <div className="space-y-6 min-w-0">
            {/* Document viewer */}
            <div className="bg-card rounded-xl border border-border overflow-hidden">
              <div className="flex items-center justify-between gap-2 px-5 py-4">
                <div className="flex items-center gap-2 min-w-0">
                  <FileText size={16} className="text-muted-foreground shrink-0" />
                  <span className="text-sm font-medium text-foreground truncate">{selectedSubmission.file_name}</span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="shrink-0"
                  onClick={downloadFile}
                >
                  <Download size={14} className="mr-1.5" /> Download
                </Button>
              </div>
            </div>

            {/* Feedback */}
            <div className="bg-card rounded-xl border border-border p-5">
              <h2 className="font-display text-lg font-bold text-foreground mb-3">Feedback</h2>
              <Textarea
                value={newRemark}
                onChange={(e) => setNewRemark(e.target.value)}
                placeholder="Type your feedback for this submission..."
                className="resize-none h-24 mb-3"
              />
              <div className="flex items-center gap-3 flex-wrap">
                <Button onClick={() => submitReview("Approved")} disabled={saving} className="gradient-gold text-secondary-foreground hover:opacity-90">
                  <CheckCircle size={14} className="mr-1.5" /> Approve
                </Button>
                <Button onClick={() => submitReview("Rejected")} disabled={saving} variant="destructive">
                  <XCircle size={14} className="mr-1.5" /> Reject
                </Button>
                <Button onClick={sendFeedbackOnly} disabled={saving || !newRemark.trim()} variant="outline">
                  <Send size={14} className="mr-1.5" /> Send Feedback Only
                </Button>
              </div>
            </div>
          </div>

          {showAI && (
            <div className="space-y-4">
              <AIFeedbackPanel
                studentName={selectedSubmission.student_name}
                chapter={selectedSubmission.stage}
                fileUrl={previewUrl}
                fileName={selectedSubmission.file_name}
                visible={showAI}
                onToggle={() => setShowAI(!showAI)}
                onUseSuggestion={(text) => setNewRemark((prev) => (prev ? prev + "\n\n" + text : text))}
              />
            </div>
          )}
        </div>
      </DashboardLayout>
    );
  }

  // ── List view ──
  return (
    <DashboardLayout>
      <div className="mb-8">
        <h1 className="text-3xl font-bold font-display text-foreground">Review Submissions</h1>
        <p className="text-muted-foreground mt-1">Pending and reviewed thesis submissions</p>
      </div>

      {loading ? (
        <div className="text-center py-12 text-muted-foreground"><Loader2 className="animate-spin inline mr-2" size={16} /> Loading...</div>
      ) : submissions.length === 0 ? (
        <div className="space-y-6">
          <div className="bg-card rounded-xl border border-border p-8 text-center">
            <FileText size={32} className="mx-auto text-muted-foreground/40 mb-3" />
            <p className="text-muted-foreground">
              {assignedStudents.length === 0 
                ? "No students assigned to you yet." 
                : "No submissions from your assigned students yet."}
            </p>
            {assignedStudents.length > 0 && (
              <p className="text-xs text-muted-foreground mt-2">
                Assigned students: {assignedStudents.map(s => s.name).join(", ")}
              </p>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {submissions.map((sub) => {
            const isPending = sub.status === "Pending";
            const isRejected = sub.status === "Rejected";
            return (
              <div key={sub.id} className="bg-card rounded-xl border border-border p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:shadow-md transition-shadow">
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                    isPending ? "bg-warning/10" : isRejected ? "bg-destructive/10" : sub.status === "Reviewed" ? "bg-blue-500/10" : "bg-success/10"
                  }`}>
                    {isPending ? <Clock size={18} className="text-warning" /> :
                     isRejected ? <XCircle size={18} className="text-destructive" /> :
                     sub.status === "Reviewed" ? <Send size={18} className="text-blue-500" /> :
                     <CheckCircle size={18} className="text-success" />}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">{sub.student_name} — {sub.stage}</p>
                    <p className="text-xs text-muted-foreground">{sub.file_name} · {formatDate(sub.submitted_at)}</p>
                  </div>
                </div>
                <Button variant="outline" size="sm" className="w-full sm:w-auto" onClick={() => openSubmission(sub)}>
                  <Eye size={14} className="mr-1.5" />
                  {isPending ? "Review" : "View"}
                </Button>
              </div>
            );
          })}
        </div>
      )}
    </DashboardLayout>
  );
};

export default ReviewSubmissions;
