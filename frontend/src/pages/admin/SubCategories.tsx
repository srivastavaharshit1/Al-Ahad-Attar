import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { subCategoryService, type SubCategory, type SubCategoryRequest } from '../../services/subCategoryService';
import { categoryService } from '../../services/categoryService';
import type { Category } from '../../types';
import { Loader } from '../../components/ui/Loader';
import { ConfirmationDialog } from '../../components/ui/ConfirmationDialog';
import toast from 'react-hot-toast';

export const SubCategories: React.FC = () => {
  const [subCategories, setSubCategories] = useState<SubCategory[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentSubCategory, setCurrentSubCategory] = useState<Partial<SubCategory>>({});
  const [isSaving, setIsSaving] = useState(false);
  
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    if (selectedCategory) {
      fetchSubCategories(selectedCategory);
    } else {
      setSubCategories([]);
    }
  }, [selectedCategory]);

  const fetchCategories = async () => {
    try {
      // load all categories (no pagination used here for simplicity in admin dropdown)
      const response = await categoryService.getCategories({ page: 0, size: 100 });
      setCategories(response.content || []);
      if (response.content && response.content.length > 0) {
        setSelectedCategory(response.content[0].id);
      } else {
        setIsLoading(false);
      }
    } catch (error) {
      console.error("Failed to load categories", error);
      toast.error('Failed to load categories');
      setIsLoading(false);
    }
  };

  const fetchSubCategories = async (categoryId: number) => {
    try {
      setIsLoading(true);
      const data = await subCategoryService.getSubCategoriesByCategory(categoryId, false);
      setSubCategories(data || []);
    } catch (error) {
      console.error("Failed to load subcategories", error);
      toast.error('Failed to load subcategories');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = (id: number) => {
    setDeleteConfirmId(id);
  };

  const confirmDelete = async () => {
    if (!deleteConfirmId || !selectedCategory) return;
    try {
      setIsDeleting(true);
      await subCategoryService.deleteSubCategory(selectedCategory, deleteConfirmId);
      setDeleteConfirmId(null);
      fetchSubCategories(selectedCategory);
    } catch (error: any) {
      console.error("Failed to delete subcategory", error);
      toast.error(error.response?.data?.message || "Failed to delete subcategory. It might be associated with products.");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSave = async () => {
    if (!currentSubCategory.name?.trim()) {
      toast.error('SubCategory name is required.');
      return;
    }
    if (!selectedCategory) {
      toast.error('Please select a category first.');
      return;
    }

    try {
      setIsSaving(true);
      const payload: SubCategoryRequest = {
        name: currentSubCategory.name,
        active: currentSubCategory.active ?? true
      };

      if (currentSubCategory.id) {
        await subCategoryService.updateSubCategory(selectedCategory, currentSubCategory.id, payload);
      } else {
        await subCategoryService.createSubCategory(selectedCategory, payload);
      }

      setIsModalOpen(false);
      fetchSubCategories(selectedCategory);
    } catch (error: any) {
      console.error("Failed to save subcategory", error);
      toast.error(error.response?.data?.message || 'Failed to save subcategory');
    } finally {
      setIsSaving(false);
    }
  };

  const openCreateModal = () => {
    setCurrentSubCategory({
      name: '',
      active: true
    });
    setIsModalOpen(true);
  };

  const openEditModal = (subCat: SubCategory) => {
    setCurrentSubCategory(subCat);
    setIsModalOpen(true);
  };

  if (isLoading && categories.length === 0) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-[1200px] mx-auto px-4 md:px-6 py-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-3xl font-bold font-display tracking-tight text-on-surface">Subcategories</h1>
        <button
          onClick={openCreateModal}
          disabled={!selectedCategory}
          className="btn btn-primary"
        >
          Add Subcategory
        </button>
      </div>

      <div className="bg-surface card p-6">
        <label className="block text-sm font-medium text-on-surface-variant mb-2">
          Select Category to manage its Subcategories:
        </label>
        <select
          className="field-input max-w-md"
          value={selectedCategory || ''}
          onChange={(e) => setSelectedCategory(Number(e.target.value))}
        >
          {categories.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>

      <div className="bg-surface rounded-2xl shadow-sm border border-outline-variant overflow-hidden">
        {isLoading ? (
          <div className="p-8 flex justify-center">
            <Loader size="md" />
          </div>
        ) : subCategories.length === 0 ? (
          <div className="p-12 text-center text-on-surface-variant bg-surface-container/30">
            <p className="text-lg mb-4">No subcategories found for this category.</p>
            <button onClick={openCreateModal} className="btn btn-secondary">
              Add your first subcategory
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Name</th>
                  <th>Status</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {subCategories.map((subCat) => (
                  <tr key={subCat.id} className="hover:bg-surface-container/50 transition-colors">
                    <td>#{subCat.id}</td>
                    <td className="font-medium text-on-surface">{subCat.name}</td>
                    <td>
                      <span className={`badge ${subCat.active ? 'badge-success' : 'badge-neutral'}`}>
                        {subCat.active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="text-right space-x-3">
                      <button
                        onClick={() => openEditModal(subCat)}
                        className="text-primary hover:text-accent font-medium transition-colors"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(subCat.id)}
                        className="text-error hover:text-error/80 font-medium transition-colors"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-surface rounded-2xl shadow-xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-outline-variant shrink-0 flex justify-between items-center bg-surface-container/30">
              <h2 className="text-xl font-bold font-display text-on-surface">
                {currentSubCategory.id ? 'Edit Subcategory' : 'Add Subcategory'}
              </h2>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="text-on-surface-variant hover:text-on-surface p-2 -mr-2 rounded-full hover:bg-surface-container transition-colors"
              >
                &times;
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto space-y-5">
              <div>
                <label className="field-label">Name <span className="text-error">*</span></label>
                <input
                  type="text"
                  value={currentSubCategory.name || ''}
                  onChange={(e) => setCurrentSubCategory({...currentSubCategory, name: e.target.value})}
                  className="field-input"
                  placeholder="e.g. Incense Sticks"
                />
              </div>

              <div>
                <label className="flex items-center space-x-3 cursor-pointer p-3 border border-outline-variant rounded-xl hover:bg-surface-container transition-colors">
                  <input
                    type="checkbox"
                    checked={currentSubCategory.active ?? true}
                    onChange={(e) => setCurrentSubCategory({...currentSubCategory, active: e.target.checked})}
                    className="w-5 h-5 rounded border-outline-variant text-primary focus:ring-primary/20 bg-surface"
                  />
                  <div>
                    <span className="block font-medium text-on-surface">Active</span>
                    <span className="block text-sm text-on-surface-variant">Subcategory will be visible on the store</span>
                  </div>
                </label>
              </div>
            </div>
            
            <div className="p-6 border-t border-outline-variant bg-surface-container/30 flex justify-end gap-3 shrink-0">
              <button
                onClick={() => setIsModalOpen(false)}
                className="btn btn-secondary"
                disabled={isSaving}
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="btn btn-primary"
              >
                {isSaving ? <Loader size="sm" color="white" /> : 'Save Subcategory'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      <ConfirmationDialog
        isOpen={deleteConfirmId !== null}
        title="Delete Subcategory"
        message="Are you sure you want to delete this subcategory? This action cannot be undone."
        confirmLabel="Delete Subcategory"
        confirmVariant="danger"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteConfirmId(null)}
        isLoading={isDeleting}
      />
    </div>
  );
};
