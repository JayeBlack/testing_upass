import React, { createContext, useContext, useState, useCallback } from "react";

export type UserRole = "Student" | "Supervisor" | "Admin" | "Dean" | "Accountant" | "ExamsOfficer";

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  department?: string;
  program?: string;
  indexNumber?: string;
  avatarUrl?: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const mockUsers: Record<UserRole, User> = {
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
  Admin: {
    id: "a1",
    email: "admin@umat.edu.gh",
    name: "Prof. Kofi Asante",
    role: "Admin",
    department: "Computer Science",
    avatarUrl: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face",
  },
  Dean: {
    id: "d1",
    email: "dean@umat.edu.gh",
    name: "Prof. Ama Boateng",
    role: "Dean",
    department: "School of Postgraduate Studies",
    avatarUrl: "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&h=150&fit=crop&crop=face",
  },
  Accountant: {
    id: "acc1",
    email: "accountant@umat.edu.gh",
    name: "Mr. Yaw Darko",
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
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);

  const login = useCallback((email: string, _password: string) => {
    // Determine role from email for mock auth
    if (email.includes("dean")) {
      setUser(mockUsers.Dean);
    } else if (email.includes("accountant") || email.includes("finance")) {
      setUser(mockUsers.Accountant);
    } else if (email.includes("admin")) {
      setUser(mockUsers.Admin);
    } else if (email.includes("supervisor") || email.includes("sup")) {
      setUser(mockUsers.Supervisor);
    } else if (email.includes("exam")) {
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
