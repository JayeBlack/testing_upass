import { useAuth } from "@/contexts/AuthContext";
import { Navigate, useNavigate } from "react-router-dom";
import Sidebar, { MobileHeader } from "./Sidebar";
import { useIsMobile } from "@/hooks/use-mobile";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { LogOut, Bell, Camera, Loader2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { apiFetch } from "@/lib/api";
import OnboardingModal from "./OnboardingModal";
import GettingStartedChecklist from "./GettingStartedChecklist";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

const DashboardLayout = ({ children }: DashboardLayoutProps) => {
  const { isAuthenticated, user, logout, updateAvatar } = useAuth();
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const [unreadCount, setUnreadCount] = useState(0);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingAvatar(true);
    try {
      const formData = new FormData();
      formData.append("avatar", file);
      const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "/api";
      const token = localStorage.getItem("umat_sps_token");
      const res = await fetch(`${API_BASE_URL}/auth/upload-avatar`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Upload failed");
      const base = API_BASE_URL.replace("/api", "");
      updateAvatar(`${base}${data.avatar_url}?t=${Date.now()}`);
    } catch (err) {
      console.error("Avatar upload failed:", err);
    } finally {
      setUploadingAvatar(false);
      e.target.value = "";
    }
  };

  useEffect(() => {
    if (!user) return;
    const fetchCount = async () => {
      try {
        const data = await apiFetch<{ count: number }>("/notifications/unread-count");
        setUnreadCount(data.count || 0);
      } catch { /* ignore */ }
    };
    fetchCount();
    const id = setInterval(fetchCount, 5000);
    return () => clearInterval(id);
  }, [user]);

  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    if (!user) return;
    const flag = localStorage.getItem("umat_show_onboarding");
    if (flag === "true") {
      setShowOnboarding(true);
      localStorage.removeItem("umat_show_onboarding");
    }
  }, [user]);

  if (!isAuthenticated) return <Navigate to="/" replace />;

  return (
    <div className="min-h-screen overflow-x-hidden bg-background">
      <Sidebar />
      <MobileHeader />
      {showOnboarding && user && (
        <OnboardingModal user={user} onClose={() => setShowOnboarding(false)} />
      )}

      {/* Top bar */}
      <div className={`no-print relative ${isMobile ? "px-4 py-3" : "ml-64 px-8 py-4"} flex items-center justify-between gap-3 sm:gap-4 border-b border-border bg-background/80 backdrop-blur-md sticky top-0 z-30`}>
        {/* Subtle gold accent line at very top */}
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-secondary/40 to-transparent pointer-events-none" />
        {user && (
          <div className="flex-1 min-w-0">
            <h2 className="text-base font-semibold text-foreground truncate">
              Welcome back, {user.name.split(" ")[0]}
            </h2>
            <div className="flex items-center gap-2 mt-0.5">
              {user.role === "Student" && user.indexNumber && (
                <>
                  <span className="text-xs font-mono text-muted-foreground bg-muted px-2 py-0.5 rounded">{user.indexNumber}</span>
                  <span className="text-muted-foreground/40">·</span>
                </>
              )}
              <p className="text-xs text-muted-foreground truncate">{user.email}</p>
            </div>
          </div>
        )}

        {user && (
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => navigate("/notifications")}
              className="relative p-2.5 rounded-xl hover:bg-muted transition-colors"
              title="Notifications"
              aria-label="Notifications"
            >
              <Bell size={18} className="text-muted-foreground" />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] rounded-full bg-destructive text-white text-[10px] font-bold flex items-center justify-center px-1 ring-2 ring-background">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2.5 pl-2 pr-3 py-1.5 rounded-xl hover:bg-muted transition-colors">
                  <Avatar className="w-8 h-8 ring-2 ring-border">
                    <AvatarImage src={user.avatarUrl} alt={user.name} />
                    <AvatarFallback className="gradient-gold text-secondary-foreground text-xs font-bold">
                      {user.name.split(" ").map((n) => n[0]).join("")}
                    </AvatarFallback>
                  </Avatar>
                  <div className="hidden sm:flex flex-col items-start">
                    <p className="text-xs font-semibold text-foreground leading-tight">{user.name}</p>
                    <p className="text-[11px] text-muted-foreground">{user.role}</p>
                  </div>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52 rounded-xl shadow-lg">
                <DropdownMenuItem disabled className="flex flex-col items-start py-2.5">
                  <span className="text-sm font-semibold">{user.name}</span>
                  <span className="text-xs text-muted-foreground">{user.email}</span>
                  {user.role === "Student" && user.indexNumber && (
                    <span className="text-xs text-muted-foreground font-mono">{user.indexNumber}</span>
                  )}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => avatarInputRef.current?.click()}
                  className="rounded-lg cursor-pointer"
                  disabled={uploadingAvatar}
                >
                  {uploadingAvatar ? (
                    <Loader2 size={14} className="mr-2 animate-spin" />
                  ) : (
                    <Camera size={14} className="mr-2" />
                  )}
                  {uploadingAvatar ? "Uploading..." : "Change Profile Photo"}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => { logout(); navigate("/"); }}
                  className="text-destructive focus:text-destructive rounded-lg"
                >
                  <LogOut size={14} className="mr-2" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
      </div>

      {/* Subtle green radial bloom in top-left of content area — carries login's design language */}
      <div
        className={`pointer-events-none fixed top-0 ${isMobile ? "left-0" : "left-64"} w-[480px] h-[320px] opacity-[0.035] blur-[80px] z-0`}
        style={{ background: "radial-gradient(ellipse at top left, hsl(145,60%,22%), transparent 70%)" }}
        aria-hidden="true"
      />

      <main className={`relative z-10 ${isMobile ? "p-4 pt-6" : "ml-64 p-8"} min-w-0 animate-fade-in overflow-x-hidden`}>
        {children}
      </main>

      {user && <GettingStartedChecklist />}

      <input
        ref={avatarInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={handleAvatarChange}
      />
    </div>
  );
};

export default DashboardLayout;
