import { useAuth } from "@/contexts/AuthContext";
import DashboardLayout from "@/components/DashboardLayout";
import { BookOpen, FileText, Users, BarChart3, Clock, CheckCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";

const StatCard = ({ icon, label, value, accent }: { icon: React.ReactNode; label: string; value: string; accent?: boolean }) => (
  <div className="bg-card rounded-xl border border-border p-6 hover:shadow-md transition-shadow">
    <div className="flex items-center justify-between mb-4">
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${accent ? "gradient-gold" : "bg-muted"}`}>
        {icon}
      </div>
    </div>
    <p className="text-2xl font-bold font-display text-foreground">{value}</p>
    <p className="text-sm text-muted-foreground mt-1">{label}</p>
  </div>
);

const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const studentStats = [
    { icon: <BookOpen size={18} className="text-secondary-foreground" />, label: "Registered Courses", value: "6", accent: true },
    { icon: <FileText size={18} className="text-muted-foreground" />, label: "Thesis Progress", value: "Ch. 3" },
    { icon: <BarChart3 size={18} className="text-muted-foreground" />, label: "CWA", value: "72.4" },
    { icon: <Clock size={18} className="text-muted-foreground" />, label: "Pending Reviews", value: "2" },
  ];

  const supervisorStats = [
    { icon: <Users size={18} className="text-secondary-foreground" />, label: "Assigned Students", value: "8", accent: true },
    { icon: <FileText size={18} className="text-muted-foreground" />, label: "Pending Reviews", value: "5" },
    { icon: <CheckCircle size={18} className="text-muted-foreground" />, label: "Approved This Month", value: "12" },
    { icon: <Clock size={18} className="text-muted-foreground" />, label: "Avg Review Time", value: "3d" },
  ];

  const adminStats = [
    { icon: <Users size={18} className="text-secondary-foreground" />, label: "Total Students", value: "247", accent: true },
    { icon: <BookOpen size={18} className="text-muted-foreground" />, label: "Active Courses", value: "34" },
    { icon: <BarChart3 size={18} className="text-muted-foreground" />, label: "Fees Cleared", value: "82%" },
    { icon: <CheckCircle size={18} className="text-muted-foreground" />, label: "Graduands", value: "56" },
  ];

  const deanStats = [
    { icon: <Users size={18} className="text-secondary-foreground" />, label: "Total Students", value: "247", accent: true },
    { icon: <CheckCircle size={18} className="text-muted-foreground" />, label: "Clearances Pending", value: "14" },
    { icon: <BarChart3 size={18} className="text-muted-foreground" />, label: "Avg CWA", value: "68.5" },
    { icon: <Clock size={18} className="text-muted-foreground" />, label: "Graduands", value: "56" },
  ];

  const accountantStats = [
    { icon: <FileText size={18} className="text-secondary-foreground" />, label: "Total Fees Collected", value: "₵1.2M", accent: true },
    { icon: <BarChart3 size={18} className="text-muted-foreground" />, label: "Compliance Rate", value: "82%" },
    { icon: <Users size={18} className="text-muted-foreground" />, label: "Outstanding Students", value: "44" },
    { icon: <Clock size={18} className="text-muted-foreground" />, label: "Pending Receipts", value: "8" },
  ];

  const examsOfficerStats = [
    { icon: <BarChart3 size={18} className="text-secondary-foreground" />, label: "Results Published", value: "3", accent: true },
    { icon: <FileText size={18} className="text-muted-foreground" />, label: "Pending Batches", value: "5" },
    { icon: <Users size={18} className="text-muted-foreground" />, label: "Total Students", value: "247" },
    { icon: <CheckCircle size={18} className="text-muted-foreground" />, label: "Pass Rate", value: "86%" },
  ];

  const roleStatsMap: Record<string, typeof studentStats> = {
    Student: studentStats, Supervisor: supervisorStats, Admin: adminStats, Dean: deanStats, Accountant: accountantStats, ExamsOfficer: examsOfficerStats,
  };
  const stats = roleStatsMap[user?.role || "Student"];

  const quickActionRoutes: Record<string, string> = {
    "Register Courses": "/courses/register",
    "Upload Chapter": "/thesis/upload",
    "View Results": "/results",
    "Request Documents": "/documents",
    "Review Pending": "/submissions",
    "Add Remarks": "/submissions",
    "View Students": "/students",
    "Enroll Students": "/admin/students",
    "Update Fees": "/admin/fees",
    "Generate List": "/admin/passlist",
    "View Analytics": "/admin/analytics",
    "System Log": "/admin/log",
    "Approve Clearance": "/dean/clearance",
    "CWA Results": "/dean/results",
    "Manage Students": "/admin/students",
    "Fee Analytics": "/accountant/analytics",
    "Student Fees": "/admin/fees",
    "Export Reports": "/accountant/reports",
    "Fee Notices": "/accountant/announcements",
    "Enter Grades": "/exams/grades",
    "Pass List": "/exams/passlist",
    "Publish Results": "/exams/publish",
  };

  const roleActivities: Record<string, { text: string; time: string }[]> = {
    Student: [
      { text: "Thesis Chapter 2 submitted for review", time: "2 hours ago" },
      { text: "Course registration approved by advisor", time: "1 day ago" },
      { text: "Fees payment confirmed — GH₵ 2,600 received", time: "3 days ago" },
      { text: "Library clearance approved", time: "5 days ago" },
    ],
    Supervisor: [
      { text: "Kwame Mensah submitted Chapter 3 for review", time: "1 hour ago" },
      { text: "Esi Appiah's thesis proposal approved", time: "1 day ago" },
      { text: "New student Yaw Boateng assigned to you", time: "2 days ago" },
      { text: "Remark added for Efua Dankwah's Chapter 2", time: "4 days ago" },
    ],
    Admin: [
      { text: "12 new student registrations processed", time: "3 hours ago" },
      { text: "Pass list for Semester 1 generated", time: "1 day ago" },
      { text: "Fee records updated for Mining Engineering", time: "2 days ago" },
      { text: "Exam timetable published for all programs", time: "3 days ago" },
    ],
    Dean: [
      { text: "5 new clearance requests awaiting approval", time: "1 hour ago" },
      { text: "CWA results reviewed for Computer Science", time: "1 day ago" },
      { text: "Graduation list finalized — 56 students", time: "2 days ago" },
      { text: "Clearance approved for Akua Sarpong", time: "3 days ago" },
    ],
    Accountant: [
      { text: "GH₵ 15,400 in fee payments received today", time: "2 hours ago" },
      { text: "Monthly financial report exported", time: "1 day ago" },
      { text: "3 students flagged for outstanding fees", time: "2 days ago" },
      { text: "Fee compliance rate updated to 82%", time: "4 days ago" },
    ],
    ExamsOfficer: [
      { text: "Semester 1 results published for MSc. IT", time: "1 hour ago" },
      { text: "CSV grade upload for Mining Engineering processed", time: "1 day ago" },
      { text: "Pass list generated for Computer Science", time: "2 days ago" },
      { text: "CWA recalculated for 28 students", time: "3 days ago" },
    ],
  };

  const recentActivity = roleActivities[user?.role || "Student"];

  return (
    <DashboardLayout>
      <div className="mb-8">
        <h1 className="text-3xl font-bold font-display text-foreground">
          Welcome, {user?.name?.split(" ")[0]}
        </h1>
        <p className="text-muted-foreground mt-1">
          {user?.role === "Student" && `${user.program} • ${user.department}`}
          {user?.role === "Supervisor" && `Department of ${user.department}`}
          {user?.role === "Dean" && "Dean — School of Postgraduate Studies"}
          {user?.role === "Accountant" && "Finance Office"}
          {user?.role === "ExamsOfficer" && "Examinations Office — School of Postgraduate Studies"}
          {user?.role === "Admin" && "School of Postgraduate Studies"}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
        {stats.map((s) => (
          <StatCard key={s.label} {...s} />
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-card rounded-xl border border-border p-6">
          <h2 className="font-display text-lg font-bold text-foreground mb-4">Recent Activity</h2>
          <div className="space-y-4">
            {recentActivity.map((a, i) => (
              <div key={i} className="flex items-start gap-3">
                <div className="w-2 h-2 rounded-full bg-secondary mt-2 shrink-0" />
                <div>
                  <p className="text-sm text-foreground">{a.text}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{a.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-card rounded-xl border border-border p-6">
          <h2 className="font-display text-lg font-bold text-foreground mb-4">Quick Actions</h2>
          <div className="grid grid-cols-2 gap-3">
            {(user?.role === "Student"
              ? ["Register Courses", "Upload Chapter", "View Results", "Request Documents"]
              : user?.role === "Supervisor"
              ? ["Review Pending", "Add Remarks", "View Students"]
              : user?.role === "Dean"
              ? ["View Analytics", "Manage Students", "Approve Clearance", "CWA Results"]
              : user?.role === "Accountant"
              ? ["Fee Analytics", "Student Fees", "Export Reports", "Fee Notices"]
              : user?.role === "ExamsOfficer"
              ? ["Enter Grades", "Pass List", "Publish Results", "View Analytics"]
              : ["Enroll Students", "Update Fees", "Generate List", "System Log"]
            ).map((action) => (
              <button
                key={action}
                onClick={() => navigate(quickActionRoutes[action])}
                className="px-4 py-3 rounded-lg border border-border text-sm font-medium text-foreground hover:bg-muted transition-colors text-left"
              >
                {action}
              </button>
            ))}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;
