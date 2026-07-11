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
      navigate("/dashboard", { replace: true });
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Could not change password";
      toast({ title: "Failed", description: msg, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <SEO title="Change Password — UMaT SPS" description="Set a new password for your UMaT postgraduate account." />
      <div className="w-full max-w-md bg-card border border-border rounded-2xl shadow-xl p-8">
        <div className="flex flex-col items-center mb-6">
          <img src={umatLogo} alt="UMaT Logo" className="w-16 h-auto mb-3" />
          <div className="w-12 h-12 rounded-full bg-secondary/15 flex items-center justify-center mb-3">
            <KeyRound size={22} className="text-secondary-foreground" />
          </div>
          <h1 className="font-display text-2xl font-bold text-foreground">Set a new password</h1>
          {user.mustChangePassword && (
            <p className="text-sm text-muted-foreground text-center mt-2">
              For security, please change your default password before continuing.
            </p>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Field label="Current password" value={oldPwd} onChange={setOldPwd} show={showOldPwd} onToggle={() => setShowOldPwd(!showOldPwd)} />
          <Field label="New password" value={newPwd} onChange={setNewPwd} show={showNewPwd} onToggle={() => setShowNewPwd(!showNewPwd)} />
          <Field label="Confirm new password" value={confirm} onChange={setConfirm} show={showConfirm} onToggle={() => setShowConfirm(!showConfirm)} />

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3 rounded-lg gradient-gold text-secondary-foreground font-semibold text-sm hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {submitting ? "Updating…" : "Update password"}
          </button>
        </form>

        <button
          onClick={() => { logout(); navigate("/", { replace: true }); }}
          className="mt-4 w-full text-xs text-muted-foreground hover:text-foreground"
        >
          Sign out
        </button>
      </div>
    </div>
  );
};

const Field = ({ label, value, onChange, show, onToggle }: { label: string; value: string; onChange: (v: string) => void; show: boolean; onToggle: () => void }) => (
  <div>
    <label className="block text-sm font-medium text-foreground mb-1.5">{label}</label>
    <div className="relative">
      <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
      <input
        type={show ? "text" : "password"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="••••••••"
        className="w-full pl-11 pr-11 py-3 rounded-lg border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
      />
      <button
        type="button"
        onClick={onToggle}
        className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
      >
        {show ? <EyeOff size={16} /> : <Eye size={16} />}
      </button>
    </div>
  </div>
);

export default ChangePassword;