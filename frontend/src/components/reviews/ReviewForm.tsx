import React, { useState } from 'react';
import { X, Upload, Loader2 } from 'lucide-react';
import { StarRating } from '../common/StarRating';
import { Button } from '../ui/Button';

interface ReviewFormProps {
  productId: number;
  onSubmit: (data: { rating: number; title: string; description: string; images: File[] }) => Promise<void>;
  onCancel: () => void;
  initialData?: {
    rating: number;
    title: string;
    description: string;
    images?: string[]; // Existing image URLs
  };
  isModal?: boolean;
}

export const ReviewForm: React.FC<ReviewFormProps> = ({ productId: _productId, onSubmit, onCancel, initialData, isModal }) => {
  const [rating, setRating] = useState(initialData?.rating || 0);
  const [title, setTitle] = useState(initialData?.title || '');
  const [description, setDescription] = useState(initialData?.description || '');
  const [images, setImages] = useState<File[]>([]);
  const [existingImages, setExistingImages] = useState<string[]>(initialData?.images || []);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selected = Array.from(e.target.files);
      if (images.length + existingImages.length + selected.length > 5) {
        setError('Maximum 5 images allowed');
        return;
      }
      setImages(prev => [...prev, ...selected]);
    }
  };

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  const removeExistingImage = (index: number) => {
    setExistingImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (rating === 0) {
      setError('Please select a star rating');
      return;
    }
    
    try {
      setSubmitting(true);
      setError('');
      await onSubmit({ rating, title, description, images });
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to submit review');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={isModal ? "" : "bg-white p-6 rounded-2xl shadow-lg border border-gray-100 max-w-2xl mx-auto"}>
      {!isModal && <h3 className="text-xl font-bold mb-4">Write a Review</h3>}
      
      {error && (
        <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-4 text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Overall Rating *</label>
          <StarRating rating={rating} readonly={false} size={28} onChange={setRating} />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Add a Headline</label>
          <input
            type="text"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-primary focus:border-primary"
            placeholder="What's most important to know?"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={255}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Add a Written Review *</label>
          <textarea
            required
            rows={4}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-primary focus:border-primary"
            placeholder="What did you like or dislike? What did you use this product for?"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={2000}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Add Photos (Optional)</label>
          <div className="flex flex-wrap gap-4">
            {existingImages.map((url, idx) => (
              <div key={`existing-${idx}`} className="relative w-20 h-20 border border-gray-200 rounded-lg overflow-hidden group">
                <img src={url} alt="Existing" className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => removeExistingImage(idx)}
                  className="absolute top-1 right-1 bg-black/50 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X size={14} />
                </button>
              </div>
            ))}
            {images.map((file, idx) => (
              <div key={`new-${idx}`} className="relative w-20 h-20 border border-gray-200 rounded-lg overflow-hidden group">
                <img src={URL.createObjectURL(file)} alt="Preview" className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => removeImage(idx)}
                  className="absolute top-1 right-1 bg-black/50 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X size={14} />
                </button>
              </div>
            ))}
            
            {(images.length + existingImages.length) < 5 && (
              <label className="w-20 h-20 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center text-gray-500 hover:text-primary hover:border-primary cursor-pointer transition-colors">
                <Upload size={20} />
                <span className="text-[10px] mt-1 font-medium">Upload</span>
                <input type="file" multiple accept="image/*" className="hidden" onChange={handleImageChange} />
              </label>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3 pt-4 border-t border-gray-100">
          <Button type="button" variant="outline" onClick={onCancel} disabled={submitting}>
            Cancel
          </Button>
          <Button type="submit" disabled={submitting} className="flex items-center gap-2">
            {submitting && <Loader2 size={16} className="animate-spin" />}
            {initialData ? 'Update Review' : 'Submit Review'}
          </Button>
        </div>
      </form>
    </div>
  );
};
