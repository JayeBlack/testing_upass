import DashboardLayout from "@/components/DashboardLayout";
import { Send, Bell, Clock, Users, Upload } from "lucide-react";
import { useState, useRef } from "react";
import { useToast } from "@/hooks/use-toast";
import { useDataStore } from "@/contexts/DataStoreContext";
import { useAdminDepartment } from "@/hooks/use-admin-department";

interface Announcement {
  id: string;
  title: string;
  message: string;
  audience: string;
  sentAt: string;
  recipients: number;
}

interface FeeListItem {
  programme: string;
  level: string;
  amount: string;
}

const mockAnnouncements: Announcement[] = [];

const FeeAnnouncements = () => {
  const { students, graduands } = useDataStore();
  const { isSuperAdmin, adminDepartment } = useAdminDepartment();
  const [announcements, setAnnouncements] = useState(mockAnnouncements);
  const [showCompose, setShowCompose] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [audience, setAudience] = useState("All Students");
  const [importedFeeList, setImportedFeeList] = useState<FeeListItem[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const deptStudents = adminDepartment ? students.filter((s) => s.department === adminDepartment) : students;
  const deptGraduands = adminDepartment ? graduands.filter((g) => g.department === adminDepartment) : graduands;
  const totalStudentCount = deptStudents.length;
  const totalGraduandCount = deptGraduands.filter((g) => g.status === "Eligible").length;

  const handleSend = () => {
    if (!title.trim() || !message.trim()) {
      toast({ title: "Missing fields", description: "Please fill in the title and message", variant: "destructive" });
      return;
    }
    const newAnnouncement: Announcement = {
      id: `a${Date.now()}`,
      title,
      message,
      audience,
      sentAt: new Date().toISOString().replace("T", " ").slice(0, 16),
      recipients: audience === "All Students" ? totalStudentCount : Math.round(totalStudentCount * 0.18),
    };
    setAnnouncements((prev) => [newAnnouncement, ...prev]);
    setTitle("");
    setMessage("");
    setShowCompose(false);
    toast({ title: "Notice sent", description: `Fee notice sent to ${newAnnouncement.recipients} students` });
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

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.endsWith(".csv")) {
      toast({ title: "Invalid format", description: "Please upload a CSV file", variant: "destructive" });
      e.target.value = "";
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const parsed = parseCSV(text);
      if (parsed.length === 0) {
        toast({ title: "Import failed", description: "Could not parse any records from the file. Ensure columns include Programme, Level, and Amount.", variant: "destructive" });
        return;
      }
      setImportedFeeList(parsed);
      toast({ title: "Fee list imported", description: `${parsed.length} fee records loaded. You can now send this as a notice to students.` });
      setShowImport(false);
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const handleSendFeeList = () => {
    if (importedFeeList.length === 0) return;
    const feeMsg = importedFeeList.map((f) => `${f.programme} (${f.level}): GHS ${f.amount}`).join("\n");
    const newAnnouncement: Announcement = {
      id: `a${Date.now()}`,
      title: "School Fees Schedule Published",
      message: `The following fee schedule has been published for the current academic year:\n\n${feeMsg}\n\nPlease make payments before the deadline.`,
      audience: "All Students",
      sentAt: new Date().toISOString().replace("T", " ").slice(0, 16),
      recipients: totalStudentCount,
    };
    setAnnouncements((prev) => [newAnnouncement, ...prev]);
    setImportedFeeList([]);
    toast({ title: "Fee schedule sent", description: "Fee list has been sent as a notice to all students" });
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
            <Upload size={14} /> Import Fee List (.csv)
          </button>
          <button onClick={() => setShowCompose(true)} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg gradient-gold text-secondary-foreground font-medium text-sm hover:opacity-90 transition-opacity">
            <Send size={14} /> Compose Notice
          </button>
        </div>
      </div>

      {showImport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/30 backdrop-blur-sm p-4" onClick={() => setShowImport(false)}>
          <div className="bg-card rounded-2xl border border-border p-6 max-w-md w-full shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-display text-lg font-bold text-foreground mb-2">Import School Fees List</h3>
            <p className="text-sm text-muted-foreground mb-4">Upload a CSV file containing the school fees schedule. Once imported, you can send it as a notice to all students so they are aware of their fees for the academic year.</p>
            <p className="text-xs text-muted-foreground mb-3">Expected columns: Programme, Level/Year, Amount</p>
            <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={handleImport} />
            <div onClick={() => fileRef.current?.click()} className="border-2 border-dashed border-border rounded-xl p-8 text-center cursor-pointer hover:border-secondary/50 transition-colors">
              <Upload size={28} className="mx-auto text-muted-foreground mb-2" />
              <p className="text-sm text-foreground font-medium">Click to upload CSV file</p>
              <p className="text-xs text-muted-foreground mt-1">Only .csv format accepted</p>
            </div>
            <button onClick={() => setShowImport(false)} className="w-full mt-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors">Cancel</button>
          </div>
        </div>
      )}

      {importedFeeList.length > 0 && (
        <div className="bg-card rounded-xl border border-border p-5 mb-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-display text-sm font-bold text-foreground">Imported Fee Schedule ({importedFeeList.length} records)</h3>
            <div className="flex gap-2">
              <button onClick={() => setImportedFeeList([])} className="px-3 py-1.5 text-xs border border-border rounded-lg text-muted-foreground hover:text-foreground transition-colors">Discard</button>
              <button onClick={handleSendFeeList} className="px-4 py-1.5 text-xs rounded-lg gradient-gold text-secondary-foreground font-medium hover:opacity-90 transition-opacity">Send as Notice</button>
            </div>
          </div>
          <div className="overflow-x-auto">
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
                    <td className="px-3 py-2 text-right text-foreground">{item.amount}</td>
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
                  <option>All Students</option>
                  <option>Students with Outstanding Fees</option>
                  <option>Computer Science Students</option>
                  <option>Mining Engineering Students</option>
                  <option>Electrical Engineering Students</option>
                  <option>Mechanical Engineering Students</option>
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
            <p className="text-xl font-bold font-display text-foreground">{announcements.length}</p>
            <p className="text-xs text-muted-foreground">Notices Sent</p>
          </div>
        </div>
        <div className="bg-card rounded-xl border border-border p-5 flex items-center gap-3">
          <Users size={20} className="text-success" />
          <div>
            <p className="text-xl font-bold font-display text-foreground">{totalStudentCount}</p>
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
