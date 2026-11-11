import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Package,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  Plus,
  Trash2,
  Loader2,
  ArrowLeft,
  Save,
  Info,
  Boxes,
  HelpCircle
} from 'lucide-react';
import toast from 'react-hot-toast';
import { productService } from '../../services/productService';
import { giftSetService } from '../../services/giftSetService';
import { GiftSetImageManager, type ManagedGiftSetImage } from './GiftSetImageManager';
import type { GiftSet, GiftSetRequest } from '../../types/giftSet';
import type { Product } from '../../types';
import { getImageUrl } from '../../utils/getImageUrl';
import { formatPrice } from '../../utils/formatPrice';

export interface SelectedComponent {
  tempId: string;
  productId: number;
  productName: string;
  productSlug?: string;
  productThumbnail?: string;
  variantId: number;
  variantSize: string;
  sku: string;
  variantPrice: number;
  currentStock: number;
  quantityPerSet: number;
  displayOrder?: number;
}

interface GiftSetFormProps {
  initialData?: GiftSet;
  isEdit?: boolean;
}

export const GiftSetForm: React.FC<GiftSetFormProps> = ({ initialData, isEdit = false }) => {
  const navigate = useNavigate();

  // Form Fields
  const [name, setName] = useState(initialData?.name || '');
  const [slug, setSlug] = useState(initialData?.slug || '');
  const [description, setDescription] = useState(initialData?.description || '');
  const [packagingNotes, setPackagingNotes] = useState(
    initialData?.packagingNotes ||
    'Presented in a bespoke velvet-lined presentation box with gold-embossed Al Ahad Attars monogram, custom fragrance cards, and protective sleeve.'
  );
  const [price, setPrice] = useState<string>(initialData?.price ? String(initialData.price) : '');
  const [salePrice, setSalePrice] = useState<string>(initialData?.salePrice ? String(initialData.salePrice) : '');
  const [active, setActive] = useState<boolean>(initialData?.active ?? true);
  const [featured, setFeatured] = useState<boolean>(initialData?.featured ?? false);
  const [displayOrder, setDisplayOrder] = useState<number>(initialData?.displayOrder ?? 0);

  // Components State
  const [components, setComponents] = useState<SelectedComponent[]>(() => {
    if (!initialData?.items) return [];
    return initialData.items.map((item, idx) => ({
      tempId: `comp_${item.id || idx}`,
      productId: item.productId,
      productName: item.productName,
      productSlug: item.productSlug,
      productThumbnail: item.productImage,
      variantId: item.variantId,
      variantSize: item.variantSize,
      sku: item.sku,
      variantPrice: item.variantOriginalPrice || 0,
      currentStock: item.currentVariantStock ?? 0,
      quantityPerSet: item.quantity,
      displayOrder: item.displayOrder ?? idx,
    }));
  });

  // Images State
  const [images, setImages] = useState<ManagedGiftSetImage[]>(() => {
    if (!initialData?.images) return [];
    return initialData.images.map((img) => ({
      id: img.id,
      imageUrl: img.imageUrl,
      isPrimary: img.isPrimary,
      displayOrder: img.displayOrder,
      altText: img.altText,
    }));
  });

  // Catalog Products Picker State
  const [catalogProducts, setCatalogProducts] = useState<Product[]>([]);
  const [loadingCatalog, setLoadingCatalog] = useState(false);
  const [productDetailsCache, setProductDetailsCache] = useState<Record<string, Product>>({});
  const [loadingVariants, setLoadingVariants] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [selectedVariantId, setSelectedVariantId] = useState<string>('');
  const [componentQuantity, setComponentQuantity] = useState<number>(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Auto-slugify on name change if creating or if slug hasn't been manually detached
  const [isSlugManuallyEdited, setIsSlugManuallyEdited] = useState(Boolean(initialData?.slug));

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newName = e.target.value;
    setName(newName);
    if (!isSlugManuallyEdited) {
      const generatedSlug = newName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)+/g, '');
      setSlug(generatedSlug);
    }
  };

  // Load Catalog Products for Component Selection
  useEffect(() => {
    const fetchCatalog = async () => {
      try {
        setLoadingCatalog(true);
        // Load up to 200 active catalog products for selection
        const res = await productService.getProducts({ active: true, size: 200 });
        setCatalogProducts(res.content || []);
      } catch (err) {
        console.error('Failed to load catalog products', err);
        toast.error('Failed to load catalog products for component picker');
      } finally {
        setLoadingCatalog(false);
      }
    };
    fetchCatalog();
  }, []);

  // Fetch full product details (including variants) when a product is selected
  useEffect(() => {
    if (!selectedProductId) {
      setSelectedVariantId('');
      return;
    }

    if (productDetailsCache[selectedProductId]) {
      return;
    }

    let isMounted = true;
    const fetchProductDetails = async () => {
      try {
        setLoadingVariants(true);
        const res = await productService.getProduct(selectedProductId);
        if (isMounted && res.data) {
          setProductDetailsCache((prev) => ({
            ...prev,
            [selectedProductId]: res.data,
          }));
        }
      } catch (err) {
        console.error('Failed to load product details for variants', err);
        if (isMounted) {
          toast.error('Failed to load sizes for the selected fragrance');
        }
      } finally {
        if (isMounted) {
          setLoadingVariants(false);
        }
      }
    };

    fetchProductDetails();
    return () => {
      isMounted = false;
    };
  }, [selectedProductId, productDetailsCache]);

  // Selected product object from catalog (prefers full detailed object with variants)
  const currentSelectedProduct = useMemo(() => {
    if (!selectedProductId) return null;
    return (
      productDetailsCache[selectedProductId] ||
      catalogProducts.find((p) => String(p.id) === selectedProductId) ||
      null
    );
  }, [catalogProducts, productDetailsCache, selectedProductId]);

  // Active variants for selected product
  const availableVariants = useMemo(() => {
    if (!currentSelectedProduct || !currentSelectedProduct.variants) return [];
    return currentSelectedProduct.variants.filter((v) => v.active);
  }, [currentSelectedProduct]);

  // Selected variant object
  const currentSelectedVariant = useMemo(() => {
    if (!selectedVariantId) return null;
    return availableVariants.find((v) => String(v.id) === selectedVariantId) || null;
  }, [availableVariants, selectedVariantId]);

  // Handle adding a component to the gift set
  const handleAddComponent = () => {
    if (!currentSelectedProduct || !currentSelectedVariant) {
      toast.error('Please select both a product and a variant');
      return;
    }

    if (componentQuantity < 1) {
      toast.error('Quantity per set must be at least 1');
      return;
    }

    // Duplicate check
    const isDuplicate = components.some((c) => c.variantId === currentSelectedVariant.id);
    if (isDuplicate) {
      toast.error(`${currentSelectedProduct.name} (${currentSelectedVariant.size}) is already in this Gift Set.`);
      return;
    }

    const newComponent: SelectedComponent = {
      tempId: `comp_${Date.now()}_${Math.random()}`,
      productId: currentSelectedProduct.id,
      productName: currentSelectedProduct.name,
      productSlug: currentSelectedProduct.slug,
      productThumbnail:
        currentSelectedProduct.images?.[0]?.imageUrl ||
        (currentSelectedProduct as any).thumbnail ||
        '',
      variantId: currentSelectedVariant.id,
      variantSize: currentSelectedVariant.size,
      sku: currentSelectedVariant.sku,
      variantPrice: currentSelectedVariant.price,
      currentStock: currentSelectedVariant.stock,
      quantityPerSet: componentQuantity,
      displayOrder: components.length,
    };

    setComponents([...components, newComponent]);
    setSelectedVariantId('');
    setComponentQuantity(1);
    toast.success(`Added ${currentSelectedProduct.name} (${currentSelectedVariant.size})`);
  };

  const handleRemoveComponent = (tempId: string) => {
    setComponents(components.filter((c) => c.tempId !== tempId));
  };

  const handleUpdateComponentQty = (tempId: string, delta: number) => {
    setComponents(
      components.map((c) => {
        if (c.tempId === tempId) {
          const newQty = Math.max(1, c.quantityPerSet + delta);
          return { ...c, quantityPerSet: newQty };
        }
        return c;
      })
    );
  };

  // Live Availability & Bottleneck Calculation
  const availabilityAnalysis = useMemo(() => {
    if (components.length === 0) {
      return {
        availableUnits: 0,
        bottleneckComponent: null,
        status: 'EMPTY',
      };
    }

    let minUnits = Infinity;
    let bottleneck: SelectedComponent | null = null;

    for (const comp of components) {
      const unitsForComponent = Math.floor(comp.currentStock / comp.quantityPerSet);
      if (unitsForComponent < minUnits) {
        minUnits = unitsForComponent;
        bottleneck = comp;
      }
    }

    if (minUnits === Infinity) minUnits = 0;

    let status = 'IN_STOCK';
    if (minUnits === 0) {
      status = 'OUT_OF_STOCK';
    } else if (minUnits <= 5) {
      status = 'LOW_STOCK';
    }

    return {
      availableUnits: minUnits,
      bottleneckComponent: bottleneck,
      status,
    };
  }, [components]);

  // Form Submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    // Validation
    if (!name.trim()) {
      setFormError('Gift Set name is required.');
      toast.error('Gift Set name is required');
      return;
    }

    const parsedPrice = parseFloat(price);
    if (isNaN(parsedPrice) || parsedPrice <= 0) {
      setFormError('Please provide a valid fixed price greater than 0.');
      toast.error('Valid price is required');
      return;
    }

    let parsedSalePrice: number | null = null;
    if (salePrice.trim()) {
      parsedSalePrice = parseFloat(salePrice);
      if (isNaN(parsedSalePrice) || parsedSalePrice <= 0) {
        setFormError('Sale price must be a positive number if provided.');
        toast.error('Invalid sale price');
        return;
      }
      if (parsedSalePrice >= parsedPrice) {
        setFormError('Sale price must be less than the regular price.');
        toast.error('Sale price must be less than regular price');
        return;
      }
    }

    if (components.length === 0) {
      setFormError('A Gift Set must contain at least one product component.');
      toast.error('Please add at least one component');
      return;
    }

    const payload: GiftSetRequest = {
      name: name.trim(),
      slug: slug.trim() || undefined,
      description: description.trim() || undefined,
      packagingNotes: packagingNotes.trim() || undefined,
      price: parsedPrice,
      salePrice: parsedSalePrice,
      active,
      featured,
      displayOrder: Number(displayOrder) || 0,
      items: components.map((c, idx) => ({
        variantId: c.variantId,
        quantity: c.quantityPerSet,
        displayOrder: idx,
      })),
    };

    setIsSubmitting(true);
    try {
      if (isEdit && initialData?.id) {
        await giftSetService.updateGiftSet(initialData.id, payload);
        toast.success('Gift Set updated successfully');
        navigate('/admin/gift-sets');
      } else {
        const created = await giftSetService.createGiftSet(payload);

        // Upload any locally staged images
        const stagedImages = images.filter((img) => img.file);
        if (stagedImages.length > 0) {
          toast.loading('Uploading staged images...', { id: 'img-upload' });
          for (const staged of stagedImages) {
            try {
              await giftSetService.uploadImage(created.id, staged.file!);
            } catch (imgErr) {
              console.error('Failed to upload image', imgErr);
            }
          }
          toast.dismiss('img-upload');
        }

        toast.success('Gift Set created successfully');
        navigate('/admin/gift-sets');
      }
    } catch (err: any) {
      console.error('Failed to save gift set', err);
      const msg = err?.response?.data?.message || err?.message || 'Failed to save Gift Set';
      setFormError(msg);
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8 pb-16">
      {/* Top Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-outline-variant/60 pb-6">
        <div>
          <button
            type="button"
            onClick={() => navigate('/admin/gift-sets')}
            className="inline-flex items-center gap-1.5 text-xs font-label-md uppercase tracking-wider text-on-surface-variant hover:text-accent mb-2 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Gift Sets
          </button>
          <h1 className="font-headline-lg text-headline-lg text-on-surface">
            {isEdit ? `Edit Gift Set: ${initialData?.name}` : 'Create Curated Gift Set'}
          </h1>
          <p className="font-body-md text-body-md text-on-surface-variant mt-1">
            Configure luxury packaging notes, component fragrance variants, and pricing.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate('/admin/gift-sets')}
            disabled={isSubmitting}
            className="btn btn-outline px-5 py-2.5 rounded-lg"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="btn btn-primary px-6 py-2.5 rounded-lg inline-flex items-center gap-2"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                {isEdit ? 'Update Gift Set' : 'Publish Gift Set'}
              </>
            )}
          </button>
        </div>
      </div>

      {/* Global Error Banner */}
      {formError && (
        <div className="p-4 rounded-lg bg-error-container/30 border border-error/40 flex items-start gap-3 text-error">
          <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
          <div>
            <p className="font-label-lg font-semibold">Error Saving Gift Set</p>
            <p className="font-body-sm text-body-sm mt-0.5">{formError}</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* LEFT COLUMN: 2 Cols wide on desktop */}
        <div className="lg:col-span-2 space-y-8">
          {/* CARD 1: Basic Information */}
          <div className="card p-6 bg-surface-bright rounded-xl border border-outline-variant/60 shadow-sm space-y-6">
            <div className="flex items-center gap-2 border-b border-outline-variant/40 pb-4">
              <Package className="w-5 h-5 text-accent" />
              <h2 className="font-headline-sm text-headline-sm text-on-surface">General Information</h2>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block font-label-md text-label-md text-on-surface mb-1.5">
                  Gift Set Name <span className="text-error">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={handleNameChange}
                  placeholder="e.g. Royal Oud & Musk Connoisseur Set"
                  className="field-input w-full py-2.5 px-3.5"
                />
              </div>

              <div>
                <label className="block font-label-md text-label-md text-on-surface mb-1.5">
                  URL Slug
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant font-mono text-xs">
                    /gift-sets/
                  </span>
                  <input
                    type="text"
                    value={slug}
                    onChange={(e) => {
                      setIsSlugManuallyEdited(true);
                      setSlug(e.target.value);
                    }}
                    placeholder="royal-oud-musk-connoisseur-set"
                    className="field-input w-full py-2.5 pl-24 pr-3.5 font-mono text-xs"
                  />
                </div>
                <p className="text-[11px] text-on-surface-variant mt-1">
                  Unique identifier used in URLs. Auto-generated from name if left empty.
                </p>
              </div>

              <div>
                <label className="block font-label-md text-label-md text-on-surface mb-1.5">
                  Story & Description
                </label>
                <textarea
                  rows={4}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe the aromatic narrative, curation inspiration, and luxury experience of this set..."
                  className="field-input w-full py-2.5 px-3.5 resize-y"
                />
              </div>

              <div>
                <label className="block font-label-md text-label-md text-on-surface mb-1.5">
                  Packaging & Presentation Notes
                </label>
                <textarea
                  rows={3}
                  value={packagingNotes}
                  onChange={(e) => setPackagingNotes(e.target.value)}
                  placeholder="Describe the physical packaging included (e.g. velvet box, gift sleeve, ribbon, greeting card)..."
                  className="field-input w-full py-2.5 px-3.5 resize-y"
                />
                <p className="text-[11px] text-on-surface-variant mt-1 flex items-center gap-1">
                  <Info className="w-3.5 h-3.5 shrink-0 text-accent" />
                  Packaging is physical presentation inventory managed at fulfillment and is included in the set price.
                </p>
              </div>
            </div>
          </div>

          {/* CARD 2: Curated Components Selector */}
          <div className="card p-6 bg-surface-bright rounded-xl border border-outline-variant/60 shadow-sm space-y-6">
            <div className="flex items-center justify-between border-b border-outline-variant/40 pb-4">
              <div className="flex items-center gap-2">
                <Boxes className="w-5 h-5 text-accent" />
                <h2 className="font-headline-sm text-headline-sm text-on-surface">Curated Product Components</h2>
              </div>
              <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">
                {components.length} {components.length === 1 ? 'Component' : 'Components'} Selected
              </span>
            </div>

            {/* Component Picker Controls */}
            <div className="p-4 rounded-lg bg-surface-container/50 border border-outline-variant/60 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
                {/* Product Select */}
                <div className="sm:col-span-5">
                  <label className="block font-label-sm text-label-sm text-on-surface-variant mb-1">
                    Select Catalog Fragrance
                  </label>
                  <select
                    value={selectedProductId}
                    onChange={(e) => {
                      setSelectedProductId(e.target.value);
                      setSelectedVariantId('');
                    }}
                    disabled={loadingCatalog}
                    className="field-input w-full py-2 px-3 text-sm"
                  >
                    <option value="">-- Choose a Product --</option>
                    {catalogProducts.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.brand || 'Al Ahad'})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Variant Select */}
                <div className="sm:col-span-4">
                  <label className="block font-label-sm text-label-sm text-on-surface-variant mb-1">
                    Select Variant Size
                  </label>
                  <select
                    value={selectedVariantId}
                    onChange={(e) => setSelectedVariantId(e.target.value)}
                    disabled={!selectedProductId || loadingVariants || availableVariants.length === 0}
                    className="field-input w-full py-2 px-3 text-sm"
                  >
                    <option value="">
                      {loadingVariants
                        ? 'Loading sizes...'
                        : availableVariants.length === 0 && selectedProductId
                        ? 'No active sizes found'
                        : '-- Choose Size --'}
                    </option>
                    {availableVariants.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.size} {v.productType ? `(${v.productType})` : ''} — Stock: {v.stock} ({formatPrice(v.price)})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Quantity per set */}
                <div className="sm:col-span-1">
                  <label className="block font-label-sm text-label-sm text-on-surface-variant mb-1">
                    Qty
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={componentQuantity}
                    onChange={(e) => setComponentQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                    disabled={!selectedVariantId}
                    className="field-input w-full py-2 px-2 text-center text-sm"
                  />
                </div>

                {/* Add Button */}
                <div className="sm:col-span-2">
                  <button
                    type="button"
                    onClick={handleAddComponent}
                    disabled={!selectedVariantId}
                    className="btn btn-secondary w-full py-2 px-3 text-xs inline-flex items-center justify-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add
                  </button>
                </div>
              </div>
            </div>

            {/* Selected Components Table */}
            {components.length === 0 ? (
              <div className="p-8 text-center border-2 border-dashed border-outline-variant/60 rounded-lg text-on-surface-variant">
                <Boxes className="w-8 h-8 mx-auto text-on-surface-variant/50 mb-2" />
                <p className="font-label-md text-label-md">No components added yet.</p>
                <p className="text-xs text-on-surface-variant mt-0.5">
                  Every Gift Set consists of existing products and their selected variants.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto border border-outline-variant/60 rounded-lg">
                <table className="w-full text-left text-sm border-collapse">
                  <thead className="bg-surface-container font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">
                    <tr>
                      <th className="py-2.5 px-3">Component Fragrance</th>
                      <th className="py-2.5 px-3">Variant Size</th>
                      <th className="py-2.5 px-3 text-center">Live Stock</th>
                      <th className="py-2.5 px-3 text-center">Qty / Set</th>
                      <th className="py-2.5 px-3 text-center">Max Sets</th>
                      <th className="py-2.5 px-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant/40 bg-surface-bright">
                    {components.map((comp) => {
                      const possibleSets = Math.floor(comp.currentStock / comp.quantityPerSet);
                      const isBottleneck = availabilityAnalysis.bottleneckComponent?.variantId === comp.variantId;

                      return (
                        <tr
                          key={comp.tempId}
                          className={`hover:bg-surface-container/30 transition-colors ${isBottleneck ? 'bg-amber-500/[0.04]' : ''
                            }`}
                        >
                          <td className="py-3 px-3">
                            <div className="flex items-center gap-3">
                              {comp.productThumbnail ? (
                                <img
                                  src={getImageUrl(comp.productThumbnail)}
                                  alt={comp.productName}
                                  className="w-10 h-10 object-cover rounded border border-outline-variant/40 shrink-0"
                                />
                              ) : (
                                <div className="w-10 h-10 bg-surface-variant rounded border border-outline-variant/40 flex items-center justify-center shrink-0">
                                  <Package className="w-4 h-4 text-on-surface-variant" />
                                </div>
                              )}
                              <div>
                                <p className="font-medium text-on-surface">{comp.productName}</p>
                                <p className="text-xs text-on-surface-variant font-mono">SKU: {comp.sku}</p>
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-3">
                            <span className="font-mono text-xs bg-surface-variant px-2 py-0.5 rounded">
                              {comp.variantSize}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-center font-mono text-xs">
                            <span className={comp.currentStock <= 5 ? 'text-amber-600 font-bold' : 'text-on-surface'}>
                              {comp.currentStock}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-center">
                            <div className="inline-flex items-center gap-1.5 border border-outline-variant/60 rounded px-1.5 py-0.5 bg-surface-bright">
                              <button
                                type="button"
                                onClick={() => handleUpdateComponentQty(comp.tempId, -1)}
                                className="w-5 h-5 flex items-center justify-center text-on-surface-variant hover:text-accent font-bold"
                              >
                                -
                              </button>
                              <span className="font-mono text-xs w-6 text-center font-semibold">
                                {comp.quantityPerSet}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleUpdateComponentQty(comp.tempId, 1)}
                                className="w-5 h-5 flex items-center justify-center text-on-surface-variant hover:text-accent font-bold"
                              >
                                +
                              </button>
                            </div>
                          </td>
                          <td className="py-3 px-3 text-center">
                            <span
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-mono font-medium ${isBottleneck
                                ? 'bg-amber-100 text-amber-900 border border-amber-300'
                                : 'text-on-surface-variant'
                                }`}
                            >
                              {possibleSets} sets
                              {isBottleneck && <span className="text-[10px] uppercase font-bold tracking-wider">(LIMIT)</span>}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-right">
                            <button
                              type="button"
                              onClick={() => handleRemoveComponent(comp.tempId)}
                              className="p-1 rounded text-on-surface-variant hover:text-error hover:bg-error-container/30 transition-colors"
                              title="Remove component"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* CARD 3: Gallery & Images */}
          <div className="card p-6 bg-surface-bright rounded-xl border border-outline-variant/60 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-outline-variant/40 pb-4">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-accent" />
                <h2 className="font-headline-sm text-headline-sm text-on-surface">Gallery & Presentation Images</h2>
              </div>
              <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">
                {images.length} / 8 Uploaded
              </span>
            </div>

            <GiftSetImageManager
              giftSetId={initialData?.id}
              images={images}
              onImagesChange={setImages}
              disabled={isSubmitting}
            />
          </div>
        </div>

        {/* RIGHT COLUMN: 1 Col wide on desktop */}
        <div className="space-y-8">
          {/* Availability & Inventory Bottleneck Card */}
          <div className="card p-6 bg-surface-bright rounded-xl border border-outline-variant/60 shadow-sm space-y-5">
            <div className="flex items-center justify-between border-b border-outline-variant/40 pb-3">
              <h3 className="font-headline-sm text-headline-sm text-on-surface">Calculated Availability</h3>
              <span title="Gift Sets do not hold independent inventory; availability is calculated dynamically from component variant stock.">
                <HelpCircle className="w-4 h-4 text-on-surface-variant cursor-pointer" />
              </span>
            </div>

            {/* Calculated Availability Badge */}
            <div className="text-center p-4 rounded-xl bg-surface-container border border-outline-variant/40">
              <p className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">
                Max Available Sets
              </p>
              <div className="mt-1 flex items-center justify-center gap-2">
                <span className="font-display-md text-3xl font-serif text-on-surface font-bold">
                  {availabilityAnalysis.availableUnits}
                </span>
                <span className="text-sm font-label-md text-on-surface-variant">Units</span>
              </div>

              {/* Status pill */}
              <div className="mt-2 flex justify-center">
                {availabilityAnalysis.status === 'IN_STOCK' && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    In Stock
                  </span>
                )}
                {availabilityAnalysis.status === 'LOW_STOCK' && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    Low Stock ({availabilityAnalysis.availableUnits} left)
                  </span>
                )}
                {availabilityAnalysis.status === 'OUT_OF_STOCK' && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-rose-100 text-rose-800">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    Out of Stock
                  </span>
                )}
                {availabilityAnalysis.status === 'EMPTY' && (
                  <span className="text-xs text-on-surface-variant">
                    Add components to calculate
                  </span>
                )}
              </div>
            </div>

            {/* Bottleneck Component Analysis */}
            {availabilityAnalysis.bottleneckComponent && (
              <div className="p-3.5 rounded-lg bg-amber-500/[0.08] border border-amber-300/60 text-xs text-amber-900 space-y-1">
                <div className="flex items-center gap-1.5 font-semibold text-amber-950">
                  <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0" />
                  Limiting Component
                </div>
                <p>
                  <strong>{availabilityAnalysis.bottleneckComponent.productName}</strong> ({availabilityAnalysis.bottleneckComponent.variantSize}) currently restricts this set to{' '}
                  <strong>{availabilityAnalysis.availableUnits} units</strong>.
                </p>
                <p className="text-[11px] text-amber-800/90 font-mono">
                  Current Stock: {availabilityAnalysis.bottleneckComponent.currentStock} | Qty per set: {availabilityAnalysis.bottleneckComponent.quantityPerSet}
                </p>
              </div>
            )}

            <div className="text-[11px] text-on-surface-variant/80 border-t border-outline-variant/40 pt-3 space-y-1">
              <p className="font-semibold text-on-surface-variant">Inventory Rule:</p>
              <p>
                Gift sets do not have independent stock. Deductions are calculated atomically across all components at checkout.
              </p>
            </div>
          </div>

          {/* Pricing & Merchandising Card */}
          <div className="card p-6 bg-surface-bright rounded-xl border border-outline-variant/60 shadow-sm space-y-5">
            <h3 className="font-headline-sm text-headline-sm text-on-surface border-b border-outline-variant/40 pb-3">
              Pricing & Merchandising
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block font-label-md text-label-md text-on-surface mb-1">
                  Fixed Gift Set Price (₹) <span className="text-error">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-sm">₹</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    placeholder="2999.00"
                    className="field-input w-full py-2 pl-7 pr-3 font-mono text-sm"
                  />
                </div>
                <p className="text-[11px] text-on-surface-variant mt-1">
                  Packaging and presentation box included in this base price.
                </p>
              </div>

              <div>
                <label className="block font-label-md text-label-md text-on-surface mb-1">
                  Sale Price (₹, optional)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-sm">₹</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={salePrice}
                    onChange={(e) => setSalePrice(e.target.value)}
                    placeholder="Leave empty if not on sale"
                    className="field-input w-full py-2 pl-7 pr-3 font-mono text-sm"
                  />
                </div>
                {salePrice && parseFloat(salePrice) > 0 && parseFloat(price) > 0 && (
                  <p className="text-[11px] text-emerald-700 font-medium mt-1">
                    Customers save ₹{(parseFloat(price) - parseFloat(salePrice)).toFixed(2)} (
                    {Math.round(((parseFloat(price) - parseFloat(salePrice)) / parseFloat(price)) * 100)}% off)
                  </p>
                )}
              </div>

              <div>
                <label className="block font-label-md text-label-md text-on-surface mb-1">
                  Display Order
                </label>
                <input
                  type="number"
                  value={displayOrder}
                  onChange={(e) => setDisplayOrder(parseInt(e.target.value) || 0)}
                  className="field-input w-full py-2 px-3 text-sm font-mono"
                />
                <p className="text-[11px] text-on-surface-variant mt-1">
                  Lower numbers appear first in the catalog grid.
                </p>
              </div>

              {/* Toggles */}
              <div className="pt-3 border-t border-outline-variant/40 space-y-3">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={active}
                    onChange={(e) => setActive(e.target.checked)}
                    className="w-4 h-4 text-accent rounded border-outline focus:ring-accent"
                  />
                  <div>
                    <span className="font-label-md text-label-md text-on-surface font-medium block">
                      Published (Active)
                    </span>
                    <span className="text-[11px] text-on-surface-variant block">
                      Visible to customers in the catalog and eligible for checkout.
                    </span>
                  </div>
                </label>

                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={featured}
                    onChange={(e) => setFeatured(e.target.checked)}
                    className="w-4 h-4 text-accent rounded border-outline focus:ring-accent"
                  />
                  <div>
                    <span className="font-label-md text-label-md text-on-surface font-medium block">
                      Featured Merchandising
                    </span>
                    <span className="text-[11px] text-on-surface-variant block">
                      Highlight as a flagship recommendation in gift showcases.
                    </span>
                  </div>
                </label>
              </div>
            </div>
          </div>
        </div>
      </div>
    </form>
  );
};
