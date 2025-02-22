'use client';

import { SavedAnalysis, Tag } from '@/lib/db';
import { getTextSimilarity, getMatchContext, formatDate } from '@/lib/utils/text';
import { getTagColorSync, getTagTextColor } from '@/lib/utils/tag';

interface SimilarEntriesProps {
  content: string;
  analyses: SavedAnalysis[];
  onLoad: (analysis: SavedAnalysis) => void;
  tags: Tag[];
}

export function SimilarEntries({ content, analyses, onLoad, tags }: SimilarEntriesProps) {
  if (!content.trim() || content.length < 3) return null;

  // Find similar analyses based on content
  const similarAnalyses = analyses
    .map(analysis => ({
      ...analysis,
      similarity: getTextSimilarity(content, analysis.content)
    }))
    .filter(analysis => analysis.similarity > 0.1)
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, 3);

  if (similarAnalyses.length === 0) return null;

  return (
    <div className="mt-4">
      <h3 className="text-sm font-medium text-nord-0 dark:text-nord-6 mb-2">
        Similar Past Entries
      </h3>
      <div className="space-y-2">
        {similarAnalyses.map(analysis => (
          <div
            key={analysis.id}
            className="p-3 bg-nord-6 dark:bg-nord-1 rounded-lg border border-nord-4/20 hover:border-nord-4/40 cursor-pointer transition-all"
            onClick={() => onLoad(analysis)}
          >
            <div className="text-sm text-nord-0 dark:text-nord-6">
              {getMatchContext(analysis.content, content)}
            </div>
            <div className="mt-2 flex items-center gap-2">
              <span className="text-xs text-nord-3">
                {formatDate(analysis.createdAt)}
              </span>
              {analysis.tags?.map(tag => {
                const tagColor = getTagColorSync(tag, tags);
                return (
                  <span
                    key={tag}
                    className="text-xs px-2 py-0.5 rounded-full"
                    style={{ 
                      backgroundColor: tagColor,
                      color: getTagTextColor(tagColor)
                    }}
                  >
                    {tag}
                  </span>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
} 