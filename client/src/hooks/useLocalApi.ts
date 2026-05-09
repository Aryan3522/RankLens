import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { storage } from "@/lib/storage";
import { customFetch } from "@/api/custom-fetch";

// Helper Query Keys
export const getListProjectsQueryKey = () => ["projects"];
export const getGetProjectQueryKey = (id: string | number) => ["project", id];
export const getListAnalysesQueryKey = (params?: any) => ["analyses", params];
export const getGetAnalysisQueryKey = (id: string | number) => ["analysis", id];
export const getListKeywordsQueryKey = (params?: any) => ["keywords", params];
export const getListRecommendationsQueryKey = (params?: any) => [
  "recommendations",
  params,
];

// --- Projects ---
export function useListProjects(params?: any, options?: any) {
  return useQuery<any[]>({
    queryKey: getListProjectsQueryKey(),
    queryFn: async () => {
      const projects = await storage.projects.getAll();
      const analyses = await storage.analyses.getAll();
      return projects.map((p) => ({
        ...p,
        totalAnalyses: analyses.filter((a) => a.projectId === p.id).length,
        latestScore:
          analyses
            .filter((a) => a.projectId === p.id)
            .sort(
              (a, b) =>
                new Date(b.createdAt).getTime() -
                new Date(a.createdAt).getTime(),
            )[0]?.seoScore || null,
      }));
    },
    ...options?.query,
  });
}

export function useGetProject(id: string | number, options?: any) {
  return useQuery<any>({
    queryKey: getGetProjectQueryKey(id),
    queryFn: async () => {
      const project = await storage.projects.get(String(id));
      if (!project) throw new Error("Not found");
      const analyses = await storage.analyses.getByProjectId(String(id));
      return {
        ...project,
        totalAnalyses: analyses.length,
        latestScore:
          analyses.sort(
            (a, b) =>
              new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
          )[0]?.seoScore || null,
      };
    },
    ...options?.query,
  });
}

export function useCreateProject() {
  const queryClient = useQueryClient();
  return useMutation<any, Error, { data: any }>({
    mutationFn: async ({ data }) => await storage.projects.create(data),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: getListProjectsQueryKey() }),
  });
}

export function useDeleteProject() {
  const queryClient = useQueryClient();
  return useMutation<any, Error, { id: string | number }>({
    mutationFn: async ({ id }) => await storage.projects.delete(String(id)),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: getListProjectsQueryKey() }),
  });
}

// --- Analyses ---
export function useListAnalyses(params?: any, options?: any) {
  return useQuery<any[]>({
    queryKey: getListAnalysesQueryKey(params),
    queryFn: async () => {
      if (params?.projectId) {
        return await storage.analyses.getByProjectId(String(params.projectId));
      }
      return await storage.analyses.getAll();
    },
    ...options?.query,
  });
}

export function useGetAnalysis(id: string | number, options?: any) {
  return useQuery<any>({
    queryKey: getGetAnalysisQueryKey(id),
    queryFn: async () => {
      const analysis = await storage.analyses.get(String(id));
      if (!analysis) throw new Error("Not found");
      const issues = await storage.seoIssues.getByAnalysisId(String(id));
      const recommendations = await storage.recommendations.getByAnalysisId(
        String(id),
      );
      return { ...analysis, issues, recommendations };
    },
    ...options?.query,
  });
}

export function useCreateAnalysis() {
  const queryClient = useQueryClient();
  return useMutation<any, Error, { data: any }>({
    mutationFn: async ({ data }) => {
      const pending = await storage.analyses.create({
        ...data,
        status: "running",
      });
      runBackendAnalysisAndSave(
        data.url,
        data.type,
        pending.id,
        data.projectId ? String(data.projectId) : undefined,
      );
      return pending;
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: getListAnalysesQueryKey() }),
  });
}

async function runBackendAnalysisAndSave(
  url: string,
  type: string,
  localId: string,
  projectId?: string,
) {
  try {
    const result: any = await customFetch("/api/analyses", {
      method: "POST",
      body: JSON.stringify({ url, type, projectId }),
      headers: { "Content-Type": "application/json" },
    });

    const analysisData = result.data || result;

    await storage.analyses.update(localId, {
      status: "completed",
      seoScore: analysisData.seoScore,
      performanceScore: analysisData.performanceScore,
      accessibilityScore: analysisData.accessibilityScore,
      bestPracticesScore: analysisData.bestPracticesScore,
      issueCount: analysisData.issueCount,
      metaTitle: analysisData.metaTitle,
      metaDescription: analysisData.metaDescription,
      h1Count: analysisData.h1Count,
      h2Count: analysisData.h2Count,
      wordCount: analysisData.wordCount,
      internalLinks: analysisData.internalLinks,
      externalLinks: analysisData.externalLinks,
      imagesMissingAlt: analysisData.imagesMissingAlt,
      pageLoadScore: analysisData.pageLoadScore,
      mobileScore: analysisData.mobileScore,
      pageCount: analysisData.pageCount,
      lcp: analysisData.lcp,
      cls: analysisData.cls,
      fcp: analysisData.fcp,
      tti: analysisData.tti,
      speedIndex: analysisData.speedIndex,
      completedAt: new Date().toISOString(),
    });

    if (analysisData.issues) {
      for (const i of analysisData.issues) {
        await storage.seoIssues.create({ ...i, analysisId: localId });
      }
    }
    if (analysisData.recommendations) {
      for (const r of analysisData.recommendations) {
        await storage.recommendations.create({ ...r, analysisId: localId });
      }
    }
  } catch (err) {
    console.error("Backend analysis failed", err);
    await storage.analyses.update(localId, { status: "failed" });
  }
}

export function useDeleteAnalysis() {
  const queryClient = useQueryClient();
  return useMutation<any, Error, { id: string | number }>({
    mutationFn: async ({ id }) => await storage.analyses.delete(String(id)),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: getListAnalysesQueryKey() }),
  });
}

export function useRerunAnalysis() {
  const queryClient = useQueryClient();
  return useMutation<any, Error, { id: string | number }>({
    mutationFn: async ({ id }) => {
      const existing = await storage.analyses.get(String(id));
      if (!existing) throw new Error("Not found");
      await storage.analyses.update(String(id), { status: "running" });
      runBackendAnalysisAndSave(
        existing.url,
        existing.type,
        String(id),
        existing.projectId || undefined,
      );
      return existing;
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: getListAnalysesQueryKey() }),
  });
}

// --- Keywords ---
export function useListKeywords(
  params?: { projectId?: string | number },
  options?: any,
) {
  return useQuery<any[]>({
    queryKey: getListKeywordsQueryKey(params),
    queryFn: async () => {
      if (params?.projectId)
        return await storage.keywords.getByProjectId(String(params.projectId));
      return await storage.keywords.getAll();
    },
    ...options?.query,
  });
}

export function useCreateKeyword() {
  const queryClient = useQueryClient();
  return useMutation<any, Error, { data: any }>({
    mutationFn: async ({ data }) =>
      await storage.keywords.create({
        ...data,
        projectId: String(data.projectId),
      }),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: getListKeywordsQueryKey() }),
  });
}

export function useDeleteKeyword() {
  const queryClient = useQueryClient();
  return useMutation<any, Error, { id: string | number }>({
    mutationFn: async ({ id }) => await storage.keywords.delete(String(id)),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: getListKeywordsQueryKey() }),
  });
}

export function useGetKeywordHistory(id: string | number, options?: any) {
  return useQuery<any[]>({
    queryKey: ["keywordHistory", id],
    queryFn: async () => [],
    ...options?.query,
  });
}

// --- Recommendations ---
export function useListRecommendations(params?: any, options?: any) {
  return useQuery<any[]>({
    queryKey: getListRecommendationsQueryKey(params),
    queryFn: async () => {
      const all = await Promise.all(
        (await storage.analyses.getAll()).map((a) =>
          storage.recommendations.getByAnalysisId(a.id),
        ),
      );
      return all.flat();
    },
    ...options?.query,
  });
}

export function useDismissRecommendation() {
  const queryClient = useQueryClient();
  return useMutation<any, Error, { id: string | number }>({
    mutationFn: async ({ id }) => {
      const allRecs = await Promise.all(
        (await storage.analyses.getAll()).map((a) =>
          storage.recommendations.getByAnalysisId(a.id),
        ),
      );
      const flat = allRecs.flat();
      const rec = flat.find((r) => r.id === String(id));
      if (rec) {
        // Implement dismissed logically
      }
    },
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: getListRecommendationsQueryKey(),
      }),
  });
}

// --- Dashboard & Aggregates ---
export function useGetDashboardSummary() {
  return useQuery<any>({
    queryKey: ["dashboardSummary"],
    queryFn: async (): Promise<any> => {
      const projects = await storage.projects.getAll();
      const analyses = await storage.analyses.getAll();
      const keywords = await storage.keywords.getAll();
      const completed = analyses.filter((a) => a.status === "completed");
      const avgSeoScore = completed.length
        ? Math.round(
            completed.reduce((acc, a) => acc + (a.seoScore || 0), 0) /
              completed.length,
          )
        : null;

      let criticalIssues = 0;
      for (const a of completed) {
        const issues = await storage.seoIssues.getByAnalysisId(a.id);
        criticalIssues += issues.filter(
          (i) => i.severity === "critical",
        ).length;
      }

      const allRecs = await Promise.all(
        completed.map((a) => storage.recommendations.getByAnalysisId(a.id)),
      );
      const pendingRecs = allRecs.flat().filter((r) => !r.dismissed).length;

      return {
        totalProjects: projects.length,
        totalAnalyses: analyses.length,
        totalKeywords: keywords.length,
        avgSeoScore,
        criticalIssues,
        pendingAnalyses: analyses.filter(
          (a) => a.status === "running" || a.status === "queued",
        ).length,
        topPerformingProject: projects.length > 0 ? projects[0].name : "N/A",
        recommendationsPending: pendingRecs,
      };
    },
  });
}

export function useGetScoreTrend() {
  return useQuery<any[]>({
    queryKey: ["scoreTrend"],
    queryFn: async (): Promise<any[]> => {
      const analyses = await storage.analyses.getAll();
      const completed = analyses
        .filter((a) => a.status === "completed" && a.seoScore != null)
        .sort(
          (a, b) =>
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
        );

      return completed.map((a) => ({
        date: new Date(a.createdAt).toLocaleDateString(),
        score: a.seoScore || 0,
        projectName: "Analysis",
      }));
    },
  });
}

export function useGetRecentActivity() {
  return useQuery<any[]>({
    queryKey: ["recentActivity"],
    queryFn: async (): Promise<any[]> => {
      const analyses = await storage.analyses.getAll();
      const keywords = await storage.keywords.getAll();

      const activity = [
        ...analyses.map((a) => ({
          id: a.id,
          type: "analysis",
          description: `Analyzed ${a.url}`,
          createdAt: a.createdAt,
        })),
        ...keywords.map((k) => ({
          id: k.id,
          type: "keyword",
          description: `Added keyword: ${k.keyword}`,
          createdAt: k.createdAt,
        })),
      ].sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );

      return activity.slice(0, 10);
    },
  });
}

export function useGetIssueBreakdown() {
  return useQuery<any[]>({
    queryKey: ["issueBreakdown"],
    queryFn: async (): Promise<any[]> => {
      const analyses = await storage.analyses.getAll();
      const allIssues: any[] = [];
      for (const a of analyses) {
        const issues = await storage.seoIssues.getByAnalysisId(a.id);
        allIssues.push(...issues);
      }

      const counts: Record<string, { count: number; severity: string }> = {};
      allIssues.forEach((i) => {
        if (!counts[i.category]) {
          counts[i.category] = { count: 0, severity: i.severity };
        }
        counts[i.category].count++;
      });

      return Object.entries(counts).map(([category, data]) => ({
        category,
        count: data.count,
        severity: data.severity,
      }));
    },
  });
}
