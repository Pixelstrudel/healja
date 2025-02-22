'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';

interface ExpandableStepProps {
  step: string;
  index: number;
}

export function ExpandableStep({ step, index }: ExpandableStepProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const parts = step.split('@@@').map(s => s.trim());
  const instruction = parts[0];
  const details = parts[1];
  const hasDetails = details && details.length > 0;

  if (!hasDetails) {
    return (
      <div className="mt-1.5 sm:mt-2 first:mt-0">
        <div className="w-full flex items-center px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg">
          <div className="flex-shrink-0 w-4 sm:w-6 flex items-center justify-center">
            <span className="text-nord-10 dark:text-nord-8 font-medium text-xs sm:text-sm leading-none">{index + 1}.</span>
          </div>
          <div className="flex-1 ml-2 sm:ml-3">
            <div className="prose prose-sm sm:prose dark:prose-dark max-w-none">
              <ReactMarkdown>{instruction}</ReactMarkdown>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-1.5 sm:mt-2 first:mt-0">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center group px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg hover:bg-nord-5/50 dark:hover:bg-nord-2/50 transition-colors duration-200"
      >
        <div className="flex-shrink-0 w-4 sm:w-6 flex items-center justify-center">
          <span className="text-nord-10 dark:text-nord-8 font-medium text-xs sm:text-sm leading-none">{index + 1}.</span>
        </div>
        <div className="flex-1 flex items-center justify-between ml-2 sm:ml-3">
          <div className="prose prose-sm sm:prose dark:prose-dark max-w-none group-hover:text-nord-10 dark:group-hover:text-nord-8 transition-colors duration-200">
            <ReactMarkdown>{instruction}</ReactMarkdown>
          </div>
          <motion.div 
            className="ml-2 sm:ml-3 flex-shrink-0 relative w-4 sm:w-5 h-4 sm:h-5"
            initial={false}
          >
            <motion.svg 
              animate={{ rotate: isExpanded ? 180 : 0 }}
              transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
              className="absolute inset-0 w-full h-full text-nord-10 dark:text-nord-8 opacity-60 group-hover:opacity-100"
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M19 9l-7 7-7-7" 
              />
            </motion.svg>
          </motion.div>
        </div>
      </button>
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="ml-6 sm:ml-9 mt-1.5 sm:mt-2 pl-2 sm:pl-4 border-l-2 border-nord-10/20 dark:border-nord-10/30">
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.2, delay: 0.1 }}
                className="prose prose-sm sm:prose dark:prose-dark max-w-none text-nord-3 dark:text-nord-4 bg-nord-6/50 dark:bg-nord-1/50 rounded-lg p-2 sm:p-4"
              >
                <ReactMarkdown>{details}</ReactMarkdown>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
} 