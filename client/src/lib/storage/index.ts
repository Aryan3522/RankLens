import localforage from "localforage";
import { z } from "zod";
import { v4 as uuidv4 } from "uuid";

// Define strict types replacing DB schema
export type AnalysisType = "website" | "youtube" | "instagram";
export type AnalysisStatus = "pending" | "queued" | "running" | "completed" | "failed" | "unsupported";

export type AiCategoryStatus = "strong" | "moderate" | "weak";

export interface AiCategory {
  id: string;
  label: string;
  score: number;
  points: number;
  maxPoints: number;
  weight: number;
  status: AiCategoryStatus;
  whatItMeans: string;
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
}

export interface AiEngineReadiness {
  engine: string;
  score: number;
  status: AiCategoryStatus;
  note: string;
}

export interface ActionItem {
  priority: "critical" | "important" | "nice-to-have";
  title: string;
  steps: string[];
  estimatedImpact: number;
  category: string;
}

export interface AnalysisSummary {
  headline: string;
  criticalCount: number;
  topActions: string[];
}

export interface LlmEnhancement {
  executiveSummary: string;
  entityGaps: string[];
  recommendations: { title: string; detail: string; priority: "high" | "medium" | "low" }[];
}

export interface Project {
  id: string; // Changed from number to UUID string for local generation
  name: string;
  domain: string;
  description?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Analysis {
  id: string; // Changed to UUID
  projectId?: string | null;
  url: string;
  type: AnalysisType;
  status: AnalysisStatus;
  seoScore?: number | null;
  performanceScore?: number | null;
  accessibilityScore?: number | null;
  bestPracticesScore?: number | null;
  issueCount?: number | null;
  metaTitle?: string | null;
  metaDescription?: string | null;
  h1Count?: number | null;
  h2Count?: number | null;
  wordCount?: number | null;
  internalLinks?: number | null;
  externalLinks?: number | null;
  imagesMissingAlt?: number | null;
  pageLoadScore?: number | null;
  mobileScore?: number | null;
  pageCount?: number | null;
  lcp?: string | null;
  cls?: string | null;
  fcp?: string | null;
  tti?: string | null;
  speedIndex?: string | null;
  aiVisibilityScore?: number | null;
  aiVisibilityInsights?: {
    strengths: string[];
    weaknesses: string[];
    recommendations: string[];
  } | null;
  aiVisibilityCategories?: AiCategory[] | null;
  aiEngineReadiness?: AiEngineReadiness[] | null;
  actionPlan?: ActionItem[] | null;
  summary?: AnalysisSummary | null;
  llmSummary?: LlmEnhancement | null;
  message?: string | null;
  /** Seconds to wait before retrying — set when the server returns 429. */
  retryAfter?: number | null;
  createdAt: string;
  completedAt?: string | null;
}

export interface Keyword {
  id: string; // Changed to UUID
  projectId: string;
  keyword: string;
  currentRank?: number | null;
  previousRank?: number | null;
  searchVolume?: number | null;
  difficulty?: number | null;
  trend?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface KeywordRankHistory {
  id: string;
  keywordId: string;
  rank?: number | null;
  recordedAt: string;
}

export interface SeoIssue {
  id: string;
  analysisId: string;
  category: string;
  severity: "info" | "warning" | "error" | "critical";
  title: string;
  description: string;
  affectedUrl?: string | null;
  element?: string | null;
  lineNumber?: number | null;
  fixExample?: string | null;
  helpUrl?: string | null;
  createdAt: string;
}

export interface Recommendation {
  id: string;
  analysisId: string;
  priority: "low" | "medium" | "high";
  category: string;
  title: string;
  description: string;
  estimatedImpact: number;
  dismissed: boolean;
  createdAt: string;
}

// ---------------------------------------------------------
// Storage Configuration & Instances
// ---------------------------------------------------------

// We use indexedDB via localforage for scalable, async storage.
localforage.config({
  name: 'RankLensLocal',
  storeName: 'ranklens_data',
  description: 'Local first storage for RankLens application'
});

const projectsStore = localforage.createInstance({ name: "projects" });
const analysesStore = localforage.createInstance({ name: "analyses" });
const keywordsStore = localforage.createInstance({ name: "keywords" });
const keywordHistoryStore = localforage.createInstance({ name: "keywordHistory" });
const seoIssuesStore = localforage.createInstance({ name: "seoIssues" });
const recommendationsStore = localforage.createInstance({ name: "recommendations" });

// ---------------------------------------------------------
// Generic CRUD Operations
// ---------------------------------------------------------

async function getAll<T>(store: LocalForage): Promise<T[]> {
  const items: T[] = [];
  await store.iterate((value: T) => {
    items.push(value);
  });
  return items;
}

async function getById<T>(store: LocalForage, id: string): Promise<T | null> {
  return await store.getItem<T>(id);
}

async function create<T extends { id: string }>(store: LocalForage, item: Omit<T, "id" | "createdAt" | "updatedAt">): Promise<T> {
  const now = new Date().toISOString();
  const newItem = {
    ...item,
    id: uuidv4(),
    createdAt: now,
    updatedAt: now,
  } as unknown as T;
  
  await store.setItem(newItem.id, newItem);
  return newItem;
}

async function update<T extends { id: string, updatedAt?: string }>(store: LocalForage, id: string, updates: Partial<T>): Promise<T | null> {
  const existing = await store.getItem<T>(id);
  if (!existing) return null;

  const updatedItem = {
    ...existing,
    ...updates,
    updatedAt: new Date().toISOString(),
  };

  await store.setItem(id, updatedItem);
  return updatedItem;
}

async function remove(store: LocalForage, id: string): Promise<void> {
  await store.removeItem(id);
}

// ---------------------------------------------------------
// Specific Store Methods
// ---------------------------------------------------------

export const storage = {
  projects: {
    getAll: () => getAll<Project>(projectsStore),
    get: (id: string) => getById<Project>(projectsStore, id),
    create: (data: Omit<Project, "id" | "createdAt" | "updatedAt">) => create<Project>(projectsStore, data),
    update: (id: string, data: Partial<Project>) => update<Project>(projectsStore, id, data),
    delete: async (id: string) => {
      await remove(projectsStore, id);
      // Cascading deletes
      const analyses = await getAll<Analysis>(analysesStore);
      for(const a of analyses) {
        if(a.projectId === id) await storage.analyses.delete(a.id);
      }
      const keywords = await getAll<Keyword>(keywordsStore);
      for(const k of keywords) {
        if(k.projectId === id) await storage.keywords.delete(k.id);
      }
    }
  },
  analyses: {
    getAll: () => getAll<Analysis>(analysesStore),
    getByProjectId: async (projectId: string) => {
      const all = await getAll<Analysis>(analysesStore);
      return all.filter(a => a.projectId === projectId);
    },
    get: (id: string) => getById<Analysis>(analysesStore, id),
    create: (data: Omit<Analysis, "id" | "createdAt" | "completedAt">) => {
       const now = new Date().toISOString();
       const newItem = { ...data, id: uuidv4(), createdAt: now } as Analysis;
       if (data.status === 'completed') { newItem.completedAt = now; }
       return analysesStore.setItem(newItem.id, newItem).then(() => newItem);
    },
    update: (id: string, data: Partial<Analysis>) => update<Analysis>(analysesStore, id, data),
    delete: async (id: string) => {
      await remove(analysesStore, id);
      // Cascade to issues and recommendations
      const issues = await getAll<SeoIssue>(seoIssuesStore);
      for(const i of issues) {
        if(i.analysisId === id) await remove(seoIssuesStore, i.id);
      }
      const recs = await getAll<Recommendation>(recommendationsStore);
      for(const r of recs) {
         if(r.analysisId === id) await remove(recommendationsStore, r.id);
      }
    }
  },
  keywords: {
     getAll: () => getAll<Keyword>(keywordsStore),
     getByProjectId: async (projectId: string) => {
        const all = await getAll<Keyword>(keywordsStore);
        return all.filter(k => k.projectId === projectId);
     },
     get: (id: string) => getById<Keyword>(keywordsStore, id),
     create: (data: Omit<Keyword, "id" | "createdAt" | "updatedAt">) => create<Keyword>(keywordsStore, data),
     update: (id: string, data: Partial<Keyword>) => update<Keyword>(keywordsStore, id, data),
     delete: async (id: string) => {
       await remove(keywordsStore, id);
       const history = await getAll<KeywordRankHistory>(keywordHistoryStore);
       for(const h of history) {
          if(h.keywordId === id) await remove(keywordHistoryStore, h.id);
       }
     }
  },
  seoIssues: {
    getByAnalysisId: async (analysisId: string) => {
       const all = await getAll<SeoIssue>(seoIssuesStore);
       return all.filter(i => i.analysisId === analysisId);
    },
    create: async (data: Omit<SeoIssue, "id" | "createdAt">) => {
       const now = new Date().toISOString();
       const newItem = { ...data, id: uuidv4(), createdAt: now } as SeoIssue;
       await seoIssuesStore.setItem(newItem.id, newItem);
       return newItem;
    }
  },
  recommendations: {
    getByAnalysisId: async (analysisId: string) => {
       const all = await getAll<Recommendation>(recommendationsStore);
       return all.filter(r => r.analysisId === analysisId);
    },
    create: async (data: Omit<Recommendation, "id" | "createdAt">) => {
       const now = new Date().toISOString();
       const newItem = { ...data, id: uuidv4(), createdAt: now } as Recommendation;
       await recommendationsStore.setItem(newItem.id, newItem);
       return newItem;
    }
  }
};

// ---------------------------------------------------------
// Storage Hydration Helper (For state management)
// ---------------------------------------------------------

export async function clearAllLocalData() {
  await localforage.clear();
}
