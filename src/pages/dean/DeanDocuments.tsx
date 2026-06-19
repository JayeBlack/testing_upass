import DashboardLayout from "@/components/DashboardLayout";
import { FileText, Upload, X, Loader2, Clock, CheckCircle, Download } from "lucide-react";
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

const statusConfig = {
  Pending: { icon: <Clock size={14} />, className: "bg-muted text-muted-foreground" },
  Ready: { icon: <CheckCircle size={14} />, className: "bg-success/10 text-success" },
};

const DeanDocuments = () => {
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [requests, setRequests] = useState<DocRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingRequest, setProcessingRequest] = useState<DocRequest | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [statusFilter, setStatusFilter] = useState<"all" | "Pending" | "Ready">("all");

  const load = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const requestsData = await apiFetch<DocRequest[]>("/documents");
      setRequests(requestsData || []);
    } catch {
      // backend offline
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => { 
    load(); 
    const interval = setInterval(() => load(true), 5000); // Poll every 5 seconds for real-time updates
    return () => clearInterval(interval);
  }, []);

  const handleProcess = (request: DocRequest) => {
    setProcessingRequest(request);
    setUploadFile(null);
    if (fileRef.current) fileRef.current.value = "";
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
      formData.append("request_id", processingRequest.id); // Pass request_id to update existing request

      await apiFetch("/documents/dean/upload", {
        method: "POST",
        body: formData,
      });

      toast({ 
        title: "Document sent successfully", 
        description: `${processingRequest.doc_type} has been sent to ${processingRequest.first_name} ${processingRequest.last_name}` 
      });
      
      setProcessingRequest(null);
      setUploadFile(null);
      if (fileRef.current) fileRef.current.value = "";
      await load();
    } catch (err) {
      console.error("Upload error:", err);
      toast({ 
        title: "Upload failed", 
        description: err instanceof ApiError ? err.message : "Error uploading document", 
        variant: "destructive" 
      });
    } finally {
      setUploading(false);
    }
  };



  const filtered = requests.filter(r => statusFilter === "all" || r.status === statusFilter);
  const pendingCount = requests.filter(r => r.status === "Pending").length;
  const readyCount = requests.filter(r => r.status === "Ready").length;

  return (
    <DashboardLayout>
      <div className="mb-8">
        <h1 className="text-3xl font-bold font-display text-foreground">Document Requests</h1>
        <p className="text-muted-foreground mt-1">Process student document requests and send files</p>
      </div>

      {/* Stats Cards */}
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

      {/* Student Requests Table */}
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
                  return (
                    <tr key={r.id} className="border-b border-border last:border-0 hover:bg-muted/50 transition-colors">
                      <td className="px-6 py-4 font-medium text-foreground">{r.first_name} {r.last_name}</td>
                      <td className="px-6 py-4 font-mono text-muted-foreground text-xs">{r.index_number}</td>
                      <td className="px-6 py-4 text-foreground">{r.doc_type}</td>
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
                            <Upload size={12} className="inline mr-1" /> Process
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

      {/* Process Request Modal */}
      {processingRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/30 backdrop-blur-sm p-4" onClick={() => setProcessingRequest(null)}>
          <div className="bg-card rounded-2xl border border-border p-6 max-w-2xl w-full shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="font-display text-xl font-bold text-foreground">Process Document Request</h3>
                <p className="text-sm text-muted-foreground mt-1">Upload document for {processingRequest.first_name} {processingRequest.last_name}</p>
              </div>
              <button onClick={() => setProcessingRequest(null)} className="p-1 rounded hover:bg-muted">
                <X size={20} className="text-muted-foreground" />
              </button>
            </div>

            {/* Request Details */}
            <div className="bg-muted/50 rounded-lg p-4 mb-5">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-muted-foreground text-xs">Student</p>
                  <p className="font-medium text-foreground">{processingRequest.first_name} {processingRequest.last_name}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Index Number</p>
                  <p className="font-medium font-mono text-foreground">{processingRequest.index_number}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Document Type</p>
                  <p className="font-medium text-foreground">{processingRequest.doc_type}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Purpose</p>
                  <p className="font-medium text-foreground">{processingRequest.purpose}</p>
                </div>
              </div>
            </div>

            {/* Upload Section */}
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
                <p className="text-xs text-muted-foreground mt-1.5">
                  Supported: PDF, Word, Excel, PowerPoint, Images, Text
                </p>
                {uploadFile && (
                  <div className="mt-2 flex items-center gap-2 text-sm text-foreground">
                    <FileText size={14} className="text-success" />
                    <span>{uploadFile.name}</span>
                    <span className="text-muted-foreground">({(uploadFile.size / 1024 / 1024).toFixed(2)} MB)</span>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-2">
                <Button
                  variant="outline"
                  onClick={() => setProcessingRequest(null)}
                  className="flex-1"
                  disabled={uploading}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleUploadAndComplete}
                  disabled={uploading || !uploadFile}
                  className="flex-1 gradient-gold text-secondary-foreground hover:opacity-90"
                >
                  {uploading ? (
                    <>
                      <Loader2 size={16} className="mr-2 animate-spin" /> Sending...
                    </>
                  ) : (
                    <>
                      <Upload size={16} className="mr-2" /> Send Document
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};

export default DeanDocuments;
