import React, { useState, useRef } from 'react';
import type { ProductImage } from '../../types';
import { apiClient } from '../../api/axios';
import { Loader2, UploadCloud, Star, Trash2 } from 'lucide-react';

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
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    
    const newFiles = Array.from(e.target.files);
    
    if (images.length + newFiles.length > 10) {
      alert("Maximum 10 images allowed per product");
      return;
    }

    if (productId) {
      // Direct Upload Mode
      setUploading(true);
      try {
        const updatedImages = [...images];
        for (const file of newFiles) {
          if (file.size > 5 * 1024 * 1024) {
            alert(`File ${file.name} exceeds 5MB limit.`);
            continue;
          }
          const formData = new FormData();
          formData.append('file', file);
          
          const response = await apiClient.post(`/products/${productId}/images`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
          });
          updatedImages.push(response.data.data);
        }
        onImagesChange(updatedImages);
      } catch (error: any) {
        alert("Failed to upload images: " + error.message);
      } finally {
        setUploading(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    } else {
      // Local Mode
      const updatedImages = [...images];
      for (const file of newFiles) {
        if (file.size > 5 * 1024 * 1024) {
          alert(`File ${file.name} exceeds 5MB limit.`);
          continue;
        }
        updatedImages.push({
          id: `local-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          imageUrl: URL.createObjectURL(file),
          isPrimary: updatedImages.length === 0, // First image is primary
          file
        });
      }
      onImagesChange(updatedImages);
      if (fileInputRef.current) fileInputRef.current.value = '';
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
        alert("Failed to set primary image.");
      }
    } else {
      const updatedImages = images.map(img => ({
        ...img,
        isPrimary: img.id === imageId
      }));
      onImagesChange(updatedImages);
    }
  };

  const handleDelete = async (imageId: string | number) => {
    if (!window.confirm("Are you sure you want to delete this image?")) return;
    
    if (productId && typeof imageId === 'number') {
      try {
        await apiClient.delete(`/images/${imageId}`);
        let updatedImages = images.filter(img => img.id !== imageId);
        
        // If we deleted the primary, refresh to get new primary
        if (images.find(img => img.id === imageId)?.isPrimary && updatedImages.length > 0) {
          const response = await apiClient.get(`/products/${productId}/images`);
          onImagesChange(response.data.data);
        } else {
          onImagesChange(updatedImages);
        }
      } catch (error: any) {
        alert("Failed to delete image.");
      }
    } else {
      let updatedImages = images.filter(img => img.id !== imageId);
      // Auto-assign primary if needed
      if (images.find(img => img.id === imageId)?.isPrimary && updatedImages.length > 0) {
        updatedImages[0].isPrimary = true;
      }
      onImagesChange(updatedImages);
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
        alert("Failed to reorder images.");
      }
    }
    
    setDraggedIdx(null);
  };

  return (
    <div className="bg-surface-container rounded-xl border border-outline-variant p-6">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-medium text-on-surface">Product Images</h3>
        <span className="text-sm text-on-surface-variant">{images.length} / 10 limit</span>
      </div>

      {/* Upload Zone */}
      <div 
        className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
          uploading ? 'border-primary/50 bg-primary/5' : 'border-outline-variant hover:border-primary hover:bg-surface-container-highest'
        }`}
        onClick={() => !uploading && fileInputRef.current?.click()}
      >
        <input 
          type="file" 
          ref={fileInputRef}
          className="hidden" 
          multiple 
          accept="image/jpeg,image/png,image/webp"
          onChange={handleFileChange}
        />
        <div className="flex flex-col items-center justify-center gap-3">
          {uploading ? (
            <>
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <p className="text-on-surface font-medium">Uploading...</p>
            </>
          ) : (
            <>
              <UploadCloud className="w-8 h-8 text-on-surface-variant" />
              <div>
                <p className="text-on-surface font-medium">Click to upload images</p>
                <p className="text-sm text-on-surface-variant mt-1">JPEG, PNG, WEBP (Max 5MB)</p>
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
              className="relative aspect-square rounded-lg border border-outline-variant overflow-hidden group bg-surface hover:shadow-md transition-all cursor-move"
            >
              <img 
                src={img.imageUrl} 
                alt="Product" 
                className="w-full h-full object-contain p-2"
              />
              
              {/* Primary Badge */}
              {img.isPrimary && (
                <div className="absolute top-2 left-2 bg-primary text-on-primary text-[10px] uppercase font-bold px-2 py-1 rounded shadow-sm">
                  Primary
                </div>
              )}
              
              {/* Overlay Controls */}
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                {!img.isPrimary && (
                  <button 
                    type="button"
                    onClick={(e) => { e.stopPropagation(); handleSetPrimary(img.id); }}
                    className="p-2 bg-white rounded-full text-on-surface hover:text-[#D4AF37] transition-colors"
                    title="Set as Primary"
                  >
                    <Star className="w-4 h-4" />
                  </button>
                )}
                <button 
                  type="button"
                  onClick={(e) => { e.stopPropagation(); handleDelete(img.id); }}
                  className="p-2 bg-white rounded-full text-error hover:bg-error/10 transition-colors"
                  title="Delete Image"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
