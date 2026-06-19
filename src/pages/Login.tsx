import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate, Navigate } from "react-router-dom";
import { Mail, Lock, Eye, EyeOff } from "lucide-react";
import umatLogo from "@/assets/umat-logo.png";
import SEO from "@/components/SEO";
import { useToast } from "@/hooks/use-toast";
import { ApiError } from "@/lib/api";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const { login, user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  if (user) {
    return <Navigate to={user.mustChangePassword ? "/change-password" : "/dashboard"} replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast({ title: "Missing credentials", description: "Enter your email and password", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      await login(email, password);
      // Navigation handled by the redirect above on next render
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Sign in failed";
      toast({ title: "Sign in failed", description: msg, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      <SEO
        title="Sign in — UMaT Postgraduate Portal"
        description="Sign in to the UMaT School of Postgraduate Studies portal for students, supervisors and staff."
      />
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-1/2 gradient-navy items-center justify-center p-12 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-20 w-72 h-72 rounded-full border border-sidebar-foreground/20" />
          <div className="absolute bottom-32 right-16 w-48 h-48 rounded-full border border-sidebar-foreground/20" />
          <div className="absolute top-1/2 left-1/3 w-96 h-96 rounded-full border border-sidebar-foreground/10" />
        </div>
        <div className="relative z-10 text-center max-w-md">
          <img src={umatLogo} alt="UMaT Logo" className="w-32 h-auto mx-auto mb-8" />
          <h1 className="font-display text-3xl font-bold text-primary-foreground mb-2">
            Postgraduate Administrative Support System
          </h1>
          <p className="text-sm text-primary-foreground/60 mt-4">
            University of Mines and Technology, Tarkwa
          </p>
          <p className="text-xs text-primary-foreground/70 mt-1 italic">
            Knowledge, Truth and Excellence
          </p>
        </div>
      </div>

      {/* Right panel - form */}
      <main className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <div className="lg:hidden flex flex-col items-center gap-3 mb-8">
            <img src={umatLogo} alt="UMaT Logo" className="w-20 h-auto" />
            <p className="font-display text-xl font-bold text-center">Postgraduate Administrative Support System</p>
          </div>

          <h2 className="font-display text-3xl font-bold text-foreground mb-2">Welcome back</h2>
          <p className="text-muted-foreground mb-8">Sign in to your account to continue</p>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Email</label>
              <div className="relative">
                <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@umat.edu.gh"
                  className="w-full pl-11 pr-4 py-3 rounded-lg border border-input bg-card text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-all"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Password</label>
              <div className="relative">
                <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-11 pr-11 py-3 rounded-lg border border-input bg-card text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 rounded-lg gradient-gold text-secondary-foreground font-semibold text-sm hover:opacity-90 transition-opacity"
            >
              {submitting ? "Signing in…" : "Sign In"}
            </button>
          </form>

          <p className="mt-6 text-center text-xs text-muted-foreground">
            © {new Date().getFullYear()} UMaT School of Postgraduate Studies
          </p>
        </div>
      </main>
    </div>
  );
};

export default Login;
