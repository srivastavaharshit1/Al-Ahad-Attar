import React, { useState, useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import { homepageService } from '../../../services/homepageService';
import type { TestimonialResponse } from '../../../types/homepage';
import { Modal } from '../../../components/ui/Modal';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Loader } from '../../../components/ui/Loader';
import { ConfirmationDialog } from '../../../components/ui/ConfirmationDialog';
import { getImageUrl } from '../../../utils/getImageUrl';

export const TestimonialsTab: React.FC = () => {
  const [testimonials, setTestimonials] = useState<TestimonialResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTestimonial, setEditingTestimonial] = useState<TestimonialResponse | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  
  // Form State
  const [customerName, setCustomerName] = useState('');
  const [rating, setRating] = useState(5);
  const [review, setReview] = useState('');
  const [active, setActive] = useState(true);

  // File Upload State
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Delete State
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    loadTestimonials();
  }, []);

  const loadTestimonials = async () => {
    setIsLoading(true);
    try {
      const data = await homepageService.getAllTestimonials();
      setTestimonials(data.sort((a, b) => a.displayOrder - b.displayOrder));
    } catch (error) {
      toast.error('Failed to load testimonials');
    } finally {
      setIsLoading(false);
    }
  };

  const openCreateModal = () => {
    setEditingTestimonial(null);
    setCustomerName('');
    setRating(5);
    setReview('');
    setActive(true);
    setIsModalOpen(true);
  };

  const openEditModal = (testimonial: TestimonialResponse) => {
    setEditingTestimonial(testimonial);
    setCustomerName(testimonial.customerName);
    setRating(testimonial.rating);
    setReview(testimonial.review);
    setActive(testimonial.active);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingTestimonial(null);
  };

  const handleSave = async () => {
    if (!customerName.trim() || !review.trim()) {
      toast.error("Name and Review are required");
      return;
    }
    if (rating < 1 || rating > 5) {
      toast.error("Rating must be between 1 and 5");
      return;
    }

    // Validate any selected photo client-side before hitting the network —
    // the backend rejects anything over 5MB (application.yml multipart.max-file-size).
    const selectedFile = fileInputRef.current?.files?.[0];
    if (selectedFile) {
      if (!selectedFile.type.startsWith('image/')) {
        toast.error(`File "${selectedFile.name}" is not a supported image type.`);
        return;
      }
      if (selectedFile.size > 5 * 1024 * 1024) {
        toast.error(`File "${selectedFile.name}" exceeds the 5MB size limit.`);
        return;
      }
    }

    setIsSaving(true);
    const request = {
      customerName: customerName.trim(),
      rating,
      review: review.trim(),
      active
    };

    try {
      let savedTestimonial: TestimonialResponse;
      if (editingTestimonial) {
        savedTestimonial = await homepageService.updateTestimonial(editingTestimonial.id, request);
        toast.success('Testimonial updated');
      } else {
        savedTestimonial = await homepageService.createTestimonial(request);
        toast.success('Testimonial created');
      }
      
      // Handle file uploads if any
      const file = fileInputRef.current?.files?.[0];
      if (file) {
        await homepageService.uploadTestimonialPhoto(savedTestimonial.id, file);
      }
      
      closeModal();
      loadTestimonials();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to save testimonial');
    } finally {
      setIsSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    setIsDeleting(true);
    try {
      await homepageService.deleteTestimonial(deleteId);
      toast.success('Testimonial deleted');
      loadTestimonials();
    } catch (error) {
      toast.error('Failed to delete testimonial');
    } finally {
      setIsDeleting(false);
      setDeleteId(null);
    }
  };

  const handleMoveUp = async (index: number) => {
    if (index === 0) return;
    const current = testimonials[index];
    const previous = testimonials[index - 1];
    try {
      await homepageService.reorderTestimonials([
        { id: current.id, displayOrder: previous.displayOrder },
        { id: previous.id, displayOrder: current.displayOrder }
      ]);
      await loadTestimonials();
    } catch (error) {
      toast.error('Failed to reorder testimonials');
    }
  };

  const handleMoveDown = async (index: number) => {
    if (index === testimonials.length - 1) return;
    const current = testimonials[index];
    const next = testimonials[index + 1];
    try {
      await homepageService.reorderTestimonials([
        { id: current.id, displayOrder: next.displayOrder },
        { id: next.id, displayOrder: current.displayOrder }
      ]);
      await loadTestimonials();
    } catch (error) {
      toast.error('Failed to reorder testimonials');
    }
  };

  const handleToggleActive = async (testimonial: TestimonialResponse) => {
    try {
      await homepageService.updateTestimonial(testimonial.id, {
        customerName: testimonial.customerName,
        rating: testimonial.rating,
        review: testimonial.review,
        active: !testimonial.active
      });
      setTestimonials(testimonials.map(t => t.id === testimonial.id ? { ...t, active: !t.active } : t));
      toast.success(`${testimonial.customerName}'s review ${!testimonial.active ? 'enabled' : 'disabled'}`);
    } catch (error) {
      toast.error('Failed to update status');
    }
  };

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }).map((_, i) => (
      <span key={i} className={`material-symbols-outlined text-[14px] ${i < rating ? 'text-accent' : 'text-outline-variant'}`} style={{ fontVariationSettings: i < rating ? "'FILL' 1" : "'FILL' 0" }}>
        star
      </span>
    ));
  };

  if (isLoading) return <Loader />;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-6">
        <p className="font-body-sm text-on-surface-variant">Manage customer testimonials to build trust.</p>
        <Button onClick={openCreateModal} className="flex items-center gap-2">
          <span className="material-symbols-outlined text-[18px]">add</span>
          Add Testimonial
        </Button>
      </div>
      
      {testimonials.length === 0 ? (
        <div className="p-12 text-center text-on-surface-variant bg-surface-container-low rounded-lg border border-dashed border-outline-variant">
          No testimonials found. Click 'Add Testimonial' to create one.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {testimonials.map((testimonial, idx) => (
            <div key={testimonial.id} className="card flex flex-col p-4 relative">
              <div className="flex items-start gap-4 mb-3">
                <div className="w-12 h-12 rounded-full overflow-hidden flex-shrink-0 border border-outline bg-surface-container-high">
                  {testimonial.photoUrl ? (
                    <img src={getImageUrl(testimonial.photoUrl)} alt={testimonial.customerName} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-on-surface-variant">
                      <span className="material-symbols-outlined text-[20px]">person</span>
                    </div>
                  )}
                </div>
                
                <div className="flex-grow">
                  <h4 className="font-label-lg text-on-surface">{testimonial.customerName}</h4>
                  <div className="flex items-center mt-0.5">
                    {renderStars(testimonial.rating)}
                  </div>
                </div>

                <button
                  onClick={() => handleToggleActive(testimonial)}
                  className={`w-10 h-5 rounded-full transition-colors relative shadow-inner focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2 ${testimonial.active ? 'bg-primary' : 'bg-surface-container-high border border-outline'}`}
                  title={testimonial.active ? 'Disable' : 'Enable'}
                >
                  <span className={`absolute top-0.5 left-0.5 bg-white w-4 h-4 rounded-full transition-transform shadow ${testimonial.active ? 'translate-x-5' : ''}`}></span>
                </button>
              </div>
              
              <p className="font-body-sm text-on-surface-variant italic mb-4 flex-grow">"{testimonial.review}"</p>

              <div className="flex justify-between items-center pt-3 border-t border-outline-variant">
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleMoveUp(idx)}
                    disabled={idx === 0}
                    className={`p-1 rounded bg-surface-container text-on-surface-variant transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2 ${idx === 0 ? 'opacity-30 cursor-not-allowed' : 'hover:bg-surface-container-high hover:text-primary'}`}
                  >
                    <span className="material-symbols-outlined text-[16px]">arrow_back</span>
                  </button>
                  <button
                    onClick={() => handleMoveDown(idx)}
                    disabled={idx === testimonials.length - 1}
                    className={`p-1 rounded bg-surface-container text-on-surface-variant transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2 ${idx === testimonials.length - 1 ? 'opacity-30 cursor-not-allowed' : 'hover:bg-surface-container-high hover:text-primary'}`}
                  >
                    <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => openEditModal(testimonial)}
                    className="p-1.5 text-on-surface-variant hover:text-primary hover:bg-primary/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2 transition-colors bg-surface-container-lowest border border-outline rounded flex items-center justify-center"
                    title="Edit"
                  >
                    <span className="material-symbols-outlined text-[18px]">edit</span>
                  </button>
                  <button
                    onClick={() => setDeleteId(testimonial.id)}
                    className="p-1.5 text-error hover:bg-error/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2 transition-colors bg-surface-container-lowest border border-outline rounded flex items-center justify-center"
                    title="Delete"
                  >
                    <span className="material-symbols-outlined text-[18px]">delete</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal isOpen={isModalOpen} onClose={closeModal} title={editingTestimonial ? 'Edit Testimonial' : 'Add Testimonial'} maxWidth="md">
        <div className="space-y-4">
          <Input 
            label="Customer Name *" 
            value={customerName} 
            onChange={(e: any) => setCustomerName(e.target.value)} 
            placeholder="e.g. Sarah J."
            required
          />
          
          <div>
            <label className="field-label">Rating (1-5) *</label>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  className="p-1 rounded transition-colors hover:bg-accent-soft/50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2"
                >
                  <span className={`material-symbols-outlined text-2xl ${rating >= star ? 'text-accent' : 'text-outline-variant'}`} style={{ fontVariationSettings: rating >= star ? "'FILL' 1" : "'FILL' 0" }}>
                    star
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="field-label">Review *</label>
            <textarea
              className="field-input min-h-[100px]"
              value={review}
              onChange={(e: any) => setReview(e.target.value)}
              placeholder="e.g. Absolutely love the fragrances! The quality is amazing."
              required
            />
          </div>

          <div className="flex items-center gap-2 pt-2">
            <input
              type="checkbox"
              id="activeCheckbox"
              checked={active}
              onChange={(e: any) => setActive(e.target.checked)}
              className="w-4 h-4 text-accent rounded border-outline-variant focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2"
            />
            <label htmlFor="activeCheckbox" className="text-sm text-on-surface">Active on storefront</label>
          </div>

          <div className="pt-4 mt-2 border-t border-outline-variant space-y-4">
            <h4 className="font-label-md text-on-surface">Customer Photo (Optional)</h4>

            <div className="border-2 border-dashed border-outline-variant hover:border-accent transition-colors rounded-lg p-4 flex flex-col items-center bg-surface-container-lowest">
              {editingTestimonial?.photoUrl ? (
                <img src={getImageUrl(editingTestimonial.photoUrl)} alt="" className="w-16 h-16 rounded-full object-cover mb-4 border border-outline" />
              ) : (
                <div className="w-16 h-16 rounded-full bg-surface-container-high flex items-center justify-center mb-4 border border-outline">
                  <span className="material-symbols-outlined text-on-surface-variant">person</span>
                </div>
              )}
              <input
                type="file"
                accept="image/*"
                ref={fileInputRef}
                className="block w-full text-xs text-on-surface-variant file:mr-4 file:py-1.5 file:px-3 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2 rounded"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-outline-variant mt-6">
            <Button variant="outline" onClick={closeModal} disabled={isSaving}>Cancel</Button>
            <Button variant="primary" onClick={handleSave} disabled={isSaving}>
              {isSaving ? 'Saving...' : 'Save Testimonial'}
            </Button>
          </div>
        </div>
      </Modal>

      <ConfirmationDialog
        isOpen={deleteId !== null}
        onClose={() => !isDeleting && setDeleteId(null)}
        onConfirm={confirmDelete}
        title="Delete Testimonial"
        description="Are you sure you want to delete this testimonial? This action cannot be undone."
        confirmText="Delete Testimonial"
        isLoading={isDeleting}
        actionType="DELETE"
      />
    </div>
  );
};
