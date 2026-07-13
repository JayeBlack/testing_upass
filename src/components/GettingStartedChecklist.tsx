import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  BookOpen, FileText, BarChart3, Users, ClipboardCheck, Banknote,
  ListChecks, Upload, Eye, Bot, PieChart, Send, ShieldCheck,
  Shield, UserCog, Link2, HelpCircle, X, CheckCircle2, Circle,
  ChevronRight,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

interface ChecklistItem {
  icon: React.ReactNode;
  label: string;
  description: string;
  path: string;
}

const checklistByRole: Record<string, ChecklistItem[]> = {
  Student: [
    { icon: <BookOpen size={15} />, label: "Register your courses", description: "Enrol in courses for this semester", path: "/courses/register" },
    { icon: <Upload size={15} />, label: "Upload your thesis proposal", description: "Submit your first thesis stage", path: "/thesis/upload" },
    { icon: <Banknote size={15} />, label: "Check your financial status", description: "View fees and outstanding balance", path: "/finances" },
    { icon: <Shield size={15} />, label: "Start your clearance", description: "Begin the graduation clearance process", path: "/clearance" },
    { icon: <BarChart3 size={15} />, label: "View your results", description: "Check grades and CWA", path: "/results" },
    { icon: <FileText size={15} />, label: "Request a document", description: "Request official letters or attestations", path: "/documents" },
    { icon: <Bot size={15} />, label: "Try the SPS Assistant", description: "Get answers from the AI assistant", path: "/student/chat" },
  ],
  Supervisor: [
    { icon: <Users size={15} />, label: "View your assigned students", description: "See who you're supervising", path: "/students" },
    { icon: <Eye size={15} />, label: "Review a submission", description: "Check pending thesis submissions", path: "/submissions" },
    { icon: <ShieldCheck size={15} />, label: "Check thesis clearance requests", description: "Approve or reject clearance steps", path: "/supervisor/clearance" },
  ],
  Admin: [
    { icon: <Users size={15} />, label: "Enrol students", description: "Add or bulk-upload student records", path: "/admin/students" },
    { icon: <UserCog size={15} />, label: "Create staff accounts", description: "Add supervisors, accountants, and more", path: "/admin/users" },
    { icon: <Link2 size={15} />, label: "Assign supervisors", description: "Link supervisors to students", path: "/admin/assignments" },
    { icon: <PieChart size={15} />, label: "Check analytics", description: "View school-wide statistics", path: "/admin/analytics" },
  ],
  Dean: [
    { icon: <PieChart size={15} />, label: "Review analytics", description: "School-wide enrolment and fee overview", path: "/admin/analytics" },
    { icon: <ClipboardCheck size={15} />, label: "Approve clearances", description: "Review pending clearance requests", path: "/dean/clearance" },
    { icon: <BarChart3 size={15} />, label: "View CWA results", description: "Check graduation eligibility", path: "/dean/results" },
  ],
  ViceDean: [
    { icon: <PieChart size={15} />, label: "Review analytics", description: "School-wide enrolment and fee overview", path: "/admin/analytics" },
    { icon: <ClipboardCheck size={15} />, label: "Approve clearances", description: "Review pending clearance requests", path: "/dean/clearance" },
    { icon: <BarChart3 size={15} />, label: "View CWA results", description: "Check graduation eligibility", path: "/dean/results" },
  ],
  Accountant: [
    { icon: <Banknote size={15} />, label: "Review student fees", description: "Check fee records and compliance", path: "/admin/fees" },
    { icon: <PieChart size={15} />, label: "Check fee analytics", description: "View collection trends", path: "/accountant/analytics" },
    { icon: <ClipboardCheck size={15} />, label: "Process clearance approvals", description: "Approve financial clearance steps", path: "/dean/clearance" },
    { icon: <FileText size={15} />, label: "Export a report", description: "Download financial reports as PDF or CSV", path: "/accountant/reports" },
  ],
  AccountingAssistant: [
    { icon: <Banknote size={15} />, label: "Review student fees", description: "Check fee records and compliance", path: "/admin/fees" },
    { icon: <PieChart size={15} />, label: "Check fee analytics", description: "View collection trends", path: "/accountant/analytics" },
    { icon: <FileText size={15} />, label: "Export a report", description: "Download financial reports", path: "/accountant/reports" },
  ],
  ExamsOfficer: [
    { icon: <BookOpen size={15} />, label: "Enter grades", description: "Upload student grades by batch", path: "/exams/grades" },
    { icon: <ListChecks size={15} />, label: "Generate pass list", description: "Create the graduation pass list", path: "/exams/passlist" },
    { icon: <Send size={15} />, label: "Publish results", description: "Make results visible to students", path: "/exams/publish" },
  ],
  Registrar: [
    { icon: <Users size={15} />, label: "Review student records", description: "View and manage all students", path: "/admin/students" },
    { icon: <ClipboardCheck size={15} />, label: "Process clearances", description: "Approve clearance requests", path: "/dean/clearance" },
    { icon: <FileText size={15} />, label: "Handle document requests", description: "Process official document requests", path: "/admin/documents" },
  ],
  AdminAssistant: [
    { icon: <Users size={15} />, label: "Review student records", description: "View and manage student data", path: "/admin/students" },
    { icon: <ClipboardCheck size={15} />, label: "Support clearances", description: "Assist with clearance approvals", path: "/dean/clearance" },
    { icon: <FileText size={15} />, label: "Handle document requests", description: "Process official document requests", path: "/admin/documents" },
  ],
};

const STORAGE_KEY = "umat_visited_paths";

const GettingStartedChecklist = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [visited, setVisited] = useState<Set<string>>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? new Set(JSON.parse(raw)) : new Set();
    } catch {
      return new Set();
    }
  });

  // Track visited paths
  useEffect(() => {
    setVisited((prev) => {
      const next = new Set(prev);
      next.add(location.pathname);
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify([...next])); } catch { /* ignore */ }
      return next;
    });
  }, [location.pathname]);

  if (!user) return null;

  const items = checklistByRole[user.role] ?? [];
  const doneCount = items.filter((i) => visited.has(i.path)).length;
  const allDone = doneCount === items.length;

  const handleNavigate = (path: string) => {
    setOpen(false);
    navigate(path);
  };

  return (
    <div className="fixed bottom-6 right-6 z-40 flex flex-col items-end gap-3 no-print">
      {/* Panel */}
      {open && (
        <div className="checklist-panel-enter w-80 rounded-2xl border border-border bg-card shadow-[0_8px_40px_rgba(0,0,0,0.14)] overflow-hidden">
          {/* Header */}
          <div className="px-4 py-3.5 flex items-center justify-between" style={{ background: "linear-gradient(135deg, hsl(145,62%,18%), hsl(145,55%,25%))" }}>
            <div>
              <p className="text-sm font-bold text-white">Getting Started</p>
              <p className="text-[11px] text-white/50 mt-0.5">
                {allDone ? "All done — great work! 🎉" : `${doneCount} of ${items.length} completed`}
              </p>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="w-6 h-6 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
              aria-label="Close checklist"
            >
              <X size={12} className="text-white/80" />
            </button>
          </div>

          {/* Progress bar */}
          <div className="h-1 bg-muted">
            <div
              className="h-full transition-all duration-500"
              style={{
                width: `${items.length > 0 ? Math.round((doneCount / items.length) * 100) : 0}%`,
                background: "linear-gradient(90deg, hsl(145,60%,22%), hsl(48,95%,50%))",
              }}
            />
          </div>

          {/* Items */}
          <div className="divide-y divide-border max-h-72 overflow-y-auto scrollbar-thin">
            {items.map((item) => {
              const done = visited.has(item.path);
              return (
                <button
                  key={item.path}
                  onClick={() => handleNavigate(item.path)}
                  className="group w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-muted/60 transition-colors"
                >
                  <span className={`shrink-0 transition-colors ${done ? "text-primary" : "text-muted-foreground/40"}`}>
                    {done ? <CheckCircle2 size={18} /> : <Circle size={18} />}
                  </span>
                  <span className="w-7 h-7 rounded-lg bg-muted flex items-center justify-center shrink-0 text-muted-foreground group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                    {item.icon}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className={`text-xs font-semibold truncate ${done ? "text-muted-foreground line-through" : "text-foreground"}`}>
                      {item.label}
                    </p>
                    <p className="text-[11px] text-muted-foreground truncate">{item.description}</p>
                  </div>
                  <ChevronRight size={13} className="text-muted-foreground/0 group-hover:text-muted-foreground/60 transition-all shrink-0" />
                </button>
              );
            })}
          </div>

          {/* Footer */}
          <div className="px-4 py-3 border-t border-border bg-muted/30">
            <p className="text-[11px] text-muted-foreground text-center">
              Items are marked as visited when you navigate to them.
            </p>
          </div>
        </div>
      )}

      {/* FAB trigger */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative w-12 h-12 rounded-full text-white shadow-lg transition-all duration-200 hover:scale-105 active:scale-95 flex items-center justify-center"
        style={{ background: "linear-gradient(135deg, hsl(145,62%,20%), hsl(145,55%,27%))", boxShadow: "0 4px 20px hsl(145,62%,20%,0.45)" }}
        aria-label="Getting started checklist"
        title="Getting started checklist"
      >
        {open ? <X size={18} /> : <HelpCircle size={20} />}
        {/* Badge showing remaining items */}
        {!open && !allDone && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] rounded-full bg-secondary text-secondary-foreground text-[10px] font-bold flex items-center justify-center px-1 ring-2 ring-background">
            {items.length - doneCount}
          </span>
        )}
        {!open && allDone && (
          <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-success flex items-center justify-center ring-2 ring-background">
            <CheckCircle2 size={10} className="text-white" />
          </span>
        )}
      </button>
    </div>
  );
};

export default GettingStartedChecklist;
