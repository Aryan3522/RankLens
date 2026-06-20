import { Link, useLocation } from "wouter";
import {
  LayoutDashboard,
  FolderOpen,
  Search,
  Key,
  FileText,
  Globe,
  CreditCard,
  ShieldCheck,
  LogOut,
  Menu,
  X,
  Command,
  ArrowUpRight,
  Settings,
  UserCircle,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { Lazy3D } from "@/components/three/Lazy3D";
import { CommandPalette } from "@/components/marketing/CommandPalette";
import { isAdmin, clearToken, isAuthenticated, getCurrentUserFromToken } from "@/api/auth";
import { setAuthTokenGetter } from "@/api/custom-fetch";

function useNavItems() {
  const user = getCurrentUserFromToken();
  const plan = user?.plan || "free";
  const role = user?.role || "user";
  const items = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/projects", label: "Projects", icon: FolderOpen },
    { href: "/analyzer", label: "Analyzer", icon: Search },
    { href: "/keywords", label: "Keywords", icon: Key },
    { href: "/reports", label: "Reports", icon: FileText },
    { href: "/pricing", label: "Pricing", icon: CreditCard },
  ];
  if (plan === "pro" || plan === "enterprise" || role === "admin") {
    items.splice(3, 0, { href: "/indexing", label: "Indexing", icon: Globe });
  }
  return items;
}

const ambientLoader = () => import("@/components/three/scenes/AmbientField");

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const navItems = useNavItems();

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      document.querySelectorAll(".glow-border-effect").forEach((el) => {
        const rect = (el as HTMLElement).getBoundingClientRect();
        (el as HTMLElement).style.setProperty("--mouse-x", `${e.clientX - rect.left}px`);
        (el as HTMLElement).style.setProperty("--mouse-y", `${e.clientY - rect.top}px`);
      });
    };
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  const isActive = (href: string) => location === href || location.startsWith(href + "/");
  const user = getCurrentUserFromToken();
  const adminUser = isAdmin();
  const loggedIn = isAuthenticated();

  const handleLogout = () => {
    clearToken();
    setAuthTokenGetter(() => null);
    window.location.href = "/";
  };

  const iconOnlyClass =
    "flex items-center justify-center w-full px-0 py-3.5 text-muted-foreground hover:text-foreground transition-colors border-l-2 border-transparent";
  const expandedClass =
    "flex items-center gap-4 px-5 py-3.5 text-sm font-bold uppercase tracking-widest transition-all border-l-2";

  const linkClass = (href: string, activeColor = "text-cyan-400 border-cyan-500/30") =>
    sidebarOpen
      ? cn(
          expandedClass,
          isActive(href)
            ? `${activeColor} bg-cyan-500/5`
            : "border-transparent text-muted-foreground hover:text-foreground hover:border-white/20 hover:bg-white/[0.02]",
        )
      : cn(
          iconOnlyClass,
          isActive(href) ? "text-cyan-400 border-cyan-500/30 bg-cyan-500/5" : "hover:border-white/20",
        );

  return (
    <div className="relative flex h-[100dvh] overflow-hidden bg-background">
      <Lazy3D
        className="pointer-events-none fixed inset-0 -z-10 opacity-60"
        loader={ambientLoader}
        fallback={<div aria-hidden className="aurora-bg fixed inset-0 -z-10" />}
      />

      {/* Mobile header */}
      <header className="fixed top-0 left-0 right-0 z-30 flex items-center justify-between border-b border-white/5 bg-background/80 backdrop-blur-xl px-4 py-3 lg:hidden">
        <Link href="/dashboard" className="flex items-center gap-3" onClick={() => setMobileOpen(false)}>
          <div className="grid h-9 w-9 place-items-center rounded-lg border border-cyan-500/20 bg-cyan-500/10">
            <Command className="h-4 w-4 text-cyan-400" />
          </div>
          <span className="text-base font-black tracking-tighter text-foreground">RankLens</span>
        </Link>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Toggle menu"
            className="rounded-lg border border-white/10 p-2 text-cyan-400 transition-colors hover:bg-cyan-500/10"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </header>

      {/* Mobile nav backdrop */}
      {mobileOpen && (
        <div className="fixed inset-0 z-30 bg-black/40 backdrop-blur-sm lg:hidden" onClick={() => setMobileOpen(false)} />
      )}

      {/* Mobile sidebar (overlay from left) */}
      <aside
        className={cn(
          "fixed left-0 top-0 z-40 flex h-full w-72 flex-col border-r border-white/5 bg-background/95 backdrop-blur-2xl transition-transform duration-300 ease-in-out lg:hidden",
          mobileOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex items-center justify-between border-b border-white/5 px-5 py-4">
          <Link href="/dashboard" className="flex items-center gap-3" onClick={() => setMobileOpen(false)}>
            <div className="grid h-9 w-9 place-items-center rounded-lg border border-cyan-500/20 bg-cyan-500/10">
              <Command className="h-4 w-4 text-cyan-400" />
            </div>
            <span className="text-base font-black tracking-tighter text-foreground">RankLens</span>
          </Link>
          <button onClick={() => setMobileOpen(false)} className="rounded-lg p-1.5 text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>
        <nav className="flex-1 space-y-1 overflow-y-auto py-4">
          {navItems.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              onClick={() => setMobileOpen(false)}
              className={cn(
                "flex items-center gap-4 px-5 py-3.5 text-sm font-bold uppercase tracking-widest transition-all border-l-2",
                isActive(href)
                  ? "text-cyan-400 border-cyan-500/30 bg-cyan-500/5"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:border-white/20",
              )}
            >
              <Icon className="h-4 w-4 shrink-0" /> {label}
            </Link>
          ))}
        </nav>
        <div className="border-t border-white/5 py-3 space-y-1">
          {loggedIn && (
            <>
              <Link href="/profile" onClick={() => setMobileOpen(false)}
                className={cn("flex items-center gap-4 px-5 py-3.5 text-sm font-bold uppercase tracking-widest transition-all border-l-2",
                  isActive("/profile") ? "text-cyan-400 border-cyan-500/30 bg-cyan-500/5" : "border-transparent text-muted-foreground hover:text-foreground")}>
                <UserCircle className="h-4 w-4" /> Profile
              </Link>
              <Link href="/settings" onClick={() => setMobileOpen(false)}
                className={cn("flex items-center gap-4 px-5 py-3.5 text-sm font-bold uppercase tracking-widest transition-all border-l-2",
                  isActive("/settings") ? "text-cyan-400 border-cyan-500/30 bg-cyan-500/5" : "border-transparent text-muted-foreground hover:text-foreground")}>
                <Settings className="h-4 w-4" /> Settings
              </Link>
            </>
          )}
          {adminUser && (
            <Link href="/admin" onClick={() => setMobileOpen(false)}
              className={cn("flex items-center gap-4 px-5 py-3.5 text-sm font-bold uppercase tracking-widest transition-all border-l-2",
                isActive("/admin") ? "text-purple-400 border-purple-500/30 bg-purple-500/5" : "border-transparent text-muted-foreground hover:text-foreground")}>
              <ShieldCheck className="h-4 w-4" /> Admin
            </Link>
          )}
          <div className="mx-5 my-2 border-t border-white/5" />
          <div className="flex items-center justify-between px-5 py-2">
            <span className="flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-widest text-emerald-400">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
              {loggedIn ? "Connected" : "Guest"}
            </span>
            <ThemeToggle />
          </div>
          {loggedIn ? (
            <button onClick={() => { handleLogout(); setMobileOpen(false); }}
              className="flex w-full items-center gap-4 px-5 py-3.5 text-sm font-bold uppercase tracking-widest text-muted-foreground transition-all hover:text-red-400 border-l-2 border-transparent hover:border-red-500/30">
              <LogOut className="h-4 w-4" /> Logout
            </button>
          ) : (
            <Link href="/login" onClick={() => setMobileOpen(false)}
              className="flex items-center gap-4 px-5 py-3.5 text-sm font-bold uppercase tracking-widest text-muted-foreground transition-all hover:text-cyan-400 border-l-2 border-transparent hover:border-cyan-500/30">
              <ArrowUpRight className="h-4 w-4" /> Sign in
            </Link>
          )}
        </div>
      </aside>

      {/* Desktop sidebar - collapsible from icons-only to full */}
      <aside
        className={cn(
          "hidden lg:flex flex-col border-r border-white/5 bg-background/80 transition-all duration-300 ease-in-out",
          sidebarOpen ? "w-64" : "w-16",
        )}
      >
        {/* Logo area */}
        <div className={cn("flex items-center border-b border-white/5 h-16", sidebarOpen ? "px-5" : "justify-center")}>
          {sidebarOpen ? (
            <Link href="/dashboard" className="flex items-center gap-3">
              <div className="grid h-9 w-9 place-items-center rounded-lg border border-cyan-500/20 bg-cyan-500/10">
                <Command className="h-4 w-4 text-cyan-400" />
              </div>
              <span className="text-base font-black tracking-tighter text-foreground">RankLens</span>
            </Link>
          ) : (
            <Link href="/dashboard">
              <div className="grid h-9 w-9 place-items-center rounded-lg border border-cyan-500/20 bg-cyan-500/10">
                <Command className="h-4 w-4 text-cyan-400" />
              </div>
            </Link>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-2">
          {navItems.map(({ href, label, icon: Icon }) => (
            <Link key={href} href={href} className={linkClass(href)} title={sidebarOpen ? undefined : label}>
              <div className={cn(sidebarOpen ? "" : "flex justify-center w-full")}>
                <Icon className={cn("shrink-0", sidebarOpen ? "h-4 w-4" : "h-5 w-5")} />
              </div>
              {sidebarOpen && <span>{label}</span>}
            </Link>
          ))}
        </nav>

        {/* Bottom section */}
        <div className="border-t border-white/5 py-2">
          {loggedIn && (
            <>
              <Link href="/profile" className={linkClass("/profile")} title={sidebarOpen ? undefined : "Profile"}>
                <div className={cn(sidebarOpen ? "" : "flex justify-center w-full")}>
                  <UserCircle className={cn("shrink-0", sidebarOpen ? "h-4 w-4" : "h-5 w-5")} />
                </div>
                {sidebarOpen && <span>Profile</span>}
              </Link>
              <Link href="/settings" className={linkClass("/settings")} title={sidebarOpen ? undefined : "Settings"}>
                <div className={cn(sidebarOpen ? "" : "flex justify-center w-full")}>
                  <Settings className={cn("shrink-0", sidebarOpen ? "h-4 w-4" : "h-5 w-5")} />
                </div>
                {sidebarOpen && <span>Settings</span>}
              </Link>
            </>
          )}
          {adminUser && (
            <Link href="/admin" className={linkClass("/admin", "text-purple-400 border-purple-500/30")} title={sidebarOpen ? undefined : "Admin"}>
              <div className={cn(sidebarOpen ? "" : "flex justify-center w-full")}>
                <ShieldCheck className={cn("shrink-0", sidebarOpen ? "h-4 w-4" : "h-5 w-5")} />
              </div>
              {sidebarOpen && <span>Admin</span>}
            </Link>
          )}
          {sidebarOpen && <div className="mx-5 my-2 border-t border-white/5" />}
          {sidebarOpen ? (
            <div className="flex items-center justify-between px-5 py-2">
              <span className="flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-widest text-emerald-400">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
                {loggedIn ? "Connected" : "Guest"}
              </span>
              <ThemeToggle />
            </div>
          ) : (
            <div className="flex justify-center py-2">
              <ThemeToggle />
            </div>
          )}
          {loggedIn ? (
            <button onClick={handleLogout}
              className={sidebarOpen
                ? "flex w-full items-center gap-4 px-5 py-3.5 text-sm font-bold uppercase tracking-widest text-muted-foreground transition-all hover:text-red-400 border-l-2 border-transparent hover:border-red-500/30"
                : "flex items-center justify-center w-full py-3.5 text-muted-foreground hover:text-red-400 transition-colors"}
              title={sidebarOpen ? undefined : "Logout"}
            >
              <LogOut className={cn("shrink-0", sidebarOpen ? "h-4 w-4" : "h-5 w-5")} />
              {sidebarOpen && <span>Logout</span>}
            </button>
          ) : (
            <Link href="/login"
              className={sidebarOpen
                ? "flex items-center gap-4 px-5 py-3.5 text-sm font-bold uppercase tracking-widest text-muted-foreground transition-all hover:text-cyan-400 border-l-2 border-transparent hover:border-cyan-500/30"
                : "flex items-center justify-center w-full py-3.5 text-muted-foreground hover:text-cyan-400 transition-colors"}
              title={sidebarOpen ? undefined : "Sign in"}
            >
              <ArrowUpRight className={cn("shrink-0", sidebarOpen ? "h-4 w-4" : "h-5 w-5")} />
              {sidebarOpen && <span>Sign in</span>}
            </Link>
          )}

          {/* Toggle button */}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="flex items-center justify-center w-full py-3 text-muted-foreground hover:text-cyan-400 transition-colors border-t border-white/5 mt-2"
            aria-label={sidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
          >
            {sidebarOpen ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="relative z-10 flex min-w-0 flex-1 flex-col overflow-y-auto overflow-x-hidden pt-16 lg:pt-0">
        <div className="flex-1">{children}</div>
      </main>

      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />
    </div>
  );
}
