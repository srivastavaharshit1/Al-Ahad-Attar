import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, AlertCircle } from 'lucide-react';
import { giftSetService } from '../../services/giftSetService';
import type { GiftSet } from '../../types/giftSet';
import { GiftSetForm } from '../../components/admin/GiftSetForm';
import { Loader } from '../../components/ui/Loader';

export const EditGiftSet: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [giftSet, setGiftSet] = useState<GiftSet | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) {
      setError('Gift Set ID is missing');
      setIsLoading(false);
      return;
    }

    const fetchGiftSet = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const data = await giftSetService.getAdminGiftSetById(id);
        setGiftSet(data);
      } catch (err: any) {
        console.error('Failed to load gift set', err);
        setError(err?.response?.data?.message || 'Gift Set not found or failed to load');
      } finally {
        setIsLoading(false);
      }
    };

    fetchGiftSet();
  }, [id]);

  if (isLoading) {
    return (
      <div className="py-24 flex flex-col items-center justify-center">
        <Loader />
        <p className="font-label-md text-label-md text-on-surface-variant mt-3">Loading Gift Set details...</p>
      </div>
    );
  }

  if (error || !giftSet) {
    return (
      <div className="py-16 max-w-lg mx-auto text-center space-y-4">
        <div className="w-12 h-12 rounded-full bg-error-container/30 text-error flex items-center justify-center mx-auto">
          <AlertCircle className="w-6 h-6" />
        </div>
        <h2 className="font-headline-md text-headline-md text-on-surface">Unable to load Gift Set</h2>
        <p className="font-body-sm text-body-sm text-on-surface-variant">{error || 'Gift Set does not exist.'}</p>
        <div className="pt-2">
          <button
            type="button"
            onClick={() => navigate('/admin/gift-sets')}
            className="btn btn-outline px-4 py-2 text-xs inline-flex items-center gap-1.5"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Gift Sets
          </button>
        </div>
      </div>
    );
  }

  return <GiftSetForm initialData={giftSet} isEdit={true} />;
};

