import { motion } from 'framer-motion';
import { useState } from 'react';

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

const severityDefinitions = {
  1: "Mild concern with minimal impact on daily life",
  2: "Moderate concern affecting some situations",
  3: "Significant concern impacting regular activities",
  4: "Severe concern causing substantial life limitations",
  5: "Critical concern requiring immediate professional help"
};

const severityGradientColors = {
  1: 'bg-nord-14/90 text-nord-0', // Green
  2: 'bg-nord-14/90 text-nord-0', // Green to Yellow
  3: 'bg-nord-13/90 text-nord-0', // Yellow
  4: 'bg-nord-12/90 text-nord-6', // Orange
  5: 'bg-nord-11/90 text-nord-6'  // Red
};

// Helper function to get color based on position in gradient
function getGradientColor(severity: number) {
  const baseLevel = Math.floor(severity);
  const nextLevel = Math.min(baseLevel + 1, 5);
  const fraction = severity - baseLevel;

  // If it's a whole number, return the exact color
  if (fraction === 0) {
    return severityGradientColors[baseLevel as keyof typeof severityGradientColors];
  }

  // For decimal values, choose the color closer to the actual value
  return fraction < 0.5 
    ? severityGradientColors[baseLevel as keyof typeof severityGradientColors]
    : severityGradientColors[nextLevel as keyof typeof severityGradientColors];
}

interface SeverityIndicatorProps {
  severity: number;
}

export function SeverityIndicator({ severity }: SeverityIndicatorProps) {
  const [showDefinition, setShowDefinition] = useState(false);
  
  // Calculate position percentage (now accounting for the full range correctly)
  const positionPercentage = ((severity - 1) / 4) * 100;

  return (
    <div className="relative">
      <div 
        className="relative w-full h-12 flex items-center px-3"
        onMouseEnter={() => setShowDefinition(true)}
        onMouseLeave={() => setShowDefinition(false)}
      >
        {/* Background track */}
        <div className="absolute left-3 right-3 h-2 bg-nord-4 dark:bg-nord-2 rounded-full">
          <div className="absolute left-0 top-0 h-full w-full rounded-full bg-gradient-to-r from-nord-14/80 via-nord-13/80 to-nord-11/80" />
        </div>
        
        {/* Container for pill to ensure proper positioning */}
        <div className="absolute left-3 right-3 h-full">
          {/* Severity pill */}
          <motion.div
            initial={{ left: '0%' }}
            animate={{ 
              left: `${positionPercentage}%`
            }}
            transition={{ 
              type: "spring",
              stiffness: 60,
              damping: 12,
              mass: 0.5,
              duration: 1.5
            }}
            className={`absolute h-8 px-3 rounded-full ${getGradientColor(severity)} flex items-center shadow-md cursor-help font-medium z-10`}
            style={{ 
              transform: 'translate(-50%, -25%)'
            }}
          >
            <motion.span 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="text-sm font-medium whitespace-nowrap"
            >
              Level {severity % 1 === 0 ? severity : severity.toFixed(1)}
            </motion.span>
          </motion.div>
        </div>

        {/* Tick marks */}
        <div className="absolute left-3 right-3 flex justify-between mt-6">
          {[1, 2, 3, 4, 5].map(level => (
            <div key={level} className="flex flex-col items-center">
              <div className="w-px h-2 bg-nord-3 dark:bg-nord-4" />
              <span className="text-xs text-nord-3 dark:text-nord-4">{level}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Definition tooltip */}
      {showDefinition && (
        <motion.div
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          className={`absolute z-20 bottom-full mb-2 p-3 rounded-lg shadow-lg ${getGradientColor(severity)} bg-opacity-95 max-w-xs text-sm`}
          style={{ 
            left: `calc(${positionPercentage}% + 12px)`,
            transform: 'translateX(-50%)'
          }}
        >
          <div className="relative">
            {severityDefinitions[Math.round(severity) as keyof typeof severityDefinitions]}
            <div 
              className="absolute w-3 h-3 rotate-45 -bottom-1.5 left-1/2 -translate-x-1/2"
              style={{
                backgroundColor: 'inherit'
              }}
            />
          </div>
        </motion.div>
      )}
    </div>
  );
}

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