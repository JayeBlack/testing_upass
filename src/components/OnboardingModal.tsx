import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  BookOpen, FileText, BarChart3, Users, ClipboardCheck, Banknote,
  ListChecks, Upload, Eye, MessageSquare, Bot, LayoutDashboard,
  Shield, Bell, PieChart, Send, ShieldCheck, UserCog, Link2,
  ArrowRight, ArrowLeft, X, Sparkles,
} from "lucide-react";
import umatLogo from "@/assets/umat-logo.png";
import type { User } from "@/contexts/AuthContext";

interface OnboardingModalProps {
  user: User;
  onClose: () => void;
}

interface FeatureStep {
  icon: React.ReactNode;
  title: string;
  description: string;
  path: string;
}

const featuresByRole: Record<string, FeatureStep[]> = {
  Student: [
    { icon: <BookOpen size={28} />, title: "Register Courses", description: "Enrol in your programme courses for the current semester.", path: "/courses/register" },
    { icon: <Upload size={28} />, title: "Upload Thesis", description: "Submit your thesis chapters stage by stage for supervisor review.", path: "/thesis/upload" },
    { icon: <BarChart3 size={28} />, title: "Check Results", description: "View your grades, CWA, and download your academic transcript.", path: "/results" },
    { icon: <Banknote size={28} />, title: "Financial Status", description: "Track your fee payments, outstanding balance, and download receipts.", path: "/finances" },
    { icon: <FileText size={28} />, title: "Request Documents", description: "Request official letters, attestations, and other documents.", path: "/documents" },
    { icon: <Shield size={28} />, title: "Clearance", description: "Track and complete your multi-step graduation clearance process.", path: "/clearance" },
    { icon: <Bot size={28} />, title: "SPS Assistant", description: "Get instant answers about your programme from the AI assistant.", path: "/student/chat" },
  ],
  Supervisor: [
    { icon: <Users size={28} />, title: "Assigned Students", description: "View all students assigned to you for supervision.", path: "/students" },
    { icon: <Eye size={28} />, title: "Review Submissions", description: "Review thesis chapter submissions and provide feedback.", path: "/submissions" },
    { icon: <ShieldCheck size={28} />, title: "Thesis Clearance", description: "Approve or reject thesis clearance requests from your students.", path: "/supervisor/clearance" },
    { icon: <MessageSquare size={28} />, title: "AI Assistant", description: "Use AI to help craft structured feedback for student submissions.", path: "/supervisor/ai" },
    { icon: <FileText size={28} />, title: "Templates & Notices", description: "Access shared templates and announcements from the school.", path: "/supervisor/templates" },
  ],
  Admin: [
    { icon: <PieChart size={28} />, title: "Analytics", description: "View real-time enrolment, fees, and graduation analytics.", path: "/admin/analytics" },
    { icon: <Users size={28} />, title: "Manage Students", description: "Enrol, update, and bulk-upload student records.", path: "/admin/students" },
    { icon: <Banknote size={28} />, title: "Fees Status", description: "Monitor fee payments and compliance across all students.", path: "/admin/fees" },
    { icon: <ListChecks size={28} />, title: "Generate Pass List", description: "Generate and export the graduation pass list.", path: "/admin/passlist" },
    { icon: <UserCog size={28} />, title: "Manage Users", description: "Create and manage staff accounts across all roles.", path: "/admin/users" },
    { icon: <Link2 size={28} />, title: "Supervisor Assignments", description: "Assign supervisors to postgraduate students.", path: "/admin/assignments" },
  ],
  Dean: [
    { icon: <PieChart size={28} />, title: "Analytics", description: "Full school-wide analytics: enrolment, fees, and graduation trends.", path: "/admin/analytics" },
    { icon: <ClipboardCheck size={28} />, title: "Clearance Approvals", description: "Review and approve student clearance requests.", path: "/dean/clearance" },
    { icon: <BarChart3 size={28} />, title: "CWA Results", description: "View cumulative weighted averages and graduation eligibility.", path: "/dean/results" },
    { icon: <ListChecks size={28} />, title: "Pass List", description: "Review the final graduation pass list.", path: "/admin/passlist" },
  ],
  ViceDean: [
    { icon: <PieChart size={28} />, title: "Analytics", description: "Full school-wide analytics: enrolment, fees, and graduation trends.", path: "/admin/analytics" },
    { icon: <ClipboardCheck size={28} />, title: "Clearance Approvals", description: "Review and approve student clearance requests.", path: "/dean/clearance" },
    { icon: <BarChart3 size={28} />, title: "CWA Results", description: "View cumulative weighted averages and graduation eligibility.", path: "/dean/results" },
    { icon: <ListChecks size={28} />, title: "Pass List", description: "Review the final graduation pass list.", path: "/admin/passlist" },
  ],
  Accountant: [
    { icon: <PieChart size={28} />, title: "Fee Analytics", description: "Detailed fee collection trends and compliance reports.", path: "/accountant/analytics" },
    { icon: <Banknote size={28} />, title: "Student Fees", description: "View and update individual student fee records.", path: "/admin/fees" },
    { icon: <ClipboardCheck size={28} />, title: "Clearance Approvals", description: "Approve the financial clearance step for students.", path: "/dean/clearance" },
    { icon: <FileText size={28} />, title: "Export Reports", description: "Export financial reports as CSV or PDF.", path: "/accountant/reports" },
  ],
  AccountingAssistant: [
    { icon: <Banknote size={28} />, title: "Student Fees", description: "View and update individual student fee records.", path: "/admin/fees" },
    { icon: <PieChart size={28} />, title: "Fee Analytics", description: "Detailed fee collection trends and compliance reports.", path: "/accountant/analytics" },
    { icon: <FileText size={28} />, title: "Export Reports", description: "Export financial reports as CSV or PDF.", path: "/accountant/reports" },
  ],
  ExamsOfficer: [
    { icon: <BookOpen size={28} />, title: "Grade Entry", description: "Upload and manage student grades by batch.", path: "/exams/grades" },
    { icon: <ListChecks size={28} />, title: "Pass List", description: "Generate the graduation pass list based on CWA.", path: "/exams/passlist" },
    { icon: <Send size={28} />, title: "Publish Results", description: "Publish approved results so students can view them.", path: "/exams/publish" },
    { icon: <PieChart size={28} />, title: "Analytics", description: "Read-only analytics: enrolment, CWA distribution, and more.", path: "/admin/analytics" },
  ],
  Registrar: [
    { icon: <Users size={28} />, title: "Manage Students", description: "View and manage all student records.", path: "/admin/students" },
    { icon: <ClipboardCheck size={28} />, title: "Clearance Approvals", description: "Review and approve student clearance requests.", path: "/dean/clearance" },
    { icon: <ListChecks size={28} />, title: "Pass List", description: "Review and export the graduation pass list.", path: "/admin/passlist" },
    { icon: <FileText size={28} />, title: "Document Requests", description: "Process official document requests from students.", path: "/admin/documents" },
  ],
  AdminAssistant: [
    { icon: <Users size={28} />, title: "Manage Students", description: "View and manage student records.", path: "/admin/students" },
    { icon: <ClipboardCheck size={28} />, title: "Clearance Approvals", description: "Support the clearance approval workflow.", path: "/dean/clearance" },
    { icon: <FileText size={28} />, title: "Document Requests", description: "Process official document requests from students.", path: "/admin/documents" },
  ],
};

const roleDescriptions: Record<string, string> = {
  Student: "You can register courses, track your thesis, monitor fees, and manage your clearance — all in one place.",
  Supervisor: "You can review thesis submissions, provide feedback, and manage clearance approvals for your assigned students.",
  Admin: "You have full control over students, users, fees, and system analytics.",
  Dean: "You have oversight of clearances, CWA results, and school-wide analytics.",
  ViceDean: "You have oversight of clearances, CWA results, and school-wide analytics.",
  Accountant: "You manage fee records, clearance approvals, and financial reporting.",
  AccountingAssistant: "You assist with fee management and financial reporting.",
  ExamsOfficer: "You manage grade entry, pass list generation, and results publishing.",
  Registrar: "You oversee student records, clearances, and document requests.",
  AdminAssistant: "You support student management, clearances, and document processing.",
};

const OnboardingModal = ({ user, onClose }: OnboardingModalProps) => {
  const navigate = useNavigate();
  const [step, setStep] = useState(0); // 0 = welcome, 1..N = features, N+1 = done
  const [direction, setDirection] = useState<"forward" | "back">("forward");
  const [animKey, setAnimKey] = useState(0);

  const features = featuresByRole[user.role] ?? [];
  const totalSteps = features.length + 2; // welcome + features + done
  const isWelcome = step === 0;
  const isDone = step === totalSteps - 1;
  const featureIndex = step - 1;
  const currentFeature = features[featureIndex];

  const go = (next: number, dir: "forward" | "back") => {
    setDirection(dir);
    setAnimKey((k) => k + 1);
    setStep(next);
  };

  const handleGoTo = (path: string) => {
    onClose();
    navigate(path);
  };

  const progressPct = Math.round((step / (totalSteps - 1)) * 100);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div className="relative z-10 w-full max-w-md animate-card-enter">
        <div className="rounded-[28px] border border-white/70 bg-white/92 backdrop-blur-2xl shadow-[0_24px_80px_rgba(0,0,0,0.45)] overflow-hidden">

          {/* Green header bar */}
          <div className="relative px-7 pt-7 pb-5" style={{ background: "linear-gradient(135deg, hsl(145,62%,18%), hsl(145,55%,25%))" }}>
            {/* Gold shimmer line */}
            <div className="absolute top-0 left-0 right-0 h-[2px]" style={{ background: "linear-gradient(90deg, transparent, hsl(48,95%,50%,0.7), transparent)" }} />

            <button
              onClick={onClose}
              className="absolute top-4 right-4 w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
              aria-label="Close"
            >
              <X size={14} className="text-white/80" />
            </button>

            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-white/10 ring-1 ring-white/20 flex items-center justify-center p-1">
                <img src={umatLogo} alt="UMaT" className="w-7 h-7 object-contain" />
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-widest text-white/50">UMaT · UPASS</p>
                <p className="text-xs text-white/70">School of Postgraduate Studies</p>
              </div>
            </div>

            {/* Progress bar */}
            <div className="h-1 rounded-full bg-white/10 overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${progressPct}%`, background: "linear-gradient(90deg, hsl(48,95%,50%), hsl(45,85%,55%))" }}
              />
            </div>
            <p className="text-[10px] text-white/40 mt-1.5 text-right">
              {isWelcome ? "Introduction" : isDone ? "Complete" : `Feature ${featureIndex + 1} of ${features.length}`}
            </p>
          </div>

          {/* Body */}
          <div className="px-7 py-6 min-h-[220px]">
            <div
              key={animKey}
              className={direction === "forward" ? "onboarding-slide-enter" : "onboarding-slide-back-enter"}
            >
              {isWelcome && (
                <div className="text-center">
                  <div className="w-14 h-14 rounded-2xl mx-auto mb-4 flex items-center justify-center" style={{ background: "linear-gradient(135deg, hsl(145,62%,20%), hsl(145,55%,27%))" }}>
                    <Sparkles size={26} className="text-yellow-300" />
                  </div>
                  <h2 className="font-display text-2xl font-bold text-gray-800 mb-2">
                    Welcome, {user.name.split(" ")[0]}!
                  </h2>
                  <span className="inline-block text-xs font-semibold px-3 py-1 rounded-full mb-3" style={{ background: "hsl(145,60%,22%,0.08)", color: "hsl(145,60%,22%)" }}>
                    {user.role}
                  </span>
                  <p className="text-sm text-gray-500 leading-relaxed">
                    {roleDescriptions[user.role] ?? "Welcome to the UMaT Postgraduate Administrative Support System."}
                  </p>
                  <p className="text-xs text-gray-400 mt-3">Let's take a quick tour of your key features.</p>
                </div>
              )}

              {!isWelcome && !isDone && currentFeature && (
                <div className="text-center">
                  <div className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center" style={{ background: "linear-gradient(135deg, hsl(145,62%,20%), hsl(145,55%,27%))" }}>
                    <span className="text-white">{currentFeature.icon}</span>
                  </div>
                  <h2 className="font-display text-xl font-bold text-gray-800 mb-2">{currentFeature.title}</h2>
                  <p className="text-sm text-gray-500 leading-relaxed mb-4">{currentFeature.description}</p>
                  <button
                    onClick={() => handleGoTo(currentFeature.path)}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors"
                    style={{ background: "hsl(145,60%,22%,0.08)", color: "hsl(145,60%,22%)" }}
                  >
                    Go there now <ArrowRight size={12} />
                  </button>
                </div>
              )}

              {isDone && (
                <div className="text-center">
                  <div className="w-14 h-14 rounded-2xl mx-auto mb-4 flex items-center justify-center" style={{ background: "linear-gradient(135deg, hsl(48,95%,50%), hsl(45,85%,48%))" }}>
                    <LayoutDashboard size={26} className="text-gray-800" />
                  </div>
                  <h2 className="font-display text-2xl font-bold text-gray-800 mb-2">You're all set!</h2>
                  <p className="text-sm text-gray-500 leading-relaxed">
                    You can revisit this guide anytime using the <strong className="text-gray-700">?</strong> button at the bottom-right of any page.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Footer nav */}
          <div className="px-7 pb-7 flex items-center justify-between gap-3">
            <button
              onClick={() => go(step - 1, "back")}
              disabled={isWelcome}
              className="flex items-center gap-1.5 text-sm font-medium text-gray-400 hover:text-gray-600 disabled:opacity-0 disabled:pointer-events-none transition-colors"
            >
              <ArrowLeft size={15} /> Back
            </button>

            <div className="flex items-center gap-1.5">
              {Array.from({ length: totalSteps }).map((_, i) => (
                <div
                  key={i}
                  className="rounded-full transition-all duration-300"
                  style={{
                    width: i === step ? "20px" : "6px",
                    height: "6px",
                    background: i === step ? "hsl(145,60%,22%)" : i < step ? "hsl(145,60%,22%,0.35)" : "hsl(0,0%,85%)",
                  }}
                />
              ))}
            </div>

            {isDone ? (
              <button
                onClick={onClose}
                className="flex items-center gap-1.5 text-sm font-semibold px-4 py-2 rounded-xl text-white transition-all hover:-translate-y-0.5"
                style={{ background: "linear-gradient(135deg, hsl(145,62%,20%), hsl(145,55%,27%))", boxShadow: "0 4px 14px hsl(145,62%,20%,0.35)" }}
              >
                Go to Dashboard
              </button>
            ) : (
              <button
                onClick={() => go(step + 1, "forward")}
                className="flex items-center gap-1.5 text-sm font-semibold px-4 py-2 rounded-xl text-white transition-all hover:-translate-y-0.5"
                style={{ background: "linear-gradient(135deg, hsl(145,62%,20%), hsl(145,55%,27%))", boxShadow: "0 4px 14px hsl(145,62%,20%,0.35)" }}
              >
                {isWelcome ? "Start Tour" : "Next"} <ArrowRight size={14} />
              </button>
            )}
          </div>

          {/* Skip link */}
          {!isDone && (
            <div className="text-center pb-5 -mt-3">
              <button onClick={onClose} className="text-xs text-gray-400 hover:text-gray-500 transition-colors">
                Skip tour
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default OnboardingModal;
