import DashboardLayout from "@/components/DashboardLayout";
import { FileText, Clock, CheckCircle, Loader2, RefreshCw } from "lucide-react";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { apiFetch, ApiError } from "@/lib/api";

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

const ManageDocuments = () => {
  const { toast } = useToast();
  const [requests, setRequests] = useState<DocRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<"all" | "Pending" | "Ready">("all");

  const load = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const data = await apiFetch<DocRequest[]>("/documents");
      setRequests(data || []);
    } catch {
      // backend offline
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    load();
    const interval = setInterval(() => load(true), 30000);
    return () => clearInterval(interval);
  }, []);

  const updateStatus = async (id: string, status: "Ready") => {
    setUpdating(id);
    try {
      await apiFetch(`/documents/${id}/status`, { method: "PUT", body: JSON.stringify({ status }) });
      setRequests((prev) => prev.map((r) => r.id === id ? { ...r, status } : r));
      toast({ title: "Status updated", description: `Request marked as ${status}` });
    } catch (err) {
      toast({ title: "Failed", description: err instanceof ApiError ? err.message : "Error", variant: "destructive" });
    } finally {
      setUpdating(null);
    }
  };

  const filtered = requests.filter((r) => statusFilter === "all" || r.status === statusFilter);
  const pendingCount = requests.filter((r) => r.status === "Pending").length;
  const readyCount = requests.filter((r) => r.status === "Ready").length;

  return (
    <DashboardLayout>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold font-display text-foreground">Document Requests</h1>
          <p className="text-muted-foreground mt-1">Process and manage student document requests</p>
        </div>
        <button onClick={() => load()} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-border text-sm font-medium text-foreground hover:bg-muted transition-colors">
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <div className="bg-card rounded-xl border border-border px-5 py-4 flex items-center gap-3">
          <Clock size={20} className="text-muted-foreground" />
          <div>
            <p className="text-2xl font-bold font-display text-foreground">{pendingCount}</p>
            <p className="text-xs text-muted-foreground">Pending</p>
          </div>
        </div>
        <div className="bg-card rounded-xl border border-border px-5 py-4 flex items-center gap-3">
          <CheckCircle size={20} className="text-success" />
          <div>
            <p className="text-2xl font-bold font-display text-foreground">{readyCount}</p>
            <p className="text-xs text-muted-foreground">Ready</p>
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

      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="overflow-x-auto">
          {loading ? (
            <div className="flex items-center justify-center py-16 text-muted-foreground text-sm">
              <Loader2 size={18} className="animate-spin mr-2" /> Loading...
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-12 text-center">
              <FileText size={36} className="mx-auto text-muted-foreground mb-3" />
              <p className="text-sm text-muted-foreground">No document requests found</p>
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
                  const cfg = statusConfig[r.status] ?? statusConfig.Pending;
                  return (
                    <tr key={r.id} className="border-b border-border last:border-0 hover:bg-muted/50 transition-colors">
                      <td className="px-6 py-4 font-medium text-foreground">{r.first_name} {r.last_name}</td>
                      <td className="px-6 py-4 font-mono text-muted-foreground">{r.index_number}</td>
                      <td className="px-6 py-4 text-foreground">{r.doc_type}</td>
                      <td className="px-6 py-4 text-muted-foreground max-w-[180px] truncate">{r.purpose}</td>
                      <td className="px-6 py-4 text-muted-foreground">{new Date(r.requested_at).toLocaleDateString()}</td>
                      <td className="px-6 py-4 text-center">
                        <span className={`inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full ${cfg.className}`}>
                          {cfg.icon}{r.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="inline-flex items-center gap-1">
                          {r.status === "Pending" ? (
                            <button
                              onClick={() => updateStatus(r.id, "Ready")}
                              disabled={updating === r.id}
                              className="px-3 py-1.5 rounded-lg gradient-gold text-secondary-foreground text-xs font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
                            >
                              {updating === r.id ? <Loader2 size={12} className="animate-spin" /> : "Mark Ready"}
                            </button>
                          ) : (
                            <span className="text-xs text-success font-medium">Done</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default ManageDocuments;
