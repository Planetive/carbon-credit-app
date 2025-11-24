import React, { useEffect } from 'react';
import { Globe, Database, TrendingUp, Sparkles } from 'lucide-react';

interface LoadingScreenProps {
  message?: string;
  subMessage?: string;
}

const LoadingScreen: React.FC<LoadingScreenProps> = ({ 
  message = "Loading Global Carbon Projects",
  subMessage = "Analyzing data from around the world..."
}) => {
  // Prevent body scroll when loading screen is shown
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  return (
    <div 
      className="fixed inset-0 z-[9999] flex items-center justify-center overflow-hidden" 
      style={{ 
        height: '100vh', 
        width: '100vw',
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgb(248 250 252)' // Solid background to hide footer
      }}
    >
      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-50 via-teal-50/30 to-emerald-50/20"></div>
      
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Floating Orbs */}
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-teal-300/20 rounded-full blur-3xl animate-float"></div>
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-emerald-300/20 rounded-full blur-3xl animate-float" style={{ animationDelay: '1s' }}></div>
        <div className="absolute top-1/2 left-1/2 w-72 h-72 bg-cyan-300/15 rounded-full blur-3xl animate-float" style={{ animationDelay: '2s' }}></div>
        
        {/* Grid Pattern */}
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: `
            linear-gradient(to right, rgb(20, 184, 166) 1px, transparent 1px),
            linear-gradient(to bottom, rgb(20, 184, 166) 1px, transparent 1px)
          `,
          backgroundSize: '60px 60px'
        }}></div>
      </div>

      {/* Main Loading Content */}
      <div className="relative z-10 flex flex-col items-center justify-center">
        {/* Animated Icon Container */}
        <div className="relative mb-8">
          {/* Pulsing Outer Ring */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-32 h-32 rounded-full border-4 border-teal-200/50 animate-ping"></div>
          </div>
          
          {/* Rotating Middle Ring */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-28 h-28 rounded-full border-4 border-transparent border-t-teal-400 border-r-emerald-400 animate-spin-slow"></div>
          </div>
          
          {/* Central Icon */}
          <div className="relative w-24 h-24 bg-gradient-to-br from-teal-500 to-emerald-600 rounded-full flex items-center justify-center shadow-2xl">
            <Globe className="w-12 h-12 text-white animate-pulse" />
          </div>
          
          {/* Floating Icons Around */}
          <div className="absolute -top-4 left-1/2 -translate-x-1/2">
            <div className="w-8 h-8 bg-teal-400 rounded-full flex items-center justify-center shadow-lg animate-bounce-slow">
              <Database className="w-4 h-4 text-white" />
            </div>
          </div>
          <div className="absolute -bottom-4 left-1/2 -translate-x-1/2">
            <div className="w-8 h-8 bg-emerald-400 rounded-full flex items-center justify-center shadow-lg animate-bounce-slow" style={{ animationDelay: '0.3s' }}>
              <TrendingUp className="w-4 h-4 text-white" />
            </div>
          </div>
          <div className="absolute top-1/2 -left-4 -translate-y-1/2">
            <div className="w-8 h-8 bg-cyan-400 rounded-full flex items-center justify-center shadow-lg animate-bounce-slow" style={{ animationDelay: '0.6s' }}>
              <Sparkles className="w-4 h-4 text-white" />
            </div>
          </div>
          <div className="absolute top-1/2 -right-4 -translate-y-1/2">
            <div className="w-8 h-8 bg-teal-500 rounded-full flex items-center justify-center shadow-lg animate-bounce-slow" style={{ animationDelay: '0.9s' }}>
              <Globe className="w-4 h-4 text-white" />
            </div>
          </div>
        </div>

        {/* Loading Text */}
        <div className="text-center space-y-3">
          <h3 className="text-2xl font-bold bg-gradient-to-r from-teal-600 via-emerald-600 to-teal-600 bg-clip-text text-transparent animate-gradient">
            {message}
          </h3>
          <p className="text-gray-600 text-sm max-w-md">
            {subMessage}
          </p>
        </div>

        {/* Progress Dots */}
        <div className="flex items-center space-x-2 mt-8">
          <div className="w-3 h-3 bg-teal-500 rounded-full animate-bounce"></div>
          <div className="w-3 h-3 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
          <div className="w-3 h-3 bg-cyan-500 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
        </div>

        {/* Progress Bar */}
        <div className="mt-6 w-64 h-1.5 bg-gray-200 rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-r from-teal-500 via-emerald-500 to-teal-500 rounded-full animate-progress"></div>
        </div>
      </div>
    </div>
  );
};

export default LoadingScreen;

