'use client';

import { useState, useRef } from 'react';
import { Upload, X, Image as ImageIcon, Video } from 'lucide-react';
import { PropertyMedia } from '../../types/property';

interface MediaUploaderProps {
  media: PropertyMedia[];
  onChange: (media: PropertyMedia[]) => void;
  maxImages?: number;
  allowVideo?: boolean;
}

export function MediaUploader({ media, onChange, maxImages = 10, allowVideo = true }: MediaUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  const images = media.filter(m => m.type === 'IMAGE');
  const videos = media.filter(m => m.type === 'VIDEO');

  const createObjectURL = (file: File): string => {
    return URL.createObjectURL(file);
  };

  const handleFileSelect = (files: FileList | null, type: 'IMAGE' | 'VIDEO') => {
    if (!files) return;

    const newMedia: PropertyMedia[] = [];
    Array.from(files).forEach((file, index) => {
      if (type === 'IMAGE' && images.length + newMedia.length >= maxImages) {
        return;
      }
      if (type === 'VIDEO' && videos.length > 0) {
        return; // Only one video allowed
      }

      const url = createObjectURL(file);
      newMedia.push({
        id: `media-${Date.now()}-${index}`,
        type,
        url,
        sortOrder: media.length + newMedia.length
      });
    });

    onChange([...media, ...newMedia]);
  };

  const removeMedia = (id: string) => {
    onChange(media.filter(m => m.id !== id));
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = e.dataTransfer.files;
    const imageFiles = Array.from(files).filter(file => file.type.startsWith('image/'));
    const videoFiles = Array.from(files).filter(file => file.type.startsWith('video/'));
    
    if (imageFiles.length > 0) {
      handleFileSelect(new FileList() as any, 'IMAGE');
      // Create a DataTransfer object to simulate FileList
      const dt = new DataTransfer();
      imageFiles.forEach(file => dt.items.add(file));
      handleFileSelect(dt.files, 'IMAGE');
    }
    
    if (videoFiles.length > 0 && allowVideo) {
      const dt = new DataTransfer();
      videoFiles.slice(0, 1).forEach(file => dt.items.add(file));
      handleFileSelect(dt.files, 'VIDEO');
    }
  };

  return (
    <div className="space-y-4">
      {/* Images Section */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">
          Images {images.length > 0 && `(${images.length}/${maxImages})`}
        </label>
        
        {images.length > 0 && (
          <div className="grid grid-cols-3 gap-4 mb-4">
            {images.map((item) => (
              <div key={item.id} className="relative group">
                <img
                  src={item.url}
                  alt="Property"
                  className="w-full h-32 object-cover rounded-lg border border-gray-200"
                />
                <button
                  onClick={() => removeMedia(item.id)}
                  className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X size={16} />
                </button>
              </div>
            ))}
          </div>
        )}

        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`
            border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors
            ${isDragging ? 'border-reach-red bg-reach-red/5' : 'border-gray-300 hover:border-reach-red'}
          `}
          onClick={() => fileInputRef.current?.click()}
        >
          <Upload className="mx-auto mb-2 text-gray-400" size={32} />
          <p className="text-sm font-medium text-gray-700 mb-1">Upload property images</p>
          <p className="text-xs text-gray-500">2MB Max jpeg, png, svg</p>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => handleFileSelect(e.target.files, 'IMAGE')}
          />
        </div>
      </div>

      {/* Video Section */}
      {allowVideo && (
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Video (Optional)
          </label>
          
          {videos.length > 0 ? (
            <div className="relative group">
              <video
                src={videos[0].url}
                controls
                className="w-full h-48 object-cover rounded-lg border border-gray-200"
              />
              <button
                onClick={() => removeMedia(videos[0].id)}
                className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X size={16} />
              </button>
            </div>
          ) : (
            <div
              onClick={() => videoInputRef.current?.click()}
              className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center cursor-pointer hover:border-reach-red transition-colors"
            >
              <Video className="mx-auto mb-2 text-gray-400" size={24} />
              <p className="text-sm font-medium text-gray-700 mb-1">Upload video (optional)</p>
              <p className="text-xs text-gray-500">10MB Max mp4, mov</p>
              <input
                ref={videoInputRef}
                type="file"
                accept="video/*"
                className="hidden"
                onChange={(e) => handleFileSelect(e.target.files, 'VIDEO')}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

