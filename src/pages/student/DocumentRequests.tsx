import DashboardLayout from "@/components/DashboardLayout";
import { FileText, Clock, CheckCircle, Plus, Loader2, X, Download } from "lucide-react";
import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { apiFetch, ApiError } from "@/lib/api";

type DocType = "Recommendation Letter" | "Attestation Letter" | "Transcript (Certified)" | "Letter of Good Standing" | "Other";
type RequestStatus = "Pending" | "Ready";

interface DocRequest {
  id: string;
  doc_type: DocType;
  purpose: string;
  requested_at: string;
  status: RequestStatus;
}

interface GradeRecord {
  code: string;
  course_name: string;
  credits: number;
  grade: string;
  marks: number;
  semester: string;
  academic_year: string;
}

interface SemesterGroup {
  label: string;
  courses: { code: string; name: string; credits: number; grade: string; marks: number }[];
  cwa: number;
}

const statusConfig: Record<RequestStatus, { icon: React.ReactNode; className: string }> = {
  Pending: { icon: <Clock size={14} />, className: "bg-muted text-muted-foreground" },
  Ready: { icon: <CheckCircle size={14} />, className: "bg-success/10 text-success" },
};

const docTypes: DocType[] = ["Recommendation Letter", "Attestation Letter", "Transcript (Certified)", "Letter of Good Standing", "Other"];

const calcCwa = (courses: { marks: number; credits: number }[]) => {
  const totalCredits = courses.reduce((s, c) => s + c.credits, 0);
  if (totalCredits === 0) return 0;
  return courses.reduce((s, c) => s + c.marks * c.credits, 0) / totalCredits;
};

const DocumentRequests = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<"requests">("requests");
  const [showForm, setShowForm] = useState(false);
  const [requests, setRequests] = useState<DocRequest[]>([]);
  const [grades, setGrades] = useState<GradeRecord[]>([]);
  const [studentId, setStudentId] = useState<string | null>(null);
  const [loadingRequests, setLoadingRequests] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({ type: docTypes[0] as DocType, purpose: "" });

  // resolve student record once — only for Student role
  useEffect(() => {
    if (!user || user.role !== "Student") return;
    apiFetch<any>("/students/me").then((data) => {
      if (data && data.id) {
        setStudentId(String(data.id));
      } else {
        toast({ 
          title: "Student record not found", 
          description: "Unable to find your student record. Contact administrator.", 
          variant: "destructive" 
        });
      }
    }).catch((err) => {
      toast({ 
        title: "Error loading student data", 
        description: err instanceof ApiError ? err.message : "Cannot connect to server", 
        variant: "destructive" 
      });
    });
  }, [user?.id]);

  const loadRequests = async (silent = false) => {
    if (!studentId) return;
    if (!silent) setLoadingRequests(true);
    try {
      const data = await apiFetch<DocRequest[]>(`/documents/student/${studentId}`);
      setRequests(data || []);
    } catch {
      // backend offline
    } finally {
      if (!silent) setLoadingRequests(false);
    }
  };

  const loadTranscript = async () => {
    if (!studentId) return;
    setLoadingTranscript(true);
    try {
      const data = await apiFetch<GradeRecord[]>(`/results/student/${studentId}`);
      setGrades(data || []);
    } catch {
      // backend offline
    } finally {
      setLoadingTranscript(false);
    }
  };

  useEffect(() => {
    if (!studentId) return;
    loadRequests();
    const interval = setInterval(() => loadRequests(true), 5000);
    return () => clearInterval(interval);
  }, [studentId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentId) {
      toast({ 
        title: "Cannot submit request", 
        description: "Student ID not found. Please refresh the page.", 
        variant: "destructive" 
      });
      return;
    }
    setSubmitting(true);
    try {
      const response = await apiFetch("/documents", {
        method: "POST",
        body: JSON.stringify({ student_id: studentId, doc_type: formData.type, purpose: formData.purpose }),
      });
      toast({ title: "Request submitted", description: `${formData.type} request has been submitted successfully.` });
      setFormData({ type: docTypes[0], purpose: "" });
      setShowForm(false);
      await loadRequests();
    } catch (err) {
      console.error("Document request error:", err);
      toast({ 
        title: "Failed to submit request", 
        description: err instanceof ApiError ? err.message : "An error occurred. Please try again.", 
        variant: "destructive" 
      });
    } finally {
      setSubmitting(false);
    }
  };

  // build semester groups from grades
  const semesterMap = new Map<string, SemesterGroup>();
  grades.forEach((g) => {
    const key = `${g.academic_year}__${g.semester}`;
    if (!semesterMap.has(key)) {
      semesterMap.set(key, { label: `${g.semester}, ${g.academic_year}`, courses: [], cwa: 0 });
    }
    semesterMap.get(key)!.courses.push({ code: g.code || "—", name: g.course_name, credits: g.credits, grade: g.grade, marks: g.marks });
  });
  const semesters: SemesterGroup[] = Array.from(semesterMap.values()).map((s) => ({ ...s, cwa: calcCwa(s.courses) }));
  const overallCwa = grades.length > 0 ? calcCwa(grades.map((g) => ({ marks: g.marks, credits: g.credits }))).toFixed(2) : "—";

  return (
    <DashboardLayout>
      <div className="mb-8">
        <h1 className="text-3xl font-bold font-display text-foreground">Document Requests</h1>
        <p className="text-muted-foreground mt-1">Request official documents from the School of Postgraduate Studies</p>
      </div>

      {activeTab === "requests" && (
        <>
          <div className="flex justify-end mb-6">
            <button
              onClick={() => setShowForm(!showForm)}
              disabled={!studentId}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg gradient-gold text-secondary-foreground font-medium text-sm hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {showForm ? <X size={16} /> : <Plus size={16} />}
              {showForm ? "Cancel" : "New Request"}
            </button>
          </div>

          {!studentId && (
            <div className="bg-warning/10 border border-warning/20 rounded-xl p-4 mb-6 flex items-center gap-3">
              <Loader2 size={18} className="animate-spin text-warning" />
              <p className="text-sm text-foreground">Loading your student information...</p>
            </div>
          )}

          {showForm && (
            <form onSubmit={handleSubmit} className="bg-card rounded-xl border border-border p-6 mb-6 space-y-4">
              <h2 className="font-display font-bold text-foreground">New Document Request</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">Document Type</label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value as DocType })}
                    className="w-full px-4 py-2.5 rounded-lg border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    {docTypes.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">Purpose / Reason</label>
                  <input
                    value={formData.purpose}
                    onChange={(e) => setFormData({ ...formData, purpose: e.target.value })}
                    placeholder="e.g. PhD Application, Employer request"
                    required
                    className="w-full px-4 py-2.5 rounded-lg border border-input bg-background text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
              </div>
              <div className="flex gap-2 justify-end">
                <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 rounded-lg border border-border text-sm font-medium text-foreground hover:bg-muted transition-colors">
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={submitting || !studentId || !formData.purpose.trim()} 
                  className="px-5 py-2 rounded-lg gradient-gold text-secondary-foreground text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {submitting && <Loader2 size={14} className="animate-spin" />}
                  {submitting ? "Submitting..." : "Submit Request"}
                </button>
              </div>
            </form>
          )}

          {loadingRequests ? (
            <div className="flex items-center justify-center py-16 text-muted-foreground text-sm">
              <Loader2 size={18} className="animate-spin mr-2" /> Loading requests...
            </div>
          ) : requests.length === 0 ? (
            <div className="bg-card rounded-xl border border-border p-12 text-center">
              <FileText size={40} className="mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">No requests yet</h3>
              <p className="text-sm text-muted-foreground">Submit a new request to get started.</p>
            </div>
          ) : (
            <>
              {/* Desktop table */}
              <div className="bg-card rounded-xl border border-border overflow-hidden hidden md:block">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left px-6 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">ID</th>
                        <th className="text-left px-6 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Document</th>
                        <th className="text-left px-6 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Purpose</th>
                        <th className="text-left px-6 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Date</th>
                        <th className="text-center px-6 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {requests.map((r) => {
                        const cfg = statusConfig[r.status] ?? statusConfig.Pending;
                        const hasDownload = r.status === "Ready" && (r as any).file_url;
                        return (
                          <tr key={r.id} className="border-b border-border last:border-0 hover:bg-muted/50 transition-colors">
                            <td className="px-6 py-4 text-sm font-mono font-medium text-foreground">#{r.id}</td>
                            <td className="px-6 py-4 text-sm text-foreground">{r.doc_type}</td>
                            <td className="px-6 py-4 text-sm text-muted-foreground">{r.purpose}</td>
                            <td className="px-6 py-4 text-sm text-muted-foreground">{new Date(r.requested_at).toLocaleDateString()}</td>
                            <td className="px-6 py-4 text-center">
                              {hasDownload ? (
                                <a
                                  href={(r as any).file_url}
                                  download
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 px-3 py-1 rounded-full gradient-gold text-secondary-foreground text-xs font-medium hover:opacity-90 transition-opacity"
                                >
                                  <Download size={12} /> Download
                                </a>
                              ) : (
                                <span className={`inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full ${cfg.className}`}>
                                  {cfg.icon}{r.status}
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Mobile cards */}
              <div className="space-y-3 md:hidden">
                {requests.map((r) => {
                  const cfg = statusConfig[r.status] ?? statusConfig.Pending;
                  return (
                    <div key={r.id} className="bg-card rounded-xl border border-border p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-foreground">{r.doc_type}</p>
                        <span className={`inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full ${cfg.className}`}>
                          {cfg.icon}{r.status}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">{r.purpose}</p>
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span className="font-mono">#{r.id}</span>
                        <span>{new Date(r.requested_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </>
      )}
    </DashboardLayout>
  );
};

export default DocumentRequests;
