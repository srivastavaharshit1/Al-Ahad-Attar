import React, { useState, useEffect } from 'react';
import { profileService } from '../../services/profileService';
import type { Address } from '../../types';
import { AddressModal } from '../../components/customer/AddressModal';

export const Addresses: React.FC = () => {
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAddress, setEditingAddress] = useState<Address | null>(null);

  useEffect(() => {
    fetchAddresses();
  }, []);

  const fetchAddresses = async () => {
    try {
      setIsLoading(true);
      const res = await profileService.getAddresses();
      setAddresses(res.data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load addresses');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSetDefault = async (id: number) => {
    try {
      await profileService.setDefaultAddress(id);
      fetchAddresses();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to set default address');
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await profileService.deleteAddress(id);
      fetchAddresses();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to delete address');
    }
  };

  if (isLoading) return <div className="text-center p-8">Loading addresses...</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="font-display-sm text-display-sm text-on-surface">My Addresses</h1>
        <button 
          onClick={() => { setEditingAddress(null); setIsModalOpen(true); }}
          className="btn-primary flex items-center gap-2 px-6 py-2"
        >
          <span className="material-symbols-outlined text-sm">add</span>
          Add New
        </button>
      </div>

      {error && <div className="bg-error-container text-on-error-container p-4 rounded mb-6">{error}</div>}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {addresses.map((address) => (
          <div key={address.id} className={`bg-surface-container-lowest border p-6 rounded-DEFAULT relative ${address.defaultAddress ? 'border-primary' : 'border-outline-variant'}`}>
            {address.defaultAddress && (
              <span className="absolute top-4 right-4 bg-primary-container text-on-primary-container text-xs font-label-md uppercase tracking-wider px-2 py-1 rounded">
                Default
              </span>
            )}
            
            <h3 className="font-headline-sm mb-2 pr-16">{address.fullName}</h3>
            <div className="text-on-surface-variant font-body-md space-y-1 mb-6">
              <p>{address.addressLine1}</p>
              {address.addressLine2 && <p>{address.addressLine2}</p>}
              <p>{address.city}, {address.state} {address.postalCode}</p>
              <p>{address.country}</p>
              <p className="pt-2 flex items-center gap-2">
                <span className="material-symbols-outlined text-sm">call</span> 
                {address.phone}
              </p>
            </div>

            <div className="flex items-center gap-4 pt-4 border-t border-outline-variant">
              <button 
                onClick={() => { setEditingAddress(address); setIsModalOpen(true); }}
                className="text-primary font-label-md hover:underline"
              >
                Edit
              </button>
              <button onClick={() => handleDelete(address.id)} className="text-error font-label-md hover:underline">Delete</button>
              {!address.defaultAddress && (
                <button onClick={() => handleSetDefault(address.id)} className="ml-auto text-on-surface-variant font-label-md hover:text-primary transition-colors">
                  Set as Default
                </button>
              )}
            </div>
          </div>
        ))}

        <div 
          onClick={() => { setEditingAddress(null); setIsModalOpen(true); }}
          className="bg-surface-container-lowest border border-dashed border-outline-variant hover:border-primary p-6 rounded-DEFAULT flex flex-col items-center justify-center min-h-[200px] cursor-pointer group transition-colors"
        >
          <div className="w-12 h-12 rounded-full bg-surface-container group-hover:bg-primary-container text-on-surface-variant group-hover:text-primary flex items-center justify-center mb-4 transition-colors">
            <span className="material-symbols-outlined">add_location</span>
          </div>
          <p className="font-label-lg text-on-surface-variant group-hover:text-primary transition-colors">Add New Address</p>
        </div>
      </div>
      <AddressModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onSave={fetchAddresses} 
        editAddress={editingAddress} 
      />
    </div>
  );
};
