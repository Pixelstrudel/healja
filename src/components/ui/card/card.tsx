'use client';

import { motion } from 'framer-motion';

interface CardProps {
  title: string;
  children: React.ReactNode;
  delay?: number;
}

export function Card({ title, children, delay = 0 }: CardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay }}
      className="p-3 sm:p-4 mb-3 sm:mb-4 bg-nord-6 dark:bg-nord-1 rounded-lg border border-nord-4/20 hover:border-nord-4/40 hover-border shadow-sm"
    >
      <h2 className="text-sm sm:text-base font-semibold text-nord-0 dark:text-nord-6 mb-3 sm:mb-4">
        {title}
      </h2>
      {children}
    </motion.div>
  );
} 