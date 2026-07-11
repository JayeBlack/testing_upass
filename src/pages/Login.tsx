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
    <div className="h-screen flex items-center justify-center overflow-hidden relative">
      <SEO
        title="Sign in — UMaT Postgraduate Portal"
        description="Sign in to the UMaT School of Postgraduate Studies portal for students, supervisors and staff."
      />

      {/* Background base — deep forest green */}
      <div className="absolute inset-0" style={{ background: "hsl(145,65%,11%)" }} />

      {/* Central warm gold spotlight — the hero glow */}
      <div className="absolute inset-0 animate-float-slow" style={{ background: "radial-gradient(ellipse 80% 70% at 50% 50%, hsl(45,90%,42%,0.28) 0%, transparent 65%)" }} />

      {/* Top-left green bloom */}
      <div className="absolute -top-32 -left-32 w-[560px] h-[560px] rounded-full blur-[120px] animate-float-slow" style={{ background: "radial-gradient(circle, hsl(145,58%,32%,0.6), transparent 70%)" }} />
      {/* Bottom-right gold bloom */}
      <div className="absolute -bottom-36 -right-24 w-[580px] h-[580px] rounded-full blur-[130px] animate-float-slower" style={{ background: "radial-gradient(circle, hsl(42,88%,48%,0.5), transparent 70%)" }} />
      {/* Top-right amber accent */}
      <div className="absolute -top-16 right-1/4 w-[320px] h-[320px] rounded-full blur-[100px] animate-float-slow" style={{ background: "radial-gradient(circle, hsl(38,85%,44%,0.22), transparent 70%)" }} />
      {/* Bottom-left green accent */}
      <div className="absolute bottom-0 left-1/4 w-[300px] h-[300px] rounded-full blur-[90px] animate-float-slower" style={{ background: "radial-gradient(circle, hsl(145,55%,28%,0.3), transparent 70%)" }} />

      {/* Decorative rings — white on green side, gold-tinted on warm side */}
      <div className="absolute top-8 left-8 w-72 h-72 rounded-full border border-white/[0.05] animate-float-slow" />
      <div className="absolute top-16 left-16 w-52 h-52 rounded-full border border-white/[0.03] animate-float-slower" />
      <div className="absolute bottom-10 right-10 w-80 h-80 rounded-full border border-yellow-300/[0.07] animate-float-slow" />
      <div className="absolute bottom-18 right-18 w-60 h-60 rounded-full border border-yellow-300/[0.04] animate-float-slower" />
      {/* Large center ring */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full border border-white/[0.025]" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[820px] h-[820px] rounded-full border border-yellow-200/[0.03]" />

      {/* Watermark logo — bottom right */}
      <img
        src={umatLogo}
        alt=""
        aria-hidden="true"
        className="absolute bottom-6 right-8 w-44 opacity-[0.055] pointer-events-none select-none animate-logo-float"
      />

      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.06),transparent_55%)] pointer-events-none" />
      <div className="absolute inset-0 opacity-[0.12] pointer-events-none" style={{ backgroundImage: "linear-gradient(rgba(255,255,255,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.6) 1px, transparent 1px)", backgroundSize: "34px 34px", maskImage: "linear-gradient(180deg, rgba(0,0,0,0.8), transparent 85%)" }} />

      {/* Card — premium glass treatment */}
      <main className="relative z-10 w-full max-w-[420px] mx-auto px-4">
        <div className="rounded-[28px] border border-white/70 bg-white/85 backdrop-blur-2xl shadow-[0_24px_80px_rgba(0,0,0,0.45)] p-8 sm:p-10 animate-card-enter">

          {/* Branding */}
          <div className="text-center mb-7">
            <div className="w-16 h-16 rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-center mx-auto mb-4 shadow-sm animate-logo-pulse">
              <img src={umatLogo} alt="UMaT Logo" className="w-10 h-auto" />
            </div>
            <h1 className="font-display text-lg font-bold text-gray-800 leading-snug">
              Postgraduate Administrative<br />Support System
            </h1>
            <p className="text-xs text-gray-400 mt-1.5 tracking-wide">University of Mines and Technology · Tarkwa</p>
          </div>

          {/* Divider */}
          <div className="border-t border-gray-100 mb-6" />

          {/* Form */}
          <div className="mb-6">
            <h2 className="font-display text-2xl font-bold text-gray-800 mb-1">Welcome back</h2>
            <p className="text-gray-400 text-sm min-h-5">
              <span className="inline-flex items-center gap-1">
                <span className="typing-cursor">Sign in to your account to continue</span>
              </span>
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wider">Email</label>
              <div className="relative">
                <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@umat.edu.gh"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-gray-800 text-sm placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-green-700/20 focus:border-green-700/40 focus:bg-white transition-all duration-300"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wider">Password</label>
              <div className="relative">
                <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-gray-800 text-sm placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-green-700/20 focus:border-green-700/40 focus:bg-white transition-all duration-300"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="group relative w-full py-2.5 mt-1 rounded-xl font-semibold text-sm text-white transition-all duration-300 ease-out hover:-translate-y-0.5 hover:shadow-[0_10px_28px_rgba(17,94,89,0.28)] active:translate-y-0"
              style={{ background: "linear-gradient(135deg, hsl(145,62%,20%), hsl(145,58%,27%))", boxShadow: "0 4px 18px hsl(145,62%,20%,0.4)" }}
            >
              <span className="relative z-10">{submitting ? "Signing in…" : "Sign In"}</span>
            </button>
          </form>

          <p className="mt-6 text-center text-[11px] font-semibold tracking-[0.24em] uppercase text-gray-600/90">
            © {new Date().getFullYear()} UMaT School of Postgraduate Studies
          </p>
        </div>
      </main>
    </div>
  );
};

export default Login;
