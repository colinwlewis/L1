import React, { useEffect, useState } from 'react';

interface LoadingStateProps {
  imagePreview: string | null;
}

export const LoadingState: React.FC<LoadingStateProps> = ({ imagePreview }) => {
  const [progress, setProgress] = useState(0);
  const [messageIndex, setMessageIndex] = useState(0);
  
  const messages = [
    "Analyzing terrain...",
    "Dreaming up your garden...",
    "Selecting native plants...",
    "Designing hardscape elements...",
    "Adjusting lighting...",
    "Polishing the final view..."
  ];

  useEffect(() => {
    // Progress bar simulation (approx 10-12 seconds total to reach 98%)
    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 98) return 98;
        // Slow down as we get closer to 100
        const remaining = 100 - prev;
        const increment = Math.max(0.2, remaining / 50); 
        return prev + increment;
      });
    }, 100);

    // Message rotation
    const msgTimer = setInterval(() => {
      setMessageIndex((prev) => (prev + 1) % messages.length);
    }, 2500);

    return () => {
      clearInterval(timer);
      clearInterval(msgTimer);
    };
  }, []);

  return (
    <div className="max-w-4xl mx-auto py-12 px-4 flex flex-col items-center justify-center min-h-[60vh] animate-fade-in">
       <div className="relative w-full aspect-video bg-gray-100 rounded-2xl overflow-hidden shadow-2xl border-4 border-white mb-10">
          {imagePreview && (
             <img 
               src={imagePreview} 
               alt="Processing" 
               className="w-full h-full object-cover opacity-50 blur-sm scale-105 transition-transform duration-[20s] ease-linear transform hover:scale-110" 
             />
          )}
          
          {/* Scanning Beam - using opacity gradient overlay */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
             <div className="w-full h-1/3 bg-gradient-to-b from-transparent via-leaf-400/40 to-transparent animate-scan absolute top-0 blur-md"></div>
          </div>

          <div className="absolute inset-0 flex items-center justify-center z-20">
             <div className="bg-white/95 backdrop-blur-md px-8 py-6 rounded-2xl shadow-xl border border-gray-100 flex flex-col items-center max-w-sm text-center">
                <div className="relative mb-4">
                  <div className="w-12 h-12 border-4 border-gray-200 rounded-full"></div>
                  <div className="w-12 h-12 border-4 border-leaf-500 border-t-transparent rounded-full animate-spin absolute inset-0"></div>
                </div>
                <h3 className="text-gray-900 font-bold text-xl mb-1">Generating Vision</h3>
                <p className="text-leaf-700 font-medium text-sm animate-pulse">{messages[messageIndex]}</p>
             </div>
          </div>
       </div>

       <div className="w-full max-w-lg space-y-4">
          <div className="h-4 bg-gray-200 rounded-full overflow-hidden shadow-inner p-0.5">
             <div 
               className="h-full bg-gradient-to-r from-leaf-400 to-leaf-600 rounded-full transition-all duration-200 ease-out relative"
               style={{ width: `${progress}%` }}
             >
                <div className="absolute inset-0 bg-white/30 animate-pulse"></div>
             </div>
          </div>
          <div className="flex justify-between text-xs text-gray-400 font-semibold tracking-wide uppercase px-1">
             <span>AI Architect Working</span>
             <span>{Math.round(progress)}%</span>
          </div>
       </div>
    </div>
  );
};