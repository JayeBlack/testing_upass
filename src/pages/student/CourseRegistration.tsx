import DashboardLayout from "@/components/DashboardLayout";
import { BookOpen, CheckCircle, Lock, Building2, CalendarDays, GraduationCap, Save, Loader2 } from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import { PROGRAMME_COURSE_CATALOGS, type ProgrammeCourse, getCanonicalDepartment } from "@/data/programmeCourses";
import { useAuth } from "@/contexts/AuthContext";
import { apiFetch } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

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
  type: c.category === "elective" ? "elective" : "core",
  registered: c.category !== "elective",
});

const matchesProgramme = (catalogLabel: string, studentProg: string) => {
  const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
  const nc = norm(catalogLabel), ns = norm(studentProg);
  if (nc === ns || nc.includes(ns) || ns.includes(nc)) return true;
  const stopWords = new Set(["msc", "mphil", "phd", "mba", "pgd", "july", "january", "and", "the", "of"]);
  const words = (s: string) => s.toLowerCase().split(/[\s/()—.]+/).filter(w => w.length > 2 && !stopWords.has(w));
  const cw = words(catalogLabel), sw = words(studentProg);
  return sw.filter(w => cw.some(c => c.includes(w) || w.includes(c))).length >= Math.ceil(sw.length * 0.5);
};

const CourseRegistration = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [studentId, setStudentId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [registeredCodes, setRegisteredCodes] = useState<Set<string>>(new Set());
  const [electiveOverrides, setElectiveOverrides] = useState<Record<string, boolean>>({});

  const studentDepartment = user?.department;
  const studentProgram = user?.program;
  const studentCohort = user?.admissionCycle || "January";

  const catalog = useMemo(() => {
    if (!studentDepartment || !studentProgram) return undefined;
    const canonicalDept = getCanonicalDepartment(studentDepartment);

    const deptMatch = (c: typeof PROGRAMME_COURSE_CATALOGS[0]) =>
      c.department === studentDepartment ||
      (canonicalDept && (c.department === canonicalDept || getCanonicalDepartment(c.department) === canonicalDept));

    return (
      PROGRAMME_COURSE_CATALOGS.find(c => deptMatch(c) && c.label === studentProgram && (c.admissionCycle ?? "January") === studentCohort) ||
      PROGRAMME_COURSE_CATALOGS.find(c => deptMatch(c) && matchesProgramme(c.label, studentProgram) && (c.admissionCycle ?? "January") === studentCohort) ||
      PROGRAMME_COURSE_CATALOGS.find(c => deptMatch(c) && matchesProgramme(c.label, studentProgram)) ||
      PROGRAMME_COURSE_CATALOGS.find(c => deptMatch(c))
    );
  }, [studentDepartment, studentProgram, studentCohort]);

  // Load student ID and existing registrations from DB
  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const studentRes = await apiFetch<{ id: number }>(`/students/by-user/${user.id}`);
        if (cancelled || !studentRes?.id) return;
        setStudentId(studentRes.id);
        const registrations = await apiFetch<any[]>(`/courses/student/${studentRes.id}`);
        if (cancelled) return;
        setRegisteredCodes(new Set((registrations || []).map((r: any) => r.code)));
      } catch (err) {
        console.error("Failed to load student data:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [user?.id]);

  const courses: Course[] = useMemo(() => {
    if (!catalog) return [];
    return catalog.courses.map(c => {
      const base = toCourse(c);
      if (base.type === "elective") {
        // Use override if set, otherwise fall back to DB registration state
        return {
          ...base,
          registered: electiveOverrides[c.code] !== undefined
            ? electiveOverrides[c.code]
            : registeredCodes.has(c.code),
        };
      }
      return { ...base, registered: true };
    });
  }, [catalog, registeredCodes, electiveOverrides]);

  const toggle = (code: string) => {
    setElectiveOverrides(prev => {
      const current = prev[code] !== undefined ? prev[code] : registeredCodes.has(code);
      return { ...prev, [code]: !current };
    });
  };

  const saveCourses = async () => {
    if (!studentId) {
      toast({ title: "Error", description: "Student ID not found", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const electivesToSave = courses.filter(c => c.type === "elective" && c.registered);
      const electivesToDrop = courses.filter(c => c.type === "elective" && !c.registered);

      // Register selected electives
      await Promise.all(electivesToSave.map(course =>
        apiFetch("/courses/register", {
          method: "POST",
          body: JSON.stringify({
            student_id: studentId,
            course_code: course.code,
            course_name: course.name,
            credits: course.credits,
            course_type: course.type,
            semester: 1,
            academic_year: "2025/2026",
          }),
        }).catch(err => {
          if (!err.message?.includes("Already registered")) throw err;
        })
      ));

      // Drop de-selected electives
      if (electivesToDrop.length > 0) {
        const allRegs = await apiFetch<any[]>(`/courses/student/${studentId}`);
        const dropCodes = new Set(electivesToDrop.map(c => c.code));
        await Promise.all(
          (allRegs || [])
            .filter((r: any) => dropCodes.has(r.code))
            .map((r: any) => apiFetch(`/courses/register/${r.id}`, { method: "DELETE" }).catch(() => {}))
        );
      }

      // Sync state from DB
      const updated = await apiFetch<any[]>(`/courses/student/${studentId}`);
      const newCodes = new Set((updated || []).map((r: any) => r.code));
      setRegisteredCodes(newCodes);
      setElectiveOverrides({});

      toast({ title: "Success", description: "Course registration saved successfully" });
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Failed to save courses", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const coreCourses = courses.filter(c => c.type === "core");
  const electiveCourses = courses.filter(c => c.type === "elective");
  const totalCredits = courses.filter(c => c.registered).reduce((s, c) => s + c.credits, 0);
  const registeredCount = courses.filter(c => c.registered).length;

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
          {items.map(c => (
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
      {items.map(c => (
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

  // ── Render states ──────────────────────────────────────────────────────────

  if (!studentDepartment || !studentProgram) {
    return (
      <DashboardLayout>
        <div className="mb-8">
          <h1 className="text-3xl font-bold font-display text-foreground">Course Registration</h1>
          <p className="text-muted-foreground mt-1">Semester 1, 2025/2026 Academic Year</p>
        </div>
        <div className="bg-card rounded-xl border border-border p-8 text-center">
          <Loader2 size={24} className="animate-spin mx-auto text-muted-foreground mb-3" />
          <p className="text-muted-foreground mb-2">Loading your programme information...</p>
          <p className="text-xs text-muted-foreground">
            {!studentDepartment && !studentProgram
              ? "Your programme information is missing. Please contact your administrator."
              : "If this persists, try logging out and logging in again."}
          </p>
        </div>
      </DashboardLayout>
    );
  }

  if (!loading && !catalog) {
    return (
      <DashboardLayout>
        <div className="mb-8">
          <h1 className="text-3xl font-bold font-display text-foreground">Course Registration</h1>
          <p className="text-muted-foreground mt-1">Semester 1, 2025/2026 Academic Year</p>
        </div>
        <div className="bg-card rounded-xl border border-destructive p-8">
          <p className="text-destructive font-medium mb-2 text-center">Course catalog not found</p>
          <div className="text-left bg-muted p-4 rounded-lg mb-4">
            <p className="text-sm font-semibold mb-2">Your Programme Information:</p>
            <p className="text-sm mb-1">Programme: <strong>{studentProgram}</strong></p>
            <p className="text-sm mb-1">Department: <strong>{studentDepartment}</strong></p>
            <p className="text-sm mb-3">Cohort: <strong>{studentCohort}</strong></p>
            <p className="text-xs text-muted-foreground mt-3 pt-3 border-t border-border">Available Departments:</p>
            <ul className="text-xs text-muted-foreground list-disc list-inside mt-1">
              {[...new Set(PROGRAMME_COURSE_CATALOGS.map(c => c.department))].sort().map(dept => (
                <li key={dept}>{dept}</li>
              ))}
            </ul>
          </div>
          <p className="text-xs text-muted-foreground text-center">Please contact your department administrator to verify your programme information.</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="mb-8">
        <h1 className="text-3xl font-bold font-display text-foreground">Course Registration</h1>
        <p className="text-muted-foreground mt-1">Semester 1, 2025/2026 Academic Year</p>
      </div>

      {/* Enrolled Programme Info */}
      <div className="mb-6 bg-card rounded-xl border border-border p-4 sm:p-5">
        <div className="flex items-center gap-2 mb-3">
          <GraduationCap size={16} className="text-muted-foreground" />
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Your Enrolled Programme</h3>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="bg-muted/30 rounded-lg p-3">
            <label className="text-xs text-muted-foreground mb-1 block">Department</label>
            <p className="text-sm font-medium text-foreground">{studentDepartment}</p>
          </div>
          <div className="bg-muted/30 rounded-lg p-3">
            <label className="text-xs text-muted-foreground mb-1 block">Programme</label>
            <p className="text-sm font-medium text-foreground">{studentProgram}</p>
          </div>
          <div className="bg-muted/30 rounded-lg p-3">
            <label className="text-xs text-muted-foreground mb-1 block">Admission Cohort</label>
            <p className="text-sm font-medium text-foreground">{studentCohort}</p>
          </div>
        </div>
        {catalog && (
          <div className="mt-4 rounded-lg border border-border bg-muted/30 p-3">
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-primary/10 text-primary">
                <Building2 size={11} /> {catalog.department}
              </span>
              {catalog.admissionCycle && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold gradient-gold text-secondary-foreground">
                  <CalendarDays size={11} /> {catalog.admissionCycle} intake
                </span>
              )}
              {catalog.levels?.map(lvl => (
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
        )}
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
        {loading ? (
          <div className="bg-card rounded-xl border border-border p-8 text-center">
            <Loader2 size={24} className="animate-spin mx-auto text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">Loading courses...</p>
          </div>
        ) : (
          <>
            {renderDesktopTable(coreCourses, true)}
            {renderMobileCards(coreCourses, true)}
          </>
        )}
      </div>

      {/* Elective Courses */}
      {electiveCourses.length > 0 && (
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <BookOpen size={16} className="text-muted-foreground" />
            <h2 className="font-display text-lg font-bold text-foreground">Elective Courses</h2>
            <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">Choose freely</span>
          </div>
          <p className="text-sm text-muted-foreground mb-4">Select any additional courses you'd like to take this semester.</p>
          {loading ? (
            <div className="bg-card rounded-xl border border-border p-8 text-center">
              <Loader2 size={24} className="animate-spin mx-auto text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">Loading courses...</p>
            </div>
          ) : (
            <>
              {renderDesktopTable(electiveCourses, false)}
              {renderMobileCards(electiveCourses, false)}
            </>
          )}
        </div>
      )}

      {/* Save Button */}
      <div className="flex justify-end">
        <button
          onClick={saveCourses}
          disabled={saving || loading}
          className="inline-flex items-center gap-2 px-6 py-3 rounded-lg gradient-gold text-secondary-foreground font-medium hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? (
            <><Loader2 size={16} className="animate-spin" /> Saving...</>
          ) : (
            <><Save size={16} /> Save Registration</>
          )}
        </button>
      </div>
    </DashboardLayout>
  );
};

export default CourseRegistration;
