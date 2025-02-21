'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Switch } from '@headlessui/react';
import { TextArea } from '@/components/TextArea';
import { Card, ListCard, SeverityIndicator } from '@/components/Card';
import { TherapistResponse } from '@/lib/api';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import ReactMarkdown from 'react-markdown';
import { 
  saveAnalysis as dbSaveAnalysis,
  getAllAnalyses,
  deleteAnalysis as dbDeleteAnalysis,
  toggleFavorite,
  updateLastViewed,
  getFavoriteAnalyses,
  getRecentlyViewed,
  SavedAnalysis,
  Tag,
  getAllTags,
  saveTag,
  deleteTag,
  getTagColor
} from '@/lib/db';

const getGradientColor = (severity: number) => {
  switch (Math.round(severity)) {
    case 1:
      return 'bg-nord-14/90 text-nord-0'; // Green
    case 2:
      return 'bg-nord-14/90 text-nord-0'; // Green to Yellow
    case 3:
      return 'bg-nord-13/90 text-nord-0'; // Yellow
    case 4:
      return 'bg-nord-12/90 text-nord-6'; // Orange
    case 5:
      return 'bg-nord-11/90 text-nord-6'; // Red
    default:
      return 'bg-nord-3 text-nord-6';
  }
};

const getMatchContext = (text: string, searchQuery: string, contextLength: number = 100): string => {
  if (!searchQuery) return text.slice(0, contextLength);
  
  const index = text.toLowerCase().indexOf(searchQuery.toLowerCase());
  if (index === -1) return text.slice(0, contextLength);
  
  const start = Math.max(0, index - contextLength / 2);
  const end = Math.min(text.length, index + searchQuery.length + contextLength / 2);
  
  let context = text.slice(start, end);
  if (start > 0) context = '...' + context;
  if (end < text.length) context = context + '...';
  
  return context;
};

const HighlightedText = ({ text, searchQuery }: { text: string; searchQuery: string }) => {
  if (!searchQuery) return <>{text}</>;
  
  const parts = text.split(new RegExp(`(${searchQuery})`, 'gi'));
  return (
    <>
      {parts.map((part, i) => 
        part.toLowerCase() === searchQuery.toLowerCase() ? (
          <span key={i} className="bg-nord-10/20 dark:bg-nord-10/30 text-nord-0 dark:text-nord-6 rounded px-0.5">
            {part}
          </span>
        ) : (
          part
        )
      )}
    </>
  );
};

const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  
  // For dates today, show time only
  const today = new Date();
  if (date.toDateString() === today.toDateString()) {
    return `Today at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}`;
  }
  
  // For dates yesterday, show "Yesterday"
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) {
    return `Yesterday at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}`;
  }
  
  // For dates within the last week, show day name
  const oneWeekAgo = new Date(today);
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
  if (date > oneWeekAgo) {
    return `${date.toLocaleDateString([], { weekday: 'long' })} at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}`;
  }
  
  // For all other dates, show full date
  return date.toLocaleDateString([], { 
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });
};

const calmingQuotes = [
  "Your thoughts are like waves on the ocean - they rise, fall, and eventually return to calm",
  "In the space between thoughts lies a moment of pure peace",
  "Like gentle waves washing over sand, each breath brings renewed clarity",
  "Sometimes the quietest moments bring the deepest insights",
  "Every storm passes, leaving behind clearer skies",
  "Your mind is like a still lake - observe its surface with gentle awareness",
  "Small ripples of change can lead to waves of transformation",
  "In the ebb and flow of thoughts, find your natural rhythm",
  "Let your worries float away like leaves on a stream",
  "Each moment is a new chance to find your balance"
];

function LoadingWave() {
  const [quoteIndex, setQuoteIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setQuoteIndex(current => (current + 1) % calmingQuotes.length);
    }, 15000);

    return () => clearInterval(interval);
  }, []);

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="max-w-4xl mx-auto p-8 rounded-lg bg-nord-6 dark:bg-nord-2 border border-nord-4 dark:border-nord-3 hover:border-nord-4/80 dark:hover:border-nord-3/80 hover-border shadow-md"
    >
      <div className="flex flex-col items-center space-y-6">
        <div className="flex space-x-2">
          {[...Array(4)].map((_, i) => (
            <motion.div
              key={i}
              className="w-3 h-3 rounded-full bg-nord-10/80"
              animate={{
                y: ["0%", "-50%", "0%"],
                opacity: [1, 0.5, 1],
              }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                delay: i * 0.2,
                ease: "easeInOut"
              }}
            />
          ))}
        </div>
        <p className="text-nord-0 dark:text-nord-4 font-medium">Analyzing your concern...</p>
        
        <motion.div
          key={quoteIndex}
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -5 }}
          transition={{
            duration: 2,
            ease: "easeInOut"
          }}
          className="text-center max-w-lg min-h-[3rem] flex items-center justify-center"
        >
          <p className="text-nord-0 dark:text-nord-4 italic">{calmingQuotes[quoteIndex]}</p>
        </motion.div>
      </div>
    </motion.div>
  );
}

// Add these utility functions at the top level
const normalizeText = (text: string): string => {
  return text
    .toLowerCase()
    .normalize('NFKD') // Normalize unicode characters
    .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
    .replace(/[^a-z0-9\s]/g, ' ') // Replace non-alphanumeric with spaces
    .replace(/\s+/g, ' ') // Replace multiple spaces with single space
    .trim();
};

const getWordSimilarity = (text1: string, text2: string): number => {
  const words1 = new Set(normalizeText(text1).split(' '));
  const words2 = new Set(normalizeText(text2).split(' '));
  
  const intersection = new Set([...words1].filter(x => words2.has(x)));
  const union = new Set([...words1, ...words2]);
  
  return intersection.size / union.size;
};

const getTextSimilarity = (text1: string, text2: string): number => {
  // Get both word-level and character-level similarity
  const wordSim = getWordSimilarity(text1, text2);
  
  // Get character-level similarity for catching typos and partial matches
  const norm1 = normalizeText(text1);
  const norm2 = normalizeText(text2);
  const maxLen = Math.max(norm1.length, norm2.length);
  const levenshtein = maxLen - levenshteinDistance(norm1, norm2);
  const charSim = levenshtein / maxLen;
  
  // Combine both metrics with more weight on word similarity
  return (wordSim * 0.7) + (charSim * 0.3);
};

// Levenshtein distance for character-level similarity
const levenshteinDistance = (str1: string, str2: string): number => {
  const track = Array(str2.length + 1).fill(null).map(() =>
    Array(str1.length + 1).fill(null));
  for (let i = 0; i <= str1.length; i += 1) {
    track[0][i] = i;
  }
  for (let j = 0; j <= str2.length; j += 1) {
    track[j][0] = j;
  }
  for (let j = 1; j <= str2.length; j += 1) {
    for (let i = 1; i <= str1.length; i += 1) {
      const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
      track[j][i] = Math.min(
        track[j][i - 1] + 1,
        track[j - 1][i] + 1,
        track[j - 1][i - 1] + indicator
      );
    }
  }
  return track[str2.length][str1.length];
};

const SimilarEntries = ({ content, analyses, onLoad, tags }: { 
  content: string; 
  analyses: SavedAnalysis[]; 
  onLoad: (analysis: SavedAnalysis) => void;
  tags: Tag[];
}) => {
  if (!content.trim() || content.length < 3) return null;

  // Find similar analyses based on content
  const similarAnalyses = analyses
    .map(analysis => {
      const contentSimilarity = getTextSimilarity(content, analysis.content);
      const summarySimilarity = getTextSimilarity(content, analysis.summary);
      
      // Calculate tag relevance
      const tagRelevance = analysis.tags.reduce((acc, tag) => {
        const tagSimilarity = getTextSimilarity(content, tag);
        return acc + (tagSimilarity * 0.1); // Small boost for matching tags
      }, 0);
      
      // Combine different similarity scores
      const totalScore = (contentSimilarity * 0.6) + // Content is most important
                        (summarySimilarity * 0.3) + // Summary is next
                        tagRelevance; // Tags provide a small boost
      
      return {
        analysis,
        score: totalScore
      };
    })
    .filter(({ score }) => score > 0.1) // Only keep somewhat relevant matches
    .sort((a, b) => b.score - a.score)
    .slice(0, 3); // Show top 3 matches

  if (similarAnalyses.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="mt-2 space-y-2"
    >
      <p className="text-sm text-nord-3 dark:text-nord-4">Similar past entries:</p>
      <div className="space-y-2">
        {similarAnalyses.map(({ analysis }) => (
          <motion.div
            key={analysis.id}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="p-3 bg-nord-6/50 dark:bg-nord-1/50 rounded-lg border border-nord-4/20 hover:border-nord-4/40 hover-border group"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h4 className="text-sm font-medium text-nord-0 dark:text-nord-6 mb-1">
                  {analysis.summary}
                </h4>
                <p className="text-xs text-nord-3 dark:text-nord-4 line-clamp-2">
                  {analysis.content}
                </p>
                {analysis.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {analysis.tags.map(tag => {
                      const tagData = tags.find(t => t.name === tag);
                      return (
                        <span
                          key={tag}
                          style={{
                            backgroundColor: tagData ? `${tagData.color}20` : undefined,
                            borderColor: tagData ? `${tagData.color}30` : undefined,
                            color: tagData ? tagData.color : undefined
                          }}
                          className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border shadow-sm"
                        >
                          {tag}
                        </span>
                      );
                    })}
                  </div>
                )}
              </div>
              <div className="flex items-center space-x-2 ml-2">
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(analysis.content);
                  }}
                  className="opacity-0 group-hover:opacity-100 transition-opacity text-nord-10 dark:text-nord-8 hover:text-nord-9 p-1"
                  title="Copy content"
                >
                  <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M8 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" />
                    <path d="M6 3a2 2 0 00-2 2v11a2 2 0 002 2h8a2 2 0 002-2V5a2 2 0 00-2-2 3 3 0 01-3 3H9a3 3 0 01-3-3z" />
                  </svg>
                </button>
                <button
                  onClick={() => onLoad(analysis)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity text-nord-10 dark:text-nord-8 hover:text-nord-9 p-1"
                  title="Load entry"
                >
                  <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" />
                  </svg>
                </button>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
};

const WaveTransition = ({ isActive, onComplete }: { isActive: boolean; onComplete: () => void }) => {
  useEffect(() => {
    if (isActive) {
      const timer = setTimeout(onComplete, 400); // Much shorter duration
      return () => clearTimeout(timer);
    }
  }, [isActive, onComplete]);

  if (!isActive) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{
        duration: 0.3, // Much faster fade
        ease: "easeInOut"
      }}
      className="fixed inset-0 z-50 pointer-events-none bg-nord-6 dark:bg-nord-0"
    />
  );
};

export default function Home() {
  const [content, setContent] = useState('');
  const [includeRebuttals, setIncludeRebuttals] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showIntro, setShowIntro] = useState(true);
  const [response, setResponse] = useState<TherapistResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [savedAnalyses, setSavedAnalyses] = useState<SavedAnalysis[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSavedAnalyses, setShowSavedAnalyses] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [exportingPdf, setExportingPdf] = useState<string | null>(null);
  const analysisRef = useRef<HTMLDivElement>(null);
  const [openExportMenu, setOpenExportMenu] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'all' | 'favorites' | 'recent' | 'tags'>('all');
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const [editingTitleId, setEditingTitleId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [editingTagsId, setEditingTagsId] = useState<string | null>(null);
  const [newTag, setNewTag] = useState('');
  const [tagSuggestions, setTagSuggestions] = useState<string[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [editingTagColor, setEditingTagColor] = useState<string | null>(null);
  const [newTagColor, setNewTagColor] = useState('#88C0D0');
  const [editingAnalysisId, setEditingAnalysisId] = useState<string | null>(null);
  const [editingAnalysisTag, setEditingAnalysisTag] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [showTagSuggestions, setShowTagSuggestions] = useState(false);
  const [isTypingTag, setIsTypingTag] = useState(false);
  const [tagInputStart, setTagInputStart] = useState(-1);
  const [editingTagName, setEditingTagName] = useState<string | null>(null);
  const [newTagName, setNewTagName] = useState('');
  const [showWaveTransition, setShowWaveTransition] = useState(false);

  // Load saved analyses and preferences on mount
  useEffect(() => {
    const loadAnalyses = async () => {
      setIsLoadingHistory(true);
      try {
        let analyses;
        switch (viewMode) {
          case 'favorites':
            analyses = await getFavoriteAnalyses();
            break;
          case 'recent':
            analyses = await getRecentlyViewed();
            break;
          default:
            analyses = await getAllAnalyses();
        }
        setSavedAnalyses(analyses);
      } catch (error) {
        console.error('Error loading analyses:', error);
      } finally {
        setIsLoadingHistory(false);
      }
    };

    loadAnalyses();
    
    // Load what-if preference
    const savedWhatIf = localStorage.getItem('healja-what-if');
    if (savedWhatIf !== null) {
      setIncludeRebuttals(JSON.parse(savedWhatIf));
    }

    // Check if user has seen intro
    const hasSeenIntro = localStorage.getItem('healja-seen-intro');
    if (hasSeenIntro) {
      setShowIntro(false);
    }
  }, [viewMode]);

  // Add click outside handler
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (openExportMenu && !(event.target as Element).closest('.export-menu-container')) {
        setOpenExportMenu(null);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [openExportMenu]);

  // Add this after the existing useEffect blocks
  useEffect(() => {
    const loadTagSuggestions = async () => {
      const allAnalyses = await getAllAnalyses();
      // Create a Map to track tag usage count
      const tagUsageCount = new Map<string, number>();
      
      allAnalyses.forEach(analysis => {
        analysis.tags.forEach(tag => {
          tagUsageCount.set(tag, (tagUsageCount.get(tag) || 0) + 1);
        });
      });
      
      // Only keep tags that are used at least once
      const activeTags = Array.from(tagUsageCount.keys());
      setTagSuggestions(activeTags);
    };
    loadTagSuggestions();
  }, []);

  useEffect(() => {
    const loadTags = async () => {
      const allTags = await getAllTags();
      setTags(allTags);
    };
    loadTags();
  }, []);

  const saveAnalysis = async (content: string, response: TherapistResponse) => {
    try {
      // Add "What ifs" tag if rebuttals are included
      const tags = response.rebuttals && response.rebuttals.length > 0 ? ['What ifs'] : [];
      const newAnalysis = await dbSaveAnalysis(content, response, tags);
      
      // Update the local state
      setSavedAnalyses(prev => [newAnalysis, ...prev]);
      
      // Refresh the analyses list to ensure everything is up to date
      const updatedAnalyses = await getAllAnalyses();
      setSavedAnalyses(updatedAnalyses);
      
      // Also refresh the tag suggestions
      const allTags = await getAllTags();
      setTags(allTags);
      
      // Update tag suggestions
      const tagUsageCount = new Map<string, number>();
      updatedAnalyses.forEach(analysis => {
        analysis.tags.forEach(tag => {
          tagUsageCount.set(tag, (tagUsageCount.get(tag) || 0) + 1);
        });
      });
      setTagSuggestions(Array.from(tagUsageCount.keys()));
      
      return newAnalysis;
    } catch (error) {
      console.error('Error saving analysis:', error);
      setError('Failed to save analysis. Please try again.');
      throw error;
    }
  };

  const loadAnalysis = async (savedAnalysis: typeof savedAnalyses[0]) => {
    try {
      await updateLastViewed(savedAnalysis.id);
      setContent(savedAnalysis.content);
      setResponse(savedAnalysis.response);
      setShowSavedAnalyses(false);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (error) {
      console.error('Error updating last viewed:', error);
    }
  };

  const deleteAnalysis = async (id: string) => {
    try {
      await dbDeleteAnalysis(id);
      setSavedAnalyses(prev => prev.filter(analysis => analysis.id !== id));
    } catch (error) {
      console.error('Error deleting analysis:', error);
    }
  };

  const handleToggleFavorite = async (id: string) => {
    try {
      const updatedAnalysis = await toggleFavorite(id);
      setSavedAnalyses(prev => 
        prev.map(analysis => 
          analysis.id === id ? updatedAnalysis : analysis
        )
      );
    } catch (error) {
      console.error('Error toggling favorite:', error);
    }
  };

  const generateMarkdown = (analysis: typeof savedAnalyses[0]) => {
    const { response, content, date } = analysis;
    const { severity, explanation, cbtAnalysis, rebuttals } = response;

    const markdown = `# Analysis from ${date}

## Original Concern
${content}

## Overview
Severity Level: ${severity}/5
${explanation}

## Key Points
${response.explanations.map((exp, i) => `${i + 1}. **${exp.title}**\n   ${exp.content}`).join('\n\n')}

## Thought Patterns
${cbtAnalysis.thoughtPatterns.map(pattern => (
`### ${pattern.pattern}
- **Impact:** ${pattern.impact}
- **Solution:** ${pattern.solution}`
)).join('\n\n')}

## Coping Strategies
${cbtAnalysis.copingStrategies.map(strategy => (
`### ${strategy.strategy}
${strategy.explanation}

**How to:**
${strategy.howTo.split('\n').map(step => `- ${step}`).join('\n')}`
)).join('\n\n')}

${rebuttals ? `
## What If Scenarios
${rebuttals.map(rebuttal => (
`### ${rebuttal.concern}
${rebuttal.response}`
)).join('\n\n')}` : ''}`;

    return markdown;
  };

  const downloadMarkdown = (analysis: typeof savedAnalyses[0]) => {
    const markdown = generateMarkdown(analysis);
    const blob = new Blob([markdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `healja-analysis-${analysis.date.replace(/[/\\?%*:|"<>]/g, '-')}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const downloadPdf = async (analysis: typeof savedAnalyses[0]) => {
    setExportingPdf(analysis.id);
    
    try {
      const { response, content, date } = analysis;
      const pdf = new jsPDF();
      
      // Helper function to add text with line wrapping
      const addWrappedText = (text: string, y: number) => {
        const lines = pdf.splitTextToSize(text, 180);
        pdf.text(lines, 15, y);
        return y + (lines.length * 7);
      };

      // Title
      pdf.setFontSize(20);
      pdf.text('Healja Analysis', 15, 20);
      pdf.setFontSize(12);
      pdf.text(date, 15, 30);

      let yPosition = 45;

      // Original concern
      pdf.setFontSize(16);
      pdf.text('Original Concern', 15, yPosition);
      pdf.setFontSize(12);
      yPosition = addWrappedText(content, yPosition + 10);

      // Overview
      yPosition += 15;
      pdf.setFontSize(16);
      pdf.text('Overview', 15, yPosition);
      pdf.setFontSize(12);
      pdf.text(`Severity Level: ${response.severity}/5`, 15, yPosition + 10);
      yPosition = addWrappedText(response.explanation, yPosition + 20);

      // Key Points
      yPosition += 15;
      pdf.setFontSize(16);
      pdf.text('Key Points', 15, yPosition);
      pdf.setFontSize(12);
      response.explanations.forEach((exp, i) => {
        yPosition += 10;
        if (yPosition > 270) {
          pdf.addPage();
          yPosition = 20;
        }
        pdf.text(`${i + 1}. ${exp.title}`, 15, yPosition);
        yPosition = addWrappedText(exp.content, yPosition + 7);
      });

      // Thought Patterns
      yPosition += 15;
      if (yPosition > 250) {
        pdf.addPage();
        yPosition = 20;
      }
      pdf.setFontSize(16);
      pdf.text('Thought Patterns', 15, yPosition);
      pdf.setFontSize(12);
      response.cbtAnalysis.thoughtPatterns.forEach((pattern) => {
        yPosition += 10;
        if (yPosition > 250) {
          pdf.addPage();
          yPosition = 20;
        }
        pdf.text(pattern.pattern, 15, yPosition);
        yPosition = addWrappedText(`Impact: ${pattern.impact}`, yPosition + 7);
        yPosition = addWrappedText(`Solution: ${pattern.solution}`, yPosition + 7);
      });

      // Coping Strategies
      yPosition += 15;
      if (yPosition > 250) {
        pdf.addPage();
        yPosition = 20;
      }
      pdf.setFontSize(16);
      pdf.text('Coping Strategies', 15, yPosition);
      pdf.setFontSize(12);
      response.cbtAnalysis.copingStrategies.forEach((strategy) => {
        yPosition += 10;
        if (yPosition > 250) {
          pdf.addPage();
          yPosition = 20;
        }
        pdf.text(strategy.strategy, 15, yPosition);
        yPosition = addWrappedText(strategy.explanation, yPosition + 7);
        yPosition += 7;
        pdf.text('How to:', 15, yPosition);
        strategy.howTo.split('\n').forEach((step, index) => {
          yPosition = addWrappedText(`${index + 1}. ${step}`, yPosition + 7);
        });
      });

      // What If Scenarios (if present)
      if (response.rebuttals && response.rebuttals.length > 0) {
        yPosition += 15;
        if (yPosition > 250) {
          pdf.addPage();
          yPosition = 20;
        }
        pdf.setFontSize(16);
        pdf.text('What If Scenarios', 15, yPosition);
        pdf.setFontSize(12);
        response.rebuttals.forEach((rebuttal) => {
          yPosition += 10;
          if (yPosition > 250) {
            pdf.addPage();
            yPosition = 20;
          }
          pdf.text(rebuttal.concern, 15, yPosition);
          yPosition = addWrappedText(rebuttal.response, yPosition + 7);
        });
      }

      pdf.save(`healja-analysis-${analysis.date.replace(/[/\\?%*:|"<>]/g, '-')}.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
    } finally {
      setExportingPdf(null);
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Get supported MIME types for Whisper API
      const mimeType = [
        'audio/wav',
        'audio/mp3',
        'audio/mp4',
        'audio/ogg',
        'audio/webm'
      ].find(type => MediaRecorder.isTypeSupported(type)) || '';

      if (!mimeType) {
        throw new Error('No supported audio format available');
      }

      console.log('Using MIME type:', mimeType);
      
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: mimeType,
        audioBitsPerSecond: 128000 // Set a reasonable bitrate
      });
      
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
          console.log('Audio chunk received:', event.data.size, 'bytes');
        }
      };

      mediaRecorder.onstop = async () => {
        // Create blob with the recorded audio
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
        console.log('Recording stopped. Blob size:', audioBlob.size, 'bytes, type:', audioBlob.type);

        // Convert to WAV if necessary
        let finalBlob = audioBlob;
        let finalType = mimeType;

        // If not already in a supported format, convert to WAV
        if (!['audio/wav', 'audio/mp3', 'audio/mp4', 'audio/ogg', 'audio/webm'].includes(mimeType)) {
          try {
            const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
            const audioContext = new AudioContextClass();
            const audioData = await audioBlob.arrayBuffer();
            const audioBuffer = await audioContext.decodeAudioData(audioData);
            
            // Convert to WAV
            const wavBlob = await convertToWav(audioBuffer);
            finalBlob = wavBlob;
            finalType = 'audio/wav';
            console.log('Converted audio to WAV format');
          } catch (error) {
            console.error('Error converting audio format:', error);
            setError('Error processing audio. Please try again.');
            return;
          }
        }

        handleSubmitAudio(finalBlob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start(1000); // Record in 1-second chunks
      console.log('Started recording with mime type:', mediaRecorder.mimeType);
      setIsRecording(true);
    } catch (error) {
      console.error('Error accessing microphone:', error);
      setError(error instanceof Error 
        ? `Microphone error: ${error.message}` 
        : 'Could not access microphone. Please check your permissions.');
    }
  };

  // Helper function to convert AudioBuffer to WAV format
  const convertToWav = async (audioBuffer: AudioBuffer): Promise<Blob> => {
    const numOfChannels = audioBuffer.numberOfChannels;
    const length = audioBuffer.length * numOfChannels * 2;
    const buffer = new ArrayBuffer(44 + length);
    const view = new DataView(buffer);
    
    // Write WAV header
    writeUTFBytes(view, 0, 'RIFF');
    view.setUint32(4, 36 + length, true);
    writeUTFBytes(view, 8, 'WAVE');
    writeUTFBytes(view, 12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, numOfChannels, true);
    view.setUint32(24, audioBuffer.sampleRate, true);
    view.setUint32(28, audioBuffer.sampleRate * 2 * numOfChannels, true);
    view.setUint16(32, numOfChannels * 2, true);
    view.setUint16(34, 16, true);
    writeUTFBytes(view, 36, 'data');
    view.setUint32(40, length, true);

    // Write audio data
    const offset = 44;
    const channelData = new Float32Array(audioBuffer.length);
    let index = 0;
    
    for (let i = 0; i < audioBuffer.numberOfChannels; i++) {
      audioBuffer.copyFromChannel(channelData, i);
      for (let j = 0; j < channelData.length; j++) {
        const sample = Math.max(-1, Math.min(1, channelData[j]));
        view.setInt16(offset + index, sample < 0 ? sample * 0x8000 : sample * 0x7FFF, true);
        index += 2;
      }
    }

    return new Blob([buffer], { type: 'audio/wav' });
  };

  const writeUTFBytes = (view: DataView, offset: number, string: string) => {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const handleSubmitAudio = async (audioBlob: Blob) => {
    if (!audioBlob) return;
    if (audioBlob.size === 0) {
      setError('No audio data recorded. Please try again.');
      return;
    }

    console.log('Submitting audio blob:', {
      size: audioBlob.size,
      type: audioBlob.type
    });

    setIsLoading(true);
    setError(null);

    // Determine file extension based on MIME type
    const fileExtension = audioBlob.type === 'audio/wav' ? '.wav'
      : audioBlob.type === 'audio/mp3' ? '.mp3'
      : audioBlob.type === 'audio/mp4' ? '.mp4'
      : audioBlob.type === 'audio/ogg' ? '.ogg'
      : audioBlob.type === 'audio/webm' ? '.webm'
      : '.wav'; // default to .wav

    const formData = new FormData();
    formData.append('audio', audioBlob, `audio${fileExtension}`);

    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      console.log('Server response:', data);
      
      if (!res.ok) {
        throw new Error(data.error || 'Failed to transcribe');
      }
      
      if (data.transcription) {
        setContent(data.transcription);
      }
    } catch (error) {
      console.error('Error:', error);
      setError(error instanceof Error ? error.message : 'An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!content.trim() || isLoading) return;

    setIsLoading(true);
    setError(null);
    
    const formData = new FormData();
    formData.append('content', content);
    formData.append('includeRebuttals', String(includeRebuttals));

    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || 'Failed to analyze');
      }
      
      setResponse(data.analysis);
      await saveAnalysis(content, data.analysis);
    } catch (error) {
      console.error('Error:', error);
      setError(error instanceof Error ? error.message : 'An unexpected error occurred');
      setResponse(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTitleEdit = async (analysis: SavedAnalysis, newTitle: string) => {
    try {
      const updatedAnalysis = await dbSaveAnalysis(
        analysis.content,
        {
          ...analysis.response,
          summary: newTitle
        },
        analysis.tags,
        analysis.id
      );
      setSavedAnalyses(prev => 
        prev.map(a => a.id === analysis.id ? updatedAnalysis : a)
      );
      setEditingTitleId(null);
    } catch (error) {
      console.error('Error updating title:', error);
      setError('Failed to update title. Please try again.');
    }
  };

  const handleTagsEdit = async (analysis: SavedAnalysis, tags: string[]) => {
    try {
      const updatedAnalysis = await dbSaveAnalysis(
        analysis.content,
        analysis.response,
        tags,
        analysis.id
      );
      setSavedAnalyses(prev => 
        prev.map(a => a.id === analysis.id ? updatedAnalysis : a)
      );
      setEditingTagsId(null);
    } catch (error) {
      console.error('Error updating tags:', error);
      setError('Failed to update tags. Please try again.');
    }
  };

  const handleRemoveTag = async (analysis: SavedAnalysis, tagToRemove: string) => {
    const newTags = analysis.tags.filter(tag => tag !== tagToRemove);
    await handleTagsEdit(analysis, newTags);
    
    // After removing the tag, check if it's still used in other analyses
    const allAnalyses = await getAllAnalyses();
    const isTagStillUsed = allAnalyses.some(a => 
      a.id !== analysis.id && a.tags.includes(tagToRemove)
    );
    
    // If the tag is no longer used anywhere, remove it from suggestions
    if (!isTagStillUsed) {
      setTagSuggestions(prev => prev.filter(tag => tag !== tagToRemove));
    }
  };

  const handleAddTag = async (analysis: SavedAnalysis | null, tag: string) => {
    if (!tag.trim()) return;
    const trimmedTag = tag.trim();
    
    // If we're in the Tags view (analysis is null), just create the tag
    if (!analysis) {
      const tagExists = tags.some(t => t.name === trimmedTag);
      if (!tagExists) {
        const newTag = await saveTag({ name: trimmedTag, color: newTagColor });
        setTags(prev => [...prev, newTag]);
      }
      setNewTag('');
      return;
    }

    // Otherwise, add the tag to the specific analysis
    const newTags = [...new Set([...analysis.tags, trimmedTag])];
    await handleTagsEdit(analysis, newTags);
    
    // Add the new tag to suggestions and tag management if it's not already there
    const tagExists = tags.some(t => t.name === trimmedTag);
    if (!tagExists) {
      const newTag = await saveTag({ name: trimmedTag, color: newTagColor });
      setTags(prev => [...prev, newTag]);
    }
    setNewTag('');
  };

  const handleTagColorChange = async (tagName: string, color: string) => {
    try {
      const updatedTag = await saveTag({ name: tagName, color });
      setTags(prev => prev.map(t => t.name === tagName ? updatedTag : t));
      setEditingTagColor(null);
    } catch (error) {
      console.error('Error updating tag color:', error);
      setError('Failed to update tag color. Please try again.');
    }
  };

  const handleTagDelete = async (tagName: string) => {
    try {
      await deleteTag(tagName);
      setTags(prev => prev.filter(t => t.name !== tagName));
    } catch (error) {
      console.error('Error deleting tag:', error);
      setError('Failed to delete tag. Please try again.');
    }
  };

  const handleTagClick = (tag: string) => {
    setSelectedTags(prev => {
      const isSelected = prev.includes(tag);
      if (isSelected) {
        return prev.filter(t => t !== tag);
      } else {
        return [...prev, tag];
      }
    });
    setViewMode('all');
  };

  const handleClearTags = () => {
    setSelectedTags([]);
  };

  const filteredAnalyses = savedAnalyses.filter(analysis => {
    const searchLower = searchQuery.toLowerCase();
    
    // If there's no search query, just check tags
    if (!searchLower) {
      return selectedTags.length === 0 || 
        selectedTags.every(tag => analysis.tags.includes(tag));
    }
    
    // Calculate similarity scores
    const contentSimilarity = getTextSimilarity(searchQuery, analysis.content);
    const summarySimilarity = getTextSimilarity(searchQuery, analysis.summary);
    const tagSimilarity = analysis.tags.some(tag => 
      getTextSimilarity(searchQuery, tag) > 0.8
    );
    
    // Match if any similarity is high enough or exact matches exist
    const matches = contentSimilarity > 0.15 || 
                   summarySimilarity > 0.3 ||
                   tagSimilarity ||
      analysis.content.toLowerCase().includes(searchLower) ||
      analysis.summary.toLowerCase().includes(searchLower) ||
                   analysis.tags.some(tag => tag.toLowerCase().includes(searchLower));

    // Check selected tags
    const matchesTags = selectedTags.length === 0 || 
      selectedTags.every(tag => analysis.tags.includes(tag));

    return matches && matchesTags;
  });

  const handleTagRename = async (oldName: string, newName: string) => {
    if (!newName.trim() || oldName === newName) {
      setEditingTagName(null);
      return;
    }

    try {
      // Update the tag in the tags table
      const tagData = tags.find(t => t.name === oldName);
      if (!tagData) return;

      await saveTag({
        name: newName.trim(),
        color: tagData.color
      });

      // Update all analyses that use this tag
      const analysesWithTag = savedAnalyses.filter(a => a.tags.includes(oldName));
      for (const analysis of analysesWithTag) {
        const newTags = analysis.tags.map(t => t === oldName ? newName : t);
        await dbSaveAnalysis(
          analysis.content,
          analysis.response,
          newTags,
          analysis.id
        );
      }

      // Delete the old tag
      await deleteTag(oldName);

      // Update local state
      setTags(prev => prev.map(t => t.name === oldName ? { ...t, name: newName } : t));
      setSavedAnalyses(prev => prev.map(a => ({
        ...a,
        tags: a.tags.map(t => t === oldName ? newName : t)
      })));
      setEditingTagName(null);
    } catch (error) {
      console.error('Error renaming tag:', error);
      setError('Failed to rename tag. Please try again.');
    }
  };

  // Add reset function
  const resetToInitialState = () => {
    setContent('');
    setResponse(null);
    setError(null);
    setShowSavedAnalyses(false);
    setSearchQuery('');
    setSelectedTags([]);
    setViewMode('all');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <main className="min-h-screen bg-nord-6 dark:bg-nord-0">
      <AnimatePresence>
        {showWaveTransition && (
          <WaveTransition 
            isActive={showWaveTransition} 
            onComplete={() => {
              setShowWaveTransition(false);
              resetToInitialState();
            }}
          />
        )}
      </AnimatePresence>
      <div className="max-w-4xl mx-auto px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex items-center gap-6 mb-12"
        >
          <img 
            src="/logo-animated.svg" 
            alt="Healja Logo" 
            className="w-20 h-20 cursor-pointer hover:scale-105 transition-transform"
            onClick={() => setShowWaveTransition(true)}
          />
          <div className="flex-1">
            <h1 className="text-4xl font-bold mb-2">
              <span className="inline-block bg-gradient-to-r from-nord-10 via-nord-9 to-nord-8 dark:from-nord-7 dark:via-nord-8 dark:to-nord-10 text-transparent bg-clip-text animate-title">
                Healja
              </span>
            </h1>
            <p className="text-lg text-nord-3 dark:text-nord-4">
              Share your concerns and receive a calming, rational perspective.
            </p>
          </div>
          <button
            onClick={() => setShowSavedAnalyses(!showSavedAnalyses)}
            className="px-4 py-2 rounded-lg text-nord-10 font-medium hover-bg hover:bg-nord-10/10"
          >
            {showSavedAnalyses ? 'Close History' : 'View History'}
          </button>
        </motion.div>

        {showSavedAnalyses && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8 space-y-4"
          >
            <div className="flex flex-col space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-nord-0 dark:text-nord-6">Past Analyses</h2>
                <div className="flex space-x-2">
                  <button
                    onClick={() => setViewMode('all')}
                    className={`px-3 py-1 rounded text-sm ${
                      viewMode === 'all'
                        ? 'bg-nord-10 text-nord-6'
                        : 'text-nord-10 hover:bg-nord-10/10 hover-bg'
                    }`}
                  >
                    All
                  </button>
                  <button
                    onClick={() => setViewMode('favorites')}
                    className={`px-3 py-1 rounded text-sm ${
                      viewMode === 'favorites'
                        ? 'bg-nord-10 text-nord-6'
                        : 'text-nord-10 hover:bg-nord-10/10 hover-bg'
                    }`}
                  >
                    Favorites
                  </button>
                  <button
                    onClick={() => setViewMode('recent')}
                    className={`px-3 py-1 rounded text-sm ${
                      viewMode === 'recent'
                        ? 'bg-nord-10 text-nord-6'
                        : 'text-nord-10 hover:bg-nord-10/10 hover-bg'
                    }`}
                  >
                    Recent
                  </button>
                  <button
                    onClick={() => setViewMode('tags')}
                    className={`px-3 py-1 rounded text-sm ${
                      viewMode === 'tags'
                        ? 'bg-nord-10 text-nord-6'
                        : 'text-nord-10 hover:bg-nord-10/10 hover-bg'
                    }`}
                  >
                    Tags
                  </button>
                </div>
              </div>
              <div className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    const value = e.target.value;
                    setSearchQuery(value);
                    
                    // Check if we're typing a tag
                    if (value.includes('#')) {
                      const lastHashIndex = value.lastIndexOf('#');
                      if (lastHashIndex >= 0) {
                        setIsTypingTag(true);
                        setTagInputStart(lastHashIndex);
                        setShowTagSuggestions(true);
                      }
                    } else {
                      setIsTypingTag(false);
                      setTagInputStart(-1);
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && isTypingTag && tagInputStart >= 0) {
                      e.preventDefault();
                      const tagText = searchQuery.slice(tagInputStart + 1).trim();
                      if (tagText) {
                        const matchingTag = tags.find(t => 
                          t.name.toLowerCase().startsWith(tagText.toLowerCase())
                        );
                        if (matchingTag) {
                          handleTagClick(matchingTag.name);
                          setSearchQuery('');
                          setIsTypingTag(false);
                          setTagInputStart(-1);
                          setShowTagSuggestions(false);
                        }
                      }
                    }
                  }}
                  onFocus={() => {
                    if (searchQuery.includes('#')) {
                      setShowTagSuggestions(true);
                    }
                  }}
                  onBlur={() => setTimeout(() => setShowTagSuggestions(false), 200)}
                  placeholder="Search analyses or type # to search tags..."
                  className="w-full px-4 py-2 bg-nord-6 dark:bg-nord-1 text-nord-0 dark:text-nord-6 border border-nord-4 dark:border-nord-3 rounded-lg focus:ring-2 focus:ring-nord-10 focus:border-transparent placeholder-nord-3 dark:placeholder-nord-4 transition-all"
                />
                {searchQuery && (
                  <button
                    onClick={() => {
                      setSearchQuery('');
                      setIsTypingTag(false);
                      setTagInputStart(-1);
                      setShowTagSuggestions(false);
                    }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-nord-3 dark:text-nord-4 hover:text-nord-0 dark:hover:text-nord-6 transition-colors"
                  >
                    ✕
                  </button>
                )}

                {/* Tag Suggestions Dropdown */}
                {showTagSuggestions && isTypingTag && (
                  <div className="absolute left-0 right-0 mt-1 bg-nord-6 dark:bg-nord-1 rounded-lg shadow-lg border border-nord-4/20 z-50 max-h-48 overflow-y-auto">
                    {tags
                      .filter(tag => {
                        const searchTerm = searchQuery.slice(tagInputStart + 1).toLowerCase();
                        return tag.name.toLowerCase().includes(searchTerm) &&
                          !selectedTags.includes(tag.name);
                      })
                      .map(tag => (
                        <button
                          key={tag.name}
                          onClick={() => {
                            handleTagClick(tag.name);
                            setSearchQuery('');
                            setIsTypingTag(false);
                            setTagInputStart(-1);
                            setShowTagSuggestions(false);
                          }}
                          className="w-full px-4 py-2 text-left hover:bg-nord-5 dark:hover:bg-nord-2 flex items-center space-x-2"
                        >
                          <div
                            className="w-4 h-4 rounded"
                            style={{ backgroundColor: tag.color }}
                          />
                          <span className="text-nord-0 dark:text-nord-6">{tag.name}</span>
                          <span className="text-nord-3 dark:text-nord-4 text-sm ml-auto">
                            {savedAnalyses.filter(a => a.tags.includes(tag.name)).length} analyses
                          </span>
                        </button>
                      ))}
              </div>
                )}
              </div>

              {/* Active Tag Filters */}
              {selectedTags.length > 0 && (
                <div className="flex flex-wrap items-center gap-2 pt-2">
                  <span className="text-sm text-nord-3 dark:text-nord-4">Filtered by:</span>
                  {selectedTags.map(tagName => {
                    const tag = tags.find(t => t.name === tagName);
                    return (
                      <button
                        key={tagName}
                        onClick={() => handleTagClick(tagName)}
                        style={{
                          backgroundColor: tag ? tag.color : undefined,
                          color: '#fff'
                        }}
                        className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium shadow-sm transition-colors"
                      >
                        {tagName}
                        <span className="ml-1">×</span>
                      </button>
                    );
                  })}
                  <button
                    onClick={handleClearTags}
                    className="px-2 py-1 text-sm text-nord-11 hover:text-nord-11/80 transition-colors"
                  >
                    Clear all
                  </button>
                </div>
              )}
            </div>

            {isLoadingHistory ? (
              <div className="flex justify-center py-8">
                <div className="flex space-x-2">
                  {[...Array(3)].map((_, i) => (
                    <motion.div
                      key={i}
                      className="w-2 h-2 rounded-full bg-nord-10/50"
                      animate={{
                        y: ["0%", "-50%", "0%"],
                        opacity: [1, 0.5, 1],
                      }}
                      transition={{
                        duration: 1,
                        repeat: Infinity,
                        delay: i * 0.2,
                      }}
                    />
                  ))}
                </div>
              </div>
            ) : viewMode === 'tags' ? (
              <div className="mt-4 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {tags.map((tag) => {
                    const isSystemTag = tag.name.startsWith('Level ') || tag.name === 'What ifs';
                    return (
                      <motion.div
                        key={tag.name}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="p-4 bg-nord-6 dark:bg-nord-1 rounded-lg border border-nord-4/20 hover:border-nord-4/40 hover-border shadow-sm"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            {editingTagColor === tag.name && !isSystemTag ? (
                              <input
                                type="color"
                                value={tag.color}
                                onChange={(e) => handleTagColorChange(tag.name, e.target.value)}
                                onBlur={() => setEditingTagColor(null)}
                                className="w-8 h-8 rounded cursor-pointer bg-transparent [&::-webkit-color-swatch]:rounded [&::-webkit-color-swatch-wrapper]:p-0 [&::-webkit-color-swatch]:border-none"
                              />
                            ) : (
                              <div
                                onClick={() => !isSystemTag && setEditingTagColor(tag.name)}
                                style={{ backgroundColor: tag.color }}
                                className={`w-8 h-8 rounded ${!isSystemTag ? 'cursor-pointer' : 'cursor-default'}`}
                                title={!isSystemTag ? "Click to change color" : undefined}
                              />
                            )}
                            {editingTagName === tag.name ? (
                              <form
                                onSubmit={(e) => {
                                  e.preventDefault();
                                  handleTagRename(tag.name, newTagName);
                                }}
                                className="flex items-center"
                              >
                                <input
                                  type="text"
                                  value={newTagName}
                                  onChange={(e) => setNewTagName(e.target.value)}
                                  onBlur={() => {
                                    if (newTagName !== tag.name) {
                                      handleTagRename(tag.name, newTagName);
                                    } else {
                                      setEditingTagName(null);
                                    }
                                  }}
                                  autoFocus
                                  className="px-2 py-1 rounded bg-nord-5 dark:bg-nord-2 text-nord-0 dark:text-nord-6 border border-nord-4 dark:border-nord-3 focus:ring-2 focus:ring-nord-10 focus:border-transparent font-medium"
                                />
                              </form>
                            ) : (
                              <span 
                                className={`font-medium text-nord-0 dark:text-nord-6 ${!isSystemTag ? 'cursor-pointer hover:text-nord-10 dark:hover:text-nord-8 transition-colors' : ''}`}
                                onClick={() => {
                                  if (!isSystemTag) {
                                    setEditingTagName(tag.name);
                                    setNewTagName(tag.name);
                                  }
                                }}
                                title={!isSystemTag ? "Click to rename" : undefined}
                              >
                                {tag.name}
                              </span>
                            )}
                          </div>
                          {!isSystemTag && (
                            <button
                              onClick={() => handleTagDelete(tag.name)}
                              className="text-nord-11 hover:text-nord-11/80 transition-colors"
                              title="Delete tag"
                            >
                              <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                              </svg>
                            </button>
                          )}
                        </div>
                        <div className="mt-2 text-sm text-nord-3 dark:text-nord-4">
                          Used in {savedAnalyses.filter(a => a.tags.includes(tag.name)).length} analyses
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
                
                <div className="mt-6">
                  <h3 className="text-lg font-medium text-nord-0 dark:text-nord-6 mb-2">Add New Tag</h3>
                  <div className="flex items-center space-x-3">
                    <input
                      type="color"
                      value={newTagColor}
                      onChange={(e) => setNewTagColor(e.target.value)}
                      className="w-10 h-10 rounded cursor-pointer bg-transparent [&::-webkit-color-swatch]:rounded [&::-webkit-color-swatch-wrapper]:p-0 [&::-webkit-color-swatch]:border-none"
                    />
                    <input
                      type="text"
                      value={newTag}
                      onChange={(e) => setNewTag(e.target.value)}
                      placeholder="Enter tag name..."
                      className="flex-1 px-4 py-2 bg-nord-6 dark:bg-nord-1 text-nord-0 dark:text-nord-6 border border-nord-4 dark:border-nord-3 rounded-lg focus:ring-2 focus:ring-nord-10 focus:border-transparent"
                    />
                    <button
                      onClick={() => {
                        if (newTag.trim()) {
                          handleAddTag(null, newTag);
                        }
                      }}
                      disabled={!newTag.trim()}
                      className="px-4 py-2 rounded-lg bg-nord-10 text-nord-6 hover:bg-nord-9 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Add Tag
                    </button>
                  </div>
                </div>
              </div>
            ) : filteredAnalyses.length > 0 ? (
              <div className="space-y-4">
                {filteredAnalyses.map((analysis) => (
                  <motion.div
                    key={analysis.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="p-6 bg-nord-6 dark:bg-nord-1 rounded-lg border border-nord-4/20 hover:border-nord-4/40 hover-border shadow-sm"
                  >
                    <div className="space-y-4">
                      {/* Header Section */}
                      <div className="flex items-start justify-between">
                      <div className="flex items-center space-x-3">
                        <motion.button
                          onClick={() => handleToggleFavorite(analysis.id)}
                          className={`text-lg ${
                            analysis.favorite ? 'text-nord-13' : 'text-nord-3 dark:text-nord-4'
                          } hover:scale-110 transition-transform`}
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.95 }}
                        >
                          {analysis.favorite ? '★' : '☆'}
                        </motion.button>
                          <div className="flex flex-col">
                            {editingTitleId === analysis.id ? (
                              <form
                                onSubmit={(e) => {
                                  e.preventDefault();
                                  handleTitleEdit(analysis, editingTitle);
                                }}
                                className="flex items-center"
                              >
                                <input
                                  type="text"
                                  value={editingTitle}
                                  onChange={(e) => setEditingTitle(e.target.value)}
                                  onBlur={() => {
                                    if (editingTitle !== analysis.summary) {
                                      handleTitleEdit(analysis, editingTitle);
                                    } else {
                                      setEditingTitleId(null);
                                    }
                                  }}
                                  autoFocus
                                  className="px-2 py-1 rounded bg-nord-5 dark:bg-nord-2 text-nord-0 dark:text-nord-6 border border-nord-4 dark:border-nord-3 focus:ring-2 focus:ring-nord-10 focus:border-transparent font-medium w-full"
                                />
                              </form>
                            ) : (
                              <div className="flex items-center space-x-2">
                                <h3
                                  className="font-medium text-nord-0 dark:text-nord-6 cursor-pointer hover:text-nord-10 dark:hover:text-nord-8 transition-colors"
                                  onClick={() => {
                                    setEditingTitleId(analysis.id);
                                    setEditingTitle(analysis.summary);
                                  }}
                                  title="Click to edit title"
                                >
                                  {analysis.summary}
                                </h3>
                          </div>
                            )}
                            <div className="flex items-center space-x-2 mt-1 text-xs text-nord-3 dark:text-nord-4">
                              <span>Created {formatDate(analysis.createdAt)}</span>
                              {analysis.updatedAt !== analysis.createdAt && (
                                <span>• Updated {formatDate(analysis.updatedAt)}</span>
                              )}
                              <span>• Viewed {formatDate(analysis.lastViewed)}</span>
                        </div>
                      </div>
                        </div>
                        <div className="flex items-center space-x-2">
                        <div className="relative inline-block export-menu-container">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setOpenExportMenu(openExportMenu === analysis.id ? null : analysis.id);
                            }}
                              className="px-4 py-1.5 rounded-md text-sm bg-nord-10/10 text-nord-10 hover:bg-nord-10/20 font-medium transition-colors flex items-center space-x-1"
                            title="Export options"
                          >
                              <span>Export</span>
                              <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                              </svg>
                          </button>
                          <AnimatePresence>
                            {openExportMenu === analysis.id && (
                              <motion.div
                                initial={{ opacity: 0, y: -5 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -5 }}
                                  className="absolute right-0 mt-1 w-36 bg-nord-6 dark:bg-nord-1 rounded-lg shadow-lg border border-nord-4/20 z-50 overflow-hidden"
                              >
                                <button
                                  onClick={() => {
                                    downloadMarkdown(analysis);
                                    setOpenExportMenu(null);
                                  }}
                                    className="w-full px-4 py-2 text-left text-sm hover:bg-nord-5 dark:hover:bg-nord-2 text-nord-0 dark:text-nord-6 flex items-center space-x-2"
                                >
                                    <span className="text-nord-10">📝</span>
                                    <span>Markdown</span>
                                </button>
                                <button
                                  onClick={() => {
                                    downloadPdf(analysis);
                                    setOpenExportMenu(null);
                                  }}
                                    className="w-full px-4 py-2 text-left text-sm hover:bg-nord-5 dark:hover:bg-nord-2 text-nord-0 dark:text-nord-6 border-t border-nord-4/20 flex items-center space-x-2"
                                >
                                    <span className="text-nord-10">📄</span>
                                    <span>PDF</span>
                                </button>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                        <button
                          onClick={() => loadAnalysis(analysis)}
                            className="px-4 py-1.5 rounded-md text-sm bg-nord-10 text-nord-6 hover:bg-nord-9 font-medium transition-colors flex items-center space-x-1"
                        >
                            <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
                            </svg>
                            <span>Load</span>
                        </button>
                        <button
                          onClick={() => setDeletingId(analysis.id)}
                            className="px-4 py-1.5 rounded-md text-sm bg-nord-11/10 text-nord-11 hover:bg-nord-11/20 font-medium transition-colors flex items-center space-x-1"
                        >
                            <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                            </svg>
                            <span>Delete</span>
                        </button>
                      </div>
                    </div>

                      {/* Tags Section */}
                      <div className="flex flex-wrap items-center gap-2">
                        {analysis.tags.map((tag) => {
                          const tagData = tags.find(t => t.name === tag);
                          const isSystemTag = tag.startsWith('Level ') || tag === 'What ifs';
                          
                          return (
                            <div
                              key={tag}
                              style={{
                                backgroundColor: tagData ? `${tagData.color}20` : undefined,
                                borderColor: tagData ? `${tagData.color}30` : undefined,
                                color: tagData ? tagData.color : undefined
                              }}
                              className="group inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium border shadow-sm hover:opacity-80 transition-opacity"
                            >
                              <span 
                                onClick={() => handleTagClick(tag)}
                                className="cursor-pointer"
                              >
                                {tag}
                              </span>
                              {!isSystemTag && (
                                <span
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleRemoveTag(analysis, tag);
                                  }}
                                  className="ml-2 hover:text-nord-11 transition-colors cursor-pointer"
                                  title="Remove tag"
                                >
                                  ×
                                </span>
                              )}
                            </div>
                          );
                        })}
                        <form
                          onSubmit={(e) => {
                            e.preventDefault();
                            if (editingAnalysisId === analysis.id) {
                              handleAddTag(analysis, editingAnalysisTag);
                              setEditingAnalysisTag('');
                              setEditingAnalysisId(null);
                            }
                          }}
                          className="inline-flex items-center"
                        >
                          <input
                            type="text"
                            value={editingAnalysisId === analysis.id ? editingAnalysisTag : ''}
                            onChange={(e) => {
                              setEditingAnalysisId(analysis.id);
                              setEditingAnalysisTag(e.target.value);
                            }}
                            onBlur={() => {
                              if (!editingAnalysisTag) {
                                setEditingAnalysisId(null);
                              }
                            }}
                            placeholder="Add tag..."
                            className="px-3 py-1.5 text-sm rounded-full bg-nord-5 dark:bg-nord-2 text-nord-0 dark:text-nord-6 border border-nord-4 dark:border-nord-3 focus:ring-2 focus:ring-nord-10 focus:border-transparent placeholder-nord-3 dark:placeholder-nord-4 w-28"
                          />
                          <div className="relative">
                            {tagSuggestions.length > 0 && editingAnalysisId === analysis.id && editingAnalysisTag && (
                              <div className="absolute left-0 mt-1 w-32 bg-nord-6 dark:bg-nord-1 rounded-lg shadow-lg border border-nord-4/20 z-50">
                                {tagSuggestions
                                  .filter(tag => 
                                    tag.toLowerCase().includes(editingAnalysisTag.toLowerCase()) &&
                                    !analysis.tags.includes(tag)
                                  )
                                  .slice(0, 5)
                                  .map(tag => (
                                    <button
                                      key={tag}
                                      onClick={() => {
                                        handleAddTag(analysis, tag);
                                        setEditingAnalysisTag('');
                                        setEditingAnalysisId(null);
                                      }}
                                      className="w-full px-2 py-1 text-left text-sm hover:bg-nord-5 dark:hover:bg-nord-2 text-nord-0 dark:text-nord-6"
                                    >
                                      {tag}
                                    </button>
                                  ))}
                              </div>
                            )}
                          </div>
                        </form>
                      </div>

                      {/* Content Preview */}
                      <div className="mt-2">
                        <p className="text-nord-3 dark:text-nord-4 text-sm line-clamp-3 relative after:absolute after:bottom-0 after:right-0 after:h-6 after:w-12 after:bg-gradient-to-l after:from-nord-6 dark:after:from-nord-1 after:to-transparent">
                        <HighlightedText 
                          text={getMatchContext(
                            searchQuery.toLowerCase().includes(analysis.summary.toLowerCase())
                              ? analysis.summary
                              : analysis.content,
                              searchQuery,
                              300
                          )}
                          searchQuery={searchQuery}
                        />
                      </p>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-nord-3 dark:text-nord-4">
                No analyses found for this view.
              </div>
            )}
          </motion.div>
        )}

        {/* Delete Confirmation Dialog */}
        <AnimatePresence>
          {deletingId && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-nord-0/50 flex items-center justify-center p-4 z-50"
              onClick={(e) => {
                if (e.target === e.currentTarget) setDeletingId(null);
              }}
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="bg-nord-6 dark:bg-nord-1 rounded-lg p-6 max-w-md w-full shadow-xl"
              >
                <h3 className="text-lg font-semibold text-nord-0 dark:text-nord-6 mb-2">
                  Delete Analysis?
                </h3>
                <p className="text-nord-3 dark:text-nord-4 mb-6">
                  Are you sure you want to delete this analysis? This action cannot be undone.
                </p>
                <div className="flex justify-end space-x-3">
                  <button
                    onClick={() => setDeletingId(null)}
                    className="px-4 py-2 rounded text-nord-0 dark:text-nord-6 hover:bg-nord-5 dark:hover:bg-nord-2 hover-bg"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      if (deletingId) {
                        deleteAnalysis(deletingId);
                        setDeletingId(null);
                      }
                    }}
                    className="px-4 py-2 rounded bg-nord-11 text-nord-6 hover:bg-nord-11/90 hover-bg"
                  >
                    Delete
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="space-y-6">
          <div className="relative">
          <TextArea
            value={content}
            onChange={setContent}
              disabled={isLoading || isRecording}
              placeholder={isRecording ? "Recording... Speak your thoughts..." : "What's on your mind? Share your thoughts and concerns..."}
              className="bg-nord-5 dark:bg-nord-1 text-nord-0 dark:text-nord-4 border border-nord-4 dark:border-nord-3 focus:ring-nord-10 placeholder-nord-3 dark:placeholder-nord-4"
            />
            <button
              onClick={isRecording ? stopRecording : startRecording}
            disabled={isLoading}
              className={`absolute right-4 bottom-4 p-2 rounded-full transition-all ${
                isRecording
                  ? 'bg-nord-11 text-nord-6 animate-pulse'
                  : 'bg-nord-10 text-nord-6 hover:bg-nord-9 hover-bg'
              } ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
              title={isRecording ? "Stop recording" : "Start voice recording"}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                {isRecording ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z M16 12H8" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                )}
              </svg>
            </button>
          </div>

          {!response && !isLoading && (
            <SimilarEntries 
              content={content} 
              analyses={savedAnalyses} 
              tags={tags}
              onLoad={async (analysis) => {
                await loadAnalysis(analysis);
              }} 
            />
          )}

          <div className="flex items-center justify-between">
            <Switch.Group>
              <div className="flex items-center">
                <Switch
                  checked={includeRebuttals}
                  onChange={(checked) => {
                    setIncludeRebuttals(checked);
                    localStorage.setItem('healja-what-if', JSON.stringify(checked));
                  }}
                  className={`${
                    includeRebuttals ? 'bg-nord-10' : 'bg-nord-4'
                  } relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-nord-9 focus:ring-offset-2`}
                >
                  <span
                    className={`${
                      includeRebuttals ? 'translate-x-6' : 'translate-x-1'
                    } inline-block h-4 w-4 transform rounded-full bg-nord-6 transition-transform`}
                  />
                </Switch>
                <Switch.Label className="ml-3 text-sm text-nord-0 dark:text-nord-6">
                  Include "What if" scenarios
                </Switch.Label>
              </div>
            </Switch.Group>

            <button
              onClick={handleSubmit}
              disabled={!content.trim() || isLoading || isRecording}
              className={`px-6 py-2 rounded-lg font-medium transition-all ${
                !content.trim() || isLoading || isRecording
                  ? 'bg-nord-3/30 dark:bg-nord-3/20 text-nord-3 dark:text-nord-4/50 cursor-not-allowed'
                  : 'bg-nord-10 text-nord-6 hover:bg-nord-9 hover-bg'
              }`}
            >
              {isLoading ? 'Analyzing...' : 'Analyze'}
            </button>
          </div>

          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-4 bg-nord-11/10 border border-nord-11/20 rounded-lg text-nord-11"
            >
              {error}
            </motion.div>
          )}

          {isLoading && <LoadingWave />}

          {(response || exportingPdf) && (
            <motion.div
              ref={analysisRef}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5 }}
              className="space-y-6 mt-8"
            >
              <Card title="Overview" delay={0.2}>
                <div className="space-y-4">
                  {response?.severity && <SeverityIndicator severity={response.severity} />}
                  <div className="p-4 bg-nord-6 dark:bg-nord-2 rounded-lg border border-nord-4 dark:border-nord-3 hover:border-nord-4/80 dark:hover:border-nord-3/80 hover-border">
                    <div className="prose dark:prose-dark max-w-none">
                      <ReactMarkdown>{response?.explanation || ''}</ReactMarkdown>
                    </div>
                  </div>
                </div>
              </Card>

              <Card title="Key Points" delay={0.3}>
                <div className="space-y-6">
                  {response?.explanations.map((explanation, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, delay: 0.3 + index * 0.1 }}
                      className="p-4 bg-nord-6 dark:bg-nord-2 rounded-lg border border-nord-4 dark:border-nord-3 hover:border-nord-4/80 dark:hover:border-nord-3/80 hover-border"
                    >
                      <div className="flex items-start space-x-4">
                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-nord-10/20 dark:bg-nord-10/30 flex items-center justify-center">
                          <span className="text-nord-10 dark:text-nord-8 font-semibold">{index + 1}</span>
                        </div>
                        <div className="space-y-2 flex-1">
                          <h4 className="text-nord-0 dark:text-nord-6 font-semibold">
                            {explanation.title}
                          </h4>
                          <div className="prose dark:prose-dark max-w-none">
                            <ReactMarkdown>{explanation.content}</ReactMarkdown>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </Card>

              <Card title="Understanding Your Thought Patterns" delay={0.6}>
                <div className="space-y-6">
                  {response?.cbtAnalysis.thoughtPatterns.map((pattern, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, delay: 0.6 + index * 0.1 }}
                      className="p-4 bg-nord-6 dark:bg-nord-2 rounded-lg border border-nord-4 dark:border-nord-3 hover:border-nord-4/80 dark:hover:border-nord-3/80 hover-border"
                    >
                      <div className="flex items-start space-x-4">
                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-nord-10/20 dark:bg-nord-10/30 flex items-center justify-center mt-0.5">
                          <span className="text-nord-10 dark:text-nord-8 font-semibold leading-none">~</span>
                        </div>
                        <div className="flex-1">
                          <h4 className="text-nord-0 dark:text-nord-6 font-semibold">
                            {pattern.pattern}
                          </h4>
                          <div className="mt-2 space-y-2">
                            <div className="prose dark:prose-dark max-w-none">
                              <ReactMarkdown>{`**Impact:** ${pattern.impact}`}</ReactMarkdown>
                              <ReactMarkdown>{`**Solution:** ${pattern.solution}`}</ReactMarkdown>
                            </div>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </Card>

              <Card title="Practical Coping Strategies" delay={0.9}>
                <div className="space-y-6">
                  {response?.cbtAnalysis.copingStrategies.map((strategy, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, delay: 0.9 + index * 0.1 }}
                      className="p-4 bg-nord-6 dark:bg-nord-2 rounded-lg border border-nord-4 dark:border-nord-3 hover:border-nord-4/80 dark:hover:border-nord-3/80 hover-border"
                    >
                      <div className="flex items-start space-x-4">
                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-nord-10/20 dark:bg-nord-10/30 flex items-center justify-center mt-0.5">
                          <span className="text-nord-10 dark:text-nord-8 font-semibold leading-none">✦</span>
                        </div>
                        <div className="flex-1">
                          <h4 className="text-nord-0 dark:text-nord-6 font-semibold">
                            {strategy.strategy}
                          </h4>
                          <div className="mt-2">
                            <div className="prose dark:prose-dark max-w-none">
                              <ReactMarkdown>{strategy.explanation}</ReactMarkdown>
                            </div>
                          </div>
                          <div className="mt-2 space-y-2">
                            <p className="text-nord-10 dark:text-nord-8 font-medium">How to:</p>
                            {strategy.howTo.split('\n').filter(step => step.trim()).map((step, stepIndex) => (
                              <div key={stepIndex} className="flex items-center space-x-3">
                                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-nord-10/20 dark:bg-nord-10/30 flex items-center justify-center">
                                  <span className="text-nord-10 dark:text-nord-8 font-medium text-sm leading-none">{stepIndex + 1}</span>
                                </div>
                                <div className="prose dark:prose-dark max-w-none flex-1">
                                  <ReactMarkdown>{step}</ReactMarkdown>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </Card>

              {response?.rebuttals && response.rebuttals.length > 0 && (
                <Card title="Addressing 'What If' Scenarios" delay={1.2}>
                  <div className="space-y-6">
                    {response.rebuttals.map((rebuttal, index) => (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3, delay: 1.2 + index * 0.1 }}
                        className="p-4 bg-nord-6 dark:bg-nord-2 rounded-lg border border-nord-4 dark:border-nord-3 hover:border-nord-4/80 dark:hover:border-nord-3/80 hover-border"
                      >
                        <div className="flex items-start space-x-4">
                          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-nord-10/20 dark:bg-nord-10/30 flex items-center justify-center mt-0.5">
                            <span className="text-nord-10 dark:text-nord-8 font-semibold leading-none">?</span>
                          </div>
                          <div className="flex-1">
                            <p className="text-nord-0 dark:text-nord-6 font-semibold">
                              {rebuttal.concern}
                            </p>
                            <div className="mt-2">
                              <div className="prose dark:prose-dark max-w-none">
                                <ReactMarkdown>{rebuttal.response}</ReactMarkdown>
                              </div>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </Card>
              )}
            </motion.div>
          )}

          {exportingPdf && (
            <div className="fixed inset-0 bg-nord-0/50 flex items-center justify-center z-50">
              <div className="bg-nord-6 dark:bg-nord-1 rounded-lg p-6 max-w-md w-full shadow-xl">
                <h3 className="text-lg font-semibold text-nord-0 dark:text-nord-6 mb-2">
                  Generating PDF...
                </h3>
                <p className="text-nord-3 dark:text-nord-4">
                  Please wait while we create your PDF document.
                </p>
              </div>
            </div>
          )}
        </div>
    </div>
    </main>
  );
}
