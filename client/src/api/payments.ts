import { customFetch } from "./custom-fetch";

export interface Payment {
  id: string;
  user_id: string;
  razorpay_order_id: string;
  razorpay_payment_id: string | null;
  amount: number;
  currency: string;
  plan: string;
  status: string;
  admin_approved: number;
  user_email: string;
  user_name: string;
  created_at: string;
}

export interface Subscription {
  id: string;
  user_id: string;
  plan: string;
  status: string;
  payment_id: string;
  started_at: string;
  expires_at: string;
  user_email: string;
  user_name: string;
  created_at: string;
}

export interface PaymentStats {
  total: number;
  completed: number;
  pending: number;
  approved: number;
  revenue: number;
  totalUsers: number;
  byPlan: { plan: string; count: number; revenue: number }[];
}

export interface PaymentInfo {
  upiId: string;
  payeeName: string;
  note: string;
}

export async function getPaymentInfo(): Promise<PaymentInfo> {
  return customFetch<PaymentInfo>("/api/payments/info");
}

export async function requestPayment(plan: "pro" | "enterprise", billing: "monthly" | "yearly", upiId?: string): Promise<{
  paymentId: string;
  orderId: string;
  amount: number;
  plan: string;
  billing: string;
  message: string;
}> {
  return customFetch("/api/payments/request", {
    method: "POST",
    body: JSON.stringify({ plan, billing, upiId }),
    headers: { "Content-Type": "application/json" },
  });
}

export async function getAdminPayments(limit = 50, offset = 0): Promise<{ payments: Payment[]; total: number }> {
  return customFetch(`/api/admin/payments?limit=${limit}&offset=${offset}`);
}

export async function getAdminSubscriptions(limit = 50, offset = 0): Promise<{ subscriptions: Subscription[]; total: number }> {
  return customFetch(`/api/admin/subscriptions?limit=${limit}&offset=${offset}`);
}

export async function getAdminStats(): Promise<PaymentStats> {
  return customFetch("/api/admin/stats");
}

export async function getAdminUsers(): Promise<{ users: any[]; total: number }> {
  return customFetch("/api/admin/users");
}

export async function approvePayment(id: string): Promise<{ success: boolean }> {
  return customFetch(`/api/admin/payments/${id}/approve`, { method: "POST" });
}

export async function declinePayment(id: string): Promise<{ success: boolean }> {
  return customFetch(`/api/admin/payments/${id}/decline`, { method: "POST" });
}
