import React, { createContext, useContext, useState, useCallback } from "react";

export type UserRole =
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

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  department?: string;
  program?: string;
  indexNumber?: string;
  avatarUrl?: string;
  isSuperAdmin?: boolean;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Departmental admin accounts
const departmentalAdmins: Record<string, User> = {
  "admin.cs@umat.edu.gh": {
    id: "a-cs",
    email: "admin.cs@umat.edu.gh",
    name: "Prof. Kofi Asante",
    role: "Admin",
    department: "Computer Science",
    avatarUrl: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face",
  },
  "admin.mining@umat.edu.gh": {
    id: "a-mining",
    email: "admin.mining@umat.edu.gh",
    name: "Dr. Kwesi Mensah",
    role: "Admin",
    department: "Mining Engineering",
    avatarUrl: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&h=150&fit=crop&crop=face",
  },
  "admin.electrical@umat.edu.gh": {
    id: "a-elec",
    email: "admin.electrical@umat.edu.gh",
    name: "Dr. Ama Tetteh",
    role: "Admin",
    department: "Electrical Engineering",
    avatarUrl: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&h=150&fit=crop&crop=face",
  },
  "admin.mechanical@umat.edu.gh": {
    id: "a-mech",
    email: "admin.mechanical@umat.edu.gh",
    name: "Prof. Yaw Owusu",
    role: "Admin",
    department: "Mechanical Engineering",
    avatarUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face",
  },
};

const superAdminUser: User = {
  id: "sa1",
  email: "superadmin@umat.edu.gh",
  name: "Prof. Nana Kwaku",
  role: "Admin",
  department: undefined,
  isSuperAdmin: true,
  avatarUrl: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face",
};

const mockUsers: Record<string, User> = {
  Student: {
    id: "s1",
    email: "student@umat.edu.gh",
    name: "Kwame Mensah",
    role: "Student",
    department: "Computer Science",
    program: "MSc. Information Technology",
    indexNumber: "UMaT/PG/0234/22",
    avatarUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face",
  },
  Supervisor: {
    id: "sup1",
    email: "supervisor@umat.edu.gh",
    name: "Dr. Abena Osei",
    role: "Supervisor",
    department: "Computer Science",
    avatarUrl: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&h=150&fit=crop&crop=face",
  },
  Dean: {
    id: "d1",
    email: "dean@umat.edu.gh",
    name: "Assoc Prof Solomon Nunoo",
    role: "Dean",
    department: "School of Postgraduate Studies",
    avatarUrl: "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&h=150&fit=crop&crop=face",
  },
  Accountant: {
    id: "acc1",
    email: "accountant@umat.edu.gh",
    name: "Mr Thomas Kwame Nkrumah",
    role: "Accountant",
    department: "Finance Office",
    avatarUrl: "https://images.unsplash.com/photo-1560250097-0b93528c311a?w=150&h=150&fit=crop&crop=face",
  },
  ExamsOfficer: {
    id: "eo1",
    email: "exams@umat.edu.gh",
    name: "Mrs. Akosua Mensah",
    role: "ExamsOfficer",
    department: "School of Postgraduate Studies",
    avatarUrl: "https://images.unsplash.com/photo-1551836022-deb4988cc6c0?w=150&h=150&fit=crop&crop=face",
  },
  ViceDean: {
    id: "vd1",
    email: "vicedean@umat.edu.gh",
    name: "Assoc Prof Peter Ekow Baffoe",
    role: "ViceDean",
    department: "School of Postgraduate Studies",
    avatarUrl: "https://images.unsplash.com/photo-1560250097-0b93528c311a?w=150&h=150&fit=crop&crop=face",
  },
  Registrar: {
    id: "reg1",
    email: "registrar@umat.edu.gh",
    name: "Mr Francis Nyarko",
    role: "Registrar",
    department: "School of Postgraduate Studies",
    avatarUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face",
  },
  AssistantRegistrar: {
    id: "areg1",
    email: "asstregistrar@umat.edu.gh",
    name: "Mr Michael Fynn Hammond",
    role: "Registrar",
    department: "School of Postgraduate Studies",
    avatarUrl: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face",
  },
  AdminAssistant: {
    id: "aa1",
    email: "adminassistant@umat.edu.gh",
    name: "Ms Anita Awuki Akunor",
    role: "AdminAssistant",
    department: "School of Postgraduate Studies",
    avatarUrl: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&h=150&fit=crop&crop=face",
  },
  AccountingAssistant: {
    id: "aca1",
    email: "accountingassistant@umat.edu.gh",
    name: "Ms Candy Brew",
    role: "AccountingAssistant",
    department: "Finance Office",
    avatarUrl: "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&h=150&fit=crop&crop=face",
  },
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);

  const login = useCallback((email: string, _password: string) => {
    const lowerEmail = email.toLowerCase().trim();

    // Check departmental admin accounts first
    if (departmentalAdmins[lowerEmail]) {
      setUser(departmentalAdmins[lowerEmail]);
      return;
    }

    // Check super admin
    if (lowerEmail === "superadmin@umat.edu.gh" || lowerEmail.includes("superadmin")) {
      setUser(superAdminUser);
      return;
    }

    // Legacy admin keyword fallback — defaults to CS department admin
    if (lowerEmail.includes("admin")) {
      setUser(departmentalAdmins["admin.cs@umat.edu.gh"]);
      return;
    }

    if (lowerEmail.includes("dean")) {
      if (lowerEmail.includes("vice")) setUser(mockUsers.ViceDean);
      else setUser(mockUsers.Dean);
    } else if (lowerEmail.includes("vicedean")) {
      setUser(mockUsers.ViceDean);
    } else if (lowerEmail.includes("asstregistrar") || lowerEmail.includes("assistantregistrar")) {
      setUser(mockUsers.AssistantRegistrar);
    } else if (lowerEmail.includes("registrar")) {
      setUser(mockUsers.Registrar);
    } else if (lowerEmail.includes("adminassistant")) {
      setUser(mockUsers.AdminAssistant);
    } else if (lowerEmail.includes("accountingassistant")) {
      setUser(mockUsers.AccountingAssistant);
    } else if (lowerEmail.includes("accountant") || lowerEmail.includes("finance")) {
      setUser(mockUsers.Accountant);
    } else if (lowerEmail.includes("supervisor") || lowerEmail.includes("sup")) {
      setUser(mockUsers.Supervisor);
    } else if (lowerEmail.includes("exam")) {
      setUser(mockUsers.ExamsOfficer);
    } else {
      setUser(mockUsers.Student);
    }
  }, []);

  const logout = useCallback(() => {
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
};
