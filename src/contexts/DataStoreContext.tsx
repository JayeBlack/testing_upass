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

interface DataStoreContextType {
  students: Student[];
  graduands: Graduand[];
  addStudent: (s: Student) => void;
  addStudents: (s: Student[]) => void;
  removeStudent: (id: string) => void;
  addGraduands: (g: Graduand[]) => void;
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

const DataStoreContext = createContext<DataStoreContextType | undefined>(undefined);

export const DataStoreProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [students, setStudents] = useState<Student[]>(initialStudents);
  const [graduands, setGraduands] = useState<Graduand[]>(initialGraduands);

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

  return (
    <DataStoreContext.Provider value={{ students, graduands, addStudent, addStudents, removeStudent, addGraduands }}>
      {children}
    </DataStoreContext.Provider>
  );
};

export const useDataStore = () => {
  const context = useContext(DataStoreContext);
  if (!context) throw new Error("useDataStore must be used within DataStoreProvider");
  return context;
};
