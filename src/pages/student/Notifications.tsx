import DashboardLayout from "@/components/DashboardLayout";
import { Bell, Banknote, FileText, Calendar, CheckCircle, Trash2, Loader2, Download } from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";
import { apiFetch } from "@/lib/api";

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  severity: string;
  is_read: boolean;
  created_at: string;
}

const typeIcons: Record<string, React.ReactNode> = {
  fee: <Banknote size={16} />,
  thesis: <FileText size={16} />,
  exam: <Calendar size={16} />,
  general: <Bell size={16} />,
  clearance: <CheckCircle size={16} />,
  report: <FileText size={16} />,
  admin: <Bell size={16} />,
};

const severityStyles: Record<string, string> = {
  info: "bg-primary/10 text-primary",
  warning: "bg-warning/10 text-warning",
  success: "bg-success/10 text-success",
};

const Notifications = () => {
  const { toast } = useToast();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const data = await apiFetch<Notification[]>("/notifications");
      setNotifications(data || []);
    } catch {
      // backend offline
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const interval = setInterval(() => load(true), 10000);
    return () => clearInterval(interval);
  }, [load]);

  const markRead = async (id: string) => {
    const n = notifications.find((n) => n.id === id);
    if (!n || n.is_read) return;
    setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, is_read: true } : n));
    try {
      await apiFetch(`/notifications/${id}/read`, { method: "PUT" });
    } catch {
      // revert on failure
      setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, is_read: false } : n));
    }
  };

  const markAllRead = async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    try {
      await apiFetch("/notifications/read-all", { method: "PUT" });
    } catch {
      load();
    }
  };

  const deleteNotification = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const notif = notifications.find((n) => n.id === id);
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    try {
      await apiFetch(`/notifications/${id}`, { method: "DELETE" });
      toast({ title: "Notification deleted", description: notif?.title });
    } catch {
      load();
    }
  };

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

  return (
    <DashboardLayout>
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold font-display text-foreground">Notifications</h1>
          <p className="text-muted-foreground mt-1">
            {unreadCount > 0 ? `${unreadCount} unread notification${unreadCount > 1 ? "s" : ""}` : "All caught up!"}
          </p>
        </div>
        {unreadCount > 0 && (
          <button onClick={markAllRead} className="text-sm text-muted-foreground hover:text-foreground transition-colors self-start">
            Mark all as read
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24 text-muted-foreground text-sm">
          <Loader2 size={18} className="animate-spin mr-2" /> Loading notifications...
        </div>
      ) : notifications.length === 0 ? (
        <div className="bg-card rounded-xl border border-border p-12 text-center">
          <Bell size={48} className="mx-auto text-muted-foreground/40 mb-3" />
          <p className="text-sm text-muted-foreground">No notifications</p>
        </div>
      ) : (
        <div className="space-y-3">
          {notifications.map((n) => (
            <div
              key={n.id}
              onClick={() => markRead(n.id)}
              className={`bg-card rounded-xl border p-4 sm:p-5 cursor-pointer transition-all hover:bg-muted/30 ${
                n.is_read ? "border-border" : "border-secondary/50 bg-secondary/5"
              }`}
            >
              <div className="flex items-start gap-3 sm:gap-4">
                <div className={`shrink-0 w-9 h-9 rounded-lg flex items-center justify-center ${severityStyles[n.severity] ?? severityStyles.info}`}>
                  {typeIcons[n.type] ?? <Bell size={16} />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className={`text-sm ${n.is_read ? "font-medium text-foreground" : "font-semibold text-foreground"}`}>
                      {n.title}
                    </p>
                    <div className="flex items-center gap-2 shrink-0">
                      {!n.is_read && <span className="w-2 h-2 rounded-full bg-secondary" />}
                      <button
                        onClick={(e) => deleteNotification(n.id, e)}
                        className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                        title="Delete notification"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                  <div className="mt-2">
                    {n.type === "fee" ? (
                      <div className="flex items-center gap-3">
                        <a
                          href={(() => {
                            const urlMatch = n.message.match(/(https?:\/\/[^\s]+\.(xlsx|xls|csv))/);
                            return urlMatch ? urlMatch[1] : "#";
                          })()}
                          download
                          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:opacity-90 transition-opacity"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Download size={14} />
                          Download Fee Schedule
                        </a>
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground whitespace-pre-line">{n.message}</p>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground/60 mt-2">{formatDate(n.created_at)}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </DashboardLayout>
  );
};

export default Notifications;
