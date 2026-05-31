import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { Mail, Lock } from "lucide-react";
import umatLogo from "@/assets/umat-logo.png";
import SEO from "@/components/SEO";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    login(email, password);
    navigate("/dashboard");
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
          <p className="text-xs text-primary-foreground/40 mt-1 italic">
            Knowledge, Truth and Excellence
          </p>
        </div>
      </div>

      {/* Right panel - form */}
      <div className="flex-1 flex items-center justify-center p-8">
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
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-11 pr-4 py-3 rounded-lg border border-input bg-card text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-all"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-3 rounded-lg gradient-gold text-secondary-foreground font-semibold text-sm hover:opacity-90 transition-opacity"
            >
              Sign In
            </button>
          </form>

          <p className="mt-6 text-center text-xs text-muted-foreground">
            © {new Date().getFullYear()} UMaT School of Postgraduate Studies
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
