import { useState } from "react";
import { useLocation, Link } from "wouter";
import { LogIn, UserPlus, Mail, Lock, User, Eye, EyeOff, ArrowRight, AtSign } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { GlowCard } from "@/components/ui/glow-card";
import { login, register, storeToken } from "@/api/auth";
import { setAuthTokenGetter } from "@/api/custom-fetch";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type AuthTab = "login" | "signup";

export default function AuthPage() {
  const [tab, setTab] = useState<AuthTab>("login");
  const [, navigate] = useLocation();

  const switchTab = (t: AuthTab) => {
    setTab(t);
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(79,140,255,0.08),transparent_60%)]" />
      <GlowCard className="relative z-10 w-full max-w-md p-8">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl border border-cyan-500/20 bg-cyan-500/10 shadow-[0_0_20px_rgba(6,182,212,0.2)]">
            {tab === "login" ? <LogIn className="h-7 w-7 text-cyan-400" /> : <UserPlus className="h-7 w-7 text-cyan-400" />}
          </div>
          <h1 className="text-2xl font-black tracking-tight text-foreground">
            {tab === "login" ? "Welcome back" : "Create account"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {tab === "login" ? "Sign in to your RankLens account" : "Start analyzing your websites for free"}
          </p>
        </div>

        <div className="mb-6 flex rounded-xl border border-white/5 bg-white/5 p-1">
          {(["login", "signup"] as const).map((t) => (
            <button
              key={t}
              onClick={() => switchTab(t)}
              className={cn(
                "flex-1 rounded-lg py-2.5 text-sm font-bold uppercase tracking-wider transition-all",
                tab === t
                  ? "bg-cyan-500/10 text-cyan-400 shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {t === "login" ? "Sign In" : "Sign Up"}
            </button>
          ))}
        </div>

        {tab === "login" ? <LoginForm /> : <SignupForm />}

        <p className="mt-6 text-center text-sm text-muted-foreground">
          {tab === "login" ? (
            <>Don&apos;t have an account? <button onClick={() => switchTab("signup")} className="font-bold text-cyan-400 hover:text-cyan-300 hover:underline">Create one</button></>
          ) : (
            <>Already have an account? <button onClick={() => switchTab("login")} className="font-bold text-cyan-400 hover:text-cyan-300 hover:underline">Sign in</button></>
          )}
        </p>
      </GlowCard>
    </div>
  );

  function LoginForm() {
    const [loginId, setLoginId] = useState("");
    const [password, setPassword] = useState("");
    const [showPw, setShowPw] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!loginId || !password) return;
      setLoading(true);
      setError("");
      try {
        const res = await login(loginId, password);
        storeToken(res.token);
        setAuthTokenGetter(() => localStorage.getItem("ranklens_token"));
        toast.success("Logged in successfully");
        navigate("/dashboard");
      } catch (err: any) {
        setError(err.message || "Login failed");
      } finally {
        setLoading(false);
      }
    };

    return (
      <form onSubmit={handleSubmit} className="space-y-5">
        {error && <p className="rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-2.5 text-sm font-medium text-red-400">{error}</p>}
        <div className="space-y-2">
          <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Email or Username</label>
          <div className="relative">
            <AtSign className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="text"
              placeholder="you@example.com or username"
              value={loginId}
              onChange={(e) => setLoginId(e.target.value)}
              className="skeu-inset h-11 pl-10"
              required
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Password</label>
          <div className="relative">
            <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type={showPw ? "text" : "password"}
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="skeu-inset h-11 pl-10 pr-10"
              required
            />
            <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        <Button type="submit" disabled={loading} className="skeu-btn-primary h-11 w-full gap-2 text-sm font-bold uppercase tracking-wider">
          {loading ? "Signing in..." : "Sign in"}
          <ArrowRight className="h-4 w-4" />
        </Button>
      </form>
    );
  }

  function SignupForm() {
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [showPw, setShowPw] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!name || !email || !password) return;
      if (password.length < 6) { setError("Password must be at least 6 characters"); return; }
      if (username && (username.length < 3 || !/^[a-zA-Z0-9_]+$/.test(username))) {
        setError("Username must be 3+ characters with only letters, numbers, underscores");
        return;
      }
      setLoading(true);
      setError("");
      try {
        const res = await register(email, password, name, username || undefined);
        storeToken(res.token);
        setAuthTokenGetter(() => localStorage.getItem("ranklens_token"));
        toast.success("Account created successfully");
        navigate("/dashboard");
      } catch (err: any) {
        setError(err.message || "Registration failed");
      } finally {
        setLoading(false);
      }
    };

    return (
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <p className="rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-2.5 text-sm font-medium text-red-400">{error}</p>}

        <div className="space-y-2">
          <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Name</label>
          <div className="relative">
            <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input type="text" placeholder="Your name" value={name} onChange={(e) => setName(e.target.value)} className="skeu-inset h-11 pl-10" required />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Email</label>
          <div className="relative">
            <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} className="skeu-inset h-11 pl-10" required />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Username <span className="text-muted-foreground/50">(optional)</span></label>
          <div className="relative">
            <AtSign className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input type="text" placeholder="your_username" value={username} onChange={(e) => setUsername(e.target.value)} className="skeu-inset h-11 pl-10" />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Password</label>
          <div className="relative">
            <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input type={showPw ? "text" : "password"} placeholder="At least 6 characters" value={password} onChange={(e) => setPassword(e.target.value)} className="skeu-inset h-11 pl-10 pr-10" required minLength={6} />
            <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        <Button type="submit" disabled={loading} className="skeu-btn-primary h-11 w-full gap-2 text-sm font-bold uppercase tracking-wider">
          {loading ? "Creating account..." : "Create account"}
          <ArrowRight className="h-4 w-4" />
        </Button>
      </form>
    );
  }
}
