import React, { useState, useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import { imageService, type ProductImage } from '../../services/imageService';
import { getImageUrl } from '../../utils/getImageUrl';
import { ConfirmationDialog } from '../ui/ConfirmationDialog';


interface ImageManagerModalProps {
  variantId: number;
  variantName: string;
  onClose: () => void;
}

export const ImageManagerModal: React.FC<ImageManagerModalProps> = ({ variantId, variantName, onClose }) => {
  const [images, setImages] = useState<ProductImage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    fetchImages();
  }, [variantId]);

  const fetchImages = async () => {
    try {
      setIsLoading(true);
      const res = await imageService.getImagesByVariant(variantId);
      // Sort by display order
      const sorted = (res.data || []).sort((a: any, b: any) => a.displayOrder - b.displayOrder);
      setImages(sorted);
    } catch (err) {
      console.error('Failed to load images', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      await handleUpload(e.dataTransfer.files);
    }
  };

  const handleFileInput = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      await handleUpload(e.target.files);
    }
  };

  const handleUpload = async (files: FileList) => {
    setIsUploading(true);
    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        // Only allow images
        if (!file.type.startsWith('image/')) {
          toast.error(`File ${file.name} is not an image`);
          continue;
        }
        // Max size 5MB
        if (file.size > 5 * 1024 * 1024) {
          toast.error(`File ${file.name} is too large (max 5MB)`);
          continue;
        }

        // If it's the first image ever, make it THUMBNAIL by default, otherwise GALLERY
        const imageType = (images.length === 0 && i === 0) ? 'THUMBNAIL' : 'GALLERY';
        await imageService.uploadImage(variantId, file, imageType);
      }
      await fetchImages();
    } catch (err: any) {
      console.error('Failed to upload image', err);
      toast.error(err.response?.data?.message || 'Failed to upload image');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDelete = (id: number) => {
    setDeleteConfirmId(id);
  };

  const confirmDelete = async () => {
    if (!deleteConfirmId) return;
    try {
      setIsDeleting(true);
      await imageService.deleteImage(deleteConfirmId);
      await fetchImages();
    } catch (err) {
      console.error('Failed to delete image', err);
    } finally {
      setIsDeleting(false);
      setDeleteConfirmId(null);
    }
  };

  const handleSetThumbnail = async (id: number) => {
    try {
      await imageService.setAsThumbnail(id);
      await fetchImages();
    } catch (err) {
      console.error('Failed to set thumbnail', err);
    }
  };

  const handleMoveLeft = async (index: number) => {
    if (index === 0) return;
    try {
      const current = images[index];
      const previous = images[index - 1];

      // Swap display orders
      await imageService.updateDisplayOrder(current.id, previous.displayOrder);
      await imageService.updateDisplayOrder(previous.id, current.displayOrder);

      await fetchImages();
    } catch (err) {
      console.error('Failed to move image', err);
    }
  };

  const handleMoveRight = async (index: number) => {
    if (index === images.length - 1) return;
    try {
      const current = images[index];
      const next = images[index + 1];

      // Swap display orders
      await imageService.updateDisplayOrder(current.id, next.displayOrder);
      await imageService.updateDisplayOrder(next.id, current.displayOrder);

      await fetchImages();
    } catch (err) {
      console.error('Failed to move image', err);
    }
  };

  return (
    <div className="modal-overlay fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="modal-panel max-w-4xl w-full p-6 md:p-8 relative max-h-[90vh] overflow-y-auto flex flex-col border border-outline-variant/40">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 md:top-6 md:right-6 text-on-surface-variant hover:text-primary transition-colors bg-surface-container hover:bg-surface-container-high rounded-full p-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2">
          <span className="material-symbols-outlined">close</span>
        </button>

        <h2 className="font-headline-md text-xl text-on-surface mb-1 pr-12">Image Manager</h2>
        <p className="text-on-surface-variant font-body-md mb-6">Managing images for variant: <strong className="text-primary">{variantName}</strong></p>

        {/* Drag and Drop Zone */}
        <div
          onDragOver={e => e.preventDefault()}
          onDrop={handleFileDrop}
          onClick={() => fileInputRef.current?.click()}
          className="relative border-2 border-dashed border-primary/50 bg-primary/5 hover:bg-primary/10 focus-within:bg-primary/10 focus-within:border-primary transition-colors rounded-xl p-10 flex flex-col items-center justify-center cursor-pointer mb-8 text-center"
        >
          <span className="material-symbols-outlined text-4xl text-primary mb-3">cloud_upload</span>
          <h3 className="font-headline-sm text-primary mb-1">Click to upload or drag and drop</h3>
          <p className="text-on-surface-variant font-body-sm text-sm">PNG, JPG, or WEBP up to 5MB</p>
          <p className="text-[10px] text-on-surface-variant/70 mt-1">Recommended: 1080x1080 (1:1 ratio)</p>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileInput}
            multiple
            accept="image/jpeg,image/png,image/webp"
            className="sr-only"
            disabled={isUploading}
            aria-label="Upload variant images"
          />
        </div>

        {isUploading && (
          <div className="flex items-center justify-center gap-3 p-4 bg-primary/10 text-primary rounded-lg mb-8">
            <span className="material-symbols-outlined animate-spin">refresh</span>
            <span>Uploading images...</span>
          </div>
        )}

        {/* Gallery */}
        <h3 className="font-label-lg uppercase tracking-wider text-on-surface-variant mb-4">Gallery Images ({images.length})</h3>

        {isLoading ? (
          <div className="p-12 text-center text-on-surface-variant">Loading images...</div>
        ) : images.length === 0 ? (
          <div className="p-12 text-center text-on-surface-variant bg-surface-container-low rounded-lg border border-outline-variant border-dashed">
            No images uploaded yet. Upload an image to set the thumbnail.
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 pb-4">
            {images.map((img, idx) => (
              <div key={img.id} className={`group relative bg-surface-container rounded-lg overflow-hidden border-2 transition-colors ${img.imageType === 'THUMBNAIL' ? 'border-accent shadow-[0_0_0_3px_rgba(var(--accent-rgb),.2)]' : 'border-outline-variant'} aspect-square flex items-center justify-center`}>
                <>
                  <img
                    src={getImageUrl(`/api/images/${img.id}`)}
                    alt={img.originalFileName}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      const target = e.currentTarget as HTMLImageElement;
                      target.onerror = null;
                      target.style.display = 'none';
                      if (target.nextElementSibling) {
                        target.nextElementSibling.classList.remove('hidden');
                        target.nextElementSibling.classList.add('flex');
                      }
                    }}
                  />
                  <div className="w-full h-full hidden items-center justify-center text-on-surface-variant bg-surface-container absolute inset-0">
                    <span className="material-symbols-outlined text-4xl opacity-20">broken_image</span>
                  </div>
                </>

                {/* Status Badges */}
                {img.imageType === 'THUMBNAIL' && (
                  <div className="badge badge-gold absolute top-2 left-2 shadow-sm">
                    Thumbnail
                  </div>
                )}

                {/* Overlay Actions */}
                <div className="absolute inset-0 bg-ink/60 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity flex flex-col justify-between p-2">
                  <div className="flex justify-end">
                    <button
                      onClick={() => handleDelete(img.id)}
                      className="bg-error text-on-error rounded-full p-1.5 hover:scale-110 transition-transform shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-error"
                      title="Delete Image"
                    >
                      <span className="material-symbols-outlined text-[16px]">delete</span>
                    </button>
                  </div>

                  <div className="flex flex-col gap-2">
                    {img.imageType !== 'THUMBNAIL' && (
                      <button
                        onClick={() => handleSetThumbnail(img.id)}
                        className="bg-accent text-ink text-xs font-semibold py-1.5 px-3 rounded text-center hover:bg-accent-hover transition-colors shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                      >
                        Set as Thumbnail
                      </button>
                    )}

                    <div className="flex justify-between gap-2">
                      <button
                        onClick={() => handleMoveLeft(idx)}
                        disabled={idx === 0}
                        className={`flex-1 bg-surface-variant text-on-surface-variant p-1 rounded flex justify-center items-center focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${idx === 0 ? 'opacity-50 cursor-not-allowed' : 'hover:bg-surface-container-lowest hover:text-on-surface'}`}
                        title="Move Left"
                      >
                        <span className="material-symbols-outlined text-[18px]">chevron_left</span>
                      </button>
                      <button
                        onClick={() => handleMoveRight(idx)}
                        disabled={idx === images.length - 1}
                        className={`flex-1 bg-surface-variant text-on-surface-variant p-1 rounded flex justify-center items-center focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${idx === images.length - 1 ? 'opacity-50 cursor-not-allowed' : 'hover:bg-surface-container-lowest hover:text-on-surface'}`}
                        title="Move Right"
                      >
                        <span className="material-symbols-outlined text-[18px]">chevron_right</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <ConfirmationDialog
        isOpen={deleteConfirmId !== null}
        onClose={() => !isDeleting && setDeleteConfirmId(null)}
        onConfirm={confirmDelete}
        title="Delete Image"
        description="Are you sure you want to delete this image? This action cannot be undone."
        confirmText="Delete Image"
        isLoading={isDeleting}
        actionType="DELETE"
      />
    </div>
  );
};
