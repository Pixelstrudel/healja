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
      transition={{ duration: 0.5, delay }}
      className="bg-white rounded-lg shadow-md p-6 mb-4 border border-[#a5ccdb]/20"
    >
      <h3 className="text-lg font-semibold text-[#515f66] mb-3">{title}</h3>
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

const severityColors = {
  1: 'bg-[#a5ccdb] text-[#4a8199]',
  2: 'bg-[#7694a3] text-white',
  3: 'bg-yellow-400 text-yellow-900',
  4: 'bg-orange-400 text-white',
  5: 'bg-red-400 text-white'
};

// Helper function to get interpolated color classes
function getSeverityColor(severity: number) {
  const baseLevel = Math.floor(severity);
  const nextLevel = Math.min(baseLevel + 1, 5);
  const fraction = severity - baseLevel;

  // If it's a whole number, return the exact color
  if (fraction === 0) {
    return severityColors[baseLevel as keyof typeof severityColors];
  }

  // For decimal values, choose the color closer to the actual value
  return fraction < 0.5 
    ? severityColors[baseLevel as keyof typeof severityColors]
    : severityColors[nextLevel as keyof typeof severityColors];
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
        <div className="absolute left-3 right-3 h-2 bg-gray-200 rounded-full">
          <div className="absolute left-0 top-0 h-full w-full rounded-full bg-gradient-to-r from-green-200 via-yellow-200 to-red-200" />
        </div>
        
        {/* Severity pill */}
        <motion.div
          initial={{ x: -20, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          className={`absolute h-8 px-3 rounded-full ${getSeverityColor(severity)} flex items-center shadow-md cursor-help font-medium`}
          style={{ 
            left: `calc(${positionPercentage}% + 12px)`,
            transform: 'translateX(-50%)'
          }}
        >
          <span className="text-sm font-medium whitespace-nowrap">
            Level {severity % 1 === 0 ? severity : severity.toFixed(1)}
          </span>
        </motion.div>

        {/* Tick marks */}
        <div className="absolute left-3 right-3 flex justify-between mt-6">
          {[1, 2, 3, 4, 5].map(level => (
            <div key={level} className="flex flex-col items-center">
              <div className="w-px h-2 bg-gray-300" />
              <span className="text-xs text-gray-500 mt-1">{level}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Definition tooltip */}
      {showDefinition && (
        <motion.div
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          className={`absolute z-10 bottom-full mb-2 p-3 rounded-lg shadow-lg ${getSeverityColor(severity)} bg-opacity-95 max-w-xs text-sm`}
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
            <span className="text-[#4a8199] mr-2">•</span>
            <span className="text-[#515f66]">{item}</span>
          </motion.li>
        ))}
      </ul>
    </Card>
  );
} 