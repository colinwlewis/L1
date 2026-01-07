import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from './Button';
import { ImageCropper } from './ImageCropper';

interface ResultComparisonProps {
  originalImage: string;
  generatedImage: string;
  onReset: () => void;
  onRetry: () => void;
  onSave: () => void;
  onRefine: () => void;
  onCrop: (newImage: string) => void;
  isSaving?: boolean;
}

export const ResultComparison: React.FC<ResultComparisonProps> = ({ 
  originalImage, 
  generatedImage, 
  onReset,
  onRetry,
  onSave,
  onRefine,
  onCrop,
  isSaving = false
}) => {
  const [viewMode, setViewMode] = useState<'slider' | 'split' | 'toggle'>('slider');
  const [activeTab, setActiveTab] = useState<'original' | 'generated'>('generated');
  const [rotation, setRotation] = useState(0);
  const [isCropping, setIsCropping] = useState(false);
  const [sliderPosition, setSliderPosition] = useState(50);
  const sliderContainerRef = useRef<HTMLDivElement>(null);
  const isDraggingSlider = useRef(false);

  const handleRotate = () => {
    setRotation(prev => (prev + 90) % 360);
  };

  const handleCropComplete = (croppedImage: string) => {
    onCrop(croppedImage);
    setIsCropping(false);
  };

  const handleDownload = async () => {
    try {
      // If it's a remote URL, fetch it first to force browser download interaction
      if (generatedImage.startsWith('http')) {
        const response = await fetch(generatedImage);
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = "landscape-vision.png";
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        // Base64 string
        const a = document.createElement('a');
        a.href = generatedImage;
        a.download = "landscape-vision.png";
        a.click();
      }
    } catch (e) {
      console.error("Download failed", e);
      // Fallback: just open in new tab
      window.open(generatedImage, '_blank');
    }
  };

  // Slider Logic
  const handleSliderMove = useCallback((clientX: number) => {
    if (sliderContainerRef.current) {
      const rect = sliderContainerRef.current.getBoundingClientRect();
      const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
      const percentage = (x / rect.width) * 100;
      setSliderPosition(percentage);
    }
  }, []);

  const onMouseDown = (e: React.MouseEvent) => {
    isDraggingSlider.current = true;
    handleSliderMove(e.clientX);
  };

  const onTouchStart = (e: React.TouchEvent) => {
    isDraggingSlider.current = true;
    handleSliderMove(e.touches[0].clientX);
  };

  useEffect(() => {
    const handleUp = () => {
      isDraggingSlider.current = false;
    };

    const handleMove = (e: MouseEvent) => {
      if (isDraggingSlider.current) {
        handleSliderMove(e.clientX);
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (isDraggingSlider.current) {
        handleSliderMove(e.touches[0].clientX);
      }
    };

    window.addEventListener('mouseup', handleUp);
    window.addEventListener('mousemove', handleMove);
    window.addEventListener('touchend', handleUp);
    window.addEventListener('touchmove', handleTouchMove);

    return () => {
      window.removeEventListener('mouseup', handleUp);
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('touchend', handleUp);
      window.removeEventListener('touchmove', handleTouchMove);
    };
  }, [handleSliderMove]);

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6 animate-fade-in">
      {isCropping && (
        <ImageCropper 
          imageUrl={generatedImage} 
          onCrop={handleCropComplete} 
          onCancel={() => setIsCropping(false)} 
        />
      )}

      <div className="flex flex-col sm:flex-row justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-gray-100 gap-4">
        <h2 className="text-xl font-bold text-gray-800">Your Landscape Vision</h2>
        <div className="flex flex-wrap gap-2 justify-center sm:justify-end items-center">
           
           {/* View Mode Toggles */}
           <div className="flex bg-gray-100 rounded-lg p-1 mr-2">
            <button
              onClick={() => setViewMode('slider')}
              className={`p-2 rounded-md transition-all ${
                viewMode === 'slider' ? 'bg-white text-leaf-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
              title="Slider View"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21 3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
              </svg>
            </button>
            <button
              onClick={() => setViewMode('split')}
              className={`p-2 rounded-md transition-all ${
                viewMode === 'split' ? 'bg-white text-leaf-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
              title="Side-by-Side View"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 0 1 6 3.75h2.25A2.25 2.25 0 0 1 10.5 6v2.25a2.25 2.25 0 0 1-2.25 2.25H6a2.25 2.25 0 0 1-2.25-2.25V6ZM3.75 15.75A2.25 2.25 0 0 1 6 13.5h2.25a2.25 2.25 0 0 1 2.25 2.25V18a2.25 2.25 0 0 1-2.25 2.25H6A2.25 2.25 0 0 1 3.75 18v-2.25ZM13.5 6a2.25 2.25 0 0 1 2.25-2.25H18A2.25 2.25 0 0 1 20.25 6v2.25A2.25 2.25 0 0 1 18 10.5h-2.25a2.25 2.25 0 0 1-2.25-2.25V6ZM13.5 15.75a2.25 2.25 0 0 1 2.25-2.25H18a2.25 2.25 0 0 1 2.25 2.25V18A2.25 2.25 0 0 1 18 20.25h-2.25A2.25 2.25 0 0 1 13.5 18v-2.25Z" />
              </svg>
            </button>
            <button
              onClick={() => setViewMode('toggle')}
              className={`p-2 rounded-md transition-all ${
                viewMode === 'toggle' ? 'bg-white text-leaf-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
              title="Toggle View"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
              </svg>
            </button>
          </div>
          
          <button
            onClick={handleRotate}
            className="inline-flex items-center justify-center p-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none"
            title="Rotate Image"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
            </svg>
          </button>

          <Button 
             variant="outline"
             onClick={() => setIsCropping(true)}
             className="text-gray-700"
          >
             <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 mr-2">
               <path strokeLinecap="round" strokeLinejoin="round" d="M7.875 14.25l1.214 1.942a2.25 2.25 0 001.908 1.058h2.006c.776 0 1.497-.4 1.908-1.058l1.214-1.942M2.41 9h4.636a2.25 2.25 0 011.872 1.002l.164.246a2.25 2.25 0 001.872 1.002h2.092a2.25 2.25 0 001.872-1.002l.164-.246A2.25 2.25 0 0116.954 9h4.636M2.41 9a2.25 2.25 0 00-.16.832V12a2.25 2.25 0 002.25 2.25h15a2.25 2.25 0 002.25-2.25V9.832c0-.297-.058-.587-.16-.832M2.41 9a2.25 2.25 0 01.382-.632l3.285-3.832a2.25 2.25 0 011.708-.786h8.43c.657 0 1.281.287 1.709.786l3.284 3.832c.163.19.291.404.382.632M7 20.25h10" />
             </svg>
             Crop
          </Button>

          <Button 
            variant="outline" 
            onClick={onRefine}
            className="border-leaf-300 text-leaf-700 hover:bg-leaf-50"
            title="Use this result as base for more changes"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 mr-2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456ZM16.894 20.567 16.5 21.75l-.394-1.183a2.25 2.25 0 0 0-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 0 0 1.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 0 0 1.423 1.423l1.183.394-1.183.394a2.25 2.25 0 0 0-1.423 1.423Z" />
            </svg>
            Refine
          </Button>

          <Button 
             variant="outline" 
             onClick={onRetry}
             className="text-gray-700"
             title="Discard this result and try a different prompt"
          >
             <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 mr-2">
               <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
             </svg>
             Retry
          </Button>

          <Button variant="outline" onClick={onReset} title="Start over completely">
            New
          </Button>
          
          <Button variant="secondary" onClick={onSave} disabled={isSaving}>
            {isSaving ? 'Saving...' : 'Save Design'}
          </Button>
          
          <Button
            onClick={handleDownload}
            className="bg-leaf-600 hover:bg-leaf-700"
          >
             <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
            Download
          </Button>
        </div>
      </div>

      {viewMode === 'slider' && (
        <div className="relative max-w-5xl mx-auto select-none">
          <div 
            ref={sliderContainerRef}
            className="relative aspect-video w-full overflow-hidden rounded-xl shadow-xl border border-gray-200 bg-gray-100 cursor-ew-resize group"
            onMouseDown={onMouseDown}
            onTouchStart={onTouchStart}
          >
             {/* Bottom Layer: Original Image */}
             <img 
                src={originalImage} 
                alt="Original" 
                className="absolute inset-0 w-full h-full object-cover"
                style={rotation !== 0 ? { transform: `rotate(${rotation}deg)` } : undefined}
                draggable={false}
              />
              <div className="absolute top-4 left-4 bg-black/50 text-white text-xs px-2 py-1 rounded backdrop-blur-sm pointer-events-none">Before</div>
              
              {/* Top Layer: Generated Image (Clipped) */}
              <div 
                className="absolute inset-0 overflow-hidden"
                style={{ width: `${sliderPosition}%` }}
              >
                 <img 
                  src={generatedImage} 
                  alt="Generated" 
                  className="absolute inset-0 max-w-none h-full object-cover"
                  style={{ 
                    width: sliderContainerRef.current ? sliderContainerRef.current.offsetWidth : '100%',
                    transform: rotation !== 0 ? `rotate(${rotation}deg)` : undefined
                  }}
                  draggable={false}
                />
                 <div className="absolute top-4 right-4 bg-leaf-600/80 text-white text-xs px-2 py-1 rounded backdrop-blur-sm pointer-events-none" style={{ right: 'auto', left: 'calc(100vw - 4rem)' }}>After</div>
              </div>

              {/* Slider Handle */}
              <div 
                className="absolute inset-y-0 w-1 bg-white cursor-ew-resize shadow-lg flex items-center justify-center hover:bg-leaf-200 transition-colors"
                style={{ left: `${sliderPosition}%` }}
              >
                 <div className="w-8 h-8 bg-white rounded-full shadow-lg flex items-center justify-center text-leaf-600 border border-gray-200">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 15 12 18.75 15.75 15m-7.5-6L12 5.25 15.75 9" className="rotate-90 origin-center" />
                    </svg>
                 </div>
              </div>
          </div>
          <div className="text-center mt-2 text-sm text-gray-500">Drag the slider to compare before and after</div>
        </div>
      )}

      {viewMode === 'split' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-2">
            <p className="text-sm font-medium text-gray-500 uppercase tracking-wider">Original</p>
            <div className="relative aspect-video w-full overflow-hidden rounded-xl border border-gray-200 bg-gray-50 shadow-sm group">
              <img 
                src={originalImage} 
                alt="Original Property" 
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
            </div>
          </div>
          <div className="space-y-2">
            <p className="text-sm font-medium text-leaf-600 uppercase tracking-wider">Reimagined</p>
            <div className="relative aspect-video w-full overflow-hidden rounded-xl border-2 border-leaf-500 shadow-lg group">
              <img 
                src={generatedImage} 
                alt="Reimagined Landscape" 
                className={`w-full h-full object-cover transition-transform duration-500 ${rotation === 0 ? 'group-hover:scale-105' : ''}`}
                style={{ transform: rotation !== 0 ? `rotate(${rotation}deg)` : undefined }}
              />
              <div className="absolute top-3 right-3 bg-leaf-600 text-white text-xs font-bold px-2 py-1 rounded-full shadow-md z-10">
                AI Generated
              </div>
            </div>
          </div>
        </div>
      )} 
      
      {viewMode === 'toggle' && (
        <div className="relative max-w-4xl mx-auto">
          <div className="flex justify-center mb-4 space-x-4">
             <button
              onClick={() => setActiveTab('original')}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                activeTab === 'original' 
                  ? 'bg-gray-800 text-white' 
                  : 'bg-white text-gray-600 border hover:bg-gray-50'
              }`}
            >
              Original Photo
            </button>
            <button
              onClick={() => setActiveTab('generated')}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                activeTab === 'generated' 
                  ? 'bg-leaf-600 text-white' 
                  : 'bg-leaf-100 text-leaf-700 border hover:bg-leaf-200'
              }`}
            >
              Reimagined Result
            </button>
          </div>
          
          <div className="relative aspect-video w-full overflow-hidden rounded-xl shadow-xl border border-gray-200 bg-gray-100 group">
             <img 
                src={activeTab === 'original' ? originalImage : generatedImage} 
                alt="Property View" 
                className={`w-full h-full object-cover animate-fade-in transition-transform duration-500 ${activeTab === 'generated' && rotation === 0 ? 'group-hover:scale-105' : ''}`}
                style={activeTab === 'generated' && rotation !== 0 ? { transform: `rotate(${rotation}deg)` } : undefined}
              />
          </div>
        </div>
      )}
    </div>
  );
};