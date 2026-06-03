import DashboardLayout from "@/components/DashboardLayout";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { useState, useMemo, useEffect } from "react";
import { Filter, Loader2 } from "lucide-react";
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

const FeeAnalytics = () => {
  const { isSuperAdmin, adminDepartment } = useAdminDepartment();
  const { toast } = useToast();
  const [summary, setSummary] = useState<FeeSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [yearFilter, setYearFilter] = useState<string>("all");
  const [deptFilter, setDeptFilter] = useState<string>("all");

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (yearFilter !== "all") params.append("academic_year", yearFilter);
        const dept = isSuperAdmin ? deptFilter : (adminDepartment || "all");
        if (dept !== "all") params.append("department", dept);
        
        const data = await apiFetch<FeeSummary>(`/fees/summary?${params}`);
        setSummary(data);
      } catch (err: any) {
        toast({ title: "Failed to load", description: err.message, variant: "destructive" });
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [yearFilter, deptFilter, isSuperAdmin, adminDepartment]);

  const totalCollected = summary?.total_paid || 0;
  const outstanding = summary?.total_outstanding || 0;
  const clearedCount = summary?.cleared_count || 0;
  const owingCount = summary?.owing_count || 0;
  const complianceRate = Math.round(summary?.compliance_rate || 0);

  return (
    <DashboardLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold font-display text-foreground">Fee Payment Analytics</h1>
        <p className="text-muted-foreground mt-1">
          {isSuperAdmin ? "Real-time financial overview from database" : `${adminDepartment} — Financial overview`}
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Filter size={16} />
          <span>Filter by:</span>
        </div>
        <input
          type="text"
          placeholder="Academic Year (e.g. 2023/2024)"
          value={yearFilter === "all" ? "" : yearFilter}
          onChange={(e) => setYearFilter(e.target.value.trim() || "all")}
          className="px-4 py-2.5 rounded-lg border border-input bg-card text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
        {isSuperAdmin && (
          <input
            type="text"
            placeholder="Department"
            value={deptFilter === "all" ? "" : deptFilter}
            onChange={(e) => setDeptFilter(e.target.value.trim() || "all")}
            className="px-4 py-2.5 rounded-lg border border-input bg-card text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground text-sm">
          <Loader2 size={18} className="animate-spin mr-2" /> Loading analytics...
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-5 gap-4 mb-6">
            {[
              { label: "Total Collected", value: `GHS ${totalCollected.toLocaleString()}` },
              { label: "Outstanding", value: `GHS ${outstanding.toLocaleString()}` },
              { label: "Compliance Rate", value: `${complianceRate}%` },
              { label: "Defaulters", value: `${owingCount}` },
              { label: "Cleared", value: `${clearedCount}` },
            ].map((s) => (
              <div key={s.label} className="bg-card rounded-xl border border-border p-5">
                <p className="text-2xl font-bold font-display text-foreground">{s.value}</p>
                <p className="text-sm text-muted-foreground mt-1">{s.label}</p>
              </div>
            ))}
          </div>

          <div className="bg-card rounded-xl border border-border p-6 text-center text-muted-foreground text-sm">
            Detailed charts require fee records with payment dates. Add fee records to see visualizations.
          </div>
        </>
      )}
    </DashboardLayout>
  );
};

export default FeeAnalytics;
