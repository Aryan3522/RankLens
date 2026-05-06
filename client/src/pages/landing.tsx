import { Link } from "wouter";
import { BarChart2, Search, Key, FileText, TrendingUp, Globe, ArrowRight, CheckCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";

const features = [
  {
    icon: Globe,
    title: "Website SEO Analyzer",
    description: "Deep-crawl any website. Analyze meta tags, heading structure, internal links, page speed, and 50+ ranking signals in seconds.",
  },
  {
    icon: Search,
    title: "Multi-Platform Analysis",
    description: "Analyze not just websites but also YouTube videos and Instagram posts. Get platform-specific SEO recommendations for each.",
  },
  {
    icon: Key,
    title: "Keyword Tracking",
    description: "Track keyword rankings over time. Monitor trends, detect drops before they hurt traffic, and spot new opportunities.",
  },
  {
    icon: TrendingUp,
    title: "AI Recommendations",
    description: "Priority-ranked, actionable recommendations with estimated impact scores — not vague advice, but specific improvements you can ship today.",
  },
  {
    icon: BarChart2,
    title: "Analytics Dashboard",
    description: "Score trend charts, issue breakdowns by category, and a real-time activity feed across all your tracked projects.",
  },
  {
    icon: FileText,
    title: "Reports & Exports",
    description: "Full analysis reports with all issues, recommendations, and crawl data — organized by priority and ready to share.",
  },
];

const checks = [
  "SEO score 0–100",
  "Critical issue detection",
  "Keyword density analysis",
  "Meta tag audit",
  "Broken link detection",
  "Mobile responsiveness check",
];

export default function Landing() {
  const { user, isLoading } = useAuth();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <BarChart2 className="w-4.5 h-4.5 text-white" />
            </div>
            <span className="font-bold text-lg text-foreground">SEO Intelligence</span>
          </div>
          <Link href={user ? "/dashboard" : "/auth"}>
            <Button size="sm" data-testid="button-get-started-header" disabled={isLoading}>
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : user ? (
                "Open Dashboard"
              ) : (
                "Login"
              )}
            </Button>
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-6 pt-20 pb-24 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-accent text-accent-foreground text-xs font-semibold mb-6 border border-accent-border">
          <span className="w-1.5 h-1.5 rounded-full bg-primary" />
          Analyze • Track • Improve
        </div>
        <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight text-foreground mb-6 leading-tight">
          A command center for<br />
          <span className="text-primary">search dominance</span>
        </h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed">
          Deep-crawl websites, track keyword rankings, and get AI-powered recommendations across web, YouTube, and Instagram — all in one sharp, data-driven platform.
        </p>
        <div className="flex items-center justify-center gap-4 flex-wrap">
          <Link href={user ? "/dashboard" : "/auth"}>
            <Button size="lg" className="gap-2 text-base px-7 py-5 min-w-[180px]" data-testid="button-hero-cta" disabled={isLoading}>
              {isLoading ? (
                <Loader2 className="h-5 w-5 animate-spin mx-auto" />
              ) : user ? (
                <>
                  Go to Dashboard
                  <ArrowRight className="w-4 h-4" />
                </>
              ) : (
                <>
                  Get Started Now
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </Button>
          </Link>
          <Link href="/analyzer">
            <Button variant="outline" size="lg" className="gap-2 text-base px-7 py-5" data-testid="button-hero-analyze">
              Analyze a URL
            </Button>
          </Link>
        </div>
      </section>

      {/* Feature checks */}
      <section className="bg-accent/40 border-y border-border py-10">
        <div className="max-w-4xl mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {checks.map((check) => (
              <div key={check} className="flex items-center gap-2.5 text-sm text-foreground font-medium">
                <CheckCircle className="w-4 h-4 text-primary shrink-0" />
                {check}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-6xl mx-auto px-6 py-24">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold text-foreground mb-3">Everything you need to rank higher</h2>
          <p className="text-muted-foreground text-lg max-w-xl mx-auto">Built for technical SEOs, marketers, and content teams who know that every tag and keyword matters.</p>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map(({ icon: Icon, title, description }) => (
            <div key={title} className="p-6 rounded-xl border border-border bg-card hover:shadow-md transition-shadow">
              <div className="w-10 h-10 rounded-lg bg-accent flex items-center justify-center mb-4">
                <Icon className="w-5 h-5 text-primary" />
              </div>
              <h3 className="font-semibold text-foreground mb-2">{title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="bg-sidebar py-20">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">Ready to improve your rankings?</h2>
          <p className="text-sidebar-foreground/70 mb-8 text-lg">Start analyzing your first URL in seconds. No setup required.</p>
          <Link href="/analyzer">
            <Button size="lg" variant="secondary" className="gap-2 text-base px-8 py-5" data-testid="button-bottom-cta">
              Analyze Now
              <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
        </div>
      </section>

      <footer className="border-t border-border py-8 text-center text-sm text-muted-foreground">
        <p>SEO Intelligence Platform &copy; {new Date().getFullYear()}</p>
      </footer>
    </div>
  );
}
