import { useState, useEffect, useRef } from "react";
import {
  ShieldCheck, Users, CreditCard, TrendingUp, DollarSign, CheckCircle,
  XCircle, Clock, Search, ArrowUpRight, RefreshCw, Bell, BellDot
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import {
  getAdminPayments, getAdminStats, getAdminUsers,
  getAdminSubscriptions, approvePayment, declinePayment,
  type Payment, type PaymentStats, type Subscription
} from "@/api/payments";

type Tab = "payments" | "subscriptions" | "users";

export default function AdminDashboard() {
  const [tab, setTab] = useState<Tab>("payments");
  const [stats, setStats] = useState<PaymentStats | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [approving, setApproving] = useState<string | null>(null);
  const [declining, setDeclining] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);
  const [pendingCount, setPendingCount] = useState(0);
  const prevPendingRef = useRef(0);

  const fetchData = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const [statsData, pays, subs, usrs] = await Promise.all([
        getAdminStats(),
        getAdminPayments(),
        getAdminSubscriptions(),
        getAdminUsers(),
      ]);
      setStats(statsData);
      setPayments(pays.payments);
      setSubscriptions(subs.subscriptions);
      setUsers(usrs.users);
      setLastRefreshed(new Date());

      const newPending = pays.payments.filter(p => p.status === "completed" && !p.admin_approved).length;
      setPendingCount(newPending);

      if (silent && newPending > prevPendingRef.current) {
        toast.success(`${newPending - prevPendingRef.current} new payment(s) awaiting approval`, {
          duration: 5000,
        });
      }
      prevPendingRef.current = newPending;
    } catch (err: any) {
      if (!silent) toast.error(err.message || "Failed to load admin data");
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  useEffect(() => {
    const interval = setInterval(() => fetchData(true), 15000);
    return () => clearInterval(interval);
  }, []);

  const handleDecline = async (id: string) => {
    setDeclining(id);
    try {
      await declinePayment(id);
      toast.success("Payment declined");
      fetchData();
    } catch (err: any) {
      toast.error(err.message || "Failed to decline");
    } finally {
      setDeclining(null);
    }
  };

  const handleApprove = async (id: string) => {
    setApproving(id);
    try {
      await approvePayment(id);
      toast.success("Payment approved & subscription activated");
      fetchData();
    } catch (err: any) {
      toast.error(err.message || "Failed to approve");
    } finally {
      setApproving(null);
    }
  };

  const filteredPayments = payments.filter(p =>
    p.user_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.razorpay_payment_id?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredUsers = users.filter(u =>
    u.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="mx-auto w-full max-w-[1400px] space-y-6 px-4 py-6 md:px-8 md:py-10 pb-20">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-foreground flex items-center gap-3">
            <ShieldCheck className="h-8 w-8 text-cyan-400" />
            Admin Panel
          </h1>
          <p className="text-sm font-medium text-muted-foreground">Manage users, payments & subscriptions</p>
        </div>
        <div className="flex items-center gap-3">
          {pendingCount > 0 && (
            <span className="flex items-center gap-1.5 rounded-full bg-amber-500/10 px-3 py-1 text-xs font-bold text-amber-400">
              <BellDot className="h-3.5 w-3.5" />
              {pendingCount} pending
            </span>
          )}
          {lastRefreshed && (
            <span className="text-[10px] text-muted-foreground">
              Auto-refresh every 15s
            </span>
          )}
          <Button onClick={() => fetchData()} disabled={loading} variant="outline" className="gap-2">
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
        </div>
      ) : stats ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4">
            <div className="flex items-start justify-between">
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Total Revenue</p>
              <DollarSign className="h-4 w-4 text-emerald-400" />
            </div>
            <p className="mt-2 text-3xl font-bold tracking-tight text-foreground">₹{(stats.revenue / 100).toLocaleString()}</p>
          </div>
          <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4">
            <div className="flex items-start justify-between">
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Total Users</p>
              <Users className="h-4 w-4 text-cyan-400" />
            </div>
            <p className="mt-2 text-3xl font-bold tracking-tight text-foreground">{stats.totalUsers}</p>
          </div>
          <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4">
            <div className="flex items-start justify-between">
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Payments</p>
              <CreditCard className="h-4 w-4 text-purple-400" />
            </div>
            <p className="mt-2 text-3xl font-bold tracking-tight text-foreground">
              {stats.completed} <span className="text-sm font-normal text-muted-foreground">/ {stats.total}</span>
            </p>
            <p className="text-xs text-muted-foreground">{stats.pending} pending approval</p>
          </div>
          <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4">
            <div className="flex items-start justify-between">
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Approved</p>
              <CheckCircle className="h-4 w-4 text-emerald-400" />
            </div>
            <p className="mt-2 text-3xl font-bold tracking-tight text-foreground">{stats.approved}</p>
            <p className="text-xs text-muted-foreground">Active subscriptions</p>
          </div>
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2 border-b border-white/10 pb-4">
        {([
          { key: "payments" as Tab, label: "Payments" },
          { key: "subscriptions" as Tab, label: "Subscriptions" },
          { key: "users" as Tab, label: "Users" },
        ]).map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`rounded-lg px-4 py-2 text-sm font-bold uppercase tracking-wider transition-all ${
              tab === key
                ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20"
                : "text-muted-foreground hover:text-foreground border border-transparent"
            }`}
          >
            {label}
          </button>
        ))}
        {tab !== "users" && (
          <div className="relative w-full sm:w-auto sm:ml-auto">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder={`Search ${tab}...`}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-muted/40 border-white/10 focus-visible:ring-cyan-500/50 focus-visible:border-cyan-500 h-9 w-full sm:w-56 pl-9 text-sm"
            />
          </div>
        )}
      </div>

      {tab === "payments" && (
        <div className="overflow-hidden rounded-xl border border-white/5 bg-white/[0.02]">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/5 text-left text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  <th className="p-4">User</th>
                  <th className="p-4">Plan</th>
                  <th className="p-4">Amount</th>
                  <th className="p-4">Payment ID</th>
                  <th className="p-4">Status</th>
                  <th className="p-4">Approved</th>
                  <th className="p-4">Date</th>
                  <th className="p-4">Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredPayments.length === 0 ? (
                  <tr><td colSpan={8} className="p-8 text-center text-muted-foreground">No payments found</td></tr>
                ) : filteredPayments.map((p) => (
                  <tr key={p.id} className="border-b border-white/5 transition-colors hover:bg-white/[0.02]">
                    <td className="p-4 font-medium text-foreground">{p.user_email || p.user_id}</td>
                    <td className="p-4">
                      <Badge variant={p.plan === "enterprise" ? "default" : "secondary"} className="uppercase text-[10px]">
                        {p.plan}
                      </Badge>
                    </td>
                    <td className="p-4 font-mono text-foreground">₹{(p.amount / 100).toLocaleString()}</td>
                    <td className="p-4 font-mono text-xs text-muted-foreground">{p.razorpay_payment_id || "—"}</td>
                    <td className="p-4">
                      <span className={`flex items-center gap-1.5 text-xs font-bold uppercase ${
                        p.status === "completed" ? "text-emerald-400" :
                        p.status === "failed" ? "text-red-400" : "text-amber-400"
                      }`}>
                        {p.status === "completed" ? <CheckCircle className="h-3 w-3" /> :
                         p.status === "failed" ? <XCircle className="h-3 w-3" /> :
                         <Clock className="h-3 w-3" />}
                        {p.status}
                      </span>
                    </td>
                    <td className="p-4">
                      {p.admin_approved ? (
                        <CheckCircle className="h-4 w-4 text-emerald-400" />
                      ) : (
                        <XCircle className="h-4 w-4 text-amber-500" />
                      )}
                    </td>
                    <td className="p-4 text-xs text-muted-foreground">
                      {new Date(p.created_at).toLocaleDateString()}
                    </td>
                    <td className="p-4">
                      {p.status === "completed" && !p.admin_approved ? (
                        <div className="flex gap-1.5">
                          <Button
                            size="sm"
                            onClick={() => handleApprove(p.id)}
                            disabled={approving === p.id}
                            className="text-[10px] font-bold uppercase bg-emerald-600 hover:bg-emerald-500"
                          >
                            {approving === p.id ? "..." : "Approve"}
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => handleDecline(p.id)}
                            disabled={declining === p.id}
                            className="text-[10px] font-bold uppercase bg-red-600 hover:bg-red-500"
                          >
                            {declining === p.id ? "..." : "Decline"}
                          </Button>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === "subscriptions" && (
        <div className="overflow-hidden rounded-xl border border-white/5 bg-white/[0.02]">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/5 text-left text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  <th className="p-4">User</th>
                  <th className="p-4">Plan</th>
                  <th className="p-4">Status</th>
                  <th className="p-4">Started</th>
                  <th className="p-4">Expires</th>
                </tr>
              </thead>
              <tbody>
                {subscriptions.length === 0 ? (
                  <tr><td colSpan={5} className="p-8 text-center text-muted-foreground">No subscriptions yet</td></tr>
                ) : subscriptions.map((s) => (
                  <tr key={s.id} className="border-b border-white/5 transition-colors hover:bg-white/[0.02]">
                    <td className="p-4 font-medium text-foreground">{s.user_email || s.user_id}</td>
                    <td className="p-4">
                      <Badge variant={s.plan === "enterprise" ? "default" : "secondary"} className="uppercase text-[10px]">
                        {s.plan}
                      </Badge>
                    </td>
                    <td className="p-4">
                      <span className={`flex items-center gap-1.5 text-xs font-bold uppercase ${
                        s.status === "active" ? "text-emerald-400" :
                        s.status === "expired" ? "text-red-400" : "text-amber-400"
                      }`}>
                        {s.status === "active" ? <CheckCircle className="h-3 w-3" /> :
                         s.status === "expired" ? <XCircle className="h-3 w-3" /> :
                         <Clock className="h-3 w-3" />}
                        {s.status}
                      </span>
                    </td>
                    <td className="p-4 text-xs text-muted-foreground">
                      {s.started_at ? new Date(s.started_at).toLocaleDateString() : "—"}
                    </td>
                    <td className="p-4 text-xs text-muted-foreground">
                      {s.expires_at ? new Date(s.expires_at).toLocaleDateString() : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === "users" && (
        <div className="overflow-hidden rounded-xl border border-white/5 bg-white/[0.02]">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/5 text-left text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  <th className="p-4">Name</th>
                  <th className="p-4">Email</th>
                  <th className="p-4">Role</th>
                  <th className="p-4">Plan</th>
                  <th className="p-4">Joined</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.length === 0 ? (
                  <tr><td colSpan={5} className="p-8 text-center text-muted-foreground">No users found</td></tr>
                ) : filteredUsers.map((u) => (
                  <tr key={u.id} className="border-b border-white/5 transition-colors hover:bg-white/[0.02]">
                    <td className="p-4 font-medium text-foreground">{u.name || "—"}</td>
                    <td className="p-4 text-muted-foreground">{u.email}</td>
                    <td className="p-4">
                      <Badge variant={u.role === "admin" ? "default" : "outline"} className="uppercase text-[10px]">
                        {u.role}
                      </Badge>
                    </td>
                    <td className="p-4">
                      <Badge className={`uppercase text-[10px] ${
                        u.plan === "free" ? "bg-white/5 text-muted-foreground" :
                        u.plan === "pro" ? "bg-cyan-500/10 text-cyan-400" :
                        "bg-purple-500/10 text-purple-400"
                      }`}>
                        {u.plan}
                      </Badge>
                    </td>
                    <td className="p-4 text-xs text-muted-foreground">
                      {new Date(u.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
