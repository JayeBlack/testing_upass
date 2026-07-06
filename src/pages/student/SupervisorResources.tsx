import DashboardLayout from "@/components/DashboardLayout";
import { FileText, Bell, Download, Loader2, BookOpen } from "lucide-react";
import { useEffect, useState, useRef } from "react";
import { apiFetch } from "@/lib/api";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";

interface Resource {
  id: string;
  file_name: string;
  file_url: string;
  file_type: string;
  file_size: string | null;
  category: string;
  description: string | null;
  uploaded_at: string;
  uploader_name: string;
  is_read: boolean;
}

interface Announcement {
  id: string;
  text: string;
  visibility: string;
  scheduled_at: string | null;
  created_at: string;
  author_name: string;
  is_read: boolean;
}

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

const markRead = (item_type: "resource" | "announcement", item_id: string) => {
  apiFetch("/supervisors/student/mark-read", {
    method: "POST",
    body: JSON.stringify({ item_type, item_id: Number(item_id) }),
  }).catch(() => {});
};

const SupervisorResources = () => {
  const [resources, setResources] = useState<Resource[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("resources");
  const markedRef = useRef<Set<string>>(new Set());

  const load = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const [res, ann] = await Promise.all([
        apiFetch<Resource[]>("/supervisors/student/resources"),
        apiFetch<Announcement[]>("/supervisors/student/announcements"),
      ]);
      setResources(res || []);
      setAnnouncements(ann || []);
    } catch { /* backend offline */ }
    finally { if (!silent) setLoading(false); }
  };

  useEffect(() => {
    load();
    const interval = setInterval(() => load(true), 30000);
    return () => clearInterval(interval);
  }, []);

  // When tab becomes active, mark all unread items in that tab as read
  useEffect(() => {
    if (activeTab === "resources") {
      resources.filter((r) => !r.is_read).forEach((r) => {
        const key = `resource-${r.id}`;
        if (!markedRef.current.has(key)) {
          markedRef.current.add(key);
          markRead("resource", r.id);
        }
      });
      // Optimistically mark all as read in UI
      setResources((prev) => prev.map((r) => ({ ...r, is_read: true })));
    } else {
      announcements.filter((a) => !a.is_read).forEach((a) => {
        const key = `announcement-${a.id}`;
        if (!markedRef.current.has(key)) {
          markedRef.current.add(key);
          markRead("announcement", a.id);
        }
      });
      setAnnouncements((prev) => prev.map((a) => ({ ...a, is_read: true })));
    }
  }, [activeTab, resources.length, announcements.length]);

  const unreadResources = resources.filter((r) => !r.is_read).length;
  const unreadAnnouncements = announcements.filter((a) => !a.is_read).length;

  return (
    <DashboardLayout>
      <div className="mb-8">
        <h1 className="text-3xl font-bold font-display text-foreground">Resources & Notices</h1>
        <p className="text-muted-foreground mt-1">Resources and announcements shared by your supervisor</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList>
          <TabsTrigger value="resources" className="gap-2">
            <BookOpen size={16} /> Resources
            {unreadResources > 0 && (
              <Badge variant="secondary" className="ml-1">{unreadResources}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="announcements" className="gap-2">
            <Bell size={16} /> Announcements
            {unreadAnnouncements > 0 && (
              <Badge variant="secondary" className="ml-1">{unreadAnnouncements}</Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Resources */}
        <TabsContent value="resources">
          {loading ? (
            <div className="flex items-center justify-center py-16 text-muted-foreground text-sm">
              <Loader2 size={18} className="animate-spin mr-2" /> Loading...
            </div>
          ) : resources.length === 0 ? (
            <div className="bg-card rounded-xl border border-border p-12 text-center">
              <BookOpen size={40} className="mx-auto text-muted-foreground/40 mb-3" />
              <p className="text-sm text-muted-foreground">No resources shared with you yet.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {resources.map((r) => (
                <div key={r.id} className={`bg-card rounded-xl border p-4 flex items-center justify-between gap-4 transition-colors ${!r.is_read ? "border-secondary/50 bg-secondary/5" : "border-border"}`}>
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <FileText size={18} className="text-primary" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-foreground truncate">{r.file_name}</p>
                        {!r.is_read && <span className="w-2 h-2 rounded-full bg-secondary shrink-0" />}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        <Badge variant="secondary" className="text-xs">{r.category}</Badge>
                        {r.file_size && <span className="text-xs text-muted-foreground">{r.file_size}</span>}
                        <span className="text-xs text-muted-foreground">by {r.uploader_name} · {formatDate(r.uploaded_at)}</span>
                      </div>
                      {r.description && <p className="text-xs text-muted-foreground mt-1">{r.description}</p>}
                    </div>
                  </div>
                  <button
                    onClick={async () => {
                      try {
                        const resp = await fetch(r.file_url);
                        if (!resp.ok) throw new Error("Download failed");
                        const blob = await resp.blob();
                        const blobUrl = URL.createObjectURL(blob);
                        const a = document.createElement("a");
                        a.href = blobUrl;
                        a.download = r.file_name;
                        document.body.appendChild(a);
                        a.click();
                        setTimeout(() => { URL.revokeObjectURL(blobUrl); document.body.removeChild(a); }, 500);
                      } catch { window.open(r.file_url, "_blank"); }
                    }}
                    className="shrink-0 p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                    title="Download"
                  >
                    <Download size={18} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Announcements */}
        <TabsContent value="announcements">
          {loading ? (
            <div className="flex items-center justify-center py-16 text-muted-foreground text-sm">
              <Loader2 size={18} className="animate-spin mr-2" /> Loading...
            </div>
          ) : announcements.length === 0 ? (
            <div className="bg-card rounded-xl border border-border p-12 text-center">
              <Bell size={40} className="mx-auto text-muted-foreground/40 mb-3" />
              <p className="text-sm text-muted-foreground">No announcements from your supervisor yet.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {announcements.map((a) => (
                <div key={a.id} className={`bg-card rounded-xl border p-5 space-y-2 transition-colors ${!a.is_read ? "border-secondary/50 bg-secondary/5" : "border-border"}`}>
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-secondary/10 flex items-center justify-center">
                        <Bell size={14} className="text-secondary" />
                      </div>
                      <span className="text-sm font-medium text-foreground">From {a.author_name}</span>
                      {!a.is_read && <span className="w-2 h-2 rounded-full bg-secondary" />}
                    </div>
                    <span className="text-xs text-muted-foreground">{formatDate(a.created_at)}</span>
                  </div>
                  <p className="text-sm text-foreground leading-relaxed pl-10">{a.text}</p>
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </DashboardLayout>
  );
};

export default SupervisorResources;
