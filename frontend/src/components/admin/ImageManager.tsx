import React, { useState, useRef } from 'react';
import { apiClient } from '../../api/axios';
import { Loader2, UploadCloud, Star, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { ConfirmationDialog } from '../ui/ConfirmationDialog';
import { getImageUrl } from '../../utils/getImageUrl';
import imageCompression from 'browser-image-compression';

export type ManagedImage = {
  id: string | number;
  imageUrl: string;
  isPrimary: boolean;
  file?: File; // For local unuploaded files
};

interface ImageManagerProps {
  productId?: number;
  images: ManagedImage[];
  onImagesChange: (images: ManagedImage[]) => void;
}

export const ImageManager: React.FC<ImageManagerProps> = ({ productId, images, onImagesChange }) => {
  const [uploading, setUploading] = useState(false);
  const [draggedIdx, setDraggedIdx] = useState<number | null>(null);
  const [deleteTargetId, setDeleteTargetId] = useState<string | number | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;

    const newFiles = Array.from(e.target.files);

    if (images.length + newFiles.length > 10) {
      toast.error("Maximum 10 images allowed per product");
      return;
    }

    if (productId) {
      // Direct Upload Mode
      setUploading(true);
      try {
        const uploadPromises = newFiles.map(async (file) => {
          if (file.size > 5 * 1024 * 1024) {
            toast.error(`File ${file.name} exceeds 5MB limit.`);
            return null;
          }
          const compressedFile = await imageCompression(file, {
            maxSizeMB: 1,
            maxWidthOrHeight: 1920,
            useWebWorker: true,
            fileType: file.type as any
          });
          const formData = new FormData();
          formData.append('file', compressedFile, file.name);
          return apiClient.post(`/products/${productId}/images`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
          });
        });
        
        const responses = await Promise.all(uploadPromises);
        const newUploadedImages = responses
          .filter(res => res !== null)
          .map(res => res.data.data);
          
        const updatedImages = [...images, ...newUploadedImages];
        onImagesChange(updatedImages);
      } catch (error: any) {
        toast.error("Failed to upload images: " + error.message);
      } finally {
        setUploading(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    } else {
      // Local Mode
      setUploading(true);
      try {
        const updatedImages = [...images];
        for (const file of newFiles) {
          if (file.size > 5 * 1024 * 1024) {
            toast.error(`File ${file.name} exceeds 5MB limit.`);
            continue;
          }
          const compressedFile = await imageCompression(file, {
            maxSizeMB: 1,
            maxWidthOrHeight: 1920,
            useWebWorker: true,
            fileType: file.type as any
          });
          updatedImages.push({
            id: `local-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            imageUrl: URL.createObjectURL(compressedFile),
            isPrimary: updatedImages.length === 0, // First image is primary
            file: compressedFile
          });
        }
        onImagesChange(updatedImages);
      } catch (err: any) {
        toast.error("Failed to process images: " + err.message);
      } finally {
        setUploading(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    }
  };

  const handleSetPrimary = async (imageId: string | number) => {
    if (productId && typeof imageId === 'number') {
      try {
        await apiClient.patch(`/images/${imageId}/primary`, {});
        const updatedImages = images.map(img => ({
          ...img,
          isPrimary: img.id === imageId
        }));
        onImagesChange(updatedImages);
      } catch (error: any) {
        toast.error("Failed to set primary image.");
      }
    } else {
      const updatedImages = images.map(img => ({
        ...img,
        isPrimary: img.id === imageId
      }));
      onImagesChange(updatedImages);
    }
  };

  const handleDelete = (imageId: string | number) => {
    setDeleteTargetId(imageId);
  };

  const confirmDelete = async () => {
    if (deleteTargetId === null) return;
    const imageId = deleteTargetId;

    if (productId && typeof imageId === 'number') {
      try {
        setIsDeleting(true);
        await apiClient.delete(`/images/${imageId}`);
        let updatedImages = images.filter(img => img.id !== imageId);

        // If we deleted the primary, refresh to get new primary
        if (images.find(img => img.id === imageId)?.isPrimary && updatedImages.length > 0) {
          const response = await apiClient.get(`/products/${productId}/images`);
          onImagesChange(response.data.data);
        } else {
          onImagesChange(updatedImages);
        }
        setDeleteTargetId(null);
      } catch (error: any) {
        toast.error("Failed to delete image.");
      } finally {
        setIsDeleting(false);
      }
    } else {
      let updatedImages = images.filter(img => img.id !== imageId);
      // Auto-assign primary if needed
      if (images.find(img => img.id === imageId)?.isPrimary && updatedImages.length > 0) {
        updatedImages[0].isPrimary = true;
      }
      onImagesChange(updatedImages);
      setDeleteTargetId(null);
    }
  };

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIdx(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = async (e: React.DragEvent, targetIdx: number) => {
    e.preventDefault();
    if (draggedIdx === null || draggedIdx === targetIdx) return;

    const newImages = [...images];
    const [draggedItem] = newImages.splice(draggedIdx, 1);
    newImages.splice(targetIdx, 0, draggedItem);

    onImagesChange(newImages);

    if (productId && newImages.every(img => typeof img.id === 'number')) {
      try {
        const orderedIds = newImages.map(img => img.id as number);
        await apiClient.patch(`/products/${productId}/images/reorder`, orderedIds);
      } catch (error: any) {
        toast.error("Failed to reorder images.");
      }
    }

    setDraggedIdx(null);
  };

  return (
    <div className="card p-6">
      <div className="flex justify-between items-center mb-6">
        <h3 className="font-headline-sm text-headline-sm font-semibold text-on-surface">Product Images</h3>
        <span className="badge badge-neutral">{images.length} / 10</span>
      </div>

      {/* Upload Zone */}
      <div
        className={`relative border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors focus-within:ring-2 focus-within:ring-accent/40 focus-within:border-accent ${
          uploading ? 'border-accent/50 bg-accent-soft/40' : 'border-outline-variant hover:border-accent hover:bg-surface-container'
        }`}
        onClick={() => !uploading && fileInputRef.current?.click()}
      >
        <input
          type="file"
          ref={fileInputRef}
          className="sr-only"
          multiple
          accept="image/jpeg,image/png,image/webp"
          onChange={handleFileChange}
          disabled={uploading}
          aria-label="Upload product images"
        />
        <div className="flex flex-col items-center justify-center gap-3">
          {uploading ? (
            <>
              <Loader2 className="w-8 h-8 animate-spin text-accent" />
              <p className="text-on-surface font-medium">Uploading...</p>
            </>
          ) : (
            <>
              <UploadCloud className="w-8 h-8 text-on-surface-variant" />
              <div>
                <p className="text-on-surface font-medium">Click to upload images</p>
                <p className="text-sm text-on-surface-variant mt-1">JPEG, PNG, WEBP (Max 5MB)</p>
                <p className="text-[10px] text-on-surface-variant/70 mt-1">Recommended: 1080x1080 (1:1 ratio)</p>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Image Grid */}
      {images.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4 mt-6">
          {images.map((img, idx) => (
            <div
              key={img.id}
              draggable
              onDragStart={(e) => handleDragStart(e, idx)}
              onDragOver={(e) => handleDragOver(e)}
              onDrop={(e) => handleDrop(e, idx)}
              className="group relative aspect-square rounded-lg border border-outline-variant overflow-hidden bg-surface-container-lowest transition-all hover:shadow-md hover:border-accent/40 cursor-move"
            >
              <img
                src={getImageUrl(img.imageUrl)}
                alt="Product"
                className="w-full h-full object-contain p-2"
              />

              {/* Primary Badge */}
              {img.isPrimary && (
                <div className="badge badge-gold absolute top-2 left-2 shadow-sm">
                  <Star className="w-2.5 h-2.5 fill-current" />
                  Primary
                </div>
              )}

              {/* Overlay Controls */}
              <div className="absolute inset-0 bg-ink/45 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity flex items-center justify-center gap-3">
                {!img.isPrimary && (
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); handleSetPrimary(img.id); }}
                    className="p-2 bg-surface-container-lowest rounded-full text-on-surface hover:text-accent transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2"
                    title="Set as Primary"
                  >
                    <Star className="w-4 h-4" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); handleDelete(img.id); }}
                  className="p-2 bg-surface-container-lowest rounded-full text-error hover:bg-error/10 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-error focus-visible:outline-offset-2"
                  title="Delete Image"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <ConfirmationDialog
        isOpen={deleteTargetId !== null}
        onClose={() => !isDeleting && setDeleteTargetId(null)}
        onConfirm={confirmDelete}
        title="Delete Image"
        description="Are you sure you want to delete this image?"
        confirmText="Delete Image"
        isLoading={isDeleting}
        actionType="DELETE"
      />
    </div>
  );
};
