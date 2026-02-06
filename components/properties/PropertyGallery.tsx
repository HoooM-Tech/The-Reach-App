'use client';

import { useState } from 'react';
import { ChevronLeft, ChevronRight, Play } from 'lucide-react';
import { PropertyMedia } from '../../types/property';

interface PropertyGalleryProps {
  media: PropertyMedia[];
}

export function PropertyGallery({ media }: PropertyGalleryProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  
  const images = media.filter(m => m.type === 'IMAGE');
  const videos = media.filter(m => m.type === 'VIDEO');
  const allMedia = [...images, ...videos].sort((a, b) => a.sortOrder - b.sortOrder);

  if (allMedia.length === 0) {
    return (
      <div className="w-full h-64 sm:h-80 lg:h-96 bg-gray-200 rounded-2xl flex items-center justify-center">
        <span className="text-gray-400">No media available</span>
      </div>
    );
  }

  const currentMedia = allMedia[currentIndex];

  const goToPrevious = () => {
    setCurrentIndex((prev) => (prev === 0 ? allMedia.length - 1 : prev - 1));
  };

  const goToNext = () => {
    setCurrentIndex((prev) => (prev === allMedia.length - 1 ? 0 : prev + 1));
  };

  return (
    <div className="relative w-full">
      <div className="relative w-full h-64 sm:h-80 lg:h-96 rounded-2xl overflow-hidden bg-gray-200">
        {currentMedia.type === 'IMAGE' ? (
          <img
            src={currentMedia.url}
            alt="Property"
            className="w-full h-full object-cover"
          />
        ) : (
          <video
            src={currentMedia.url}
            controls
            className="w-full h-full object-cover"
          />
        )}
        
        {allMedia.length > 1 && (
          <>
            <button
              onClick={goToPrevious}
              className="absolute left-4 top-1/2 -translate-y-1/2 p-2 bg-black/50 text-white rounded-full hover:bg-black/70 transition-colors"
            >
              <ChevronLeft size={24} />
            </button>
            <button
              onClick={goToNext}
              className="absolute right-4 top-1/2 -translate-y-1/2 p-2 bg-black/50 text-white rounded-full hover:bg-black/70 transition-colors"
            >
              <ChevronRight size={24} />
            </button>
          </>
        )}

        {currentMedia.type === 'VIDEO' && (
          <div className="absolute top-4 right-4 px-3 py-1 bg-black/50 text-white rounded-full text-xs font-semibold flex items-center gap-1">
            <Play size={12} />
            Video
          </div>
        )}
      </div>

      {/* Thumbnails */}
      {allMedia.length > 1 && (
        <div className="flex gap-2 mt-4 overflow-x-auto pb-2">
          {allMedia.map((item, index) => (
            <button
              key={item.id}
              onClick={() => setCurrentIndex(index)}
              className={`flex-shrink-0 w-16 h-16 sm:w-20 sm:h-20 rounded-lg overflow-hidden border-2 transition-colors ${
                index === currentIndex ? 'border-reach-red' : 'border-transparent'
              }`}
            >
              {item.type === 'IMAGE' ? (
                <img
                  src={item.url}
                  alt={`Thumbnail ${index + 1}`}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gray-800 flex items-center justify-center">
                  <Play size={16} className="text-white" />
                </div>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

