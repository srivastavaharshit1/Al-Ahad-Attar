import React, { useState, useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import { homepageService } from '../../../services/homepageService';
import type { HeroBannerResponse } from '../../../types/homepage';
import { Modal } from '../../../components/ui/Modal';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Loader } from '../../../components/ui/Loader';
import { ConfirmationDialog } from '../../../components/ui/ConfirmationDialog';
import { getImageUrl } from '../../../utils/getImageUrl';

export const HeroTab: React.FC = () => {
  const [heroes, setHeroes] = useState<HeroBannerResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingHero, setEditingHero] = useState<HeroBannerResponse | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  
  // Form State
  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [description, setDescription] = useState('');
  const [buttonText, setButtonText] = useState('');
  const [buttonUrl, setButtonUrl] = useState('');
  const [badge, setBadge] = useState('');
  const [active, setActive] = useState(true);

  // File Upload State
  const desktopInputRef = useRef<HTMLInputElement>(null);
  const mobileInputRef = useRef<HTMLInputElement>(null);
  
  // Delete State
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    loadHeroes();
  }, []);

  const loadHeroes = async () => {
    setIsLoading(true);
    try {
      const data = await homepageService.getAllHeroBanners();
      setHeroes(data.sort((a, b) => a.displayOrder - b.displayOrder));
    } catch (error) {
      toast.error('Failed to load hero banners');
    } finally {
      setIsLoading(false);
    }
  };

  const openCreateModal = () => {
    setEditingHero(null);
    setTitle('');
    setSubtitle('');
    setDescription('');
    setButtonText('');
    setButtonUrl('');
    setBadge('');
    setActive(true);
    setIsModalOpen(true);
  };

  const openEditModal = (hero: HeroBannerResponse) => {
    setEditingHero(hero);
    setTitle(hero.title || '');
    setSubtitle(hero.subtitle || '');
    setDescription(hero.description || '');
    setButtonText(hero.buttonText || '');
    setButtonUrl(hero.buttonUrl || '');
    setBadge(hero.badge || '');
    setActive(hero.active);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingHero(null);
  };

  const handleSave = async () => {
    if (!title.trim()) {
      toast.error("Title is required");
      return;
    }

    // Validate any selected image files client-side before hitting the network —
    // the backend rejects anything over 5MB (application.yml multipart.max-file-size).
    const filesToCheck = [desktopInputRef.current?.files?.[0], mobileInputRef.current?.files?.[0]];
    for (const f of filesToCheck) {
      if (!f) continue;
      if (!f.type.startsWith('image/')) {
        toast.error(`File "${f.name}" is not a supported image type.`);
        return;
      }
      if (f.size > 5 * 1024 * 1024) {
        toast.error(`File "${f.name}" exceeds the 5MB size limit.`);
        return;
      }
    }

    setIsSaving(true);
    const request = {
      title: title.trim(),
      subtitle: subtitle.trim(),
      description: description.trim(),
      buttonText: buttonText.trim(),
      buttonUrl: buttonUrl.trim(),
      badge: badge.trim(),
      active
    };

    try {
      let savedHero: HeroBannerResponse;
      if (editingHero) {
        savedHero = await homepageService.updateHeroBanner(editingHero.id, request);
        toast.success('Hero banner updated');
      } else {
        savedHero = await homepageService.createHeroBanner(request);
        toast.success('Hero banner created');
      }
      
      // Handle file uploads if any
      const desktopFile = desktopInputRef.current?.files?.[0];
      const mobileFile = mobileInputRef.current?.files?.[0];
      
      if (desktopFile) {
        await homepageService.uploadHeroImage(savedHero.id, desktopFile, false);
      }
      if (mobileFile) {
        await homepageService.uploadHeroImage(savedHero.id, mobileFile, true);
      }
      
      closeModal();
      loadHeroes();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to save hero banner');
    } finally {
      setIsSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    setIsDeleting(true);
    try {
      await homepageService.deleteHeroBanner(deleteId);
      toast.success('Hero banner deleted');
      loadHeroes();
    } catch (error) {
      toast.error('Failed to delete hero banner');
    } finally {
      setIsDeleting(false);
      setDeleteId(null);
    }
  };

  const handleMoveUp = async (index: number) => {
    if (index === 0) return;
    const current = heroes[index];
    const previous = heroes[index - 1];
    try {
      await homepageService.reorderHeroBanners([
        { id: current.id, displayOrder: previous.displayOrder },
        { id: previous.id, displayOrder: current.displayOrder }
      ]);
      await loadHeroes();
    } catch (error) {
      toast.error('Failed to reorder banners');
    }
  };

  const handleMoveDown = async (index: number) => {
    if (index === heroes.length - 1) return;
    const current = heroes[index];
    const next = heroes[index + 1];
    try {
      await homepageService.reorderHeroBanners([
        { id: current.id, displayOrder: next.displayOrder },
        { id: next.id, displayOrder: current.displayOrder }
      ]);
      await loadHeroes();
    } catch (error) {
      toast.error('Failed to reorder banners');
    }
  };

  const handleToggleActive = async (hero: HeroBannerResponse) => {
    try {
      await homepageService.updateHeroBanner(hero.id, {
        title: hero.title,
        subtitle: hero.subtitle,
        description: hero.description,
        buttonText: hero.buttonText,
        buttonUrl: hero.buttonUrl,
        badge: hero.badge,
        active: !hero.active
      });
      setHeroes(heroes.map(h => h.id === hero.id ? { ...h, active: !h.active } : h));
      toast.success(`${hero.title} ${!hero.active ? 'enabled' : 'disabled'}`);
    } catch (error) {
      toast.error('Failed to update status');
    }
  };

  if (isLoading) return <Loader />;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-6">
        <p className="font-body-sm text-on-surface-variant">Manage the main hero banners. Active banners are displayed as a carousel.</p>
        <Button onClick={openCreateModal} className="flex items-center gap-2">
          <span className="material-symbols-outlined text-[18px]">add</span>
          Add Banner
        </Button>
      </div>
      
      {heroes.length === 0 ? (
        <div className="p-12 text-center text-on-surface-variant bg-surface-container-low rounded-lg border border-dashed border-outline-variant">
          No hero banners found. Click 'Add Banner' to create one.
        </div>
      ) : (
        <div className="space-y-4">
          {heroes.map((hero, idx) => (
            <div key={hero.id} className="card flex gap-4 p-4 items-center">
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
                  disabled={idx === heroes.length - 1}
                  className={`p-1 rounded bg-surface-container text-on-surface-variant transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2 ${idx === heroes.length - 1 ? 'opacity-30 cursor-not-allowed' : 'hover:bg-surface-container-high hover:text-primary'}`}
                >
                  <span className="material-symbols-outlined text-[16px]">arrow_downward</span>
                </button>
              </div>

              <div className="w-32 h-20 bg-surface-container-high rounded overflow-hidden flex-shrink-0 border border-outline relative">
                {hero.imageUrl ? (
                  <img src={getImageUrl(hero.imageUrl)} alt={hero.title} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-xs text-on-surface-variant">
                    <span className="material-symbols-outlined text-[20px] mb-1">image</span>
                    No Image
                  </div>
                )}
                {hero.mobileImageUrl && (
                  <div className="absolute bottom-1 right-1 bg-ink/70 text-surface text-[9px] px-1 rounded uppercase tracking-wide">Mobile</div>
                )}
              </div>

              <div className="flex-grow min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="font-label-lg text-on-surface truncate">{hero.title}</h4>
                  {hero.badge && <span className="badge badge-gold">{hero.badge}</span>}
                </div>
                <p className="font-body-sm text-on-surface-variant truncate">{hero.subtitle}</p>
                <p className="font-body-sm text-on-surface-variant text-xs mt-1">Link: {hero.buttonUrl || 'None'}</p>
              </div>

              <div className="flex items-center gap-4 shrink-0">
                <button
                  onClick={() => handleToggleActive(hero)}
                  className={`w-12 h-6 rounded-full transition-colors relative shadow-inner focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2 ${hero.active ? 'bg-primary' : 'bg-surface-container-high border border-outline'}`}
                >
                  <span className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform shadow ${hero.active ? 'translate-x-6' : ''}`}></span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => openEditModal(hero)}
                    className="p-2 text-on-surface-variant hover:text-primary hover:bg-primary/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2 transition-colors bg-surface-container-lowest border border-outline rounded flex items-center justify-center"
                    title="Edit"
                  >
                    <span className="material-symbols-outlined text-[20px]">edit</span>
                  </button>
                  <button
                    onClick={() => setDeleteId(hero.id)}
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

      <Modal isOpen={isModalOpen} onClose={closeModal} title={editingHero ? 'Edit Hero Banner' : 'Add Hero Banner'} maxWidth="lg">
        <div className="space-y-4">
          <Input 
            label="Title *" 
            value={title} 
            onChange={(e: any) => setTitle(e.target.value)} 
            placeholder="e.g. Summer Collection 2024"
            required
          />
          <Input 
            label="Subtitle" 
            value={subtitle} 
            onChange={(e: any) => setSubtitle(e.target.value)} 
            placeholder="e.g. Discover our new luxurious scents"
          />
          
          <div>
            <label className="field-label">Description</label>
            <textarea
              className="field-input min-h-[80px]"
              value={description}
              onChange={(e: any) => setDescription(e.target.value)}
              placeholder="Detailed text for the banner (optional)"
            />
          </div>

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
              placeholder="e.g. /collection/perfumes"
            />
          </div>

          <Input 
            label="Badge Text" 
            value={badge} 
            onChange={(e: any) => setBadge(e.target.value)} 
            placeholder="e.g. New Arrival"
          />

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
            <h4 className="font-label-md text-on-surface">Images</h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="border-2 border-dashed border-outline-variant hover:border-accent transition-colors rounded-lg p-4 text-center bg-surface-container-lowest">
                <div className="flex flex-col items-center mb-2">
                  <p className="font-label-sm">Desktop Image</p>
                  <span className="text-[10px] text-accent/90 mt-1 font-medium">Rec: 1920x1080 (16:9 ratio for Landscape)</span>
                </div>
                {editingHero?.imageUrl && (
                  <img src={getImageUrl(editingHero.imageUrl)} alt="" className="w-full h-16 object-cover mb-2 rounded" />
                )}
                <input
                  type="file"
                  accept="image/*"
                  ref={desktopInputRef}
                  className="block w-full text-xs text-on-surface-variant file:mr-4 file:py-1.5 file:px-3 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2 rounded"
                />
              </div>

              <div className="border-2 border-dashed border-outline-variant hover:border-accent transition-colors rounded-lg p-4 text-center bg-surface-container-lowest">
                <div className="flex flex-col items-center mb-2">
                  <p className="font-label-sm">Mobile Image (Optional)</p>
                  <span className="text-[10px] text-accent/90 mt-1 font-medium">Rec: 1080x1350 (4:5 ratio for Portrait)</span>
                </div>
                {editingHero?.mobileImageUrl && (
                  <img src={getImageUrl(editingHero.mobileImageUrl)} alt="" className="w-12 h-16 object-cover mb-2 rounded mx-auto" />
                )}
                <input
                  type="file"
                  accept="image/*"
                  ref={mobileInputRef}
                  className="block w-full text-xs text-on-surface-variant file:mr-4 file:py-1.5 file:px-3 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2 rounded"
                />
              </div>
            </div>
            <p className="text-xs text-on-surface-variant">Recommended: WebP format, under 1MB. Selecting a new file will overwrite the existing image.</p>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-outline-variant mt-6">
            <Button variant="outline" onClick={closeModal} disabled={isSaving}>Cancel</Button>
            <Button variant="primary" onClick={handleSave} disabled={isSaving}>
              {isSaving ? 'Saving...' : 'Save Banner'}
            </Button>
          </div>
        </div>
      </Modal>

      <ConfirmationDialog
        isOpen={deleteId !== null}
        onClose={() => !isDeleting && setDeleteId(null)}
        onConfirm={confirmDelete}
        title="Delete Hero Banner"
        description="Are you sure you want to delete this banner? This action cannot be undone."
        confirmText="Delete Banner"
        isLoading={isDeleting}
        actionType="DELETE"
      />
    </div>
  );
};
