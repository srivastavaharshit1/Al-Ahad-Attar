import React, { useState, useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import { homepageService } from '../../../services/homepageService';
import type { PromoBannerResponse } from '../../../types/homepage';
import { Modal } from '../../../components/ui/Modal';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Loader } from '../../../components/ui/Loader';
import { ConfirmationDialog } from '../../../components/ui/ConfirmationDialog';
import { getImageUrl } from '../../../utils/getImageUrl';

export const PromoTab: React.FC = () => {
  const [promos, setPromos] = useState<PromoBannerResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPromo, setEditingPromo] = useState<PromoBannerResponse | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  
  // Form State
  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [buttonText, setButtonText] = useState('');
  const [buttonUrl, setButtonUrl] = useState('');
  const [backgroundColor, setBackgroundColor] = useState('#000000');
  const [active, setActive] = useState(true);

  // File Upload State
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Delete State
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    loadPromos();
  }, []);

  const loadPromos = async () => {
    setIsLoading(true);
    try {
      const data = await homepageService.getAllPromoBanners();
      setPromos(data.sort((a, b) => a.priority - b.priority));
    } catch (error) {
      toast.error('Failed to load promo banners');
    } finally {
      setIsLoading(false);
    }
  };

  const openCreateModal = () => {
    setEditingPromo(null);
    setTitle('');
    setSubtitle('');
    setButtonText('');
    setButtonUrl('');
    setBackgroundColor('#000000');
    setActive(true);
    setIsModalOpen(true);
  };

  const openEditModal = (promo: PromoBannerResponse) => {
    setEditingPromo(promo);
    setTitle(promo.title || '');
    setSubtitle(promo.subtitle || '');
    setButtonText(promo.buttonText || '');
    setButtonUrl(promo.buttonUrl || '');
    setBackgroundColor(promo.backgroundColor || '#000000');
    setActive(promo.active);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingPromo(null);
  };

  const handleSave = async () => {
    if (!title.trim()) {
      toast.error("Title is required");
      return;
    }

    // Validate any selected image file client-side before hitting the network —
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
    // Note: startDate and endDate can be added later if needed, passing nulls for now.
    const request = {
      title: title.trim(),
      subtitle: subtitle.trim(),
      buttonText: buttonText.trim(),
      buttonUrl: buttonUrl.trim(),
      backgroundColor: backgroundColor,
      priority: editingPromo ? editingPromo.priority : promos.length, // Ensure priority is not null
      active,
      startDate: null,
      endDate: null
    };

    try {
      let savedPromo: PromoBannerResponse;
      if (editingPromo) {
        savedPromo = await homepageService.updatePromoBanner(editingPromo.id, request);
        toast.success('Promo banner updated');
      } else {
        savedPromo = await homepageService.createPromoBanner(request);
        toast.success('Promo banner created');
      }
      
      // Handle file uploads if any
      const file = fileInputRef.current?.files?.[0];
      if (file) {
        await homepageService.uploadPromoImage(savedPromo.id, file);
      }
      
      closeModal();
      loadPromos();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to save promo banner');
    } finally {
      setIsSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    setIsDeleting(true);
    try {
      await homepageService.deletePromoBanner(deleteId);
      toast.success('Promo banner deleted');
      loadPromos();
    } catch (error) {
      toast.error('Failed to delete promo banner');
    } finally {
      setIsDeleting(false);
      setDeleteId(null);
    }
  };

  const handleMoveUp = async (index: number) => {
    if (index === 0) return;
    const current = promos[index];
    const previous = promos[index - 1];
    try {
      await homepageService.reorderPromoBanners([
        { id: current.id, displayOrder: previous.priority },
        { id: previous.id, displayOrder: current.priority }
      ]);
      await loadPromos();
    } catch (error) {
      toast.error('Failed to reorder banners');
    }
  };

  const handleMoveDown = async (index: number) => {
    if (index === promos.length - 1) return;
    const current = promos[index];
    const next = promos[index + 1];
    try {
      await homepageService.reorderPromoBanners([
        { id: current.id, displayOrder: next.priority },
        { id: next.id, displayOrder: current.priority }
      ]);
      await loadPromos();
    } catch (error) {
      toast.error('Failed to reorder banners');
    }
  };

  const handleToggleActive = async (promo: PromoBannerResponse) => {
    try {
      await homepageService.updatePromoBanner(promo.id, {
        title: promo.title,
        subtitle: promo.subtitle,
        buttonText: promo.buttonText,
        buttonUrl: promo.buttonUrl,
        backgroundColor: promo.backgroundColor,
        priority: promo.priority,
        startDate: null, endDate: null, active: !promo.active
      });
      setPromos(promos.map(p => p.id === promo.id ? { ...p, startDate: null, endDate: null, active: !p.active } : p));
      toast.success(`${promo.title} ${!promo.active ? 'enabled' : 'disabled'}`);
    } catch (error) {
      toast.error('Failed to update status');
    }
  };

  if (isLoading) return <Loader />;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-6">
        <p className="font-body-sm text-on-surface-variant">Manage secondary promotional banners.</p>
        <Button onClick={openCreateModal} className="flex items-center gap-2">
          <span className="material-symbols-outlined text-[18px]">add</span>
          Add Promo
        </Button>
      </div>
      
      {promos.length === 0 ? (
        <div className="p-12 text-center text-on-surface-variant bg-surface-container-low rounded-lg border border-dashed border-outline-variant">
          No promo banners found. Click 'Add Promo' to create one.
        </div>
      ) : (
        <div className="space-y-4">
          {promos.map((promo, idx) => (
            <div key={promo.id} className="card flex gap-4 p-4 items-center">
              <div className="flex flex-col gap-1 shrink-0">
                <button
                  onClick={() => handleMoveUp(idx)}
                  disabled={idx === 0}
                  className={`p-1 rounded bg-surface-container text-on-surface-variant transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2 ${idx === 0 ? 'opacity-30 cursor-not-allowed' : 'hover:bg-surface-container-high hover:text-primary'}`}
                >
                  <span className="material-symbols-outlined text-[16px]">arrow_upward</span>
                </button>
                <button
                  onClick={() => handleMoveDown(idx)}
                  disabled={idx === promos.length - 1}
                  className={`p-1 rounded bg-surface-container text-on-surface-variant transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2 ${idx === promos.length - 1 ? 'opacity-30 cursor-not-allowed' : 'hover:bg-surface-container-high hover:text-primary'}`}
                >
                  <span className="material-symbols-outlined text-[16px]">arrow_downward</span>
                </button>
              </div>

              <div 
                className="w-24 h-24 rounded overflow-hidden flex-shrink-0 border border-outline relative flex items-center justify-center"
                style={{ backgroundColor: promo.backgroundColor || '#eee' }}
              >
                {promo.imageUrl ? (
                  <img src={getImageUrl(promo.imageUrl)} alt={promo.title} className="w-full h-full object-cover opacity-80 mix-blend-overlay" />
                ) : (
                  <span className="material-symbols-outlined text-white/50 text-[32px]">image</span>
                )}
              </div>
              
              <div className="flex-grow min-w-0">
                <h4 className="font-label-lg text-on-surface truncate">{promo.title}</h4>
                <p className="font-body-sm text-on-surface-variant truncate">{promo.subtitle}</p>
                <div className="flex items-center gap-2 mt-2">
                  <div className="w-4 h-4 rounded-full border border-outline" style={{ backgroundColor: promo.backgroundColor }}></div>
                  <span className="text-xs text-on-surface-variant">{promo.backgroundColor}</span>
                </div>
              </div>

              <div className="flex items-center gap-4 shrink-0">
                <button
                  onClick={() => handleToggleActive(promo)}
                  className={`w-12 h-6 rounded-full transition-colors relative shadow-inner focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2 ${promo.active ? 'bg-primary' : 'bg-surface-container-high border border-outline'}`}
                >
                  <span className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform shadow ${promo.active ? 'translate-x-6' : ''}`}></span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => openEditModal(promo)}
                    className="p-2 text-on-surface-variant hover:text-primary hover:bg-primary/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2 transition-colors bg-surface-container-lowest border border-outline rounded flex items-center justify-center"
                    title="Edit"
                  >
                    <span className="material-symbols-outlined text-[20px]">edit</span>
                  </button>
                  <button
                    onClick={() => setDeleteId(promo.id)}
                    className="p-2 text-error hover:bg-error/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2 transition-colors bg-surface-container-lowest border border-outline rounded flex items-center justify-center"
                    title="Delete"
                  >
                    <span className="material-symbols-outlined text-[20px]">delete</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal isOpen={isModalOpen} onClose={closeModal} title={editingPromo ? 'Edit Promo Banner' : 'Add Promo Banner'} maxWidth="lg">
        <div className="space-y-4">
          <Input 
            label="Title *" 
            value={title} 
            onChange={(e: any) => setTitle(e.target.value)} 
            placeholder="e.g. 20% Off All Attars"
            required
          />
          <Input 
            label="Subtitle" 
            value={subtitle} 
            onChange={(e: any) => setSubtitle(e.target.value)} 
            placeholder="e.g. Use code ATTAR20 at checkout"
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Button Text"
              value={buttonText}
              onChange={(e: any) => setButtonText(e.target.value)}
              placeholder="e.g. Shop Now"
            />
            <Input
              label="Button URL"
              value={buttonUrl}
              onChange={(e: any) => setButtonUrl(e.target.value)}
              placeholder="e.g. /offers"
            />
          </div>

          <div>
            <label className="field-label">Background Color</label>
            <div className="flex gap-2 items-center">
              <input
                type="color"
                value={backgroundColor}
                onChange={(e: any) => setBackgroundColor(e.target.value)}
                className="w-12 h-10 border border-outline-variant rounded-md cursor-pointer p-0 hover:border-accent transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2"
              />
              <Input
                value={backgroundColor}
                onChange={(e: any) => setBackgroundColor(e.target.value)}
                placeholder="#000000"
                className="flex-grow"
              />
            </div>
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
            <div className="flex flex-col items-start mb-2">
              <h4 className="font-label-md text-on-surface">Background Image (Optional)</h4>
              <span className="text-[10px] text-on-surface-variant/70">Recommended: 1920x600 (approx. 3:1 ratio)</span>
            </div>

            <div className="border-2 border-dashed border-outline-variant hover:border-accent transition-colors rounded-lg p-4 text-center bg-surface-container-lowest">
              {editingPromo?.imageUrl && (
                <img src={getImageUrl(editingPromo.imageUrl)} alt="" className="h-24 object-cover mb-4 rounded mx-auto" />
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
              {isSaving ? 'Saving...' : 'Save Promo'}
            </Button>
          </div>
        </div>
      </Modal>

      <ConfirmationDialog
        isOpen={deleteId !== null}
        onClose={() => !isDeleting && setDeleteId(null)}
        onConfirm={confirmDelete}
        title="Delete Promo Banner"
        description="Are you sure you want to delete this promo? This action cannot be undone."
        confirmText="Delete Promo"
        isLoading={isDeleting}
        actionType="DELETE"
      />
    </div>
  );
};
