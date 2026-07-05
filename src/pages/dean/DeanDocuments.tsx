import DashboardLayout from "@/components/DashboardLayout";
import { FileText, Upload, X, Loader2, Clock, CheckCircle, ScrollText } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { useToast } from "@/hooks/use-toast";
import { apiFetch, ApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";

interface DocRequest {
  id: string;
  student_id: string;
  doc_type: string;
  purpose: string;
  status: "Pending" | "Ready";
  requested_at: string;
  first_name: string;
  last_name: string;
  index_number: string;
  program_name: string;
  department_name: string;
}

interface TranscriptCourse {
  code: string;
  name: string;
  credits: number;
  marks: number;
  grade: string;
}

interface TranscriptSemester {
  academic_year: string;
  semester: number;
  courses: TranscriptCourse[];
}

interface TranscriptData {
  student: {
    first_name: string;
    last_name: string;
    index_number: string;
    program_name: string;
    department_name: string;
    admission_year: number;
    status: string;
  };
  semesters: TranscriptSemester[];
}

const statusConfig = {
  Pending: { icon: <Clock size={14} />, className: "bg-muted text-muted-foreground" },
  Ready: { icon: <CheckCircle size={14} />, className: "bg-success/10 text-success" },
};

function gradeColor(grade: string): [number, number, number] {
  if (!grade) return [80, 80, 80];
  const g = grade.toUpperCase();
  if (g === "A+" || g === "A") return [22, 101, 52];
  if (g === "B+" || g === "B") return [30, 64, 175];
  if (g === "C+" || g === "C") return [120, 80, 0];
  if (g.startsWith("D")) return [180, 80, 0];
  return [185, 28, 28];
}

async function generateTranscriptPDF(data: TranscriptData): Promise<void> {
  const { default: jsPDF } = await import("jspdf");
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const M = 18; // margin
  const contentW = pageW - M * 2;

  const { student, semesters } = data;
  const fullName = `${student.first_name} ${student.last_name}`;

  // ── Header ──
  doc.setFillColor(15, 40, 80);
  doc.rect(0, 0, pageW, 38, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.text("UNIVERSITY OF MINES AND TECHNOLOGY", pageW / 2, 13, { align: "center" });
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text("School of Postgraduate Studies — Tarkwa, Ghana", pageW / 2, 20, { align: "center" });
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("OFFICIAL ACADEMIC TRANSCRIPT", pageW / 2, 30, { align: "center" });

  // ── Student Info Box ──
  let y = 46;
  doc.setFillColor(245, 247, 250);
  doc.setDrawColor(200, 210, 225);
  doc.setLineWidth(0.3);
  doc.roundedRect(M, y, contentW, 30, 2, 2, "FD");

  doc.setTextColor(80, 80, 80);
  doc.setFontSize(7.5);
  doc.setFont("helvetica", "normal");

  const col1x = M + 4;
  const col2x = M + contentW / 2 + 4;

  doc.setFont("helvetica", "bold");
  doc.setTextColor(40, 40, 40);
  doc.text("Student Name:", col1x, y + 8);
  doc.text("Index Number:", col1x, y + 15);
  doc.text("Programme:", col1x, y + 22);

  doc.text("Department:", col2x, y + 8);
  doc.text("Admission Year:", col2x, y + 15);
  doc.text("Status:", col2x, y + 22);

  doc.setFont("helvetica", "normal");
  doc.setTextColor(20, 20, 20);
  doc.text(fullName, col1x + 28, y + 8);
  doc.text(student.index_number || "—", col1x + 28, y + 15);
  doc.text(student.program_name || "—", col1x + 22, y + 22);

  doc.text(student.department_name || "—", col2x + 26, y + 8);
  doc.text(String(student.admission_year || "—"), col2x + 32, y + 15);
  doc.text(student.status || "Active", col2x + 16, y + 22);

  y += 36;

  // ── Semesters ──
  if (semesters.length === 0) {
    doc.setFontSize(10);
    doc.setTextColor(120, 120, 120);
    doc.text("No published results available for this student.", pageW / 2, y + 20, { align: "center" });
  }

  for (const sem of semesters) {
    // Check if we need a new page (need at least 40mm for a semester block)
    if (y + 40 > pageH - 20) {
      doc.addPage();
      y = 18;
    }

    // Semester header bar
    doc.setFillColor(30, 58, 95);
    doc.rect(M, y, contentW, 7, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.text(`${sem.academic_year}  —  Semester ${sem.semester}`, M + 3, y + 4.8);
    y += 7;

    // Column headers
    const colWidths = [22, 72, 18, 18, 18]; // code, name, credits, marks, grade
    const colHeaders = ["Code", "Course Title", "Credits", "Marks", "Grade"];
    const colX = [M, M + 22, M + 94, M + 112, M + 130];

    doc.setFillColor(235, 240, 248);
    doc.rect(M, y, contentW, 6, "F");
    doc.setTextColor(50, 60, 80);
    doc.setFontSize(7.5);
    doc.setFont("helvetica", "bold");
    colHeaders.forEach((h, i) => doc.text(h, colX[i] + 1.5, y + 4.2));
    y += 6;

    // Course rows
    doc.setFont("helvetica", "normal");
    let semCredits = 0;
    let semWeighted = 0;

    for (let i = 0; i < sem.courses.length; i++) {
      if (y + 6 > pageH - 20) {
        doc.addPage();
        y = 18;
      }
      const c = sem.courses[i];
      if (i % 2 === 1) {
        doc.setFillColor(250, 251, 253);
        doc.rect(M, y, contentW, 6, "F");
      }
      doc.setDrawColor(210, 215, 225);
      doc.setLineWidth(0.1);
      doc.line(M, y + 6, M + contentW, y + 6);

      doc.setTextColor(30, 30, 30);
      doc.setFontSize(7.5);
      doc.text(c.code || "—", colX[0] + 1.5, y + 4.2);
      // Truncate long course names
      const nameStr = c.name && c.name.length > 38 ? c.name.slice(0, 36) + ".." : (c.name || "—");
      doc.text(nameStr, colX[1] + 1.5, y + 4.2);
      doc.text(String(c.credits ?? "—"), colX[2] + 1.5, y + 4.2);
      doc.text(c.marks != null ? String(c.marks) : "—", colX[3] + 1.5, y + 4.2);

      // Grade with color
      const [gr, gg, gb] = gradeColor(c.grade);
      doc.setTextColor(gr, gg, gb);
      doc.setFont("helvetica", "bold");
      doc.text(c.grade || "—", colX[4] + 1.5, y + 4.2);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(30, 30, 30);

      if (c.credits && c.marks != null) {
        semCredits += c.credits;
        semWeighted += c.credits * c.marks;
      }
      y += 6;
    }

    // Semester summary row
    const semGPA = semCredits > 0 ? (semWeighted / semCredits).toFixed(2) : "—";
    doc.setFillColor(225, 232, 245);
    doc.rect(M, y, contentW, 6.5, "F");
    doc.setFontSize(7.5);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(20, 40, 80);
    doc.text(`Semester GPA: ${semGPA}`, M + contentW - 4, y + 4.5, { align: "right" });
    doc.text(`Total Credits: ${semCredits}`, M + contentW - 50, y + 4.5, { align: "right" });
    y += 10;
  }

  // ── Cumulative GPA ──
  if (semesters.length > 0) {
    if (y + 16 > pageH - 20) { doc.addPage(); y = 18; }
    let totalCredits = 0, totalWeighted = 0;
    for (const sem of semesters) {
      for (const c of sem.courses) {
        if (c.credits && c.marks != null) {
          totalCredits += c.credits;
          totalWeighted += c.credits * c.marks;
        }
      }
    }
    const cwa = totalCredits > 0 ? (totalWeighted / totalCredits).toFixed(2) : "—";
    doc.setFillColor(15, 40, 80);
    doc.rect(M, y, contentW, 10, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text(`Cumulative Weighted Average (CWA): ${cwa}`, pageW / 2, y + 6.5, { align: "center" });
    y += 14;
  }

  // ── Footer ──
  const footerY = pageH - 14;
  doc.setDrawColor(180, 190, 210);
  doc.setLineWidth(0.3);
  doc.line(M, footerY, pageW - M, footerY);
  doc.setFontSize(7);
  doc.setFont("helvetica", "italic");
  doc.setTextColor(130, 130, 130);
  doc.text("This transcript is generated from the UMaT Postgraduate Administrative Support System (UPASS).", M, footerY + 4);
  doc.text(`Generated: ${new Date().toLocaleString()}`, pageW - M, footerY + 4, { align: "right" });

  doc.save(`Transcript_${student.index_number || fullName.replace(/\s+/g, "_")}.pdf`);
}

const DeanDocuments = () => {
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [requests, setRequests] = useState<DocRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingRequest, setProcessingRequest] = useState<DocRequest | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [statusFilter, setStatusFilter] = useState<"all" | "Pending" | "Ready">("all");
  const [generatingTranscript, setGeneratingTranscript] = useState(false);

  const load = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const data = await apiFetch<DocRequest[]>("/documents");
      setRequests(data || []);
    } catch { /* backend offline */ }
    finally { if (!silent) setLoading(false); }
  };

  useEffect(() => {
    load();
    const id = setInterval(() => load(true), 5000);
    return () => clearInterval(id);
  }, []);

  const handleProcess = (request: DocRequest) => {
    setProcessingRequest(request);
    setUploadFile(null);
    if (fileRef.current) fileRef.current.value = "";
  };

  const handleGenerateTranscript = async () => {
    if (!processingRequest) return;
    setGeneratingTranscript(true);
    try {
      const data = await apiFetch<TranscriptData>(`/documents/transcript/${processingRequest.student_id}`);
      await generateTranscriptPDF(data);
      // Mark request as Ready
      await apiFetch(`/documents/${processingRequest.id}/complete-transcript`, { method: "POST" });
      toast({ title: "Transcript generated", description: `PDF downloaded and request marked as Ready.` });
      setProcessingRequest(null);
      await load();
    } catch (err) {
      toast({ title: "Failed to generate transcript", description: err instanceof ApiError ? err.message : "An error occurred", variant: "destructive" });
    } finally {
      setGeneratingTranscript(false);
    }
  };

  const handleUploadAndComplete = async () => {
    if (!processingRequest || !uploadFile) {
      toast({ title: "Missing file", description: "Please select a file to upload", variant: "destructive" });
      return;
    }
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", uploadFile);
      formData.append("title", processingRequest.doc_type);
      formData.append("student_ids", JSON.stringify([processingRequest.student_id]));
      formData.append("request_id", processingRequest.id);
      await apiFetch("/documents/dean/upload", { method: "POST", body: formData });
      toast({ title: "Document sent successfully", description: `${processingRequest.doc_type} sent to ${processingRequest.first_name} ${processingRequest.last_name}` });
      setProcessingRequest(null);
      setUploadFile(null);
      if (fileRef.current) fileRef.current.value = "";
      await load();
    } catch (err) {
      toast({ title: "Upload failed", description: err instanceof ApiError ? err.message : "Error uploading document", variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const filtered = requests.filter(r => statusFilter === "all" || r.status === statusFilter);
  const pendingCount = requests.filter(r => r.status === "Pending").length;
  const readyCount = requests.filter(r => r.status === "Ready").length;
  const isTranscript = processingRequest?.doc_type?.toLowerCase().includes("transcript");

  return (
    <DashboardLayout>
      <div className="mb-8">
        <h1 className="text-3xl font-bold font-display text-foreground">Document Requests</h1>
        <p className="text-muted-foreground mt-1">Process student document requests and send files</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <div className="bg-card rounded-xl border border-border px-5 py-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Pending Requests</p>
              <p className="text-2xl font-bold font-display text-foreground mt-1">{pendingCount}</p>
            </div>
            <Clock size={24} className="text-muted-foreground" />
          </div>
        </div>
        <div className="bg-card rounded-xl border border-border px-5 py-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Completed</p>
              <p className="text-2xl font-bold font-display text-foreground mt-1">{readyCount}</p>
            </div>
            <CheckCircle size={24} className="text-success" />
          </div>
        </div>
      </div>

      {/* Filter */}
      <div className="flex gap-1 mb-6 bg-muted rounded-lg p-1 w-fit">
        {(["all", "Pending", "Ready"] as const).map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${statusFilter === s ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
          >
            {s === "all" ? "All" : s}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="overflow-x-auto">
          {loading ? (
            <div className="flex items-center justify-center py-16 text-muted-foreground text-sm">
              <Loader2 size={18} className="animate-spin mr-2" /> Loading...
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-12 text-center">
              <FileText size={36} className="mx-auto text-muted-foreground mb-3" />
              <p className="text-sm text-muted-foreground">No {statusFilter !== "all" ? statusFilter.toLowerCase() : ""} document requests</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left px-6 py-4 text-xs font-semibold text-muted-foreground uppercase">Student</th>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-muted-foreground uppercase">Index</th>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-muted-foreground uppercase">Document</th>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-muted-foreground uppercase">Purpose</th>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-muted-foreground uppercase">Date</th>
                  <th className="text-center px-6 py-4 text-xs font-semibold text-muted-foreground uppercase">Status</th>
                  <th className="text-right px-6 py-4 text-xs font-semibold text-muted-foreground uppercase">Action</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => {
                  const cfg = statusConfig[r.status];
                  const isT = r.doc_type?.toLowerCase().includes("transcript");
                  return (
                    <tr key={r.id} className="border-b border-border last:border-0 hover:bg-muted/50 transition-colors">
                      <td className="px-6 py-4 font-medium text-foreground">{r.first_name} {r.last_name}</td>
                      <td className="px-6 py-4 font-mono text-muted-foreground text-xs">{r.index_number}</td>
                      <td className="px-6 py-4 text-foreground">
                        <span className="flex items-center gap-1.5">
                          {isT && <ScrollText size={13} className="text-primary shrink-0" />}
                          {r.doc_type}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-muted-foreground max-w-[200px] truncate">{r.purpose}</td>
                      <td className="px-6 py-4 text-muted-foreground">{new Date(r.requested_at).toLocaleDateString()}</td>
                      <td className="px-6 py-4 text-center">
                        <span className={`inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full ${cfg.className}`}>
                          {cfg.icon}{r.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        {r.status === "Pending" ? (
                          <button
                            onClick={() => handleProcess(r)}
                            className="px-3 py-1.5 rounded-lg gradient-gold text-secondary-foreground text-xs font-medium hover:opacity-90 transition-opacity"
                          >
                            {isT ? <><ScrollText size={12} className="inline mr-1" /> Generate</> : <><Upload size={12} className="inline mr-1" /> Process</>}
                          </button>
                        ) : (
                          <span className="text-xs text-success font-medium">Completed</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Modal */}
      {processingRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/30 backdrop-blur-sm p-4" onClick={() => setProcessingRequest(null)}>
          <div className="bg-card rounded-2xl border border-border p-6 max-w-lg w-full shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="font-display text-xl font-bold text-foreground">
                  {isTranscript ? "Generate Transcript" : "Process Document Request"}
                </h3>
                <p className="text-sm text-muted-foreground mt-1">
                  {processingRequest.first_name} {processingRequest.last_name} · {processingRequest.index_number}
                </p>
              </div>
              <button onClick={() => setProcessingRequest(null)} className="p-1 rounded hover:bg-muted">
                <X size={20} className="text-muted-foreground" />
              </button>
            </div>

            {/* Details */}
            <div className="bg-muted/50 rounded-lg p-4 mb-5">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-muted-foreground text-xs">Document Type</p>
                  <p className="font-medium text-foreground">{processingRequest.doc_type}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Purpose</p>
                  <p className="font-medium text-foreground">{processingRequest.purpose}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Programme</p>
                  <p className="font-medium text-foreground">{processingRequest.program_name || "—"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Department</p>
                  <p className="font-medium text-foreground">{processingRequest.department_name || "—"}</p>
                </div>
              </div>
            </div>

            {isTranscript ? (
              /* Transcript flow */
              <div className="space-y-4">
                <div className="flex items-start gap-3 p-3 rounded-lg bg-primary/5 border border-primary/20">
                  <ScrollText size={16} className="text-primary shrink-0 mt-0.5" />
                  <p className="text-sm text-foreground">
                    This will generate a PDF transcript containing all published semester results for this student, then mark the request as <span className="font-semibold text-success">Ready</span> and notify the student.
                  </p>
                </div>
                <div className="flex gap-3 pt-1">
                  <Button variant="outline" onClick={() => setProcessingRequest(null)} className="flex-1" disabled={generatingTranscript}>
                    Cancel
                  </Button>
                  <Button onClick={handleGenerateTranscript} disabled={generatingTranscript} className="flex-1 gradient-gold text-secondary-foreground hover:opacity-90">
                    {generatingTranscript ? <><Loader2 size={15} className="mr-2 animate-spin" /> Generating...</> : <><ScrollText size={15} className="mr-2" /> Generate & Download</>}
                  </Button>
                </div>
              </div>
            ) : (
              /* File upload flow */
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-foreground block mb-2">Upload Document File *</label>
                  <input
                    ref={fileRef}
                    type="file"
                    accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.jpg,.jpeg,.png"
                    onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                    className="w-full px-4 py-2.5 rounded-lg border border-input bg-background text-foreground text-sm focus:ring-2 focus:ring-ring outline-none"
                  />
                  <p className="text-xs text-muted-foreground mt-1.5">Supported: PDF, Word, Excel, PowerPoint, Images, Text</p>
                  {uploadFile && (
                    <div className="mt-2 flex items-center gap-2 text-sm text-foreground">
                      <FileText size={14} className="text-success" />
                      <span>{uploadFile.name}</span>
                      <span className="text-muted-foreground">({(uploadFile.size / 1024 / 1024).toFixed(2)} MB)</span>
                    </div>
                  )}
                </div>
                <div className="flex gap-3 pt-1">
                  <Button variant="outline" onClick={() => setProcessingRequest(null)} className="flex-1" disabled={uploading}>
                    Cancel
                  </Button>
                  <Button onClick={handleUploadAndComplete} disabled={uploading || !uploadFile} className="flex-1 gradient-gold text-secondary-foreground hover:opacity-90">
                    {uploading ? <><Loader2 size={16} className="mr-2 animate-spin" /> Sending...</> : <><Upload size={16} className="mr-2" /> Send Document</>}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};

export default DeanDocuments;
