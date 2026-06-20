import { toast as sonnerToast } from "sonner";

// Thin shim over Sonner that preserves the legacy { title, description, variant }
// call signature used across the app, so existing call sites work unchanged
// while rendering through Sonner. Prefer importing `toast` from "sonner"
// directly in new code.

type ToastVariant = "default" | "destructive" | "success" | "info" | "warning";

interface ToastInput {
  title?: React.ReactNode;
  description?: React.ReactNode;
  variant?: ToastVariant;
  duration?: number;
}

function toString(node: React.ReactNode): string {
  return typeof node === "string" || typeof node === "number" ? String(node) : "";
}

function toast({ title, description, variant = "default", duration }: ToastInput) {
  const message = toString(title) || toString(description) || "";
  const opts = {
    description: title ? toString(description) || undefined : undefined,
    duration,
  };

  switch (variant) {
    case "destructive":
      return sonnerToast.error(message, opts);
    case "success":
      return sonnerToast.success(message, opts);
    case "warning":
      return sonnerToast.warning(message, opts);
    case "info":
      return sonnerToast.info(message, opts);
    default:
      return sonnerToast(message, opts);
  }
}

function useToast() {
  return {
    toast,
    dismiss: (id?: string | number) => sonnerToast.dismiss(id),
  };
}

export { useToast, toast };
