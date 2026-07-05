import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import { apiFetch, setToken, getToken } from "@/lib/api";

const AUTH_STORAGE_KEY = "umat_sps_auth_user";

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
  mustChangePassword?: boolean;
  admissionCycle?: string;
  departmentId?: number;
  programId?: number;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  changePassword: (oldPassword: string, newPassword: string) => Promise<void>;
  logout: () => void;
  refresh: () => Promise<void>;
  updateAvatar: (avatarUrl: string) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

type ApiUser = {
  id: number | string;
  email: string;
  name?: string;
  first_name?: string;
  last_name?: string;
  role: string;
  department_name?: string;
  program_name?: string;
  department?: string;  // Direct field from backend
  program?: string;     // Direct field from backend
  index_number?: string;
  avatar_url?: string;
  is_super_admin?: boolean;
  must_change_password?: boolean;
  admission_cycle?: string;
  department_id?: number;
  program_id?: number;
};

const mapUser = (u: ApiUser): User => ({
  id: String(u.id),
  email: u.email,
  name: u.name || `${u.first_name ?? ""} ${u.last_name ?? ""}`.trim() || u.email,
  role: u.role as UserRole,
  // Prioritize direct 'department' field from backend, fallback to 'department_name'
  department: u.department || u.department_name || undefined,
  // Prioritize direct 'program' field from backend, fallback to 'program_name'
  program: u.program || u.program_name || undefined,
  indexNumber: u.index_number || undefined,
  avatarUrl: u.avatar_url || undefined,
  isSuperAdmin: !!u.is_super_admin,
  mustChangePassword: !!u.must_change_password,
  admissionCycle: u.admission_cycle || undefined,
  departmentId: u.department_id || undefined,
  programId: u.program_id || undefined,
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    if (typeof window === "undefined") return null;
    try {
      const raw = window.localStorage.getItem(AUTH_STORAGE_KEY);
      return raw ? (JSON.parse(raw) as User) : null;
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState<boolean>(!!getToken());

  useEffect(() => {
    try {
      if (user) window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
      else window.localStorage.removeItem(AUTH_STORAGE_KEY);
    } catch {
      /* ignore storage errors */
    }
  }, [user]);

  const login = useCallback(async (email: string, password: string) => {
    const data = await apiFetch<{ token: string; user: ApiUser }>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email: email.trim(), password }),
    });
    setToken(data.token);
    setUser(mapUser(data.user));
  }, []);

  const changePassword = useCallback(async (oldPassword: string, newPassword: string) => {
    await apiFetch("/auth/change-password", {
      method: "POST",
      body: JSON.stringify({ old_password: oldPassword, new_password: newPassword }),
    });
    setUser((u) => (u ? { ...u, mustChangePassword: false } : u));
  }, []);

  const refresh = useCallback(async () => {
    if (!getToken()) return;
    try {
      const u = await apiFetch<ApiUser>("/auth/me");
      setUser(mapUser(u));
    } catch {
      setToken(null);
      setUser(null);
    }
  }, []);

  const updateAvatar = useCallback((avatarUrl: string) => {
    setUser((u) => (u ? { ...u, avatarUrl } : u));
  }, []);

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
    try { window.localStorage.removeItem(AUTH_STORAGE_KEY); } catch { /* ignore */ }
  }, []);

  // On mount, validate token / refresh user
  useEffect(() => {
    let active = true;
    (async () => {
      if (getToken()) {
        await refresh();
      }
      if (active) setLoading(false);
    })();
    return () => { active = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, loading, login, changePassword, logout, refresh, updateAvatar }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
};
