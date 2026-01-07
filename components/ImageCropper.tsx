import React, { useState, useRef, useEffect } from 'react';
import { Button } from './Button';

interface ImageCropperProps {
  imageUrl: string;
  onCrop: (croppedImage: string) => void;
  onCancel: () => void;
}

interface CropArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

export const ImageCropper: React.FC<ImageCropperProps> = ({ imageUrl, onCrop, onCancel }) => {
  const [crop, setCrop] = useState<CropArea | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });
  const [safeImageUrl, setSafeImageUrl] = useState<string | null>(null);
  
  const imgRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Handle loading the image safely (fetching to blob if it's a remote URL)
  // This prevents CORS "tainted canvas" issues when using drawImage
  useEffect(() => {
    let objectUrl: string | null = null;
    
    const loadSafeImage = async () => {
      // If it's a remote URL (Firebase Storage), fetch it as a blob first
      if (imageUrl.startsWith('http')) {
        try {
          const response = await fetch(imageUrl);
          const blob = await response.blob();
          objectUrl = URL.createObjectURL(blob);
          setSafeImageUrl(objectUrl);
        } catch (error) {
          console.error("Failed to load image for cropping:", error);
          // Fallback to original, might fail CORS but worth a try
          setSafeImageUrl(imageUrl);
        }
      } else {
        // It's likely a base64 string, safe to use directly
        setSafeImageUrl(imageUrl);
      }
    };

    loadSafeImage();

    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [imageUrl]);

  const getClientCoordinates = (e: React.MouseEvent | React.TouchEvent) => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
      
      return {
        x: clientX - rect.left,
        y: clientY - rect.top,
        rectWidth: rect.width,
        rectHeight: rect.height
      };
    }
    return { x: 0, y: 0, rectWidth: 0, rectHeight: 0 };
  };

  const handleMouseDown = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault(); // Prevent scrolling on touch
    const { x, y } = getClientCoordinates(e);
    setStartPos({ x, y });
    setCrop({ x, y, width: 0, height: 0 });
    setIsDragging(true);
  };

  const handleMouseMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDragging || !crop) return;
    
    const { x: currentX, y: currentY, rectWidth, rectHeight } = getClientCoordinates(e);
    
    // Constrain to container
    const clampedX = Math.max(0, Math.min(currentX, rectWidth));
    const clampedY = Math.max(0, Math.min(currentY, rectHeight));

    const newX = Math.min(startPos.x, clampedX);
    const newY = Math.min(startPos.y, clampedY);
    const newWidth = Math.abs(clampedX - startPos.x);
    const newHeight = Math.abs(clampedY - startPos.y);

    setCrop({
      x: newX,
      y: newY,
      width: newWidth,
      height: newHeight
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const executeCrop = () => {
    if (!imgRef.current || !crop || crop.width === 0 || crop.height === 0) {
      if (!crop || crop.width === 0) {
        onCancel(); 
        return;
      }
    }

    const canvas = document.createElement('canvas');
    const image = imgRef.current!;
    
    // Calculate scaling factor between displayed image and natural image size
    const scaleX = image.naturalWidth / image.width;
    const scaleY = image.naturalHeight / image.height;

    // Set canvas size to the cropped area size in natural pixels
    const pixelWidth = crop!.width * scaleX;
    const pixelHeight = crop!.height * scaleY;
    
    canvas.width = pixelWidth;
    canvas.height = pixelHeight;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(
      image,
      crop!.x * scaleX, // Source X
      crop!.y * scaleY, // Source Y
      pixelWidth,       // Source Width
      pixelHeight,      // Source Height
      0,                // Dest X
      0,                // Dest Y
      pixelWidth,       // Dest Width
      pixelHeight       // Dest Height
    );

    const base64Image = canvas.toDataURL('image/png');
    onCrop(base64Image);
  };

  useEffect(() => {
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('touchend', handleMouseUp);
    return () => {
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchend', handleMouseUp);
    };
  }, []);

  if (!safeImageUrl) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
        <div className="text-white">Loading image...</div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-white rounded-xl shadow-2xl overflow-hidden max-w-4xl w-full flex flex-col max-h-[90vh]">
        <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
          <h3 className="text-lg font-bold text-gray-800">Crop Image</h3>
          <p className="text-xs text-gray-500 hidden sm:block">Click and drag to select an area</p>
        </div>
        
        <div className="flex-grow overflow-auto p-4 bg-gray-900 flex items-center justify-center relative select-none">
          <div 
            ref={containerRef}
            className="relative cursor-crosshair inline-block shadow-2xl"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onTouchStart={handleMouseDown}
            onTouchMove={handleMouseMove}
          >
            <img 
              ref={imgRef}
              src={safeImageUrl} 
              alt="Crop source" 
              className="max-h-[60vh] object-contain pointer-events-none select-none"
              draggable={false}
              // Important: allows loading image for canvas if server supports it, 
              // but fetching to blob (above) is the primary fix.
              crossOrigin="anonymous" 
            />
            
            {/* Overlay to dim unselected areas */}
            {crop && crop.width > 0 && (
              <div 
                className="absolute border-2 border-white pointer-events-none"
                style={{
                  left: crop.x,
                  top: crop.y,
                  width: crop.width,
                  height: crop.height,
                  boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.6)' 
                }}
              >
                <div className="absolute inset-0 flex flex-col">
                  <div className="flex-1 border-b border-white/30"></div>
                  <div className="flex-1 border-b border-white/30"></div>
                  <div className="flex-1"></div>
                </div>
                <div className="absolute inset-0 flex">
                  <div className="flex-1 border-r border-white/30"></div>
                  <div className="flex-1 border-r border-white/30"></div>
                  <div className="flex-1"></div>
                </div>
              </div>
            )}
            
            {(!crop || crop.width === 0) && (
                 <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="bg-black/40 text-white px-3 py-1 rounded-full text-sm font-medium backdrop-blur-md">
                        Drag to crop
                    </div>
                 </div>
            )}
          </div>
        </div>

        <div className="p-4 border-t border-gray-100 flex justify-end space-x-3 bg-white">
          <Button variant="outline" onClick={onCancel}>Cancel</Button>
          <Button onClick={executeCrop} disabled={!crop || crop.width < 10}>Apply Crop</Button>
        </div>
      </div>
    </div>
  );
};