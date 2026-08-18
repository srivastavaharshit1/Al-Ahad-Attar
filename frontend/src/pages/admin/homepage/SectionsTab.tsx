import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { homepageService } from '../../../services/homepageService';
import type { HomepageSectionResponse } from '../../../types/homepage';
import { Modal } from '../../../components/ui/Modal';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Loader } from '../../../components/ui/Loader';

export const SectionsTab: React.FC = () => {
  const [sections, setSections] = useState<HomepageSectionResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Edit State
  const [editingSection, setEditingSection] = useState<HomepageSectionResponse | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editSubtitle, setEditSubtitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editMaxItems, setEditMaxItems] = useState(0);
  const [editImageFile, setEditImageFile] = useState<File | null>(null);
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    loadSections();
  }, []);

  const loadSections = async () => {
    setIsLoading(true);
    try {
      const data = await homepageService.getAllSections();
      setSections(data.sort((a, b) => a.displayOrder - b.displayOrder));
    } catch (error) {
      toast.error('Failed to load sections');
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggle = async (section: HomepageSectionResponse) => {
    try {
      await homepageService.updateSection(section.sectionKey, {
        title: section.title,
        subtitle: section.subtitle,
        description: section.description,
        visible: !section.visible,
        maxItems: section.maxItems
      });
      setSections(sections.map(s => s.id === section.id ? { ...s, visible: !s.visible } : s));
      toast.success(`${section.title} ${!section.visible ? 'enabled' : 'disabled'}`);
    } catch (error) {
      toast.error('Failed to update section visibility');
    }
  };

  const handleMoveUp = async (index: number) => {
    if (index === 0) return;
    const current = sections[index];
    const previous = sections[index - 1];
    try {
      await homepageService.reorderSections([
        { id: current.id, displayOrder: previous.displayOrder },
        { id: previous.id, displayOrder: current.displayOrder }
      ]);
      await loadSections();
    } catch (error) {
      toast.error('Failed to reorder sections');
    }
  };

  const handleMoveDown = async (index: number) => {
    if (index === sections.length - 1) return;
    const current = sections[index];
    const next = sections[index + 1];
    try {
      await homepageService.reorderSections([
        { id: current.id, displayOrder: next.displayOrder },
        { id: next.id, displayOrder: current.displayOrder }
      ]);
      await loadSections();
    } catch (error) {
      toast.error('Failed to reorder sections');
    }
  };

  const openEditModal = (section: HomepageSectionResponse) => {
    setEditingSection(section);
    setEditTitle(section.title || '');
    setEditSubtitle(section.subtitle || '');
    setEditDescription(section.description || '');
    setEditMaxItems(section.maxItems || 0);
    setEditImageFile(null);
    setPreviewImageUrl(section.imageUrl || null);
  };

  const closeEditModal = () => {
    setEditingSection(null);
  };

  const handleSave = async () => {
    if (!editingSection) return;
    if (!editTitle.trim()) {
      toast.error("Title is required");
      return;
    }
    
    setIsSaving(true);
    try {
      await homepageService.updateSection(editingSection.sectionKey, {
        title: editTitle.trim(),
        subtitle: editSubtitle.trim(),
        description: editDescription.trim(),
        visible: editingSection.visible,
        maxItems: editMaxItems > 0 ? editMaxItems : null
      });

      if (editImageFile) {
        await homepageService.uploadSectionImage(editingSection.sectionKey, editImageFile);
      }

      toast.success('Section updated successfully');
      closeEditModal();
      loadSections();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to update section');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) return <Loader />;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-6">
        <p className="font-body-sm text-on-surface-variant">Enable or disable sections on the homepage. Edit titles and subtitles.</p>
      </div>
      
      {sections.map((section, idx) => (
        <div key={section.id} className="card flex items-center justify-between p-4">
          <div className="flex items-center gap-4">
            <div className="flex flex-col gap-1">
              <button
                onClick={() => handleMoveUp(idx)}
                disabled={idx === 0}
                className={`p-1 rounded bg-surface-container text-on-surface-variant transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2 ${idx === 0 ? 'opacity-30 cursor-not-allowed' : 'hover:bg-surface-container-high hover:text-accent'}`}
              >
                <span className="material-symbols-outlined text-[16px]">arrow_upward</span>
              </button>
              <button
                onClick={() => handleMoveDown(idx)}
                disabled={idx === sections.length - 1}
                className={`p-1 rounded bg-surface-container text-on-surface-variant transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2 ${idx === sections.length - 1 ? 'opacity-30 cursor-not-allowed' : 'hover:bg-surface-container-high hover:text-accent'}`}
              >
                <span className="material-symbols-outlined text-[16px]">arrow_downward</span>
              </button>
            </div>
            <div>
              <h3 className="font-label-lg text-on-surface capitalize flex items-center gap-2">
                {section.title}
                {!section.visible && <span className="badge badge-neutral">Hidden</span>}
              </h3>
              <p className="font-body-sm text-on-surface-variant">Key: {section.sectionKey} {section.maxItems ? `• Max Items: ${section.maxItems}` : ''}</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={() => openEditModal(section)}
              className="p-2 text-on-surface-variant hover:text-accent transition-colors bg-surface-container-lowest border border-outline rounded flex items-center justify-center focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2"
              title="Edit Section"
            >
              <span className="material-symbols-outlined text-[20px]">edit</span>
            </button>

            <button
              onClick={() => handleToggle(section)}
              className={`w-12 h-6 rounded-full transition-colors relative shadow-inner focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2 ${section.visible ? 'bg-primary' : 'bg-surface-container-high border border-outline'}`}
              title={section.visible ? 'Visible on homepage' : 'Hidden from homepage'}
            >
              <span className={`absolute top-1 left-1 bg-surface-container-lowest w-4 h-4 rounded-full transition-transform shadow ${section.visible ? 'translate-x-6' : ''}`}></span>
            </button>
          </div>
        </div>
      ))}

      <Modal isOpen={editingSection !== null} onClose={closeEditModal} title="Edit Section" maxWidth="md">
        {editingSection && (
          <div className="space-y-4">
            <Input 
              label="Section Title" 
              value={editTitle} 
              onChange={(e: any) => setEditTitle(e.target.value)} 
              placeholder="e.g. Featured Products"
              required
            />
            <Input 
              label="Subtitle (Optional)" 
              value={editSubtitle} 
              onChange={(e: any) => setEditSubtitle(e.target.value)} 
              placeholder="e.g. Discover our best sellers"
            />
            
            {/* Some sections don't need description, but it's available */}
            <div>
              <label className="field-label">Description (Optional)</label>
              <textarea
                className="field-input min-h-[100px]"
                value={editDescription}
                onChange={(e: any) => setEditDescription(e.target.value)}
              />
            </div>

            <div>
              <div className="flex flex-col items-start mb-2">
                <label className="field-label mb-0">Section Image (Optional)</label>
                <span className="text-[10px] text-on-surface-variant/70">Recommended: 1080x1080 (1:1) or 1080x1350 (4:5)</span>
              </div>
              <div className="flex items-center gap-4 mt-2">
                {previewImageUrl && (
                  <img src={previewImageUrl} alt="Preview" className="w-24 h-24 object-cover rounded border border-outline-variant" />
                )}
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      setEditImageFile(file);
                      setPreviewImageUrl(URL.createObjectURL(file));
                    }
                  }}
                  className="text-sm file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-surface-container file:text-primary hover:file:bg-surface-container-high cursor-pointer"
                />
              </div>
            </div>

            {/* Max Items is useful for Categories / Featured Products */}
            {(editingSection.sectionKey === 'categories' || editingSection.sectionKey === 'featured_products' || editingSection.sectionKey === 'offers') && (
              <Input 
                label="Maximum Items to Display" 
                type="number"
                value={editMaxItems.toString()} 
                onChange={(e: any) => setEditMaxItems(parseInt(e.target.value) || 0)} 
                placeholder="e.g. 4"
                min={1}
                max={20}
              />
            )}

            <div className="flex justify-end gap-3 pt-4 border-t border-outline-variant mt-6">
              <Button variant="outline" onClick={closeEditModal} disabled={isSaving}>Cancel</Button>
              <Button variant="primary" onClick={handleSave} disabled={isSaving}>
                {isSaving ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
