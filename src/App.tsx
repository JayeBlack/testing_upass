import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { DataStoreProvider } from "@/contexts/DataStoreContext";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import CourseRegistration from "./pages/student/CourseRegistration";
import ThesisUpload from "./pages/student/ThesisUpload";
import Results from "./pages/student/Results";
import FinancialStatus from "./pages/student/FinancialStatus";
import Transcript from "./pages/student/Transcript";
import DocumentRequests from "./pages/student/DocumentRequests";
import Clearance from "./pages/student/Clearance";
import Notifications from "./pages/student/Notifications";
import ChatAssistant from "./pages/student/ChatAssistant";
import AssignedStudents from "./pages/supervisor/AssignedStudents";
import ReviewSubmissions from "./pages/supervisor/ReviewSubmissions";
import TemplatesAnnouncements from "./pages/supervisor/TemplatesAnnouncements";
import AIAssistant from "./pages/supervisor/AIAssistant";
import GradeEntry from "./pages/exams-officer/GradeEntry";
import GeneratePassList from "./pages/exams-officer/GeneratePassList";
import PublishResults from "./pages/exams-officer/PublishResults";

import ManageStudents from "./pages/admin/ManageStudents";
import FeesStatus from "./pages/admin/FeesStatus";
import PassList from "./pages/admin/PassList";
import Analytics from "./pages/admin/Analytics";
import SystemLog from "./pages/admin/SystemLog";
import ClearanceApprovals from "./pages/dean/ClearanceApprovals";
import CWAResults from "./pages/dean/CWAResults";
import FeeAnalytics from "./pages/accountant/FeeAnalytics";
import ExportReports from "./pages/accountant/ExportReports";
import FeeAnnouncements from "./pages/accountant/FeeAnnouncements";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AuthProvider>
        <DataStoreProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Login />} />
            <Route path="/dashboard" element={<Dashboard />} />
            {/* Student */}
            <Route path="/courses/register" element={<CourseRegistration />} />
            <Route path="/thesis/upload" element={<ThesisUpload />} />
            <Route path="/results" element={<Results />} />
            <Route path="/finances" element={<FinancialStatus />} />
            <Route path="/transcript" element={<DocumentRequests />} />
            <Route path="/documents" element={<DocumentRequests />} />
            <Route path="/clearance" element={<Clearance />} />
            <Route path="/student/chat" element={<ChatAssistant />} />
            <Route path="/notifications" element={<Notifications />} />
            {/* Supervisor */}
            <Route path="/students" element={<AssignedStudents />} />
            <Route path="/submissions" element={<ReviewSubmissions />} />
            <Route path="/supervisor/templates" element={<TemplatesAnnouncements />} />
            <Route path="/supervisor/ai" element={<AIAssistant />} />
            {/* Admin */}
            <Route path="/admin/students" element={<ManageStudents />} />
            <Route path="/admin/fees" element={<FeesStatus />} />
            <Route path="/admin/passlist" element={<PassList />} />
            <Route path="/admin/analytics" element={<Analytics />} />
            <Route path="/admin/log" element={<SystemLog />} />
            {/* Dean */}
            <Route path="/dean/clearance" element={<ClearanceApprovals />} />
            <Route path="/dean/results" element={<CWAResults />} />
            {/* Accountant */}
            <Route path="/accountant/analytics" element={<FeeAnalytics />} />
            <Route path="/accountant/reports" element={<ExportReports />} />
            <Route path="/accountant/announcements" element={<FeeAnnouncements />} />
            {/* Exams Officer */}
            <Route path="/exams/grades" element={<GradeEntry />} />
            <Route path="/exams/passlist" element={<GeneratePassList />} />
            <Route path="/exams/publish" element={<PublishResults />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
        </DataStoreProvider>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
