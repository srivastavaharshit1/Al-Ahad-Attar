import React, { useState, useEffect, useRef } from 'react';
import type { Address } from '../../types';
import { Input } from '../ui/Input';
import { PhoneInput } from '../ui/PhoneInput';
import { Button } from '../ui/Button';
import { profileService } from '../../services/profileService';
import { useFocusTrap } from '../../hooks/useFocusTrap';

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
  const dialogRef = useRef<HTMLDivElement>(null);
  useFocusTrap(dialogRef, isOpen);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

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
    <div className="modal-overlay fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        ref={dialogRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="address-modal-title"
        className="modal-panel border border-outline-variant/40 w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        <div className="flex items-center justify-between p-6 border-b border-outline-variant/40">
          <h2 id="address-modal-title" className="font-headline-md text-lg text-on-surface">{editAddress ? 'Edit Address' : 'Add New Address'}</h2>
          <button
            onClick={onClose}
            aria-label="Close dialog"
            className="text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-colors rounded-full p-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1">
          {error && <div className="bg-error/5 border border-error/20 text-error p-3 rounded-lg mb-4 text-sm leading-relaxed">{error}</div>}
          
          <form id="address-form" onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Full Name"
                value={formData.fullName}
                onChange={e => setFormData({ ...formData, fullName: e.target.value })}
                required
              />
              <PhoneInput
                label="Phone Number"
                value={formData.phone}
                onChange={phone => setFormData({ ...formData, phone })}
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
                className="w-4 h-4 rounded border-outline-variant text-accent focus:ring-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent cursor-pointer"
              />
              <label htmlFor="defaultAddress" className="font-body-md text-on-surface cursor-pointer">
                Set as default address
              </label>
            </div>
          </form>
        </div>

        <div className="flex items-center justify-end gap-4 p-6 border-t border-outline-variant/40 bg-surface-container-lowest">
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
