import { Link, useLocation } from "wouter";
import { LayoutDashboard, FolderOpen, Search, Key, FileText, BarChart2, Menu, X, Command } from "lucide-react";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/projects", label: "Projects", icon: FolderOpen },
  { href: "/analyzer", label: "Analyzer", icon: Search },
  { href: "/keywords", label: "Keywords", icon: Key },
  { href: "/reports", label: "Reports", icon: FileText },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [location, setLocation] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  // Global cursor tracker for futuristic glow border effects
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      document.querySelectorAll('.glow-border-effect').forEach((el) => {
        const rect = (el as HTMLElement).getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        (el as HTMLElement).style.setProperty('--mouse-x', `${x}px`);
        (el as HTMLElement).style.setProperty('--mouse-y', `${y}px`);
      });
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  return (
    <div className="flex flex-col lg:flex-row h-[100dvh] bg-transparent p-4 relative overflow-hidden gap-4 lg:gap-0">
      {/* Background elements are handled in body css */}
      
      {/* Floating HUD Sidebar (Desktop) */}
      <aside className="hidden lg:flex flex-col w-20 hover:w-64 transition-all duration-300 ease-in-out shrink-0 glass-panel rounded-2xl mr-4 overflow-hidden z-20 group relative glow-border-effect">
        <div className="p-4 flex items-center whitespace-nowrap border-b border-white/5 overflow-hidden">
          <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center shrink-0 shadow-[0_0_15px_rgba(6,182,212,0.2)]">
            <Command className="w-5 h-5 text-cyan-400" />
          </div>
          <span className="font-black tracking-tighter text-lg text-foreground opacity-0 group-hover:opacity-100 transition-opacity duration-300 neon-text-cyan ml-4">
            SYS_CMD
          </span>
        </div>
        
        <nav className="flex-1 py-4 px-2 space-y-1 overflow-y-auto overflow-x-hidden scrollbar-hide">
          {navItems.map(({ href, label, icon: Icon }) => {
            const active = location === href || location.startsWith(href + "/");
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex items-center px-3 py-3 rounded-xl font-bold transition-all whitespace-nowrap border relative cursor-pointer overflow-hidden",
                  active
                    ? "bg-cyan-500/5 text-cyan-400 border-cyan-500/20 shadow-[inset_0_0_15px_rgba(6,182,212,0.05)] glow-border-effect"
                    : "text-muted-foreground hover:bg-white/5 hover:text-white border-transparent hover:border-white/10 glow-border-effect"
                )}
              >
                <div className="w-10 flex items-center justify-center shrink-0">
                  <Icon className="w-5 h-5 shrink-0" />
                </div>
                <span className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 tracking-widest uppercase text-xs ml-3">{label}</span>
              </Link>
            );
          })}
        </nav>
        
        <div className="p-4 border-t border-white/5 whitespace-nowrap overflow-hidden flex items-center">
          <div className="w-10 flex items-center justify-center shrink-0">
            <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)] animate-pulse" />
          </div>
          <span className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 text-[10px] font-mono text-emerald-400 uppercase tracking-widest ml-3">
            Uplink Active
          </span>
        </div>
      </aside>

      {/* Mobile Header HUD (Mobile/Tablet) */}
      <header className="lg:hidden shrink-0 glass-panel rounded-2xl flex items-center justify-between p-3 glow-border-effect z-40">
        <Link href="/dashboard" className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center shadow-[0_0_15px_rgba(6,182,212,0.2)]">
            <Command className="w-5 h-5 text-cyan-400" />
          </div>
          <span className="font-black tracking-tighter text-lg text-foreground neon-text-cyan">SYS_CMD</span>
        </Link>
        <button onClick={() => setMobileOpen(!mobileOpen)} className="text-cyan-400 p-2 hover:bg-cyan-500/10 rounded-xl transition-colors border border-transparent hover:border-cyan-500/20">
          {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </header>

      {/* Mobile nav overlay */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-30 bg-black/95 backdrop-blur-3xl pt-24 px-4 overflow-y-auto">
          <nav className="space-y-2">
            {navItems.map(({ href, label, icon: Icon }) => {
              const active = location === href || location.startsWith(href + "/");
              return (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setMobileOpen(false)}
                  className={cn(
                    "flex items-center gap-4 px-4 py-4 rounded-xl font-bold transition-all text-sm uppercase tracking-widest border",
                    active
                      ? "bg-cyan-500/5 text-cyan-400 border-cyan-500/20 shadow-[inset_0_0_15px_rgba(6,182,212,0.05)] glow-border-effect"
                      : "text-muted-foreground hover:bg-white/5 hover:text-white border-white/5 glow-border-effect"
                  )}
                >
                  <Icon className="w-5 h-5" />
                  {label}
                </Link>
              );
            })}
          </nav>
        </div>
      )}

      {/* Main Viewport */}
      <main className="flex-1 min-w-0 min-h-0 relative z-10 glass-panel rounded-2xl glow-border-effect overflow-y-auto overflow-x-hidden flex flex-col">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(6,182,212,0.03),transparent_50%)] pointer-events-none" />
        <div className="relative z-10 flex-1 p-4 md:p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
