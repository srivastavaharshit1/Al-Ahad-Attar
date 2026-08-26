import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { getImageUrl } from '../../utils/getImageUrl';
import { categoryService } from '../../services/categoryService';
import type { Category } from '../../types';
import { Pagination } from '../../components/ui/Pagination';
import { Loader } from '../../components/ui/Loader';
import { ConfirmationDialog } from '../../components/ui/ConfirmationDialog';
import toast from 'react-hot-toast';

export const Categories: React.FC = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentCategory, setCurrentCategory] = useState<Partial<Category>>({});
  
  const desktopInputRef = useRef<HTMLInputElement>(null);
  const mobileInputRef = useRef<HTMLInputElement>(null);
  const [isSaving, setIsSaving] = useState(false);
  
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [searchParams, setSearchParams] = useSearchParams();

  const currentPage = parseInt(searchParams.get('page') || '0', 10);

  useEffect(() => {
    fetchCategories();
  }, [currentPage]);

  const fetchCategories = async () => {
    try {
      setIsLoading(true);
      const response = await categoryService.getCategories({ page: currentPage, size: 10 });
      setCategories(response.content || []);
      setTotalPages(response.totalPages || 0);
      setTotalElements(response.totalElements || 0);
    } catch (error) {
      console.error("Failed to load categories", error);
      toast.error('Failed to load categories');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePageChange = (page: number) => {
    setSearchParams({ page: page.toString() });
  };

  const handleDelete = (id: number) => {
    setDeleteConfirmId(id);
  };

  const confirmDelete = async () => {
    if (!deleteConfirmId) return;
    try {
      setIsDeleting(true);
      await categoryService.deleteCategory(deleteConfirmId);
      setDeleteConfirmId(null);
      fetchCategories();
    } catch (error) {
      console.error("Failed to delete category", error);
      toast.error("Failed to delete category. It might be associated with products.");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSave = async () => {
    // The modal isn't a <form>, so the `required` attributes on its inputs are never
    // enforced by the browser (no submit event to trigger constraint validation).
    // Validate explicitly here to match the backend's @NotBlank constraints
    // (CategoryRequest.name / .description) instead of letting a blank submission
    // reach the API and fail with a raw 400.
    if (!currentCategory.name?.trim()) {
      toast.error('Category name is required.');
      return;
    }
    if (!currentCategory.description?.trim()) {
      toast.error('Category description is required.');
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

    try {
      setIsSaving(true);
      const payload = {
        name: currentCategory.name,
        description: currentCategory.description,
        type: (currentCategory as any).type,
        active: currentCategory.active,
        image: (currentCategory as any).image || 'placeholder',
        homepageTitle: currentCategory.homepageTitle,
        homepageSubtitle: currentCategory.homepageSubtitle,
        showOnHomepage: currentCategory.showOnHomepage,
        homepageDisplayOrder: currentCategory.homepageDisplayOrder
      };

      let savedCategory;
      if (currentCategory.id) {
        savedCategory = (await categoryService.updateCategory(currentCategory.id, payload as any)).data;
      } else {
        savedCategory = (await categoryService.createCategory(payload as any)).data;
      }

      // Handle file uploads
      const desktopFile = desktopInputRef.current?.files?.[0];
      const mobileFile = mobileInputRef.current?.files?.[0];

      if (desktopFile) {
        await categoryService.uploadDesktopImage(savedCategory.id, desktopFile);
      }
      if (mobileFile) {
        await categoryService.uploadMobileImage(savedCategory.id, mobileFile);
      }

      setIsModalOpen(false);
      fetchCategories();
    } catch (error: any) {
      console.error("Failed to save category", error);
      toast.error(error.response?.data?.message || 'Failed to save category');
    } finally {
      setIsSaving(false);
    }
  };

  const openCreateModal = () => {
    setCurrentCategory({
      type: 'ATTARS',
      description: '',
      active: true
    });
    setIsModalOpen(true);
  };

  const openEditModal = (category: Category) => {
    setCurrentCategory({ ...category });
    setIsModalOpen(true);
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const name = e.target.value;
    setCurrentCategory(prev => ({
      ...prev,
      name
    }));
  };

  return (
    <>
      <div className="flex justify-between items-end mb-12">
        <div>
          <h1 className="font-headline-lg text-headline-lg text-on-surface mb-2">Categories Management</h1>
          <p className="font-body-md text-body-md text-on-surface-variant">Create and manage product categories.</p>
        </div>
        <button
          onClick={openCreateModal}
          className="btn btn-primary px-6 py-3 rounded-lg">
          <span className="material-symbols-outlined text-[20px]">add</span>
          Create Category
        </button>
      </div>

      <div className="table-shell">
        <div className="p-6 border-b border-outline-variant flex flex-wrap gap-4 items-center justify-between bg-surface-bright">
          <div className="text-on-surface-variant font-label-sm text-label-sm uppercase tracking-wider">
            Showing {categories.length} of {totalElements} categories
          </div>
        </div>

        <div className="overflow-x-auto">
          {isLoading ? (
            <Loader />
          ) : categories.length === 0 ? (
            <div className="p-12 text-center text-on-surface-variant">No categories found. Create your first category!</div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Type</th>
                  <th>Status</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {categories.map(category => (
                  <tr key={category.id} className="group">
                    <td data-label="Name" className="font-headline-md text-headline-md text-on-surface text-[18px] leading-tight">
                      {category.name}
                    </td>
                    <td data-label="Type" className="font-label-sm text-label-sm text-on-surface-variant uppercase">
                      {(category as any).type || 'ATTARS'}
                    </td>
                    <td data-label="Status">
                      <span className={`badge ${category.active ? 'badge-success' : 'badge-neutral'}`}>
                        <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
                        {category.active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td data-label="Actions" className="text-right">
                      <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity">
                        <button onClick={() => openEditModal(category)} className="p-2 rounded-md text-on-surface-variant hover:text-primary hover:bg-surface-container-low focus-visible:opacity-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2 transition-colors" title="Edit">
                          <span className="material-symbols-outlined text-[20px]">edit</span>
                        </button>
                        <button onClick={() => handleDelete(category.id!)} className="p-2 rounded-md text-on-surface-variant hover:text-error hover:bg-surface-container-low focus-visible:opacity-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2 transition-colors" title="Delete">
                          <span className="material-symbols-outlined text-[20px]">delete</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        
        {totalPages > 1 && (
          <div className="p-6 border-t border-outline-variant flex justify-center bg-surface-bright">
            <Pagination 
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={handlePageChange}
            />
          </div>
        )}
      </div>
      
      {isModalOpen && (
        <div className="modal-overlay fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="modal-panel max-w-5xl w-full p-8 relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-6 right-6 p-1.5 rounded-md text-on-surface-variant hover:text-on-surface hover:bg-surface-container-low focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2 transition-colors">
              <span className="material-symbols-outlined text-2xl">close</span>
            </button>
            <h2 className="font-headline-lg mb-6">{currentCategory.id ? 'Edit Category' : 'Create New Category'}</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
              {/* Left Column: General Info */}
              <div className="space-y-6">
                <h3 className="font-headline-md text-primary border-b border-outline-variant pb-2">General Info</h3>
                
                <div>
                  <label className="field-label">Category Name <span className="text-error">*</span></label>
                  <input type="text" required className="field-input" value={currentCategory.name || ''} onChange={handleNameChange} placeholder="e.g. Premium Attars" />
                </div>

                <div>
                  <label className="field-label">Description</label>
                  <textarea className="field-input min-h-[100px]" value={currentCategory.description || ''} onChange={e => setCurrentCategory({...currentCategory, description: e.target.value})} placeholder="Describe the category..."></textarea>
                </div>

                <div>
                  <label className="field-label">Category Type</label>
                  <select className="field-input cursor-pointer" value={(currentCategory as any).type || 'ATTARS'} onChange={e => setCurrentCategory({...currentCategory, type: e.target.value})}>
                    <option value="ATTARS">Attars</option>
                    <option value="BAKHOOR">Bakhoor</option>
                    <option value="PERFUMES">Perfumes</option>
                  </select>
                </div>
                
                <div className="flex items-center gap-3 mt-2">
                  <input type="checkbox" id="activeToggle" className="w-5 h-5 rounded accent-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2" checked={currentCategory.active !== false} onChange={e => setCurrentCategory({...currentCategory, active: e.target.checked})} />
                  <label htmlFor="activeToggle" className="font-body-lg cursor-pointer select-none">Category is Active</label>
                </div>
              </div>

              {/* Right Column: Homepage Display */}
              <div className="space-y-6">
                <h3 className="font-headline-md text-primary border-b border-outline-variant pb-2">Homepage Display</h3>

                <div className="flex items-center gap-3">
                  <input type="checkbox" id="showOnHomepageToggle" className="w-5 h-5 rounded accent-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2" checked={currentCategory.showOnHomepage === true} onChange={e => setCurrentCategory({...currentCategory, showOnHomepage: e.target.checked})} />
                  <label htmlFor="showOnHomepageToggle" className="font-body-lg cursor-pointer select-none">Show on Homepage</label>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="field-label">Display Order</label>
                    <input type="number" className="field-input" value={currentCategory.homepageDisplayOrder || 0} onChange={e => setCurrentCategory({...currentCategory, homepageDisplayOrder: parseInt(e.target.value) || 0})} />
                  </div>
                </div>

                <div>
                  <label className="field-label">Homepage Title (Optional)</label>
                  <input type="text" className="field-input" value={currentCategory.homepageTitle || ''} onChange={e => setCurrentCategory({...currentCategory, homepageTitle: e.target.value})} placeholder="Leave blank to use category name" />
                </div>

                <div>
                  <label className="field-label">Homepage Subtitle (Optional)</label>
                  <input type="text" className="field-input" value={currentCategory.homepageSubtitle || ''} onChange={e => setCurrentCategory({...currentCategory, homepageSubtitle: e.target.value})} placeholder="e.g. Discover authentic blends" />
                </div>

                <div className="bg-surface-container-low p-4 rounded-lg border border-outline-variant">
                  <div className="flex flex-col mb-2">
                    <label className="field-label mb-0">Desktop Image</label>
                    <span className="text-[10px] text-accent/90 mt-1 font-medium">Recommended: 800x1000 (4:5 ratio for Portrait)</span>
                  </div>
                  {currentCategory.desktopImageUrl && (
                    <img src={getImageUrl(currentCategory.desktopImageUrl)} alt="" className="w-full h-24 object-cover mb-2 rounded" />
                  )}
                  <input type="file" accept="image/*" ref={desktopInputRef} className="block w-full text-xs text-on-surface-variant file:mr-4 file:py-1 file:px-3 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2" />
                </div>

                <div className="bg-surface-container-low p-4 rounded-lg border border-outline-variant">
                  <div className="flex flex-col mb-2">
                    <label className="field-label mb-0">Mobile Image (Optional)</label>
                    <span className="text-[10px] text-accent/90 mt-1 font-medium">Recommended: 800x1000 (4:5 ratio for Portrait)</span>
                  </div>
                  {currentCategory.mobileImageUrl && (
                    <img src={getImageUrl(currentCategory.mobileImageUrl)} alt="" className="w-24 h-32 object-cover mb-2 rounded" />
                  )}
                  <input type="file" accept="image/*" ref={mobileInputRef} className="block w-full text-xs text-on-surface-variant file:mr-4 file:py-1 file:px-3 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2" />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-4 border-t border-outline-variant pt-6">
              <button onClick={() => setIsModalOpen(false)} disabled={isSaving} className="btn btn-outline px-6 py-2.5 rounded-lg">Cancel</button>
              <button onClick={handleSave} disabled={isSaving} className="btn btn-primary px-8 py-2.5 rounded-lg">
                {isSaving ? 'Saving...' : 'Save Category'}
              </button>
            </div>
          </div>
        </div>
      )}
      
      <ConfirmationDialog
        isOpen={deleteConfirmId !== null}
        onClose={() => !isDeleting && setDeleteConfirmId(null)}
        onConfirm={confirmDelete}
        title="Delete Category"
        description="Are you sure you want to delete this category?"
        entityName={categories.find(c => c.id === deleteConfirmId)?.name}
        warningMessage="Products will become uncategorized or follow the configured fallback. This action cannot be undone."
        confirmText="Delete Category"
        isLoading={isDeleting}
        actionType="DELETE"
      />

      <div className="h-section-gap"></div>
    </>
  );
};
