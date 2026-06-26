import DashboardLayout from "@/components/DashboardLayout";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from "recharts";
import { useState, useEffect } from "react";
import { Filter, Loader2, TrendingUp, TrendingDown, Users, CheckCircle, X } from "lucide-react";
import { useAdminDepartment } from "@/hooks/use-admin-department";
import { apiFetch } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

interface FeeSummary {
  total_students: number;
  total_fees: number;
  total_paid: number;
  total_outstanding: number;
  cleared_count: number;
  owing_count: number;
  compliance_rate: number;
}

interface ChartRow {
  label: string;
  collected: number;
  outstanding: number;
  total: number;
}

interface SemesterRow extends ChartRow {
  paid_count: number;
  partial_count: number;
  unpaid_count: number;
}

interface StatusRow {
  label: string;
  count: number;
  total_amount: number;
}

interface ChartsData {
  byDepartment: ChartRow[];
  byYear: ChartRow[];
  bySemester: SemesterRow[];
  byStatus: StatusRow[];
}

interface FilterOptions {
  academicYears: string[];
  departments: string[];
}

const STATUS_COLORS: Record<string, string> = {
  Paid: "#22c55e",
  Partial: "#f59e0b",
  Unpaid: "#ef4444",
};

const PIE_COLORS = ["#22c55e", "#f59e0b", "#ef4444", "#6366f1", "#14b8a6"];

const fmt = (n: number) =>
  n >= 1_000_000
    ? `GHS ${(n / 1_000_000).toFixed(1)}M`
    : n >= 1_000
    ? `GHS ${(n / 1_000).toFixed(1)}K`
    : `GHS ${n.toLocaleString()}`;

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-border rounded-lg p-3 shadow-lg text-sm">
      <p className="font-semibold text-foreground mb-1">{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} style={{ color: p.color }}>
          {p.name}: {typeof p.value === "number" && p.name.toLowerCase().includes("count")
            ? p.value
            : fmt(p.value)}
        </p>
      ))}
    </div>
  );
};

const FeeAnalytics = () => {
  const { isSuperAdmin, adminDepartment } = useAdminDepartment();
  const { toast } = useToast();
  const [summary, setSummary] = useState<FeeSummary | null>(null);
  const [charts, setCharts] = useState<ChartsData | null>(null);
  const [filterOptions, setFilterOptions] = useState<FilterOptions>({ academicYears: [], departments: [] });
  const [loading, setLoading] = useState(true);
  const [yearFilter, setYearFilter] = useState<string>("all");
  const [deptFilter, setDeptFilter] = useState<string>("all");
  const [filterOptionsLoaded, setFilterOptionsLoaded] = useState(false);

  // Fetch filter options once on mount
  useEffect(() => {
    const loadOptions = async () => {
      try {
        const opts = await apiFetch<FilterOptions>("/fees/filter-options");
        setFilterOptions(opts);
      } catch (_) {
        // Non-critical — filters will just show "all"
      } finally {
        setFilterOptionsLoaded(true);
      }
    };
    loadOptions();
  }, []);

  useEffect(() => {
    if (!filterOptionsLoaded) return;

    const load = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (yearFilter !== "all") params.append("academic_year", yearFilter);
        const dept = !isSuperAdmin && adminDepartment ? adminDepartment : deptFilter;
        if (dept !== "all") params.append("department", dept);

        const qs = params.toString();
        const [summaryData, chartsData] = await Promise.all([
          apiFetch<FeeSummary>(`/fees/summary${qs ? `?${qs}` : ""}`),
          apiFetch<ChartsData>(`/fees/charts${qs ? `?${qs}` : ""}`),
        ]);
        setSummary(summaryData);
        setCharts(chartsData);
      } catch (err: any) {
        toast({ title: "Failed to load analytics", description: err.message, variant: "destructive" });
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [yearFilter, deptFilter, isSuperAdmin, adminDepartment, filterOptionsLoaded]);

  const hasActiveFilters = yearFilter !== "all" || deptFilter !== "all";

  const totalCollected = summary?.total_paid || 0;
  const outstanding = summary?.total_outstanding || 0;
  const clearedCount = summary?.cleared_count || 0;
  const owingCount = summary?.owing_count || 0;
  const complianceRate = Math.round(summary?.compliance_rate || 0);

  const hasData = charts && (
    charts.byDepartment.length > 0 ||
    charts.byYear.length > 0 ||
    charts.bySemester.length > 0 ||
    charts.byStatus.length > 0
  );

  return (
    <DashboardLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold font-display text-foreground">Fee Payment Analytics</h1>
        <p className="text-muted-foreground mt-1">
          Real-time financial overview from database
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6 items-start sm:items-center">
        <div className="flex items-center gap-2 text-sm text-muted-foreground shrink-0">
          <Filter size={16} />
          <span>Filter by:</span>
        </div>
        <select
          value={yearFilter}
          onChange={(e) => setYearFilter(e.target.value)}
          className="px-4 py-2.5 rounded-lg border border-input bg-card text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring min-w-[180px]"
        >
          <option value="all">All Academic Years</option>
          {filterOptions.academicYears.map((y) => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>
        {(isSuperAdmin || !adminDepartment) && (
          <select
            value={deptFilter}
            onChange={(e) => setDeptFilter(e.target.value)}
            className="px-4 py-2.5 rounded-lg border border-input bg-card text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring min-w-[180px]"
          >
            <option value="all">All Departments</option>
            {filterOptions.departments.map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
        )}
        {hasActiveFilters && (
          <button
            onClick={() => { setYearFilter("all"); setDeptFilter("all"); }}
            className="px-3 py-2.5 rounded-lg border border-border bg-card text-muted-foreground hover:text-foreground text-sm flex items-center gap-1"
          >
            <X size={14} /> Clear
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24 text-muted-foreground text-sm">
          <Loader2 size={20} className="animate-spin mr-2" /> Loading analytics...
        </div>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
            {[
              {
                label: "Total Collected",
                value: fmt(totalCollected),
                icon: <TrendingUp size={18} className="text-green-500" />,
                color: "text-green-600",
              },
              {
                label: "Outstanding",
                value: fmt(outstanding),
                icon: <TrendingDown size={18} className="text-red-500" />,
                color: "text-red-600",
              },
              {
                label: "Compliance Rate",
                value: `${complianceRate}%`,
                icon: <CheckCircle size={18} className="text-blue-500" />,
                color: complianceRate >= 70 ? "text-green-600" : "text-red-600",
              },
              {
                label: "Defaulters",
                value: `${owingCount}`,
                icon: <Users size={18} className="text-orange-500" />,
                color: "text-orange-600",
              },
              {
                label: "Cleared",
                value: `${clearedCount}`,
                icon: <CheckCircle size={18} className="text-green-500" />,
                color: "text-green-600",
              },
            ].map((s) => (
              <div key={s.label} className="bg-card rounded-xl border border-border p-5">
                <div className="flex items-center justify-between mb-2">
                  {s.icon}
                </div>
                <p className={`text-2xl font-bold font-display ${s.color}`}>{s.value}</p>
                <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
              </div>
            ))}
          </div>

          {!hasData ? (
            <div className="bg-card rounded-xl border border-border p-12 text-center text-muted-foreground text-sm">
              <TrendingUp size={40} className="mx-auto mb-3 opacity-30" />
              <p className="font-medium">No fee records found</p>
              <p className="text-xs mt-1">
                {hasActiveFilters
                  ? "No records match the selected filters. Try clearing filters to see all data."
                  : "Upload fee records to see detailed visualizations."}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">

              {/* Chart 1: Collected vs Outstanding by Department */}
              {charts.byDepartment.length > 0 && (
                <div className="bg-card rounded-xl border border-border p-6">
                  <h2 className="text-base font-semibold text-foreground mb-1">
                    Collections by Department
                  </h2>
                  <p className="text-xs text-muted-foreground mb-4">
                    Collected vs outstanding fees per department
                  </p>
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart
                      data={charts.byDepartment}
                      margin={{ top: 4, right: 16, left: 0, bottom: 60 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis
                        dataKey="label"
                        tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                        angle={-35}
                        textAnchor="end"
                        interval={0}
                      />
                      <YAxis
                        tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                        tickFormatter={(v) => fmt(v).replace("GHS ", "")}
                      />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
                      <Bar dataKey="collected" name="Collected" fill="#22c55e" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="outstanding" name="Outstanding" fill="#ef4444" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* Chart 2: Payment Status Pie */}
              {charts.byStatus.length > 0 && (
                <div className="bg-card rounded-xl border border-border p-6">
                  <h2 className="text-base font-semibold text-foreground mb-1">
                    Payment Status Breakdown
                  </h2>
                  <p className="text-xs text-muted-foreground mb-4">
                    Distribution of students by payment status
                  </p>
                  <ResponsiveContainer width="100%" height={280}>
                    <PieChart>
                      <Pie
                        data={charts.byStatus}
                        dataKey="count"
                        nameKey="label"
                        cx="50%"
                        cy="50%"
                        outerRadius={100}
                        innerRadius={50}
                        paddingAngle={3}
                        label={({ label, count, percent }) =>
                          `${label}: ${count} (${(percent * 100).toFixed(0)}%)`
                        }
                        labelLine={true}
                      >
                        {charts.byStatus.map((entry) => (
                          <Cell
                            key={entry.label}
                            fill={STATUS_COLORS[entry.label] || PIE_COLORS[0]}
                          />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value: any, name: string, props: any) => [
                          `${value} students`,
                          props.payload.label,
                        ]}
                      />
                      <Legend
                        formatter={(value, entry: any) =>
                          `${entry.payload.label} (${entry.payload.count})`
                        }
                        wrapperStyle={{ fontSize: 12 }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* Chart 3: Collections by Academic Year */}
              {charts.byYear.length > 0 && (
                <div className="bg-card rounded-xl border border-border p-6">
                  <h2 className="text-base font-semibold text-foreground mb-1">
                    Collections by Academic Year
                  </h2>
                  <p className="text-xs text-muted-foreground mb-4">
                    Collected vs outstanding fees per academic year
                  </p>
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart
                      data={charts.byYear}
                      margin={{ top: 4, right: 16, left: 0, bottom: 40 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis
                        dataKey="label"
                        tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                        angle={-20}
                        textAnchor="end"
                        interval={0}
                      />
                      <YAxis
                        tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                        tickFormatter={(v) => fmt(v).replace("GHS ", "")}
                      />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
                      <Bar dataKey="collected" name="Collected" fill="#6366f1" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="outstanding" name="Outstanding" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* Chart 4: Student Counts by Semester */}
              {charts.bySemester.length > 0 && (
                <div className="bg-card rounded-xl border border-border p-6">
                  <h2 className="text-base font-semibold text-foreground mb-1">
                    Student Payment Status by Semester
                  </h2>
                  <p className="text-xs text-muted-foreground mb-4">
                    Number of paid, partial, and unpaid students per semester
                  </p>
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart
                      data={charts.bySemester}
                      margin={{ top: 4, right: 16, left: 0, bottom: 40 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis
                        dataKey="label"
                        tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                        angle={-20}
                        textAnchor="end"
                        interval={0}
                      />
                      <YAxis
                        tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                        allowDecimals={false}
                      />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
                      <Bar dataKey="paid_count" name="Paid count" fill="#22c55e" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="partial_count" name="Partial count" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="unpaid_count" name="Unpaid count" fill="#ef4444" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* Chart 5: Total Fees vs Collected by Semester (amounts) */}
              {charts.bySemester.length > 0 && (
                <div className="bg-card rounded-xl border border-border p-6 xl:col-span-2">
                  <h2 className="text-base font-semibold text-foreground mb-1">
                    Fee Collection Amounts by Semester
                  </h2>
                  <p className="text-xs text-muted-foreground mb-4">
                    Total fees billed vs amount collected per semester
                  </p>
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart
                      data={charts.bySemester}
                      margin={{ top: 4, right: 16, left: 0, bottom: 40 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis
                        dataKey="label"
                        tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                        angle={-20}
                        textAnchor="end"
                        interval={0}
                      />
                      <YAxis
                        tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                        tickFormatter={(v) => fmt(v).replace("GHS ", "")}
                      />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
                      <Bar dataKey="total" name="Total Billed" fill="#94a3b8" radius={[4, 4, 0, 0]} />
