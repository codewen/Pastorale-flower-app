"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "./ui/button";
import { Camera, X, Plus } from "lucide-react";

interface PhotoUploadProps {
  photos?: string[]; // Existing photo URLs
  onPhotosChange: (files: File[]) => void; // New files to upload
  label?: string;
}

export function PhotoUpload({
  photos = [],
  onPhotosChange,
  label = "Photos",
}: PhotoUploadProps) {
  const [existingPhotos, setExistingPhotos] = useState<string[]>(photos);
  const [newFiles, setNewFiles] = useState<File[]>([]);
  const [newPreviews, setNewPreviews] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync existing photos when prop changes
  useEffect(() => {
    setExistingPhotos(photos);
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
    // Remove from display (will be kept in database until explicitly removed)
    setExistingPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  const handleRemoveNew = (index: number) => {
    setNewFiles((prev) => prev.filter((_, i) => i !== index));
    setNewPreviews((prev) => prev.filter((_, i) => i !== index));
    onPhotosChange(newFiles.filter((_, i) => i !== index));
  };

  const handleAddMore = () => {
    fileInputRef.current?.click();
  };

  const allPhotos = [...existingPhotos, ...newPreviews];
  const hasPhotos = allPhotos.length > 0;

  return (
    <div className="space-y-2">
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
            <div key={`existing-${index}`} className="relative w-full h-48 rounded-lg overflow-hidden border border-gray-300">
              <img
                src={photoUrl}
                alt={`Photo ${index + 1}`}
                className="w-full h-full object-cover"
              />
              <button
                type="button"
                onClick={() => handleRemoveExisting(index)}
                className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}
          {newPreviews.map((preview, index) => (
            <div key={`new-${index}`} className="relative w-full h-48 rounded-lg overflow-hidden border border-gray-300">
              <img
                src={preview}
                alt={`New photo ${index + 1}`}
                className="w-full h-full object-cover"
              />
              <button
                type="button"
                onClick={() => handleRemoveNew(index)}
                className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
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
          <Camera className="h-12 w-12 mx-auto text-gray-400 mb-4" />
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
    </div>
  );
}
