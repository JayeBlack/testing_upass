import { useAuth } from "@/contexts/AuthContext";
import { useDataStore } from "@/contexts/DataStoreContext";
import { useAdminDepartment } from "@/hooks/use-admin-department";
import DashboardLayout from "@/components/DashboardLayout";
import SEO from "@/components/SEO";
import {
  BookOpen, FileText, Users, BarChart3, Clock, CheckCircle,
  ArrowUpRight, TrendingUp, TrendingDown, Activity, Banknote,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

const StatCard = ({
  icon, label, value, sub, trend, accent, onClick,
}: {
  icon: React.ReactNode; label: string; value: string;
  sub?: string; trend?: "up" | "down" | "neutral"; accent?: boolean; onClick?: () => void;
}) => (
  <button
    onClick={onClick}
    className={`group relative bg-card rounded-2xl border border-border p-5 text-left transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5 ${onClick ? "cursor-pointer" : "cursor-default"}`}
  >
    {accent && (
      <div className="absolute inset-0 rounded-2xl gradient-gold opacity-[0.04]" />
    )}
    <div className="flex items-start justify-between mb-3">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${accent ? "gradient-gold shadow-md shadow-secondary/20" : "bg-muted"}`}>
        {icon}
      </div>
      {trend && (
        <span className={`flex items-center gap-0.5 text-[11px] font-semibold px-2 py-0.5 rounded-full ${
          trend === "up" ? "bg-success/10 text-success" : trend === "down" ? "bg-destructive/10 text-destructive" : "bg-muted text-muted-foreground"
        }`}>
          {trend === "up" ? <TrendingUp size={11} /> : trend === "down" ? <TrendingDown size={11} /> : <Activity size={11} />}
          {sub}
        </span>
      )}
    </div>
    <p className="text-2xl font-bold font-display text-foreground tracking-tight">{value}</p>
    <p className="text-xs text-muted-foreground mt-1 font-medium">{label}</p>
    {onClick && (
      <ArrowUpRight size={14} className="absolute top-5 right-5 text-muted-foreground/0 group-hover:text-muted-foreground/60 transition-all duration-300" />
    )}
  </button>
);

interface StatItem {
  icon: React.ReactNode;
  label: string;
  value: string;
  accent?: boolean;
  trend?: "up" | "down" | "neutral";
  sub?: string;
  onClick?: () => void;
}

const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { students, graduands } = useDataStore();
  const { isSuperAdmin, adminDepartment } = useAdminDepartment();

  // Filter data by department for departmental admins
  const deptStudents = adminDepartment
    ? students.filter((s) => s.department === adminDepartment)
    : students;
  const deptGraduands = adminDepartment
    ? graduands.filter((g) => g.department === adminDepartment)
    : graduands;

  const totalStudents = deptStudents.length;
  const activeStudents = deptStudents.filter((s) => s.status === "Active").length;
  const totalGraduands = deptGraduands.filter((g) => g.status === "Eligible").length;
  const feesClearedPct = totalStudents > 0 ? Math.round((activeStudents / totalStudents) * 100) : 0;

  const studentStats = [
    { icon: <BookOpen size={18} className="text-secondary-foreground" />, label: "Registered Courses", value: "6", accent: true, trend: "neutral" as const, sub: "Semester 1" },
    { icon: <FileText size={18} className="text-muted-foreground" />, label: "Thesis Progress", value: "Ch. 3", trend: "up" as const, sub: "On track" },
    { icon: <BarChart3 size={18} className="text-muted-foreground" />, label: "CWA", value: "72.4", trend: "up" as const, sub: "+2.1" },
    { icon: <Clock size={18} className="text-muted-foreground" />, label: "Pending Reviews", value: "2" },
  ];

  const supervisorStats = [
    { icon: <Users size={18} className="text-secondary-foreground" />, label: "Assigned Students", value: "8", accent: true, trend: "up" as const, sub: "+2" },
    { icon: <FileText size={18} className="text-muted-foreground" />, label: "Pending Reviews", value: "5", trend: "down" as const, sub: "-3" },
    { icon: <CheckCircle size={18} className="text-muted-foreground" />, label: "Approved This Month", value: "12", trend: "up" as const, sub: "+4" },
    { icon: <Clock size={18} className="text-muted-foreground" />, label: "Avg Review Time", value: "3d" },
  ];

  const adminStats = [
    { icon: <Users size={18} className="text-secondary-foreground" />, label: "Total Students", value: String(totalStudents), accent: true, trend: "up" as const, sub: `${activeStudents} active`, onClick: () => navigate("/admin/students") },
    { icon: <BookOpen size={18} className="text-muted-foreground" />, label: "Active Courses", value: adminDepartment ? "8" : "34" },
    { icon: <BarChart3 size={18} className="text-muted-foreground" />, label: "Fees Cleared", value: `${feesClearedPct}%`, trend: "up" as const, sub: "+5%", onClick: () => navigate("/admin/fees") },
    { icon: <CheckCircle size={18} className="text-muted-foreground" />, label: "Graduands", value: String(totalGraduands), onClick: () => navigate("/admin/passlist") },
  ];

  const deanStats = [
    { icon: <Users size={18} className="text-secondary-foreground" />, label: "Total Students", value: String(totalStudents), accent: true, trend: "up" as const, sub: `${activeStudents} active`, onClick: () => navigate("/admin/students") },
    { icon: <CheckCircle size={18} className="text-muted-foreground" />, label: "Clearances Pending", value: "14", trend: "down" as const, sub: "-6", onClick: () => navigate("/dean/clearance") },
    { icon: <BarChart3 size={18} className="text-muted-foreground" />, label: "Avg CWA", value: deptGraduands.length > 0 ? (deptGraduands.reduce((a, g) => a + g.cwa, 0) / deptGraduands.length).toFixed(1) : "—", trend: "up" as const, sub: "+1.2" },
    { icon: <Clock size={18} className="text-muted-foreground" />, label: "Graduands", value: String(totalGraduands), onClick: () => navigate("/admin/passlist") },
  ];

  const accountantStats = [
    { icon: <Banknote size={18} className="text-secondary-foreground" />, label: "Total Fees Collected", value: "GH₵ 1.2M", accent: true, trend: "up" as const, sub: "+18%", onClick: () => navigate("/accountant/analytics") },
    { icon: <BarChart3 size={18} className="text-muted-foreground" />, label: "Compliance Rate", value: "82%", trend: "up" as const, sub: "+5%" },
    { icon: <Users size={18} className="text-muted-foreground" />, label: "Outstanding Students", value: String(totalStudents - activeStudents), trend: "down" as const, sub: "-8", onClick: () => navigate("/admin/fees") },
    { icon: <Clock size={18} className="text-muted-foreground" />, label: "Pending Receipts", value: "8" },
  ];

  const examsOfficerStats = [
    { icon: <BarChart3 size={18} className="text-secondary-foreground" />, label: "Results Published", value: "3", accent: true },
    { icon: <FileText size={18} className="text-muted-foreground" />, label: "Pending Batches", value: "5", trend: "down" as const, sub: "-2" },
    { icon: <Users size={18} className="text-muted-foreground" />, label: "Total Students", value: String(totalStudents) },
    { icon: <CheckCircle size={18} className="text-muted-foreground" />, label: "Pass Rate", value: "86%", trend: "up" as const, sub: "+3%" },
  ];

  const roleStatsMap: Record<string, StatItem[]> = {
    Student: studentStats, Supervisor: supervisorStats, Admin: adminStats, Dean: deanStats, Accountant: accountantStats, ExamsOfficer: examsOfficerStats,
    ViceDean: deanStats, Registrar: adminStats, AdminAssistant: adminStats, AccountingAssistant: accountantStats,
  };
  const stats = roleStatsMap[user?.role || "Student"] ?? studentStats;

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

  const quickActionIcons: Record<string, React.ReactNode> = {
    "Register Courses": <BookOpen size={15} />,
    "Upload Chapter": <FileText size={15} />,
    "View Results": <BarChart3 size={15} />,
    "Request Documents": <FileText size={15} />,
    "Review Pending": <Clock size={15} />,
    "Add Remarks": <FileText size={15} />,
    "View Students": <Users size={15} />,
    "Enroll Students": <Users size={15} />,
    "Update Fees": <Banknote size={15} />,
    "Generate List": <CheckCircle size={15} />,
    "View Analytics": <BarChart3 size={15} />,
    "System Log": <FileText size={15} />,
    "Approve Clearance": <CheckCircle size={15} />,
    "CWA Results": <BarChart3 size={15} />,
    "Manage Students": <Users size={15} />,
    "Fee Analytics": <BarChart3 size={15} />,
    "Student Fees": <Banknote size={15} />,
    "Export Reports": <FileText size={15} />,
    "Fee Notices": <FileText size={15} />,
    "Enter Grades": <BookOpen size={15} />,
    "Pass List": <CheckCircle size={15} />,
    "Publish Results": <BarChart3 size={15} />,
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

  const recentActivity = roleActivities[user?.role || "Student"] ?? roleActivities.Admin;

  const quickActions = user?.role === "Student"
    ? ["Register Courses", "Upload Chapter", "View Results", "Request Documents"]
    : user?.role === "Supervisor"
    ? ["Review Pending", "Add Remarks", "View Students"]
    : user?.role === "Dean"
    ? ["View Analytics", "Manage Students", "Approve Clearance", "CWA Results"]
    : user?.role === "Accountant"
    ? ["Fee Analytics", "Student Fees", "Export Reports", "Fee Notices"]
    : user?.role === "ExamsOfficer"
    ? ["Enter Grades", "Pass List", "Publish Results", "View Analytics"]
    : isSuperAdmin
    ? ["Enroll Students", "Update Fees", "Generate List", "System Log"]
    : ["Enroll Students", "Update Fees", "Generate List"];

  return (
    <DashboardLayout>
      <SEO
        title="Dashboard — UMaT Postgraduate Portal"
        description="Your personalised UMaT postgraduate dashboard: courses, thesis progress, fees and clearance at a glance."
      />
      {/* Welcome Section */}
      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold font-display text-foreground">
          Welcome back, {user?.name?.split(" ")[0]} 👋
        </h1>
        <p className="text-sm text-muted-foreground mt-1.5">
          {user?.role === "Student" && `${user.program} · ${user.department}`}
          {user?.role === "Supervisor" && `Department of ${user.department}`}
          {user?.role === "Dean" && "Dean — School of Postgraduate Studies"}
          {user?.role === "Accountant" && "Finance Office — School of Postgraduate Studies"}
          {user?.role === "ExamsOfficer" && "Examinations Office — School of Postgraduate Studies"}
          {user?.role === "Admin" && (user.department ? `Department Admin — ${user.department}` : "Super Admin — School of Postgraduate Studies")}
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map((s) => (
          <StatCard key={s.label} {...s} />
        ))}
      </div>

      {/* Two-Column Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Activity */}
        <div className="lg:col-span-2 bg-card rounded-2xl border border-border p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-display text-lg font-bold text-foreground">Recent Activity</h2>
            <span className="text-xs font-medium text-muted-foreground bg-muted px-2.5 py-1 rounded-full">
              {recentActivity.length} updates
            </span>
          </div>
          <div className="space-y-1">
            {recentActivity.map((a, i) => (
              <div key={i} className="flex items-start gap-3 p-3 rounded-xl hover:bg-muted/50 transition-colors">
                <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center mt-0.5 shrink-0">
                  <Activity size={14} className="text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-foreground leading-relaxed">{a.text}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5 font-medium">{a.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-card rounded-2xl border border-border p-6">
          <h2 className="font-display text-lg font-bold text-foreground mb-5">Quick Actions</h2>
          <div className="space-y-2">
            {quickActions.map((action) => (
              <button
                key={action}
                onClick={() => navigate(quickActionRoutes[action])}
                className="group w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-border text-sm font-medium text-foreground hover:bg-muted hover:border-muted-foreground/20 transition-all duration-200"
              >
                <span className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                  {quickActionIcons[action] || <ArrowUpRight size={15} />}
                </span>
                <span className="flex-1 text-left">{action}</span>
                <ArrowUpRight size={14} className="text-muted-foreground/0 group-hover:text-muted-foreground transition-all" />
              </button>
            ))}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;
