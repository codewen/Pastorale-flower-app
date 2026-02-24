"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "./ui/button";
import { Camera, X, Plus } from "lucide-react";
import Image from "next/image";

interface PhotoUploadProps {
  photos?: string[]; // Existing photo URLs
  onPhotosChange: (files: File[]) => void; // New files to upload
  onExistingPhotosChange?: (urls: string[]) => void; // When editing: remaining existing URLs after remove
  label?: string;
}

export function PhotoUpload({
  photos = [],
  onPhotosChange,
  onExistingPhotosChange,
  label = "Photos",
}: PhotoUploadProps) {
  const [existingPhotos, setExistingPhotos] = useState<string[]>(photos);
  const [newFiles, setNewFiles] = useState<File[]>([]);
  const [newPreviews, setNewPreviews] = useState<string[]>([]);
  const [fullscreenImage, setFullscreenImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync existing photos when prop changes (compare by reference and length/content to avoid loop from new [] each render)
  useEffect(() => {
    setExistingPhotos((prev) => {
      if (prev === photos) return prev;
      if (prev.length !== photos.length) return photos;
      if (photos.length === 0) return prev;
      if (prev.some((url, i) => url !== photos[i])) return photos;
      return prev;
    });
  }, [photos]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      const previews: string[] = [];
      files.forEach((file) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          previews.push(reader.result as string);
          if (previews.length === files.length) {
            setNewFiles((prev) => [...prev, ...files]);
            setNewPreviews((prev) => [...prev, ...previews]);
            onPhotosChange([...newFiles, ...files]);
          }
        };
        reader.readAsDataURL(file);
      });
    }
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleRemoveExisting = (index: number) => {
    setExistingPhotos((prev) => {
      const next = prev.filter((_, i) => i !== index);
      onExistingPhotosChange?.(next);
      return next;
    });
  };

  const handleRemoveNew = (index: number) => {
    const nextFiles = newFiles.filter((_, i) => i !== index);
    const nextPreviews = newPreviews.filter((_, i) => i !== index);
    setNewFiles(nextFiles);
    setNewPreviews(nextPreviews);
    onPhotosChange(nextFiles);
  };

  const handleAddMore = () => {
    fileInputRef.current?.click();
  };

  const allPhotos = [...existingPhotos, ...newPreviews];
  const hasPhotos = allPhotos.length > 0;

  return (
    <div className="space-y-2 text-gray-900">
      <label className="text-sm font-medium">{label}</label>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={handleFileChange}
        className="hidden"
      />
      
      {hasPhotos ? (
        <div className="grid grid-cols-2 gap-4">
          {existingPhotos.map((photoUrl, index) => (
            <div key={`existing-${index}`} className="relative w-full h-72 rounded-lg overflow-hidden border border-gray-300 bg-gray-100">
              <button
                type="button"
                onClick={() => setFullscreenImage((current) => (current === photoUrl ? null : photoUrl))}
                className="absolute inset-0 w-full h-full"
              >
                <Image
                  src={photoUrl}
                  alt={`Photo ${index + 1}`}
                  fill
                  className="object-contain"
                  unoptimized
                />
              </button>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); handleRemoveExisting(index); }}
                className="absolute top-2 right-2 z-10 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}
          {newPreviews.map((preview, index) => (
            <div key={`new-${index}`} className="relative w-full h-72 rounded-lg overflow-hidden border border-gray-300 bg-gray-100">
              <button
                type="button"
                onClick={() => setFullscreenImage((current) => (current === preview ? null : preview))}
                className="absolute inset-0 w-full h-full"
              >
                <Image
                  src={preview}
                  alt={`New photo ${index + 1}`}
                  fill
                  className="object-contain"
                  unoptimized
                />
              </button>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); handleRemoveNew(index); }}
                className="absolute top-2 right-2 z-10 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}
          <div className="border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center">
            <Button
              type="button"
              variant="outline"
              onClick={handleAddMore}
              className="flex flex-col items-center gap-2 h-full w-full"
            >
              <Plus className="h-6 w-6" />
              <span>Add Photo</span>
            </Button>
          </div>
        </div>
      ) : (
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
          <Camera className="h-12 w-12 mx-auto text-gray-500 mb-4" />
          <Button
            type="button"
            variant="outline"
            onClick={handleAddMore}
          >
            <Camera className="h-4 w-4 mr-2" />
            Add Photos
          </Button>
        </div>
      )}
      {fullscreenImage && (
        <button
          type="button"
          onClick={() => setFullscreenImage(null)}
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          aria-label="Close fullscreen"
        >
          <img
            src={fullscreenImage}
            alt="Fullscreen"
            className="max-w-full max-h-full object-contain"
          />
        </button>
      )}
    </div>
  );
}
