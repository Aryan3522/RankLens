import { Link, useLocation } from "wouter";
import { LayoutDashboard, FolderOpen, Search, Key, FileText, BarChart2, Menu, X } from "lucide-react";
import { useState } from "react";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/projects", label: "Projects", icon: FolderOpen },
  { href: "/analyzer", label: "Analyzer", icon: Search },
  { href: "/keywords", label: "Keywords", icon: Key },
  { href: "/reports", label: "Reports", icon: FileText },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-background">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-56 shrink-0 bg-sidebar border-r border-sidebar-border">
        <div className="p-5 border-b border-sidebar-border">
          <Link href="/dashboard" className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-md bg-sidebar-primary flex items-center justify-center">
              <BarChart2 className="w-4 h-4 text-white" />
            </div>
            <span className="text-sidebar-foreground font-bold text-sm tracking-tight">SEO Intelligence</span>
          </Link>
        </div>
        <nav className="flex-1 py-4 px-3 space-y-0.5">
          {navItems.map(({ href, label, icon: Icon }) => {
            const active = location === href || location.startsWith(href + "/");
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  active
                    ? "bg-sidebar-primary text-sidebar-primary-foreground"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                {label}
              </Link>
            );
          })}
        </nav>
        <div className="p-4 border-t border-sidebar-border">
          <p className="text-xs text-sidebar-foreground/40">SEO Intelligence v1.0</p>
        </div>
      </aside>

      {/* Mobile header */}
      <div className="md:hidden fixed top-0 inset-x-0 z-40 h-14 bg-sidebar border-b border-sidebar-border flex items-center justify-between px-4">
        <Link href="/dashboard" className="flex items-center gap-2">
          <div className="w-6 h-6 rounded bg-sidebar-primary flex items-center justify-center">
            <BarChart2 className="w-3.5 h-3.5 text-white" />
          </div>
          <span className="text-sidebar-foreground font-bold text-sm">SEO Intelligence</span>
        </Link>
        <button onClick={() => setMobileOpen(!mobileOpen)} className="text-sidebar-foreground/70 p-1">
          {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile nav overlay */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-30 bg-sidebar pt-14">
          <nav className="p-4 space-y-1">
            {navItems.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                onClick={() => setMobileOpen(false)}
                className="flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium text-sidebar-foreground/80 hover:bg-sidebar-accent"
              >
                <Icon className="w-4 h-4" />
                {label}
              </Link>
            ))}
          </nav>
        </div>
      )}

      <main className="flex-1 min-w-0 md:pt-0 pt-14">
        {children}
      </main>
    </div>
  );
}
