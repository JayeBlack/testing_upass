import DashboardLayout from "@/components/DashboardLayout";
import { Users, BookOpen, Banknote, GraduationCap, TrendingUp, TrendingDown, CheckCircle, Clock, BarChart3, AlertTriangle, ChevronRight, Loader2, Eye } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, AreaChart, Area, Legend,
} from "recharts";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";

interface OverviewData {
  total_students: number;
  active_students: number;
  graduands_eligible: number;
  graduands_ineligible: number;
  fees_collected: number;
  fees_owing: number;
  fees_cleared: number;
  fees_owing_count: number;
  collection_rate: number;
  avg_cwa: string;
  thesis_defended: number;
}

interface EnrollmentByDept {
  department: string;
  students: number;
  male: number;
  female: number;
}

interface FeesTrend {
  month: string;
  collected: number;
  target: number;
}

interface ThesisProgress {
  stage: string;
  value: number;
}

interface CWADistribution {
  range: string;
  count: number;
}

interface ProgramBreakdown {
  program: string;
  value: number;
}

interface EnrollmentTrend {
  year: string;
  students: number;
}

interface Alert {
  text: string;
  type: string;
  link?: string;
}

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

const EmptyState = ({ icon: Icon, message }: { icon: any, message: string }) => (
  <div className="flex flex-col items-center justify-center py-12">
    <Icon size={48} className="text-muted-foreground/30 mb-3" />
    <p className="text-sm text-muted-foreground">{message}</p>
    <p className="text-xs text-muted-foreground/60 mt-1">Data will appear here once added to the system</p>
  </div>
);

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
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  
  const [overview, setOverview] = useState<OverviewData | null>(null);
  const [enrollmentByDept, setEnrollmentByDept] = useState<EnrollmentByDept[]>([]);
  const [feesTrend, setFeesTrend] = useState<FeesTrend[]>([]);
  const [thesisProgress, setThesisProgress] = useState<ThesisProgress[]>([]);
  const [cwaDistribution, setCwaDistribution] = useState<CWADistribution[]>([]);
  const [programBreakdown, setProgramBreakdown] = useState<ProgramBreakdown[]>([]);
  const [enrollmentTrend, setEnrollmentTrend] = useState<EnrollmentTrend[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [counts, setCounts] = useState({ departments: 0, programs: 0 });

  const isSuperAdmin = user?.isSuperAdmin || user?.role === "Admin" || user?.role === "Dean" || user?.role === "ViceDean";
  const isDean = user?.role === "Dean" || user?.role === "ViceDean";
  const isExamsOfficer = user?.role === "ExamsOfficer";
  // ExamsOfficer sees all data regardless of department
  const department = isSuperAdmin || isExamsOfficer ? "all" : user?.department;

  const loadAllData = async () => {
    setLoading(true);
    try {
      const deptParam = department && department !== "all" ? `?department=${department}` : "";
      
      // Fetch each endpoint individually so one failure doesn't cascade and wipe all data
      async function fetchSafe<T>(url: string): Promise<T | null> {
        try { return await apiFetch<T>(url); }
        catch { return null; }
      }

      const [
        overviewData,
        enrollmentData,
        feesData,
        thesisData,
        cwaData,
        programData,
        trendData,
        countsData,
        alertsData,
      ] = await Promise.all([
        fetchSafe<OverviewData>(`/analytics/overview${deptParam}`),
        fetchSafe<EnrollmentByDept[]>(`/analytics/enrollment-by-dept${deptParam}`),
        fetchSafe<FeesTrend[]>(`/analytics/fees-trend${deptParam}`),
        fetchSafe<ThesisProgress[]>(`/analytics/thesis-progress${deptParam}`),
        fetchSafe<CWADistribution[]>(`/analytics/cwa-distribution${deptParam}`),
        fetchSafe<ProgramBreakdown[]>(`/analytics/program-breakdown${deptParam}`),
        fetchSafe<EnrollmentTrend[]>(`/analytics/enrollment-trend${deptParam}`),
        fetchSafe<{ departments: number; programs: number }>(`/analytics/counts${deptParam}`),
        fetchSafe<Alert[]>(`/analytics/alerts${deptParam}`),
      ]);

      setOverview(overviewData);
      setEnrollmentByDept(enrollmentData || []);
      setFeesTrend(feesData || []);
      setThesisProgress(thesisData || []);
      setCwaDistribution(cwaData || []);
      setProgramBreakdown(programData || []);
      setEnrollmentTrend(trendData || []);
      setCounts(countsData || { departments: 0, programs: 0 });
      setAlerts(alertsData || []);
    } catch (err) {
      console.error("Failed to load analytics:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllData();
  }, [department]);

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center h-96">
          <Loader2 size={48} className="animate-spin text-secondary mb-4" />
          <p className="text-muted-foreground">Loading analytics data...</p>
        </div>
      </DashboardLayout>
    );
  }

  const graduationEligibility = [
    { name: "Eligible", value: overview?.graduands_eligible || 0 },
    { name: "Ineligible", value: overview?.graduands_ineligible || 0 },
  ];
  const totalGraduands = (overview?.graduands_eligible || 0) + (overview?.graduands_ineligible || 0);
  const eligiblePct = totalGraduands > 0 ? (((overview?.graduands_eligible || 0) / totalGraduands) * 100).toFixed(1) : "0";

  const thesisColors: Record<string, string> = {
    "Not Started": "hsl(120 8% 45%)",
    "Proposal":    "hsl(199 89% 48%)",
    "Chapter 1":   "hsl(48 95% 50%)",
    "Chapter 2":   "hsl(38 92% 50%)",
    "Chapter 3":   "hsl(145 60% 22%)",
    "Chapter 4":   "hsl(142 71% 45%)",
    "Chapter 5":   "hsl(271 81% 56%)",
    "Defense":     "hsl(0 72% 51%)",
  };

  const thesisWithColors = thesisProgress.map(t => ({
    ...t,
    fill: thesisColors[t.stage] || "hsl(120 8% 45%)"
  }));

  return (
    <DashboardLayout>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold font-display text-foreground">
            {isSuperAdmin ? "School Analytics" : isExamsOfficer ? "Exams Office Analytics" : isDean ? "Analytics" : `${department} Analytics`}
          </h1>
          <p className="text-muted-foreground mt-1">
            {isSuperAdmin ? "Comprehensive overview — Real-time data" : isExamsOfficer ? "Academic performance & enrollment tracking — Real-time data" : isDean ? "School of Postgraduate Studies — Real-time data" : `Department overview — Real-time data`}
          </p>
          {isExamsOfficer && (
            <p className="text-xs text-info mt-1 flex items-center gap-1">
              <Eye size={12} /> Read-only access
            </p>
          )}
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
        <StatCard
          icon={<Users size={18} className="text-secondary-foreground" />}
          label="Total Students"
          value={overview?.total_students.toString() || "0"}
          sub={`${overview?.active_students || 0} active`}
          trend="up"
          accent
          onClick={() => navigate("/admin/students")}
        />
        <StatCard
          icon={<GraduationCap size={18} className="text-muted-foreground" />}
          label="Graduands (Eligible)"
          value={overview?.graduands_eligible.toString() || "0"}
          sub={`${eligiblePct}% eligibility rate`}
          trend="up"
          onClick={() => navigate("/admin/passlist")}
        />
        <StatCard
          icon={<Banknote size={18} className="text-muted-foreground" />}
          label="Fees Collected"
          value={
            overview?.fees_collected && overview.fees_collected >= 1000000
              ? `GH₵ ${(overview.fees_collected / 1000000).toFixed(2)}M`
              : `GH₵ ${((overview?.fees_collected || 0) / 1000).toFixed(0)}K`
          }
          sub={`${overview?.collection_rate || 0}% collection rate`}
          trend="up"
          onClick={() => navigate("/admin/fees")}
        />
        <StatCard
          icon={<BookOpen size={18} className="text-muted-foreground" />}
          label="Active Programs"
          value={counts.programs.toString()}
          sub={`${counts.departments} department${counts.departments !== 1 ? "s" : ""}`}
        />
      </div>

      {/* Secondary Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        <div
          onClick={() => navigate("/admin/fees")}
          className="bg-card rounded-xl border border-border p-4 flex items-center gap-3 cursor-pointer hover:shadow-md transition-shadow"
        >
          <CheckCircle size={18} className="text-success shrink-0" />
          <div>
            <p className="text-lg font-bold font-display text-foreground">{overview?.fees_cleared || 0}</p>
            <p className="text-xs text-muted-foreground">Fees Cleared</p>
          </div>
        </div>
        <div
          onClick={() => navigate("/admin/fees")}
          className="bg-card rounded-xl border border-border p-4 flex items-center gap-3 cursor-pointer hover:shadow-md transition-shadow"
        >
          <AlertTriangle size={18} className="text-warning shrink-0" />
          <div>
            <p className="text-lg font-bold font-display text-foreground">{overview?.fees_owing_count || 0}</p>
            <p className="text-xs text-muted-foreground">Fees Owing</p>
          </div>
        </div>
        <div className="bg-card rounded-xl border border-border p-4 flex items-center gap-3">
          <BarChart3 size={18} className="text-info shrink-0" />
          <div>
            <p className="text-lg font-bold font-display text-foreground">{overview?.avg_cwa || "—"}</p>
            <p className="text-xs text-muted-foreground">Avg. CWA</p>
          </div>
        </div>
        <div className="bg-card rounded-xl border border-border p-4 flex items-center gap-3">
          <CheckCircle size={18} className="text-secondary shrink-0" />
          <div>
            <p className="text-lg font-bold font-display text-foreground">{overview?.thesis_defended || 0}</p>
            <p className="text-xs text-muted-foreground">Thesis Defended</p>
          </div>
        </div>
      </div>

      {/* Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="bg-card rounded-xl border border-border p-6">
          <h2 className="font-display text-lg font-bold text-foreground mb-1">Enrollment Trend</h2>
          <p className="text-xs text-muted-foreground mb-4">{department !== "all" ? `${department} — Historical trend` : "Historical enrollment growth"}</p>
          {enrollmentTrend.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={enrollmentTrend}>
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
          ) : (
            <EmptyState icon={TrendingUp} message="No enrollment history yet" />
          )}
        </div>

        <div className="bg-card rounded-xl border border-border p-6">
          <h2 className="font-display text-lg font-bold text-foreground mb-1">Enrollment by Department</h2>
          <p className="text-xs text-muted-foreground mb-4">Gender breakdown — Current year</p>
          {enrollmentByDept.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={enrollmentByDept}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(80 12% 88%)" />
                <XAxis dataKey="department" tick={{ fontSize: 10 }} stroke="hsl(120 8% 45%)" angle={-15} textAnchor="end" height={80} />
                <YAxis tick={{ fontSize: 11 }} stroke="hsl(120 8% 45%)" />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="male" name="Male" fill="hsl(145 60% 22%)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="female" name="Female" fill="hsl(48 95% 50%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState icon={Users} message="No department enrollment data" />
          )}
        </div>
      </div>

      {/* Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="bg-card rounded-xl border border-border p-6">
          <h2 className="font-display text-lg font-bold text-foreground mb-1">Fees Collection Trend</h2>
          <p className="text-xs text-muted-foreground mb-4">Monthly collected vs target (GH₵)</p>
          {feesTrend.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={feesTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(80 12% 88%)" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="hsl(120 8% 45%)" />
                <YAxis tick={{ fontSize: 11 }} stroke="hsl(120 8% 45%)" tickFormatter={(v) => `${(v / 1000).toFixed(0)}K`} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Line type="monotone" dataKey="collected" name="Collected" stroke="hsl(145 60% 22%)" strokeWidth={2.5} dot={{ fill: "hsl(145 60% 22%)", r: 4 }} />
                <Line type="monotone" dataKey="target" name="Target" stroke="hsl(48 95% 50%)" strokeWidth={2} strokeDasharray="6 4" dot={false} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState icon={Banknote} message="No fees collection data yet" />
          )}
        </div>

        <div className="bg-card rounded-xl border border-border p-6">
          <h2 className="font-display text-lg font-bold text-foreground mb-1">Graduation Eligibility</h2>
          <p className="text-xs text-muted-foreground mb-4">Eligible vs ineligible</p>
          {totalGraduands > 0 ? (
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
                    <p className="text-sm font-semibold text-foreground">{overview?.graduands_eligible || 0} Eligible</p>
                    <p className="text-xs text-muted-foreground">{eligiblePct}%</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full" style={{ background: PIE_COLORS[1] }} />
                  <div>
                    <p className="text-sm font-semibold text-foreground">{overview?.graduands_ineligible || 0} Ineligible</p>
                    <p className="text-xs text-muted-foreground">{(100 - parseFloat(eligiblePct)).toFixed(1)}%</p>
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
          ) : (
            <EmptyState icon={GraduationCap} message="No graduands data available" />
          )}
        </div>
      </div>

      {/* Row 3 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="bg-card rounded-xl border border-border p-6">
          <h2 className="font-display text-lg font-bold text-foreground mb-1">CWA Distribution</h2>
          <p className="text-xs text-muted-foreground mb-4">Students per CWA range</p>
          {cwaDistribution.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={cwaDistribution}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(80 12% 88%)" />
                <XAxis dataKey="range" tick={{ fontSize: 11 }} stroke="hsl(120 8% 45%)" />
                <YAxis tick={{ fontSize: 11 }} stroke="hsl(120 8% 45%)" />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="count" name="Students" fill="hsl(199 89% 48%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState icon={BarChart3} message="No CWA data available yet" />
          )}
        </div>

        <div className="bg-card rounded-xl border border-border p-6">
          <h2 className="font-display text-lg font-bold text-foreground mb-1">Program Distribution</h2>
          <p className="text-xs text-muted-foreground mb-4">Students per program</p>
          {programBreakdown.length > 0 ? (
            <div className="flex items-center gap-4">
              <ResponsiveContainer width="50%" height={220}>
                <PieChart>
                  <Pie data={programBreakdown} cx="50%" cy="50%" outerRadius={85} dataKey="value" label={false}>
                    {programBreakdown.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={PROGRAM_COLORS[index % PROGRAM_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-2 max-h-[220px] overflow-y-auto">
                {programBreakdown.map((p, i) => (
                  <div key={p.program} className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: PROGRAM_COLORS[i % PROGRAM_COLORS.length] }} />
                    <span className="text-xs text-muted-foreground truncate">{p.program}</span>
                    <span className="text-xs font-semibold text-foreground ml-auto">{p.value}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <EmptyState icon={BookOpen} message="No program data available" />
          )}
        </div>
      </div>

      {/* Row 4 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-card rounded-xl border border-border p-6">
          <h2 className="font-display text-lg font-bold text-foreground mb-1">Thesis Progress</h2>
          <p className="text-xs text-muted-foreground mb-4">Students at each stage</p>
          {thesisWithColors.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={thesisWithColors} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(80 12% 88%)" />
                <XAxis type="number" tick={{ fontSize: 11 }} stroke="hsl(120 8% 45%)" />
                <YAxis type="category" dataKey="stage" tick={{ fontSize: 11 }} stroke="hsl(120 8% 45%)" width={100} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="value" name="Students" radius={[0, 4, 4, 0]}>
                  {thesisWithColors.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState icon={BookOpen} message="No thesis progress data" />
          )}
        </div>

        <div className="bg-card rounded-xl border border-border p-6">
          <h2 className="font-display text-lg font-bold text-foreground mb-1">Alerts & Notices</h2>
          <p className="text-xs text-muted-foreground mb-4">Items requiring attention</p>
          {alerts.length > 0 ? (
            <div className="space-y-3">
              {alerts.map((alert, i) => (
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
          ) : (
            <EmptyState icon={CheckCircle} message="All clear! No alerts at this time" />
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Analytics;
