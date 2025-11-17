import React from 'react';
import { Info } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface FieldTooltipProps {
  content: string;
  className?: string;
}

export const FieldTooltip: React.FC<FieldTooltipProps> = ({ content, className = "" }) => {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          aria-label="Help"
          className={`inline-flex items-center justify-center h-5 w-5 rounded-full border border-gray-300 text-gray-500 hover:bg-gray-100 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-teal-500/30 ${className}`}
        >
          <Info className="h-3.5 w-3.5" />
        </button>
      </TooltipTrigger>
      <TooltipContent side="top" align="start" className="max-w-xs text-sm leading-5">
        {content}
      </TooltipContent>
    </Tooltip>
  );
};
