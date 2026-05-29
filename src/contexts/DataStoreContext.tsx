import React, { createContext, useContext, useState, useCallback } from "react";

export interface Student {
  id: string;
  name: string;
  index: string;
  email: string;
  program: string;
  department: string;
  status: "Active" | "Inactive";
}

export interface Graduand {
  name: string;
  index: string;
  program: string;
  department: string;
  cwa: number;
  year: string;
  status: string;
}

export type SystemRole =
  | "Student"
  | "Supervisor"
  | "Admin"
  | "Dean"
  | "ViceDean"
  | "Registrar"
  | "AdminAssistant"
  | "Accountant"
  | "AccountingAssistant"
  | "ExamsOfficer";

export interface Supervisor {
  id: string;
  staffId: string;
  name: string;
  email: string;
  title: string;
  department: string;
  specialization?: string;
  isActive: boolean;
}

export interface SystemUser {
  id: string;
  name: string;
  email: string;
  role: SystemRole;
  department?: string;
  phone?: string;
  isActive: boolean;
  isSuperAdmin?: boolean;
  createdAt: string;
}

export interface Assignment {
  id: string;
  studentId: string;
  supervisorId: string;
  isPrimary: boolean;
  assignedAt: string;
}

interface DataStoreContextType {
  students: Student[];
  graduands: Graduand[];
  supervisors: Supervisor[];
  systemUsers: SystemUser[];
  assignments: Assignment[];
  addStudent: (s: Student) => void;
  addStudents: (s: Student[]) => void;
  removeStudent: (id: string) => void;
  addGraduands: (g: Graduand[]) => void;
  addSupervisor: (s: Supervisor) => void;
  toggleSupervisorActive: (id: string) => void;
  addSystemUser: (u: SystemUser) => void;
  toggleSystemUserActive: (id: string) => void;
  removeSystemUser: (id: string) => void;
  assignSupervisor: (studentId: string, supervisorId: string, isPrimary?: boolean) => void;
  unassignSupervisor: (assignmentId: string) => void;
}

const initialStudents: Student[] = [
  { id: "1", name: "Kwame Mensah", index: "UMaT/PG/0234/22", email: "kwame.mensah@umat.edu.gh", program: "MSc. IT", department: "Computer Science", status: "Active" },
  { id: "2", name: "Ama Serwaa", index: "UMaT/PG/0198/22", email: "ama.serwaa@umat.edu.gh", program: "MSc. IT", department: "Computer Science", status: "Active" },
  { id: "3", name: "Yaw Boateng", index: "UMaT/PG/0312/22", email: "yaw.boateng@umat.edu.gh", program: "MPhil CS", department: "Computer Science", status: "Active" },
  { id: "4", name: "Efua Dankwah", index: "UMaT/PG/0287/22", email: "efua.dankwah@umat.edu.gh", program: "MSc. IT", department: "Computer Science", status: "Inactive" },
  { id: "5", name: "Kofi Adjei", index: "UMaT/PG/0345/22", email: "kofi.adjei@umat.edu.gh", program: "MPhil CS", department: "Computer Science", status: "Active" },
  { id: "6", name: "Abena Owusu", index: "UMaT/PG/0401/23", email: "abena.owusu@umat.edu.gh", program: "MSc. Mining Eng", department: "Mining Engineering", status: "Active" },
  { id: "7", name: "Esi Appiah", index: "UMaT/PG/0145/21", email: "esi.appiah@umat.edu.gh", program: "MSc. Electrical Eng", department: "Electrical Engineering", status: "Active" },
  { id: "8", name: "Nana Agyei", index: "UMaT/PG/0420/23", email: "nana.agyei@umat.edu.gh", program: "MSc. Mechanical Eng", department: "Mechanical Engineering", status: "Active" },
];

const initialGraduands: Graduand[] = [
  { name: "Akua Mensah", index: "UMaT/PG/0112/21", program: "MSc. IT", department: "Computer Science", cwa: 72.5, year: "2025", status: "Eligible" },
  { name: "Kofi Darko", index: "UMaT/PG/0089/21", program: "MPhil CS", department: "Computer Science", cwa: 78.4, year: "2025", status: "Eligible" },
  { name: "Esi Appiah", index: "UMaT/PG/0145/21", program: "MSc. Mining Eng", department: "Mining Engineering", cwa: 68.3, year: "2025", status: "Eligible" },
  { name: "Yaw Frimpong", index: "UMaT/PG/0178/21", program: "MSc. IT", department: "Computer Science", cwa: 48.9, year: "2025", status: "Ineligible" },
  { name: "Abena Kyei", index: "UMaT/PG/0201/21", program: "MPhil CS", department: "Computer Science", cwa: 74.1, year: "2025", status: "Eligible" },
  { name: "Nana Agyei", index: "UMaT/PG/0420/23", program: "MSc. Mechanical Eng", department: "Mechanical Engineering", cwa: 71.2, year: "2024", status: "Eligible" },
  { name: "Ama Boateng", index: "UMaT/PG/0333/22", program: "MSc. Electrical Eng", department: "Electrical Engineering", cwa: 65.8, year: "2024", status: "Eligible" },
];

const initialSupervisors: Supervisor[] = [
  { id: "sv1", staffId: "UMaT/ST/001", name: "Dr. Abena Osei", email: "abena.osei@umat.edu.gh", title: "Dr.", department: "Computer Science", specialization: "Machine Learning", isActive: true },
  { id: "sv2", staffId: "UMaT/ST/002", name: "Prof. Kwabena Owusu", email: "k.owusu@umat.edu.gh", title: "Prof.", department: "Computer Science", specialization: "Distributed Systems", isActive: true },
  { id: "sv3", staffId: "UMaT/ST/003", name: "Dr. Yaa Asantewaa", email: "y.asantewaa@umat.edu.gh", title: "Dr.", department: "Mining Engineering", specialization: "Mine Safety", isActive: true },
  { id: "sv4", staffId: "UMaT/ST/004", name: "Dr. Emmanuel Tetteh", email: "e.tetteh@umat.edu.gh", title: "Dr.", department: "Electrical Engineering", specialization: "Power Systems", isActive: true },
];

const initialSystemUsers: SystemUser[] = [
  { id: "u-sa1", name: "Prof. Nana Kwaku", email: "superadmin@umat.edu.gh", role: "Admin", isSuperAdmin: true, isActive: true, createdAt: "2026-01-10" },
  { id: "u-acs", name: "Prof. Kofi Asante", email: "admin.cs@umat.edu.gh", role: "Admin", department: "Computer Science", isActive: true, createdAt: "2026-01-12" },
  { id: "u-amin", name: "Dr. Kwesi Mensah", email: "admin.mining@umat.edu.gh", role: "Admin", department: "Mining Engineering", isActive: true, createdAt: "2026-01-12" },
  { id: "u-d1", name: "Assoc Prof Solomon Nunoo", email: "dean@umat.edu.gh", role: "Dean", department: "School of Postgraduate Studies", isActive: true, createdAt: "2026-01-15" },
  { id: "u-acc1", name: "Mr Thomas Kwame Nkrumah", email: "accountant@umat.edu.gh", role: "Accountant", department: "Finance Office", isActive: true, createdAt: "2026-01-15" },
  { id: "u-eo1", name: "Mrs. Akosua Mensah", email: "exams@umat.edu.gh", role: "ExamsOfficer", department: "School of Postgraduate Studies", isActive: true, createdAt: "2026-01-15" },
];

const initialAssignments: Assignment[] = [
  { id: "as1", studentId: "1", supervisorId: "sv1", isPrimary: true, assignedAt: "2026-02-01" },
  { id: "as2", studentId: "2", supervisorId: "sv2", isPrimary: true, assignedAt: "2026-02-01" },
  { id: "as3", studentId: "3", supervisorId: "sv1", isPrimary: true, assignedAt: "2026-02-03" },
];

const DataStoreContext = createContext<DataStoreContextType | undefined>(undefined);

export const DataStoreProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [students, setStudents] = useState<Student[]>(initialStudents);
  const [graduands, setGraduands] = useState<Graduand[]>(initialGraduands);
  const [supervisors, setSupervisors] = useState<Supervisor[]>(initialSupervisors);
  const [systemUsers, setSystemUsers] = useState<SystemUser[]>(initialSystemUsers);
  const [assignments, setAssignments] = useState<Assignment[]>(initialAssignments);

  const addStudent = useCallback((s: Student) => {
    setStudents((prev) => [s, ...prev]);
  }, []);

  const addStudents = useCallback((newStudents: Student[]) => {
    setStudents((prev) => [...newStudents, ...prev]);
  }, []);

  const removeStudent = useCallback((id: string) => {
    setStudents((prev) => prev.filter((s) => s.id !== id));
  }, []);

  const addGraduands = useCallback((items: Graduand[]) => {
    setGraduands((prev) => [...items, ...prev]);
  }, []);

  const addSupervisor = useCallback((s: Supervisor) => {
    setSupervisors((prev) => [s, ...prev]);
  }, []);

  const toggleSupervisorActive = useCallback((id: string) => {
    setSupervisors((prev) => prev.map((s) => (s.id === id ? { ...s, isActive: !s.isActive } : s)));
  }, []);

  const addSystemUser = useCallback((u: SystemUser) => {
    setSystemUsers((prev) => [u, ...prev]);
  }, []);

  const toggleSystemUserActive = useCallback((id: string) => {
    setSystemUsers((prev) => prev.map((u) => (u.id === id ? { ...u, isActive: !u.isActive } : u)));
  }, []);

  const removeSystemUser = useCallback((id: string) => {
    setSystemUsers((prev) => prev.filter((u) => u.id !== id));
  }, []);

  const assignSupervisor = useCallback((studentId: string, supervisorId: string, isPrimary = false) => {
    setAssignments((prev) => {
      if (prev.some((a) => a.studentId === studentId && a.supervisorId === supervisorId)) return prev;
      const next: Assignment = {
        id: `as${Date.now()}`,
        studentId,
        supervisorId,
        isPrimary,
        assignedAt: new Date().toISOString().slice(0, 10),
      };
      return [next, ...prev];
    });
  }, []);

  const unassignSupervisor = useCallback((assignmentId: string) => {
    setAssignments((prev) => prev.filter((a) => a.id !== assignmentId));
  }, []);

  return (
    <DataStoreContext.Provider
      value={{
        students,
        graduands,
        supervisors,
        systemUsers,
        assignments,
        addStudent,
        addStudents,
        removeStudent,
        addGraduands,
        addSupervisor,
        toggleSupervisorActive,
        addSystemUser,
        toggleSystemUserActive,
        removeSystemUser,
        assignSupervisor,
        unassignSupervisor,
      }}
    >
      {children}
    </DataStoreContext.Provider>
  );
};

export const useDataStore = () => {
  const context = useContext(DataStoreContext);
  if (!context) throw new Error("useDataStore must be used within DataStoreProvider");
  return context;
};
