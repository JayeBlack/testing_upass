import DashboardLayout from "@/components/DashboardLayout";
import { Clock, Filter, Users, Shield, BookOpen, Banknote, FileText, Loader2 } from "lucide-react";
import { useState, useEffect } from "react";
import { useAdminDepartment } from "@/hooks/use-admin-department";
import { Navigate } from "react-router-dom";
import { apiFetch } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

interface LogEntry {
  id: string;
  created_at: string;
  actor_name: string;
  actor_role: string;
  action: string;
  entity: string;
  details: string;
}

const categoryIcons: Record<string, React.ReactNode> = {
  Students: <Users size={14} />,
  Fees: <Banknote size={14} />,
  Results: <BookOpen size={14} />,
  Clearance: <Shield size={14} />,
};

const SystemLog = () => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [catFilter, setCatFilter] = useState("all");
  const [roleFilter, setRoleFilter] = useState("all");
  const { isSuperAdmin } = useAdminDepartment();
  const { toast } = useToast();

  if (!isSuperAdmin) return <Navigate to="/dashboard" replace />;

  useEffect(() => {
    apiFetch<LogEntry[]>("/audit-logs")
      .then((data) => setLogs(Array.isArray(data) ? data : []))
      .catch((error) => {
        toast({ title: "Failed to load audit logs", description: error instanceof Error ? error.message : "Please try again later.", variant: "destructive" });
      })
      .finally(() => setLoading(false));
  }, [toast]);

  const categories = [...new Set(logs.map((l) => l.entity).filter(Boolean))];
  const roles = [...new Set(logs.map((l) => l.actor_role).filter(Boolean))];

  const filtered = logs.filter((l) => {
    const matchesCat = catFilter === "all" || l.entity === catFilter;
    const matchesRole = roleFilter === "all" || l.actor_role === roleFilter;
    return matchesCat && matchesRole;
  });

  return (
    <DashboardLayout>
      <div className="mb-8">
        <h1 className="text-3xl font-bold font-display text-foreground">System Log</h1>
        <p className="text-muted-foreground mt-1">Track all activities across the system</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Filter size={16} />
          <span>Filter:</span>
        </div>
        <select value={catFilter} onChange={(e) => setCatFilter(e.target.value)} className="px-4 py-2.5 rounded-lg border border-input bg-card text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring">
          <option value="all">All Categories</option>
          {categories.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} className="px-4 py-2.5 rounded-lg border border-input bg-card text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring">
          <option value="all">All Roles</option>
          {roles.map((r) => <option key={r} value={r}>{r}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground text-sm">
          <Loader2 size={18} className="animate-spin mr-2" /> Loading audit logs...
        </div>
      ) : (
        <>
          <p className="text-sm text-muted-foreground mb-4">Showing {filtered.length} of {logs.length} entries</p>
          <div className="space-y-3">
            {filtered.length === 0 ? (
              <div className="bg-card rounded-xl border border-border p-12 text-center">
                <FileText size={36} className="mx-auto text-muted-foreground mb-3" />
                <p className="text-sm text-muted-foreground">No audit log entries found</p>
              </div>
            ) : filtered.map((log) => (
              <div key={log.id} className="bg-card rounded-xl border border-border p-4 flex items-start gap-4">
                <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center shrink-0 mt-0.5">
                  {categoryIcons[log.entity] || <FileText size={14} />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="text-sm font-medium text-foreground">{log.action}</span>
                    {log.entity && <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">{log.entity}</span>}
                    <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary">{log.actor_role}</span>
                  </div>
                  {log.details && <p className="text-sm text-muted-foreground">{log.details}</p>}
                  <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><Clock size={12} /> {new Date(log.created_at).toLocaleString()}</span>
                    <span>by {log.actor_name}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </DashboardLayout>
  );
};

export default SystemLog;
