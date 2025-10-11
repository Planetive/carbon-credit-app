import React from 'react';
import { Info } from 'lucide-react';

interface FieldTooltipProps {
  content: string;
  className?: string;
}

export const FieldTooltip: React.FC<FieldTooltipProps> = ({ content, className = "" }) => {
  return (
    <div className={`inline-flex items-center ${className}`} title={content}>
      <Info className="h-4 w-4 text-gray-400 hover:text-gray-600 cursor-help" />
    </div>
  );
};
