import DashboardLayout from "@/components/DashboardLayout";
import { Send, Bell, Clock, Users, Upload, FileSpreadsheet } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { useDataStore } from "@/contexts/DataStoreContext";
import { useAdminDepartment } from "@/hooks/use-admin-department";
import { apiFetch } from "@/lib/api";

interface Announcement {
  id: string;
  title: string;
  message: string;
  audience: string;
  sentAt: string;
  recipients: number;
  downloadUrl?: string;
}

interface FeeListItem {
  programme: string;
  level: string;
  amount: string;
}

const mockAnnouncements: Announcement[] = [];

interface StudentRow {
  id: number;
  index_number: string;
  first_name: string;
  last_name: string;
  department_name?: string;
  program_name?: string;
}

const FeeAnnouncements = () => {
  const { students, graduands } = useDataStore();
  const { isSuperAdmin, adminDepartment } = useAdminDepartment();
  const [announcements, setAnnouncements] = useState<Announcement[]>(() => {
    try {
      const saved = localStorage.getItem("sentNotices");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const noticesCount = announcements.length;
  const [showCompose, setShowCompose] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [audience, setAudience] = useState("All Students");
  const [importedFeeList, setImportedFeeList] = useState<FeeListItem[]>([]);
  const [importLoading, setImportLoading] = useState(false);
  const [scheduleDownloadUrl, setScheduleDownloadUrl] = useState<string | null>(null);
  const [apiStudents, setApiStudents] = useState<StudentRow[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(true);
  const [departments, setDepartments] = useState<string[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  // Always fetch students from backend API for accurate counts
  useEffect(() => {
    const load = async () => {
      try {
        const res = await apiFetch<{ data: StudentRow[]; pagination?: any }>("/students?limit=1000");
        const rows = (res as any).data || (Array.isArray(res) ? res : []);
        setApiStudents(rows);
      } catch (err) {
        console.error("Failed to fetch students:", err);
      } finally {
        setLoadingStudents(false);
      }
    };
    load();
  }, []);

  // Fetch departments for dropdown
  useEffect(() => {
    const loadDepts = async () => {
      try {
        const res = await apiFetch<{ id: number; name: string }[]>("/departments");
        setDepartments(res.map((d) => d.name));
      } catch {
        // keep empty
      }
    };
    loadDepts();
  }, []);

  // Fetch sent notices list from backend
  useEffect(() => {
    const loadNotices = async () => {
      try {
        const res = await apiFetch<any[]>("/notifications?limit=100");
        const mapped = res.map((n) => ({
          id: n.id,
          title: n.title,
          message: n.message,
          audience: "All Students",
          sentAt: n.created_at,
          recipients: 0,
        }));
        if (mapped.length > 0) setAnnouncements(mapped);
      } catch {
        // keep local state if backend unavailable
      }
    };
    loadNotices();
  }, []);

  // Persist announcements to localStorage
  useEffect(() => {
    localStorage.setItem("sentNotices", JSON.stringify(announcements));
  }, [announcements]);

  const allStudents = students.length > 0 ? students : apiStudents.map((s) => ({
    id: String(s.id),
    name: `${s.first_name} ${s.last_name}`,
    index: s.index_number,
    email: "",
    program: s.program_name || "",
    department: s.department_name || "",
    status: "Active" as const,
  }));

  const deptStudents = adminDepartment ? allStudents.filter((s) => s.department === adminDepartment) : allStudents;
  const totalStudentCount = allStudents.length;
  const totalGraduandCount = 0;

  const handleSend = async () => {
    if (!title.trim() || !message.trim()) {
      toast({ title: "Missing fields", description: "Please fill in the title and message", variant: "destructive" });
      return;
    }
    try {
      await apiFetch("/notifications/broadcast", {
        method: "POST",
        body: JSON.stringify({ title, message, type: "general", severity: "info" }),
      });
      const newAnnouncement: Announcement = {
        id: `a${Date.now()}`,
        title,
        message,
        audience,
        sentAt: new Date().toISOString().replace("T", " ").slice(0, 16),
        recipients: totalStudentCount,
      };
      setAnnouncements((prev) => [newAnnouncement, ...prev]);
      setTitle("");
      setMessage("");
      setShowCompose(false);
      toast({ title: "Notice sent", description: `Fee notice sent to ${totalStudentCount} students` });
    } catch (err: any) {
      toast({ title: "Failed to send", description: err.message || "Could not send notice", variant: "destructive" });
    }
  };

  const parseCSV = (text: string): FeeListItem[] => {
    const lines = text.trim().split("\n");
    if (lines.length < 2) return [];
    const headers = lines[0].split(",").map((h) => h.trim().toLowerCase().replace(/"/g, ""));
    const progIdx = headers.findIndex((h) => h.includes("programme") || h.includes("program"));
    const levelIdx = headers.findIndex((h) => h.includes("level") || h.includes("year"));
    const amountIdx = headers.findIndex((h) => h.includes("amount") || h.includes("fee") || h.includes("total"));

    return lines.slice(1).filter((l) => l.trim()).map((line) => {
      const cols = line.split(",").map((c) => c.trim().replace(/"/g, ""));
      return {
        programme: cols[progIdx >= 0 ? progIdx : 0] || "",
        level: cols[levelIdx >= 0 ? levelIdx : 1] || "",
        amount: cols[amountIdx >= 0 ? amountIdx : 2] || "",
      };
    }).filter((item) => item.programme);
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportLoading(true);

    const isExcel = file.name.endsWith(".xlsx") || file.name.endsWith(".xls");

    if (!file.name.endsWith(".csv") && !isExcel) {
      toast({ title: "Invalid format", description: "Please upload a CSV (.csv) or Excel (.xlsx) file", variant: "destructive" });
      e.target.value = "";
      setImportLoading(false);
      return;
    }

    try {
      if (isExcel) {
        // Save the Excel file to backend for download, then parse it
        const saveForm = new FormData();
        saveForm.append("file", file);
        const saveResult = await apiFetch<{ downloadUrl: string }>("/fees/save-schedule", {
          method: "POST",
          body: saveForm,
        });
        setScheduleDownloadUrl(saveResult.downloadUrl);

        // Also parse for preview
        const parseForm = new FormData();
        parseForm.append("file", file);
        const result = await apiFetch<{ rows: FeeListItem[] }>("/fees/parse-fee-schedule", {
          method: "POST",
          body: parseForm,
        });
        if (result.rows.length === 0) {
          toast({ title: "Import failed", description: "Could not parse any records. Ensure columns include Programme, Level, and Amount.", variant: "destructive" });
          return;
        }
        setImportedFeeList(result.rows);
        toast({ title: "Fee schedule imported", description: `${result.rows.length} records loaded from Excel.` });
      } else {
        // Save CSV to backend for download, then parse in-browser
        const saveForm = new FormData();
        saveForm.append("file", file);
        const saveResult = await apiFetch<{ downloadUrl: string }>("/fees/save-schedule", {
          method: "POST",
          body: saveForm,
        });
        setScheduleDownloadUrl(saveResult.downloadUrl);

        const reader = new FileReader();
        reader.onload = (ev) => {
          const text = ev.target?.result as string;
          const parsed = parseCSV(text);
          if (parsed.length === 0) {
            toast({ title: "Import failed", description: "Could not parse any records. Ensure columns include Programme, Level, and Amount.", variant: "destructive" });
            return;
          }
          setImportedFeeList(parsed);
          toast({ title: "Fee schedule imported", description: `${parsed.length} records loaded from CSV.` });
        };
        reader.readAsText(file);
      }
      setShowImport(false);
    } catch (err: any) {
      toast({ title: "Import failed", description: err.message || "Failed to parse file", variant: "destructive" });
    } finally {
      setImportLoading(false);
      e.target.value = "";
    }
  };

  const handleSendFeeList = async () => {
    if (importedFeeList.length === 0) return;
    const feeMsg = importedFeeList.map((f) => `${f.programme} (${f.level}): GHS ${f.amount}`).join("\n");
    const title = "School Fees Schedule Published";
    const message = `The following fee schedule has been published for the current academic year:\n\n${feeMsg}\n\nPlease make payments before the deadline.`;
    try {
      // Send notification with download link embedded
      const fullMessage = scheduleDownloadUrl 
        ? `${message}\n\n📎 Download the full fee schedule: ${window.location.origin}${scheduleDownloadUrl}`
        : message;
      
      await apiFetch("/notifications/broadcast", {
        method: "POST",
        body: JSON.stringify({ title, message: fullMessage, type: "fee", severity: "info" }),
      });
      const newAnnouncement: Announcement = {
        id: `a${Date.now()}`,
        title,
        message, // Store clean message without URL for display
        audience: "All Students",
        sentAt: new Date().toISOString().replace("T", " ").slice(0, 16),
        recipients: totalStudentCount,
        downloadUrl: scheduleDownloadUrl, // Store URL separately for display
      };
      setAnnouncements((prev) => [newAnnouncement, ...prev]);
      setImportedFeeList([]);
      setScheduleDownloadUrl(null);
      toast({ title: "Fee schedule sent", description: `Fee list has been sent to ${totalStudentCount} students` });
    } catch (err: any) {
      toast({ title: "Failed to send", description: err.message || "Could not send fee schedule", variant: "destructive" });
    }
  };

  return (
    <DashboardLayout>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold font-display text-foreground">Fee Notices</h1>
          <p className="text-muted-foreground mt-1">
            {isSuperAdmin ? "Import fee schedules and send payment notifications to students" : `${adminDepartment} — Fee notifications`}
          </p>
        </div>
        <div className="flex gap-3">
          <button onClick={() => setShowImport(true)} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-border text-sm font-medium text-foreground hover:bg-muted transition-colors">
            <Upload size={14} /> Import Fee Schedule
          </button>
          <button onClick={() => setShowCompose(true)} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg gradient-gold text-secondary-foreground font-medium text-sm hover:opacity-90 transition-opacity">
            <Send size={14} /> Compose Notice
          </button>
        </div>
      </div>

      {showImport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/30 backdrop-blur-sm p-4" onClick={() => setShowImport(false)}>
          <div className="bg-card rounded-2xl border border-border p-6 max-w-md w-full shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-display text-lg font-bold text-foreground mb-2">Import School Fees Schedule</h3>
            <p className="text-sm text-muted-foreground mb-1">
              Upload a CSV or Excel (.xlsx) file containing the school fees schedule. Once imported, you can send it as a notice to all students.
            </p>
            <p className="text-xs text-muted-foreground mb-4">
              Expected columns: <strong>Programme</strong>, <strong>Level</strong>, <strong>Amount</strong>
            </p>
            <input ref={fileRef} type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={handleImport} />
            <div
              onClick={() => !importLoading && fileRef.current?.click()}
              className="border-2 border-dashed border-border rounded-xl p-8 text-center cursor-pointer hover:border-secondary/50 transition-colors"
            >
              {importLoading ? (
                <div className="text-muted-foreground text-sm">Processing file...</div>
              ) : (
                <>
                  <FileSpreadsheet size={32} className="mx-auto text-muted-foreground mb-2" />
                  <p className="text-sm text-foreground font-medium">Click to upload</p>
                  <p className="text-xs text-muted-foreground mt-1">Accepts .csv and .xlsx files</p>
                </>
              )}
            </div>
            <button onClick={() => setShowImport(false)} className="w-full mt-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
              Cancel
            </button>
          </div>
        </div>
      )}

      {importedFeeList.length > 0 && (
        <div className="bg-card rounded-xl border border-border p-5 mb-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-display text-sm font-bold text-foreground">
              <span className="flex items-center gap-2">
                <FileSpreadsheet size={16} className="text-primary" />
                Imported Fee Schedule ({importedFeeList.length} records)
              </span>
            </h3>
            <div className="flex gap-2">
              <button onClick={() => setImportedFeeList([])} className="px-3 py-1.5 text-xs border border-border rounded-lg text-muted-foreground hover:text-foreground transition-colors">
                Discard
              </button>
              <button onClick={handleSendFeeList} className="px-4 py-1.5 text-xs rounded-lg gradient-gold text-secondary-foreground font-medium hover:opacity-90 transition-opacity">
                Send as Notice
              </button>
            </div>
          </div>
          <div className="overflow-x-auto max-h-64 overflow-y-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left px-3 py-2 text-xs font-semibold text-muted-foreground">#</th>
                  <th className="text-left px-3 py-2 text-xs font-semibold text-muted-foreground">Programme</th>
                  <th className="text-left px-3 py-2 text-xs font-semibold text-muted-foreground">Level</th>
                  <th className="text-right px-3 py-2 text-xs font-semibold text-muted-foreground">Amount (GHS)</th>
                </tr>
              </thead>
              <tbody>
                {importedFeeList.map((item, i) => (
                  <tr key={i} className="border-b border-border last:border-0">
                    <td className="px-3 py-2 text-muted-foreground">{i + 1}</td>
                    <td className="px-3 py-2 text-foreground">{item.programme}</td>
                    <td className="px-3 py-2 text-muted-foreground">{item.level}</td>
                    <td className="px-3 py-2 text-right text-foreground font-medium">{item.amount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showCompose && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/30 backdrop-blur-sm p-4" onClick={() => setShowCompose(false)}>
          <div className="bg-card rounded-2xl border border-border p-6 max-w-lg w-full shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-display text-lg font-bold text-foreground mb-4">Compose Fee Notice</h3>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium text-muted-foreground">Title</label>
                <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Fee Payment Deadline Reminder" className="w-full mt-1 px-4 py-2.5 rounded-lg border border-input bg-background text-foreground text-sm focus:ring-2 focus:ring-ring outline-none" />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Audience</label>
                <select value={audience} onChange={(e) => setAudience(e.target.value)} className="w-full mt-1 px-4 py-2.5 rounded-lg border border-input bg-background text-foreground text-sm focus:ring-2 focus:ring-ring outline-none">
                  <option value="All Students">All Students</option>
                  <option value="Students with Outstanding Fees">Students with Outstanding Fees</option>
                  {departments.map((dept) => (
                    <option key={dept} value={dept}>{dept} Students</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Message</label>
                <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={4} placeholder="Type your notification message..." className="w-full mt-1 px-4 py-2.5 rounded-lg border border-input bg-background text-foreground text-sm focus:ring-2 focus:ring-ring outline-none resize-none" />
              </div>
              <button onClick={handleSend} className="w-full py-2.5 rounded-lg gradient-gold text-secondary-foreground font-medium text-sm hover:opacity-90 transition-opacity">
                Send Notice
              </button>
            </div>
            <button onClick={() => setShowCompose(false)} className="w-full mt-3 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors">Cancel</button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-card rounded-xl border border-border p-5 flex items-center gap-3">
          <Bell size={20} className="text-primary" />
          <div>
            <p className="text-xl font-bold font-display text-foreground">{noticesCount}</p>
            <p className="text-xs text-muted-foreground">Notices Sent</p>
          </div>
        </div>
        <div className="bg-card rounded-xl border border-border p-5 flex items-center gap-3">
          <Users size={20} className="text-success" />
          <div>
            <p className="text-xl font-bold font-display text-foreground">{loadingStudents ? "..." : totalStudentCount}</p>
            <p className="text-xs text-muted-foreground">Total Students</p>
          </div>
        </div>
        <div className="bg-card rounded-xl border border-border p-5 flex items-center gap-3">
          <Users size={20} className="text-warning" />
          <div>
            <p className="text-xl font-bold font-display text-foreground">{totalGraduandCount}</p>
            <p className="text-xs text-muted-foreground">Graduates</p>
          </div>
        </div>
      </div>

      <h2 className="font-display text-lg font-bold text-foreground mb-4">Sent Notices</h2>
      <div className="space-y-4">
        {announcements.map((a) => (
          <div key={a.id} className="bg-card rounded-xl border border-border p-5">
            <div className="flex items-start justify-between gap-3 mb-2">
              <h3 className="font-semibold text-foreground">{a.title}</h3>
              <span className="text-xs px-2.5 py-1 rounded-full bg-muted text-muted-foreground shrink-0">{a.audience}</span>
            </div>
            <p className="text-sm text-muted-foreground mb-3 whitespace-pre-line">{a.message}</p>
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1"><Clock size={12} /> {a.sentAt}</span>
              <span className="flex items-center gap-1"><Users size={12} /> {a.recipients} recipients</span>
            </div>
          </div>
        ))}
      </div>
    </DashboardLayout>
  );
};

export default FeeAnnouncements;