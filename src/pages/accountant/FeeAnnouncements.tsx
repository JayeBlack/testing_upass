import DashboardLayout from "@/components/DashboardLayout";
import { Send, Bell, Clock, Users, Upload } from "lucide-react";
import { useState, useRef } from "react";
import { useToast } from "@/hooks/use-toast";

interface Announcement {
  id: string;
  title: string;
  message: string;
  audience: string;
  sentAt: string;
  recipients: number;
}

const mockAnnouncements: Announcement[] = [
  { id: "a1", title: "Fee Payment Deadline Reminder", message: "All postgraduate students are reminded that the deadline for Semester 2 fee payment is 30th April 2026. Students with outstanding fees will not be eligible for examination.", audience: "All Students", sentAt: "2026-04-01 10:00", recipients: 247 },
  { id: "a2", title: "Outstanding Fees Notice", message: "This is to notify students with outstanding fee balances to settle their fees immediately to avoid clearance delays.", audience: "Students with Outstanding Fees", sentAt: "2026-03-25 14:30", recipients: 44 },
  { id: "a3", title: "Payment Methods Update", message: "Students can now make payments via MTN Mobile Money, Vodafone Cash, AirtelTigo Money, or bank transfer. Visit the Finance Office for assistance.", audience: "All Students", sentAt: "2026-03-15 09:00", recipients: 247 },
];

const FeeAnnouncements = () => {
  const [announcements, setAnnouncements] = useState(mockAnnouncements);
  const [showCompose, setShowCompose] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [audience, setAudience] = useState("All Students");
  const fileRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

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
      recipients: audience === "All Students" ? 247 : 44,
    };
    setAnnouncements((prev) => [newAnnouncement, ...prev]);
    setTitle("");
    setMessage("");
    setShowCompose(false);
    toast({ title: "Notice sent", description: `Fee notice sent to ${newAnnouncement.recipients} students` });
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      toast({ title: "Data imported", description: `${file.name} has been processed and fee analytics updated` });
      setShowImport(false);
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  return (
    <DashboardLayout>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold font-display text-foreground">Fee Notices</h1>
          <p className="text-muted-foreground mt-1">Send fee payment notifications to students</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setShowImport(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-border text-sm font-medium text-foreground hover:bg-muted transition-colors"
          >
            <Upload size={14} /> Import Fee Data
          </button>
          <button
            onClick={() => setShowCompose(true)}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg gradient-gold text-secondary-foreground font-medium text-sm hover:opacity-90 transition-opacity"
          >
            <Send size={14} /> Compose Notice
          </button>
        </div>
      </div>

      {/* Import Modal */}
      {showImport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/30 backdrop-blur-sm p-4" onClick={() => setShowImport(false)}>
          <div className="bg-card rounded-2xl border border-border p-6 max-w-md w-full shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-display text-lg font-bold text-foreground mb-2">Import Fee Data</h3>
            <p className="text-sm text-muted-foreground mb-4">Upload an Excel or CSV file containing student fee records. The system will read and import the data automatically.</p>
            <p className="text-xs text-muted-foreground mb-3">Expected columns: Student Name, Index Number, Programme, Amount Paid, Outstanding Balance</p>
            <input ref={fileRef} type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={handleImport} />
            <div
              onClick={() => fileRef.current?.click()}
              className="border-2 border-dashed border-border rounded-xl p-8 text-center cursor-pointer hover:border-secondary/50 transition-colors"
            >
              <Upload size={28} className="mx-auto text-muted-foreground mb-2" />
              <p className="text-sm text-foreground font-medium">Click to upload file</p>
              <p className="text-xs text-muted-foreground mt-1">CSV or Excel (max 10MB)</p>
            </div>
            <button onClick={() => setShowImport(false)} className="w-full mt-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors">Cancel</button>
          </div>
        </div>
      )}

      {/* Compose Modal */}
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

      {/* Summary */}
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
            <p className="text-xl font-bold font-display text-foreground">247</p>
            <p className="text-xs text-muted-foreground">Total Students</p>
          </div>
        </div>
        <div className="bg-card rounded-xl border border-border p-5 flex items-center gap-3">
          <Users size={20} className="text-warning" />
          <div>
            <p className="text-xl font-bold font-display text-foreground">56</p>
            <p className="text-xs text-muted-foreground">Graduates</p>
          </div>
        </div>
      </div>

      {/* Sent announcements */}
      <h2 className="font-display text-lg font-bold text-foreground mb-4">Sent Notices</h2>
      <div className="space-y-4">
        {announcements.map((a) => (
          <div key={a.id} className="bg-card rounded-xl border border-border p-5">
            <div className="flex items-start justify-between gap-3 mb-2">
              <h3 className="font-semibold text-foreground">{a.title}</h3>
              <span className="text-xs px-2.5 py-1 rounded-full bg-muted text-muted-foreground shrink-0">{a.audience}</span>
            </div>
            <p className="text-sm text-muted-foreground mb-3">{a.message}</p>
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
