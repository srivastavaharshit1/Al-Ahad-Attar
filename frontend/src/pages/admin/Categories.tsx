import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { getImageUrl } from '../../utils/getImageUrl';
import { categoryService } from '../../services/categoryService';
import type { Category } from '../../types';
import { Pagination } from '../../components/ui/Pagination';
import { Loader } from '../../components/ui/Loader';
import { ConfirmationDialog } from '../../components/ui/ConfirmationDialog';

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
      alert("Failed to delete category. It might be associated with products.");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSave = async () => {
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
      alert(error.response?.data?.message || 'Failed to save category');
    } finally {
      setIsSaving(false);
    }
  };

  const openCreateModal = () => {
    setCurrentCategory({
      type: 'ATTAR',
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
          className="bg-primary text-on-primary font-label-md text-label-md px-6 py-3 hover:bg-surface-tint transition-colors shadow-[0_4px_14px_rgba(120,86,0,0.2)] flex items-center gap-2 rounded-DEFAULT">
          <span className="material-symbols-outlined text-[20px]">add</span>
          Create Category
        </button>
      </div>

      <div className="bg-surface-container-lowest border border-outline-variant shadow-[0_10px_30px_rgba(31,41,55,0.04)] rounded-xl overflow-hidden">
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
                <tr className="bg-surface">
                  <th className="py-4 px-6 font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider border-b border-outline-variant font-semibold">Name</th>
                  <th className="py-4 px-6 font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider border-b border-outline-variant font-semibold">Type</th>
                  <th className="py-4 px-6 font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider border-b border-outline-variant font-semibold">Status</th>
                  <th className="py-4 px-6 font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider border-b border-outline-variant font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant">
                {categories.map(category => (
                  <tr key={category.id} className="hover:bg-surface-container-low transition-colors group">
                    <td className="py-4 px-6 font-headline-md text-headline-md text-on-surface text-[18px] leading-tight mb-1">
                      {category.name}
                    </td>
                    <td className="py-4 px-6 font-label-sm text-label-sm text-on-surface-variant uppercase">
                      {(category as any).type || 'ATTAR'}
                    </td>
                    <td className="py-4 px-6">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border font-label-sm text-label-sm uppercase tracking-wider transition-colors hover:brightness-95 ${category.active ? 'bg-[#f0fdf4] text-[#166534] border-[#bbf7d0]' : 'bg-surface-variant text-on-surface border-outline'}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${category.active ? 'bg-[#166534]' : 'bg-on-surface-variant'}`}></span>
                        {category.active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-right">
                      <div className="flex justify-end gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => openEditModal(category)} className="p-2 text-on-surface-variant hover:text-primary transition-colors" title="Edit">
                          <span className="material-symbols-outlined text-[20px]">edit</span>
                        </button>
                        <button onClick={() => handleDelete(category.id!)} className="p-2 text-on-surface-variant hover:text-error transition-colors" title="Delete">
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
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest rounded-xl max-w-5xl w-full p-8 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <button 
              onClick={() => setIsModalOpen(false)}
              className="absolute top-6 right-6 text-on-surface-variant hover:text-on-surface transition-colors">
              <span className="material-symbols-outlined text-2xl">close</span>
            </button>
            <h2 className="font-headline-lg mb-6">{currentCategory.id ? 'Edit Category' : 'Create New Category'}</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
              {/* Left Column: General Info */}
              <div className="space-y-6">
                <h3 className="font-headline-md text-primary border-b border-outline-variant pb-2">General Info</h3>
                
                <div>
                  <label className="block text-label-md font-label-md text-on-surface-variant uppercase tracking-wider mb-2">Category Name</label>
                  <input type="text" className="w-full bg-surface border border-outline-variant rounded-md px-4 py-2" value={currentCategory.name || ''} onChange={handleNameChange} placeholder="e.g. Premium Attars" />
                </div>
                
                <div>
                  <label className="block text-label-md font-label-md text-on-surface-variant uppercase tracking-wider mb-2">Description</label>
                  <textarea className="input-field min-h-[100px] w-full bg-surface border border-outline-variant rounded-md px-4 py-2" value={currentCategory.description || ''} onChange={e => setCurrentCategory({...currentCategory, description: e.target.value})} placeholder="Describe the category..."></textarea>
                </div>

                <div>
                  <label className="block text-label-md font-label-md text-on-surface-variant uppercase tracking-wider mb-2">Category Type</label>
                  <select className="input-field w-full bg-surface border border-outline-variant rounded-md px-4 py-2" value={(currentCategory as any).type || 'ATTAR'} onChange={e => setCurrentCategory({...currentCategory, type: e.target.value})}>
                    <option value="ATTAR">Attar</option>
                    <option value="BAKHOOR">Bakhoor</option>
                    <option value="CAR_PERFUME">Car Perfume</option>
                    <option value="ACCESSORY">Accessory</option>
                  </select>
                </div>
                
                <div className="flex items-center gap-3 mt-2">
                  <input type="checkbox" id="activeToggle" className="w-5 h-5 accent-primary" checked={currentCategory.active !== false} onChange={e => setCurrentCategory({...currentCategory, active: e.target.checked})} />
                  <label htmlFor="activeToggle" className="font-body-lg cursor-pointer select-none">Category is Active</label>
                </div>
              </div>

              {/* Right Column: Homepage Display */}
              <div className="space-y-6">
                <h3 className="font-headline-md text-primary border-b border-outline-variant pb-2">Homepage Display</h3>
                
                <div className="flex items-center gap-3">
                  <input type="checkbox" id="showOnHomepageToggle" className="w-5 h-5 accent-primary" checked={currentCategory.showOnHomepage === true} onChange={e => setCurrentCategory({...currentCategory, showOnHomepage: e.target.checked})} />
                  <label htmlFor="showOnHomepageToggle" className="font-body-lg cursor-pointer select-none">Show on Homepage</label>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-label-md font-label-md text-on-surface-variant uppercase tracking-wider mb-2">Display Order</label>
                    <input type="number" className="w-full bg-surface border border-outline-variant rounded-md px-4 py-2" value={currentCategory.homepageDisplayOrder || 0} onChange={e => setCurrentCategory({...currentCategory, homepageDisplayOrder: parseInt(e.target.value) || 0})} />
                  </div>
                </div>

                <div>
                  <label className="block text-label-md font-label-md text-on-surface-variant uppercase tracking-wider mb-2">Homepage Title (Optional)</label>
                  <input type="text" className="w-full bg-surface border border-outline-variant rounded-md px-4 py-2" value={currentCategory.homepageTitle || ''} onChange={e => setCurrentCategory({...currentCategory, homepageTitle: e.target.value})} placeholder="Leave blank to use category name" />
                </div>

                <div>
                  <label className="block text-label-md font-label-md text-on-surface-variant uppercase tracking-wider mb-2">Homepage Subtitle (Optional)</label>
                  <input type="text" className="w-full bg-surface border border-outline-variant rounded-md px-4 py-2" value={currentCategory.homepageSubtitle || ''} onChange={e => setCurrentCategory({...currentCategory, homepageSubtitle: e.target.value})} placeholder="e.g. Discover authentic blends" />
                </div>

                <div className="bg-surface-container-low p-4 rounded border border-outline-variant">
                  <label className="block text-label-md font-label-md text-on-surface-variant uppercase tracking-wider mb-2">Desktop Image (16:9)</label>
                  {currentCategory.desktopImageUrl && (
                    <img src={getImageUrl(currentCategory.desktopImageUrl)} alt="" className="w-full h-24 object-cover mb-2 rounded" />
                  )}
                  <input type="file" accept="image/*" ref={desktopInputRef} className="block w-full text-xs text-on-surface-variant file:mr-4 file:py-1 file:px-3 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20" />
                </div>

                <div className="bg-surface-container-low p-4 rounded border border-outline-variant">
                  <label className="block text-label-md font-label-md text-on-surface-variant uppercase tracking-wider mb-2">Mobile Image (4:5)</label>
                  {currentCategory.mobileImageUrl && (
                    <img src={getImageUrl(currentCategory.mobileImageUrl)} alt="" className="w-24 h-32 object-cover mb-2 rounded" />
                  )}
                  <input type="file" accept="image/*" ref={mobileInputRef} className="block w-full text-xs text-on-surface-variant file:mr-4 file:py-1 file:px-3 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20" />
                </div>
              </div>
            </div>
            
            <div className="flex justify-end gap-4 border-t border-outline-variant pt-6">
              <button onClick={() => setIsModalOpen(false)} disabled={isSaving} className="px-6 py-2.5 font-label-lg text-on-surface-variant hover:bg-surface rounded transition-colors">Cancel</button>
              <button onClick={handleSave} disabled={isSaving} className="bg-primary text-on-primary px-8 py-2.5 rounded font-label-lg hover:bg-primary-container transition-colors disabled:opacity-70">
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
