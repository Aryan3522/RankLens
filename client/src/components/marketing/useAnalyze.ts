import { useState } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { useCreateAnalysis } from "@/api";
import { normalizeUrl } from "@/lib/utils";

/**
 * Encapsulates the homepage's analyzer submission so the hero and the final
 * CTA can share it. The mutate shape, toasts, and navigation target are kept
 * byte-for-byte identical to the original home.tsx so the working backend
 * flow (POST /api/analyses → poll local record → /analyses/:id) is preserved.
 */
export function useAnalyze() {
  const [url, setUrl] = useState("");
  const createAnalysis = useCreateAnalysis();
  const [, navigate] = useLocation();

  const analyze = (raw?: string) => {
    const normalized = normalizeUrl(raw ?? url);
    if (!normalized) {
      toast.error("Enter a URL", {
        description: "Paste a website, landing page, or blog URL to analyze.",
      });
      return;
    }
    createAnalysis.mutate(
      { data: { url: normalized, type: "website", projectId: null } },
      {
        onSuccess: (data: any) => {
          toast.info("Analysis started", {
            description: "Crawling your page and scoring AI visibility…",
          });
          if (data?.id) navigate(`/analyses/${data.id}`);
        },
        onError: () =>
          toast.error("Couldn't start analysis", {
            description: "Please try again in a moment.",
          }),
      },
    );
  };

  return {
    url,
    setUrl,
    analyze,
    isPending: createAnalysis.isPending,
  } as const;
}
