import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { TherapistResponse } from './openrouter';

export interface SavedAnalysis {
  id: string;
  date: string;
  content: string;
  summary: string;
  response: TherapistResponse;
  tags: string[];
  favorite: boolean;
  lastViewed: string;
  createdAt: string;
  updatedAt: string;
}

const DB_NAME = 'healja-db';
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase<unknown>> | null = null;

function getDB() {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        const store = db.createObjectStore('analyses', { keyPath: 'id' });
        store.createIndex('by-date', 'date');
        store.createIndex('by-lastViewed', 'lastViewed');
        store.createIndex('by-favorite', 'favorite');
        store.createIndex('by-tags', 'tags', { multiEntry: true });
      },
    });
  }
  return dbPromise;
}

export async function saveAnalysis(
  content: string,
  response: TherapistResponse,
  tags: string[] = []
): Promise<SavedAnalysis> {
  const db = await getDB();
  const now = new Date().toISOString();
  
  const analysis: SavedAnalysis = {
    id: Date.now().toString(),
    date: new Date().toLocaleString(),
    content,
    summary: response.summary,
    response,
    tags,
    favorite: false,
    lastViewed: now,
    createdAt: now,
    updatedAt: now,
  };

  await db.put('analyses', analysis);
  return analysis;
}

export async function getAllAnalyses(limit = 50, offset = 0): Promise<SavedAnalysis[]> {
  const db = await getDB();
  const tx = db.transaction('analyses', 'readonly');
  const store = tx.objectStore('analyses');
  const analyses = await store.getAll();
  return analyses.reverse().slice(offset, offset + limit);
}

export async function getFavoriteAnalyses(): Promise<SavedAnalysis[]> {
  const db = await getDB();
  const tx = db.transaction('analyses', 'readonly');
  const store = tx.objectStore('analyses');
  const analyses = await store.getAll();
  return analyses.filter(analysis => analysis.favorite).reverse();
}

export async function getRecentlyViewed(limit = 10): Promise<SavedAnalysis[]> {
  const db = await getDB();
  const tx = db.transaction('analyses', 'readonly');
  const store = tx.objectStore('analyses');
  const analyses = await store.getAll();
  return analyses
    .sort((a, b) => new Date(b.lastViewed).getTime() - new Date(a.lastViewed).getTime())
    .slice(0, limit);
}

export async function updateAnalysis(
  id: string,
  updates: Partial<SavedAnalysis>
): Promise<SavedAnalysis> {
  const db = await getDB();
  const tx = db.transaction('analyses', 'readwrite');
  const store = tx.objectStore('analyses');
  
  const analysis = await store.get(id);
  if (!analysis) {
    throw new Error('Analysis not found');
  }

  const updatedAnalysis: SavedAnalysis = {
    ...analysis,
    ...updates,
    updatedAt: new Date().toISOString(),
  };

  await store.put(updatedAnalysis);
  await tx.done;
  return updatedAnalysis;
}

export async function deleteAnalysis(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('analyses', id);
}

export async function toggleFavorite(id: string): Promise<SavedAnalysis> {
  const db = await getDB();
  const tx = db.transaction('analyses', 'readwrite');
  const store = tx.objectStore('analyses');
  
  const analysis = await store.get(id);
  if (!analysis) {
    throw new Error('Analysis not found');
  }

  const updatedAnalysis: SavedAnalysis = {
    ...analysis,
    favorite: !analysis.favorite,
    updatedAt: new Date().toISOString(),
  };
  
  await store.put(updatedAnalysis);
  await tx.done;
  return updatedAnalysis;
}

export async function addTags(id: string, newTags: string[]): Promise<SavedAnalysis> {
  const db = await getDB();
  const tx = db.transaction('analyses', 'readwrite');
  const store = tx.objectStore('analyses');
  
  const analysis = await store.get(id);
  if (!analysis) {
    throw new Error('Analysis not found');
  }

  const uniqueTags = Array.from(new Set([...analysis.tags, ...newTags]));
  const updatedAnalysis: SavedAnalysis = {
    ...analysis,
    tags: uniqueTags,
    updatedAt: new Date().toISOString(),
  };
  
  await store.put(updatedAnalysis);
  await tx.done;
  return updatedAnalysis;
}

export async function searchByTags(tags: string[]): Promise<SavedAnalysis[]> {
  const db = await getDB();
  const tx = db.transaction('analyses', 'readonly');
  const store = tx.objectStore('analyses');
  const analyses = await store.getAll();
  return analyses.filter(analysis => 
    tags.every(tag => analysis.tags.includes(tag))
  );
}

export async function updateLastViewed(id: string): Promise<SavedAnalysis> {
  const db = await getDB();
  const tx = db.transaction('analyses', 'readwrite');
  const store = tx.objectStore('analyses');
  
  const analysis = await store.get(id);
  if (!analysis) {
    throw new Error('Analysis not found');
  }

  const updatedAnalysis: SavedAnalysis = {
    ...analysis,
    lastViewed: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  await store.put(updatedAnalysis);
  await tx.done;
  return updatedAnalysis;
} 