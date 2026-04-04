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
import { LogOut, Bell, Search } from "lucide-react";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

const DashboardLayout = ({ children }: DashboardLayoutProps) => {
  const { isAuthenticated, user, logout } = useAuth();
  const isMobile = useIsMobile();
  const navigate = useNavigate();

  if (!isAuthenticated) return <Navigate to="/" replace />;

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <MobileHeader />

      {/* Top bar */}
      <div className={`no-print ${isMobile ? "px-4 py-3" : "ml-64 px-8 py-4"} flex items-center justify-between gap-4 border-b border-border bg-background/70 backdrop-blur-md sticky top-0 z-30`}>
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
            >
              <Bell size={18} className="text-muted-foreground" />
              <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-destructive ring-2 ring-background" />
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
                  onClick={() => {
                    logout();
                    navigate("/");
                  }}
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

      <main className={`${isMobile ? "p-4 pt-6" : "ml-64 p-8"} animate-fade-in`}>
        {children}
      </main>
    </div>
  );
};

export default DashboardLayout;
