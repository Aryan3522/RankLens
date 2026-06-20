import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useLocation } from "wouter";
import { Check, Crown, Zap, Shield, ArrowRight, X, Copy, ExternalLink, Loader2, CreditCard, Smartphone } from "lucide-react";
import QRCode from "qrcode";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { isAuthenticated } from "@/api/auth";
import { getPaymentInfo, requestPayment, type PaymentInfo } from "@/api/payments";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const PLANS = [
  {
    id: "free" as const,
    name: "Free",
    price: "₹0",
    period: "forever",
    description: "Perfect for trying RankLens",
    features: [
      "Unlimited SEO Analysis",
      "Unlimited AI Visibility Analysis",
      "Keyword & Technical Audits",
      "30-day Analysis History",
    ],
    cta: "Get started",
    popular: false,
  },
  {
    id: "pro" as const,
    name: "Pro",
    price: "₹49",
    period: "/month",
    yearlyPrice: "₹39",
    yearlyLabel: "/month, billed yearly",
    description: "For professionals who need to actively manage search presence",
    features: [
      "Everything in Free",
      "Bing / Yandex / Yahoo URL Submission",
      "IndexNow Protocol Access",
      "Sitemap Generation & Submission",
      "Google Search Console Dashboard",
      "Up to 10 Sites",
      "12-month Submission History",
      "Cloud data sync (cross-device)",
      "Reduced analysis wait time",
      "Email Support (48h)",
    ],
    cta: "Subscribe to Pro",
    popular: true,
  },
  {
    id: "enterprise" as const,
    name: "Enterprise",
    price: "₹199",
    period: "/month",
    yearlyPrice: "₹179",
    yearlyLabel: "/month, billed yearly",
    description: "For agencies & large-scale site portfolios",
    features: [
      "Everything in Pro",
      "Unlimited Sites",
      "Bulk URL Upload (CSV)",
      "Up to 10 Team Seats",
      "White-Label Reports",
      "API Access",
      "Full Google Search Console OAuth",
      "Custom Integrations (Webhooks)",
      "Sitemap Hosting on RankLens CDN",
      "Instant analysis — no wait time",
      "Priority Support (24h + Slack)",
      "99.9% Uptime SLA",
    ],
    cta: "Subscribe to Enterprise",
    popular: false,
  },
];

export default function Pricing() {
  const [yearly, setYearly] = useState(false);
  const [, navigate] = useLocation();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [selectedBilling, setSelectedBilling] = useState<"monthly" | "yearly">("monthly");
  const [paymentInfo, setPaymentInfo] = useState<PaymentInfo | null>(null);
  const [userUpiId, setUserUpiId] = useState("");
  const [payInitiated, setPayInitiated] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [copied, setCopied] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const drawerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    getPaymentInfo().then(setPaymentInfo).catch(() => {});
  }, []);

  useEffect(() => {
    if (drawerOpen && paymentInfo && selectedPlan) {
      const amounts_: Record<string, Record<string, number>> = {
        pro: { monthly: 49, yearly: 39 },
        enterprise: { monthly: 199, yearly: 179 },
      };
      const amt = amounts_[selectedPlan]?.[selectedBilling];
      if (!amt) return;
      const total = selectedBilling === "yearly" ? amt * 12 : amt;
      const upiDeepLink = `upi://pay?pa=${paymentInfo.upiId}&pn=${encodeURIComponent(paymentInfo.payeeName)}&am=${total}&cu=INR&tn=${encodeURIComponent(paymentInfo.note)}`;
      QRCode.toDataURL(upiDeepLink, { width: 220, margin: 2, color: { dark: "#06b6d4", light: "#00000000" } })
        .then(url => setQrDataUrl(url))
        .catch(() => setQrDataUrl(null));
    } else {
      setQrDataUrl(null);
    }
  }, [drawerOpen, selectedPlan, selectedBilling, paymentInfo]);

  const handleSubscribe = (planId: string) => {
    if (!isAuthenticated()) {
      navigate("/login");
      return;
    }
    if (planId === "free") {
      navigate("/dashboard");
      return;
    }
    setSelectedPlan(planId);
    setSelectedBilling(yearly ? "yearly" : "monthly");
    setSubmitted(false);
    setPayInitiated(false);
    setUserUpiId("");
    setDrawerOpen(true);
  };

  const closeDrawer = () => {
    setDrawerOpen(false);
    setSelectedPlan(null);
    setSubmitted(false);
    setPayInitiated(false);
  };

  const handleCopyUpi = () => {
    if (paymentInfo?.upiId) {
      navigator.clipboard.writeText(paymentInfo.upiId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast.success("UPI ID copied!");
    }
  };

  const handleOpenUpiApp = () => {
    if (!paymentInfo || !selectedPlan) return;
    const amounts: Record<string, Record<string, number>> = {
      pro: { monthly: 49, yearly: 39 },
      enterprise: { monthly: 199, yearly: 179 },
    };
    const amt = amounts[selectedPlan]?.[selectedBilling];
    if (!amt) return;
    const total = selectedBilling === "yearly" ? amt * 12 : amt;
    const upiDeepLink = `upi://pay?pa=${paymentInfo.upiId}&pn=${encodeURIComponent(paymentInfo.payeeName)}&am=${total}&cu=INR&tn=${encodeURIComponent(paymentInfo.note)}`;
    window.open(upiDeepLink, "_blank");
  };

  const handleConfirmPayment = async () => {
    if (!selectedPlan) return;
    setSubmitting(true);
    try {
      await requestPayment(selectedPlan as "pro" | "enterprise", selectedBilling, userUpiId || undefined);
      setSubmitted(true);
      toast.success("Payment request submitted! Admin will review it shortly.");
    } catch (err: any) {
      toast.error(err?.data?.error || "Failed to submit payment request");
    } finally {
      setSubmitting(false);
    }
  };

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => { if (e.key === "Escape") closeDrawer(); };
    if (drawerOpen) document.addEventListener("keydown", handleEsc);
    return () => document.removeEventListener("keydown", handleEsc);
  }, [drawerOpen]);

  const amount = (() => {
    if (!selectedPlan) return 0;
    const amounts: Record<string, Record<string, number>> = {
      pro: { monthly: 49, yearly: 39 },
      enterprise: { monthly: 199, yearly: 179 },
    };
    return amounts[selectedPlan]?.[selectedBilling] ?? 0;
  })();
  const totalAmount = selectedBilling === "yearly" ? amount * 12 : amount;

  return (
    <>
      <div className="mx-auto w-full max-w-[1200px] space-y-8 px-4 py-6 md:px-8 md:py-10 pb-20">
        <div className="text-center">
          <h1 className="text-4xl font-black tracking-tight text-foreground">
            Choose your <span className="text-cyan-400">plan</span>
          </h1>
          <p className="mt-3 text-lg text-muted-foreground">
            Start free, upgrade when you need indexing & search console features
          </p>
        </div>

        <div className="flex items-center justify-center gap-3">
          <span className={`text-sm font-bold transition-colors ${!yearly ? "text-foreground" : "text-muted-foreground"}`}>Monthly</span>
          <button
            onClick={() => setYearly(!yearly)}
            className={`relative h-7 w-14 rounded-full border transition-all duration-300 glow-border-effect ${
              yearly ? "border-cyan-500/30 bg-cyan-500/20" : "border-white/10 bg-white/10"
            }`}
          >
            <span className={`absolute left-1 top-1 h-5 w-5 rounded-full transition-all duration-300 ${
              yearly ? "translate-x-7 bg-cyan-400" : "bg-white"
            }`} />
          </button>
          <span className={`text-sm font-bold transition-colors ${yearly ? "text-foreground" : "text-muted-foreground"}`}>
            Yearly <span className="text-emerald-400">Save 20%</span>
          </span>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3 lg:gap-8">
          {PLANS.map((plan) => (
            <div
              key={plan.id}
              className={`relative flex flex-col rounded-xl border bg-white/[0.02] p-8 transition-all ${
                plan.popular
                  ? "border-cyan-500/30 shadow-[0_0_30px_rgba(6,182,212,0.1)] ring-1 ring-cyan-500/20"
                  : "border-white/5 hover:border-white/10"
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Badge className="bg-cyan-500 text-white text-[10px] font-bold uppercase tracking-widest px-4 py-1">
                    Most Popular
                  </Badge>
                </div>
              )}

              <div className="mb-6">
                <div className="flex items-center gap-2">
                  {plan.id === "pro" && <Crown className="h-5 w-5 text-cyan-400" />}
                  {plan.id === "enterprise" && <Shield className="h-5 w-5 text-purple-400" />}
                  {plan.id === "free" && <Zap className="h-5 w-5 text-muted-foreground" />}
                  <h3 className="text-xl font-black text-foreground">{plan.name}</h3>
                </div>
                <div className="mt-4 flex items-baseline gap-1">
                  {yearly && plan.yearlyPrice ? (
                    <>
                      <span className="text-4xl font-black tracking-tight text-foreground">{plan.yearlyPrice}</span>
                      <span className="text-sm text-muted-foreground">{plan.yearlyLabel}</span>
                    </>
                  ) : (
                    <>
                      <span className="text-4xl font-black tracking-tight text-foreground">{plan.price}</span>
                      <span className="text-sm text-muted-foreground">{plan.period}</span>
                    </>
                  )}
                </div>
                <p className="mt-2 text-sm text-muted-foreground">{plan.description}</p>
              </div>

              <ul className="mb-8 flex-1 space-y-3">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-3 text-sm">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
                    <span className="text-muted-foreground">{f}</span>
                  </li>
                ))}
              </ul>

              <Button
                onClick={() => handleSubscribe(plan.id)}
                className={`h-12 w-full gap-2 text-sm font-bold uppercase tracking-wider ${
                  plan.popular ? "skeu-btn-primary" : "skeu-btn"
                }`}
              >
                {plan.cta} <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom Drawer — portaled to body to escape parent stacking contexts */}
      {drawerOpen && createPortal(
        <>
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" onClick={closeDrawer} />
          <div
            ref={drawerRef}
            className={cn(
              "fixed bottom-0 left-0 right-0 z-50 mx-auto max-w-lg rounded-t-2xl border border-white/10 bg-[#0a0a0f] p-6 shadow-2xl transition-transform duration-300",
              drawerOpen ? "translate-y-0" : "translate-y-full"
            )}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-black tracking-tight text-foreground flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-cyan-400" />
                {selectedPlan === "pro" ? "Pro" : "Enterprise"} Plan
              </h2>
              <button onClick={closeDrawer} className="text-muted-foreground hover:text-foreground transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>

            {submitted ? (
              <div className="text-center py-8 space-y-4">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/20">
                  <Check className="h-7 w-7 text-emerald-400" />
                </div>
                <h3 className="text-xl font-bold text-foreground">Payment Verified!</h3>
                <p className="text-sm text-muted-foreground">
                  Your payment of <strong className="text-emerald-400">₹{totalAmount}</strong> for the {selectedPlan} plan has been recorded. An admin will review and approve it shortly.
                </p>
                <Button onClick={closeDrawer} variant="outline" className="mt-2">Done</Button>
              </div>
            ) : !payInitiated ? (
              <div className="space-y-4">
                <div className="rounded-lg border border-white/5 bg-white/[0.02] p-4">
                  <div className="flex items-baseline justify-between">
                    <span className="text-sm text-muted-foreground">Amount to pay</span>
                    <span className="text-2xl font-black tracking-tight text-foreground">₹{totalAmount}</span>
                  </div>
                  {selectedBilling === "yearly" && (
                    <p className="text-xs text-muted-foreground mt-1">₹{amount}/mo billed yearly</p>
                  )}
                </div>

                <div className="rounded-lg border border-cyan-500/20 bg-cyan-500/5 p-4 space-y-3">
                  <p className="text-sm font-bold text-foreground flex items-center gap-2">
                    <Smartphone className="h-4 w-4 text-cyan-400" /> Pay via UPI
                  </p>

                  {qrDataUrl && (
                    <div className="flex justify-center py-2">
                      <img
                        src={qrDataUrl}
                        alt="UPI QR Code — scan to pay"
                        className="rounded-xl border border-cyan-500/20 bg-white p-2"
                        style={{ imageRendering: "pixelated" }}
                      />
                    </div>
                  )}

                  <p className="text-xs text-muted-foreground">
                    Send payment to this UPI ID:
                  </p>
                  <div className="flex items-center gap-2 bg-white/5 rounded-lg px-3 py-2">
                    <code className="flex-1 text-sm font-mono text-cyan-400">{paymentInfo?.upiId || "aryanhooda3522-1@okicici"}</code>
                    <button onClick={handleCopyUpi} className="p-1.5 rounded-md hover:bg-white/10 transition-colors">
                      {copied ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4 text-muted-foreground" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5 block">
                    Your UPI ID <span className="text-red-400">*</span>
                  </label>
                  <Input
                    placeholder="e.g. user@paytm"
                    value={userUpiId}
                    onChange={(e) => setUserUpiId(e.target.value)}
                    className="bg-muted/40 border-white/10"
                  />
                  <p className="mt-1 text-[10px] text-muted-foreground">
                    Enter your UPI ID so we send the payment request to your UPI app
                  </p>
                </div>

                <Button
                  onClick={() => {
                    if (!userUpiId.trim()) {
                      toast.error("Please enter your UPI ID first");
                      return;
                    }
                    handleOpenUpiApp();
                    setPayInitiated(true);
                  }}
                  className="skeu-btn-primary h-12 w-full gap-2 text-sm font-bold uppercase tracking-wider"
                >
                  <ExternalLink className="h-4 w-4" /> Pay ₹{totalAmount}
                </Button>

                <p className="text-center text-xs text-muted-foreground">
                  You'll be redirected to your UPI app to complete the payment
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-4 space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500/20">
                      <Check className="h-4 w-4 text-emerald-400" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-foreground">Payment request sent!</p>
                      <p className="text-xs text-muted-foreground">
                        ₹{totalAmount} → {paymentInfo?.upiId || "aryanhooda3522-1@okicici"}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="rounded-lg border border-cyan-500/20 bg-cyan-500/5 p-4 space-y-2 text-sm">
                  <p className="text-muted-foreground">
                    1. Open your UPI app and approve the payment request
                  </p>
                  <p className="text-muted-foreground">
                    2. Once paid, click <strong className="text-foreground">Verify Payment</strong> below
                  </p>
                </div>

                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5 block">
                    Your UPI ID
                  </label>
                  <Input
                    value={userUpiId}
                    readOnly
                    className="bg-muted/40 border-white/10 opacity-60"
                  />
                </div>

                <Button
                  onClick={handleConfirmPayment}
                  disabled={submitting}
                  className="skeu-btn-primary h-12 w-full gap-2 text-sm font-bold uppercase tracking-wider"
                >
                  {submitting ? (
                    <><Loader2 className="h-4 w-4 animate-spin" /> Verifying...</>
                  ) : (
                    <><Check className="h-4 w-4" /> Verify Payment</>
                  )}
                </Button>

                <div className="flex gap-2">
                  <Button onClick={() => { handleOpenUpiApp(); }} variant="outline" className="flex-1 gap-2 text-xs">
                    <ExternalLink className="h-3 w-3" /> Open UPI App Again
                  </Button>
                  <Button onClick={() => setPayInitiated(false)} variant="ghost" className="text-xs text-muted-foreground">
                    Change UPI ID
                  </Button>
                </div>
              </div>
            )}
          </div>
        </>,
        document.body
      )}
    </>
  );
}
