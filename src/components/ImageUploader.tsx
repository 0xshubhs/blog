"use client";

import { useCallback, useRef, useState } from "react";

interface Photo {
  data: string;
  name: string;
}

export default function ImageUploader({
  photos,
  setPhotos,
}: {
  photos: Photo[];
  setPhotos: (photos: Photo[]) => void;
}) {
  const [dragging, setDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const compressImage = useCallback(
    (file: File): Promise<string> => {
      const MAX_WIDTH = 1200;
      const QUALITY = 0.7;
      return new Promise((resolve, reject) => {
        const img = new Image();
        const objectUrl = URL.createObjectURL(file);
        img.onload = () => {
          URL.revokeObjectURL(objectUrl);
          let { width, height } = img;
          if (width > MAX_WIDTH) {
            height = Math.round((height * MAX_WIDTH) / width);
            width = MAX_WIDTH;
          }
          const canvas = document.createElement("canvas");
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          if (!ctx) { reject(new Error("No canvas context")); return; }
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL("image/webp", QUALITY));
        };
        img.onerror = () => { URL.revokeObjectURL(objectUrl); reject(new Error("Failed to load")); };
        img.src = objectUrl;
      });
    },
    []
  );

  const processFile = useCallback(
    async (file: File): Promise<Photo> => {
      if (!file.type.startsWith("image/")) {
        throw new Error("Not an image");
      }
      // Always compress — resize to 1200px max, WebP 70% quality
      const compressed = await compressImage(file);
      return {
        data: compressed,
        name: (file.name || `image-${Date.now()}`).replace(/\.[^.]+$/, "") + ".webp",
      };
    },
    [compressImage]
  );

  const addFiles = useCallback(
    async (files: FileList | File[]) => {
      const newPhotos: Photo[] = [];
      for (const file of Array.from(files)) {
        try {
          const photo = await processFile(file);
          newPhotos.push(photo);
        } catch {
          // skip non-image files
        }
      }
      if (newPhotos.length) setPhotos([...photos, ...newPhotos]);
    },
    [photos, setPhotos, processFile]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      if (e.dataTransfer.files.length) addFiles(e.dataTransfer.files);
    },
    [addFiles]
  );

  const handlePaste = useCallback(
    (e: React.ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      const files: File[] = [];
      for (const item of Array.from(items)) {
        if (item.type.startsWith("image/")) {
          const file = item.getAsFile();
          if (file) files.push(file);
        }
      }
      if (files.length) {
        e.preventDefault();
        addFiles(files);
      }
    },
    [addFiles]
  );

  const removePhoto = (index: number) => {
    setPhotos(photos.filter((_, i) => i !== index));
  };

  return (
    <div>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onPaste={handlePaste}
        onClick={() => fileInputRef.current?.click()}
        tabIndex={0}
        className={`border-2 border-dashed p-8 text-center cursor-pointer transition-colors ${
          dragging
            ? "border-black dark:border-white bg-neutral-50 dark:bg-neutral-900"
            : "border-neutral-300 dark:border-neutral-700 hover:border-neutral-400 dark:hover:border-neutral-600"
        }`}
      >
        <p className="text-sm text-neutral-500">
          drop images here, click to browse, or paste from clipboard
        </p>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => e.target.files && addFiles(e.target.files)}
        />
      </div>

      {photos.length > 0 && (
        <div className="mt-3 grid grid-cols-4 gap-2">
          {photos.map((photo, i) => (
            <div
              key={i}
              className="relative group aspect-square bg-neutral-100 dark:bg-neutral-800 overflow-hidden border border-neutral-200 dark:border-neutral-700"
            >
              <img
                src={photo.data}
                alt={photo.name}
                className="w-full h-full object-cover"
                loading="lazy"
                decoding="async"
              />
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  removePhoto(i);
                }}
                className="absolute top-1 right-1 w-5 h-5 flex items-center justify-center bg-black/70 text-white text-xs opacity-0 group-hover:opacity-100 transition-opacity"
              >
                x
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
