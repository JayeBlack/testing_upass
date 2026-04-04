import DashboardLayout from "@/components/DashboardLayout";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { useState, useMemo } from "react";
import { Filter } from "lucide-react";

// Shared payment store that both online & manual imports feed into
interface PaymentRecord {
  studentName: string;
  index: string;
  department: string;
  program: string;
  totalFees: number;
  amountPaid: number;
  paidMonth: string;
  paidYear: string;
}

const basePayments: PaymentRecord[] = [
  { studentName: "Kwame Mensah", index: "UMaT/PG/0234/22", department: "Computer Science", program: "MSc. IT", totalFees: 5200, amountPaid: 5200, paidMonth: "Sep", paidYear: "2024" },
  { studentName: "Ama Serwaa", index: "UMaT/PG/0198/22", department: "Computer Science", program: "MSc. IT", totalFees: 5200, amountPaid: 5200, paidMonth: "Sep", paidYear: "2024" },
  { studentName: "Yaw Boateng", index: "UMaT/PG/0312/22", department: "Computer Science", program: "MPhil CS", totalFees: 5200, amountPaid: 3400, paidMonth: "Oct", paidYear: "2024" },
  { studentName: "Efua Dankwah", index: "UMaT/PG/0287/22", department: "Computer Science", program: "MSc. IT", totalFees: 5200, amountPaid: 5200, paidMonth: "Oct", paidYear: "2024" },
  { studentName: "Kofi Adjei", index: "UMaT/PG/0345/22", department: "Computer Science", program: "MPhil CS", totalFees: 5200, amountPaid: 2600, paidMonth: "Nov", paidYear: "2024" },
  { studentName: "Abena Owusu", index: "UMaT/PG/0401/23", department: "Mining Engineering", program: "MSc. Mining Eng", totalFees: 6000, amountPaid: 6000, paidMonth: "Sep", paidYear: "2024" },
  { studentName: "Yaw Frimpong", index: "UMaT/PG/0178/21", department: "Mining Engineering", program: "MSc. Mining Eng", totalFees: 6000, amountPaid: 4500, paidMonth: "Nov", paidYear: "2024" },
  { studentName: "Esi Appiah", index: "UMaT/PG/0145/21", department: "Electrical Engineering", program: "MSc. Electrical Eng", totalFees: 5500, amountPaid: 5500, paidMonth: "Oct", paidYear: "2024" },
  { studentName: "Akua Mensah", index: "UMaT/PG/0112/21", department: "Electrical Engineering", program: "MSc. Electrical Eng", totalFees: 5500, amountPaid: 3000, paidMonth: "Dec", paidYear: "2024" },
  { studentName: "Nana Agyei", index: "UMaT/PG/0420/23", department: "Mechanical Engineering", program: "MSc. Mechanical Eng", totalFees: 5800, amountPaid: 5800, paidMonth: "Sep", paidYear: "2024" },
  { studentName: "Kwesi Boadu", index: "UMaT/PG/0455/23", department: "Environmental Science", program: "MSc. Env. Sci", totalFees: 5000, amountPaid: 5000, paidMonth: "Sep", paidYear: "2024" },
  { studentName: "Adjoa Poku", index: "UMaT/PG/0460/23", department: "Geological Engineering", program: "MSc. Geo. Eng", totalFees: 5500, amountPaid: 4000, paidMonth: "Oct", paidYear: "2024" },
  { studentName: "Yaw Asare", index: "UMaT/PG/0470/23", department: "Mathematical Sciences", program: "MSc. Math Sci", totalFees: 4800, amountPaid: 4800, paidMonth: "Nov", paidYear: "2024" },
  { studentName: "Akosua Darko", index: "UMaT/PG/0480/23", department: "Petroleum Engineering", program: "MSc. Petro. Eng", totalFees: 6200, amountPaid: 6200, paidMonth: "Sep", paidYear: "2024" },
  { studentName: "Kofi Badu", index: "UMaT/PG/0490/23", department: "Petroleum Engineering", program: "MSc. Petro. Eng", totalFees: 6200, amountPaid: 3100, paidMonth: "Dec", paidYear: "2024" },
  { studentName: "Ama Tetteh", index: "UMaT/PG/0501/23", department: "Environmental Science", program: "MSc. Env. Sci", totalFees: 5000, amountPaid: 2500, paidMonth: "Jan", paidYear: "2024" },
  { studentName: "Kweku Ofori", index: "UMaT/PG/0510/23", department: "Geological Engineering", program: "MSc. Geo. Eng", totalFees: 5500, amountPaid: 5500, paidMonth: "Feb", paidYear: "2024" },
];

const FeeAnalytics = () => {
  const [yearFilter, setYearFilter] = useState<string>("all");
  const [deptFilter, setDeptFilter] = useState<string>("all");

  const departments = useMemo(() => [...new Set(basePayments.map((p) => p.department))].sort(), []);
  const years = useMemo(() => [...new Set(basePayments.map((p) => p.paidYear))].sort(), []);

  const filteredPayments = useMemo(() => {
    return basePayments.filter((p) => {
      const matchYear = yearFilter === "all" || p.paidYear === yearFilter;
      const matchDept = deptFilter === "all" || p.department === deptFilter;
      return matchYear && matchDept;
    });
  }, [yearFilter, deptFilter]);

  // Real-time computed analytics from payment records
  const totalCollected = useMemo(() => filteredPayments.reduce((s, p) => s + p.amountPaid, 0), [filteredPayments]);
  const totalExpected = useMemo(() => filteredPayments.reduce((s, p) => s + p.totalFees, 0), [filteredPayments]);
  const outstanding = totalExpected - totalCollected;
  const clearedCount = useMemo(() => filteredPayments.filter((p) => p.amountPaid >= p.totalFees).length, [filteredPayments]);
  const owingCount = useMemo(() => filteredPayments.filter((p) => p.amountPaid < p.totalFees).length, [filteredPayments]);
  const complianceRate = filteredPayments.length > 0 ? Math.round((clearedCount / filteredPayments.length) * 100) : 0;

  // Monthly collection chart data - computed from records
  const monthlyData = useMemo(() => {
    const monthOrder = ["Sep", "Oct", "Nov", "Dec", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug"];
    const grouped: Record<string, number> = {};
    filteredPayments.forEach((p) => {
      grouped[p.paidMonth] = (grouped[p.paidMonth] || 0) + p.amountPaid;
    });
    return monthOrder.filter((m) => grouped[m]).map((m) => ({ month: m, collected: grouped[m] }));
  }, [filteredPayments]);

  // Compliance by programme - computed from records
  const complianceByProg = useMemo(() => {
    const progMap: Record<string, { total: number; cleared: number }> = {};
    filteredPayments.forEach((p) => {
      if (!progMap[p.program]) progMap[p.program] = { total: 0, cleared: 0 };
      progMap[p.program].total++;
      if (p.amountPaid >= p.totalFees) progMap[p.program].cleared++;
    });
    return Object.entries(progMap).map(([program, data]) => ({
      program,
      rate: Math.round((data.cleared / data.total) * 100),
    })).sort((a, b) => b.rate - a.rate);
  }, [filteredPayments]);

  return (
    <DashboardLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold font-display text-foreground">Fee Payment Analytics</h1>
        <p className="text-muted-foreground mt-1">Real-time financial overview computed from payment records</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Filter size={16} />
          <span>Filter by:</span>
        </div>
        <select value={yearFilter} onChange={(e) => setYearFilter(e.target.value)} className="px-4 py-2.5 rounded-lg border border-input bg-card text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring">
          <option value="all">All Years</option>
          {years.map((y) => <option key={y} value={y}>{y}</option>)}
        </select>
        <select value={deptFilter} onChange={(e) => setDeptFilter(e.target.value)} className="px-4 py-2.5 rounded-lg border border-input bg-card text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring">
          <option value="all">All Departments</option>
          {departments.map((d) => <option key={d} value={d}>{d}</option>)}
        </select>
      </div>

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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="bg-card rounded-xl border border-border p-6">
          <h2 className="font-display text-lg font-bold text-foreground mb-4">Monthly Collections</h2>
          {monthlyData.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} />
                <YAxis tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} tickFormatter={(v) => `GHS ${(v / 1000).toFixed(0)}k`} />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} formatter={(v: number) => [`GHS ${v.toLocaleString()}`, ""]} />
                <Bar dataKey="collected" fill="hsl(var(--secondary))" radius={[6, 6, 0, 0]} name="Collected" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-16">No data for selected filters</p>
          )}
        </div>

        <div className="bg-card rounded-xl border border-border p-6">
          <h2 className="font-display text-lg font-bold text-foreground mb-4">Compliance by Programme</h2>
          {complianceByProg.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={complianceByProg} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} />
                <YAxis dataKey="program" type="category" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} width={120} />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} formatter={(v: number) => [`${v}%`, "Rate"]} />
                <Bar dataKey="rate" fill="hsl(var(--primary))" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-16">No data for selected filters</p>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default FeeAnalytics;
