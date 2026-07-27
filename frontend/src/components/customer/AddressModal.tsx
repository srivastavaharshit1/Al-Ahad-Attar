import React, { useState, useEffect } from 'react';
import type { Address } from '../../types';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { profileService } from '../../services/profileService';

interface AddressModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  editAddress: Address | null;
}

export const AddressModal: React.FC<AddressModalProps> = ({ isOpen, onClose, onSave, editAddress }) => {
  const [formData, setFormData] = useState({
    fullName: '',
    phone: '',
    addressLine1: '',
    addressLine2: '',
    city: '',
    state: '',
    postalCode: '',
    country: 'India',
    defaultAddress: false
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (editAddress) {
      setFormData({
        fullName: editAddress.fullName,
        phone: editAddress.phone,
        addressLine1: editAddress.addressLine1,
        addressLine2: editAddress.addressLine2 || '',
        city: editAddress.city,
        state: editAddress.state,
        postalCode: editAddress.postalCode,
        country: editAddress.country,
        defaultAddress: editAddress.defaultAddress
      });
    } else {
      setFormData({
        fullName: '',
        phone: '',
        addressLine1: '',
        addressLine2: '',
        city: '',
        state: '',
        postalCode: '',
        country: 'India',
        defaultAddress: false
      });
    }
    setError(null);
  }, [editAddress, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      if (editAddress) {
        await profileService.updateAddress(editAddress.id, formData);
      } else {
        await profileService.addAddress(formData);
      }
      onSave();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to save address');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-surface rounded-DEFAULT shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between p-6 border-b border-outline-variant">
          <h2 className="font-headline-md">{editAddress ? 'Edit Address' : 'Add New Address'}</h2>
          <button onClick={onClose} className="text-on-surface-variant hover:text-on-surface transition-colors">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
        
        <div className="p-6 overflow-y-auto flex-1">
          {error && <div className="bg-error-container text-on-error-container p-3 rounded mb-4">{error}</div>}
          
          <form id="address-form" onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Full Name"
                value={formData.fullName}
                onChange={e => setFormData({ ...formData, fullName: e.target.value })}
                required
              />
              <Input
                label="Phone Number"
                value={formData.phone}
                onChange={e => setFormData({ ...formData, phone: e.target.value })}
                required
              />
            </div>
            
            <Input
              label="Address Line 1"
              value={formData.addressLine1}
              onChange={e => setFormData({ ...formData, addressLine1: e.target.value })}
              required
            />
            
            <Input
              label="Address Line 2 (Optional)"
              value={formData.addressLine2}
              onChange={e => setFormData({ ...formData, addressLine2: e.target.value })}
            />
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="City"
                value={formData.city}
                onChange={e => setFormData({ ...formData, city: e.target.value })}
                required
              />
              <Input
                label="State"
                value={formData.state}
                onChange={e => setFormData({ ...formData, state: e.target.value })}
                required
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Postal Code / ZIP"
                value={formData.postalCode}
                onChange={e => setFormData({ ...formData, postalCode: e.target.value })}
                required
              />
              <Input
                label="Country"
                value={formData.country}
                onChange={e => setFormData({ ...formData, country: e.target.value })}
                required
              />
            </div>
            
            <div className="flex items-center gap-2 pt-2">
              <input
                type="checkbox"
                id="defaultAddress"
                checked={formData.defaultAddress}
                onChange={e => setFormData({ ...formData, defaultAddress: e.target.checked })}
                className="w-4 h-4 rounded border-outline-variant text-primary focus:ring-primary"
              />
              <label htmlFor="defaultAddress" className="font-body-md text-on-surface">
                Set as default address
              </label>
            </div>
          </form>
        </div>
        
        <div className="flex items-center justify-end gap-4 p-6 border-t border-outline-variant bg-surface-container-lowest">
          <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button type="submit" form="address-form" variant="primary" disabled={isLoading}>
            {isLoading ? 'Saving...' : 'Save Address'}
          </Button>
        </div>
      </div>
    </div>
  );
};
