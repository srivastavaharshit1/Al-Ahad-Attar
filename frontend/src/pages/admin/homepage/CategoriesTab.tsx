import React, { useState, useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import { categoryService } from '../../../services/categoryService';
import type { Category } from '../../../types';
import { Modal } from '../../../components/ui/Modal';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Loader } from '../../../components/ui/Loader';
import { getImageUrl } from '../../../utils/getImageUrl';

export const CategoriesTab: React.FC = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  
  // Form State
  const [homepageTitle, setHomepageTitle] = useState('');
  const [homepageSubtitle, setHomepageSubtitle] = useState('');
  const [homepageButtonText, setHomepageButtonText] = useState('');
  const [homepageButtonUrl, setHomepageButtonUrl] = useState('');
  const [showOnHomepage, setShowOnHomepage] = useState(false);
  const [homepageDisplayOrder, setHomepageDisplayOrder] = useState(0);

  // File Upload State
  const desktopInputRef = useRef<HTMLInputElement>(null);
  const mobileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    setIsLoading(true);
    try {
      const data = await categoryService.getCategories({ size: 100 });
      setCategories(data.content.sort((a, b) => (a.homepageDisplayOrder || 0) - (b.homepageDisplayOrder || 0)));
    } catch (error) {
      toast.error('Failed to load categories');
    } finally {
      setIsLoading(false);
    }
  };

  const openEditModal = (category: Category) => {
    setEditingCategory(category);
    setHomepageTitle(category.homepageTitle || '');
    setHomepageSubtitle(category.homepageSubtitle || '');
    setHomepageButtonText(category.homepageButtonText || '');
    setHomepageButtonUrl(category.homepageButtonUrl || '');
    setShowOnHomepage(category.showOnHomepage || false);
    setHomepageDisplayOrder(category.homepageDisplayOrder || 0);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingCategory(null);
  };

  const handleSave = async () => {
    if (!editingCategory) return;

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
      name: editingCategory.name,
      slug: editingCategory.name.toLowerCase().replace(/\s+/g, '-'),
      description: editingCategory.description,
      image: editingCategory.image,
      type: editingCategory.type,
      active: editingCategory.active,
      homepageTitle: homepageTitle.trim(),
      homepageSubtitle: homepageSubtitle.trim(),
      homepageButtonText: homepageButtonText.trim(),
      homepageButtonUrl: homepageButtonUrl.trim(),
      showOnHomepage,
      homepageDisplayOrder
    };

    try {
      await categoryService.updateCategory(editingCategory.id, request);
      toast.success('Category updated');
      
      // Handle file uploads if any
      const desktopFile = desktopInputRef.current?.files?.[0];
      const mobileFile = mobileInputRef.current?.files?.[0];
      
      if (desktopFile) {
        await categoryService.uploadDesktopImage(editingCategory.id, desktopFile);
      }
      if (mobileFile) {
        await categoryService.uploadMobileImage(editingCategory.id, mobileFile);
      }
      
      closeModal();
      loadCategories();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to save category');
    } finally {
      setIsSaving(false);
    }
  };

  const handleMoveUp = async (index: number) => {
    if (index === 0) return;
    const current = categories[index];
    const previous = categories[index - 1];
    try {
      await categoryService.updateCategory(current.id, {
        ...current,
        slug: current.name.toLowerCase().replace(/\s+/g, '-'),
        homepageDisplayOrder: previous.homepageDisplayOrder || 0
      });
      await categoryService.updateCategory(previous.id, {
        ...previous,
        slug: previous.name.toLowerCase().replace(/\s+/g, '-'),
        homepageDisplayOrder: current.homepageDisplayOrder || 0
      });
      await loadCategories();
    } catch (error) {
      toast.error('Failed to reorder categories');
    }
  };

  const handleMoveDown = async (index: number) => {
    if (index === categories.length - 1) return;
    const current = categories[index];
    const next = categories[index + 1];
    try {
      await categoryService.updateCategory(current.id, {
        ...current,
        slug: current.name.toLowerCase().replace(/\s+/g, '-'),
        homepageDisplayOrder: next.homepageDisplayOrder || 0
      });
      await categoryService.updateCategory(next.id, {
        ...next,
        slug: next.name.toLowerCase().replace(/\s+/g, '-'),
        homepageDisplayOrder: current.homepageDisplayOrder || 0
      });
      await loadCategories();
    } catch (error) {
      toast.error('Failed to reorder categories');
    }
  };

  const handleToggleVisible = async (category: Category) => {
    try {
      await categoryService.updateCategory(category.id, {
        ...category,
        slug: category.name.toLowerCase().replace(/\s+/g, '-'),
        showOnHomepage: !category.showOnHomepage
      });
      setCategories(categories.map(c => c.id === category.id ? { ...c, showOnHomepage: !c.showOnHomepage } : c));
      toast.success(`${category.name} homepage visibility updated`);
    } catch (error) {
      toast.error('Failed to update status');
    }
  };

  if (isLoading) return <Loader />;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-6">
        <p className="font-body-sm text-on-surface-variant">Manage category images and text displayed on the homepage.</p>
      </div>
      
      {categories.length === 0 ? (
        <div className="p-12 text-center text-on-surface-variant bg-surface-container-low rounded-lg border border-dashed border-outline-variant">
          No categories found. Create a category first.
        </div>
      ) : (
        <div className="space-y-4">
          {categories.map((category, idx) => (
            <div key={category.id} className="card flex gap-4 p-4 items-center">
              <div className="flex flex-col gap-1 shrink-0">
                <button
                  onClick={() => handleMoveUp(idx)}
                  disabled={idx === 0}
                  className={`p-1 rounded bg-surface-container text-on-surface-variant transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2 ${idx === 0 ? 'opacity-30 cursor-not-allowed' : 'hover:bg-surface-container-high hover:text-accent'}`}
                >
                  <span className="material-symbols-outlined text-[16px]">arrow_upward</span>
                </button>
                <button
                  onClick={() => handleMoveDown(idx)}
                  disabled={idx === categories.length - 1}
                  className={`p-1 rounded bg-surface-container text-on-surface-variant transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2 ${idx === categories.length - 1 ? 'opacity-30 cursor-not-allowed' : 'hover:bg-surface-container-high hover:text-accent'}`}
                >
                  <span className="material-symbols-outlined text-[16px]">arrow_downward</span>
                </button>
              </div>

              <div className="w-24 h-32 bg-surface-container-high rounded overflow-hidden flex-shrink-0 border border-outline relative">
                {category.desktopImageUrl ? (
                  <img src={getImageUrl(category.desktopImageUrl)} alt={category.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-xs text-on-surface-variant">
                    <span className="material-symbols-outlined text-[20px] mb-1">image</span>
                    No Image
                  </div>
                )}
                {category.mobileImageUrl && (
                  <div className="absolute bottom-1 right-1 bg-ink/75 text-inverse-on-surface text-[9px] px-1 rounded uppercase">Mobile</div>
                )}
              </div>

              <div className="flex-grow min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="font-label-lg text-on-surface truncate">{category.name}</h4>
                  {!category.showOnHomepage && <span className="badge badge-neutral shrink-0">Hidden</span>}
                </div>
                <p className="font-body-sm text-on-surface-variant truncate">Title: {category.homepageTitle || 'Default'}</p>
                <p className="font-body-sm text-on-surface-variant text-xs mt-1">Button Text: {category.homepageButtonText || 'Explore Collection'}</p>
              </div>

              <div className="flex items-center gap-4 shrink-0">
                <div className="flex items-center gap-2">
                  <span className="font-label-sm text-on-surface-variant uppercase tracking-wide">Visible</span>
                  <button
                    onClick={() => handleToggleVisible(category)}
                    className={`w-12 h-6 rounded-full transition-colors relative shadow-inner focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2 ${category.showOnHomepage ? 'bg-primary' : 'bg-surface-container-high border border-outline'}`}
                    title={category.showOnHomepage ? 'Visible on homepage' : 'Hidden from homepage'}
                  >
                    <span className={`absolute top-1 left-1 bg-surface-container-lowest w-4 h-4 rounded-full transition-transform shadow ${category.showOnHomepage ? 'translate-x-6' : ''}`}></span>
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => openEditModal(category)}
                    className="p-2 text-on-surface-variant hover:text-accent transition-colors bg-surface-container-lowest border border-outline rounded flex items-center justify-center focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2"
                    title="Edit Homepage Content"
                  >
                    <span className="material-symbols-outlined text-[20px]">edit</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal isOpen={isModalOpen} onClose={closeModal} title={'Edit Category Homepage Content'} maxWidth="lg">
        <div className="space-y-4">
          <Input 
            label="Homepage Title" 
            value={homepageTitle} 
            onChange={(e: any) => setHomepageTitle(e.target.value)} 
            placeholder={`e.g. ${editingCategory?.name}`}
          />
          <Input 
            label="Homepage Subtitle" 
            value={homepageSubtitle} 
            onChange={(e: any) => setHomepageSubtitle(e.target.value)} 
            placeholder="e.g. Discover authentic blends"
          />
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Button Text"
              value={homepageButtonText} 
              onChange={(e: any) => setHomepageButtonText(e.target.value)} 
              placeholder="e.g. Explore Collection"
            />
            <Input 
              label="Button URL" 
              value={homepageButtonUrl} 
              onChange={(e: any) => setHomepageButtonUrl(e.target.value)} 
              placeholder={`e.g. /category/${editingCategory?.type.toLowerCase()}`}
            />
          </div>

          <div className="flex items-center gap-2 pt-2">
            <input 
              type="checkbox" 
              id="activeCheckbox"
              checked={showOnHomepage}
              onChange={(e: any) => setShowOnHomepage(e.target.checked)}
              className="w-4 h-4 text-primary rounded border-outline-variant focus:ring-primary"
            />
            <label htmlFor="activeCheckbox" className="text-sm text-on-surface">Show on Homepage</label>
          </div>

          <div className="pt-4 mt-2 border-t border-outline-variant space-y-4">
            <h4 className="font-label-md text-on-surface">Images</h4>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-surface-container-lowest border border-outline-variant rounded p-4 text-center">
                <div className="flex flex-col items-center mb-2">
                  <p className="font-label-sm">Desktop Image</p>
                  <span className="text-[10px] text-on-surface-variant/70">Rec: 800x800 (1:1)</span>
                </div>
                {editingCategory?.desktopImageUrl && (
                  <img src={getImageUrl(editingCategory.desktopImageUrl)} alt="" className="w-24 h-32 object-cover mx-auto mb-2 rounded" />
                )}
                <input 
                  type="file" 
                  accept="image/*" 
                  ref={desktopInputRef}
                  className="block w-full text-xs text-on-surface-variant file:mr-4 file:py-1.5 file:px-3 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
                />
              </div>

              <div className="bg-surface-container-lowest border border-outline-variant rounded p-4 text-center">
                <div className="flex flex-col items-center mb-2">
                  <p className="font-label-sm">Mobile Image (Optional)</p>
                  <span className="text-[10px] text-on-surface-variant/70">Rec: 800x800 (1:1)</span>
                </div>
                {editingCategory?.mobileImageUrl && (
                  <img src={getImageUrl(editingCategory.mobileImageUrl)} alt="" className="w-24 h-32 object-cover mb-2 rounded mx-auto" />
                )}
                <input 
                  type="file" 
                  accept="image/*" 
                  ref={mobileInputRef}
                  className="block w-full text-xs text-on-surface-variant file:mr-4 file:py-1.5 file:px-3 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
                />
              </div>
            </div>
            <p className="text-xs text-on-surface-variant">Recommended: WebP format. Selecting a new file will overwrite the existing image.</p>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-outline-variant mt-6">
            <Button variant="outline" onClick={closeModal} disabled={isSaving}>Cancel</Button>
            <Button variant="primary" onClick={handleSave} disabled={isSaving}>
              {isSaving ? 'Saving...' : 'Save Category'}
            </Button>
          </div>
        </div>
      </Modal>

    </div>
  );
};
