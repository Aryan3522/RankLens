import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { User, Mail, AtSign, Crown, Calendar, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { getMe, isAuthenticated, type User as UserType } from "@/api/auth";
import { cn } from "@/lib/utils";

const planColors: Record<string, string> = {
  free: "bg-white/5 text-muted-foreground",
  pro: "bg-cyan-500/10 text-cyan-400",
  enterprise: "bg-purple-500/10 text-purple-400",
};

export default function Profile() {
  const [user, setUser] = useState<UserType | null>(null);
  const [loading, setLoading] = useState(true);
  const [, navigate] = useLocation();

  useEffect(() => {
    if (!isAuthenticated()) { navigate("/login"); return; }
    getMe().then(setUser).catch(() => navigate("/login")).finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="mx-auto w-full max-w-2xl space-y-6 px-4 py-6 md:px-8 md:py-10 pb-20">
        <Skeleton className="h-48 w-full rounded-xl" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="mx-auto w-full max-w-2xl space-y-6 px-4 py-6 md:px-8 md:py-10 pb-20">
      <div className="text-center">
        <div className="mx-auto mb-4 grid h-20 w-20 place-items-center rounded-full bg-gradient-to-br from-cyan-500/20 to-purple-500/20 text-2xl font-black text-cyan-400 shadow-[0_0_30px_rgba(6,182,212,0.15)]">
          {user.name?.charAt(0)?.toUpperCase() || user.email.charAt(0).toUpperCase()}
        </div>
        <h1 className="text-2xl font-black tracking-tight text-foreground">{user.name || "User"}</h1>
        <p className="text-sm text-muted-foreground">{user.email}</p>
        <div className="mt-3 flex items-center justify-center gap-2">
          <Badge className={cn("uppercase text-[10px] font-bold", planColors[user.plan] || planColors.free)}>
            <Crown className="mr-1 h-3 w-3" />
            {user.plan}
          </Badge>
          <Badge variant="outline" className="uppercase text-[10px]">
            {user.role}
          </Badge>
        </div>
      </div>

      <div className="rounded-xl border border-white/5 bg-white/[0.02] p-6">
        <h2 className="mb-4 text-lg font-bold tracking-tight text-foreground">Account Details</h2>
        <div className="space-y-4">
          <div className="flex items-center gap-4 rounded-xl border border-white/5 bg-white/[0.01] px-4 py-3">
            <User className="h-5 w-5 text-cyan-400" />
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Name</p>
              <p className="text-sm font-medium text-foreground">{user.name || "Not set"}</p>
            </div>
          </div>
          <div className="flex items-center gap-4 rounded-xl border border-white/5 bg-white/[0.01] px-4 py-3">
            <Mail className="h-5 w-5 text-cyan-400" />
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Email</p>
              <p className="text-sm font-medium text-foreground">{user.email}</p>
            </div>
          </div>
          <div className="flex items-center gap-4 rounded-xl border border-white/5 bg-white/[0.01] px-4 py-3">
            <AtSign className="h-5 w-5 text-cyan-400" />
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Username</p>
              <p className="text-sm font-medium text-foreground">{user.username || "Not set"}</p>
            </div>
          </div>
          <div className="flex items-center gap-4 rounded-xl border border-white/5 bg-white/[0.01] px-4 py-3">
            <Calendar className="h-5 w-5 text-cyan-400" />
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Member Since</p>
              <p className="text-sm font-medium text-foreground">{new Date(user.created_at).toLocaleDateString()}</p>
            </div>
          </div>
          <div className="flex items-center gap-4 rounded-xl border border-white/5 bg-white/[0.01] px-4 py-3">
            <ShieldCheck className="h-5 w-5 text-cyan-400" />
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Role</p>
              <p className="text-sm font-medium text-foreground capitalize">{user.role}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
