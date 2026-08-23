import React, { useState, useEffect, useCallback } from 'react';
import { bottleService } from '../../services/bottleService';
import type { Bottle, BottleRequest } from '../../services/bottleService';
import { formatPrice } from '../../utils/formatPrice';
import toast from 'react-hot-toast';
import { getImageUrl } from '../../utils/getImageUrl';
import { ConfirmationDialog } from '../../components/ui/ConfirmationDialog';
import { Plus, Edit2, Trash2, Image as ImageIcon } from 'lucide-react';

const EMPTY_FORM: BottleRequest = {
  name: '',
  description: '',
  imageUrl: '',
  price: 0,
  active: true
};

export const Bottles: React.FC = () => {
  const [bottles, setBottles] = useState<Bottle[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [showModal, setShowModal] = useState(false);
  const [editingBottle, setEditingBottle] = useState<Bottle | null>(null);
  const [form, setForm] = useState<BottleRequest>(EMPTY_FORM);
  const [imageUploading, setImageUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);

  const fetchBottles = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await bottleService.getAll();
      setBottles(data || []);
    } catch (err) {
      toast.error('Failed to load bottles');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { fetchBottles(); }, [fetchBottles]);

  const openCreate = () => {
    setEditingBottle(null);
    setForm(EMPTY_FORM);
    setShowModal(true);
  };

  const openEdit = (bottle: Bottle) => {
    setEditingBottle(bottle);
    setForm({
      name: bottle.name,
      description: bottle.description || '',
      imageUrl: bottle.imageUrl || '',
      price: bottle.price,
      active: bottle.active
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
      const url = await bottleService.uploadImage(file);
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
      if (editingBottle) {
        await bottleService.update(editingBottle.id, form);
        toast.success('Bottle updated');
      } else {
        await bottleService.create(form);
        toast.success('Bottle created');
      }
      setShowModal(false);
      fetchBottles();
    } catch {
      toast.error(editingBottle ? 'Failed to update bottle' : 'Failed to create bottle');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await bottleService.delete(id);
      toast.success('Bottle deleted');
      setDeleteConfirm(null);
      fetchBottles();
    } catch {
      toast.error('Failed to delete bottle');
    }
  };

  if (isLoading) {
    return <div className="p-8 text-center text-gray-500">Loading bottles...</div>;
  }

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-light text-gray-900">Manage Bottles</h1>
          <p className="text-gray-500 mt-1">Configure bottle options available for Attars</p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 bg-[#b89445] text-white px-6 py-3 rounded hover:bg-[#a08035] transition-colors"
        >
          <Plus size={20} />
          <span>Add Bottle</span>
        </button>
      </div>

      <div className="bg-white border rounded shadow-sm overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-6 py-4 font-medium text-gray-500 text-sm">IMAGE</th>
              <th className="px-6 py-4 font-medium text-gray-500 text-sm">NAME & DESC</th>
              <th className="px-6 py-4 font-medium text-gray-500 text-sm">PRICE</th>
              <th className="px-6 py-4 font-medium text-gray-500 text-sm">STATUS</th>
              <th className="px-6 py-4 font-medium text-gray-500 text-sm text-right">ACTIONS</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {bottles.map(bottle => (
              <tr key={bottle.id} className="hover:bg-gray-50">
                <td className="px-6 py-4">
                  {bottle.imageUrl ? (
                    <img src={getImageUrl(bottle.imageUrl)} alt={bottle.name} className="w-16 h-16 object-cover rounded border" />
                  ) : (
                    <div className="w-16 h-16 bg-gray-100 flex items-center justify-center rounded border">
                      <ImageIcon className="text-gray-400" size={24} />
                    </div>
                  )}
                </td>
                <td className="px-6 py-4">
                  <div className="font-medium text-gray-900">{bottle.name}</div>
                  {bottle.description && <div className="text-sm text-gray-500 mt-1 truncate max-w-xs">{bottle.description}</div>}
                </td>
                <td className="px-6 py-4 font-medium text-[#b89445]">
                  +{formatPrice(bottle.price)}
                </td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 text-xs rounded-full ${bottle.active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                    {bottle.active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button onClick={() => openEdit(bottle)} className="p-2 text-gray-500 hover:text-[#b89445] hover:bg-gold-50 rounded transition-colors">
                      <Edit2 size={18} />
                    </button>
                    <button onClick={() => setDeleteConfirm(bottle.id)} className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded transition-colors">
                      <Trash2 size={18} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {bottles.length === 0 && (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                  No bottles found. Add some to get started.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b flex justify-between items-center">
              <h2 className="text-lg font-medium">{editingBottle ? 'Edit Bottle' : 'Add Bottle'}</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">&times;</button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                <input
                  required
                  type="text"
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  className="w-full p-2 border rounded focus:ring-1 focus:ring-[#b89445] focus:border-[#b89445]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  className="w-full p-2 border rounded focus:ring-1 focus:ring-[#b89445] focus:border-[#b89445]"
                  rows={3}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Price Extra (₹) *</label>
                <input
                  required
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.price}
                  onChange={e => setForm(f => ({ ...f, price: parseFloat(e.target.value) || 0 }))}
                  className="w-full p-2 border rounded focus:ring-1 focus:ring-[#b89445] focus:border-[#b89445]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Bottle Image</label>
                <div className="flex items-center gap-4">
                  {form.imageUrl && (
                    <img src={getImageUrl(form.imageUrl)} alt="Preview" className="w-16 h-16 object-cover border rounded" />
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    disabled={imageUploading}
                    className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-medium file:bg-[#b89445] file:text-white hover:file:bg-[#a08035]"
                  />
                </div>
                {imageUploading && <p className="text-sm text-[#b89445] mt-2">Uploading image...</p>}
              </div>

              <div className="flex items-center gap-2 mt-4">
                <input
                  type="checkbox"
                  id="active"
                  checked={form.active}
                  onChange={e => setForm(f => ({ ...f, active: e.target.checked }))}
                  className="w-4 h-4 text-[#b89445] focus:ring-[#b89445] border-gray-300 rounded"
                />
                <label htmlFor="active" className="text-sm font-medium text-gray-700">Active (Visible to customers)</label>
              </div>

              <div className="pt-4 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border rounded text-gray-700 hover:bg-gray-50"
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || imageUploading}
                  className="px-4 py-2 bg-[#b89445] text-white rounded hover:bg-[#a08035] disabled:opacity-50"
                >
                  {isSubmitting ? 'Saving...' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deleteConfirm && (
        <ConfirmationDialog
          isOpen={true}
          title="Delete Bottle"
          description="Are you sure you want to delete this bottle? This action cannot be undone."
          confirmText="Delete"
          onConfirm={() => handleDelete(deleteConfirm)}
          onClose={() => setDeleteConfirm(null)}
          dangerMode
          actionType="DELETE"
        />
      )}
    </div>
  );
};
