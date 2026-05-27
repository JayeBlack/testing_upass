import DashboardLayout from "@/components/DashboardLayout";
import { FileText, CheckCircle, Clock, Eye, Send, ArrowLeft, Bot, Download, XCircle, Loader2, FileWarning } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";
import mammoth from "mammoth";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import AIFeedbackPanel from "@/components/supervisor/AIFeedbackPanel";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url
).toString();

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

const ReviewSubmissions = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [publicFileUrl, setPublicFileUrl] = useState<string | null>(null);
  const [docxHtml, setDocxHtml] = useState<string | null>(null);
  const [fileKind, setFileKind] = useState<"pdf" | "docx" | "image" | "other" | null>(null);
  const [numPages, setNumPages] = useState<number | null>(null);
  const [previewWidth, setPreviewWidth] = useState(720);
  const [preparingDownload, setPreparingDownload] = useState(false);
  const [newRemark, setNewRemark] = useState("");
  const [saving, setSaving] = useState(false);
  const [showAI, setShowAI] = useState(true);
  const previewRef = useRef<HTMLDivElement | null>(null);

  const loadSubmissions = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("thesis_submissions")
      .select("*")
      .order("submitted_at", { ascending: false });
    if (error) toast({ title: "Failed to load", description: error.message, variant: "destructive" });
    else setSubmissions((data as Submission[]) || []);
    setLoading(false);
  };

  useEffect(() => { loadSubmissions(); }, []);

  useEffect(() => {
    return () => {
      if (downloadUrl) URL.revokeObjectURL(downloadUrl);
    };
  }, [downloadUrl]);

  useEffect(() => {
    const previewElement = previewRef.current;
    if (!previewElement) return;

    const updatePreviewWidth = () => {
      setPreviewWidth(Math.max(280, Math.min(previewElement.clientWidth - 32, 900)));
    };

    updatePreviewWidth();
    const observer = new ResizeObserver(updatePreviewWidth);
    observer.observe(previewElement);

    return () => observer.disconnect();
  }, [selectedSubmission, showAI]);

  const openSubmission = async (sub: Submission) => {
    setSelectedSubmission(sub);
    setNewRemark(sub.feedback || "");
    setFileUrl(null);
    setDownloadUrl(null);
    setPublicFileUrl(null);
    setDocxHtml(null);
    setFileKind(null);
    setNumPages(null);
    setPreparingDownload(true);
    try {
      const { data, error } = await supabase.storage.from("thesis-files").download(sub.file_path);
      if (error || !data) throw error || new Error("No file");
      const objectUrl = URL.createObjectURL(data);
      setFileUrl(objectUrl);
      setDownloadUrl(objectUrl);
      const { data: pub } = supabase.storage.from("thesis-files").getPublicUrl(sub.file_path);
      setPublicFileUrl(pub.publicUrl);

      const name = sub.file_name.toLowerCase();
      if (name.endsWith(".pdf")) {
        setFileKind("pdf");
      } else if (name.endsWith(".docx")) {
        setFileKind("docx");
        try {
          const arrayBuffer = await data.arrayBuffer();
          const result = await mammoth.convertToHtml({ arrayBuffer });
          setDocxHtml(result.value);
        } catch (e: any) {
          setDocxHtml(null);
        }
      } else if (/\.(png|jpe?g|gif|webp|svg)$/.test(name)) {
        setFileKind("image");
      } else {
        setFileKind("other");
      }
    } catch (err: any) {
      toast({ title: "File preparation failed", description: err.message, variant: "destructive" });
    } finally {
      setPreparingDownload(false);
    }
  };

  const submitReview = async (status: "Approved" | "Rejected" | "Reviewed") => {
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

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

  // ── Detail view ──
  if (selectedSubmission) {
    return (
      <DashboardLayout>
        {/* Header */}
        <div className="mb-6">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => { setSelectedSubmission(null); setNewRemark(""); setDownloadUrl(null); }}
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
              {/* AI Toggle */}
              <div className="flex items-center gap-2 bg-muted/50 rounded-lg px-3 py-1.5">
                <Bot size={14} className="text-primary" />
                <span className="text-xs font-medium text-foreground">AI</span>
                <Switch checked={showAI} onCheckedChange={setShowAI} className="scale-75" />
              </div>
              <span
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${
                  selectedSubmission.status === "Pending" ? "bg-warning/10 text-warning" :
                  selectedSubmission.status === "Rejected" ? "bg-destructive/10 text-destructive" :
                  "bg-success/10 text-success"
                }`}
              >
                {selectedSubmission.status === "Pending" ? <Clock size={12} /> :
                 selectedSubmission.status === "Rejected" ? <XCircle size={12} /> : <CheckCircle size={12} />}
                {selectedSubmission.status}
              </span>
            </div>
          </div>
        </div>

        {/* Main content grid */}
        <div className={`grid gap-6 ${showAI ? "lg:grid-cols-[1fr_340px]" : "grid-cols-1"}`}>
          <div className="space-y-6 min-w-0">
            {/* Document viewer */}
            <div className="bg-card rounded-xl border border-border overflow-hidden">
              <div className="flex items-center justify-between gap-2 px-5 py-3 border-b border-border bg-muted/30">
                <div className="flex items-center gap-2 min-w-0">
                  <FileText size={16} className="text-muted-foreground shrink-0" />
                  <span className="text-sm font-medium text-foreground truncate">{selectedSubmission.file_name}</span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {downloadUrl ? (
                    <Button variant="outline" size="sm" asChild>
                      <a href={downloadUrl} download={selectedSubmission.file_name}>
                        <Download size={14} className="mr-1.5" />Download
                      </a>
                    </Button>
                  ) : (
                    <Button variant="outline" size="sm" disabled>
                      {preparingDownload ? <Loader2 size={14} className="mr-1.5 animate-spin" /> : <Download size={14} className="mr-1.5" />}
                      {preparingDownload ? "Preparing" : "Download"}
                    </Button>
                  )}
                </div>
              </div>
              <div ref={previewRef} className="h-[600px] overflow-auto bg-muted/10 px-4 py-5">
                {!fileUrl ? (
                  <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
                    <Loader2 size={20} className="animate-spin mr-2" /> Loading document...
                  </div>
                ) : fileKind === "pdf" ? (
                  <Document
                    file={fileUrl}
                    loading={
                      <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
                        <Loader2 size={20} className="animate-spin mr-2" /> Loading preview...
                      </div>
                    }
                    error={
                      <div className="h-full flex flex-col items-center justify-center gap-2 text-muted-foreground text-sm text-center">
                        <FileWarning size={28} />
                        <span>Preview unavailable. Please download the file to view it.</span>
                      </div>
                    }
                    onLoadSuccess={({ numPages }) => setNumPages(numPages)}
                  >
                    <div className="flex flex-col items-center gap-4">
                      {Array.from(new Array(numPages || 0), (_el, index) => (
                        <Page
                          key={`page_${index + 1}`}
                          pageNumber={index + 1}
                          width={previewWidth}
                          renderAnnotationLayer={false}
                          className="overflow-hidden rounded-md border border-border shadow-sm"
                        />
                      ))}
                    </div>
                  </Document>
                ) : fileKind === "docx" ? (
                  docxHtml ? (
                    <div className="mx-auto max-w-3xl bg-card rounded-md border border-border shadow-sm p-8">
                      <div
                        className="prose prose-sm max-w-none text-foreground"
                        dangerouslySetInnerHTML={{ __html: docxHtml }}
                      />
                    </div>
                  ) : (
                    <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
                      <Loader2 size={20} className="animate-spin mr-2" /> Converting document...
                    </div>
                  )
                ) : fileKind === "image" ? (
                  <div className="flex items-center justify-center">
                    <img src={fileUrl} alt={selectedSubmission.file_name} className="max-w-full rounded-md border border-border shadow-sm" />
                  </div>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center gap-2 text-muted-foreground text-sm text-center">
                    <FileWarning size={28} />
                    <span>Preview not supported for this file type. Please download to view.</span>
                  </div>
                )}
              </div>
            </div>

            {/* Remark input */}
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
                <Button onClick={() => submitReview("Reviewed")} disabled={saving || !newRemark.trim()} variant="outline">
                  <Send size={14} className="mr-1.5" /> Send Feedback
                </Button>
              </div>
            </div>
          </div>

          {/* AI Sidebar */}
          {showAI && (
            <div className="space-y-4">
              <AIFeedbackPanel
                studentName={selectedSubmission.student_name}
                chapter={selectedSubmission.stage}
                fileUrl={publicFileUrl}
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
        <div className="text-center py-12 text-muted-foreground">No submissions yet.</div>
      ) : (
        <div className="space-y-4">
          {submissions.map((sub) => {
            const isPending = sub.status === "Pending";
            const isRejected = sub.status === "Rejected";
            return (
              <div key={sub.id} className="bg-card rounded-xl border border-border p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:shadow-md transition-shadow">
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                    isPending ? "bg-warning/10" : isRejected ? "bg-destructive/10" : "bg-success/10"
                  }`}>
                    {isPending ? <Clock size={18} className="text-warning" /> :
                     isRejected ? <XCircle size={18} className="text-destructive" /> :
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
