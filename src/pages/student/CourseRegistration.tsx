import DashboardLayout from "@/components/DashboardLayout";
import { BookOpen, CheckCircle, Lock, Building2, CalendarDays, GraduationCap, Save, Loader2 } from "lucide-react";
import { useMemo, useState, useEffect } from "react";
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
  // Treat both 'core' and 'mandatory' (seminars/research) as required for the student
  type: c.category === "elective" ? "elective" : "core",
  registered: c.category !== "elective",
});

const CourseRegistration = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [studentId, setStudentId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Get student's enrolled data from auth context
  const studentDepartment = user?.department;
  const studentProgram = user?.program;
  const studentCohort = user?.admissionCycle || "January";

  // If student data is not loaded, show loading or error state
  if (!studentDepartment || !studentProgram) {
    return (
      <DashboardLayout>
        <div className="mb-8">
          <h1 className="text-3xl font-bold font-display text-foreground">Course Registration</h1>
          <p className="text-muted-foreground mt-1">Semester 1, 2025/2026 Academic Year</p>
        </div>
        <div className="bg-card rounded-xl border border-border p-8 text-center">
          <p className="text-muted-foreground mb-4">Loading your programme information...</p>
          {user && (
            <div className="text-left bg-muted p-4 rounded-lg mb-4">
              <p className="text-xs font-mono mb-2">Debug Info:</p>
              <p className="text-xs">Email: {user.email}</p>
              <p className="text-xs">Role: {user.role}</p>
              <p className="text-xs">Department: {studentDepartment || "(not set)"}</p>
              <p className="text-xs">Programme: {studentProgram || "(not set)"}</p>
              <p className="text-xs">Cohort: {studentCohort}</p>
            </div>
          )}
          <p className="text-xs text-muted-foreground mt-2">
            {!studentDepartment && !studentProgram 
              ? "Your programme information is missing. Please contact your administrator to set up your profile."
              : "If this persists, try logging out and logging in again."}
          </p>
        </div>
      </DashboardLayout>
    );
  }

  // Helper function for fuzzy matching programme names
  const matchesProgramme = (catalogLabel: string, studentProg: string) => {
    const normalizeName = (name: string) => name.toLowerCase().replace(/[^a-z0-9]/g, '');
    const normalizedCatalog = normalizeName(catalogLabel);
    const normalizedStudent = normalizeName(studentProg);
    
    // Exact match
    if (normalizedCatalog === normalizedStudent) return true;
    
    // Check if catalog contains student program
    if (normalizedCatalog.includes(normalizedStudent)) return true;
    
    // Check if student program contains catalog
    if (normalizedStudent.includes(normalizedCatalog)) return true;
    
    // Extract key words and check overlap
    const catalogWords = catalogLabel.toLowerCase().split(/[\s/()—.]+/).filter(w => w.length > 2 && !['msc', 'mphil', 'phd', 'mba', 'pgd', 'july', 'january', 'and', 'the', 'of'].includes(w));
    const studentWords = studentProg.toLowerCase().split(/[\s/()—.]+/).filter(w => w.length > 2 && !['msc', 'mphil', 'phd', 'mba', 'pgd', 'july', 'january', 'and', 'the', 'of'].includes(w));
    
    // If at least 50% of student words appear in catalog words (lowered threshold)
    const matchingWords = studentWords.filter(sw => catalogWords.some(cw => cw.includes(sw) || sw.includes(cw)));
    return matchingWords.length >= Math.ceil(studentWords.length * 0.5);
  };

  // Find the catalog entry that matches the student's enrollment
  const catalog = useMemo(() => {
    console.log('🔍 Searching for catalog...');
    console.log('Student Department:', studentDepartment);
    console.log('Student Program:', studentProgram);
    console.log('Student Cohort:', studentCohort);

    // Get canonical department name to handle variations
    const canonicalDept = getCanonicalDepartment(studentDepartment || '');
    console.log('Canonical Department:', canonicalDept || 'None found');

    // Try exact match first (department + program + cohort)
    let match = PROGRAMME_COURSE_CATALOGS.find(
      (c) => 
        (c.department === studentDepartment || 
         (canonicalDept && (c.department === canonicalDept || getCanonicalDepartment(c.department) === canonicalDept))) && 
        c.label === studentProgram &&
        (c.admissionCycle ?? "January") === studentCohort
    );
    if (match) {
      console.log('✅ Found exact match:', match.label);
      return match;
    }

    // Try fuzzy match with department (canonical or exact) + cohort
    match = PROGRAMME_COURSE_CATALOGS.find(
      (c) => 
        (c.department === studentDepartment || 
         (canonicalDept && (c.department === canonicalDept || getCanonicalDepartment(c.department) === canonicalDept))) && 
        matchesProgramme(c.label, studentProgram) &&
        (c.admissionCycle ?? "January") === studentCohort
    );
    if (match) {
      console.log('✅ Found fuzzy match with cohort:', match.label);
      return match;
    }

    // Try fuzzy match without cohort (for programs without cohort-specific catalogs)
    match = PROGRAMME_COURSE_CATALOGS.find(
      (c) => 
        (c.department === studentDepartment || 
         (canonicalDept && (c.department === canonicalDept || getCanonicalDepartment(c.department) === canonicalDept))) && 
        matchesProgramme(c.label, studentProgram)
    );
    if (match) {
      console.log('✅ Found fuzzy match without cohort:', match.label);
      return match;
    }

    // Last resort: match by canonical department only
    if (canonicalDept) {
      const deptMatch = PROGRAMME_COURSE_CATALOGS.find(c => 
        c.department === canonicalDept || getCanonicalDepartment(c.department) === canonicalDept
      );
      if (deptMatch) {
        console.log('⚠️ Using canonical department fallback:', deptMatch.label);
        return deptMatch;
      }
    }
    
    // Final fallback: exact department match
    const deptMatch = PROGRAMME_COURSE_CATALOGS.find(c => c.department === studentDepartment);
    if (deptMatch) {
      console.log('⚠️ Using department fallback:', deptMatch.label);
    } else {
      console.log('❌ No catalog found');
      console.log('Available departments:', [...new Set(PROGRAMME_COURSE_CATALOGS.map(c => c.department))]);
    }
    return deptMatch;
  }, [studentDepartment, studentProgram, studentCohort]);

  // If no catalog found, show error message
  if (!catalog) {
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
            <p className="text-sm mb-3">Cohort: <strong>{studentCohort || "January"}</strong></p>
            <p className="text-xs text-muted-foreground mt-3 pt-3 border-t border-border">Available Departments:</p>
            <ul className="text-xs text-muted-foreground list-disc list-inside mt-1">
              {[...new Set(PROGRAMME_COURSE_CATALOGS.map(c => c.department))].sort().map(dept => (
                <li key={dept}>{dept}</li>
              ))}
            </ul>
          </div>
          <p className="text-xs text-muted-foreground text-center">Please contact your department administrator to set up the course catalog for your programme, or verify your department/programme information is correct.</p>
        </div>
      </DashboardLayout>
    );
  }

  const [coursesByProgramme, setCoursesByProgramme] = useState<Record<string, Course[]>>(() =>
    Object.fromEntries(
      PROGRAMME_COURSE_CATALOGS.map((c) => [c.key, c.courses.map(toCourse)])
    )
  );
  const courses = coursesByProgramme[catalog.key];

  // Load student ID and existing registrations
  useEffect(() => {
    const loadStudentData = async () => {
      if (!user?.id) return;
      try {
        setLoading(true);
        const studentRes = await apiFetch<{ id: number }>(`/students/by-user/${user.id}`);
        if (studentRes?.id) {
          setStudentId(studentRes.id);
          const registrations = await apiFetch<any[]>(`/courses/student/${studentRes.id}`);
          const registeredCodes = new Set((registrations || []).map((r: any) => r.code));
          // Mark a course registered if: it's in the DB OR it's core/mandatory
          setCoursesByProgramme((prev) => {
            const updated = { ...prev };
            for (const key in updated) {
              updated[key] = updated[key].map((c) => ({
                ...c,
                registered: c.type === "core" || registeredCodes.has(c.code),
              }));
            }
            return updated;
          });
        }
      } catch (err) {
        console.error('Failed to load student data:', err);
      } finally {
        setLoading(false);
      }
    };
    loadStudentData();
  }, [user?.id, catalog.key]);

  const saveCourses = async () => {
    if (!studentId) {
      toast({ title: "Error", description: "Student ID not found", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      // Only save elective courses the student toggled on — core/mandatory are already in DB
      const electivesToSave = courses.filter(c => c.type === "elective" && c.registered);

      await Promise.all(electivesToSave.map(course =>
        apiFetch('/courses/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            student_id: studentId,
            course_code: course.code,
            course_name: course.name,
            credits: course.credits,
            course_type: course.type,
            semester: 1,
            academic_year: '2025/2026',
          }),
        }).catch(err => {
          if (!err.message?.includes('Already registered')) throw err;
        })
      ));

      // Drop electives the student de-selected
      const electivesToDrop = courses.filter(c => c.type === "elective" && !c.registered);
      if (electivesToDrop.length > 0) {
        const allRegs = await apiFetch<any[]>(`/courses/student/${studentId}`);
        const dropCodes = new Set(electivesToDrop.map(c => c.code));
        const toDrop = (allRegs || []).filter((r: any) => dropCodes.has(r.code));
        await Promise.all(toDrop.map((r: any) =>
          apiFetch(`/courses/register/${r.id}`, { method: 'DELETE' }).catch(() => {})
        ));
      }

      toast({ title: "Success", description: `Course registration saved successfully` });

      // Reload from DB to sync state
      const updated = await apiFetch<any[]>(`/courses/student/${studentId}`);
      const registeredCodes = new Set((updated || []).map((r: any) => r.code));
      setCoursesByProgramme((prev) => ({
        ...prev,
        [catalog.key]: prev[catalog.key].map((c) => ({
          ...c,
          registered: c.type === "core" || registeredCodes.has(c.code),
        })),
      }));
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Failed to save courses", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

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

      {/* Student's Enrolled Programme Info - Read Only */}
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
            <p className="text-sm font-medium text-foreground">{studentCohort || "January"}</p>
          </div>
        </div>

        {/* Programme details */}
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

      {/* Save Button */}
      <div className="flex justify-end">
        <button
          onClick={saveCourses}
          disabled={saving || loading}
          className="inline-flex items-center gap-2 px-6 py-3 rounded-lg gradient-gold text-secondary-foreground font-medium hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save size={16} />
              Save Registration
            </>
          )}
        </button>
      </div>
    </DashboardLayout>
  );
};

export default CourseRegistration;
