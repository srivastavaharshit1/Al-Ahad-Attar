import React, { useState, useRef } from 'react';
import { Loader2, UploadCloud, Star, Trash2, GripVertical, ArrowLeft, ArrowRight } from 'lucide-react';
import toast from 'react-hot-toast';
import { ConfirmationDialog } from '../ui/ConfirmationDialog';
import { getImageUrl } from '../../utils/getImageUrl';
import { giftSetService } from '../../services/giftSetService';
import imageCompression from 'browser-image-compression';

export type ManagedGiftSetImage = {
  id: string | number;
  imageUrl: string;
  isPrimary: boolean;
  displayOrder?: number;
  altText?: string;
  file?: File; // For locally staged files prior to gift set creation
};

interface GiftSetImageManagerProps {
  giftSetId?: number;
  images: ManagedGiftSetImage[];
  onImagesChange: (images: ManagedGiftSetImage[]) => void;
  disabled?: boolean;
}

export const GiftSetImageManager: React.FC<GiftSetImageManagerProps> = ({
  giftSetId,
  images,
  onImagesChange,
  disabled = false,
}) => {
  const [uploading, setUploading] = useState(false);
  const [draggedIdx, setDraggedIdx] = useState<number | null>(null);
  const [deleteTargetId, setDeleteTargetId] = useState<string | number | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;

    const newFiles = Array.from(e.target.files);

    if (images.length + newFiles.length > 8) {
      toast.error('Maximum 8 images allowed for a Gift Set');
      return;
    }

    if (giftSetId) {
      // Direct upload mode when gift set already exists
      setUploading(true);
      try {
        const uploadedImages: ManagedGiftSetImage[] = [...images];

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

          let finalName = file.name;
          if (compressedFile.type === 'image/jpeg' && !finalName.toLowerCase().match(/\.jpe?g$/)) {
            finalName = finalName.replace(/\.[^/.]+$/, '') + '.jpg';
          } else if (compressedFile.type === 'image/webp' && !finalName.toLowerCase().endsWith('.webp')) {
            finalName = finalName.replace(/\.[^/.]+$/, '') + '.webp';
          }

          const uploaded = await giftSetService.uploadImage(giftSetId, new File([compressedFile], finalName, { type: compressedFile.type }));
          uploadedImages.push({
            id: uploaded.id,
            imageUrl: uploaded.imageUrl,
            isPrimary: uploaded.isPrimary,
            displayOrder: uploaded.displayOrder,
            altText: uploaded.altText,
          });
        }

        // Re-fetch or sync state
        const refreshed = await giftSetService.getAdminGiftSetById(giftSetId);
        onImagesChange(
          (refreshed.images || []).map((img) => ({
            id: img.id,
            imageUrl: img.imageUrl,
            isPrimary: img.isPrimary,
            displayOrder: img.displayOrder,
            altText: img.altText,
          }))
        );
        toast.success('Images uploaded successfully');
      } catch (err: any) {
        console.error('Image upload failed', err);
        toast.error(err?.response?.data?.message || 'Failed to upload image');
      } finally {
        setUploading(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    } else {
      // Local staging mode for new gift sets
      const stagedList: ManagedGiftSetImage[] = [...images];
      for (const file of newFiles) {
        stagedList.push({
          id: `staged_${Date.now()}_${Math.random()}`,
          imageUrl: URL.createObjectURL(file),
          isPrimary: stagedList.length === 0,
          file,
        });
      }
      onImagesChange(stagedList);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSetPrimary = async (targetId: string | number) => {
    if (giftSetId && typeof targetId === 'number') {
      try {
        await giftSetService.setPrimaryImage(targetId);
        const updated = images.map((img) => ({
          ...img,
          isPrimary: img.id === targetId,
        }));
        onImagesChange(updated);
        toast.success('Primary image updated');
      } catch (err: any) {
        console.error('Failed to set primary image', err);
        toast.error(err?.response?.data?.message || 'Failed to set primary image');
      }
    } else {
      const updated = images.map((img) => ({
        ...img,
        isPrimary: img.id === targetId,
      }));
      onImagesChange(updated);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTargetId) return;

    if (giftSetId && typeof deleteTargetId === 'number') {
      setIsDeleting(true);
      try {
        await giftSetService.deleteImage(deleteTargetId);
        const updated = images.filter((img) => img.id !== deleteTargetId);
        if (images.find((img) => img.id === deleteTargetId)?.isPrimary && updated.length > 0) {
          updated[0].isPrimary = true;
        }
        onImagesChange(updated);
        toast.success('Image deleted');
        setDeleteTargetId(null);
      } catch (err: any) {
        console.error('Failed to delete image', err);
        toast.error(err?.response?.data?.message || 'Failed to delete image');
      } finally {
        setIsDeleting(false);
      }
    } else {
      const updated = images.filter((img) => img.id !== deleteTargetId);
      if (images.find((img) => img.id === deleteTargetId)?.isPrimary && updated.length > 0) {
        updated[0].isPrimary = true;
      }
      onImagesChange(updated);
      setDeleteTargetId(null);
    }
  };

  const handleMove = async (currentIndex: number, direction: 'left' | 'right') => {
    const targetIndex = direction === 'left' ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex < 0 || targetIndex >= images.length) return;

    const reordered = [...images];
    const [moved] = reordered.splice(currentIndex, 1);
    reordered.splice(targetIndex, 0, moved);

    onImagesChange(reordered);

    if (giftSetId && reordered.every((img) => typeof img.id === 'number')) {
      try {
        const ids = reordered.map((img) => img.id as number);
        await giftSetService.reorderImages(giftSetId, ids);
      } catch (err: any) {
        console.error('Failed to reorder images on server', err);
      }
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

    const reordered = [...images];
    const [draggedItem] = reordered.splice(draggedIdx, 1);
    reordered.splice(targetIdx, 0, draggedItem);

    onImagesChange(reordered);

    if (giftSetId && reordered.every((img) => typeof img.id === 'number')) {
      try {
        const ids = reordered.map((img) => img.id as number);
        await giftSetService.reorderImages(giftSetId, ids);
      } catch (err) {
        console.error('Failed to save image order', err);
      }
    }
    setDraggedIdx(null);
  };

  return (
    <div className="space-y-4">
      {/* Upload Zone */}
      <div
        className={`relative border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors focus-within:ring-2 focus-within:ring-accent/40 focus-within:border-accent ${
          uploading || disabled
            ? 'border-accent/40 bg-accent-soft/30 cursor-not-allowed opacity-80'
            : 'border-outline-variant hover:border-accent hover:bg-surface-container'
        }`}
        onClick={() => !uploading && !disabled && fileInputRef.current?.click()}
      >
        <input
          type="file"
          ref={fileInputRef}
          className="sr-only"
          multiple
          accept="image/jpeg,image/png,image/webp"
          onChange={handleFileChange}
          disabled={uploading || disabled}
          aria-label="Upload Gift Set images"
        />
        <div className="flex flex-col items-center justify-center gap-2">
          {uploading ? (
            <>
              <Loader2 className="w-8 h-8 animate-spin text-accent" />
              <p className="font-label-md text-label-md text-on-surface">Uploading images to gallery...</p>
            </>
          ) : (
            <>
              <div className="w-12 h-12 rounded-full bg-accent-soft flex items-center justify-center text-accent">
                <UploadCloud className="w-6 h-6" />
              </div>
              <div>
                <p className="font-label-lg text-label-lg text-on-surface font-medium">
                  Click or drag images to upload
                </p>
                <p className="font-body-sm text-body-sm text-on-surface-variant mt-0.5">
                  Supports JPEG, PNG, WEBP up to 5MB (auto-compressed to 1MB)
                </p>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Gallery Grid */}
      {images.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {images.map((image, index) => {
            const previewSrc = image.imageUrl.startsWith('blob:') || image.imageUrl.startsWith('http')
              ? image.imageUrl
              : getImageUrl(image.imageUrl);

            return (
              <div
                key={image.id}
                draggable={!disabled}
                onDragStart={(e) => handleDragStart(e, index)}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, index)}
                className={`group relative rounded-lg border overflow-hidden bg-surface-container-lowest transition-all shadow-sm ${
                  image.isPrimary
                    ? 'border-accent ring-2 ring-accent/30'
                    : 'border-outline-variant hover:border-accent/60'
                }`}
              >
                {/* Drag Handle & Ordering controls */}
                <div className="absolute top-2 left-2 z-10 flex items-center gap-1">
                  <div
                    className="p-1 rounded bg-ink/70 text-white cursor-grab active:cursor-grabbing hover:bg-ink transition-colors"
                    title="Drag to reorder"
                  >
                    <GripVertical className="w-3.5 h-3.5" />
                  </div>
                  {index > 0 && (
                    <button
                      type="button"
                      onClick={() => handleMove(index, 'left')}
                      className="p-1 rounded bg-ink/70 text-white hover:bg-ink transition-colors"
                      title="Move left"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                    </button>
                  )}
                  {index < images.length - 1 && (
                    <button
                      type="button"
                      onClick={() => handleMove(index, 'right')}
                      className="p-1 rounded bg-ink/70 text-white hover:bg-ink transition-colors"
                      title="Move right"
                    >
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Primary Tag or Make Primary Button */}
                <div className="absolute top-2 right-2 z-10">
                  {image.isPrimary ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-accent text-ink shadow-sm">
                      <Star className="w-3 h-3 fill-current" />
                      Primary
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleSetPrimary(image.id)}
                      disabled={disabled}
                      className="opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-ink/80 text-white hover:bg-accent hover:text-ink shadow-sm"
                      title="Set as primary thumbnail"
                    >
                      <Star className="w-3 h-3" />
                      Set Primary
                    </button>
                  )}
                </div>

                {/* Image Display */}
                <div className="aspect-square w-full overflow-hidden bg-surface-variant flex items-center justify-center">
                  <img
                    src={previewSrc}
                    alt={image.altText || `Gift set image ${index + 1}`}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                </div>

                {/* Bottom Bar: Delete Button */}
                <div className="p-2 flex items-center justify-between border-t border-outline-variant/30 bg-surface-bright">
                  <span className="text-[11px] text-on-surface-variant font-mono">
                    #{index + 1}
                  </span>
                  <button
                    type="button"
                    onClick={() => setDeleteTargetId(image.id)}
                    disabled={disabled}
                    className="p-1 rounded text-on-surface-variant hover:text-error hover:bg-error-container/30 transition-colors"
                    title="Remove image"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmationDialog
        isOpen={deleteTargetId !== null}
        onClose={() => setDeleteTargetId(null)}
        onConfirm={handleDeleteConfirm}
        title="Remove Gift Set Image"
        description="Are you sure you want to remove this image from the gift set gallery? This action cannot be undone."
        confirmText="Remove"
        dangerMode={true}
        isLoading={isDeleting}
      />
    </div>
  );
};

