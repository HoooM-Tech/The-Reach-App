'use client';

import { useState, useRef } from 'react';
import { Upload, X, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { PropertyMedia } from '../../types/property';
import { developerApi, uploadApi, ApiError } from '@/lib/api/client';

interface MediaUploaderProps {
  propertyId?: string;
  media: PropertyMedia[];
  onChange: (media: PropertyMedia[]) => void;
  maxImages?: number;
  allowVideo?: boolean;
}

export function MediaUploader({
  propertyId,
  media,
  onChange,
  maxImages = 10,
  allowVideo = true,
}: MediaUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  const images = media.filter(m => m.type === 'IMAGE');
  const videos = media.filter(m => m.type === 'VIDEO');

  const createObjectURL = (file: File): string => {
    return URL.createObjectURL(file);
  };

  const addMediaToState = (items: PropertyMedia[]) => {
    if (items.length === 0) return;
    onChange([...media, ...items]);
  };

  const handleFileSelect = async (files: FileList | null, type: 'IMAGE' | 'VIDEO') => {
    if (!files) return;

    const fileList = Array.from(files);
    if (type === 'IMAGE' && images.length + fileList.length > maxImages) {
      toast.error(`Maximum ${maxImages} images allowed`);
      return;
    }
    if (type === 'VIDEO' && (videos.length > 0 || fileList.length > 1)) {
      toast.error('Only one video allowed');
      return;
    }

    if (propertyId) {
      if (type === 'VIDEO') setUploadingVideo(true);
      else setUploadingImages(true);
      try {
        for (let i = 0; i < fileList.length; i++) {
          const file = fileList[i];
          const uploadType = type === 'IMAGE' ? 'image' : 'video';
          const { file_url } = await uploadApi.uploadFile(file, uploadType, 'property-media');
          const payload =
            type === 'IMAGE'
              ? { image_urls: [file_url] }
              : { video_urls: [file_url] };
          const { media: inserted } = await developerApi.addMedia(propertyId, payload);
          const newItems: PropertyMedia[] = inserted.map((m: any) => ({
            id: m.id,
            type: type,
            url: m.url,
            sortOrder: m.order_index ?? media.length + i,
          }));
          addMediaToState(newItems);
        }
        toast.success(type === 'IMAGE' ? 'Image(s) uploaded' : 'Video uploaded');
      } catch (err) {
        const msg = err instanceof ApiError ? err.message : 'Upload failed';
        toast.error(msg);
      } finally {
        if (type === 'VIDEO') setUploadingVideo(false);
        else setUploadingImages(false);
      }
      if (fileInputRef.current) fileInputRef.current.value = '';
      if (videoInputRef.current) videoInputRef.current.value = '';
      return;
    }

    const newMedia: PropertyMedia[] = [];
    fileList.forEach((file, index) => {
      if (type === 'IMAGE' && images.length + newMedia.length >= maxImages) return;
      if (type === 'VIDEO' && videos.length > 0) return;
      const url = createObjectURL(file);
      newMedia.push({
        id: `media-${Date.now()}-${index}`,
        type,
        url,
        sortOrder: media.length + newMedia.length,
      });
    });
    onChange([...media, ...newMedia]);
  };

  const removeMedia = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
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
    const imageFiles = Array.from(files).filter((file) => file.type.startsWith('image/'));
    const videoFiles = Array.from(files).filter((file) => file.type.startsWith('video/'));
    if (imageFiles.length > 0) {
      const dt = new DataTransfer();
      imageFiles.forEach((file) => dt.items.add(file));
      handleFileSelect(dt.files, 'IMAGE');
    }
    if (videoFiles.length > 0 && allowVideo) {
      const dt = new DataTransfer();
      videoFiles.slice(0, 1).forEach((file) => dt.items.add(file));
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
                  type="button"
                  onClick={(e) => removeMedia(e, item.id)}
                  className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                  aria-label="Remove image"
                >
                  <X size={16} />
                </button>
              </div>
            ))}
          </div>
        )}

        <div
          role="button"
          tabIndex={0}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => !uploadingImages && fileInputRef.current?.click()}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              if (!uploadingImages) fileInputRef.current?.click();
            }
          }}
          className={`
            border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors
            ${isDragging ? 'border-reach-red bg-reach-red/5' : 'border-gray-300 hover:border-reach-red'}
            ${uploadingImages ? 'pointer-events-none opacity-70' : ''}
          `}
          style={uploadingImages ? { cursor: 'wait' } : undefined}
        >
          {uploadingImages ? (
            <Loader2 className="mx-auto mb-2 text-gray-400 animate-spin" size={32} />
          ) : (
            <Upload className="mx-auto mb-2 text-gray-400" size={32} />
          )}
          <p className="text-sm font-medium text-gray-700 mb-1">
            {uploadingImages ? 'Uploading…' : 'Upload property images'}
          </p>
          <p className="text-xs text-gray-500">2MB Max jpeg, png, svg</p>
          <input
            ref={fileInputRef}
            id="media-upload-images"
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            aria-label="Upload property images"
            onChange={(e) => {
              handleFileSelect(e.target.files, 'IMAGE');
              e.target.value = '';
            }}
          />
        </label>
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
                type="button"
                onClick={(e) => removeMedia(e, videos[0].id)}
                className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                aria-label="Remove video"
              >
                <X size={16} />
              </button>
            </div>
          ) : (
            <label
              htmlFor="media-upload-video"
              className={`block border-2 border-dashed border-gray-300 rounded-xl p-6 text-center cursor-pointer hover:border-reach-red transition-colors ${uploadingVideo ? 'pointer-events-none opacity-70' : ''}`}
            >
              {uploadingVideo ? (
                <Loader2 className="mx-auto mb-2 text-gray-400 animate-spin" size={24} />
              ) : (
                <Upload className="mx-auto mb-2 text-gray-400" size={24} />
              )}
              <p className="text-sm font-medium text-gray-700 mb-1">
                {uploadingVideo ? 'Uploading video…' : 'Upload video (optional)'}
              </p>
              <p className="text-xs text-gray-500">10MB Max mp4, mov</p>
              <input
                ref={videoInputRef}
                id="media-upload-video"
                type="file"
                accept="video/*"
                className="hidden"
                aria-label="Upload property video"
                onChange={(e) => {
                  handleFileSelect(e.target.files, 'VIDEO');
                  e.target.value = '';
                }}
              />
            </label>
          )}
        </div>
      )}
    </div>
  );
}

