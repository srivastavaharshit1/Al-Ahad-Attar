import React, { useState, useEffect, useCallback } from 'react';
import { giftServiceService } from '../../services/giftServiceService';
import type { GiftServiceItem, GiftServiceRequest } from '../../services/giftServiceService';
import { formatPrice } from '../../utils/formatPrice';
import toast from 'react-hot-toast';
import { getImageUrl } from '../../utils/getImageUrl';
import { ConfirmationDialog } from '../../components/ui/ConfirmationDialog';

const EMPTY_FORM: GiftServiceRequest = {
  name: '',
  description: '',
  imageUrl: '',
  price: 0,
  active: true,
  sortOrder: 0,
};

export const GiftServices: React.FC = () => {
  const [services, setServices] = useState<GiftServiceItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const [showModal, setShowModal] = useState(false);
  const [editingService, setEditingService] = useState<GiftServiceItem | null>(null);
  const [form, setForm] = useState<GiftServiceRequest>(EMPTY_FORM);
  const [imageUploading, setImageUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);

  const fetchServices = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await giftServiceService.getAll({ page, size: 10, search, sortBy: 'sortOrder', sortDir: 'asc' });
      const data = res.data;
      setServices(data.content || []);
      setTotal(data.totalElements || 0);
      setTotalPages(data.totalPages || 0);
    } catch (err) {
      toast.error('Failed to load gift services');
    } finally {
      setIsLoading(false);
    }
  }, [page, search]);

  useEffect(() => { fetchServices(); }, [fetchServices]);

  const openCreate = () => {
    setEditingService(null);
    setForm(EMPTY_FORM);
    setShowModal(true);
  };

  const openEdit = (service: GiftServiceItem) => {
    setEditingService(service);
    setForm({
      name: service.name,
      description: service.description || '',
      imageUrl: service.imageUrl || '',
      price: service.price,
      active: service.active,
      sortOrder: service.sortOrder,
    });
    setShowModal(true);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Please select a valid image file');
      e.target.value = '';
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be smaller than 5MB');
      e.target.value = '';
      return;
    }
    try {
      setImageUploading(true);
      const res = await giftServiceService.uploadImage(file);
      const url = res.data;
      setForm(f => ({ ...f, imageUrl: url }));
      toast.success('Image uploaded');
    } catch {
      toast.error('Failed to upload image');
    } finally {
      setImageUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      if (editingService) {
        await giftServiceService.update(editingService.id, form);
        toast.success('Gift service updated');
      } else {
        await giftServiceService.create(form);
        toast.success('Gift service created');
      }
      setShowModal(false);
      fetchServices();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to save gift service');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggle = async (id: number) => {
    try {
      await giftServiceService.toggle(id);
      toast.success('Status updated');
      fetchServices();
    } catch {
      toast.error('Failed to update status');
    }
  };

  const handleDelete = async () => {
    if (deleteConfirm === null) return;
    try {
      setIsDeleting(true);
      await giftServiceService.delete(deleteConfirm);
      toast.success('Gift service deleted');
      setDeleteConfirm(null);
      fetchServices();
    } catch {
      toast.error('Failed to delete gift service');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(searchInput);
    setPage(0);
  };

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="font-display-sm text-display-sm text-on-surface">Gift Services</h1>
          <p className="text-on-surface-variant font-body-md mt-1">{total} service{total !== 1 ? 's' : ''} total</p>
        </div>
        <button
          onClick={openCreate}
          className="btn-primary px-6 py-3 rounded-lg flex items-center gap-2 font-label-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2"
        >
          <span className="material-symbols-outlined text-[20px]">add</span>
          New Gift Service
        </button>
      </div>

      {/* Search */}
      <form onSubmit={handleSearch} className="mb-6 flex gap-3">
        <input
          type="text"
          value={searchInput}
          onChange={e => setSearchInput(e.target.value)}
          placeholder="Search gift services..."
          className="flex-1 bg-surface-container border border-outline-variant rounded-lg px-4 py-2.5 text-on-surface font-body-md hover:border-accent/60 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/15 transition-colors"
        />
        <button type="submit" className="btn-primary px-5 py-2.5 rounded-lg font-label-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2">Search</button>
        {search && (
          <button type="button" onClick={() => { setSearch(''); setSearchInput(''); setPage(0); }} className="btn-outline px-4 py-2.5 rounded-lg font-label-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2">Clear</button>
        )}
      </form>

      {/* Table */}
      <div className="table-shell">
        {isLoading ? (
          <div className="p-12 text-center text-on-surface-variant">Loading gift services...</div>
        ) : services.length === 0 ? (
          <div className="p-16 text-center">
            <span className="material-symbols-outlined text-5xl text-on-surface-variant mb-4 block">redeem</span>
            <p className="font-headline-md text-on-surface mb-2">No gift services yet</p>
            <p className="text-on-surface-variant font-body-md mb-6">Create your first premium gift service option.</p>
            <button onClick={openCreate} className="btn-primary px-6 py-2.5 rounded-lg font-label-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2">Add Gift Service</button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  <th>Service</th>
                  <th>Price</th>
                  <th>Sort</th>
                  <th>Status</th>
                  <th>Created</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {services.map(service => (
                  <tr key={service.id}>
                    <td data-label="Service">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-lg bg-surface-container overflow-hidden flex-shrink-0">
                          {service.imageUrl ? (
                            <img src={getImageUrl(service.imageUrl)} alt={service.name} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <span className="material-symbols-outlined text-on-surface-variant">card_giftcard</span>
                            </div>
                          )}
                        </div>
                        <div>
                          <p className="font-label-lg text-on-surface">{service.name}</p>
                          {service.description && (
                            <p className="text-sm text-on-surface-variant mt-0.5 max-w-xs truncate">{service.description}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="font-body-md text-on-surface font-medium" data-label="Price">{formatPrice(service.price)}</td>
                    <td className="font-body-md text-on-surface-variant" data-label="Sort">{service.sortOrder}</td>
                    <td data-label="Status">
                      <button
                        onClick={() => handleToggle(service.id)}
                        className={`badge cursor-pointer transition-[filter] hover:brightness-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2 ${
                          service.active ? 'badge-success' : 'badge-neutral'
                        }`}
                        title="Click to toggle active/inactive"
                      >
                        <span className="material-symbols-outlined text-[14px]">{service.active ? 'check_circle' : 'cancel'}</span>
                        {service.active ? 'Active' : 'Inactive'}
                      </button>
                    </td>
                    <td className="text-sm text-on-surface-variant" data-label="Created">
                      {new Date(service.createdAt).toLocaleDateString()}
                    </td>
                    <td data-label="Actions">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => openEdit(service)} className="p-2 text-on-surface-variant hover:text-primary hover:bg-primary/10 rounded-lg transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2" title="Edit">
                          <span className="material-symbols-outlined text-[18px]">edit</span>
                        </button>
                        <button onClick={() => setDeleteConfirm(service.id)} className="p-2 text-on-surface-variant hover:text-error hover:bg-error/10 rounded-lg transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2" title="Delete">
                          <span className="material-symbols-outlined text-[18px]">delete</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-6">
          {Array.from({ length: totalPages }, (_, i) => (
            <button
              key={i}
              onClick={() => setPage(i)}
              className={`w-10 h-10 rounded-lg font-label-md text-sm transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2 ${
                page === i ? 'bg-primary text-on-primary' : 'bg-surface-container text-on-surface hover:bg-surface-container-high'
              }`}
            >{i + 1}</button>
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="modal-overlay fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="modal-panel w-full max-w-lg max-h-[90vh] overflow-y-auto border border-outline-variant/40">
            <div className="px-8 py-6 border-b border-outline-variant flex items-center justify-between sticky top-0 bg-surface">
              <h2 className="font-headline-md text-on-surface">
                {editingService ? 'Edit Gift Service' : 'New Gift Service'}
              </h2>
              <button onClick={() => setShowModal(false)} className="text-on-surface-variant hover:text-primary hover:bg-surface-container-high p-2 rounded-full transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2" aria-label="Close">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <form onSubmit={handleSubmit} className="px-8 py-6 space-y-5">
              {/* Image */}
              <div>
                <label className="field-label">Image</label>
                <div className="flex items-center gap-4">
                  <div className="w-20 h-20 rounded-xl bg-surface-container border border-outline-variant overflow-hidden flex items-center justify-center flex-shrink-0">
                    {form.imageUrl ? (
                      <img src={getImageUrl(form.imageUrl)} alt="Preview" className="w-full h-full object-cover" />
                    ) : (
                      <span className="material-symbols-outlined text-on-surface-variant text-[28px]">card_giftcard</span>
                    )}
                  </div>
                  <label className="cursor-pointer btn-outline px-4 py-2 rounded-lg text-sm font-label-md flex items-center gap-2 focus-within:outline focus-within:outline-2 focus-within:outline-accent focus-within:outline-offset-2">
                    {imageUploading ? (
                      <><span className="material-symbols-outlined text-[16px] animate-spin">refresh</span> Uploading...</>
                    ) : (
                      <><span className="material-symbols-outlined text-[16px]">upload</span> Upload Image</>
                    )}
                    <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                  </label>
                </div>
              </div>

              {/* Name */}
              <div>
                <label className="field-label">Name <span className="text-error">*</span></label>
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="e.g. Luxury Black Box"
                  className="field-input"
                />
              </div>

              {/* Description */}
              <div>
                <label className="field-label">Description</label>
                <textarea
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  rows={3}
                  placeholder="Elegant premium magnetic gift box..."
                  className="field-input resize-none"
                />
              </div>

              {/* Price + Sort Order */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="field-label">Price (₹) <span className="text-error">*</span></label>
                  <input
                    type="number"
                    required
                    min={0}
                    step="0.01"
                    value={form.price}
                    onChange={e => setForm(f => ({ ...f, price: parseFloat(e.target.value) || 0 }))}
                    className="field-input"
                  />
                </div>
                <div>
                  <label className="field-label">Sort Order</label>
                  <input
                    type="number"
                    min={0}
                    value={form.sortOrder}
                    onChange={e => setForm(f => ({ ...f, sortOrder: parseInt(e.target.value) || 0 }))}
                    className="field-input"
                  />
                </div>
              </div>

              {/* Active toggle */}
              <div className="flex items-center justify-between bg-surface-container rounded-xl px-5 py-4">
                <div>
                  <p className="font-label-md text-on-surface">Active</p>
                  <p className="text-sm text-on-surface-variant">Visible to customers on checkout</p>
                </div>
                <button
                  type="button"
                  onClick={() => setForm(f => ({ ...f, active: !f.active }))}
                  className={`relative w-12 h-6 rounded-full transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2 ${form.active ? 'bg-primary' : 'bg-outline-variant'}`}
                  role="switch"
                  aria-checked={form.active}
                  aria-label="Active"
                >
                  <span className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${form.active ? 'left-7' : 'left-1'}`} />
                </button>
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 btn-outline py-3 rounded-xl font-label-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2">Cancel</button>
                <button type="submit" disabled={isSubmitting} className="flex-1 btn-primary py-3 rounded-xl font-label-md disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2">
                  {isSubmitting ? 'Saving...' : editingService ? 'Update Service' : 'Create Service'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmationDialog
        isOpen={deleteConfirm !== null}
        onClose={() => !isDeleting && setDeleteConfirm(null)}
        onConfirm={handleDelete}
        title="Delete Gift Service"
        description="This action cannot be undone. Existing orders will retain their snapshot data."
        entityName={services.find(s => s.id === deleteConfirm)?.name}
        warningMessage="Customers can no longer select this gift option."
        confirmText="Delete Service"
        isLoading={isDeleting}
        actionType="DELETE"
      />
    </div>
  );
};
