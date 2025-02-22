'use client';

import { useEffect } from 'react';
import { motion } from 'framer-motion';

interface WaveTransitionProps {
  isActive: boolean;
  onComplete: () => void;
}

export function WaveTransition({ isActive, onComplete }: WaveTransitionProps) {
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
} 