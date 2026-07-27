import React, { useState, useEffect } from 'react';
import { promotionService } from '../../services/promotionService';
import { productService } from '../../services/productService';
import { categoryService } from '../../services/categoryService';
import toast from 'react-hot-toast';
import { Loader } from '../../components/ui/Loader';
import { ConfirmationDialog } from '../../components/ui/ConfirmationDialog';

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
      buyVariantIds: [] as number[],
      buyCategoryId: null as number | null,
      buyProductId: null as number | null,
      minPurchaseQuantity: 1,
      freeCategoryIds: [] as number[],
      freeVariantIds: [] as number[],
      freeProductIds: [] as number[],
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
        buyVariantIds: promo.configuration?.buyVariantIds || [],
        buyCategoryId: promo.configuration?.buyCategoryId || null,
        buyProductId: promo.configuration?.buyProductId || null,
        minPurchaseQuantity: promo.configuration?.minPurchaseQuantity ?? 1,
        freeCategoryIds: promo.configuration?.freeCategoryIds || [],
        freeVariantIds: promo.configuration?.freeVariantIds || [],
        freeProductIds: promo.configuration?.freeProductIds || [],
        maxFreeQuantity: promo.configuration?.maxFreeQuantity ?? 1,
        allowCustomerSelection: promo.configuration?.allowCustomerSelection ?? true,
        autoAddFreeProduct: promo.configuration?.autoAddFreeProduct ?? false,
      }
    });
    // Set UI dropdowns based on existing variant selections if possible
    // This is tricky because we only have variant IDs, not product IDs, but for now we reset them
    setSelectedBuyProductId(promo.configuration?.buyProductId || null);
    setSelectedFreeProductId(null); // The backend didn't store a single freeProductId, it stored an array or just variants.
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

    if (payload.promotionType === 'FREE_PRODUCT') {
      // FREE_PRODUCT: set discountType to FREE_ITEM (no monetary discount)
      payload.discountType = 'FREE_ITEM';
      payload.discountValue = 0;
      payload.code = null; // FREE_PRODUCT is automatic (triggered by cart content)
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
      payload.configuration.buyCategoryId = payload.configuration.buyCategoryId ? parseInt(payload.configuration.buyCategoryId) : null;
      payload.configuration.buyProductId = payload.configuration.buyProductId ? parseInt(payload.configuration.buyProductId) : null;
    } else {
      payload.configuration.buyVariantIds = null;
      payload.configuration.buyCategoryId = null;
      payload.configuration.buyProductId = null;
      payload.configuration.minPurchaseQuantity = null;
      payload.configuration.freeCategoryIds = null;
      payload.configuration.freeVariantIds = null;
      payload.configuration.freeProductIds = null;
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
          className="bg-primary text-on-primary px-4 py-2 rounded-lg font-label-lg flex items-center gap-2 hover:bg-primary/90 transition-colors"
        >
          <span className="material-symbols-outlined text-sm">add</span>
          Add Promotion
        </button>
      </div>

      <div className="bg-surface rounded-xl border border-outline-variant overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-surface-container-low border-b border-outline-variant">
              <th className="p-4 font-label-lg text-on-surface-variant">Name</th>
              <th className="p-4 font-label-lg text-on-surface-variant">Type</th>
              <th className="p-4 font-label-lg text-on-surface-variant">Code</th>
              <th className="p-4 font-label-lg text-on-surface-variant">Value</th>
              <th className="p-4 font-label-lg text-on-surface-variant">Priority</th>
              <th className="p-4 font-label-lg text-on-surface-variant">Status</th>
              <th className="p-4 font-label-lg text-on-surface-variant text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {promotions.map((promo) => (
              <tr key={promo.id} className="border-b border-outline-variant last:border-0 hover:bg-surface-container-lowest">
                <td className="p-4">
                  <div className="font-body-lg text-on-surface">{promo.name}</div>
                  <div className="font-body-sm text-on-surface-variant text-xs">{promo.description}</div>
                </td>
                <td className="p-4 font-body-md text-on-surface text-sm">{promo.promotionType?.replace(/_/g, ' ')}</td>
                <td className="p-4 font-body-md text-on-surface">
                  {promo.code 
                    ? <span className="font-mono bg-primary/10 text-primary px-2 py-0.5 rounded text-xs">{promo.code}</span>
                    : <span className="text-on-surface-variant text-xs">Automatic</span>
                  }
                </td>
                <td className="p-4 font-body-md text-on-surface">
                  {promo.promotionType === 'FREE_PRODUCT'
                    ? `Free Product Campaign`
                    : promo.promotionType === 'FREE_SHIPPING'
                    ? 'Free Shipping'
                    : promo.discountType === 'PERCENTAGE'
                    ? `${promo.discountValue}%`
                    : `₹${promo.discountValue}`
                  }
                </td>
                <td className="p-4 font-body-md text-on-surface">{promo.priority}</td>
                <td className="p-4">
                  <button 
                    onClick={() => toggleStatus(promo.id, promo.active)}
                    className={`px-2 py-1 rounded-full text-xs font-label-sm ${promo.active ? 'bg-primary/10 text-primary' : 'bg-error/10 text-error'}`}
                  >
                    {promo.active ? 'Active' : 'Inactive'}
                  </button>
                </td>
                <td className="p-4 text-right space-x-2">
                  <button onClick={() => openEditModal(promo)} className="text-primary hover:text-primary/80 p-2" title="Edit">
                    <span className="material-symbols-outlined text-[20px]">edit</span>
                  </button>
                  <button onClick={() => deletePromotion(promo.id)} className="text-error hover:text-error/80 p-2" title="Delete">
                    <span className="material-symbols-outlined text-[20px]">delete</span>
                  </button>
                </td>
              </tr>
            ))}
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

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-surface rounded-xl shadow-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-surface p-6 border-b border-outline-variant flex justify-between items-center z-10">
              <h2 className="font-headline-sm text-headline-sm text-primary">
                {editingPromoId ? 'Edit Promotion' : 'Create Promotion'}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="text-on-surface-variant hover:text-on-surface">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              {/* Basic Details */}
              <div className="space-y-4">
                <h3 className="font-headline-sm text-primary border-b border-outline-variant pb-2">Basic Details</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="font-label-md text-on-surface">Name *</label>
                    <input required type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full bg-surface-container-lowest border border-outline-variant rounded-lg p-3 text-on-surface focus:outline-none focus:border-primary" />
                  </div>
                  <div className="space-y-2">
                    <label className="font-label-md text-on-surface">Coupon Code (Optional)</label>
                    <input
                      type="text"
                      value={formData.code}
                      onChange={e => setFormData({...formData, code: e.target.value.toUpperCase()})}
                      className="w-full bg-surface-container-lowest border border-outline-variant rounded-lg p-3 text-on-surface focus:outline-none focus:border-primary font-mono"
                      placeholder="e.g. EID200"
                      disabled={formData.promotionType === 'FREE_SHIPPING' || formData.promotionType === 'FIRST_ORDER'}
                    />
                    {(formData.promotionType === 'FREE_SHIPPING' || formData.promotionType === 'FIRST_ORDER') && (
                      <p className="text-xs text-on-surface-variant">This promotion type is automatic – no coupon code needed.</p>
                    )}
                  </div>
                </div>
                
                <div className="space-y-2">
                  <label className="font-label-md text-on-surface">Description</label>
                  <textarea value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full bg-surface-container-lowest border border-outline-variant rounded-lg p-3 text-on-surface focus:outline-none focus:border-primary" rows={2}></textarea>
                </div>
              </div>

              {/* Promotion Type */}
              <div className="space-y-4">
                <h3 className="font-headline-sm text-primary border-b border-outline-variant pb-2">Promotion Type</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="font-label-md text-on-surface">Promotion Type</label>
                    <select value={formData.promotionType} onChange={e => setFormData({...formData, promotionType: e.target.value})} className="w-full bg-surface-container-lowest border border-outline-variant rounded-lg p-3 text-on-surface focus:outline-none focus:border-primary">
                      <option value="CART_DISCOUNT">Cart Discount (Flat/% OFF entire cart)</option>
                      <option value="PRODUCT_DISCOUNT">Product Discount (specific products)</option>
                      <option value="CATEGORY_DISCOUNT">Category Discount (specific categories)</option>
                      <option value="FREE_SHIPPING">Free Shipping</option>
                      <option value="FIRST_ORDER">First Order Discount</option>
                      <option value="FREE_PRODUCT">🎁 Free Product Campaign</option>
                    </select>
                  </div>
                  
                  {formData.promotionType !== 'FREE_SHIPPING' && formData.promotionType !== 'FIRST_ORDER' && (
                    <div className="space-y-2">
                      <label className="font-label-md text-on-surface">Discount Type</label>
                      <select value={formData.discountType} onChange={e => setFormData({...formData, discountType: e.target.value})} className="w-full bg-surface-container-lowest border border-outline-variant rounded-lg p-3 text-on-surface focus:outline-none focus:border-primary">
                        <option value="PERCENTAGE">Percentage (%)</option>
                        <option value="FIXED_AMOUNT">Fixed Amount (₹)</option>
                      </select>
                    </div>
                  )}

                  {formData.promotionType === 'FIRST_ORDER' && (
                    <div className="space-y-2">
                      <label className="font-label-md text-on-surface">Discount Type</label>
                      <select value={formData.discountType} onChange={e => setFormData({...formData, discountType: e.target.value})} className="w-full bg-surface-container-lowest border border-outline-variant rounded-lg p-3 text-on-surface focus:outline-none focus:border-primary">
                        <option value="PERCENTAGE">Percentage (%)</option>
                        <option value="FIXED_AMOUNT">Fixed Amount (₹)</option>
                      </select>
                    </div>
                  )}


                </div>

                {formData.promotionType !== 'FREE_SHIPPING' && formData.promotionType !== 'FIRST_ORDER' && formData.promotionType !== 'FREE_PRODUCT' && (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="font-label-md text-on-surface">Discount Value {formData.discountType === 'PERCENTAGE' ? '(%)' : '(₹)'}</label>
                      <input type="number" min="0" value={formData.discountValue} onChange={e => setFormData({...formData, discountValue: e.target.value})} className="w-full bg-surface-container-lowest border border-outline-variant rounded-lg p-3 text-on-surface focus:outline-none focus:border-primary" placeholder="e.g. 20" />
                    </div>
                    {formData.discountType === 'PERCENTAGE' && (
                      <div className="space-y-2">
                        <label className="font-label-md text-on-surface">Max Discount Amount ₹ (Optional)</label>
                        <input type="number" min="0" value={formData.maxDiscountValue} onChange={e => setFormData({...formData, maxDiscountValue: e.target.value})} className="w-full bg-surface-container-lowest border border-outline-variant rounded-lg p-3 text-on-surface focus:outline-none focus:border-primary" placeholder="Leave empty for no cap" />
                      </div>
                    )}
                  </div>
                )}
                {formData.promotionType === 'FREE_PRODUCT' && (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
                    <strong>🎁 Free Product Campaign:</strong> Customers who meet the qualification rules can choose a free product. No monetary discount is applied.
                  </div>
                )}
              </div>

              {/* FREE_PRODUCT Configuration */}
              {formData.promotionType === 'FREE_PRODUCT' && (
                <div className="space-y-6">
                  {/* Qualification Rules */}
                  <div className="space-y-4">
                    <h3 className="font-headline-sm text-primary border-b border-outline-variant pb-2">🛒 Qualification Rules (What must the customer buy?)</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="font-label-md text-on-surface">Buy Category *</label>
                        <select
                          value={formData.configuration.buyCategoryId ?? ''}
                          onChange={e => setFormData({...formData, configuration: {...formData.configuration, buyCategoryId: e.target.value ? parseInt(e.target.value) : null}})}
                          className="w-full bg-surface-container-lowest border border-outline-variant rounded-lg p-3 text-on-surface focus:outline-none focus:border-primary"
                        >
                          <option value="">Any Category</option>
                          {availableCategories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="font-label-md text-on-surface">Buy Product <span className="text-xs text-on-surface-variant">(optional)</span></label>
                        <select
                          value={selectedBuyProductId ?? ''}
                          onChange={e => setSelectedBuyProductId(e.target.value ? parseInt(e.target.value) : null)}
                          className="w-full bg-surface-container-lowest border border-outline-variant rounded-lg p-3 text-on-surface focus:outline-none focus:border-primary"
                        >
                          <option value="">Any product in category</option>
                          {availableProducts.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="font-label-md text-on-surface">Specific Buy Variants <span className="text-xs text-on-surface-variant">(optional)</span></label>
                        <div className="max-h-48 overflow-y-auto bg-surface-container-lowest border border-outline-variant rounded-lg p-2 space-y-1">
                          {selectedBuyProductId ? (
                            buyProductVariants.map((v: any) => (
                              <label key={`buy-${v.id}`} className="flex items-center gap-2 cursor-pointer text-sm">
                                <input type="checkbox"
                                  checked={formData.configuration.buyVariantIds?.includes(v.id)}
                                  onChange={e => {
                                    const ids = e.target.checked
                                      ? [...(formData.configuration.buyVariantIds || []), v.id]
                                      : (formData.configuration.buyVariantIds || []).filter(id => id !== v.id);
                                    setFormData({...formData, configuration: {...formData.configuration, buyVariantIds: ids}});
                                  }}
                                  className="accent-primary"
                                />
                                <span>{v.size}</span>
                              </label>
                            ))
                          ) : (
                            <div className="text-sm text-on-surface-variant p-2">Select a Buy Product first to see variants.</div>
                          )}
                        </div>
                        <p className="text-xs text-on-surface-variant">Leave empty to allow any variant.</p>
                      </div>
                      <div className="space-y-2">
                        <label className="font-label-md text-on-surface">Minimum Purchase Quantity</label>
                        <input
                          type="number" min="1"
                          value={formData.configuration.minPurchaseQuantity}
                          onChange={e => setFormData({...formData, configuration: {...formData.configuration, minPurchaseQuantity: parseInt(e.target.value) || 1}})}
                          className="w-full bg-surface-container-lowest border border-outline-variant rounded-lg p-3 text-on-surface focus:outline-none focus:border-primary"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Free Product Configuration */}
                  <div className="space-y-4">
                    <h3 className="font-headline-sm text-primary border-b border-outline-variant pb-2">🎁 Free Product Configuration (What does the customer get?)</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="font-label-md text-on-surface">Free Category *</label>
                        <div className="max-h-32 overflow-y-auto bg-surface-container-lowest border border-outline-variant rounded-lg p-2 space-y-1">
                          {availableCategories.map(c => (
                            <label key={c.id} className="flex items-center gap-2 cursor-pointer text-sm">
                              <input type="checkbox"
                                checked={formData.configuration.freeCategoryIds?.includes(c.id)}
                                onChange={e => {
                                  const ids = e.target.checked
                                    ? [...(formData.configuration.freeCategoryIds || []), c.id]
                                    : (formData.configuration.freeCategoryIds || []).filter(id => id !== c.id);
                                  setFormData({...formData, configuration: {...formData.configuration, freeCategoryIds: ids}});
                                }}
                                className="accent-primary"
                              />
                              <span>{c.name}</span>
                            </label>
                          ))}
                        </div>
                        <p className="text-xs text-on-surface-variant">Leave empty to use same as Buy Category.</p>
                      </div>
                      <div className="space-y-2">
                        <label className="font-label-md text-on-surface">Free Product *</label>
                        <select
                          value={selectedFreeProductId ?? ''}
                          onChange={e => setSelectedFreeProductId(e.target.value ? parseInt(e.target.value) : null)}
                          className="w-full bg-surface-container-lowest border border-outline-variant rounded-lg p-3 text-on-surface focus:outline-none focus:border-primary"
                        >
                          <option value="">Select a Product</option>
                          {availableProducts.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="font-label-md text-on-surface">Specific Free Variants *</label>
                        <div className="max-h-48 overflow-y-auto bg-surface-container-lowest border border-outline-variant rounded-lg p-2 space-y-1">
                          {selectedFreeProductId ? (
                            freeProductVariants.map((v: any) => (
                              <label key={`free-${v.id}`} className="flex items-center gap-2 cursor-pointer text-sm">
                                <input type="checkbox"
                                  checked={formData.configuration.freeVariantIds?.includes(v.id)}
                                  onChange={e => {
                                    const ids = e.target.checked
                                      ? [...(formData.configuration.freeVariantIds || []), v.id]
                                      : (formData.configuration.freeVariantIds || []).filter(id => id !== v.id);
                                    setFormData({...formData, configuration: {...formData.configuration, freeVariantIds: ids}});
                                  }}
                                  className="accent-primary"
                                />
                                <span>{v.size}</span>
                              </label>
                            ))
                          ) : (
                            <div className="text-sm text-on-surface-variant p-2">Select a Free Product first to see variants.</div>
                          )}
                        </div>
                        <p className="text-xs text-red-600 font-medium">⚠ Select exact variants to be given away for free.</p>
                      </div>
                      <div className="space-y-2">
                        <label className="font-label-md text-on-surface">Max Free Quantity</label>
                        <input
                          type="number" min="1"
                          value={formData.configuration.maxFreeQuantity}
                          onChange={e => setFormData({...formData, configuration: {...formData.configuration, maxFreeQuantity: parseInt(e.target.value) || 1}})}
                          className="w-full bg-surface-container-lowest border border-outline-variant rounded-lg p-3 text-on-surface focus:outline-none focus:border-primary"
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
                        <span className="font-label-md text-on-surface">Allow Customer Selection <span className="text-xs text-on-surface-variant">(show product choice UI)</span></span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox"
                          checked={formData.configuration.autoAddFreeProduct}
                          onChange={e => setFormData({...formData, configuration: {...formData.configuration, autoAddFreeProduct: e.target.checked}})}
                          className="w-5 h-5 accent-primary"
                        />
                        <span className="font-label-md text-on-surface">Auto Add Free Product <span className="text-xs text-on-surface-variant">(only if exactly 1 eligible product)</span></span>
                      </label>
                    </div>
                  </div>
                </div>
              )}

              {/* Dynamic Type Config (existing) */}
              {formData.promotionType === 'PRODUCT_DISCOUNT' && (
                <div className="space-y-4">
                  <h3 className="font-headline-sm text-primary border-b border-outline-variant pb-2">Select Products</h3>
                  <p className="text-xs text-on-surface-variant">Leave all unchecked to apply to ALL products.</p>
                  <div className="max-h-48 overflow-y-auto bg-surface-container-lowest border border-outline-variant rounded-lg p-3 space-y-2">
                    {availableProducts.map(p => (
                      <label key={p.id} className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={formData.configuration.applicableProductIds?.includes(p.id)} onChange={e => {
                          const currentIds = formData.configuration.applicableProductIds || [];
                          const ids = e.target.checked 
                            ? [...currentIds, p.id]
                            : currentIds.filter(id => id !== p.id);
                          setFormData({...formData, configuration: {...formData.configuration, applicableProductIds: ids}});
                        }} className="accent-primary" />
                        <span className="text-on-surface font-body-md">{p.name}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {formData.promotionType === 'CATEGORY_DISCOUNT' && (
                <div className="space-y-4">
                  <h3 className="font-headline-sm text-primary border-b border-outline-variant pb-2">Select Categories</h3>
                  <p className="text-xs text-on-surface-variant">Leave all unchecked to apply to ALL categories.</p>
                  <div className="max-h-48 overflow-y-auto bg-surface-container-lowest border border-outline-variant rounded-lg p-3 space-y-2">
                    {availableCategories.map(c => (
                      <label key={c.id} className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={formData.configuration.applicableCategoryIds?.includes(c.id)} onChange={e => {
                          const currentIds = formData.configuration.applicableCategoryIds || [];
                          const ids = e.target.checked 
                            ? [...currentIds, c.id]
                            : currentIds.filter(id => id !== c.id);
                          setFormData({...formData, configuration: {...formData.configuration, applicableCategoryIds: ids}});
                        }} className="accent-primary" />
                        <span className="text-on-surface font-body-md">{c.name}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}


              {/* Conditions and Limits */}
              <div className="space-y-4">
                <h3 className="font-headline-sm text-primary border-b border-outline-variant pb-2">Conditions & Limits</h3>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="font-label-md text-on-surface">Min Cart Value ₹ (Optional)</label>
                    <input type="number" min="0" value={formData.minCartValue} onChange={e => setFormData({...formData, minCartValue: e.target.value})} className="w-full bg-surface-container-lowest border border-outline-variant rounded-lg p-3 text-on-surface focus:outline-none focus:border-primary" placeholder="No minimum" />
                  </div>
                  <div className="space-y-2">
                    <label className="font-label-md text-on-surface">Priority (Higher runs first)</label>
                    <input type="number" value={formData.priority} onChange={e => setFormData({...formData, priority: parseInt(e.target.value)})} className="w-full bg-surface-container-lowest border border-outline-variant rounded-lg p-3 text-on-surface focus:outline-none focus:border-primary" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="font-label-md text-on-surface">Total Usage Limit</label>
                    <input type="number" min="0" value={formData.usageLimit} onChange={e => setFormData({...formData, usageLimit: e.target.value})} className="w-full bg-surface-container-lowest border border-outline-variant rounded-lg p-3 text-on-surface focus:outline-none focus:border-primary" placeholder="Unlimited" />
                  </div>
                  <div className="space-y-2">
                    <label className="font-label-md text-on-surface">Per User Limit</label>
                    <input type="number" min="0" value={formData.perUserLimit} onChange={e => setFormData({...formData, perUserLimit: e.target.value})} className="w-full bg-surface-container-lowest border border-outline-variant rounded-lg p-3 text-on-surface focus:outline-none focus:border-primary" placeholder="Unlimited" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="font-label-md text-on-surface">Start Date</label>
                    <input type="datetime-local" value={formData.startDate} onChange={e => setFormData({...formData, startDate: e.target.value})} className="w-full bg-surface-container-lowest border border-outline-variant rounded-lg p-3 text-on-surface focus:outline-none focus:border-primary" />
                  </div>
                  <div className="space-y-2">
                    <label className="font-label-md text-on-surface">End Date</label>
                    <input type="datetime-local" value={formData.endDate} onChange={e => setFormData({...formData, endDate: e.target.value})} className="w-full bg-surface-container-lowest border border-outline-variant rounded-lg p-3 text-on-surface focus:outline-none focus:border-primary" />
                  </div>
                </div>

                <div className="flex flex-wrap gap-6 pt-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={formData.active} onChange={e => setFormData({...formData, active: e.target.checked})} className="w-5 h-5 accent-primary" />
                    <span className="font-label-md text-on-surface">Active</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={formData.stackable} onChange={e => setFormData({...formData, stackable: e.target.checked})} className="w-5 h-5 accent-primary" />
                    <span className="font-label-md text-on-surface">Stackable with other offers</span>
                  </label>
                  {formData.promotionType !== 'FIRST_ORDER' && (
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={formData.configuration.firstOrderOnly} onChange={e => setFormData({...formData, configuration: {...formData.configuration, firstOrderOnly: e.target.checked}})} className="w-5 h-5 accent-primary" />
                      <span className="font-label-md text-on-surface">First Order Only</span>
                    </label>
                  )}
                </div>
              </div>

              <div className="pt-4 border-t border-outline-variant flex justify-end gap-4">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-2 rounded-lg font-label-lg text-on-surface-variant hover:bg-surface-container-high transition-colors">Cancel</button>
                <button type="submit" className="px-6 py-2 rounded-lg font-label-lg bg-primary text-on-primary hover:bg-primary/90 transition-colors">
                  {editingPromoId ? 'Update Promotion' : 'Save Promotion'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      
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
