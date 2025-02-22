'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

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

export function LoadingWave() {
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