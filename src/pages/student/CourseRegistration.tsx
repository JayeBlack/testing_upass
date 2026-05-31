import DashboardLayout from "@/components/DashboardLayout";
import { BookOpen, CheckCircle, Lock, Building2, CalendarDays, GraduationCap } from "lucide-react";
import { useMemo, useState } from "react";
import { PROGRAMME_COURSE_CATALOGS, type ProgrammeCourse } from "@/data/programmeCourses";

interface Course {
  code: string;
  name: string;
  credits: number;
  type: "core" | "elective";
  registered: boolean;
}

const toCourse = (c: ProgrammeCourse): Course => ({
  code: c.code,
  name: c.name,
  credits: c.credits,
  // Treat both 'core' and 'mandatory' (seminars/research) as required for the student
  type: c.category === "elective" ? "elective" : "core",
  registered: c.category !== "elective",
});

const CourseRegistration = () => {
  // Filters
  const [cycleFilter, setCycleFilter] = useState<"All" | "January" | "July">("All");
  const matchesCycle = (c: (typeof PROGRAMME_COURSE_CATALOGS)[number]) =>
    cycleFilter === "All" || (c.admissionCycle ?? "January") === cycleFilter;

  // Only surface departments that actually have programmes in the active cycle
  const departments = useMemo(
    () =>
      Array.from(
        new Set(PROGRAMME_COURSE_CATALOGS.filter(matchesCycle).map((c) => c.department))
      ).sort(),
    [cycleFilter]
  );

  const [department, setDepartment] = useState<string>(
    () =>
      Array.from(new Set(PROGRAMME_COURSE_CATALOGS.map((c) => c.department))).sort()[0]
  );
  const effectiveDepartment = departments.includes(department)
    ? department
    : departments[0];

  const programmesInDept = useMemo(
    () =>
      PROGRAMME_COURSE_CATALOGS.filter(
        (c) => c.department === effectiveDepartment && matchesCycle(c)
      ),
    [effectiveDepartment, cycleFilter]
  );

  const [programmeKey, setProgrammeKey] = useState<string>(
    PROGRAMME_COURSE_CATALOGS[0].key
  );

  const effectiveProgrammeKey =
    programmesInDept.find((c) => c.key === programmeKey)?.key ??
    programmesInDept[0]?.key ??
    PROGRAMME_COURSE_CATALOGS[0].key;

  const catalog =
    PROGRAMME_COURSE_CATALOGS.find((c) => c.key === effectiveProgrammeKey) ??
    PROGRAMME_COURSE_CATALOGS[0];

  const handleCycleChange = (c: "All" | "January" | "July") => {
    setCycleFilter(c);
    const nextDepts = Array.from(
      new Set(
        PROGRAMME_COURSE_CATALOGS.filter(
          (p) => c === "All" || (p.admissionCycle ?? "January") === c
        ).map((p) => p.department)
      )
    ).sort();
    const nextDept = nextDepts.includes(department) ? department : nextDepts[0];
    setDepartment(nextDept);
    const firstProg = PROGRAMME_COURSE_CATALOGS.find(
      (p) =>
        p.department === nextDept &&
        (c === "All" || (p.admissionCycle ?? "January") === c)
    );
    if (firstProg) setProgrammeKey(firstProg.key);
  };

  const [coursesByProgramme, setCoursesByProgramme] = useState<Record<string, Course[]>>(() =>
    Object.fromEntries(
      PROGRAMME_COURSE_CATALOGS.map((c) => [c.key, c.courses.map(toCourse)])
    )
  );
  const courses = coursesByProgramme[catalog.key];

  const toggle = (code: string) => {
    setCoursesByProgramme((prev) => ({
      ...prev,
      [catalog.key]: prev[catalog.key].map((c) => {
        if (c.code !== code || c.type === "core") return c;
        return { ...c, registered: !c.registered };
      }),
    }));
  };

  const coreCourses = courses.filter((c) => c.type === "core");
  const electiveCourses = courses.filter((c) => c.type === "elective");
  const totalCredits = courses.filter((c) => c.registered).reduce((s, c) => s + c.credits, 0);
  const registeredCount = courses.filter((c) => c.registered).length;

  const renderDesktopTable = (items: Course[], showLock: boolean) => (
    <div className="hidden md:block bg-card rounded-xl border border-border overflow-hidden">
      <table className="w-full">
        <thead>
          <tr className="border-b border-border">
            <th className="text-left px-6 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Code</th>
            <th className="text-left px-6 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Course Name</th>
            <th className="text-left px-6 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Credits</th>
            <th className="text-right px-6 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Action</th>
          </tr>
        </thead>
        <tbody>
          {items.map((c) => (
            <tr key={c.code} className="border-b border-border last:border-0 hover:bg-muted/50 transition-colors">
              <td className="px-6 py-4 text-sm font-mono font-medium text-foreground">{c.code}</td>
              <td className="px-6 py-4 text-sm text-foreground">{c.name}</td>
              <td className="px-6 py-4 text-sm text-muted-foreground">{c.credits}</td>
              <td className="px-6 py-4 text-right">
                {showLock ? (
                  <span className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-medium gradient-gold text-secondary-foreground">
                    <Lock size={12} /> Required
                  </span>
                ) : (
                  <button
                    onClick={() => toggle(c.code)}
                    className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      c.registered
                        ? "gradient-gold text-secondary-foreground"
                        : "border border-border text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    {c.registered ? "Registered" : "Register"}
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  const renderMobileCards = (items: Course[], showLock: boolean) => (
    <div className="md:hidden space-y-3">
      {items.map((c) => (
        <div key={c.code} className="bg-card rounded-xl border border-border p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-mono font-medium text-foreground">{c.code}</p>
              <p className="text-sm text-foreground mt-1">{c.name}</p>
              <p className="text-xs text-muted-foreground mt-1">{c.credits} credits</p>
            </div>
            {showLock ? (
              <span className="shrink-0 inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-medium gradient-gold text-secondary-foreground">
                <Lock size={12} /> Required
              </span>
            ) : (
              <button
                onClick={() => toggle(c.code)}
                className={`shrink-0 px-4 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  c.registered
                    ? "gradient-gold text-secondary-foreground"
                    : "border border-border text-muted-foreground hover:bg-muted"
                }`}
              >
                {c.registered ? "Registered" : "Register"}
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <DashboardLayout>
      <div className="mb-8">
        <h1 className="text-3xl font-bold font-display text-foreground">Course Registration</h1>
        <p className="text-muted-foreground mt-1">Semester 1, 2025/2026 Academic Year</p>
      </div>

      {/* Programme picker — Department → Cycle → Programme */}
      <div className="mb-6 bg-card rounded-xl border border-border p-4 sm:p-5 space-y-4">
        {/* Admission cycle chips */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <CalendarDays size={14} className="text-muted-foreground" />
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Admission Cycle</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {(["All", "January", "July"] as const).map((c) => (
              <button
                key={c}
                onClick={() => handleCycleChange(c)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all border ${
                  cycleFilter === c
                    ? "gradient-gold text-secondary-foreground border-transparent"
                    : "bg-background border-border text-muted-foreground hover:bg-muted"
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {/* Department */}
          <div>
            <label htmlFor="department-select" className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              <Building2 size={14} /> Department
            </label>
            <select
              id="department-select"
              value={effectiveDepartment}
              onChange={(e) => {
                setDepartment(e.target.value);
                const firstInDept = PROGRAMME_COURSE_CATALOGS.find(
                  (c) =>
                    c.department === e.target.value &&
                    (cycleFilter === "All" || (c.admissionCycle ?? "January") === cycleFilter)
                );
                if (firstInDept) setProgrammeKey(firstInDept.key);
              }}
              className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            >
              {departments.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>

          {/* Programme */}
          <div>
            <label htmlFor="programme-select" className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              <GraduationCap size={14} /> Programme
            </label>
            <select
              id="programme-select"
              value={effectiveProgrammeKey}
              onChange={(e) => setProgrammeKey(e.target.value)}
              disabled={programmesInDept.length === 0}
              className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
            >
              {programmesInDept.length === 0 ? (
                <option>No programmes for this cycle</option>
              ) : (
                programmesInDept.map((c) => (
                  <option key={c.key} value={c.key}>{c.label}</option>
                ))
              )}
            </select>
          </div>
        </div>

        {/* Selected programme summary */}
        <div className="rounded-lg border border-border bg-muted/30 p-3 sm:p-4">
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-primary/10 text-primary">
              <Building2 size={11} /> {catalog.department}
            </span>
            {catalog.admissionCycle && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold gradient-gold text-secondary-foreground">
                <CalendarDays size={11} /> {catalog.admissionCycle} intake
              </span>
            )}
            {catalog.levels?.map((lvl) => (
              <span key={lvl} className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-medium border border-border text-muted-foreground">
                {lvl}
              </span>
            ))}
          </div>
          <p className="text-sm font-semibold text-foreground">{catalog.label}</p>
          {catalog.notes && catalog.notes.length > 0 && (
            <ul className="mt-2 text-xs text-muted-foreground list-disc list-inside space-y-1">
              {catalog.notes.map((n, i) => <li key={i}>{n}</li>)}
            </ul>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 sm:gap-4 mb-6">
        <div className="bg-card rounded-xl border border-border px-5 py-3 flex items-center gap-3">
          <BookOpen size={18} className="text-muted-foreground" />
          <span className="text-sm"><strong className="text-foreground">{totalCredits}</strong> <span className="text-muted-foreground">credit hours</span></span>
        </div>
        <div className="bg-card rounded-xl border border-border px-5 py-3 flex items-center gap-3">
          <CheckCircle size={18} className="text-muted-foreground" />
          <span className="text-sm"><strong className="text-foreground">{registeredCount}</strong> <span className="text-muted-foreground">courses selected</span></span>
        </div>
      </div>

      {/* Core Courses */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-4">
          <Lock size={16} className="text-muted-foreground" />
          <h2 className="font-display text-lg font-bold text-foreground">Core Courses</h2>
          <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">Required</span>
        </div>
        <p className="text-sm text-muted-foreground mb-4">These courses are mandatory for your program and cannot be removed.</p>
        {renderDesktopTable(coreCourses, true)}
        {renderMobileCards(coreCourses, true)}
      </div>

      {/* Elective Courses */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <BookOpen size={16} className="text-muted-foreground" />
          <h2 className="font-display text-lg font-bold text-foreground">Elective Courses</h2>
          <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">Choose freely</span>
        </div>
        <p className="text-sm text-muted-foreground mb-4">Select any additional courses you'd like to take this semester.</p>
        {renderDesktopTable(electiveCourses, false)}
        {renderMobileCards(electiveCourses, false)}
      </div>
    </DashboardLayout>
  );
};

export default CourseRegistration;
