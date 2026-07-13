import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate, Navigate } from "react-router-dom";
import { Lock, KeyRound, Eye, EyeOff } from "lucide-react";
import umatLogo from "@/assets/umat-logo.png";
import SEO from "@/components/SEO";
import { useToast } from "@/hooks/use-toast";
import { ApiError } from "@/lib/api";

const ChangePassword = () => {
  const { user, changePassword, logout } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [oldPwd, setOldPwd] = useState("");
  const [newPwd, setNewPwd] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showOldPwd, setShowOldPwd] = useState(false);
  const [showNewPwd, setShowNewPwd] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  if (!user) return <Navigate to="/" replace />;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPwd.length < 8) {
      toast({ title: "Password too short", description: "Use at least 8 characters", variant: "destructive" });
      return;
    }
    if (newPwd !== confirm) {
      toast({ title: "Passwords do not match", variant: "destructive" });
      return;
    }
    if (newPwd === oldPwd) {
      toast({ title: "Choose a new password", description: "New password must differ from the current one", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      await changePassword(oldPwd, newPwd);
      toast({ title: "Password updated", description: "You can now use your new password" });
      if (user.mustChangePassword) {
        localStorage.setItem("umat_show_onboarding", "true");
      }
      navigate("/dashboard", { replace: true });
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Could not change password";
      toast({ title: "Failed", description: msg, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 relative overflow-hidden">
      <SEO title="Change Password — UMaT SPS" description="Set a new password for your UMaT postgraduate account." />

      {/* Background — mirrors login page */}
      <div className="absolute inset-0" style={{ background: "hsl(145,65%,11%)" }} />
      <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse 80% 70% at 50% 50%, hsl(45,90%,42%,0.22) 0%, transparent 65%)" }} />
      <div className="absolute -top-32 -left-32 w-[500px] h-[500px] rounded-full blur-[120px]" style={{ background: "radial-gradient(circle, hsl(145,58%,32%,0.55), transparent 70%)" }} />
      <div className="absolute -bottom-32 -right-20 w-[520px] h-[520px] rounded-full blur-[130px]" style={{ background: "radial-gradient(circle, hsl(42,88%,48%,0.45), transparent 70%)" }} />
      <div className="absolute inset-0 opacity-[0.10] pointer-events-none" style={{ backgroundImage: "linear-gradient(rgba(255,255,255,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.6) 1px, transparent 1px)", backgroundSize: "34px 34px", maskImage: "linear-gradient(180deg, rgba(0,0,0,0.8), transparent 85%)" }} />

      <main className="relative z-10 w-full max-w-md animate-card-enter">
        <div className="rounded-[28px] border border-white/70 bg-white/85 backdrop-blur-2xl shadow-[0_24px_80px_rgba(0,0,0,0.45)] p-8">
          <div className="flex flex-col items-center mb-6">
            <img src={umatLogo} alt="UMaT Logo" className="w-14 h-auto mb-3" />
            <div className="w-11 h-11 rounded-full flex items-center justify-center mb-3" style={{ background: "linear-gradient(135deg, hsl(145,62%,20%), hsl(145,58%,27%))" }}>
              <KeyRound size={20} className="text-white" />
            </div>
            <h1 className="font-display text-2xl font-bold text-gray-800">Set a new password</h1>
            {user.mustChangePassword && (
              <p className="text-sm text-gray-500 text-center mt-2">
                For security, please change your default password before continuing.
              </p>
            )}
          </div>

          <div className="border-t border-gray-100 mb-5" />

          <form onSubmit={handleSubmit} className="space-y-4">
            <Field label="Current password" value={oldPwd} onChange={setOldPwd} show={showOldPwd} onToggle={() => setShowOldPwd(!showOldPwd)} />
            <Field label="New password" value={newPwd} onChange={setNewPwd} show={showNewPwd} onToggle={() => setShowNewPwd(!showNewPwd)} />
            <Field label="Confirm new password" value={confirm} onChange={setConfirm} show={showConfirm} onToggle={() => setShowConfirm(!showConfirm)} />

            <button
              type="submit"
              disabled={submitting}
              className="group w-full py-2.5 mt-1 rounded-xl font-semibold text-sm text-white transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_10px_28px_rgba(17,94,89,0.28)] active:translate-y-0 disabled:opacity-50"
              style={{ background: "linear-gradient(135deg, hsl(145,62%,20%), hsl(145,58%,27%))", boxShadow: "0 4px 18px hsl(145,62%,20%,0.4)" }}
            >
              {submitting ? "Updating…" : "Update password"}
            </button>
          </form>

          <button
            onClick={() => { logout(); navigate("/", { replace: true }); }}
            className="mt-4 w-full text-xs text-gray-400 hover:text-gray-600 transition-colors"
          >
            Sign out
          </button>
        </div>
      </main>
    </div>
  );
};

const Field = ({ label, value, onChange, show, onToggle }: { label: string; value: string; onChange: (v: string) => void; show: boolean; onToggle: () => void }) => (
  <div>
    <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wider">{label}</label>
    <div className="relative">
      <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
      <input
        type={show ? "text" : "password"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="••••••••"
        className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-gray-800 text-sm placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-green-700/20 focus:border-green-700/40 focus:bg-white transition-all duration-300"
      />
      <button
        type="button"
        onClick={onToggle}
        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
      >
        {show ? <EyeOff size={15} /> : <Eye size={15} />}
      </button>
    </div>
  </div>
);

export default ChangePassword;