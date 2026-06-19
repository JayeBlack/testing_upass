import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { DataStoreProvider } from "@/contexts/DataStoreContext";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import ChangePassword from "./pages/ChangePassword";
import RequireAuth from "./components/RequireAuth";
import RoleGuard from "./components/RoleGuard";
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
import ManageDocuments from "./pages/admin/ManageDocuments";
import FeesStatus from "./pages/admin/FeesStatus";
import PassList from "./pages/admin/PassList";
import Analytics from "./pages/admin/Analytics";
import SystemLog from "./pages/admin/SystemLog";
import ManageUsers from "./pages/admin/ManageUsers";
import SupervisorAssignments from "./pages/admin/SupervisorAssignments";
import ClearanceApprovals from "./pages/dean/ClearanceApprovals";
import CWAResults from "./pages/dean/CWAResults";
import DeanDocuments from "./pages/dean/DeanDocuments";
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
            <Route path="/change-password" element={<RequireAuth><ChangePassword /></RequireAuth>} />
            <Route path="/dashboard" element={<RequireAuth><Dashboard /></RequireAuth>} />
            {/* Student */}
            <Route path="/courses/register" element={<RequireAuth><RoleGuard allowedRoles={["Student"]}><CourseRegistration /></RoleGuard></RequireAuth>} />
            <Route path="/thesis/upload" element={<RequireAuth><RoleGuard allowedRoles={["Student"]}><ThesisUpload /></RoleGuard></RequireAuth>} />
            <Route path="/results" element={<RequireAuth><RoleGuard allowedRoles={["Student"]}><Results /></RoleGuard></RequireAuth>} />
            <Route path="/finances" element={<RequireAuth><RoleGuard allowedRoles={["Student"]}><FinancialStatus /></RoleGuard></RequireAuth>} />
            <Route path="/transcript" element={<RequireAuth><RoleGuard allowedRoles={["Student"]}><DocumentRequests /></RoleGuard></RequireAuth>} />
            <Route path="/documents" element={<RequireAuth><RoleGuard allowedRoles={["Student"]}><DocumentRequests /></RoleGuard></RequireAuth>} />
            <Route path="/clearance" element={<RequireAuth><RoleGuard allowedRoles={["Student"]}><Clearance /></RoleGuard></RequireAuth>} />
            <Route path="/student/chat" element={<RequireAuth><RoleGuard allowedRoles={["Student"]}><ChatAssistant /></RoleGuard></RequireAuth>} />
            <Route path="/notifications" element={<RequireAuth><RoleGuard allowedRoles={["Student"]}><Notifications /></RoleGuard></RequireAuth>} />
            {/* Supervisor */}
            <Route path="/students" element={<RequireAuth><RoleGuard allowedRoles={["Supervisor"]}><AssignedStudents /></RoleGuard></RequireAuth>} />
            <Route path="/submissions" element={<RequireAuth><RoleGuard allowedRoles={["Supervisor"]}><ReviewSubmissions /></RoleGuard></RequireAuth>} />
            <Route path="/supervisor/templates" element={<RequireAuth><RoleGuard allowedRoles={["Supervisor"]}><TemplatesAnnouncements /></RoleGuard></RequireAuth>} />
            <Route path="/supervisor/ai" element={<RequireAuth><RoleGuard allowedRoles={["Supervisor"]}><AIAssistant /></RoleGuard></RequireAuth>} />
            {/* Admin - Shared with multiple roles */}
            <Route path="/admin/students" element={<RequireAuth><RoleGuard allowedRoles={["Admin", "Dean", "ViceDean", "Registrar", "AdminAssistant", "ExamsOfficer"]}><ManageStudents /></RoleGuard></RequireAuth>} />
            <Route path="/admin/fees" element={<RequireAuth><RoleGuard allowedRoles={["Admin", "Accountant", "AccountingAssistant", "Dean", "ViceDean", "ExamsOfficer", "Registrar", "AdminAssistant"]}><FeesStatus /></RoleGuard></RequireAuth>} />
            <Route path="/admin/passlist" element={<RequireAuth><RoleGuard allowedRoles={["Admin", "Dean", "ViceDean", "Registrar", "AdminAssistant", "ExamsOfficer"]}><PassList /></RoleGuard></RequireAuth>} />
            <Route path="/admin/analytics" element={<RequireAuth><RoleGuard allowedRoles={["Admin", "Dean", "ViceDean", "ExamsOfficer"]}><Analytics /></RoleGuard></RequireAuth>} />
            <Route path="/admin/log" element={<RequireAuth><RoleGuard allowedRoles={["Admin"]}><SystemLog /></RoleGuard></RequireAuth>} />
            <Route path="/admin/documents" element={<RequireAuth><RoleGuard allowedRoles={["Admin", "Dean", "ViceDean", "Registrar", "AdminAssistant"]}><ManageDocuments /></RoleGuard></RequireAuth>} />
            <Route path="/admin/users" element={<RequireAuth><RoleGuard allowedRoles={["Admin"]}><ManageUsers /></RoleGuard></RequireAuth>} />
            <Route path="/admin/assignments" element={<RequireAuth><RoleGuard allowedRoles={["Admin"]}><SupervisorAssignments /></RoleGuard></RequireAuth>} />
            {/* Dean */}
            <Route path="/dean/clearance" element={<RequireAuth><RoleGuard allowedRoles={["Dean", "ViceDean"]}><ClearanceApprovals /></RoleGuard></RequireAuth>} />
            <Route path="/dean/results" element={<RequireAuth><RoleGuard allowedRoles={["Dean", "ViceDean"]}><CWAResults /></RoleGuard></RequireAuth>} />
            <Route path="/dean/documents" element={<RequireAuth><RoleGuard allowedRoles={["Dean", "ViceDean"]}><DeanDocuments /></RoleGuard></RequireAuth>} />
            {/* Accountant */}
            <Route path="/accountant/analytics" element={<RequireAuth><RoleGuard allowedRoles={["Accountant", "AccountingAssistant"]}><FeeAnalytics /></RoleGuard></RequireAuth>} />
            <Route path="/accountant/reports" element={<RequireAuth><RoleGuard allowedRoles={["Accountant", "AccountingAssistant"]}><ExportReports /></RoleGuard></RequireAuth>} />
            <Route path="/accountant/announcements" element={<RequireAuth><RoleGuard allowedRoles={["Accountant", "AdminAssistant"]}><FeeAnnouncements /></RoleGuard></RequireAuth>} />
            {/* Exams Officer */}
            <Route path="/exams/grades" element={<RequireAuth><RoleGuard allowedRoles={["ExamsOfficer"]}><GradeEntry /></RoleGuard></RequireAuth>} />
            <Route path="/exams/passlist" element={<RequireAuth><RoleGuard allowedRoles={["ExamsOfficer"]}><GeneratePassList /></RoleGuard></RequireAuth>} />
            <Route path="/exams/publish" element={<RequireAuth><RoleGuard allowedRoles={["ExamsOfficer"]}><PublishResults /></RoleGuard></RequireAuth>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
        </DataStoreProvider>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
