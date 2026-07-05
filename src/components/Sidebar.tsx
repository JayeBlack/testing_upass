import { useAuth, type UserRole } from "@/contexts/AuthContext";
import { useNavigate, useLocation } from "react-router-dom";
import {
  BookOpen,
  FileText,
  BarChart3,
  Users,
  ClipboardCheck,
  Banknote,
  ListChecks,
  Upload,
  Eye,
  MessageSquare,
  Bot,
  LayoutDashboard,
  Menu,
  Shield,
  Bell,
  PieChart,
  Send,
  LogOut,
  ChevronRight,
  ShieldCheck,
  UserCog,
  Link2,
} from "lucide-react";
import umatLogo from "@/assets/umat-logo.png";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { useIsMobile } from "@/hooks/use-mobile";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useState, useEffect } from "react";
import { apiFetch } from "@/lib/api";

interface NavItem {
  label: string;
  path: string;
  icon: React.ReactNode;
}

const navByRole: Record<UserRole, NavItem[]> = {
  Student: [
    { label: "Dashboard", path: "/dashboard", icon: <LayoutDashboard size={18} /> },
    { label: "Register Courses", path: "/courses/register", icon: <BookOpen size={18} /> },
    { label: "Upload Thesis", path: "/thesis/upload", icon: <Upload size={18} /> },
    { label: "Check Results", path: "/results", icon: <BarChart3 size={18} /> },
    { label: "Financial Status", path: "/finances", icon: <Banknote size={18} /> },
    { label: "Request Documents", path: "/documents", icon: <FileText size={18} /> },
    { label: "Clearance", path: "/clearance", icon: <Shield size={18} /> },
    { label: "Notifications", path: "/notifications", icon: <Bell size={18} /> },
    { label: "SPS Assistant", path: "/student/chat", icon: <Bot size={18} /> },
    { label: "Resources & Notices", path: "/supervisor-resources", icon: <BookOpen size={18} /> },
  ],
  Supervisor: [
    { label: "Dashboard", path: "/dashboard", icon: <LayoutDashboard size={18} /> },
    { label: "Assigned Students", path: "/students", icon: <Users size={18} /> },
    { label: "Review Submissions", path: "/submissions", icon: <Eye size={18} /> },
    { label: "Thesis Clearance", path: "/supervisor/clearance", icon: <ShieldCheck size={18} /> },
    { label: "Templates & Notices", path: "/supervisor/templates", icon: <FileText size={18} /> },
    { label: "AI Assistant", path: "/supervisor/ai", icon: <MessageSquare size={18} /> },
    { label: "Notifications", path: "/notifications", icon: <Bell size={18} /> },
  ],
  Admin: [
    { label: "Dashboard", path: "/dashboard", icon: <LayoutDashboard size={18} /> },
    { label: "Analytics", path: "/admin/analytics", icon: <PieChart size={18} /> },
    { label: "Manage Students", path: "/admin/students", icon: <Users size={18} /> },
    { label: "Fees Status", path: "/admin/fees", icon: <Banknote size={18} /> },
    { label: "Document Requests", path: "/admin/documents", icon: <FileText size={18} /> },
    { label: "Generate Pass List", path: "/admin/passlist", icon: <ListChecks size={18} /> },
    { label: "Notifications", path: "/notifications", icon: <Bell size={18} /> },
  ],
  Dean: [
    { label: "Dashboard", path: "/dashboard", icon: <LayoutDashboard size={18} /> },
    { label: "Analytics", path: "/admin/analytics", icon: <PieChart size={18} /> },
    { label: "Manage Students", path: "/admin/students", icon: <Users size={18} /> },
    { label: "Clearance Approvals", path: "/dean/clearance", icon: <ClipboardCheck size={18} /> },
    { label: "Document Requests", path: "/dean/documents", icon: <FileText size={18} /> },
    { label: "Pass List", path: "/admin/passlist", icon: <ListChecks size={18} /> },
    { label: "CWA Results", path: "/dean/results", icon: <BarChart3 size={18} /> },
    { label: "Notifications", path: "/notifications", icon: <Bell size={18} /> },
  ],
  Accountant: [
    { label: "Dashboard", path: "/dashboard", icon: <LayoutDashboard size={18} /> },
    { label: "Fee Analytics", path: "/accountant/analytics", icon: <PieChart size={18} /> },
    { label: "Student Fees", path: "/admin/fees", icon: <Banknote size={18} /> },
    { label: "Clearance Approvals", path: "/dean/clearance", icon: <ClipboardCheck size={18} /> },
    { label: "Export Reports", path: "/accountant/reports", icon: <FileText size={18} /> },
    { label: "Fee Notices", path: "/accountant/announcements", icon: <Bell size={18} /> },
    { label: "Notifications", path: "/notifications", icon: <Bell size={18} /> },
  ],
  ExamsOfficer: [
    { label: "Dashboard", path: "/dashboard", icon: <LayoutDashboard size={18} /> },
    { label: "Grade Entry", path: "/exams/grades", icon: <BookOpen size={18} /> },
    { label: "Pass List", path: "/exams/passlist", icon: <ListChecks size={18} /> },
    { label: "Publish Results", path: "/exams/publish", icon: <Send size={18} /> },
    { label: "Analytics", path: "/admin/analytics", icon: <PieChart size={18} /> },
    { label: "Students", path: "/admin/students", icon: <Users size={18} /> },
    { label: "Fees Status", path: "/admin/fees", icon: <Banknote size={18} /> },
    { label: "Notifications", path: "/notifications", icon: <Bell size={18} /> },
  ],
  ViceDean: [
    { label: "Dashboard", path: "/dashboard", icon: <LayoutDashboard size={18} /> },
    { label: "Analytics", path: "/admin/analytics", icon: <PieChart size={18} /> },
    { label: "Manage Students", path: "/admin/students", icon: <Users size={18} /> },
    { label: "Clearance Approvals", path: "/dean/clearance", icon: <ClipboardCheck size={18} /> },
    { label: "Document Requests", path: "/dean/documents", icon: <FileText size={18} /> },
    { label: "Pass List", path: "/admin/passlist", icon: <ListChecks size={18} /> },
    { label: "CWA Results", path: "/dean/results", icon: <BarChart3 size={18} /> },
    { label: "Notifications", path: "/notifications", icon: <Bell size={18} /> },
  ],
  Registrar: [
    { label: "Dashboard", path: "/dashboard", icon: <LayoutDashboard size={18} /> },
    { label: "Manage Students", path: "/admin/students", icon: <Users size={18} /> },
    { label: "Clearance Approvals", path: "/dean/clearance", icon: <ClipboardCheck size={18} /> },
    { label: "Document Requests", path: "/admin/documents", icon: <FileText size={18} /> },
    { label: "Pass List", path: "/admin/passlist", icon: <ListChecks size={18} /> },
    { label: "Notifications", path: "/notifications", icon: <Bell size={18} /> },
  ],
  AdminAssistant: [
    { label: "Dashboard", path: "/dashboard", icon: <LayoutDashboard size={18} /> },
    { label: "Manage Students", path: "/admin/students", icon: <Users size={18} /> },
    { label: "Clearance Approvals", path: "/dean/clearance", icon: <ClipboardCheck size={18} /> },
    { label: "Document Requests", path: "/admin/documents", icon: <FileText size={18} /> },
    { label: "Fee Notices", path: "/accountant/announcements", icon: <Bell size={18} /> },
    { label: "Notifications", path: "/notifications", icon: <Bell size={18} /> },
  ],
  AccountingAssistant: [
    { label: "Dashboard", path: "/dashboard", icon: <LayoutDashboard size={18} /> },
    { label: "Student Fees", path: "/admin/fees", icon: <Banknote size={18} /> },
    { label: "Clearance Approvals", path: "/dean/clearance", icon: <ClipboardCheck size={18} /> },
    { label: "Fee Analytics", path: "/accountant/analytics", icon: <PieChart size={18} /> },
    { label: "Export Reports", path: "/accountant/reports", icon: <FileText size={18} /> },
    { label: "Notifications", path: "/notifications", icon: <Bell size={18} /> },
  ],
};

const SidebarContent = ({ onNavigate }: { onNavigate?: () => void }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!user) return;
    const fetch = async () => {
      try {
        const data = await apiFetch<{ count: number }>("/notifications/unread-count");
        setUnreadCount(data.count || 0);
      } catch { /* ignore */ }
    };
    fetch();
    const id = setInterval(fetch, 10000);
    return () => clearInterval(id);
  }, [user?.id]);

  if (!user) return null;

  const baseItems = navByRole[user.role];
  const superAdminExtras: NavItem[] =
    user.isSuperAdmin
      ? [
          { label: "Manage Users", path: "/admin/users", icon: <UserCog size={18} /> },
          { label: "Supervisor Assignments", path: "/admin/assignments", icon: <Link2 size={18} /> },
          { label: "System Log", path: "/admin/log", icon: <FileText size={18} /> },
        ]
      : [];
  const items = [...baseItems, ...superAdminExtras];

  const handleNav = (path: string) => {
    navigate(path);
    onNavigate?.();
  };

  return (
    <div className="flex flex-col h-full bg-sidebar text-sidebar-foreground">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center p-1">
            <img src={umatLogo} alt="UMaT Logo" className="w-8 h-8 object-contain" />
          </div>
          <div>
            <h1 className="font-display text-sm font-bold text-sidebar-foreground leading-tight">Postgraduate</h1>
            <p className="text-[11px] text-sidebar-foreground/50 tracking-wide uppercase">Support System</p>
          </div>
        </div>
      </div>

      {/* User info */}
      <div className="px-5 py-4 border-b border-sidebar-border/50">
        <div className="flex items-center gap-3">
          <Avatar className="w-9 h-9 ring-2 ring-sidebar-primary/30">
            <AvatarImage src={user.avatarUrl} alt={user.name} />
            <AvatarFallback className="gradient-gold text-secondary-foreground text-xs font-bold">
              {user.name.split(" ").map((n) => n[0]).join("")}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-sidebar-foreground truncate">{user.name}</p>
            <p className="text-[11px] text-sidebar-foreground/50 truncate flex items-center gap-1">
              {user.isSuperAdmin ? (
                <><ShieldCheck size={11} className="text-secondary" /> Super Admin</>
              ) : (
                user.role === "Admin" && user.department ? user.department : user.role
              )}
            </p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-3 space-y-0.5 overflow-y-auto">
        <p className="px-3 py-2 text-[10px] font-semibold uppercase tracking-widest text-sidebar-foreground/40">Navigation</p>
        {items.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <button
              key={item.path}
              onClick={() => handleNav(item.path)}
              className={`group w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] font-medium transition-all duration-200 ${
                isActive
                  ? "bg-sidebar-primary/15 text-sidebar-primary shadow-sm"
                  : "text-sidebar-foreground/65 hover:bg-sidebar-accent/40 hover:text-sidebar-foreground"
              }`}
            >
              <span className={`transition-colors ${isActive ? "text-sidebar-primary" : "text-sidebar-foreground/50 group-hover:text-sidebar-foreground/70"}`}>
                {item.icon}
              </span>
              <span className="flex-1 text-left">{item.label}</span>
              {item.path === "/notifications" && unreadCount > 0 && (
                <span className="min-w-[18px] h-[18px] rounded-full bg-destructive text-white text-[10px] font-bold flex items-center justify-center px-1">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              )}
              {isActive && item.path !== "/notifications" && <ChevronRight size={14} className="text-sidebar-primary/60" />}
              {isActive && item.path === "/notifications" && unreadCount === 0 && <ChevronRight size={14} className="text-sidebar-primary/60" />}
            </button>
          );
        })}
      </nav>

      {/* Sign out */}
      <div className="px-3 py-3 border-t border-sidebar-border/50">
        <button
          onClick={() => { logout(); navigate("/"); onNavigate?.(); }}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] font-medium text-sidebar-foreground/50 hover:bg-destructive/10 hover:text-destructive transition-all duration-200"
        >
          <LogOut size={18} />
          Sign Out
        </button>
      </div>
    </div>
  );
};

export const MobileHeader = () => {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);

  if (!user) return null;

  return (
    <header className="sticky top-0 z-40 flex items-center gap-3 border-b border-border bg-background/80 backdrop-blur-md px-4 py-3 md:hidden">
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <button className="p-2 rounded-lg hover:bg-muted transition-colors" aria-label="Open navigation menu">
            <Menu size={20} className="text-foreground" />
          </button>
        </SheetTrigger>
        <SheetContent side="left" className="p-0 w-72 border-none">
          <SidebarContent onNavigate={() => setOpen(false)} />
        </SheetContent>
      </Sheet>
      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center p-0.5">
        <img src={umatLogo} alt="UMaT Logo" className="w-6 h-6 object-contain" />
      </div>
      <span className="font-display text-sm font-bold text-foreground">Postgraduate</span>
    </header>
  );
};

const Sidebar = () => {
  const isMobile = useIsMobile();

  if (isMobile) return null;

  return (
    <aside className="fixed left-0 top-0 h-screen w-64 z-50 shadow-xl shadow-primary/5">
      <SidebarContent />
    </aside>
  );
};

export default Sidebar;
