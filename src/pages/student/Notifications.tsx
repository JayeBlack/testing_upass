import DashboardLayout from "@/components/DashboardLayout";
import { Bell, Banknote, FileText, Calendar, CheckCircle, Trash2 } from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

interface Notification {
  id: string;
  title: string;
  message: string;
  type: "fee" | "thesis" | "exam" | "general" | "clearance" | "report" | "admin";
  severity: "info" | "warning" | "success";
  date: string;
  read: boolean;
}

const roleNotifications: Record<string, Notification[]> = {
  Student: [
    { id: "s1", title: "Fee Payment Reminder", message: "You have an outstanding balance of GH₵ 1,600.00 for Semester 2, 2023/2024. Please settle before registration closes.", type: "fee", severity: "warning", date: "2026-02-14", read: false },
    { id: "s2", title: "Thesis Feedback Available", message: "Dr. Abena Osei has reviewed your Chapter 2 submission. Check your thesis page for comments.", type: "thesis", severity: "info", date: "2026-02-13", read: false },
    { id: "s3", title: "Exam Timetable Published", message: "The end-of-semester exam timetable for Semester 1, 2025/2026 has been published.", type: "exam", severity: "info", date: "2026-02-12", read: true },
    { id: "s4", title: "Course Registration Deadline", message: "Course registration for Semester 1 closes on 28th February 2026.", type: "general", severity: "warning", date: "2026-02-10", read: true },
    { id: "s5", title: "Library Clearance Approved", message: "Your library clearance has been approved by Mrs. Akua Boateng.", type: "clearance", severity: "success", date: "2026-02-08", read: true },
    { id: "s6", title: "Results Published", message: "Results for Semester 2, 2024/2025 have been published.", type: "general", severity: "info", date: "2026-01-20", read: true },
  ],
  Supervisor: [
    { id: "sp1", title: "New Thesis Submission", message: "Kwame Mensah has submitted Chapter 3 of his thesis for your review.", type: "thesis", severity: "info", date: "2026-02-14", read: false },
    { id: "sp2", title: "Review Deadline Approaching", message: "You have 3 pending thesis reviews due within the next 5 days.", type: "thesis", severity: "warning", date: "2026-02-13", read: false },
    { id: "sp3", title: "New Student Assigned", message: "Yaw Boateng (MSc. Computer Science) has been assigned to you for supervision.", type: "general", severity: "info", date: "2026-02-10", read: true },
    { id: "sp4", title: "Thesis Proposal Approved", message: "The thesis proposal for Esi Appiah has been approved by the department.", type: "thesis", severity: "success", date: "2026-02-08", read: true },
  ],
  Admin: [
    { id: "a1", title: "New Student Registrations", message: "12 new postgraduate students have completed registration and need course approval.", type: "admin", severity: "info", date: "2026-02-14", read: false },
    { id: "a2", title: "Fee Compliance Alert", message: "44 students have outstanding fees. Compliance rate is currently at 82%.", type: "fee", severity: "warning", date: "2026-02-13", read: false },
    { id: "a3", title: "Pass List Generated", message: "The pass list for Semester 1, 2025/2026 has been generated and is ready for review.", type: "general", severity: "success", date: "2026-02-11", read: true },
    { id: "a4", title: "Exam Timetable Published", message: "The exam timetable for all programs has been published successfully.", type: "exam", severity: "info", date: "2026-02-09", read: true },
    { id: "a5", title: "System Maintenance", message: "Scheduled maintenance on 20th Feb 2026 from 12:00 AM to 4:00 AM.", type: "general", severity: "warning", date: "2026-02-07", read: true },
  ],
  Dean: [
    { id: "d1", title: "Clearance Requests Pending", message: "5 new clearance requests are awaiting your approval at the Dean's Office stage.", type: "clearance", severity: "warning", date: "2026-02-14", read: false },
    { id: "d2", title: "CWA Report Ready", message: "The CWA performance report for all programs has been compiled and is ready for review.", type: "general", severity: "info", date: "2026-02-13", read: false },
    { id: "d3", title: "Graduation List Finalized", message: "56 students have met all requirements and have been added to the graduation list.", type: "clearance", severity: "success", date: "2026-02-11", read: true },
    { id: "d4", title: "Program Review Meeting", message: "Reminder: Postgraduate program review meeting scheduled for 18th Feb 2026.", type: "general", severity: "info", date: "2026-02-09", read: true },
  ],
  Accountant: [
    { id: "ac1", title: "Daily Fee Collection Summary", message: "GH₵ 15,400 in fee payments received today across all programs.", type: "fee", severity: "info", date: "2026-02-14", read: false },
    { id: "ac2", title: "Outstanding Fees Alert", message: "3 students have been flagged for exceeding the fee payment deadline.", type: "fee", severity: "warning", date: "2026-02-13", read: false },
    { id: "ac3", title: "Monthly Report Due", message: "The monthly financial report for January 2026 is due by end of this week.", type: "report", severity: "warning", date: "2026-02-12", read: false },
    { id: "ac4", title: "Payment Reconciliation Complete", message: "All payments for Mining Engineering program have been reconciled.", type: "fee", severity: "success", date: "2026-02-10", read: true },
    { id: "ac5", title: "Export Completed", message: "Financial summary report for Semester 1 has been exported successfully.", type: "report", severity: "success", date: "2026-02-08", read: true },
  ],
  "Exams Officer": [
    { id: "eo1", title: "Results Submission Deadline", message: "Lecturers must submit all grades by 20th February 2026.", type: "exam", severity: "warning", date: "2026-02-14", read: false },
    { id: "eo2", title: "Pass List Ready for Review", message: "The pass list for Semester 1 has been generated and is pending your approval.", type: "general", severity: "info", date: "2026-02-12", read: true },
  ],
};

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
  info: "bg-info/10 text-info",
  warning: "bg-warning/10 text-warning",
  success: "bg-success/10 text-success",
};

const Notifications = () => {
  const { user } = useAuth();
  const initialNotifications = roleNotifications[user?.role || "Student"] || [];
  const [notifications, setNotifications] = useState<Notification[]>(initialNotifications);
  const { toast } = useToast();
  const unreadCount = (notifications || []).filter((n) => !n.read).length;

  const markAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const markRead = (id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  };

  const deleteNotification = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const notif = notifications.find((n) => n.id === id);
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    toast({ title: "Notification deleted", description: notif?.title });
  };

  const formatDate = (d: string) => {
    const date = new Date(d);
    return date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  };

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

      {notifications.length === 0 ? (
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
                n.read ? "border-border" : "border-secondary/50 bg-secondary/5"
              }`}
            >
              <div className="flex items-start gap-3 sm:gap-4">
                <div className={`shrink-0 w-9 h-9 rounded-lg flex items-center justify-center ${severityStyles[n.severity]}`}>
                  {typeIcons[n.type]}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className={`text-sm font-medium ${n.read ? "text-foreground" : "text-foreground font-semibold"}`}>
                      {n.title}
                    </p>
                    <div className="flex items-center gap-2 shrink-0">
                      {!n.read && <span className="w-2 h-2 rounded-full bg-secondary" />}
                      <button
                        onClick={(e) => deleteNotification(n.id, e)}
                        className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                        title="Delete notification"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{n.message}</p>
                  <p className="text-xs text-muted-foreground/60 mt-2">{formatDate(n.date)}</p>
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
