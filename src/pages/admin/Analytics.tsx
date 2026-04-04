import DashboardLayout from "@/components/DashboardLayout";
import { Users, BookOpen, Banknote, GraduationCap, TrendingUp, TrendingDown, CheckCircle, Clock, BarChart3, FileText, AlertTriangle, ChevronRight } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, AreaChart, Area, Legend,
} from "recharts";
import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAdminDepartment } from "@/hooks/use-admin-department";
import { useDataStore } from "@/contexts/DataStoreContext";

// --- Academic year data sets ---
interface YearData {
  label: string;
  totalStudents: number;
  graduandsEligible: number;
  graduandsIneligible: number;
  feesCollected: number;
  collectionRate: number;
  feesCleared: number;
  feesOwing: number;
  avgCwa: number;
  thesisDefended: number;
  newPrograms: string;
  enrollmentByDept: { name: string; students: number; male: number; female: number }[];
  feesCollection: { month: string; collected: number; target: number }[];
  thesisProgress: { name: string; value: number; fill: string }[];
  cwaDistribution: { range: string; count: number }[];
  programBreakdown: { name: string; value: number }[];
  alerts: { text: string; type: string; link?: string }[];
}

const academicYears: Record<string, YearData> = {
  "2025/2026": {
    label: "2025/2026",
    totalStudents: 247,
    graduandsEligible: 198,
    graduandsIneligible: 49,
    feesCollected: 1253000,
    collectionRate: 82,
    feesCleared: 204,
    feesOwing: 43,
    avgCwa: 68.5,
    thesisDefended: 22,
    newPrograms: "2 new programs added",
    enrollmentByDept: [
      { name: "Computer Science", students: 98, male: 62, female: 36 },
      { name: "Mining Eng.", students: 62, male: 45, female: 17 },
      { name: "Electrical Eng.", students: 45, male: 34, female: 11 },
      { name: "Mechanical Eng.", students: 42, male: 30, female: 12 },
    ],
    feesCollection: [
      { month: "Sep", collected: 185000, target: 220000 },
      { month: "Oct", collected: 210000, target: 220000 },
      { month: "Nov", collected: 195000, target: 220000 },
      { month: "Dec", collected: 225000, target: 220000 },
      { month: "Jan", collected: 240000, target: 220000 },
      { month: "Feb", collected: 198000, target: 220000 },
    ],
    thesisProgress: [
      { name: "Proposal", value: 28, fill: "hsl(199 89% 48%)" },
      { name: "Ch 1-2", value: 45, fill: "hsl(48 95% 50%)" },
      { name: "Ch 3-4", value: 65, fill: "hsl(145 60% 22%)" },
      { name: "Submitted", value: 38, fill: "hsl(38 92% 50%)" },
      { name: "Defended", value: 22, fill: "hsl(142 71% 45%)" },
    ],
    cwaDistribution: [
      { range: "< 50", count: 12 },
      { range: "50-59", count: 38 },
      { range: "60-69", count: 72 },
      { range: "70-79", count: 85 },
      { range: "80-89", count: 32 },
      { range: "90+", count: 8 },
    ],
    programBreakdown: [
      { name: "MSc. IT", value: 68 },
      { name: "MPhil CS", value: 30 },
      { name: "MSc. Mining", value: 42 },
      { name: "MSc. Electrical", value: 35 },
      { name: "MSc. Mechanical", value: 32 },
      { name: "Others", value: 40 },
    ],
    alerts: [
      { text: "43 students have outstanding fees", type: "warning", link: "/admin/fees" },
      { text: "12 thesis submissions overdue", type: "warning" },
      { text: "New semester registration opens in 5 days", type: "info" },
      { text: "198 students eligible for graduation", type: "success", link: "/admin/passlist" },
      { text: "3 departments fully cleared financially", type: "success", link: "/admin/fees" },
    ],
  },
  "2024/2025": {
    label: "2024/2025",
    totalStudents: 235,
    graduandsEligible: 180,
    graduandsIneligible: 55,
    feesCollected: 1120000,
    collectionRate: 78,
    feesCleared: 188,
    feesOwing: 47,
    avgCwa: 66.8,
    thesisDefended: 35,
    newPrograms: "1 new program added",
    enrollmentByDept: [
      { name: "Computer Science", students: 88, male: 56, female: 32 },
      { name: "Mining Eng.", students: 58, male: 42, female: 16 },
      { name: "Electrical Eng.", students: 48, male: 36, female: 12 },
      { name: "Mechanical Eng.", students: 41, male: 29, female: 12 },
    ],
    feesCollection: [
      { month: "Sep", collected: 160000, target: 200000 },
      { month: "Oct", collected: 180000, target: 200000 },
      { month: "Nov", collected: 175000, target: 200000 },
      { month: "Dec", collected: 210000, target: 200000 },
      { month: "Jan", collected: 205000, target: 200000 },
      { month: "Feb", collected: 190000, target: 200000 },
    ],
    thesisProgress: [
      { name: "Proposal", value: 15, fill: "hsl(199 89% 48%)" },
      { name: "Ch 1-2", value: 30, fill: "hsl(48 95% 50%)" },
      { name: "Ch 3-4", value: 55, fill: "hsl(145 60% 22%)" },
      { name: "Submitted", value: 50, fill: "hsl(38 92% 50%)" },
      { name: "Defended", value: 35, fill: "hsl(142 71% 45%)" },
    ],
    cwaDistribution: [
      { range: "< 50", count: 15 },
      { range: "50-59", count: 42 },
      { range: "60-69", count: 68 },
      { range: "70-79", count: 78 },
      { range: "80-89", count: 26 },
      { range: "90+", count: 6 },
    ],
    programBreakdown: [
      { name: "MSc. IT", value: 62 },
      { name: "MPhil CS", value: 26 },
      { name: "MSc. Mining", value: 40 },
      { name: "MSc. Electrical", value: 38 },
      { name: "MSc. Mechanical", value: 31 },
      { name: "Others", value: 38 },
    ],
    alerts: [
      { text: "All thesis defenses completed for the year", type: "success" },
      { text: "47 students had outstanding fees at year end", type: "warning", link: "/admin/fees" },
      { text: "180 students graduated successfully", type: "success", link: "/admin/passlist" },
      { text: "Year-end financial audit completed", type: "info" },
    ],
  },
  "2023/2024": {
    label: "2023/2024",
    totalStudents: 220,
    graduandsEligible: 165,
    graduandsIneligible: 55,
    feesCollected: 980000,
    collectionRate: 75,
    feesCleared: 170,
    feesOwing: 50,
    avgCwa: 65.2,
    thesisDefended: 42,
    newPrograms: "No new programs",
    enrollmentByDept: [
      { name: "Computer Science", students: 82, male: 54, female: 28 },
      { name: "Mining Eng.", students: 55, male: 40, female: 15 },
      { name: "Electrical Eng.", students: 42, male: 32, female: 10 },
      { name: "Mechanical Eng.", students: 41, male: 30, female: 11 },
    ],
    feesCollection: [
      { month: "Sep", collected: 140000, target: 185000 },
      { month: "Oct", collected: 165000, target: 185000 },
      { month: "Nov", collected: 155000, target: 185000 },
      { month: "Dec", collected: 180000, target: 185000 },
      { month: "Jan", collected: 175000, target: 185000 },
      { month: "Feb", collected: 165000, target: 185000 },
    ],
    thesisProgress: [
      { name: "Proposal", value: 10, fill: "hsl(199 89% 48%)" },
      { name: "Ch 1-2", value: 20, fill: "hsl(48 95% 50%)" },
      { name: "Ch 3-4", value: 40, fill: "hsl(145 60% 22%)" },
      { name: "Submitted", value: 48, fill: "hsl(38 92% 50%)" },
      { name: "Defended", value: 42, fill: "hsl(142 71% 45%)" },
    ],
    cwaDistribution: [
      { range: "< 50", count: 18 },
      { range: "50-59", count: 45 },
      { range: "60-69", count: 65 },
      { range: "70-79", count: 62 },
      { range: "80-89", count: 24 },
      { range: "90+", count: 6 },
    ],
    programBreakdown: [
      { name: "MSc. IT", value: 58 },
      { name: "MPhil CS", value: 24 },
      { name: "MSc. Mining", value: 38 },
      { name: "MSc. Electrical", value: 32 },
      { name: "MSc. Mechanical", value: 31 },
      { name: "Others", value: 37 },
    ],
    alerts: [
      { text: "All 42 thesis defenses completed", type: "success" },
      { text: "165 students graduated successfully", type: "success", link: "/admin/passlist" },
      { text: "Collection rate improved by 3% over previous year", type: "info" },
    ],
  },
};

const enrollmentTrend = [
  { year: "2021/22", students: 180 },
  { year: "2022/23", students: 198 },
  { year: "2023/24", students: 220 },
  { year: "2024/25", students: 235 },
  { year: "2025/26", students: 247 },
];

const availableYears = Object.keys(academicYears);

const PIE_COLORS = ["hsl(145 60% 22%)", "hsl(0 72% 51%)"];
const PROGRAM_COLORS = ["hsl(145 60% 22%)", "hsl(48 95% 50%)", "hsl(199 89% 48%)", "hsl(38 92% 50%)", "hsl(142 71% 45%)", "hsl(120 8% 45%)"];

const alertStyles: Record<string, string> = {
  warning: "bg-warning/10 text-warning",
  info: "bg-info/10 text-info",
  success: "bg-success/10 text-success",
};

const alertIcons: Record<string, React.ReactNode> = {
  warning: <AlertTriangle size={14} />,
  info: <Clock size={14} />,
  success: <CheckCircle size={14} />,
};

const StatCard = ({ icon, label, value, sub, trend, accent, onClick }: {
  icon: React.ReactNode; label: string; value: string; sub?: string; trend?: "up" | "down"; accent?: boolean; onClick?: () => void;
}) => (
  <div
    onClick={onClick}
    className={`bg-card rounded-xl border border-border p-5 hover:shadow-md transition-shadow ${onClick ? "cursor-pointer" : ""}`}
  >
    <div className="flex items-center justify-between mb-3">
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${accent ? "gradient-gold" : "bg-muted"}`}>
        {icon}
      </div>
      {trend && (
        <div className={`flex items-center gap-1 text-xs font-medium ${trend === "up" ? "text-success" : "text-destructive"}`}>
          {trend === "up" ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
        </div>
      )}
    </div>
    <p className="text-2xl font-bold font-display text-foreground">{value}</p>
    <p className="text-sm text-muted-foreground mt-1">{label}</p>
    {sub && <p className={`text-xs mt-1 ${trend === "down" ? "text-destructive" : "text-success"}`}>{sub}</p>}
  </div>
);

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload) return null;
  return (
    <div className="bg-card border border-border rounded-lg px-3 py-2 shadow-lg text-xs">
      <p className="font-medium text-foreground mb-1">{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} style={{ color: p.color }} className="font-medium">
          {p.name}: {typeof p.value === "number" && p.value > 1000 ? `GH₵ ${(p.value / 1000).toFixed(0)}K` : p.value}
        </p>
      ))}
    </div>
  );
};

const Analytics = () => {
  const [selectedYear, setSelectedYear] = useState("2025/2026");
  const navigate = useNavigate();
  const { isSuperAdmin, adminDepartment } = useAdminDepartment();
  const { students, graduands } = useDataStore();
  const data = academicYears[selectedYear];

  // Department name mapping for matching DataStore departments to chart short names
  const deptShortName: Record<string, string> = {
    "Computer Science": "Computer Science",
    "Mining Engineering": "Mining Eng.",
    "Electrical Engineering": "Electrical Eng.",
    "Mechanical Engineering": "Mechanical Eng.",
  };

  // Filter data by admin's department
  const deptStudents = adminDepartment
    ? students.filter((s) => s.department === adminDepartment)
    : students;
  const deptGraduands = adminDepartment
    ? graduands.filter((g) => g.department === adminDepartment)
    : graduands;

  const realTotalStudents = deptStudents.length;
  const realActiveStudents = deptStudents.filter((s) => s.status === "Active").length;
  const realEligibleGraduands = deptGraduands.filter((g) => g.status === "Eligible").length;
  const realIneligibleGraduands = deptGraduands.filter((g) => g.status === "Ineligible").length;
  const realTotalGraduands = realEligibleGraduands + realIneligibleGraduands;
  const realAvgCwa = deptGraduands.length > 0
    ? (deptGraduands.reduce((a, g) => a + g.cwa, 0) / deptGraduands.length).toFixed(1)
    : data.avgCwa.toString();

  // Use real data for top-level stats, fallback to mock for charts
  const displayTotalStudents = realTotalStudents > 0 ? realTotalStudents : data.totalStudents;
  const displayEligible = realEligibleGraduands > 0 ? realEligibleGraduands : data.graduandsEligible;
  const displayIneligible = realIneligibleGraduands > 0 ? realIneligibleGraduands : data.graduandsIneligible;

  // Filter enrollment chart data for departmental admins
  const filteredEnrollmentByDept = adminDepartment
    ? data.enrollmentByDept.filter((d) => {
        const shortName = deptShortName[adminDepartment];
        return d.name === shortName || d.name === adminDepartment;
      })
    : data.enrollmentByDept;

  // Filter program breakdown for departmental admins
  const deptProgramMap: Record<string, string[]> = {
    "Computer Science": ["MSc. IT", "MPhil CS"],
    "Mining Engineering": ["MSc. Mining"],
    "Electrical Engineering": ["MSc. Electrical"],
    "Mechanical Engineering": ["MSc. Mechanical"],
  };
  const filteredProgramBreakdown = adminDepartment
    ? data.programBreakdown.filter((p) => (deptProgramMap[adminDepartment] || []).includes(p.name))
    : data.programBreakdown;

  // Scale fees for departmental admins (proportional to their student ratio)
  const deptRatio = adminDepartment
    ? (filteredEnrollmentByDept.reduce((a, d) => a + d.students, 0) / data.enrollmentByDept.reduce((a, d) => a + d.students, 0)) || 0.25
    : 1;
  const displayFeesCollected = Math.round(data.feesCollected * deptRatio);
  const displayFeesCleared = Math.round(data.feesCleared * deptRatio);
  const displayFeesOwing = Math.round(data.feesOwing * deptRatio);
  const scaledFeesCollection = adminDepartment
    ? data.feesCollection.map((f) => ({ ...f, collected: Math.round(f.collected * deptRatio), target: Math.round(f.target * deptRatio) }))
    : data.feesCollection;

  // Scale thesis and CWA for departmental admins
  const scaledThesisProgress = adminDepartment
    ? data.thesisProgress.map((t) => ({ ...t, value: Math.round(t.value * deptRatio) }))
    : data.thesisProgress;
  const scaledCwaDistribution = adminDepartment
    ? data.cwaDistribution.map((c) => ({ ...c, count: Math.round(c.count * deptRatio) }))
    : data.cwaDistribution;
  const displayThesisDefended = Math.round(data.thesisDefended * deptRatio);

  // Enrollment trend scaled for dept admins
  const scaledEnrollmentTrend = adminDepartment
    ? enrollmentTrend.map((e) => ({ ...e, students: Math.round(e.students * deptRatio) }))
    : enrollmentTrend;

  const graduationEligibility = [
    { name: "Eligible", value: displayEligible },
    { name: "Ineligible", value: displayIneligible },
  ];
  const totalGraduands = displayEligible + displayIneligible;
  const eligiblePct = totalGraduands > 0 ? ((displayEligible / totalGraduands) * 100).toFixed(1) : "0";
  const ineligiblePct = totalGraduands > 0 ? ((displayIneligible / totalGraduands) * 100).toFixed(1) : "0";

  return (
    <DashboardLayout>
      {/* Header with Year Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold font-display text-foreground">
            {isSuperAdmin ? "School Analytics" : `${adminDepartment} Analytics`}
          </h1>
          <p className="text-muted-foreground mt-1">
            {isSuperAdmin ? `Comprehensive overview — ${data.label} Academic Year` : `Department overview — ${data.label} Academic Year`}
          </p>
        </div>
        <select
          value={selectedYear}
          onChange={(e) => setSelectedYear(e.target.value)}
          className="px-4 py-2.5 rounded-lg border border-input bg-card text-foreground text-sm font-medium focus:outline-none focus:ring-2 focus:ring-ring w-fit"
        >
          {availableYears.map((y) => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>
      </div>

      {/* Key Metrics — clickable */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
        <StatCard
          icon={<Users size={18} className="text-secondary-foreground" />}
          label="Total Students" value={displayTotalStudents.toString()}
          sub={`${realActiveStudents} active`} trend="up" accent
          onClick={() => navigate("/admin/students")}
        />
        <StatCard
          icon={<GraduationCap size={18} className="text-muted-foreground" />}
          label="Graduands (Eligible)" value={displayEligible.toString()}
          sub={`${eligiblePct}% eligibility rate`} trend="up"
          onClick={() => navigate("/admin/passlist")}
        />
        <StatCard
          icon={<Banknote size={18} className="text-muted-foreground" />}
          label="Fees Collected" value={displayFeesCollected >= 1000000 ? `GH₵ ${(displayFeesCollected / 1000000).toFixed(2)}M` : `GH₵ ${(displayFeesCollected / 1000).toFixed(0)}K`}
          sub={`${data.collectionRate}% collection rate`} trend="up"
          onClick={() => navigate("/admin/fees")}
        />
        <StatCard
          icon={<BookOpen size={18} className="text-muted-foreground" />}
          label="Active Programs" value={adminDepartment ? String(deptProgramMap[adminDepartment]?.length || 2) : "12"}
          sub={data.newPrograms}
        />
      </div>

      {/* Secondary Metrics — clickable */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        <div
          onClick={() => navigate("/admin/fees")}
          className="bg-card rounded-xl border border-border p-4 flex items-center gap-3 cursor-pointer hover:shadow-md transition-shadow"
        >
          <CheckCircle size={18} className="text-success shrink-0" />
          <div>
            <p className="text-lg font-bold font-display text-foreground">{displayFeesCleared}</p>
            <p className="text-xs text-muted-foreground">Fees Cleared</p>
          </div>
        </div>
        <div
          onClick={() => navigate("/admin/fees")}
          className="bg-card rounded-xl border border-border p-4 flex items-center gap-3 cursor-pointer hover:shadow-md transition-shadow"
        >
          <AlertTriangle size={18} className="text-warning shrink-0" />
          <div>
            <p className="text-lg font-bold font-display text-foreground">{displayFeesOwing}</p>
            <p className="text-xs text-muted-foreground">Fees Owing</p>
          </div>
        </div>
        <div className="bg-card rounded-xl border border-border p-4 flex items-center gap-3">
          <BarChart3 size={18} className="text-info shrink-0" />
          <div>
            <p className="text-lg font-bold font-display text-foreground">{realAvgCwa}</p>
            <p className="text-xs text-muted-foreground">Avg. CWA</p>
          </div>
        </div>
        <div className="bg-card rounded-xl border border-border p-4 flex items-center gap-3">
          <FileText size={18} className="text-secondary shrink-0" />
          <div>
            <p className="text-lg font-bold font-display text-foreground">{displayThesisDefended}</p>
            <p className="text-xs text-muted-foreground">Thesis Defended</p>
          </div>
        </div>
      </div>

      {/* Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="bg-card rounded-xl border border-border p-6">
          <h2 className="font-display text-lg font-bold text-foreground mb-1">Enrollment Trend</h2>
          <p className="text-xs text-muted-foreground mb-4">{adminDepartment ? `${adminDepartment} — 5-year trend` : "5-year postgraduate enrollment growth"}</p>
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={scaledEnrollmentTrend}>
              <defs>
                <linearGradient id="enrollGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(145 60% 22%)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(145 60% 22%)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(80 12% 88%)" />
              <XAxis dataKey="year" tick={{ fontSize: 11 }} stroke="hsl(120 8% 45%)" />
              <YAxis tick={{ fontSize: 11 }} stroke="hsl(120 8% 45%)" />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="students" stroke="hsl(145 60% 22%)" strokeWidth={2} fill="url(#enrollGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-card rounded-xl border border-border p-6">
          <h2 className="font-display text-lg font-bold text-foreground mb-1">{adminDepartment ? "Enrollment Overview" : "Enrollment by Department"}</h2>
          <p className="text-xs text-muted-foreground mb-4">Gender breakdown — {data.label}</p>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={filteredEnrollmentByDept}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(80 12% 88%)" />
              <XAxis dataKey="name" tick={{ fontSize: 10 }} stroke="hsl(120 8% 45%)" />
              <YAxis tick={{ fontSize: 11 }} stroke="hsl(120 8% 45%)" />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="male" name="Male" fill="hsl(145 60% 22%)" radius={[4, 4, 0, 0]} />
              <Bar dataKey="female" name="Female" fill="hsl(48 95% 50%)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="bg-card rounded-xl border border-border p-6">
          <h2 className="font-display text-lg font-bold text-foreground mb-1">Fees Collection Trend</h2>
          <p className="text-xs text-muted-foreground mb-4">Monthly collected vs target (GH₵) — {data.label}</p>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={scaledFeesCollection}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(80 12% 88%)" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="hsl(120 8% 45%)" />
              <YAxis tick={{ fontSize: 11 }} stroke="hsl(120 8% 45%)" tickFormatter={(v) => `${(v / 1000).toFixed(0)}K`} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Line type="monotone" dataKey="collected" name="Collected" stroke="hsl(145 60% 22%)" strokeWidth={2.5} dot={{ fill: "hsl(145 60% 22%)", r: 4 }} />
              <Line type="monotone" dataKey="target" name="Target" stroke="hsl(48 95% 50%)" strokeWidth={2} strokeDasharray="6 4" dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-card rounded-xl border border-border p-6">
          <h2 className="font-display text-lg font-bold text-foreground mb-1">Graduation Eligibility</h2>
          <p className="text-xs text-muted-foreground mb-4">Eligible vs ineligible — {data.label}</p>
          <div className="flex items-center gap-6">
            <ResponsiveContainer width="50%" height={220}>
              <PieChart>
                <Pie data={graduationEligibility} cx="50%" cy="50%" innerRadius={50} outerRadius={85} paddingAngle={5} dataKey="value">
                  {graduationEligibility.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={PIE_COLORS[index]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full" style={{ background: PIE_COLORS[0] }} />
                <div>
                  <p className="text-sm font-semibold text-foreground">{displayEligible} Eligible</p>
                  <p className="text-xs text-muted-foreground">{eligiblePct}%</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full" style={{ background: PIE_COLORS[1] }} />
                <div>
                  <p className="text-sm font-semibold text-foreground">{displayIneligible} Ineligible</p>
                  <p className="text-xs text-muted-foreground">{ineligiblePct}%</p>
                </div>
              </div>
              <button
                onClick={() => navigate("/admin/passlist")}
                className="mt-2 px-3 py-2 rounded-lg bg-muted text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
              >
                View Pass List <ChevronRight size={12} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Row 3 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="bg-card rounded-xl border border-border p-6">
          <h2 className="font-display text-lg font-bold text-foreground mb-1">CWA Distribution</h2>
          <p className="text-xs text-muted-foreground mb-4">Students per CWA range — {data.label}</p>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={data.cwaDistribution}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(80 12% 88%)" />
              <XAxis dataKey="range" tick={{ fontSize: 11 }} stroke="hsl(120 8% 45%)" />
              <YAxis tick={{ fontSize: 11 }} stroke="hsl(120 8% 45%)" />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="count" name="Students" fill="hsl(199 89% 48%)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-card rounded-xl border border-border p-6">
          <h2 className="font-display text-lg font-bold text-foreground mb-1">Program Distribution</h2>
          <p className="text-xs text-muted-foreground mb-4">Students per program — {data.label}</p>
          <div className="flex items-center gap-4">
            <ResponsiveContainer width="50%" height={220}>
              <PieChart>
                <Pie data={data.programBreakdown} cx="50%" cy="50%" outerRadius={85} dataKey="value" label={false}>
                  {data.programBreakdown.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={PROGRAM_COLORS[index % PROGRAM_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-2">
              {data.programBreakdown.map((p, i) => (
                <div key={p.name} className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: PROGRAM_COLORS[i % PROGRAM_COLORS.length] }} />
                  <span className="text-xs text-muted-foreground">{p.name}</span>
                  <span className="text-xs font-semibold text-foreground ml-auto">{p.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Row 4 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-card rounded-xl border border-border p-6">
          <h2 className="font-display text-lg font-bold text-foreground mb-1">Thesis Progress</h2>
          <p className="text-xs text-muted-foreground mb-4">Students at each stage — {data.label}</p>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={data.thesisProgress} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(80 12% 88%)" />
              <XAxis type="number" tick={{ fontSize: 11 }} stroke="hsl(120 8% 45%)" />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} stroke="hsl(120 8% 45%)" width={80} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="value" name="Students" radius={[0, 4, 4, 0]}>
                {data.thesisProgress.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-card rounded-xl border border-border p-6">
          <h2 className="font-display text-lg font-bold text-foreground mb-1">Alerts & Notices</h2>
          <p className="text-xs text-muted-foreground mb-4">Items requiring attention — {data.label}</p>
          <div className="space-y-3">
            {data.alerts.map((alert, i) => (
              <div
                key={i}
                onClick={() => alert.link && navigate(alert.link)}
                className={`flex items-center gap-3 p-3 rounded-lg bg-muted/30 ${alert.link ? "cursor-pointer hover:bg-muted/60" : ""} transition-colors`}
              >
                <div className={`shrink-0 w-7 h-7 rounded-md flex items-center justify-center ${alertStyles[alert.type]}`}>
                  {alertIcons[alert.type]}
                </div>
                <p className="text-sm text-foreground flex-1">{alert.text}</p>
                {alert.link && <ChevronRight size={14} className="text-muted-foreground shrink-0" />}
              </div>
            ))}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Analytics;
