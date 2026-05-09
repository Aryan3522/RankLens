import { get, set, del, keys, clear } from 'idb-keyval';

/**
 * Local Persistence Service
 * Handles all CRUD operations for the local-first architecture.
 * Mimics a database using IndexedDB for large payloads and localStorage for small settings.
 */

export interface StorageSchema {
  projects: any[];
  analyses: any[];
  keywords: any[];
  recommendations: any[];
  seoIssues: any[];
  settings: Record<string, any>;
}

const STORAGE_KEYS = {
  PROJECTS: 'ranklens_projects',
  ANALYSES: 'ranklens_analyses',
  KEYWORDS: 'ranklens_keywords',
  RECOMMENDATIONS: 'ranklens_recommendations',
  SEO_ISSUES: 'ranklens_seo_issues',
  SETTINGS: 'ranklens_settings',
};

export const localPersistence = {
  // --- Generic Helpers ---
  async getAll<T>(key: string): Promise<T[]> {
    return (await get(key)) || [];
  },

  async getById<T extends { id: number | string }>(key: string, id: number | string): Promise<T | undefined> {
    const all = await this.getAll<T>(key);
    return all.find(item => item.id === id);
  },

  async save<T extends { id: number | string }>(key: string, data: T): Promise<T> {
    const all = await this.getAll<T>(key);
    const index = all.findIndex(item => item.id === data.id);
    
    if (index !== -1) {
      all[index] = data;
    } else {
      all.push(data);
    }
    
    await set(key, all);
    return data;
  },

  async remove(key: string, id: number | string): Promise<void> {
    const all = await this.getAll<any>(key);
    const filtered = all.filter(item => item.id !== id);
    await set(key, filtered);
  },

  // --- Specific Implementations ---
  async getProjects() {
    return this.getAll<any>(STORAGE_KEYS.PROJECTS);
  },

  async saveProject(project: any) {
    if (!project.id) project.id = Date.now();
    if (!project.createdAt) project.createdAt = new Date().toISOString();
    project.updatedAt = new Date().toISOString();
    return this.save(STORAGE_KEYS.PROJECTS, project);
  },

  async deleteProject(id: number) {
    await this.remove(STORAGE_KEYS.PROJECTS, id);
    // Cascade delete
    const allAnalyses = await this.getAnalyses();
    const projectAnalyses = allAnalyses.filter(a => a.projectId === id);
    for (const analysis of projectAnalyses) {
      await this.deleteAnalysis(analysis.id);
    }
  },

  async getAnalyses(projectId?: number) {
    const all = await this.getAll<any>(STORAGE_KEYS.ANALYSES);
    if (projectId) return all.filter(a => a.projectId === projectId);
    return all;
  },

  async saveAnalysis(analysis: any) {
    if (!analysis.id) analysis.id = Date.now();
    if (!analysis.createdAt) analysis.createdAt = new Date().toISOString();
    return this.save(STORAGE_KEYS.ANALYSES, analysis);
  },

  async deleteAnalysis(id: number) {
    await this.remove(STORAGE_KEYS.ANALYSES, id);
    // Cleanup related issues and recommendations
    const allIssues = await this.getAll<any>(STORAGE_KEYS.SEO_ISSUES);
    await set(STORAGE_KEYS.SEO_ISSUES, allIssues.filter(i => i.analysisId !== id));
    
    const allRecs = await this.getAll<any>(STORAGE_KEYS.RECOMMENDATIONS);
    await set(STORAGE_KEYS.RECOMMENDATIONS, allRecs.filter(r => r.analysisId !== id));
  },

  async getKeywords(projectId?: number) {
    const all = await this.getAll<any>(STORAGE_KEYS.KEYWORDS);
    if (projectId) return all.filter(k => k.projectId === projectId);
    return all;
  },

  async saveKeyword(keyword: any) {
    if (!keyword.id) keyword.id = Date.now();
    return this.save(STORAGE_KEYS.KEYWORDS, keyword);
  },

  async deleteKeyword(id: number) {
    await this.remove(STORAGE_KEYS.KEYWORDS, id);
  },

  async clearAll() {
    await clear();
  }
};
