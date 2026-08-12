import React, { useState, useEffect } from 'react';
import { profileService } from '../../services/profileService';
import type { Address } from '../../types';
import { AddressModal } from '../../components/customer/AddressModal';
import { Loader } from '../../components/ui/Loader';
import { ConfirmationDialog } from '../../components/ui/ConfirmationDialog';
import { useInView } from '../../hooks/useInView';

export const Addresses: React.FC = () => {
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAddress, setEditingAddress] = useState<Address | null>(null);
  const [deleteConfirmAddress, setDeleteConfirmAddress] = useState<Address | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const { ref, inView } = useInView<HTMLDivElement>();

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

  const confirmDelete = async () => {
    if (!deleteConfirmAddress) return;
    try {
      setIsDeleting(true);
      await profileService.deleteAddress(deleteConfirmAddress.id);
      setDeleteConfirmAddress(null);
      await fetchAddresses();
    } catch (err: any) {
      setDeleteConfirmAddress(null);
      setError(err.response?.data?.message || 'Failed to delete address');
    } finally {
      setIsDeleting(false);
    }
  };

  if (isLoading) return <Loader />;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
        <div>
          <span className="text-accent text-[10px] font-label-md uppercase tracking-[0.3em] mb-2 block">My Account</span>
          <h1 className="font-display-sm text-display-sm text-on-surface">My Addresses</h1>
        </div>
        <button
          onClick={() => { setEditingAddress(null); setIsModalOpen(true); }}
          className="btn btn-primary inline-flex items-center gap-2"
        >
          <span className="material-symbols-outlined text-[16px]">add</span>
          Add New
        </button>
      </div>

      {error && (
        <div className="flex items-start gap-3 bg-error-container/20 border border-error/30 rounded-lg p-4 mb-6">
          <span className="material-symbols-outlined text-error text-[20px] flex-shrink-0 mt-0.5">error</span>
          <p className="text-sm text-error leading-relaxed">{error}</p>
        </div>
      )}

      {addresses.length > 0 ? (
        <div ref={ref} className={`grid grid-cols-1 md:grid-cols-2 gap-6 reveal ${inView ? 'in-view' : ''}`}>
          {addresses.map((address, idx) => (
            <div
              key={address.id}
              className={`card relative p-6 stagger-${(idx % 3) + 1} ${address.defaultAddress ? 'border-accent' : ''}`}
            >
              {address.defaultAddress && (
                <span className="badge badge-gold absolute top-4 right-4">Default</span>
              )}

              <h3 className="font-headline-sm text-headline-sm text-on-surface mb-2 pr-24">{address.fullName}</h3>
              <div className="text-on-surface-variant font-body-md leading-relaxed space-y-1 mb-6">
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
                  className="link-underline font-label-md text-on-surface rounded-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                >
                  Edit
                </button>
                <button
                  onClick={() => setDeleteConfirmAddress(address)}
                  className="link-underline font-label-md text-error rounded-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-error"
                >
                  Delete
                </button>
                {!address.defaultAddress && (
                  <button
                    onClick={() => handleSetDefault(address.id)}
                    className="ml-auto font-label-md text-on-surface-variant hover:text-accent transition-colors rounded-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                  >
                    Set as Default
                  </button>
                )}
              </div>
            </div>
          ))}

          <button
            type="button"
            onClick={() => { setEditingAddress(null); setIsModalOpen(true); }}
            className="card border-dashed border-outline-variant p-6 flex flex-col items-center justify-center min-h-[200px] group focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            <div className="w-12 h-12 rounded-full bg-surface-container group-hover:bg-accent-soft text-on-surface-variant group-hover:text-accent flex items-center justify-center mb-4 transition-colors">
              <span className="material-symbols-outlined">add_location</span>
            </div>
            <p className="font-label-lg text-on-surface-variant group-hover:text-accent transition-colors">Add New Address</p>
          </button>
        </div>
      ) : (
        <div className="flex flex-col items-center text-center py-20 px-6 border border-outline-variant rounded-DEFAULT bg-surface-container-lowest">
          <div className="w-16 h-16 border border-accent rounded-full flex items-center justify-center mb-6">
            <span className="material-symbols-outlined text-accent text-2xl">location_off</span>
          </div>
          <h2 className="font-headline-md text-on-surface mb-2 tracking-widest uppercase">No Saved Addresses</h2>
          <p className="font-body-md text-on-surface-variant mb-8 leading-relaxed max-w-md">
            Save a delivery address to make checkout faster the next time you shop with us.
          </p>
          <button
            onClick={() => { setEditingAddress(null); setIsModalOpen(true); }}
            className="btn btn-primary inline-flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-[16px]">add_location</span>
            Add New Address
          </button>
        </div>
      )}

      <AddressModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={fetchAddresses}
        editAddress={editingAddress}
      />

      <ConfirmationDialog
        isOpen={deleteConfirmAddress !== null}
        onClose={() => !isDeleting && setDeleteConfirmAddress(null)}
        onConfirm={confirmDelete}
        title="Delete Address"
        description="Are you sure you want to delete this address? This cannot be undone."
        entityName={deleteConfirmAddress?.fullName}
        confirmText="Yes, Delete"
        cancelText="Keep Address"
        isLoading={isDeleting}
        actionType="DELETE"
      />
    </div>
  );
};
