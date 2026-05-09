import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { 
  BarChart2, ShieldCheck, Zap, Globe, Search, ArrowRight, 
  CheckCircle, LayoutDashboard, Database, Lock
} from "lucide-react";

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* Navigation */}
      <header className="px-4 lg:px-6 h-16 flex items-center border-b border-border/40 sticky top-0 bg-background/80 backdrop-blur-md z-50">
        <Link href="/" className="flex items-center justify-center gap-2">
          <div className="bg-primary p-1.5 rounded-lg">
            <Search className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="text-xl font-bold tracking-tight">RankLens</span>
        </Link>
        <nav className="ml-auto flex gap-4 sm:gap-6 items-center">
          <Link href="/dashboard">
            <Button variant="ghost" className="text-sm font-medium">Dashboard</Button>
          </Link>
          <Link href="/dashboard">
            <Button size="sm" className="gap-2">
              Launch App <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </nav>
      </header>

      <main className="flex-1">
        {/* Hero Section */}
        <section className="w-full py-12 md:py-24 lg:py-32 xl:py-48 px-4 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/5 -z-10" />
          <div className="container mx-auto max-w-6xl text-center space-y-8">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-bold uppercase tracking-widest animate-fade-in">
              <ShieldCheck className="h-3 w-3" /> 100% Local-First & Privacy Focused
            </div>
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-black tracking-tight text-foreground max-w-4xl mx-auto leading-[1.1]">
              The Ultimate SEO Intelligence Platform <span className="text-primary">In Your Browser</span>
            </h1>
            <p className="mx-auto max-w-[700px] text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
              Professional-grade SEO audits, keyword tracking, and performance analytics. No login required. No database storage. Your data never leaves your machine.
            </p>
            <div className="flex flex-col sm:flex-row justify-center items-center gap-4">
              <Link href="/dashboard">
                <Button size="lg" className="h-14 px-8 text-lg font-bold gap-2 shadow-lg shadow-primary/20">
                  Go to Dashboard <ArrowRight className="h-5 w-5" />
                </Button>
              </Link>
              <Link href="/analyzer">
                <Button variant="outline" size="lg" className="h-14 px-8 text-lg font-bold">
                  Run Quick Scan
                </Button>
              </Link>
            </div>
            <div className="flex items-center justify-center gap-8 pt-8 opacity-50 grayscale hover:grayscale-0 transition-all duration-500 overflow-x-auto pb-4">
              <div className="flex items-center gap-2 shrink-0">
                <LayoutDashboard className="h-5 w-5" /> <span className="font-bold">Dashboard</span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Zap className="h-5 w-5" /> <span className="font-bold">Lighthouse</span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Globe className="h-5 w-5" /> <span className="font-bold">Multi-Page</span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Search className="h-5 w-5" /> <span className="font-bold">Keywords</span>
              </div>
            </div>
          </div>
        </section>

        {/* Features Grid */}
        <section className="w-full py-12 md:py-24 lg:py-32 bg-muted/30">
          <div className="container mx-auto px-4 max-w-6xl">
            <div className="grid gap-12 lg:grid-cols-3">
              <div className="flex flex-col items-start space-y-4 p-6 rounded-2xl bg-card border border-border shadow-sm">
                <div className="p-3 rounded-xl bg-primary/10 text-primary">
                  <Lock className="h-6 w-6" />
                </div>
                <h3 className="text-xl font-bold">Zero-Login Privacy</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Start analyzing instantly. No accounts, no emails, and no passwords. RankLens uses your browser's local storage (IndexedDB) to keep your projects private.
                </p>
              </div>
              <div className="flex flex-col items-start space-y-4 p-6 rounded-2xl bg-card border border-border shadow-sm">
                <div className="p-3 rounded-xl bg-blue-100 text-blue-600">
                  <Zap className="h-6 w-6" />
                </div>
                <h3 className="text-xl font-bold">Deep Performance Audits</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Powered by Google Lighthouse. Get real-time scores for Performance, Accessibility, Best Practices, and SEO. View source code and fix examples.
                </p>
              </div>
              <div className="flex flex-col items-start space-y-4 p-6 rounded-2xl bg-card border border-border shadow-sm">
                <div className="p-3 rounded-xl bg-emerald-100 text-emerald-600">
                  <BarChart2 className="h-6 w-6" />
                </div>
                <h3 className="text-xl font-bold">Relentless Tracking</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Monitor keywords across your projects. Save history, generate reports, and track your climb to the top of SERPs with built-in analytics.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Technical Detail Section */}
        <section className="w-full py-12 md:py-24 lg:py-32 px-4">
          <div className="container mx-auto max-w-6xl">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div className="space-y-6">
                <h2 className="text-3xl md:text-5xl font-black tracking-tight leading-tight">
                  The Power of a SaaS,<br/>
                  <span className="text-primary">Without the Server.</span>
                </h2>
                <div className="space-y-4">
                  <div className="flex gap-4">
                    <CheckCircle className="h-6 w-6 text-primary shrink-0" />
                    <div>
                      <h4 className="font-bold">Relational Local Database</h4>
                      <p className="text-muted-foreground text-sm">IndexedDB implementation that stores projects, analyses, and keywords relationally.</p>
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <CheckCircle className="h-6 w-6 text-primary shrink-0" />
                    <div>
                      <h4 className="font-bold">Stateless AI & Scrapers</h4>
                      <p className="text-muted-foreground text-sm">Our backend only handles the heavy lifting of crawling and Lighthouse audits.</p>
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <CheckCircle className="h-6 w-6 text-primary shrink-0" />
                    <div>
                      <h4 className="font-bold">Offline Resilience</h4>
                      <p className="text-muted-foreground text-sm">Access your previously scanned results and history even without an internet connection.</p>
                    </div>
                  </div>
                </div>
                <Link href="/dashboard">
                  <Button size="lg" className="rounded-full px-8 gap-2">
                    Enter Dashboard <LayoutDashboard className="h-4 w-4" />
                  </Button>
                </Link>
              </div>
              <div className="relative aspect-video rounded-3xl border border-border bg-muted/50 overflow-hidden shadow-2xl flex items-center justify-center p-8">
                 <div className="grid grid-cols-2 gap-4 w-full h-full opacity-60">
                    <div className="bg-card border border-border rounded-xl p-4 flex items-center justify-center font-black text-2xl">SEO</div>
                    <div className="bg-card border border-border rounded-xl p-4 flex items-center justify-center font-black text-2xl">PRIVACY</div>
                    <div className="bg-card border border-border rounded-xl p-4 flex items-center justify-center font-black text-2xl">LOCAL</div>
                    <div className="bg-card border border-border rounded-xl p-4 flex items-center justify-center font-black text-2xl">SPEED</div>
                 </div>
                 <div className="absolute inset-0 bg-gradient-to-t from-background to-transparent" />
                 <div className="absolute bottom-6 left-6 right-6 p-4 bg-background/80 backdrop-blur rounded-xl border border-border flex items-center gap-4">
                    <div className="bg-primary/20 p-2 rounded-lg"><Database className="h-6 w-6 text-primary" /></div>
                    <div>
                      <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">Current Status</p>
                      <p className="text-sm font-bold">100% Local IndexedDB Active</p>
                    </div>
                 </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="w-full py-6 px-4 border-t border-border/40">
        <div className="container mx-auto flex flex-col md:flex-row justify-between items-center gap-4 text-muted-foreground">
          <p className="text-xs">© 2026 RankLens SEO Platform. Built for privacy.</p>
          <div className="flex gap-4 sm:gap-6">
            <Link href="#" className="text-xs hover:underline underline-offset-4">Terms of Service</Link>
            <Link href="#" className="text-xs hover:underline underline-offset-4">Privacy</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
