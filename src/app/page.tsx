'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Switch } from '@headlessui/react';
import { TextArea } from '@/components/TextArea';
import { Card, ListCard, SeverityIndicator } from '@/components/Card';
import { TherapistResponse } from '@/lib/openrouter';
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
  SavedAnalysis
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
  const [viewMode, setViewMode] = useState<'all' | 'favorites' | 'recent'>('all');
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

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

  const saveAnalysis = async (content: string, response: TherapistResponse) => {
    try {
      const newAnalysis = await dbSaveAnalysis(content, response);
      setSavedAnalyses(prev => [newAnalysis, ...prev]);
    } catch (error) {
      console.error('Error saving analysis:', error);
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

  const handleSubmit = async () => {
    if (!content.trim() || isLoading) return;

    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, includeRebuttals }),
      });

      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || 'Failed to analyze');
      }
      
      setResponse(data);
      await saveAnalysis(content, data);
    } catch (error) {
      console.error('Error:', error);
      setError(error instanceof Error ? error.message : 'An unexpected error occurred');
      setResponse(null);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredAnalyses = savedAnalyses.filter(analysis => {
    const searchLower = searchQuery.toLowerCase();
    return (
      analysis.content.toLowerCase().includes(searchLower) ||
      analysis.summary.toLowerCase().includes(searchLower) ||
      analysis.tags.some(tag => tag.toLowerCase().includes(searchLower))
    );
  });

  return (
    <main className="min-h-screen bg-nord-6 dark:bg-nord-0">
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
            className="w-20 h-20"
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
                </div>
              </div>
              <div className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search analyses..."
                  className="w-full px-4 py-2 bg-nord-6 dark:bg-nord-1 text-nord-0 dark:text-nord-6 border border-nord-4 dark:border-nord-3 rounded-lg focus:ring-2 focus:ring-nord-10 focus:border-transparent placeholder-nord-3 dark:placeholder-nord-4 transition-all"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-nord-3 dark:text-nord-4 hover:text-nord-0 dark:hover:text-nord-6 transition-colors"
                  >
                    ✕
                  </button>
                )}
              </div>
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
            ) : filteredAnalyses.length > 0 ? (
              <div className="space-y-4">
                {filteredAnalyses.map((analysis) => (
                  <motion.div
                    key={analysis.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="p-4 bg-nord-6 dark:bg-nord-1 rounded-lg border border-nord-4/20 hover:border-nord-4/40 hover-border"
                  >
                    <div className="flex items-center justify-between mb-3">
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
                        <div className="flex items-center space-x-3">
                          <div className={`px-2 py-0.5 rounded-full text-xs font-medium ${getGradientColor(analysis.response.severity)}`}>
                            Level {analysis.response.severity}
                          </div>
                          <p className="font-medium text-nord-0 dark:text-nord-6">{analysis.summary}</p>
                        </div>
                      </div>
                      <div className="space-x-2">
                        <div className="relative inline-block export-menu-container">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setOpenExportMenu(openExportMenu === analysis.id ? null : analysis.id);
                            }}
                            className="px-3 py-1 rounded text-sm text-nord-10 hover:bg-nord-10/10 hover-bg"
                            title="Export options"
                          >
                            Export ▾
                          </button>
                          <AnimatePresence>
                            {openExportMenu === analysis.id && (
                              <motion.div
                                initial={{ opacity: 0, y: -5 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -5 }}
                                className="absolute right-0 mt-1 w-32 bg-nord-6 dark:bg-nord-1 rounded-lg shadow-lg border border-nord-4/20 z-50"
                              >
                                <button
                                  onClick={() => {
                                    downloadMarkdown(analysis);
                                    setOpenExportMenu(null);
                                  }}
                                  className="w-full px-4 py-2 text-left text-sm hover:bg-nord-5 dark:hover:bg-nord-2 text-nord-0 dark:text-nord-6 rounded-t-lg"
                                >
                                  Markdown
                                </button>
                                <button
                                  onClick={() => {
                                    downloadPdf(analysis);
                                    setOpenExportMenu(null);
                                  }}
                                  className="w-full px-4 py-2 text-left text-sm hover:bg-nord-5 dark:hover:bg-nord-2 text-nord-0 dark:text-nord-6 border-t border-nord-4/20 rounded-b-lg"
                                >
                                  PDF
                                </button>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                        <button
                          onClick={() => loadAnalysis(analysis)}
                          className="px-3 py-1 rounded text-sm text-nord-10 hover:bg-nord-10/10 hover-bg"
                        >
                          Load
                        </button>
                        <button
                          onClick={() => setDeletingId(analysis.id)}
                          className="px-3 py-1 rounded text-sm text-nord-11 hover:bg-nord-11/10 hover-bg"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                    <div className="flex justify-between items-baseline">
                      <p className="text-nord-3 dark:text-nord-4 text-sm flex-1 mr-4 italic">
                        <HighlightedText 
                          text={getMatchContext(
                            searchQuery.toLowerCase().includes(analysis.summary.toLowerCase())
                              ? analysis.summary
                              : analysis.content,
                            searchQuery
                          )}
                          searchQuery={searchQuery}
                        />
                      </p>
                      <span className="text-xs text-nord-3 dark:text-nord-4 whitespace-nowrap">
                        {new Date(analysis.createdAt).toLocaleString()}
                      </span>
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
          <TextArea
            value={content}
            onChange={setContent}
            disabled={isLoading}
            placeholder="What's on your mind? Share your thoughts and concerns..."
            className="bg-nord-5 dark:bg-nord-1 text-nord-0 dark:text-nord-4 border-nord-4 dark:border-nord-3 focus:ring-nord-10 placeholder-nord-3 dark:placeholder-nord-4"
          />

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
                  Include "What if" scenarios and rebuttals
                </Switch.Label>
              </div>
            </Switch.Group>

            <button
              onClick={handleSubmit}
              disabled={!content.trim() || isLoading}
              className={`px-6 py-2 rounded-lg font-medium transition-all ${
                !content.trim() || isLoading
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
