'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Switch } from '@headlessui/react';
import { TextArea } from '@/components/TextArea';
import { Card, ListCard, SeverityIndicator } from '@/components/Card';
import { TherapistResponse } from '@/lib/openrouter';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

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
      className="max-w-4xl mx-auto p-8 rounded-lg bg-white shadow-md"
    >
      <div className="flex flex-col items-center space-y-6">
        <div className="flex space-x-2">
          {[...Array(4)].map((_, i) => (
            <motion.div
              key={i}
              className="w-3 h-3 rounded-full bg-[#4a8199]"
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
        <p className="text-[#7694a3] font-medium">Analyzing your concern...</p>
        
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
          <p className="text-[#515f66] italic">{calmingQuotes[quoteIndex]}</p>
        </motion.div>
      </div>
    </motion.div>
  );
}

export default function Home() {
  const [content, setContent] = useState('');
  const [includeRebuttals, setIncludeRebuttals] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [response, setResponse] = useState<TherapistResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [savedAnalyses, setSavedAnalyses] = useState<Array<{
    id: string;
    date: string;
    content: string;
    summary: string;
    response: TherapistResponse;
  }>>([]);
  const [showSavedAnalyses, setShowSavedAnalyses] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [exportingPdf, setExportingPdf] = useState<string | null>(null);
  const analysisRef = useRef<HTMLDivElement>(null);
  const [openExportMenu, setOpenExportMenu] = useState<string | null>(null);

  // Load saved analyses on mount
  useEffect(() => {
    const saved = localStorage.getItem('healja-analyses');
    if (saved) {
      setSavedAnalyses(JSON.parse(saved));
    }
  }, []);

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

  const saveAnalysis = (content: string, response: TherapistResponse) => {
    const newAnalysis = {
      id: Date.now().toString(),
      date: new Date().toLocaleString(),
      content,
      summary: response.summary,
      response
    };
    
    const updatedAnalyses = [newAnalysis, ...savedAnalyses];
    localStorage.setItem('healja-analyses', JSON.stringify(updatedAnalyses));
    setSavedAnalyses(updatedAnalyses);
  };

  const loadAnalysis = (savedAnalysis: typeof savedAnalyses[0]) => {
    setContent(savedAnalysis.content);
    setResponse(savedAnalysis.response);
    setShowSavedAnalyses(false);
  };

  const deleteAnalysis = (id: string) => {
    const updatedAnalyses = savedAnalyses.filter(analysis => analysis.id !== id);
    localStorage.setItem('healja-analyses', JSON.stringify(updatedAnalyses));
    setSavedAnalyses(updatedAnalyses);
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
      saveAnalysis(content, data);
    } catch (error) {
      console.error('Error:', error);
      setError(error instanceof Error ? error.message : 'An unexpected error occurred');
      setResponse(null);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-gray-50">
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
            <h1 className="text-4xl font-bold text-[#515f66] mb-2">Healja</h1>
            <p className="text-lg text-[#7694a3]">
              Share your concerns and receive a calming, rational perspective.
            </p>
          </div>
          <button
            onClick={() => setShowSavedAnalyses(!showSavedAnalyses)}
            className="px-4 py-2 rounded-lg text-[#4a8199] font-medium transition-all duration-200 hover:bg-[#4a8199]/10"
          >
            {showSavedAnalyses ? 'Close History' : 'View History'}
          </button>
        </motion.div>

        {showSavedAnalyses && savedAnalyses.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8 space-y-4"
          >
            <h2 className="text-xl font-semibold text-[#515f66] mb-4">Past Analyses</h2>
            <div className="space-y-4">
              {savedAnalyses.map((analysis) => (
                <motion.div
                  key={analysis.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="p-4 bg-white rounded-lg border border-[#a5ccdb]/20 hover:border-[#a5ccdb]/40 transition-colors"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-3">
                      <div className="w-2 h-2 rounded-full bg-[#4a8199]" />
                      <p className="font-medium text-[#515f66]">{analysis.summary}</p>
                    </div>
                    <div className="space-x-2">
                      <div className="relative inline-block export-menu-container">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setOpenExportMenu(openExportMenu === analysis.id ? null : analysis.id);
                          }}
                          className="px-3 py-1 rounded text-sm text-[#4a8199] hover:bg-[#4a8199]/10 transition-colors"
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
                              className="absolute right-0 mt-1 w-32 bg-white rounded-lg shadow-lg border border-gray-200 z-50"
                            >
                              <button
                                onClick={() => {
                                  downloadMarkdown(analysis);
                                  setOpenExportMenu(null);
                                }}
                                className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 text-[#515f66] rounded-t-lg"
                              >
                                Markdown
                              </button>
                              <button
                                onClick={() => {
                                  downloadPdf(analysis);
                                  setOpenExportMenu(null);
                                }}
                                className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 text-[#515f66] border-t border-gray-100 rounded-b-lg"
                              >
                                PDF
                              </button>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                      <button
                        onClick={() => loadAnalysis(analysis)}
                        className="px-3 py-1 rounded text-sm text-[#4a8199] hover:bg-[#4a8199]/10 transition-colors"
                      >
                        Load
                      </button>
                      <button
                        onClick={() => setDeletingId(analysis.id)}
                        className="px-3 py-1 rounded text-sm text-red-500 hover:bg-red-50 transition-colors"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                  <div className="flex justify-between items-baseline">
                    <p className="text-[#7694a3] text-sm line-clamp-1 italic flex-1 mr-4">
                      {analysis.content}
                    </p>
                    <span className="text-xs text-[#7694a3] whitespace-nowrap">{analysis.date}</span>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Delete Confirmation Dialog */}
        <AnimatePresence>
          {deletingId && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
              onClick={(e) => {
                if (e.target === e.currentTarget) setDeletingId(null);
              }}
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="bg-white rounded-lg p-6 max-w-md w-full shadow-xl"
              >
                <h3 className="text-lg font-semibold text-[#515f66] mb-2">
                  Delete Analysis?
                </h3>
                <p className="text-[#7694a3] mb-6">
                  Are you sure you want to delete this analysis? This action cannot be undone.
                </p>
                <div className="flex justify-end space-x-3">
                  <button
                    onClick={() => setDeletingId(null)}
                    className="px-4 py-2 rounded text-[#515f66] hover:bg-gray-100 transition-colors"
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
                    className="px-4 py-2 rounded bg-red-500 text-white hover:bg-red-600 transition-colors"
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
          />

          <div className="flex items-center justify-between">
            <Switch.Group>
              <div className="flex items-center">
                <Switch
                  checked={includeRebuttals}
                  onChange={setIncludeRebuttals}
                  className={`${
                    includeRebuttals ? 'bg-[#4a8199]' : 'bg-gray-200'
                  } relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-[#7694a3] focus:ring-offset-2`}
                >
                  <span
                    className={`${
                      includeRebuttals ? 'translate-x-6' : 'translate-x-1'
                    } inline-block h-4 w-4 transform rounded-full bg-white transition-transform`}
                  />
                </Switch>
                <Switch.Label className="ml-3 text-sm text-[#515f66]">
                  Include "What if" scenarios and rebuttals
                </Switch.Label>
              </div>
            </Switch.Group>

            <button
              onClick={handleSubmit}
              disabled={!content.trim() || isLoading}
              className={`px-6 py-2 rounded-lg text-white font-medium transition-all duration-200 ${
                !content.trim() || isLoading
                  ? 'bg-gray-300 cursor-not-allowed'
                  : 'bg-[#4a8199] hover:bg-[#7694a3]'
              }`}
            >
              {isLoading ? 'Analyzing...' : 'Analyze'}
            </button>
          </div>

          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700"
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
                  <p className="text-gray-700 mt-4">{response?.explanation}</p>
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
                      className="p-4 bg-gray-50 rounded-lg border border-[#a5ccdb]/20 hover:border-[#a5ccdb]/40 transition-colors"
                    >
                      <div className="flex items-start space-x-4">
                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[#4a8199]/10 flex items-center justify-center">
                          <span className="text-[#4a8199] font-semibold">{index + 1}</span>
                        </div>
                        <div className="space-y-2 flex-1">
                          <h4 className="text-[#515f66] font-semibold">
                            {explanation.title}
                          </h4>
                          <p className="text-[#7694a3] leading-relaxed">
                            {explanation.content}
                          </p>
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
                      className="p-4 bg-gray-50 rounded-lg border border-[#a5ccdb]/20 hover:border-[#a5ccdb]/40 transition-colors"
                    >
                      <div className="flex items-start space-x-4">
                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[#4a8199]/10 flex items-center justify-center">
                          <span className="text-[#4a8199] font-semibold">~</span>
                        </div>
                        <div className="space-y-2.5 flex-1 pt-0.5">
                          <h4 className="text-[#515f66] font-semibold">
                            {pattern.pattern}
                          </h4>
                          <div className="space-y-2">
                            <p className="text-[#7694a3] leading-relaxed">
                              <span className="text-amber-600 font-semibold">Impact: </span>
                              {pattern.impact}
                            </p>
                            <p className="text-[#7694a3] leading-relaxed">
                              <span className="text-emerald-600 font-semibold">Solution: </span>
                              {pattern.solution}
                            </p>
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
                      className="p-4 bg-gray-50 rounded-lg border border-[#a5ccdb]/20 hover:border-[#a5ccdb]/40 transition-colors"
                    >
                      <div className="flex items-start space-x-4">
                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[#4a8199]/10 flex items-center justify-center">
                          <span className="text-[#4a8199] font-semibold">✦</span>
                        </div>
                        <div className="space-y-3 flex-1">
                          <h4 className="text-[#515f66] font-semibold">
                            {strategy.strategy}
                          </h4>
                          <p className="text-[#7694a3] leading-relaxed">{strategy.explanation}</p>
                          <div className="space-y-2">
                            <p className="text-[#4a8199] font-medium">How to:</p>
                            {strategy.howTo.split('\n').filter(step => step.trim()).map((step, stepIndex) => (
                              <div key={stepIndex} className="flex items-center space-x-3">
                                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-[#a5ccdb]/20 flex items-center justify-center text-[#4a8199] font-medium text-sm">
                                  {stepIndex + 1}
                                </div>
                                <p className="text-[#7694a3] flex-1 leading-relaxed">{step}</p>
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
                        className="p-4 bg-gray-50 rounded-lg border border-[#a5ccdb]/20 hover:border-[#a5ccdb]/40 transition-colors"
                      >
                        <div className="flex items-start space-x-4">
                          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[#4a8199]/10 flex items-center justify-center">
                            <span className="text-[#4a8199] font-semibold">?</span>
                          </div>
                          <div className="space-y-3 flex-1">
                            <p className="text-[#515f66] font-semibold">
                              {rebuttal.concern}
                            </p>
                            <p className="text-[#7694a3] leading-relaxed">{rebuttal.response}</p>
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
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg p-6 max-w-md w-full shadow-xl">
                <h3 className="text-lg font-semibold text-[#515f66] mb-2">
                  Generating PDF...
                </h3>
                <p className="text-[#7694a3]">
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
