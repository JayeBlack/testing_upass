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
import { apiFetch } from "@/lib/api";

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
  const [debugUnfiltered, setDebugUnfiltered] = useState<Submission[]>([]);

  const loadSubmissions = async () => {
    setLoading(true);
    try {
      // Fetch supervisor's assigned students
      const supervisorStudents = await apiFetch<any>("/supervisors/current/submissions");
      const students = supervisorStudents.students || [];
      setAssignedStudents(students);

      // Fetch all submissions
      const { data, error } = await supabase
        .from("thesis_submissions")
        .select("*")
        .order("submitted_at", { ascending: false });
      
      if (error) {
        toast({ title: "Failed to load", description: error.message, variant: "destructive" });
        setSubmissions([]);
        setDebugUnfiltered([]);
      } else {
        const allSubmissions = (data as Submission[]) || [];
        setDebugUnfiltered(allSubmissions);

        // Build a normalized set of assigned student index numbers
        const assignedIndexSet = new Set(
          students
            .map((s: AssignedStudent) => s.index_number?.trim().toLowerCase())
            .filter(Boolean)
        );

        console.log("[ReviewSubmissions] DEBUG START");
        console.log("[ReviewSubmissions] Assigned students:", students);
        console.log("[ReviewSubmissions] Assigned index set:", Array.from(assignedIndexSet));
        console.log("[ReviewSubmissions] Raw submissions count:", allSubmissions.length);
        console.log("[ReviewSubmissions] Sample submissions:", allSubmissions.slice(0, 3).map(s => ({
          id: s.id,
          student_index: s.student_index,
          student_name: s.student_name
        })));

        // Filter to only show submissions from assigned students
        const filtered = allSubmissions.filter(sub => {
          const subIndex = sub.student_index?.trim().toLowerCase();
          const isIncluded = assignedIndexSet.has(subIndex);
          console.log(`[ReviewSubmissions] Checking ${sub.student_name} (${subIndex}): ${isIncluded}`);
          return isIncluded;
        });

        console.log("[ReviewSubmissions] Filtered submissions count:", filtered.length);
        console.log("[ReviewSubmissions] DEBUG END");

        setSubmissions(filtered);
      }
    } catch (err: any) {
      console.error("[ReviewSubmissions] Error:", err);
      toast({ title: "Failed to load submissions", description: err.message, variant: "destructive" });
      setSubmissions([]);
      setDebugUnfiltered([]);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadSubmissions();

    // Real-time subscription
    const channel = supabase
      .channel('thesis_submissions_changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'thesis_submissions' },
        () => { loadSubmissions(); }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
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
      await supabase
        .from("thesis_submissions")
        .update({ status: "Reviewed", reviewed_by: user?.name, reviewed_at: new Date().toISOString() })
        .eq("id", sub.id);
      setSelectedSubmission({ ...sub, status: "Reviewed" });
    }

    try {
      const name = sub.file_name.toLowerCase();

      if (name.endsWith(".docx")) {
        // DOCX needs blob for mammoth conversion
        const { data: blob, error: dlErr } = await supabase.storage
          .from("thesis-files")
          .download(sub.file_path);
        if (dlErr || !blob) throw new Error(dlErr?.message || "Failed to load file");
        setPreviewUrl(URL.createObjectURL(blob));
        setFileKind("docx");
        try {
          const mammoth = (await import("mammoth")).default;
          const arrayBuffer = await blob.arrayBuffer();
          const result = await mammoth.convertToHtml({ arrayBuffer }, {
            styleMap: [
              "p[style-name='Heading 1'] => h1:fresh",
              "p[style-name='Heading 2'] => h2:fresh",
              "p[style-name='Heading 3'] => h3:fresh",
            ],
          });
          setDocxHtml(result.value);
        } catch {
          setDocxError(true);
        }
      } else {
        // For all other types, use a signed URL (no download triggered)
        const { data, error: signErr } = await supabase.storage
          .from("thesis-files")
          .createSignedUrl(sub.file_path, 3600);
        if (signErr || !data?.signedUrl) throw new Error(signErr?.message || "Failed to get file URL");
        setPreviewUrl(data.signedUrl);
        if (name.endsWith(".pdf")) setFileKind("pdf");
        else if (name.endsWith(".doc")) setFileKind("doc");
        else if (/\.(png|jpe?g|gif|webp|svg)$/.test(name)) setFileKind("image");
        else setFileKind("other");
      }
    } catch (err: any) {
      toast({ title: "Failed to load file", description: err.message, variant: "destructive" });
    } finally {
      setPreviewing(false);
    }
  };

  const downloadFile = async () => {
    if (!selectedSubmission) return;
    try {
      const { data: blob, error } = await supabase.storage
        .from("thesis-files")
        .download(selectedSubmission.file_path);
      if (error || !blob) throw new Error(error?.message || "Download failed");
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = selectedSubmission.file_name;
      a.click();
      URL.revokeObjectURL(a.href);
    } catch (err: any) {
      toast({ title: "Download failed", description: err.message, variant: "destructive" });
    }
  };

  const submitReview = async (status: "Approved" | "Rejected") => {
    if (!selectedSubmission) return;
    setSaving(true);
    const { error } = await supabase
      .from("thesis_submissions")
      .update({
        status,
        feedback: newRemark.trim() || null,
        reviewed_by: user?.name,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", selectedSubmission.id);
    setSaving(false);
    if (error) {
      toast({ title: "Save failed", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: `Submission ${status.toLowerCase()}` });
    await loadSubmissions();
    setSelectedSubmission(null);
    setNewRemark("");
  };

  const sendFeedbackOnly = async () => {
    if (!selectedSubmission || !newRemark.trim()) return;
    setSaving(true);
    const { error } = await supabase
      .from("thesis_submissions")
      .update({
        feedback: newRemark.trim(),
        reviewed_by: user?.name,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", selectedSubmission.id);
    setSaving(false);
    if (error) {
      toast({ title: "Save failed", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Feedback sent" });
    await loadSubmissions();
    setSelectedSubmission(null);
    setNewRemark("");
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
              <div className="flex items-center justify-between gap-2 px-5 py-3 border-b border-border bg-muted/30">
                <div className="flex items-center gap-2 min-w-0">
                  <FileText size={16} className="text-muted-foreground shrink-0" />
                  <span className="text-sm font-medium text-foreground truncate">{selectedSubmission.file_name}</span>
                </div>
                {!previewing && selectedSubmission && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="shrink-0"
                    onClick={downloadFile}
                  >
                    <Download size={14} className="mr-1.5" /> Download
                  </Button>
                )}
              </div>
              <div className="h-[70vh]">
                {previewing ? (
                  <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
                    <Loader2 size={20} className="animate-spin mr-2" /> Loading document...
                  </div>
                ) : fileKind === "pdf" ? (
                  <iframe
                    src={`${previewUrl}#toolbar=1&navpanes=0`}
                    title={selectedSubmission.file_name}
                    className="w-full h-full border-0"
                  />
                ) : fileKind === "docx" ? (
                  docxError ? (
                    <div className="h-full flex flex-col items-center justify-center gap-3 text-center px-6">
                      <FileWarning size={28} className="text-muted-foreground" />
                      <p className="text-sm text-muted-foreground max-w-sm">
                        Could not render this DOCX file. Please download to view.
                      </p>
                    </div>
                  ) : docxHtml ? (
                    <div className="h-full overflow-auto px-6 py-8">
                      <div className="mx-auto w-full max-w-[9.5in] bg-white text-neutral-900 rounded-md border border-border shadow-lg px-8 py-10 docx-page">
                        <div className="docx-content" dangerouslySetInnerHTML={{ __html: docxHtml }} />
                      </div>
                    </div>
                  ) : (
                    <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
                      <Loader2 size={20} className="animate-spin mr-2" /> Converting document...
                    </div>
                  )
                ) : fileKind === "doc" ? (
                  <div className="h-full flex flex-col items-center justify-center gap-3 text-center px-6">
                    <FileWarning size={28} className="text-muted-foreground" />
                    <p className="text-sm text-muted-foreground max-w-sm">
                      Legacy <code className="px-1 py-0.5 rounded bg-muted text-xs">.doc</code> files can't be previewed.
                      Ask the student to re-upload as <strong>.docx</strong> or <strong>.pdf</strong>.
                    </p>
                  </div>
                ) : fileKind === "image" ? (
                  <div className="h-full overflow-auto flex items-center justify-center p-4">
                    <img src={previewUrl!} alt={selectedSubmission.file_name} className="max-w-full max-h-full rounded-md border border-border shadow-sm" />
                  </div>
                ) : fileKind === "other" ? (
                  <div className="h-full flex flex-col items-center justify-center gap-2 text-muted-foreground text-sm text-center">
                    <FileWarning size={28} />
                    <span>Preview not supported. Please download to view.</span>
                  </div>
                ) : null}
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

          {/* Debug: Show all submissions if any exist */}
          {debugUnfiltered.length > 0 && (
            <div className="bg-yellow-50 dark:bg-yellow-950 rounded-xl border border-yellow-200 dark:border-yellow-800 p-5">
              <p className="text-xs font-semibold text-yellow-800 dark:text-yellow-200 mb-3">
                🔍 Debug: {debugUnfiltered.length} total submissions exist (not filtered for your students)
              </p>
              <div className="space-y-2">
                {debugUnfiltered.slice(0, 5).map(sub => (
                  <div key={sub.id} className="text-xs text-yellow-700 dark:text-yellow-300 bg-white dark:bg-black/20 p-2 rounded">
                    <strong>{sub.student_name}</strong> ({sub.student_index}) - {sub.stage} - {sub.status}
                  </div>
                ))}
                {debugUnfiltered.length > 5 && (
                  <div className="text-xs text-yellow-700 dark:text-yellow-300">... and {debugUnfiltered.length - 5} more</div>
                )}
              </div>
            </div>
          )}
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
