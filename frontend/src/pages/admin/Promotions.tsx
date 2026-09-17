import React, { useState, useEffect } from 'react';
import { promotionService } from '../../services/promotionService';
import { productService } from '../../services/productService';
import { categoryService } from '../../services/categoryService';
import toast from 'react-hot-toast';
import { Loader } from '../../components/ui/Loader';
import { ConfirmationDialog } from '../../components/ui/ConfirmationDialog';
import { Modal } from '../../components/ui/Modal';

type PromoScope = 'ANY_PRODUCT' | 'CATEGORY' | 'SPECIFIC_PRODUCT';

export const Promotions: React.FC = () => {
  const [promotions, setPromotions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPromoId, setEditingPromoId] = useState<number | null>(null);
  const [availableProducts, setAvailableProducts] = useState<any[]>([]);
  const [availableCategories, setAvailableCategories] = useState<any[]>([]);

  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [selectedBuyProductId, setSelectedBuyProductId] = useState<number | null>(null);
  const [selectedFreeProductId, setSelectedFreeProductId] = useState<number | null>(null);
  const [buyProductVariants, setBuyProductVariants] = useState<any[]>([]);
  const [freeProductVariants, setFreeProductVariants] = useState<any[]>([]);

  const defaultFormData = {
    name: '',
    description: '',
    code: '',
    promotionType: 'CART_DISCOUNT',
    discountType: 'PERCENTAGE',
    discountValue: '' as any,
    minCartValue: '' as any,
    maxDiscountValue: '' as any,
    startDate: '',
    endDate: '',
    usageLimit: '',
    perUserLimit: '',
    priority: 1,
    active: true,
    stackable: false,
    configuration: {
      applicableCategoryIds: [] as number[],
      applicableProductIds: [] as number[],
      firstOrderOnly: false,
      prerequisiteQuantity: 2,
      prerequisiteProductIds: [] as number[],
      entitledQuantity: 1,
      entitledProductIds: [] as number[],
      // FREE_PRODUCT fields
      buyScope: 'ANY_PRODUCT' as PromoScope,
      buyVariantIds: [] as number[],
      buyCategoryId: null as number | null,
      buyProductId: null as number | null,
      buyVariantSizes: [] as string[],
      minPurchaseQuantity: 1,
      freeScope: 'ANY_PRODUCT' as PromoScope,
      freeCategoryIds: [] as number[],
      freeVariantIds: [] as number[],
      freeProductIds: [] as number[],
      allowedFreeVariantSize: '' as string,
      freeVariantSizes: [] as string[],
      maxFreeQuantity: 1,
      allowCustomerSelection: true,
      autoAddFreeProduct: false,
    }
  };

  const [formData, setFormData] = useState(defaultFormData);

  useEffect(() => {
    fetchPromotions();
    fetchDependencies();
  }, []);

  const fetchDependencies = async () => {
    try {
      const [productsRes, categoriesRes] = await Promise.all([
        productService.getProducts({ size: 200 }),
        categoryService.getActiveCategories()
      ]);
      setAvailableProducts(productsRes.content || []);
      setAvailableCategories(categoriesRes.data || []);
    } catch (err) {
      console.error("Failed to load products or categories", err);
    }
  };

  useEffect(() => {
    if (selectedBuyProductId) {
      productService.getProduct(selectedBuyProductId.toString())
        .then(res => setBuyProductVariants(res.data?.variants || []))
        .catch(() => setBuyProductVariants([]));
    } else {
      setBuyProductVariants([]);
    }
  }, [selectedBuyProductId]);

  useEffect(() => {
    if (selectedFreeProductId) {
      productService.getProduct(selectedFreeProductId.toString())
        .then(res => setFreeProductVariants(res.data?.variants || []))
        .catch(() => setFreeProductVariants([]));
    } else {
      setFreeProductVariants([]);
    }
  }, [selectedFreeProductId]);

  const fetchPromotions = async () => {
    try {
      const data = await promotionService.getPromotions();
      if (data.success) {
        setPromotions(data.data.content);
      }
    } catch (error) {
      toast.error('Failed to load promotions');
    } finally {
      setIsLoading(false);
    }
  };

  const openCreateModal = () => {
    setEditingPromoId(null);
    setFormData(defaultFormData);
    setSelectedBuyProductId(null);
    setSelectedFreeProductId(null);
    setIsModalOpen(true);
  };

  // Legacy promotions (created before buyScope/freeScope existed) have no explicit scope stored —
  // infer a sensible one from whichever fields happen to be set, purely for the edit form's
  // initial selection. The backend's own matching still runs its untouched legacy-inference path
  // for these until the admin re-saves with an explicit scope.
  const inferScope = (productId: number | null, categoryId: number | null | undefined): PromoScope => {
    if (productId) return 'SPECIFIC_PRODUCT';
    if (categoryId) return 'CATEGORY';
    return 'ANY_PRODUCT';
  };

  const openEditModal = (promo: any) => {
    setEditingPromoId(promo.id);
    setFormData({
      name: promo.name || '',
      description: promo.description || '',
      code: promo.code || '',
      promotionType: promo.promotionType || 'CART_DISCOUNT',
      discountType: promo.discountType || 'PERCENTAGE',
      discountValue: promo.discountValue ?? '',
      minCartValue: promo.minCartValue ?? '',
      maxDiscountValue: promo.maxDiscountValue ?? '',
      startDate: promo.startDate ? promo.startDate.substring(0, 16) : '',
      endDate: promo.endDate ? promo.endDate.substring(0, 16) : '',
      usageLimit: promo.usageLimit ?? '',
      perUserLimit: promo.perUserLimit ?? '',
      priority: promo.priority ?? 1,
      active: promo.active ?? true,
      stackable: promo.stackable ?? false,
      configuration: {
        applicableCategoryIds: promo.configuration?.applicableCategoryIds || [],
        applicableProductIds: promo.configuration?.applicableProductIds || [],
        firstOrderOnly: promo.configuration?.firstOrderOnly || false,
        prerequisiteQuantity: promo.configuration?.prerequisiteQuantity ?? 2,
        prerequisiteProductIds: promo.configuration?.prerequisiteProductIds || [],
        entitledQuantity: promo.configuration?.entitledQuantity ?? 1,
        entitledProductIds: promo.configuration?.entitledProductIds || [],
        // FREE_PRODUCT fields
        buyScope: promo.configuration?.buyScope || inferScope(promo.configuration?.buyProductId, promo.configuration?.buyCategoryId),
        buyVariantIds: promo.configuration?.buyVariantIds || [],
        buyCategoryId: promo.configuration?.buyCategoryId || null,
        buyProductId: promo.configuration?.buyProductId || null,
        buyVariantSizes: promo.configuration?.buyVariantSizes || (promo.configuration?.buyVariantSize ? [promo.configuration.buyVariantSize] : []),
        minPurchaseQuantity: promo.configuration?.minPurchaseQuantity ?? 1,
        freeScope: promo.configuration?.freeScope || inferScope(
          (promo.configuration?.freeProductIds || [])[0] ?? null,
          (promo.configuration?.freeCategoryIds || [])[0] ?? null,
        ),
        freeCategoryIds: promo.configuration?.freeCategoryIds || [],
        freeVariantIds: promo.configuration?.freeVariantIds || [],
        freeProductIds: promo.configuration?.freeProductIds || [],
        allowedFreeVariantSize: promo.configuration?.allowedFreeVariantSize || '',
        freeVariantSizes: promo.configuration?.freeVariantSizes || (promo.configuration?.allowedFreeVariantSize ? [promo.configuration.allowedFreeVariantSize] : []),
        maxFreeQuantity: promo.configuration?.maxFreeQuantity ?? 1,
        allowCustomerSelection: promo.configuration?.allowCustomerSelection ?? true,
        autoAddFreeProduct: promo.configuration?.autoAddFreeProduct ?? false,
      }
    });
    setSelectedBuyProductId(promo.configuration?.buyProductId || null);
    setSelectedFreeProductId((promo.configuration?.freeProductIds || [])[0] ?? null);
    setIsModalOpen(true);
  };

  const buildPayload = () => {
    const payload: any = {
      ...formData,
      configuration: { ...formData.configuration },
      discountValue: formData.discountValue !== '' ? parseFloat(formData.discountValue) : 0,
      minCartValue: formData.minCartValue !== '' && parseFloat(formData.minCartValue) > 0 ? parseFloat(formData.minCartValue) : null,
      maxDiscountValue: formData.maxDiscountValue !== '' && parseFloat(formData.maxDiscountValue) > 0 ? parseFloat(formData.maxDiscountValue) : null,
      usageLimit: formData.usageLimit ? parseInt(formData.usageLimit) : null,
      perUserLimit: formData.perUserLimit ? parseInt(formData.perUserLimit) : null,
      startDate: formData.startDate ? new Date(formData.startDate).toISOString() : null,
      endDate: formData.endDate ? new Date(formData.endDate).toISOString() : null,
    };

    if (payload.code) {
      payload.code = payload.code.trim().toUpperCase();
    } else {
      payload.code = null;
    }

    if (payload.promotionType === 'FREE_PRODUCT' || payload.promotionType === 'BUY_X_GET_Y') {
      // For FREE_PRODUCT, standard discount doesn't apply. For BUY_X_GET_Y, rewardDiscountType handles it.
      payload.discountType = 'FREE_ITEM';
      payload.discountValue = null;
      payload.maxDiscountValue = null;
      if (payload.promotionType === 'FREE_PRODUCT') {
        payload.code = null;
      }
      // Clear non-FREE_PRODUCT config
      payload.configuration.applicableCategoryIds = null;
      payload.configuration.applicableProductIds = null;
      payload.configuration.prerequisiteQuantity = null;
      payload.configuration.prerequisiteProductIds = null;
      payload.configuration.entitledQuantity = null;
      payload.configuration.entitledProductIds = null;
      // Ensure numeric fields are numbers
      payload.configuration.minPurchaseQuantity = parseInt(payload.configuration.minPurchaseQuantity) || 1;
      payload.configuration.maxFreeQuantity = parseInt(payload.configuration.maxFreeQuantity) || 1;
      // Explicit scope drives which of category/product actually apply — clear the ones the
      // chosen scope doesn't use so a stale leftover selection can't silently narrow eligibility.
      payload.configuration.buyScope = formData.configuration.buyScope;
      payload.configuration.buyCategoryId = formData.configuration.buyScope === 'CATEGORY' && formData.configuration.buyCategoryId
        ? parseInt(formData.configuration.buyCategoryId as any) : null;
      payload.configuration.buyProductId = null;
      payload.configuration.buyVariantSizes = formData.configuration.buyVariantSizes?.length ? formData.configuration.buyVariantSizes : null;
      payload.configuration.buyVariantIds = formData.configuration.buyScope === 'SPECIFIC_PRODUCT' && selectedBuyProductId
        ? buyProductVariants
            .filter(v => !formData.configuration.buyVariantSizes?.length || formData.configuration.buyVariantSizes.includes(v.size))
            .map(v => v.id)
        : null;
      payload.configuration.buyVariantSize = null;

      payload.configuration.freeScope = formData.configuration.freeScope;
      payload.configuration.freeCategoryIds = formData.configuration.freeScope === 'CATEGORY' && formData.configuration.freeCategoryIds?.length
        ? formData.configuration.freeCategoryIds : null;
      payload.configuration.freeProductIds = formData.configuration.freeScope === 'SPECIFIC_PRODUCT' && selectedFreeProductId
        ? [selectedFreeProductId] : null;
      payload.configuration.freeVariantSizes = formData.configuration.freeVariantSizes?.length ? formData.configuration.freeVariantSizes : null;
      payload.configuration.freeVariantIds = null;
      payload.configuration.allowedFreeVariantSize = null;
    } else {
      payload.configuration.buyScope = null;
      payload.configuration.buyVariantIds = null;
      payload.configuration.buyCategoryId = null;
      payload.configuration.buyProductId = null;
      payload.configuration.buyVariantSizes = null;
      payload.configuration.minPurchaseQuantity = null;
      payload.configuration.freeScope = null;
      payload.configuration.freeCategoryIds = null;
      payload.configuration.freeVariantIds = null;
      payload.configuration.freeProductIds = null;
      payload.configuration.allowedFreeVariantSize = null;
      payload.configuration.freeVariantSizes = null;
      payload.configuration.maxFreeQuantity = null;
    }

    if (payload.promotionType === 'CATEGORY_DISCOUNT') {
      payload.configuration.applicableProductIds = null;
    } else {
      payload.configuration.applicableCategoryIds = null;
    }

    if (payload.promotionType === 'PRODUCT_DISCOUNT') {
      payload.configuration.applicableCategoryIds = null;
    } else {
      payload.configuration.applicableProductIds = null;
    }

    if (payload.promotionType === 'FREE_SHIPPING') {
      payload.discountType = 'PERCENTAGE';
      payload.discountValue = 100;
      payload.code = null;
    }

    if (payload.promotionType === 'FIRST_ORDER') {
      payload.configuration.firstOrderOnly = true;
      payload.code = null;
    }

    return payload;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = buildPayload();

      let res;
      if (editingPromoId) {
        res = await promotionService.updatePromotion(editingPromoId, payload);
      } else {
        res = await promotionService.createPromotion(payload);
      }

      if (res.success) {
        toast.success(editingPromoId ? 'Promotion updated successfully' : 'Promotion created successfully');
        setIsModalOpen(false);
        fetchPromotions();
      }
    } catch (error) {
      toast.error(editingPromoId ? 'Failed to update promotion' : 'Failed to create promotion');
    }
  };

  const toggleStatus = async (id: number, currentStatus: boolean) => {
    try {
      const res = await promotionService.updatePromotionStatus(id, !currentStatus);
      if (res.success) {
        toast.success('Status updated');
        fetchPromotions();
      }
    } catch (error) {
      toast.error('Failed to update status');
    }
  };

  const deletePromotion = (id: number) => {
    setDeleteConfirmId(id);
  };

  const confirmDelete = async () => {
    if (!deleteConfirmId) return;
    try {
      setIsDeleting(true);
      await promotionService.deletePromotion(deleteConfirmId);
      toast.success('Promotion deleted');
      setDeleteConfirmId(null);
      fetchPromotions();
    } catch (error) {
      toast.error('Failed to delete promotion');
    } finally {
      setIsDeleting(false);
    }
  };

  // Purely presentational: derives a richer 4-state label from the existing
  // `active` flag + start/end dates so the status badge reads as
  // Active / Scheduled / Expired / Disabled instead of a flat on/off pill.
  // Does not affect eligibility or persistence — clicking the badge still
  // just toggles the underlying `active` boolean via toggleStatus().
  const getPromotionStatus = (promo: any): { label: string; badgeClass: string } => {
    if (!promo.active) return { label: 'Disabled', badgeClass: 'badge-warning' };
    const now = new Date();
    if (promo.startDate && new Date(promo.startDate) > now) return { label: 'Scheduled', badgeClass: 'badge-gold' };
    if (promo.endDate && new Date(promo.endDate) < now) return { label: 'Expired', badgeClass: 'badge-neutral' };
    return { label: 'Active', badgeClass: 'badge-success' };
  };

  if (isLoading) return <Loader />;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="font-headline-md text-headline-md text-primary">Promotions</h1>
          <p className="font-body-md text-body-md text-on-surface-variant">Manage all store promotions and discounts</p>
        </div>
        <button
          onClick={openCreateModal}
          className="bg-primary text-on-primary px-4 py-2 rounded-lg font-label-lg flex items-center gap-2 hover:bg-primary/90 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2"
        >
          <span className="material-symbols-outlined text-sm">add</span>
          Add Promotion
        </button>
      </div>

      <div className="table-shell">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr>
              <th>Name</th>
              <th>Type</th>
              <th>Code</th>
              <th>Value</th>
              <th>Priority</th>
              <th>Status</th>
              <th className="text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {promotions.map((promo) => {
              const status = getPromotionStatus(promo);
              return (
              <tr key={promo.id}>
                <td data-label="Name">
                  <div className="font-body-lg text-on-surface">{promo.name}</div>
                  <div className="font-body-sm text-on-surface-variant text-xs">{promo.description}</div>
                </td>
                <td data-label="Type" className="font-body-md text-on-surface text-sm">{promo.promotionType?.replace(/_/g, ' ')}</td>
                <td data-label="Code" className="font-body-md text-on-surface">
                  {promo.code
                    ? <span className="font-mono bg-accent-soft text-accent-hover px-2 py-0.5 rounded text-xs">{promo.code}</span>
                    : <span className="text-on-surface-variant text-xs">Automatic</span>
                  }
                </td>
                <td data-label="Value" className="font-body-md text-on-surface">
                  {promo.promotionType === 'FREE_PRODUCT'
                    ? `Free Product Campaign`
                    : promo.promotionType === 'FREE_SHIPPING'
                    ? 'Free Shipping'
                    : promo.discountType === 'PERCENTAGE'
                    ? `${promo.discountValue}%`
                    : `₹${promo.discountValue}`
                  }
                </td>
                <td data-label="Priority" className="font-body-md text-on-surface">{promo.priority}</td>
                <td data-label="Status">
                  <button
                    onClick={() => toggleStatus(promo.id, promo.active)}
                    className={`badge ${status.badgeClass} cursor-pointer hover:brightness-95 transition-[filter] focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2`}
                    title="Click to toggle active/disabled"
                  >
                    {status.label}
                  </button>
                </td>
                <td data-label="Actions" className="text-right space-x-2">
                  <button onClick={() => openEditModal(promo)} className="text-primary hover:text-primary/80 p-2 rounded-lg transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2" title="Edit">
                    <span className="material-symbols-outlined text-[20px]">edit</span>
                  </button>
                  <button onClick={() => deletePromotion(promo.id)} className="text-error hover:text-error/80 p-2 rounded-lg transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2" title="Delete">
                    <span className="material-symbols-outlined text-[20px]">delete</span>
                  </button>
                </td>
              </tr>
              );
            })}
            {promotions.length === 0 && (
              <tr>
                <td colSpan={7} className="p-8 text-center text-on-surface-variant font-body-lg">
                  No promotions found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingPromoId ? 'Edit Promotion' : 'Create Promotion'}
        maxWidth="3xl"
      >
            <form onSubmit={handleSubmit} className="flex flex-col">
              {/* Two-column layout: form + live preview */}
              <div className="flex gap-8">

              {/* ── Main Form ── */}
              <div className="flex-1 min-w-0 space-y-0 pb-2">

              {/* ① Basic Details */}
              <div className="pb-6 space-y-4" style={{ borderBottom: '1px solid var(--border)' }}>
                <div className="flex items-center gap-2.5 mb-1">
                  <span className="w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center shrink-0 select-none" style={{ background: 'var(--accent-soft)', color: 'var(--accent-hover)' }}>1</span>
                  <span className="text-[11px] font-bold uppercase tracking-[0.14em]" style={{ color: 'var(--text-secondary)' }}>Basic Details</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="field-label">Promotion Name *</label>
                    <input required type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="field-input" placeholder="e.g. Eid Special — 20% Off" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="field-label">Coupon Code <span className="normal-case font-normal tracking-normal text-[10px] ml-1" style={{ color: 'var(--text-tertiary)' }}>(optional)</span></label>
                    <input
                      type="text"
                      value={formData.code}
                      onChange={e => setFormData({...formData, code: e.target.value.toUpperCase()})}
                      className="field-input font-mono"
                      placeholder="e.g. EID200"
                      disabled={formData.promotionType === 'FREE_SHIPPING' || formData.promotionType === 'FIRST_ORDER' || formData.promotionType === 'FREE_PRODUCT'}
                    />
                    {(formData.promotionType === 'FREE_SHIPPING' || formData.promotionType === 'FIRST_ORDER' || formData.promotionType === 'FREE_PRODUCT') && (
                      <p className="text-[11px] mt-1" style={{ color: 'var(--text-tertiary)' }}>Automatic promotion — no coupon code needed.</p>
                    )}
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="field-label">Description <span className="normal-case font-normal tracking-normal text-[10px] ml-1" style={{ color: 'var(--text-tertiary)' }}>(optional)</span></label>
                  <textarea value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="field-input" rows={2} placeholder="Brief description for admin reference" />
                </div>
              </div>

              {/* ② Offer */}
              <div className="py-6 space-y-5" style={{ borderBottom: '1px solid var(--border)' }}>
                <div className="flex items-center gap-2.5 mb-1">
                  <span className="w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center shrink-0 select-none" style={{ background: 'var(--accent-soft)', color: 'var(--accent-hover)' }}>2</span>
                  <span className="text-[11px] font-bold uppercase tracking-[0.14em]" style={{ color: 'var(--text-secondary)' }}>Offer</span>
                </div>

                <div className="space-y-1.5">
                  <label className="field-label">Promotion Type *</label>
                  <select value={formData.promotionType} onChange={e => setFormData({...formData, promotionType: e.target.value})} className="field-input">
                    <option value="CART_DISCOUNT">Cart Discount — % or flat off the entire cart</option>
                    <option value="PRODUCT_DISCOUNT">Product Discount — Discount on specific products</option>
                    <option value="CATEGORY_DISCOUNT">Category Discount — Discount on a product category</option>
                    <option value="FREE_SHIPPING">Free Shipping — Remove shipping charges</option>
                    <option value="FIRST_ORDER">First Order Discount — For new customers only</option>
                    <option value="FREE_PRODUCT">🎁 Free Product Campaign — Give a free product with qualifying orders</option>
                    <option value="BUY_X_GET_Y">🎁 Buy X Get Y — Automatic in-cart BOGO offers</option>
                  </select>
                </div>

                {formData.promotionType === 'FREE_SHIPPING' && (
                  <div className="rounded-lg px-4 py-3 text-sm" style={{ background: 'var(--surface-alt)', border: '1px solid var(--border)' }}>
                    <p style={{ color: 'var(--text-secondary)' }}>Shipping charges will be automatically waived when the minimum cart value condition is met. No discount value required.</p>
                  </div>
                )}

                {formData.promotionType === 'FREE_PRODUCT' && (
                  <div className="rounded-lg px-4 py-3 text-sm" style={{ background: 'var(--accent-soft)', border: '1px solid rgba(212,175,55,0.35)' }}>
                    <strong style={{ color: 'var(--accent-hover)' }}>🎁 Free Product Campaign: </strong>
                    <span style={{ color: 'var(--text)' }}>Customers who meet the qualification rules below can receive a free product. No monetary discount is applied.</span>
                  </div>
                )}

                {formData.promotionType !== 'FREE_SHIPPING' && formData.promotionType !== 'FREE_PRODUCT' && formData.promotionType !== 'BUY_X_GET_Y' && (
                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="field-label">Discount Type</label>
                      <div className="flex rounded-lg overflow-hidden" style={{ border: '1px solid var(--border)' }}>
                        <button
                          type="button"
                          onClick={() => setFormData({...formData, discountType: 'PERCENTAGE'})}
                          className="flex-1 py-2.5 text-sm font-semibold transition-colors"
                          style={formData.discountType === 'PERCENTAGE'
                            ? { background: 'var(--ink)', color: 'var(--text-inverse)' }
                            : { background: 'var(--surface)', color: 'var(--text-secondary)' }}
                        >
                          Percentage (%)
                        </button>
                        <button
                          type="button"
                          onClick={() => setFormData({...formData, discountType: 'FIXED_AMOUNT'})}
                          className="flex-1 py-2.5 text-sm font-semibold transition-colors"
                          style={formData.discountType === 'FIXED_AMOUNT'
                            ? { background: 'var(--ink)', color: 'var(--text-inverse)', borderLeft: '1px solid rgba(0,0,0,0.12)' }
                            : { background: 'var(--surface)', color: 'var(--text-secondary)', borderLeft: '1px solid var(--border)' }}
                        >
                          Flat Amount (₹)
                        </button>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="field-label">Discount Value {formData.discountType === 'PERCENTAGE' ? '(%)' : '(₹)'}</label>
                        <input type="number" min="0" value={formData.discountValue} onChange={e => setFormData({...formData, discountValue: e.target.value})} className="field-input" placeholder={formData.discountType === 'PERCENTAGE' ? 'e.g. 20' : 'e.g. 200'} />
                      </div>
                      {formData.discountType === 'PERCENTAGE' && (
                        <div className="space-y-1.5">
                          <label className="field-label">Max Discount (₹) <span className="normal-case font-normal tracking-normal text-[10px] ml-0.5" style={{ color: 'var(--text-tertiary)' }}>(optional)</span></label>
                          <input type="number" min="0" value={formData.maxDiscountValue} onChange={e => setFormData({...formData, maxDiscountValue: e.target.value})} className="field-input" placeholder="No cap" />
                          <p className="text-[11px] mt-1" style={{ color: 'var(--text-tertiary)' }}>Caps the maximum discount for percentage offers.</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {formData.promotionType === 'PRODUCT_DISCOUNT' && (
                  <div className="space-y-2">
                    <label className="field-label">Applicable Products</label>
                    <p className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>Leave all unchecked to apply to ALL products.</p>
                    <div className="max-h-44 overflow-y-auto rounded-lg p-3 space-y-2" style={{ background: 'var(--surface-alt)', border: '1px solid var(--border)' }}>
                      {availableProducts.map(p => (
                        <label key={p.id} className="flex items-center gap-2.5 cursor-pointer">
                          <input type="checkbox" checked={formData.configuration.applicableProductIds?.includes(p.id)} onChange={e => {
                            const currentIds = formData.configuration.applicableProductIds || [];
                            const ids = e.target.checked
                              ? [...currentIds, p.id]
                              : currentIds.filter(id => id !== p.id);
                            setFormData({...formData, configuration: {...formData.configuration, applicableProductIds: ids}});
                          }} className="accent-primary w-4 h-4" />
                          <span className="text-sm" style={{ color: 'var(--text)' }}>{p.name}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                {formData.promotionType === 'CATEGORY_DISCOUNT' && (
                  <div className="space-y-2">
                    <label className="field-label">Applicable Categories</label>
                    <p className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>Leave all unchecked to apply to ALL categories.</p>
                    <div className="max-h-44 overflow-y-auto rounded-lg p-3 space-y-2" style={{ background: 'var(--surface-alt)', border: '1px solid var(--border)' }}>
                      {availableCategories.map(c => (
                        <label key={c.id} className="flex items-center gap-2.5 cursor-pointer">
                          <input type="checkbox" checked={formData.configuration.applicableCategoryIds?.includes(c.id)} onChange={e => {
                            const currentIds = formData.configuration.applicableCategoryIds || [];
                            const ids = e.target.checked
                              ? [...currentIds, c.id]
                              : currentIds.filter(id => id !== c.id);
                            setFormData({...formData, configuration: {...formData.configuration, applicableCategoryIds: ids}});
                          }} className="accent-primary w-4 h-4" />
                          <span className="text-sm" style={{ color: 'var(--text)' }}>{c.name}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* FREE_PRODUCT / BUY_X_GET_Y Configuration */}
              {(formData.promotionType === 'FREE_PRODUCT' || formData.promotionType === 'BUY_X_GET_Y') && (() => {
                // availableProducts comes from the product LIST endpoint (ProductSummaryResponse) —
                // it has no `category` object and no `variants` array, only a flat `categoryName`
                // string and a flat `availableSizes: string[]`. Only the full single-product detail
                // fetch (buyProductVariants/freeProductVariants, used for SPECIFIC_PRODUCT scope)
                // returns real variant objects with `.size`.
                const uniqueVariantSizes = (variants: any[]) => Array.from(new Set(variants.map((v: any) => v.size).filter(Boolean))) as string[];
                const uniqueSummarySizes = (products: any[]) => Array.from(new Set(products.flatMap((p: any) => p.availableSizes || []))) as string[];
                const productsInCategory = (categoryId: number | null) => {
                  if (!categoryId) return availableProducts;
                  const categoryName = availableCategories.find((c: any) => c.id === categoryId)?.name;
                  return availableProducts.filter((p: any) => p.categoryName === categoryName);
                };

                const buySizeOptions = formData.configuration.buyScope === 'SPECIFIC_PRODUCT'
                  ? uniqueVariantSizes(buyProductVariants)
                  : formData.configuration.buyScope === 'CATEGORY'
                  ? uniqueSummarySizes(productsInCategory(formData.configuration.buyCategoryId))
                  : uniqueSummarySizes(availableProducts);

                const freeSizeOptions = formData.configuration.freeScope === 'SPECIFIC_PRODUCT'
                  ? uniqueVariantSizes(freeProductVariants)
                  : formData.configuration.freeScope === 'CATEGORY'
                  ? uniqueSummarySizes(productsInCategory(formData.configuration.freeCategoryIds?.[0] ?? null))
                  : uniqueSummarySizes(availableProducts);

                const toggleSize = (field: 'buyVariantSizes' | 'freeVariantSizes', size: string, checked: boolean) => {
                  const current = formData.configuration[field] || [];
                  const next = checked ? [...current, size] : current.filter((s: string) => s !== size);
                  setFormData({...formData, configuration: {...formData.configuration, [field]: next}});
                };

                const scopeLabel: Record<PromoScope, string> = {
                  ANY_PRODUCT: 'Any Product',
                  CATEGORY: 'Category',
                  SPECIFIC_PRODUCT: 'Specific Product',
                };

                return (
                <div className="space-y-6">
                  {/* Qualification Rules */}
                  <div className="space-y-4 p-4 rounded-lg border border-outline-variant bg-surface-container-lowest/40">
                    <h3 className="font-headline-sm text-primary pb-2 border-b border-outline-variant">🛒 Qualification Rules</h3>
                    <p className="text-xs text-on-surface-variant -mt-2">What must the customer buy?</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="field-label">Buy Scope</label>
                        <select
                          value={formData.configuration.buyScope}
                          onChange={e => {
                            const scope = e.target.value as PromoScope;
                            setFormData({...formData, configuration: {...formData.configuration, buyScope: scope, buyVariantSizes: []}});
                            if (scope !== 'SPECIFIC_PRODUCT') setSelectedBuyProductId(null);
                          }}
                          className="field-input"
                        >
                          {(Object.keys(scopeLabel) as PromoScope[]).map(s => <option key={s} value={s}>{scopeLabel[s]}</option>)}
                        </select>
                      </div>

                      {formData.configuration.buyScope === 'CATEGORY' && (
                        <div className="space-y-2">
                          <label className="field-label">Category *</label>
                          <select
                            value={formData.configuration.buyCategoryId ?? ''}
                            onChange={e => setFormData({...formData, configuration: {...formData.configuration, buyCategoryId: e.target.value ? parseInt(e.target.value) : null, buyVariantSizes: []}})}
                            className="field-input"
                          >
                            <option value="">Select a category</option>
                            {availableCategories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                          </select>
                        </div>
                      )}

                      {formData.configuration.buyScope === 'SPECIFIC_PRODUCT' && (
                        <div className="space-y-2">
                          <label className="field-label">Product *</label>
                          <select
                            value={selectedBuyProductId ?? ''}
                            onChange={e => {
                              setSelectedBuyProductId(e.target.value ? parseInt(e.target.value) : null);
                              setFormData({...formData, configuration: {...formData.configuration, buyVariantSizes: []}});
                            }}
                            className="field-input"
                          >
                            <option value="">Select a product</option>
                            {availableProducts.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                          </select>
                        </div>
                      )}

                      <div className="space-y-2 sm:col-span-2">
                        <label className="field-label">Qualifying Variant(s)</label>
                        <div className="flex flex-wrap gap-3 bg-surface-container-lowest border border-outline-variant rounded-lg p-3">
                          {buySizeOptions.length > 0 ? buySizeOptions.map(size => (
                            <label key={size} className="flex items-center gap-2 cursor-pointer text-sm">
                              <input type="checkbox"
                                checked={formData.configuration.buyVariantSizes?.includes(size)}
                                onChange={e => toggleSize('buyVariantSizes', size, e.target.checked)}
                                className="accent-primary"
                              />
                              <span>{size}</span>
                            </label>
                          )) : (
                            <span className="text-sm text-on-surface-variant">
                              {formData.configuration.buyScope === 'SPECIFIC_PRODUCT' && !selectedBuyProductId
                                ? 'Select a product first to see its variants.'
                                : formData.configuration.buyScope === 'CATEGORY' && !formData.configuration.buyCategoryId
                                ? 'Select a category first to see available sizes.'
                                : 'No variants found.'}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-on-surface-variant">Only purchases of these variant sizes count toward the promotion. Leave all unchecked to allow any size.</p>
                      </div>

                      <div className="space-y-2">
                        <label className="field-label">Minimum Quantity</label>
                        <input
                          type="number" min="1"
                          value={formData.configuration.minPurchaseQuantity}
                          onChange={e => setFormData({...formData, configuration: {...formData.configuration, minPurchaseQuantity: parseInt(e.target.value) || 1}})}
                          className="field-input"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Free Gift Configuration */}
                  <div className="space-y-4 p-4 rounded-lg border border-accent/30 bg-accent-soft/20">
                    <h3 className="font-headline-sm text-primary pb-2 border-b border-outline-variant">🎁 Free Gift Configuration</h3>
                    <p className="text-xs text-on-surface-variant -mt-2">What can the customer receive?</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="field-label">Free Gift Scope</label>
                        <select
                          value={formData.configuration.freeScope}
                          onChange={e => {
                            const scope = e.target.value as PromoScope;
                            setFormData({...formData, configuration: {...formData.configuration, freeScope: scope, freeVariantSizes: [], freeCategoryIds: []}});
                            if (scope !== 'SPECIFIC_PRODUCT') setSelectedFreeProductId(null);
                          }}
                          className="field-input"
                        >
                          {(Object.keys(scopeLabel) as PromoScope[]).map(s => <option key={s} value={s}>{scopeLabel[s]}</option>)}
                        </select>
                      </div>

                      {formData.configuration.freeScope === 'CATEGORY' && (
                        <div className="space-y-2">
                          <label className="field-label">Category *</label>
                          <select
                            value={formData.configuration.freeCategoryIds?.[0] ?? ''}
                            onChange={e => setFormData({...formData, configuration: {...formData.configuration, freeCategoryIds: e.target.value ? [parseInt(e.target.value)] : [], freeVariantSizes: []}})}
                            className="field-input"
                          >
                            <option value="">Select a category</option>
                            {availableCategories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                          </select>
                        </div>
                      )}

                      {formData.configuration.freeScope === 'SPECIFIC_PRODUCT' && (
                        <div className="space-y-2">
                          <label className="field-label">Product *</label>
                          <select
                            value={selectedFreeProductId ?? ''}
                            onChange={e => {
                              setSelectedFreeProductId(e.target.value ? parseInt(e.target.value) : null);
                              setFormData({...formData, configuration: {...formData.configuration, freeVariantSizes: []}});
                            }}
                            className="field-input"
                          >
                            <option value="">Select a product</option>
                            {availableProducts.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                          </select>
                        </div>
                      )}

                      <div className="space-y-2 sm:col-span-2">
                        <label className="field-label">Free Variant(s)</label>
                        <div className="flex flex-wrap gap-3 bg-surface-container-lowest border border-outline-variant rounded-lg p-3">
                          {freeSizeOptions.length > 0 ? freeSizeOptions.map(size => (
                            <label key={size} className="flex items-center gap-2 cursor-pointer text-sm">
                              <input type="checkbox"
                                checked={formData.configuration.freeVariantSizes?.includes(size)}
                                onChange={e => toggleSize('freeVariantSizes', size, e.target.checked)}
                                className="accent-primary"
                              />
                              <span>{size}</span>
                            </label>
                          )) : (
                            <span className="text-sm text-on-surface-variant">
                              {formData.configuration.freeScope === 'SPECIFIC_PRODUCT' && !selectedFreeProductId
                                ? 'Select a product first to see its variants.'
                                : formData.configuration.freeScope === 'CATEGORY' && !formData.configuration.freeCategoryIds?.length
                                ? 'Select a category first to see available sizes.'
                                : 'No variants found.'}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-on-surface-variant">Only these variant sizes can be selected as the free gift.</p>
                      </div>

                      <div className="space-y-2">
                        <label className="field-label">Free Quantity</label>
                        <input
                          type="number" min="1"
                          value={formData.configuration.maxFreeQuantity}
                          onChange={e => setFormData({...formData, configuration: {...formData.configuration, maxFreeQuantity: parseInt(e.target.value) || 1}})}
                          className="field-input"
                        />
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-6 pt-2">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox"
                          checked={formData.configuration.allowCustomerSelection}
                          onChange={e => setFormData({...formData, configuration: {...formData.configuration, allowCustomerSelection: e.target.checked}})}
                          className="w-5 h-5 accent-primary"
                        />
                        <span className="field-label">Allow Customer Selection <span className="text-xs text-on-surface-variant">(show product choice UI)</span></span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox"
                          checked={formData.configuration.autoAddFreeProduct}
                          onChange={e => setFormData({...formData, configuration: {...formData.configuration, autoAddFreeProduct: e.target.checked}})}
                          className="w-5 h-5 accent-primary"
                        />
                        <span className="field-label">Auto Add Free Product <span className="text-xs text-on-surface-variant">(only if exactly 1 eligible product)</span></span>
                      </label>
                    </div>
                  </div>
                </div>
                );
              })()}

              {/* ③ Conditions & Limits */}
              <div className="py-6 space-y-4" style={{ borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)' }}>
                <div className="flex items-center gap-2.5 mb-1">
                  <span className="w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center shrink-0 select-none" style={{ background: 'var(--accent-soft)', color: 'var(--accent-hover)' }}>3</span>
                  <span className="text-[11px] font-bold uppercase tracking-[0.14em]" style={{ color: 'var(--text-secondary)' }}>Conditions &amp; Limits</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="field-label">Minimum Cart Value (₹)</label>
                    <input type="number" min="0" value={formData.minCartValue} onChange={e => setFormData({...formData, minCartValue: e.target.value})} className="field-input" placeholder="No minimum" />
                    <p className="text-[11px] mt-1" style={{ color: 'var(--text-tertiary)' }}>Promotion applies only when cart reaches this amount.</p>
                  </div>
                  {formData.promotionType !== 'FIRST_ORDER' && (
                    <div className="flex flex-col justify-center">
                      <label className="flex items-center gap-2.5 cursor-pointer mt-2">
                        <input type="checkbox" checked={formData.configuration.firstOrderOnly} onChange={e => setFormData({...formData, configuration: {...formData.configuration, firstOrderOnly: e.target.checked}})} className="w-4 h-4 accent-primary" />
                        <span className="text-sm font-medium" style={{ color: 'var(--text)' }}>First order only</span>
                      </label>
                    </div>
                  )}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="field-label">Total Usage Limit</label>
                    <input type="number" min="0" value={formData.usageLimit} onChange={e => setFormData({...formData, usageLimit: e.target.value})} className="field-input" placeholder="Unlimited" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="field-label">Per User Limit</label>
                    <input type="number" min="0" value={formData.perUserLimit} onChange={e => setFormData({...formData, perUserLimit: e.target.value})} className="field-input" placeholder="Unlimited" />
                  </div>
                </div>
                <div className="flex flex-wrap gap-x-6 gap-y-3 pt-1">
                  <label className="flex items-center gap-2.5 cursor-pointer">
                    <input type="checkbox" checked={formData.active} onChange={e => setFormData({...formData, active: e.target.checked})} className="w-4 h-4 accent-primary" />
                    <span className="text-sm font-medium" style={{ color: 'var(--text)' }}>Active</span>
                  </label>
                  <label className="flex items-center gap-2.5 cursor-pointer">
                    <input type="checkbox" checked={formData.stackable} onChange={e => setFormData({...formData, stackable: e.target.checked})} className="w-4 h-4 accent-primary" />
                    <span className="text-sm font-medium" style={{ color: 'var(--text)' }}>Allow stacking with other offers</span>
                  </label>
                </div>
              </div>

              {/* ④ Schedule */}
              <div className="py-6 space-y-4" style={{ borderBottom: '1px solid var(--border)' }}>
                <div className="flex items-center gap-2.5 mb-1">
                  <span className="w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center shrink-0 select-none" style={{ background: 'var(--accent-soft)', color: 'var(--accent-hover)' }}>4</span>
                  <span className="text-[11px] font-bold uppercase tracking-[0.14em]" style={{ color: 'var(--text-secondary)' }}>Schedule</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="field-label">Start Date</label>
                    <input type="datetime-local" value={formData.startDate} onChange={e => setFormData({...formData, startDate: e.target.value})} className="field-input" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="field-label">End Date</label>
                    <input type="datetime-local" value={formData.endDate} onChange={e => setFormData({...formData, endDate: e.target.value})} className="field-input" />
                  </div>
                </div>
              </div>

              {/* ⑤ Advanced */}
              <div className="pt-5">
                <details className="group">
                  <summary className="flex items-center gap-2.5 cursor-pointer list-none select-none">
                    <span className="w-5 h-5 rounded-full text-[11px] font-bold flex items-center justify-center shrink-0 group-open:rotate-45 transition-transform" style={{ background: 'var(--surface-alt)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}>+</span>
                    <span className="text-[11px] font-bold uppercase tracking-[0.14em]" style={{ color: 'var(--text-secondary)' }}>Advanced Settings</span>
                  </summary>
                  <div className="mt-4 pl-7 space-y-1.5">
                    <label className="field-label">Priority</label>
                    <input type="number" value={formData.priority} onChange={e => setFormData({...formData, priority: parseInt(e.target.value)})} className="field-input" style={{ maxWidth: '8rem' }} />
                    <p className="text-[11px] mt-1" style={{ color: 'var(--text-tertiary)' }}>Higher priority promotions run first when multiple promotions are active.</p>
                  </div>
                </details>
              </div>

              </div>
              {/* end main form column */}

              {/* ── Live Preview Panel (desktop only) ── */}
              <div className="hidden lg:block w-52 shrink-0">
                <div className="sticky top-0 rounded-xl p-4 space-y-3" style={{ background: 'var(--surface-alt)', border: '1px solid var(--border)' }}>
                  <p className="text-[9px] uppercase tracking-[0.2em] font-bold" style={{ color: 'var(--text-tertiary)' }}>Preview</p>
                  {formData.name
                    ? <p className="font-serif text-[15px] leading-snug" style={{ color: 'var(--text)' }}>{formData.name}</p>
                    : <p className="text-sm italic" style={{ color: 'var(--text-tertiary)' }}>Promotion name…</p>
                  }
                  {formData.code && (
                    <span className="font-mono text-[11px] px-2 py-1 rounded block w-fit" style={{ background: 'var(--accent-soft)', color: 'var(--accent-hover)' }}>{formData.code}</span>
                  )}
                  {formData.promotionType === 'FREE_SHIPPING' && <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>🚚 Free Shipping</p>}
                  {formData.promotionType === 'FREE_PRODUCT' && <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>🎁 Free Product</p>}
                  {formData.promotionType !== 'FREE_SHIPPING' && formData.promotionType !== 'FREE_PRODUCT' && formData.discountValue !== '' && (
                    <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>
                      {formData.discountType === 'PERCENTAGE' ? `${formData.discountValue}% off` : `₹${formData.discountValue} off`}
                    </p>
                  )}
                  <div className="space-y-1 pt-2" style={{ borderTop: '1px solid var(--border)' }}>
                    {formData.minCartValue && <p className="text-[11px]" style={{ color: 'var(--text-secondary)' }}>Min order: ₹{formData.minCartValue}</p>}
                    {formData.maxDiscountValue && formData.discountType === 'PERCENTAGE' && <p className="text-[11px]" style={{ color: 'var(--text-secondary)' }}>Max discount: ₹{formData.maxDiscountValue}</p>}
                    {(formData.configuration.firstOrderOnly || formData.promotionType === 'FIRST_ORDER') && <p className="text-[11px]" style={{ color: 'var(--text-secondary)' }}>First order only</p>}
                    {(formData.startDate || formData.endDate) && (
                      <p className="text-[11px]" style={{ color: 'var(--text-secondary)' }}>
                        {formData.startDate ? new Date(formData.startDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : '—'}
                        {' – '}
                        {formData.endDate ? new Date(formData.endDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : '—'}
                      </p>
                    )}
                  </div>
                  {!formData.active && (
                    <span className="text-[9px] uppercase tracking-widest font-bold px-2 py-1 rounded block w-fit" style={{ background: 'var(--warning-bg)', color: 'var(--warning)' }}>Inactive</span>
                  )}
                </div>
              </div>

              </div>
              {/* end two-column row */}

              {/* Sticky footer */}
              <div className="sticky bottom-0 -mx-6 px-6 py-4 mt-6 flex justify-end gap-3" style={{ background: 'var(--surface)', borderTop: '1px solid var(--border)' }}>
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-5 py-2.5 rounded-lg text-sm font-semibold transition-colors" style={{ color: 'var(--text-secondary)', border: '1px solid var(--border)', background: 'transparent' }}>Cancel</button>
                <button type="submit" className="px-5 py-2.5 rounded-lg text-sm font-semibold transition-colors" style={{ background: 'var(--ink)', color: 'var(--text-inverse)' }}>
                  {editingPromoId ? 'Update Promotion' : 'Save Promotion'}
                </button>
              </div>
            </form>
      </Modal>


      <ConfirmationDialog
        isOpen={deleteConfirmId !== null}
        onClose={() => !isDeleting && setDeleteConfirmId(null)}
        onConfirm={confirmDelete}
        title="Delete Promotion"
        description="This action permanently deletes this promotion. Historical orders will remain unaffected. This action cannot be undone."
        entityName={promotions.find(p => p.id === deleteConfirmId)?.name}
        warningMessage={promotions.find(p => p.id === deleteConfirmId)?.active ? '⚠ This promotion is currently active. Deleting it will immediately stop customers from receiving this offer. Consider disabling it instead.' : undefined}
        confirmText="Delete Promotion"
        isLoading={isDeleting}
        actionType="DELETE"
      />
    </div>
  );
};
