import React, { useState, useRef } from 'react';
import { apiClient } from '../../api/axios';
import { Loader2, UploadCloud, Star, Trash2, GripVertical } from 'lucide-react';
import toast from 'react-hot-toast';
import { ConfirmationDialog } from '../ui/ConfirmationDialog';
import { getImageUrl } from '../../utils/getImageUrl';
import imageCompression from 'browser-image-compression';

export type ManagedImage = {
  id: string | number;
  imageUrl: string;
  isPrimary: boolean;
  altText?: string;
  file?: File; // For local unuploaded files
};

interface TypedImageManagerProps {
  /** The product ID (undefined when creating a new product). */
  productId?: number;
  /** "ATTAR" or "PERFUME" — determines which type bucket images are uploaded to. Optional for SHARED or GENERAL. */
  productType?: 'ATTAR' | 'PERFUME' | 'SHARED' | 'GENERAL' | string;
  images: ManagedImage[];
  onImagesChange: (images: ManagedImage[]) => void;
}

/**
 * A type-specific image manager that uploads images directly to the correct
 * Attar or Perfume bucket via POST /products/{id}/images?productType=ATTAR|PERFUME.
 *
 * For SHARED or GENERAL images, the productType query param is omitted.
 *
 * The type tag is implicit — the admin never needs to set it manually.
 */
export const TypedImageManager: React.FC<TypedImageManagerProps> = ({
  productId,
  productType,
  images,
  onImagesChange,
}) => {
  const [uploading, setUploading] = useState(false);
  const [draggedIdx, setDraggedIdx] = useState<number | null>(null);
  const [deleteTargetId, setDeleteTargetId] = useState<string | number | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const label = productType === 'ATTAR' ? 'Attar' : 'Perfume';

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;

    const newFiles = Array.from(e.target.files);

    if (images.length + newFiles.length > 10) {
      toast.error(`Maximum 10 ${label} images allowed`);
      return;
    }

    if (productId) {
      // Direct Upload Mode — immediately uploads to the server
      setUploading(true);
      try {
        const newUploadedImages: ManagedImage[] = [];
        
        for (const file of newFiles) {
          if (file.size > 5 * 1024 * 1024) {
            toast.error(`File ${file.name} exceeds 5MB limit.`);
            continue;
          }
          const compressedFile = await imageCompression(file, {
            maxSizeMB: 1,
            maxWidthOrHeight: 1920,
            useWebWorker: true,
          });

          if (compressedFile.size > 5 * 1024 * 1024) {
            toast.error(`Compressed file ${file.name} is still too large.`);
            continue;
          }

          let finalName = file.name;
          if (compressedFile.type === 'image/jpeg' && !finalName.toLowerCase().match(/\.jpe?g$/)) {
            finalName = finalName.replace(/\.[^/.]+$/, '') + '.jpg';
          } else if (compressedFile.type === 'image/webp' && !finalName.toLowerCase().endsWith('.webp')) {
            finalName = finalName.replace(/\.[^/.]+$/, '') + '.webp';
          }

          const formData = new FormData();
          formData.append('file', compressedFile, finalName);

          const queryParam = (productType === 'ATTAR' || productType === 'PERFUME')
             ? `?productType=${productType}`
             : '';

          try {
            const res = await apiClient.post(
              `/products/${productId}/images${queryParam}`,
              formData,
              { headers: { 'Content-Type': 'multipart/form-data' }, timeout: 60000 }
            );
            if (res && res.data && res.data.data) {
              newUploadedImages.push(res.data.data);
            }
          } catch (uploadErr: any) {
            toast.error(`Failed to upload ${file.name}: ${uploadErr.message}`);
          }
        }

        if (newUploadedImages.length > 0) {
          onImagesChange([...images, ...newUploadedImages]);
        }
      } catch (error: any) {
        toast.error('Failed to upload images: ' + error.message);
      } finally {
        setUploading(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    } else {
      // Local Mode — stage files locally for later upload during product creation
      setUploading(true);
      try {
        const processPromises = newFiles.map(async (file) => {
          if (file.size > 5 * 1024 * 1024) {
            toast.error(`File ${file.name} exceeds 5MB limit.`);
            return null;
          }
          const compressedFile = await imageCompression(file, {
            maxSizeMB: 1,
            maxWidthOrHeight: 1920,
            useWebWorker: true,
          });

          if (compressedFile.size > 5 * 1024 * 1024) {
            toast.error(`Compressed file ${file.name} is still too large.`);
            return null;
          }

          let finalName = file.name;
          if (compressedFile.type === 'image/jpeg' && !finalName.toLowerCase().match(/\.jpe?g$/)) {
            finalName = finalName.replace(/\.[^/.]+$/, '') + '.jpg';
          } else if (compressedFile.type === 'image/webp' && !finalName.toLowerCase().endsWith('.webp')) {
            finalName = finalName.replace(/\.[^/.]+$/, '') + '.webp';
          }

          const fileToUpload = new File([compressedFile], finalName, { type: compressedFile.type });

          return {
            id: `temp-${productType}-${Date.now()}-${finalName}`,
            imageUrl: URL.createObjectURL(fileToUpload),
            isPrimary: false,
            altText: productType,
            file: fileToUpload,
          };
        });

        let newProcessedImages = ((await Promise.all(processPromises)).filter(
          (img) => img !== null
        ) as ManagedImage[]);

        let updatedImages = [...images, ...newProcessedImages];
        if (updatedImages.length > 0 && !updatedImages.some((img) => img.isPrimary)) {
          updatedImages[0] = { ...updatedImages[0], isPrimary: true };
        }
        onImagesChange(updatedImages);
      } catch (err: any) {
        toast.error('Failed to process images: ' + err.message);
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
        onImagesChange(images.map((img) => ({ ...img, isPrimary: img.id === imageId })));
      } catch {
        toast.error('Failed to set primary image.');
      }
    } else {
      onImagesChange(images.map((img) => ({ ...img, isPrimary: img.id === imageId })));
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
        let updatedImages = images.filter((img) => img.id !== imageId);
        if (images.find((img) => img.id === imageId)?.isPrimary && updatedImages.length > 0) {
          // Refresh to get new primary assignment
          const response = await apiClient.get(
            `/products/${productId}/images?productType=${productType}`
          );
          onImagesChange(response.data.data);
        } else {
          onImagesChange(updatedImages);
        }
        setDeleteTargetId(null);
      } catch {
        toast.error('Failed to delete image.');
      } finally {
        setIsDeleting(false);
      }
    } else {
      let updatedImages = images.filter((img) => img.id !== imageId);
      if (images.find((img) => img.id === imageId)?.isPrimary && updatedImages.length > 0) {
        updatedImages[0] = { ...updatedImages[0], isPrimary: true };
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

    if (productId && newImages.every((img) => typeof img.id === 'number')) {
      try {
        const orderedIds = newImages.map((img) => img.id as number);
        await apiClient.patch(`/products/${productId}/images/reorder`, orderedIds);
      } catch {
        toast.error('Failed to reorder images.');
      }
    }

    setDraggedIdx(null);
  };

  return (
    <div className="space-y-4">
      {/* Upload Zone */}
      <div
        className={`relative border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors focus-within:ring-2 focus-within:ring-accent/40 focus-within:border-accent ${
          uploading
            ? 'border-accent/50 bg-accent-soft/40'
            : 'border-outline-variant hover:border-accent hover:bg-surface-container'
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
          aria-label={`Upload ${label} images`}
        />
        <div className="flex flex-col items-center justify-center gap-2">
          {uploading ? (
            <>
              <Loader2 className="w-7 h-7 animate-spin text-accent" />
              <p className="text-on-surface font-medium text-sm">Uploading...</p>
            </>
          ) : (
            <>
              <UploadCloud className="w-7 h-7 text-on-surface-variant" />
              <div>
                <p className="text-on-surface font-medium text-sm">
                  Upload {label} Images
                </p>
                <p className="text-xs text-on-surface-variant mt-0.5">
                  JPEG, PNG, WEBP • Max 5MB
                </p>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Image count badge */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-on-surface-variant">
          {images.length} / 10 images • Drag to reorder
        </p>
      </div>

      {/* Image Grid */}
      {images.length > 0 && (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
          {images.map((img, idx) => (
            <div
              key={img.id}
              draggable
              onDragStart={(e) => handleDragStart(e, idx)}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, idx)}
              className="group relative aspect-square rounded-lg border border-outline-variant overflow-hidden bg-surface-container-lowest transition-all hover:shadow-md hover:border-accent/40 cursor-move"
            >
              <img
                src={getImageUrl(img.imageUrl)}
                alt={`${label} product image ${idx + 1}`}
                className="w-full h-full object-contain p-1.5"
              />

              {/* Drag handle indicator */}
              <div className="absolute top-1 left-1 opacity-0 group-hover:opacity-70 transition-opacity text-white">
                <GripVertical size={14} />
              </div>

              {/* Primary Badge */}
              {img.isPrimary && (
                <div className="badge badge-gold absolute top-1 right-1 shadow-sm text-[9px] px-1.5 py-0.5">
                  <Star className="w-2 h-2 fill-current" />
                  Primary
                </div>
              )}

              {/* Overlay Controls */}
              <div className="absolute inset-0 bg-ink/50 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity flex items-center justify-center gap-2">
                {!img.isPrimary && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSetPrimary(img.id);
                    }}
                    className="p-1.5 bg-surface-container-lowest rounded-full text-on-surface hover:text-accent transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2"
                    title="Set as Primary"
                  >
                    <Star className="w-3.5 h-3.5" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(img.id);
                  }}
                  className="p-1.5 bg-surface-container-lowest rounded-full text-error hover:bg-error/10 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-error focus-visible:outline-offset-2"
                  title="Delete Image"
                >
                  <Trash2 className="w-3.5 h-3.5" />
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
        description={`Are you sure you want to delete this ${label} image?`}
        confirmText="Delete Image"
        isLoading={isDeleting}
        actionType="DELETE"
      />
    </div>
  );
};
