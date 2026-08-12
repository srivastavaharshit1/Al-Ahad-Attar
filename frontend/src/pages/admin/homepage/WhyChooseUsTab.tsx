import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { homepageService } from '../../../services/homepageService';
import type { WhyChooseUsItemResponse } from '../../../types/homepage';
import { Modal } from '../../../components/ui/Modal';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Loader } from '../../../components/ui/Loader';
import { ConfirmationDialog } from '../../../components/ui/ConfirmationDialog';

export const WhyChooseUsTab: React.FC = () => {
  const [items, setItems] = useState<WhyChooseUsItemResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<WhyChooseUsItemResponse | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  
  // Form State
  const [icon, setIcon] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [active, setActive] = useState(true);
  
  // Delete State
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    loadItems();
  }, []);

  const loadItems = async () => {
    setIsLoading(true);
    try {
      const data = await homepageService.getAllWhyChooseUsItems();
      setItems(data.sort((a, b) => a.displayOrder - b.displayOrder));
    } catch (error) {
      toast.error('Failed to load Why Choose Us items');
    } finally {
      setIsLoading(false);
    }
  };

  const openCreateModal = () => {
    setEditingItem(null);
    setIcon('local_shipping'); // Default icon suggestion
    setTitle('');
    setDescription('');
    setActive(true);
    setIsModalOpen(true);
  };

  const openEditModal = (item: WhyChooseUsItemResponse) => {
    setEditingItem(item);
    setIcon(item.icon);
    setTitle(item.title);
    setDescription(item.description);
    setActive(item.active);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingItem(null);
  };

  const handleSave = async () => {
    if (!title.trim() || !description.trim() || !icon.trim()) {
      toast.error("Icon, Title, and Description are required");
      return;
    }
    
    setIsSaving(true);
    const request = {
      icon: icon.trim(),
      title: title.trim(),
      description: description.trim(),
      active
    };

    try {
      if (editingItem) {
        await homepageService.updateWhyChooseUsItem(editingItem.id, request);
        toast.success('Item updated');
      } else {
        await homepageService.createWhyChooseUsItem(request);
        toast.success('Item created');
      }
      
      closeModal();
      loadItems();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to save item');
    } finally {
      setIsSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    setIsDeleting(true);
    try {
      await homepageService.deleteWhyChooseUsItem(deleteId);
      toast.success('Item deleted');
      loadItems();
    } catch (error) {
      toast.error('Failed to delete item');
    } finally {
      setIsDeleting(false);
      setDeleteId(null);
    }
  };

  const handleMoveUp = async (index: number) => {
    if (index === 0) return;
    const current = items[index];
    const previous = items[index - 1];
    try {
      await homepageService.reorderWhyChooseUsItems([
        { id: current.id, displayOrder: previous.displayOrder },
        { id: previous.id, displayOrder: current.displayOrder }
      ]);
      await loadItems();
    } catch (error) {
      toast.error('Failed to reorder items');
    }
  };

  const handleMoveDown = async (index: number) => {
    if (index === items.length - 1) return;
    const current = items[index];
    const next = items[index + 1];
    try {
      await homepageService.reorderWhyChooseUsItems([
        { id: current.id, displayOrder: next.displayOrder },
        { id: next.id, displayOrder: current.displayOrder }
      ]);
      await loadItems();
    } catch (error) {
      toast.error('Failed to reorder items');
    }
  };

  const handleToggleActive = async (item: WhyChooseUsItemResponse) => {
    try {
      await homepageService.updateWhyChooseUsItem(item.id, {
        icon: item.icon,
        title: item.title,
        description: item.description,
        active: !item.active
      });
      setItems(items.map(i => i.id === item.id ? { ...i, active: !i.active } : i));
      toast.success(`${item.title} ${!item.active ? 'enabled' : 'disabled'}`);
    } catch (error) {
      toast.error('Failed to update status');
    }
  };

  if (isLoading) return <Loader />;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-6">
        <p className="font-body-sm text-on-surface-variant">Manage features highlighted in the "Why Choose Us" section.</p>
        <Button onClick={openCreateModal} className="flex items-center gap-2">
          <span className="material-symbols-outlined text-[18px]">add</span>
          Add Feature
        </Button>
      </div>
      
      {items.length === 0 ? (
        <div className="p-12 text-center text-on-surface-variant bg-surface-container-low rounded-lg border border-dashed border-outline-variant">
          No features found. Click 'Add Feature' to create one.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((item, idx) => (
            <div key={item.id} className="card flex flex-col p-4 relative text-center">

              <div className="flex justify-between items-start mb-2 w-full">
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
                    disabled={idx === items.length - 1}
                    className={`p-1 rounded bg-surface-container text-on-surface-variant transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2 ${idx === items.length - 1 ? 'opacity-30 cursor-not-allowed' : 'hover:bg-surface-container-high hover:text-primary'}`}
                  >
                    <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleToggleActive(item)}
                    className={`w-10 h-5 rounded-full transition-colors relative shadow-inner focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2 ${item.active ? 'bg-primary' : 'bg-surface-container-high border border-outline'}`}
                    title={item.active ? 'Disable' : 'Enable'}
                  >
                    <span className={`absolute top-0.5 left-0.5 bg-white w-4 h-4 rounded-full transition-transform shadow ${item.active ? 'translate-x-5' : ''}`}></span>
                  </button>
                  <button
                    onClick={() => openEditModal(item)}
                    className="p-1 text-on-surface-variant hover:text-primary hover:bg-primary/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2 transition-colors bg-surface-container-lowest border border-outline rounded flex items-center justify-center"
                    title="Edit"
                  >
                    <span className="material-symbols-outlined text-[16px]">edit</span>
                  </button>
                  <button
                    onClick={() => setDeleteId(item.id)}
                    className="p-1 text-error hover:bg-error/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2 transition-colors bg-surface-container-lowest border border-outline rounded flex items-center justify-center"
                    title="Delete"
                  >
                    <span className="material-symbols-outlined text-[16px]">delete</span>
                  </button>
                </div>
              </div>

              <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto mb-3 border border-primary/20">
                <span className="material-symbols-outlined text-[24px]">{item.icon}</span>
              </div>
              
              <h4 className="font-label-lg text-on-surface mb-2">{item.title}</h4>
              <p className="font-body-sm text-on-surface-variant">{item.description}</p>
            </div>
          ))}
        </div>
      )}

      <Modal isOpen={isModalOpen} onClose={closeModal} title={editingItem ? 'Edit Feature' : 'Add Feature'} maxWidth="md">
        <div className="space-y-4">
          <Input 
            label="Title *" 
            value={title} 
            onChange={(e: any) => setTitle(e.target.value)} 
            placeholder="e.g. Free Shipping"
            required
          />
          
          <div>
            <label className="field-label">Material Icon Name *</label>
            <div className="flex gap-2">
              <div className="w-10 h-10 shrink-0 bg-surface-container rounded border border-outline flex items-center justify-center text-primary">
                <span className="material-symbols-outlined">{icon || 'help'}</span>
              </div>
              <Input
                value={icon}
                onChange={(e: any) => setIcon(e.target.value)}
                placeholder="e.g. local_shipping"
                required
                className="flex-grow"
              />
            </div>
            <p className="text-xs text-on-surface-variant mt-1">Use names from <a href="https://fonts.google.com/icons" target="_blank" rel="noreferrer" className="link-underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2 rounded">Google Material Symbols</a></p>
          </div>

          <div>
            <label className="field-label">Description *</label>
            <textarea
              className="field-input min-h-[80px]"
              value={description}
              onChange={(e: any) => setDescription(e.target.value)}
              placeholder="e.g. On all orders over ₹1000"
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

          <div className="flex justify-end gap-3 pt-4 border-t border-outline-variant mt-6">
            <Button variant="outline" onClick={closeModal} disabled={isSaving}>Cancel</Button>
            <Button variant="primary" onClick={handleSave} disabled={isSaving}>
              {isSaving ? 'Saving...' : 'Save Feature'}
            </Button>
          </div>
        </div>
      </Modal>

      <ConfirmationDialog
        isOpen={deleteId !== null}
        onClose={() => !isDeleting && setDeleteId(null)}
        onConfirm={confirmDelete}
        title="Delete Feature"
        description="Are you sure you want to delete this feature? This action cannot be undone."
        confirmText="Delete Feature"
        isLoading={isDeleting}
        actionType="DELETE"
      />
    </div>
  );
};
