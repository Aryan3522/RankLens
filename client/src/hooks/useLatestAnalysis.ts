import { useQuery } from "@tanstack/react-query";
import { storage, type Analysis } from "@/lib/storage";

export const getLatestAnalysisQueryKey = () => ["latest-analysis"];

/**
 * Returns the user's most recent COMPLETED analysis from local storage (or
 * null). Used to drive the marketing visualizations with the visitor's own
 * real data, falling back to demo content when they haven't run a scan yet.
 * (Cross-device persistence arrives with the Supabase account phase.)
 */
export function useLatestAnalysis() {
  return useQuery<Analysis | null>({
    queryKey: getLatestAnalysisQueryKey(),
    queryFn: async () => {
      const all = await storage.analyses.getAll();
      const completed = all
        .filter((a) => a.status === "completed")
        .sort((a, b) => {
          const ta = new Date(a.completedAt ?? a.createdAt).getTime();
          const tb = new Date(b.completedAt ?? b.createdAt).getTime();
          return tb - ta;
        });
      return completed[0] ?? null;
    },
    staleTime: 10_000,
  });
}
