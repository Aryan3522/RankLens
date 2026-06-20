import { useState, useEffect } from "react";
import { Globe, Send, Plus, Trash2, CheckCircle, XCircle, Loader2, ExternalLink, Crown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { isAuthenticated, getCurrentUserFromToken } from "@/api/auth";
import { useLocation } from "wouter";
import { GscConnectModal, isGscConnected, getGscCredentials } from "@/components/gsc-connect-modal";

interface Site {
  id: string;
  domain: string;
  verified: boolean;
  verification_token: string | null;
  created_at: string;
}

interface Submission {
  id: string;
  url: string;
  platform: string;
  status: string;
  response: string | null;
  created_at: string;
}

interface PlatformStat {
  platform: string;
  total: number;
  indexed: number;
  failed: number;
  pending: number;
}

interface DetailedStats {
  total: number;
  totalIndexed: number;
  totalFailed: number;
  totalPending: number;
  byPlatform: PlatformStat[];
  bySite: {
    id: string;
    domain: string;
    verified: number;
    total_submissions: number;
    indexed_pages: number;
    failed_pages: number;
  }[];
  daily: { day: string; total: number; indexed: number; failed: number }[];
}

const PLATFORM_META: Record<string, { label: string; color: string }> = {
  bing: { label: "Bing", color: "text-blue-400 border-blue-500/20 bg-blue-500/10" },
  yandex: { label: "Yandex", color: "text-red-400 border-red-500/20 bg-red-500/10" },
  indexnow: { label: "IndexNow", color: "text-emerald-400 border-emerald-500/20 bg-emerald-500/10" },
  google: { label: "Google", color: "text-cyan-400 border-cyan-500/20 bg-cyan-500/10" },
};

export default function Indexing() {
  const user = getCurrentUserFromToken();
  const plan = user?.plan || "free";
  const [, navigate] = useLocation();

  useEffect(() => {
    if (!isAuthenticated()) { navigate("/login"); return; }
  }, []);

  // Free users see an upgrade prompt instead of the indexing UI
  if (plan !== "pro" && plan !== "enterprise" && user?.role !== "admin") {
    return (
      <div className="mx-auto w-full max-w-[900px] space-y-6 px-4 py-10 md:py-16 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-cyan-500/10">
          <Crown className="h-8 w-8 text-cyan-400" />
        </div>
        <h1 className="text-3xl font-black tracking-tight text-foreground">Upgrade to Access Indexing</h1>
        <p className="text-muted-foreground max-w-md mx-auto">
          The Indexing Engine lets you submit URLs to Bing, Yandex, IndexNow, and Google.
          Upgrade to Pro or Enterprise to unlock this feature.
        </p>
        <Button onClick={() => navigate("/pricing")} className="skeu-btn-primary mt-4">
          View Plans
        </Button>
      </div>
    );
  }

  const [sites, setSites] = useState<Site[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [stats, setStats] = useState<DetailedStats | null>(null);
  const [submitUrl, setSubmitUrl] = useState("");
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>(["bing"]);
  const [newDomain, setNewDomain] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [adding, setAdding] = useState(false);
  const [filter, setFilter] = useState<"all" | "indexed" | "failed">("all");
  const [gscModalOpen, setGscModalOpen] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [sitesRes, subsRes, statsRes] = await Promise.all([
        fetch("/api/sites", { headers: { Authorization: `Bearer ${localStorage.getItem("ranklens_token")}` } }),
        fetch("/api/submissions?limit=100", { headers: { Authorization: `Bearer ${localStorage.getItem("ranklens_token")}` } }),
        fetch("/api/submissions/stats", { headers: { Authorization: `Bearer ${localStorage.getItem("ranklens_token")}` } }),
      ]);
      if (sitesRes.ok) {
        const data = await sitesRes.json();
        setSites(Array.isArray(data) ? data : []);
      }
      if (subsRes.ok) {
        const data = await subsRes.json();
        setSubmissions(data.submissions || data || []);
      }
      if (statsRes.ok) {
        setStats(await statsRes.json());
      }
    } catch {
    } finally {
      setLoading(false);
    }
  };

  const handleAddSite = async () => {
    if (!newDomain) return;
    setAdding(true);
    try {
      const res = await fetch("/api/sites", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("ranklens_token")}`,
        },
        body: JSON.stringify({ domain: newDomain }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      const site = await res.json();
      setSites([site, ...sites]);
      setNewDomain("");
      toast.success("Site added! Verify ownership to start submitting.");
    } catch (err: any) {
      toast.error(err.message || "Failed to add site");
    } finally {
      setAdding(false);
    }
  };

  const handleDeleteSite = async (id: string) => {
    try {
      await fetch(`/api/sites/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${localStorage.getItem("ranklens_token")}` },
      });
      setSites(sites.filter(s => s.id !== id));
      toast.success("Site removed");
    } catch {
      toast.error("Failed to remove site");
    }
  };

  const handleVerify = async (id: string) => {
    try {
      const res = await fetch(`/api/sites/${id}/verify`, {
        method: "POST",
        headers: { Authorization: `Bearer ${localStorage.getItem("ranklens_token")}` },
      });
      const data = await res.json();
      if (data.verified) {
        setSites(sites.map(s => s.id === id ? { ...s, verified: true } : s));
        toast.success("Site verified successfully!");
      } else {
        toast.error(data.error || "Verification failed. Make sure the meta tag is in your <head>.");
      }
    } catch {
      toast.error("Verification check failed");
    }
  };

  const handleSubmit = async (retries = 1) => {
    if (!submitUrl) return;

    const platform = selectedPlatforms.includes("all") ? "all" : selectedPlatforms[0];

    if (platform === "google" && !isGscConnected()) {
      setGscModalOpen(true);
      return;
    }

    setSubmitting(true);
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 25_000);
      let res: Response;
      const body: any = {
        url: submitUrl.trim(),
        platform,
      };
      if (platform === "google") {
        const raw = getGscCredentials();
        if (raw) {
          try { body.googleCreds = JSON.parse(raw); } catch { /* ignore */ }
        }
      }
      try {
        res = await fetch("/api/submit", {
          method: "POST",
          signal: controller.signal,
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("ranklens_token")}`,
          },
          body: JSON.stringify(body),
        });
      } finally {
        clearTimeout(timeout);
      }
      if (!res.ok) throw new Error((await res.json()).error);
      const result = await res.json();
      const msgs = (result.submissions || []).map(
        (s: any) => `${s.platform}: ${s.success ? "Indexed" : "Failed"} — ${s.message}`
      ).join("\n");
      toast.success(`Submitted!\n${msgs}`);
      setSubmitUrl("");
      fetchData();
    } catch (err: any) {
      if (err.name === "AbortError") {
        toast.error("Request timed out. The search engine API may be slow.");
      } else if (err instanceof TypeError && retries > 0) {
        toast.info("Connection issue. Retrying...");
        setSubmitting(false);
        await new Promise(r => setTimeout(r, 2000));
        return handleSubmit(0);
      } else {
        toast.error(err.message || "Submission failed");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const filteredSubmissions = submissions.filter(s => {
    if (filter === "indexed") return s.status === "success";
    if (filter === "failed") return s.status === "failed";
    return true;
  });

  function platformColor(p: string) {
    return PLATFORM_META[p]?.color || "border-white/5 text-muted-foreground";
  }

  function platformLabel(p: string) {
    return PLATFORM_META[p]?.label || p;
  }

  function rate(indexed: number, total: number) {
    if (total === 0) return 0;
    return Math.round((indexed / total) * 100);
  }

  return (
    <div className="mx-auto w-full max-w-[1200px] space-y-6 px-4 py-6 md:px-8 md:py-10 pb-20">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-foreground flex items-center gap-3">
            <Globe className="h-8 w-8 text-cyan-400" />
            Indexing Engine
          </h1>
          <p className="text-sm font-medium text-muted-foreground">Submit URLs to search engines & track indexing status</p>
        </div>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1"><CheckCircle className="h-3 w-3 text-emerald-400" /> {stats?.totalIndexed || 0} indexed</span>
          <span className="flex items-center gap-1"><XCircle className="h-3 w-3 text-red-400" /> {stats?.totalFailed || 0} failed</span>
          <span className="flex items-center gap-1"><Loader2 className="h-3 w-3 text-amber-400" /> {stats?.totalPending || 0} pending</span>
        </div>
      </div>

      {stats && stats.byPlatform.length > 0 && (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {stats.byPlatform.map(p => {
            const rate_pct = rate(p.indexed, p.total);
            const meta = PLATFORM_META[p.platform] || { label: p.platform, color: "border-white/5" };
            return (
              <div key={p.platform} className="rounded-xl border border-white/5 bg-white/[0.02] p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider">{meta.label}</span>
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${meta.color}`}>
                    {rate_pct}%
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div>
                    <p className="text-lg font-black text-foreground">{p.indexed}</p>
                    <p className="text-[10px] text-muted-foreground">Indexed</p>
                  </div>
                  <div>
                    <p className="text-lg font-black text-red-400">{p.failed}</p>
                    <p className="text-[10px] text-muted-foreground">Failed</p>
                  </div>
                  <div>
                    <p className="text-lg font-black text-amber-400">{p.pending}</p>
                    <p className="text-[10px] text-muted-foreground">Pending</p>
                  </div>
                </div>
                <div className="h-1.5 w-full rounded-full bg-white/5 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-emerald-400/60 transition-all"
                    style={{ width: `${rate_pct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <div className="rounded-xl border border-white/5 bg-white/[0.02] p-5">
            <h2 className="mb-4 text-lg font-bold tracking-tight text-foreground">Quick Submit</h2>
            <div className="flex gap-3">
              <Input
                placeholder="https://yoursite.com/page-to-index"
                value={submitUrl}
                onChange={(e) => setSubmitUrl(e.target.value)}
                className="bg-muted/40 border-white/10 focus-visible:ring-cyan-500/50 focus-visible:border-cyan-500 h-11 flex-1"
              />
              <Button onClick={handleSubmit} disabled={submitting || !submitUrl} className="h-11 gap-2">
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                Submit
              </Button>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {Object.entries(PLATFORM_META).map(([key, val]) => (
                <div key={key} className="relative group">
                  <button
                    onClick={() => {
                      if (key === "google" && !isGscConnected()) {
                        setGscModalOpen(true);
                        return;
                      }
                      setSelectedPlatforms(selectedPlatforms.includes(key) ? [] : [key]);
                    }}
                    className={`rounded-lg border px-3 py-1.5 text-xs font-bold uppercase tracking-wider transition-all glow-border-effect ${
                      selectedPlatforms.includes(key)
                        ? val.color
                        : "border-white/5 text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <span className="flex items-center gap-1.5">
                      {key === "google" && isGscConnected() ? <CheckCircle className="h-3 w-3 text-emerald-400" /> : null}
                      {val.label}
                    </span>
                  </button>
                  {key === "google" && (
                    <button
                      onClick={(e) => { e.stopPropagation(); setGscModalOpen(true); }}
                      className="absolute -top-1.5 -right-1.5 h-4 w-4 rounded-full bg-muted-foreground/20 border border-white/10 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-muted-foreground/40"
                      title="Edit Google connection"
                    >
                      <svg className="h-2.5 w-2.5 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                  )}
                </div>
              ))}
              <Badge variant="outline" className="text-[10px] bg-amber-500/5 border-amber-500/20 text-amber-400/80">Pro</Badge>
            </div>
          </div>

          <div className="rounded-xl border border-white/5 bg-white/[0.02] p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold tracking-tight text-foreground">Submissions</h2>
              <div className="flex gap-1">
                {(["all", "indexed", "failed"] as const).map(t => (
                  <button
                    key={t}
                    onClick={() => setFilter(t)}
                    className={`rounded-lg border px-3 py-1 text-[11px] font-bold uppercase tracking-wider transition-all ${
                      filter === t
                        ? "border-cyan-500/20 bg-cyan-500/10 text-cyan-400"
                        : "border-white/5 text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {t === "all" ? `All (${submissions.length})` : t === "indexed" ? `Indexed (${submissions.filter(s => s.status === "success").length})` : `Failed (${submissions.filter(s => s.status === "failed").length})`}
                  </button>
                ))}
              </div>
            </div>
            {loading ? (
              <div className="space-y-2">{[1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full rounded-xl" />)}</div>
            ) : filteredSubmissions.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-sm text-muted-foreground">
                <Globe className="mb-2 h-8 w-8 text-muted-foreground/30" />
                <p>{filter === "all" ? "No submissions yet" : filter === "indexed" ? "No indexed URLs yet" : "No failed URLs"}</p>
              </div>
            ) : (
              <div className="space-y-1.5">
                {filteredSubmissions.map((s) => (
                  <div key={s.id} className="flex items-center gap-3 rounded-xl border border-white/5 bg-white/[0.01] px-4 py-2.5 transition-all hover:border-white/10">
                    {s.status === "success" ? (
                      <CheckCircle className="h-4 w-4 shrink-0 text-emerald-400" />
                    ) : s.status === "failed" ? (
                      <XCircle className="h-4 w-4 shrink-0 text-red-400" />
                    ) : (
                      <Loader2 className="h-4 w-4 shrink-0 animate-spin text-amber-400" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="truncate text-xs font-medium text-foreground">{s.url}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {new Date(s.created_at).toLocaleDateString()} {new Date(s.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        {s.response ? ` — ${s.response}` : ""}
                      </p>
                    </div>
                    <Badge variant="outline" className={`text-[9px] uppercase ${platformColor(s.platform)}`}>
                      {platformLabel(s.platform)}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-xl border border-white/5 bg-white/[0.02] p-5">
            <div className="mb-4 flex flex-col items-start justify-between gap-3">
              <h2 className="text-lg font-bold tracking-tight text-foreground">Your Sites</h2>
              <div className="flex w-full gap-2">
                <Input
                  placeholder="example.com"
                  value={newDomain}
                  onChange={(e) => setNewDomain(e.target.value)}
                  className="bg-muted/40 border-white/10 focus-visible:ring-cyan-500/50 focus-visible:border-cyan-500 h-10 flex-1 min-w-0"
                />
                <Button onClick={handleAddSite} disabled={adding || !newDomain} size="sm" className="gap-1 shrink-0">
                  <Plus className="h-4 w-4" /> Add
                </Button>
              </div>
            </div>
            {loading ? (
              <div className="space-y-2">{[1, 2].map(i => <Skeleton key={i} className="h-20 w-full rounded-xl" />)}</div>
            ) : sites.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-sm text-muted-foreground">
                <Globe className="mb-2 h-8 w-8 text-muted-foreground/30" />
                <p>Add your first site to get started</p>
              </div>
            ) : (
              <div className="space-y-2">
                {sites.map((site) => {
                  const siteStats = stats?.bySite.find(bs => bs.id === site.id);
                  const totalP = siteStats?.total_submissions || 0;
                  const indexedP = siteStats?.indexed_pages || 0;
                  const failedP = siteStats?.failed_pages || 0;
                  const rateP = rate(indexedP, totalP);
                  return (
                    <div key={site.id} className="rounded-xl border border-white/5 bg-white/[0.01] px-4 py-3 transition-all hover:border-white/10 space-y-2">
                      <div className="flex items-center gap-3">
                        <Globe className="h-5 w-5 shrink-0 text-cyan-400" />
                        <div className="flex-1 min-w-0">
                          <p className="truncate font-medium text-foreground">{site.domain}</p>
                          <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                            {site.verified ? (
                              <span className="flex items-center gap-1 text-emerald-400"><CheckCircle className="h-3 w-3" /> Verified</span>
                            ) : (
                              <span className="flex items-center gap-1 text-amber-400"><XCircle className="h-3 w-3" /> Unverified</span>
                            )}
                            <span>Added {new Date(site.created_at).toLocaleDateString()}</span>
                          </div>
                        </div>
                        <div className="flex gap-1">
                          {!site.verified && (
                            <Button size="sm" variant="outline" onClick={() => handleVerify(site.id)} className="text-[10px] h-7">
                              Verify
                            </Button>
                          )}
                          <Button size="sm" variant="outline" onClick={() => handleDeleteSite(site.id)} className="text-[10px] text-red-400 h-7">
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                      {totalP > 0 && (
                        <div className="flex items-center gap-4 text-[10px] text-muted-foreground">
                          <span>{totalP} submitted</span>
                          <span className="flex items-center gap-0.5 text-emerald-400"><CheckCircle className="h-2.5 w-2.5" /> {indexedP} indexed</span>
                          <span className="flex items-center gap-0.5 text-red-400"><XCircle className="h-2.5 w-2.5" /> {failedP} failed</span>
                          <span className="ml-auto font-bold text-foreground">{rateP}%</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {stats && stats.daily.length > 0 && (
            <div className="rounded-xl border border-white/5 bg-white/[0.02] p-5">
              <h2 className="mb-3 text-lg font-bold tracking-tight text-foreground">30-Day Activity</h2>
              <div className="space-y-1">
                {stats.daily.slice(-7).reverse().map(d => (
                  <div key={d.day} className="flex items-center gap-3 text-[11px]">
                    <span className="w-20 shrink-0 text-muted-foreground">{new Date(d.day).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</span>
                    <div className="flex-1 h-4 rounded bg-white/5 overflow-hidden flex">
                      {d.total > 0 && (
                        <>
                          <div
                            className="h-full bg-emerald-400/50 transition-all"
                            style={{ width: `${(d.indexed / d.total) * 100}%` }}
                            title={`${d.indexed} indexed`}
                          />
                          <div
                            className="h-full bg-red-400/50 transition-all"
                            style={{ width: `${(d.failed / d.total) * 100}%` }}
                            title={`${d.failed} failed`}
                          />
                        </>
                      )}
                    </div>
                    <span className="w-10 text-right text-muted-foreground">{d.total}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="rounded-xl border border-amber-500/10 bg-amber-500/[0.02] p-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-amber-400 mb-2">Coming Soon</h3>
            <ul className="space-y-1.5 text-[11px] text-muted-foreground">
              <li className="flex items-center gap-2">
                <ExternalLink className="h-3 w-3 shrink-0" />
                Google Search Console — index coverage, search traffic, queries
              </li>
              <li className="flex items-center gap-2">
                <ExternalLink className="h-3 w-3 shrink-0" />
                Bing Webmaster Tools — crawl stats, keyword rankings
              </li>
              <li className="flex items-center gap-2">
                <ExternalLink className="h-3 w-3 shrink-0" />
                Yandex Webmaster — site health, search analytics
              </li>
              <li className="flex items-center gap-2">
                <ExternalLink className="h-3 w-3 shrink-0" />
                Per-page inspection — check if a specific URL is indexed
              </li>
            </ul>
          </div>
        </div>
      </div>
      <GscConnectModal
        open={gscModalOpen}
        onOpenChange={setGscModalOpen}
        onConnected={() => setSelectedPlatforms(["google"])}
      />
    </div>
  );
}
