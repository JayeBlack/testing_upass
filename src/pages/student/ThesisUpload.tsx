import DashboardLayout from "@/components/DashboardLayout";
import { Upload, FileText, CheckCircle, Clock, XCircle, Loader2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

const stages = ["Proposal", "Chapter 1", "Chapter 2", "Chapter 3", "Chapter 4", "Chapter 5", "Defense"];

interface Submission {
  id: string;
  stage: string;
  file_name: string;
  status: string;
  feedback: string | null;
  submitted_at: string;
}

const ThesisUpload = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [stage, setStage] = useState<string>(stages[0]);
  const [uploading, setUploading] = useState(false);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);

  const loadSubmissions = async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("thesis_submissions")
      .select("id, stage, file_name, status, feedback, submitted_at")
      .eq("student_id", user.id)
      .order("submitted_at", { ascending: false });
    if (error) toast({ title: "Failed to load submissions", description: error.message, variant: "destructive" });
    else setSubmissions(data || []);
    setLoading(false);
  };

  useEffect(() => { loadSubmissions(); }, [user?.id]);

  const currentStage = (() => {
    const approved = submissions.filter((s) => s.status === "Approved").map((s) => stages.indexOf(s.stage));
    return approved.length ? Math.max(...approved) + 1 : 0;
  })();

  const handleFilePick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 50 * 1024 * 1024) {
      toast({ title: "File too large", description: "Maximum size is 50 MB", variant: "destructive" });
      return;
    }
    setSelectedFile(f);
  };

  const handleSubmit = async () => {
    if (!selectedFile || !user) return;
    setUploading(true);
    try {
      const ext = selectedFile.name.split(".").pop();
      const path = `${user.id}/${Date.now()}-${stage.replace(/\s+/g, "_")}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("thesis-files")
        .upload(path, selectedFile, { 
          contentType: selectedFile.type,
          contentDisposition: 'inline'
        });
      if (upErr) throw upErr;

      const { error: insErr } = await supabase.from("thesis_submissions").insert({
        student_id: user.id,
        student_name: user.name,
        student_index: user.indexNumber,
        department: user.department,
        stage,
        file_path: path,
        file_name: selectedFile.name,
        file_size: selectedFile.size,
      });
      if (insErr) throw insErr;

      toast({ title: "Submitted", description: `${stage} sent for review.` });
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      loadSubmissions();
    } catch (err: any) {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

  return (
    <DashboardLayout>
      <div className="mb-8">
        <h1 className="text-3xl font-bold font-display text-foreground">Thesis Submission</h1>
        <p className="text-muted-foreground mt-1">Track and upload your thesis chapters</p>
      </div>

      {/* Progress */}
      <div className="bg-card rounded-xl border border-border p-4 sm:p-6 mb-6">
        <h2 className="font-display text-lg font-bold text-foreground mb-4">Progress</h2>
        <div className="flex items-center gap-0.5 sm:gap-1 overflow-x-auto">
          {stages.map((s, i) => (
            <div key={s} className="flex-1 min-w-[40px] flex flex-col items-center">
              <div className={`w-full h-2 rounded-full mb-2 ${
                i < currentStage ? "gradient-gold" : i === currentStage ? "bg-secondary/50" : "bg-muted"
              }`} />
              <span className={`text-[10px] sm:text-xs text-center ${i <= currentStage ? "text-foreground font-medium" : "text-muted-foreground"}`}>
                {s}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Upload */}
        <div className="bg-card rounded-xl border border-border p-4 sm:p-6">
          <h2 className="font-display text-lg font-bold text-foreground mb-4">Upload Chapter</h2>
          <label className="block mb-3">
            <span className="text-xs font-medium text-muted-foreground">Stage</span>
            <select
              value={stage}
              onChange={(e) => setStage(e.target.value)}
              className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
            >
              {stages.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </label>
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.doc,.docx"
            onChange={handleFilePick}
            className="hidden"
          />
          <button
            type="button"
            className="w-full border-2 border-dashed border-border rounded-xl p-8 text-center cursor-pointer hover:border-secondary transition-colors"
            onClick={() => fileInputRef.current?.click()}
            aria-label="Upload thesis file"
          >
            <Upload size={32} className="mx-auto text-muted-foreground mb-3" />
            <p className="text-sm text-foreground font-medium">
              {selectedFile?.name || "Click to upload"}
            </p>
            <p className="text-xs text-muted-foreground mt-1">PDF, DOC, DOCX up to 50MB</p>
          </button>
          {selectedFile && (
            <button
              onClick={handleSubmit}
              disabled={uploading}
              className="mt-4 w-full py-3 rounded-lg gradient-gold text-secondary-foreground font-semibold text-sm hover:opacity-90 transition-opacity disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {uploading && <Loader2 size={14} className="animate-spin" />}
              {uploading ? "Uploading..." : "Submit for Review"}
            </button>
          )}
        </div>

        {/* History */}
        <div className="bg-card rounded-xl border border-border p-4 sm:p-6">
          <h2 className="font-display text-lg font-bold text-foreground mb-4">Submission History</h2>
          {loading ? (
            <p className="text-sm text-muted-foreground py-4 text-center">Loading...</p>
          ) : submissions.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">No submissions yet.</p>
          ) : (
            <div className="space-y-3">
              {submissions.map((sub) => (
                <div key={sub.id} className="p-4 rounded-lg bg-muted/50">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <FileText size={18} className="text-muted-foreground shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{sub.stage}</p>
                        <p className="text-xs text-muted-foreground truncate">{sub.file_name} · {formatDate(sub.submitted_at)}</p>
                      </div>
                    </div>
                    <span className={`flex items-center gap-1 text-xs font-medium shrink-0 ${
                      sub.status === "Approved" ? "text-success" :
                      sub.status === "Rejected" ? "text-destructive" : "text-warning"
                    }`}>
                      {sub.status === "Approved" ? <CheckCircle size={14} /> :
                       sub.status === "Rejected" ? <XCircle size={14} /> : <Clock size={14} />}
                      {sub.status}
                    </span>
                  </div>
                  {sub.feedback && (
                    <p className="mt-3 text-xs text-muted-foreground bg-background/60 border-l-2 border-secondary px-3 py-2 rounded">
                      <span className="font-medium text-foreground">Supervisor feedback: </span>{sub.feedback}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default ThesisUpload;
