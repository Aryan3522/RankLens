import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Settings as SettingsIcon, User, AtSign, Lock, Save, Loader2, CheckCircle, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getMe, updateProfile, changePassword, isAuthenticated, storeToken, type User as UserType } from "@/api/auth";
import { setAuthTokenGetter } from "@/api/custom-fetch";
import { toast } from "sonner";

export default function Settings() {
  const [user, setUser] = useState<UserType | null>(null);
  const [, navigate] = useLocation();

  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [saving, setSaving] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changingPw, setChangingPw] = useState(false);

  useEffect(() => {
    if (!isAuthenticated()) { navigate("/login"); return; }
    getMe().then((u) => {
      setUser(u);
      setName(u.name || "");
      setUsername(u.username || "");
    }).catch(() => navigate("/login"));
  }, []);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { toast.error("Name is required"); return; }
    if (username && (username.length < 3 || !/^[a-zA-Z0-9_]+$/.test(username))) {
      toast.error("Username must be 3+ characters with only letters, numbers, underscores");
      return;
    }
    setSaving(true);
    try {
      const { user: updatedUser, token } = await updateProfile({
        name: name.trim(),
        username: username.trim() || undefined,
      });
      storeToken(token);
      setAuthTokenGetter(() => localStorage.getItem("ranklens_token"));
      setUser(updatedUser);
      toast.success("Profile updated");
    } catch (err: any) {
      toast.error(err.message || "Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword) { toast.error("Enter your current password"); return; }
    if (newPassword.length < 6) { toast.error("New password must be at least 6 characters"); return; }
    if (newPassword !== confirmPassword) { toast.error("Passwords don't match"); return; }
    setChangingPw(true);
    try {
      await changePassword(currentPassword, newPassword);
      toast.success("Password changed successfully");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      toast.error(err.message || "Failed to change password");
    } finally {
      setChangingPw(false);
    }
  };

  if (!user) return null;

  return (
    <div className="mx-auto w-full max-w-2xl space-y-6 px-4 py-6 md:px-8 md:py-10 pb-20">
      <div className="flex items-center gap-3">
        <SettingsIcon className="h-7 w-7 text-cyan-400" />
        <div>
          <h1 className="text-2xl font-black tracking-tight text-foreground">Settings</h1>
          <p className="text-sm text-muted-foreground">Manage your account</p>
        </div>
      </div>

      <div className="rounded-xl border border-white/5 bg-white/[0.02] p-6">
        <h2 className="mb-6 flex items-center gap-2 text-lg font-bold tracking-tight text-foreground">
          <User className="h-5 w-5 text-cyan-400" /> Profile
        </h2>
        <form onSubmit={handleSaveProfile} className="space-y-4">
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Name</label>
            <Input value={name} onChange={(e) => setName(e.target.value)} className="bg-muted/40 border-white/10 focus-visible:ring-cyan-500/50 focus-visible:border-cyan-500 h-11" required />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Email</label>
            <Input value={user.email} disabled className="bg-muted/40 border-white/10 h-11 opacity-60" />
            <p className="text-[10px] text-muted-foreground">Email cannot be changed</p>
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Username <span className="text-muted-foreground/50">(optional)</span>
            </label>
            <div className="relative">
              <AtSign className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="your_username" className="bg-muted/40 border-white/10 focus-visible:ring-cyan-500/50 focus-visible:border-cyan-500 h-11 pl-10" />
            </div>
          </div>
          <Button type="submit" disabled={saving} className="skeu-btn-primary gap-2">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </form>
      </div>

      <div className="rounded-xl border border-white/5 bg-white/[0.02] p-6">
        <h2 className="mb-6 flex items-center gap-2 text-lg font-bold tracking-tight text-foreground">
          <Lock className="h-5 w-5 text-cyan-400" /> Change Password
        </h2>
        <form onSubmit={handleChangePassword} className="space-y-4">
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Current Password</label>
            <Input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} className="bg-muted/40 border-white/10 focus-visible:ring-cyan-500/50 focus-visible:border-cyan-500 h-11" required />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">New Password</label>
            <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="bg-muted/40 border-white/10 focus-visible:ring-cyan-500/50 focus-visible:border-cyan-500 h-11" required minLength={6} />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Confirm New Password</label>
            <Input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="bg-muted/40 border-white/10 focus-visible:ring-cyan-500/50 focus-visible:border-cyan-500 h-11" required />
            {confirmPassword && newPassword !== confirmPassword && (
              <p className="flex items-center gap-1 text-xs text-red-400"><XCircle className="h-3 w-3" /> Passwords don't match</p>
            )}
            {confirmPassword && newPassword === confirmPassword && (
              <p className="flex items-center gap-1 text-xs text-emerald-400"><CheckCircle className="h-3 w-3" /> Passwords match</p>
            )}
          </div>
          <Button type="submit" disabled={changingPw || !currentPassword || !newPassword || newPassword !== confirmPassword} className="skeu-btn-primary gap-2">
            {changingPw ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />}
            {changingPw ? "Changing..." : "Change Password"}
          </Button>
        </form>
      </div>
    </div>
  );
}
