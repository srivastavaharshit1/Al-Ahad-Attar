import React, { useState, useEffect, useRef } from 'react';
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
          alert(`File ${file.name} is not an image`);
          continue;
        }
        // Max size 5MB
        if (file.size > 5 * 1024 * 1024) {
          alert(`File ${file.name} is too large (max 5MB)`);
          continue;
        }
        
        // If it's the first image ever, make it THUMBNAIL by default, otherwise GALLERY
        const imageType = (images.length === 0 && i === 0) ? 'THUMBNAIL' : 'GALLERY';
        await imageService.uploadImage(variantId, file, imageType);
      }
      await fetchImages();
    } catch (err: any) {
      console.error('Failed to upload image', err);
      alert(err.response?.data?.message || 'Failed to upload image');
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
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-surface-container-lowest rounded-xl max-w-4xl w-full p-8 shadow-2xl relative max-h-[90vh] overflow-y-auto flex flex-col">
        <button 
          onClick={onClose}
          className="absolute top-6 right-6 text-on-surface-variant hover:text-on-surface transition-colors bg-surface-container hover:bg-surface-container-high rounded-full p-2">
          <span className="material-symbols-outlined">close</span>
        </button>
        
        <h2 className="font-headline-md mb-2">Image Manager</h2>
        <p className="text-on-surface-variant font-body-md mb-6">Managing images for variant: <strong className="text-primary">{variantName}</strong></p>
        
        {/* Drag and Drop Zone */}
        <div 
          onDragOver={e => e.preventDefault()}
          onDrop={handleFileDrop}
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-primary/50 bg-primary/5 hover:bg-primary/10 transition-colors rounded-xl p-10 flex flex-col items-center justify-center cursor-pointer mb-8 text-center"
        >
          <span className="material-symbols-outlined text-4xl text-primary mb-3">cloud_upload</span>
          <h3 className="font-headline-sm text-primary mb-1">Click to upload or drag and drop</h3>
          <p className="text-on-surface-variant font-body-sm text-sm">PNG, JPG, or WEBP up to 5MB</p>
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileInput} 
            multiple 
            accept="image/jpeg,image/png,image/webp" 
            className="hidden" 
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
              <div key={img.id} className={`group relative bg-surface-container rounded-lg overflow-hidden border-2 ${img.imageType === 'THUMBNAIL' ? 'border-primary shadow-[0_0_15px_rgba(120,86,0,0.3)]' : 'border-outline-variant'} aspect-square flex items-center justify-center`}>
                <img 
                  src={getImageUrl(`/api/images/${img.id}`)} 
                  alt={img.originalFileName} 
                  className="w-full h-full object-cover"
                  onError={(e) => { (e.target as HTMLImageElement).src = 'https://placehold.co/400x400?text=Error'; }}
                />
                
                {/* Status Badges */}
                {img.imageType === 'THUMBNAIL' && (
                  <div className="absolute top-2 left-2 bg-primary text-on-primary text-[10px] font-bold uppercase px-2 py-1 rounded shadow-sm">
                    Thumbnail
                  </div>
                )}
                
                {/* Overlay Actions */}
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-2">
                  <div className="flex justify-end">
                    <button 
                      onClick={() => handleDelete(img.id)}
                      className="bg-error text-on-error rounded-full p-1.5 hover:scale-110 transition-transform shadow-sm"
                      title="Delete Image"
                    >
                      <span className="material-symbols-outlined text-[16px]">delete</span>
                    </button>
                  </div>
                  
                  <div className="flex flex-col gap-2">
                    {img.imageType !== 'THUMBNAIL' && (
                      <button 
                        onClick={() => handleSetThumbnail(img.id)}
                        className="bg-primary text-on-primary text-xs font-semibold py-1.5 px-3 rounded text-center hover:bg-primary-container hover:text-on-primary-container transition-colors shadow-sm"
                      >
                        Set as Thumbnail
                      </button>
                    )}
                    
                    <div className="flex justify-between gap-2">
                      <button 
                        onClick={() => handleMoveLeft(idx)}
                        disabled={idx === 0}
                        className={`flex-1 bg-surface-variant text-on-surface-variant p-1 rounded flex justify-center items-center ${idx === 0 ? 'opacity-50 cursor-not-allowed' : 'hover:bg-surface hover:text-on-surface'}`}
                        title="Move Left"
                      >
                        <span className="material-symbols-outlined text-[18px]">chevron_left</span>
                      </button>
                      <button 
                        onClick={() => handleMoveRight(idx)}
                        disabled={idx === images.length - 1}
                        className={`flex-1 bg-surface-variant text-on-surface-variant p-1 rounded flex justify-center items-center ${idx === images.length - 1 ? 'opacity-50 cursor-not-allowed' : 'hover:bg-surface hover:text-on-surface'}`}
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
