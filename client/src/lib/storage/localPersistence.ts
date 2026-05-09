import localforage from 'localforage';
import { Project, Analysis, Keyword } from '@/api/generated/api.schemas'; // We will redefine/use these
import { v4 as uuidv4 } from 'uuid';

// Configure localforage stores
localforage.config({
  name: 'ranklens-local',
  version: 1.0,
  storeName: 'app_data', 
  description: 'Local persistence for RankLens'
});

export const storageStores = {
  projects: localforage.createInstance({ name: 'ranklens', storeName: 'projects' }),
  analyses: localforage.createInstance({ name: 'ranklens', storeName: 'analyses' }),
  keywords: localforage.createInstance({ name: 'ranklens', storeName: 'keywords' }),
  recommendations: localforage.createInstance({ name: 'ranklens', storeName: 'recommendations' }),
  seoIssues: localforage.createInstance({ name: 'ranklens', storeName: 'seoIssues' }),
};

// Types based on the previous backend schemas
export type LocalProject = {
  id: number;
  name: string;
  domain: string;
  description?: string | null;
  createdAt: string;
  updatedAt: string;
  totalAnalyses: number;
  latestScore?: number | null;
};

export type LocalAnalysis = {
  id: number;
  projectId?: number | null;
  url: string;
  type: "website" | "youtube" | "instagram";
  status: "pending" | "queued" | "running" | "completed" | "failed";
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
  createdAt: string;
  completedAt?: string | null;
  htmlContent?: string | null;
};

// Generic CRUD operations for LocalForage
export const localDb = {
  async getAll<T>(storeName: keyof typeof storageStores): Promise<T[]> {
    const store = storageStores[storeName];
    const items: T[] = [];
    await store.iterate((value: T) => {
      items.push(value);
    });
    // Sort by ID descending (newest first) assuming numerical IDs
    return items.sort((a: any, b: any) => (b.id || 0) - (a.id || 0));
  },

  async getById<T>(storeName: keyof typeof storageStores, id: number | string): Promise<T | null> {
    const store = storageStores[storeName];
    return await store.getItem<T>(id.toString());
  },

  async getByProjectId<T>(storeName: keyof typeof storageStores, projectId: number): Promise<T[]> {
    const store = storageStores[storeName];
    const items: T[] = [];
    await store.iterate((value: any) => {
      if (value.projectId === projectId) {
        items.push(value);
      }
    });
    return items;
  },

  async create<T extends { id?: number | string; createdAt?: string; updatedAt?: string }>(
    storeName: keyof typeof storageStores, 
    data: Omit<T, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<T> {
    const store = storageStores[storeName];
    const id = Date.now(); // Simple numerical ID generator for local mode
    const now = new Date().toISOString();
    
    const newItem = {
      ...data,
      id,
      createdAt: now,
      updatedAt: now,
    } as unknown as T;

    await store.setItem(id.toString(), newItem);
    return newItem;
  },

  async update<T extends { id: number | string; updatedAt?: string }>(
    storeName: keyof typeof storageStores, 
    id: number | string, 
    data: Partial<T>
  ): Promise<T | null> {
    const store = storageStores[storeName];
    const existing = await store.getItem<T>(id.toString());
    
    if (!existing) return null;

    const updatedItem = {
      ...existing,
      ...data,
      updatedAt: new Date().toISOString(),
    };

    await store.setItem(id.toString(), updatedItem);
    return updatedItem;
  },

  async remove(storeName: keyof typeof storageStores, id: number | string): Promise<boolean> {
    const store = storageStores[storeName];
    try {
      await store.removeItem(id.toString());
      return true;
    } catch (e) {
      return false;
    }
  },

  async clearAll() {
    for (const key in storageStores) {
      await storageStores[key as keyof typeof storageStores].clear();
    }
  }
};
