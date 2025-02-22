import Dexie, { Table } from 'dexie';
import { TherapistResponse } from './api';

export interface Tag {
  name: string;
  color: string;
}

export interface SavedAnalysis {
  id: string;
  date: string;
  content: string;
  summary: string;
  response: TherapistResponse;
  tags: string[];
  favorite: boolean | number;
  lastViewed: string;
  createdAt: string;
  updatedAt: string;
}

class HealjaDatabase extends Dexie {
  analyses!: Table<SavedAnalysis>;
  tags!: Table<Tag>;

  constructor() {
    super('healja-db');
    
    this.version(2).stores({
      analyses: 'id, date, lastViewed, favorite, updatedAt, *tags',
      tags: 'name'
    });

    // Modify hooks to return new objects instead of modifying existing ones
    this.analyses.hook('reading', (obj: SavedAnalysis | null) => {
      if (!obj) return obj;
      return {
        ...obj,
        favorite: !!obj.favorite
      };
    });

    this.analyses.hook('creating', (primKey: string, obj: SavedAnalysis | null) => {
      if (!obj) return obj;
      return {
        ...obj,
        favorite: obj.favorite ? 1 : 0
      };
    });

    this.analyses.hook('updating', (modifications: Partial<SavedAnalysis> | null) => {
      if (!modifications) return modifications;
      const mods = { ...modifications };
      if (mods.hasOwnProperty('favorite')) {
        mods.favorite = mods.favorite ? 1 : 0;
      }
      return mods;
    });
  }

  async initialize(): Promise<void> {
    try {
      // Check if IndexedDB is supported
      if (!window.indexedDB) {
        throw new Error('Your browser does not support IndexedDB. Some features may not work.');
      }

      // Initialize database and add default tags if needed
      const tagCount = await this.tags.count();
      if (tagCount === 0) {
        await this.tags.bulkPut([
          {
            name: 'What ifs',
            color: '#88C0D0'
          },
          {
            name: 'Level 1',
            color: '#A3BE8C' // nord-14 (Green)
          },
          {
            name: 'Level 2',
            color: '#A3BE8C' // nord-14 (Green to Yellow)
          },
          {
            name: 'Level 3',
            color: '#EBCB8B' // nord-13 (Yellow)
          },
          {
            name: 'Level 4',
            color: '#D08770' // nord-12 (Orange)
          },
          {
            name: 'Level 5',
            color: '#BF616A' // nord-11 (Red)
          }
        ]);
      }
    } catch (error) {
      console.error('Failed to initialize database:', error);
      throw error;
    }
  }
}

const db = new HealjaDatabase();

// Initialize DB when the module loads in browser environment
if (typeof window !== 'undefined') {
  db.initialize().catch(error => {
    console.error('Database initialization error:', error);
  });
}

export async function saveAnalysis(
  content: string,
  response: TherapistResponse,
  tags: string[] = [],
  existingId?: string
): Promise<SavedAnalysis> {
  const now = new Date().toISOString();
  
  // Add severity level tag and What ifs tag if needed
  const severityTag = `Level ${Math.round(response.severity)}`;
  const whatIfsTag = response.rebuttals && response.rebuttals.length > 0 ? ['What ifs'] : [];
  const allTags = Array.from(new Set([...tags, severityTag, ...whatIfsTag]));
  
  const analysis: SavedAnalysis = {
    id: existingId || Date.now().toString(),
    date: new Date().toLocaleString(),
    content,
    summary: response.summary || 'Untitled Analysis',
    response,
    tags: allTags,
    favorite: false,
    lastViewed: now,
    createdAt: now,
    updatedAt: now,
  };

  if (existingId) {
    const existing = await db.analyses.get(existingId);
    if (existing) {
      analysis.favorite = existing.favorite;
      analysis.createdAt = existing.createdAt || now;
    }
  }

  try {
    await db.transaction('rw', db.analyses, db.tags, async () => {
      await db.analyses.put(analysis);
      
      // Ensure all tags exist in the tags store
      for (const tag of allTags) {
        const existingTag = await db.tags.get(tag);
        if (!existingTag) {
          await db.tags.put({
            name: tag,
            color: '#88C0D0' // Default color for new tags
          });
        }
      }
    });
    
    return analysis;
  } catch (error) {
    console.error('Database error while saving analysis:', error);
    throw new Error('Failed to save analysis to database');
  }
}

export async function getAllAnalyses(limit = 50, offset = 0): Promise<SavedAnalysis[]> {
  try {
    return await db.analyses
      .orderBy('updatedAt')
      .reverse()
      .offset(offset)
      .limit(limit)
      .toArray();
  } catch (error) {
    console.error('Error fetching analyses:', error);
    return [];
  }
}

export async function getFavoriteAnalyses(): Promise<SavedAnalysis[]> {
  return await db.analyses.where('favorite').equals(1).reverse().toArray();
}

export async function getRecentlyViewed(limit = 10): Promise<SavedAnalysis[]> {
  return await db.analyses.orderBy('lastViewed').reverse().limit(limit).toArray();
}

export async function updateAnalysis(
  id: string,
  updates: Partial<Omit<SavedAnalysis, 'id' | 'date' | 'createdAt'>>
): Promise<SavedAnalysis> {
  const existing = await db.analyses.get(id);
  if (!existing) {
    throw new Error('Analysis not found');
  }

  const updatedAnalysis = {
    ...existing,
    ...updates,
    updatedAt: new Date().toISOString()
  };

  await db.analyses.put(updatedAnalysis);
  return updatedAnalysis;
}

export async function deleteAnalysis(id: string): Promise<void> {
  await db.analyses.delete(id);
}

export async function toggleFavorite(id: string): Promise<SavedAnalysis> {
  return await db.transaction('rw', db.analyses, async () => {
    const analysis = await db.analyses.get(id);
    if (!analysis) {
      throw new Error('Analysis not found');
    }

    const updatedAnalysis: SavedAnalysis = {
      ...analysis,
      favorite: !analysis.favorite ? 1 : 0,
      updatedAt: new Date().toISOString(),
    };
    
    await db.analyses.put(updatedAnalysis);
    return {
      ...updatedAnalysis,
      favorite: !!updatedAnalysis.favorite
    };
  });
}

export async function addTags(id: string, newTags: string[]): Promise<SavedAnalysis> {
  return await db.transaction('rw', db.analyses, async () => {
    const analysis = await db.analyses.get(id);
    if (!analysis) {
      throw new Error('Analysis not found');
    }

    const uniqueTags = Array.from(new Set([...analysis.tags, ...newTags]));
    const updatedAnalysis: SavedAnalysis = {
      ...analysis,
      tags: uniqueTags,
      updatedAt: new Date().toISOString(),
    };
    
    await db.analyses.put(updatedAnalysis);
    return updatedAnalysis;
  });
}

export async function searchByTags(tags: string[]): Promise<SavedAnalysis[]> {
  return await db.analyses
    .filter((analysis: SavedAnalysis) => tags.every(tag => analysis.tags.includes(tag)))
    .toArray();
}

export async function updateLastViewed(id: string): Promise<SavedAnalysis> {
  return await db.transaction('rw', db.analyses, async () => {
    const analysis = await db.analyses.get(id);
    if (!analysis) {
      throw new Error('Analysis not found');
    }

    const updatedAnalysis: SavedAnalysis = {
      ...analysis,
      lastViewed: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await db.analyses.put(updatedAnalysis);
    return updatedAnalysis;
  });
}

export async function getAllTags(): Promise<Tag[]> {
  return await db.tags.toArray();
}

export async function saveTag(tag: Tag): Promise<Tag> {
  await db.tags.put(tag);
  return tag;
}

export async function deleteTag(tagName: string): Promise<void> {
  await db.transaction('rw', [db.tags, db.analyses], async () => {
    await db.tags.delete(tagName);
    
    const analysesWithTag = await db.analyses
      .filter((analysis: SavedAnalysis) => analysis.tags.includes(tagName))
      .toArray();
    
    for (const analysis of analysesWithTag) {
      const updatedTags = analysis.tags.filter((t: string) => t !== tagName);
      await saveAnalysis(
        analysis.content,
        analysis.response,
        updatedTags,
        analysis.id
      );
    }
  });
}

export async function getTagColor(tagName: string): Promise<string | null> {
  const tag = await db.tags.get(tagName);
  return tag?.color || null;
} 