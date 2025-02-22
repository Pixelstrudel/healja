'use client';

import { motion } from 'framer-motion';
import { Card } from './card';

interface ListCardProps {
  title: string;
  items: string[];
  delay?: number;
}

export function ListCard({ title, items, delay = 0 }: ListCardProps) {
  return (
    <Card title={title} delay={delay}>
      <ul className="space-y-2">
        {items.map((item, index) => (
          <motion.li
            key={index}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, delay: delay + index * 0.1 }}
            className="flex items-start"
          >
            <span className="text-nord-10 mr-2">•</span>
            <span className="text-nord-0 dark:text-nord-6">{item}</span>
          </motion.li>
        ))}
      </ul>
    </Card>
  );
} 