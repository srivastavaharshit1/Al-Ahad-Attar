import React, { useState, useEffect } from 'react';
import type { Category } from '../../types';
import { TypedImageManager, type ManagedImage } from './TypedImageManager';
import { ImageManager } from './ImageManager';
import { ChevronDown, ChevronUp, Loader2, Plus, Trash2 } from 'lucide-react';


export interface ProductFormData {
  name: string;
  slug: string;
  shortDescription: string;
  description: string;
  brand: string;
  subcategory: string;
  fragranceFamily: string;
  topNotes: string;
  middleNotes: string;
  baseNotes: string;
  longevity: string;
  projection: string;
  gender: string;
  featured: boolean;
  featuredInCollection: boolean;
  active: boolean;
  categoryId: string;
}

export interface VariantData {
  id?: number;
  productType?: string;
  sku: string;
  size: string;
  price: number;
  stock: number;
  active: boolean;
}

interface ProductFormProps {
  initialData: ProductFormData;
  initialVariants: VariantData[];
  initialImages: ManagedImage[];
  categories: Category[];
  onSubmit: (data: ProductFormData, variants: VariantData[], images: ManagedImage[]) => Promise<void>;
  isSubmitting: boolean;
  productId?: number;
  onCancel: () => void;
}

// Helper: compact row for a single variant (Attar or Perfume section)
const VariantRow: React.FC<{
  variant: VariantData;
  index: number;
  slugPrefix: string;
  onChange: (idx: number, field: string, value: string | number | boolean) => void;
  onRemove: (idx: number) => void;
}> = ({ variant, index, slugPrefix, onChange, onRemove }) => (
  <tr className="group border-b border-outline-variant/40 last:border-0 hover:bg-surface-container/40 transition-colors">
    {/* TYPE */}
    <td className="px-3 py-2.5 text-xs font-label-sm text-on-surface-variant uppercase tracking-wider whitespace-nowrap">
      {variant.productType === 'ATTAR' ? 'Attar' : 'Perfume'}
    </td>
    {/* SIZE */}
    <td className="px-3 py-2.5">
      <input
        className="field-input field-input-sm font-body-md text-body-md text-accent w-full min-w-[70px]"
        type="text"
        required
        value={variant.size}
        onChange={e => onChange(index, 'size', e.target.value)}
        placeholder="3ml"
        aria-label="Variant size"
      />
    </td>
    {/* PRICE */}
    <td className="px-3 py-2.5">
      <div className="relative">
        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-on-surface-variant text-xs">₹</span>
        <input
          className="field-input field-input-sm font-body-md text-body-md pl-5 w-full min-w-[80px]"
          type="number"
          min="0"
          required
          value={variant.price}
          onChange={e => onChange(index, 'price', e.target.value)}
          aria-label="Price"
        />
      </div>
    </td>
    {/* STOCK */}
    <td className="px-3 py-2.5">
      <input
        className="field-input field-input-sm font-body-md text-body-md w-full min-w-[70px]"
        type="number"
        min="0"
        required
        value={variant.stock}
        onChange={e => onChange(index, 'stock', e.target.value)}
        aria-label="Stock"
      />
    </td>
    {/* SKU */}
    <td className="px-3 py-2.5">
      <input
        className="field-input field-input-sm font-body-sm text-body-sm text-on-surface-variant w-full min-w-[120px]"
        type="text"
        value={variant.sku}
        onChange={e => onChange(index, 'sku', e.target.value)}
        placeholder={`${slugPrefix}-${variant.size.replace(/\s+/g, '')}`}
        aria-label="SKU"
      />
    </td>
    {/* DELETE */}
    <td className="px-3 py-2.5 text-center">
      <button
        type="button"
        onClick={() => onRemove(index)}
        className="p-1.5 text-on-surface-variant hover:text-error transition-colors rounded-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-error"
        title="Remove variant"
        aria-label="Remove variant"
      >
        <Trash2 size={15} />
      </button>
    </td>
  </tr>
);

// Compact variant table with header
const VariantTable: React.FC<{
  variants: VariantData[];
  allVariants: VariantData[];
  productType: 'ATTAR' | 'PERFUME';
  slugPrefix: string;
  onChangeAll: (newAll: VariantData[]) => void;
}> = ({ variants, allVariants, productType, slugPrefix, onChangeAll }) => {
  const label = productType === 'ATTAR' ? 'Attar' : 'Perfume';
  const defaultSize = productType === 'ATTAR' ? '3ml' : '30ml';

  const handleChange = (localIdx: number, field: string, value: string | number | boolean) => {
    // Map local index back to global allVariants index
    const typeIndices = allVariants
      .map((v, gi) => ({ v, gi }))
      .filter(({ v }) => v.productType === productType)
      .map(({ gi }) => gi);
    const globalIdx = typeIndices[localIdx];
    if (globalIdx === undefined) return;
    const newAll = [...allVariants];
    newAll[globalIdx] = { ...newAll[globalIdx], [field]: value };
    onChangeAll(newAll);
  };

  const handleRemove = (localIdx: number) => {
    const typeIndices = allVariants
      .map((v, gi) => ({ v, gi }))
      .filter(({ v }) => v.productType === productType)
      .map(({ gi }) => gi);
    const globalIdx = typeIndices[localIdx];
    if (globalIdx === undefined) return;
    onChangeAll(allVariants.filter((_, i) => i !== globalIdx));
  };

  const handleAdd = () => {
    onChangeAll([
      ...allVariants,
      { sku: '', size: defaultSize, price: 0, stock: 0, active: true, productType },
    ]);
  };

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto rounded-lg border border-outline-variant">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-surface-container border-b border-outline-variant">
              <th className="px-3 py-2 text-left text-xs font-label-sm uppercase tracking-wider text-on-surface-variant">Type</th>
              <th className="px-3 py-2 text-left text-xs font-label-sm uppercase tracking-wider text-on-surface-variant">Size</th>
              <th className="px-3 py-2 text-left text-xs font-label-sm uppercase tracking-wider text-on-surface-variant">Price (₹)</th>
              <th className="px-3 py-2 text-left text-xs font-label-sm uppercase tracking-wider text-on-surface-variant">Stock</th>
              <th className="px-3 py-2 text-left text-xs font-label-sm uppercase tracking-wider text-on-surface-variant">SKU</th>
              <th className="px-3 py-2 text-center text-xs font-label-sm uppercase tracking-wider text-on-surface-variant w-10"></th>
            </tr>
          </thead>
          <tbody>
            {variants.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-on-surface-variant font-body-sm text-sm">
                  No {label} variants yet. Click below to add one.
                </td>
              </tr>
            ) : (
              variants.map((v, localIdx) => (
                <VariantRow
                  key={v.id ?? `new-${productType}-${localIdx}`}
                  variant={v}
                  index={localIdx}
                  slugPrefix={slugPrefix}
                  onChange={handleChange}
                  onRemove={handleRemove}
                />
              ))
            )}
          </tbody>
        </table>
      </div>
      <button
        type="button"
        onClick={handleAdd}
        className="flex items-center gap-1.5 text-sm font-label-md text-accent hover:text-accent-hover transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent rounded-sm px-1"
      >
        <Plus size={16} />
        Add {label} Variant
      </button>
    </div>
  );
};


export const ProductForm: React.FC<ProductFormProps> = ({
  initialData,
  initialVariants,
  initialImages,
  categories,
  onSubmit,
  isSubmitting,
  productId,
  onCancel
}) => {
  const [formData, setFormData] = useState<ProductFormData>(initialData);
  const [variants, setVariants] = useState<VariantData[]>(initialVariants);

  // Split images by type for the two typed managers
  const [attarImages, setAttarImages] = useState<ManagedImage[]>(
    initialImages.filter(img => img.altText?.toUpperCase() === 'ATTAR')
  );
  const [perfumeImages, setPerfumeImages] = useState<ManagedImage[]>(
    initialImages.filter(img => img.altText?.toUpperCase() === 'PERFUME')
  );
  // Shared / untyped images (existing products without type tags)
  const [sharedImages, setSharedImages] = useState<ManagedImage[]>(
    initialImages.filter(img => !img.altText || (img.altText.toUpperCase() !== 'ATTAR' && img.altText.toUpperCase() !== 'PERFUME'))
  );

  // Track whether each type section is visible (admin can add/remove types)
  const [showAttar, setShowAttar] = useState(
    initialVariants.some(v => v.productType === 'ATTAR') || attarImages.length > 0
  );
  const [showPerfume, setShowPerfume] = useState(
    initialVariants.some(v => v.productType === 'PERFUME') || perfumeImages.length > 0
  );

  const [advancedOpen, setAdvancedOpen] = useState(false);

  useEffect(() => {
    setFormData(initialData);
  }, [initialData]);

  useEffect(() => {
    setVariants(initialVariants);
  }, [initialVariants]);

  useEffect(() => {
    setAttarImages(initialImages.filter(img => img.altText?.toUpperCase() === 'ATTAR'));
    setPerfumeImages(initialImages.filter(img => img.altText?.toUpperCase() === 'PERFUME'));
    setSharedImages(initialImages.filter(img => !img.altText || (img.altText.toUpperCase() !== 'ATTAR' && img.altText.toUpperCase() !== 'PERFUME')));
    setShowAttar(initialVariants.some(v => v.productType === 'ATTAR') || initialImages.some(img => img.altText?.toUpperCase() === 'ATTAR'));
    setShowPerfume(initialVariants.some(v => v.productType === 'PERFUME') || initialImages.some(img => img.altText?.toUpperCase() === 'PERFUME'));
  }, [initialImages, initialVariants]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;

    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));

    if (name === 'name' && !productId) {
      const expectedSlug = formData.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
      if (!formData.slug || formData.slug === expectedSlug) {
        setFormData(prev => ({
          ...prev,
          slug: value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '')
        }));
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Merge all images back for submission (typed managers handle their own uploads for existing products)
    const allImages = [...sharedImages, ...attarImages, ...perfumeImages];
    onSubmit(formData, variants, allImages);
  };

  const selectedCategory = categories.find(c => c.id.toString() === formData.categoryId.toString());
  const isFragranceCategory = selectedCategory && (selectedCategory.type === 'ATTARS' || selectedCategory.type === 'PERFUMES');

  // Automatically populate variants for new products based on category
  useEffect(() => {
    if (formData.categoryId && !productId) {
      const cat = categories.find(c => c.id.toString() === formData.categoryId.toString());
      if (cat) {
        if (cat.type === 'ATTARS') {
          setShowAttar(true);
          setShowPerfume(true);
          setVariants([
            { sku: '', size: '3ml', price: 0, stock: 0, active: true, productType: 'ATTAR' },
            { sku: '', size: '6ml', price: 0, stock: 0, active: true, productType: 'ATTAR' },
            { sku: '', size: '12ml', price: 0, stock: 0, active: true, productType: 'ATTAR' },
            { sku: '', size: '30ml', price: 0, stock: 0, active: true, productType: 'PERFUME' },
            { sku: '', size: '60ml', price: 0, stock: 0, active: true, productType: 'PERFUME' },
            { sku: '', size: '100ml', price: 0, stock: 0, active: true, productType: 'PERFUME' }
          ]);
        } else if (cat.type === 'BAKHOOR') {
          setShowAttar(false);
          setShowPerfume(false);
          if (formData.subcategory === 'Incense Sticks') {
            setVariants([
              { sku: '', size: '100 gm', price: 0, stock: 0, active: true, productType: 'BAKHOOR' },
              { sku: '', size: '250 gm', price: 0, stock: 0, active: true, productType: 'BAKHOOR' }
            ]);
          } else {
            setVariants([
              { sku: '', size: '40 g', price: 0, stock: 0, active: true, productType: 'BAKHOOR' }
            ]);
          }
        } else if (cat.type === 'PERFUMES') {
          setShowAttar(false);
          setShowPerfume(true);
          if (formData.subcategory === 'Car Perfumes') {
            setVariants([{ sku: '', size: '1 pc', price: 0, stock: 0, active: true, productType: 'PERFUME' }]);
          } else {
            setVariants([
              { sku: '', size: '30ml', price: 0, stock: 0, active: true, productType: 'PERFUME' },
              { sku: '', size: '60ml', price: 0, stock: 0, active: true, productType: 'PERFUME' },
              { sku: '', size: '100ml', price: 0, stock: 0, active: true, productType: 'PERFUME' }
            ]);
          }
        }
      }
    }
  }, [formData.categoryId, formData.subcategory, categories, productId]);

  const attarVariants = variants.filter(v => v.productType === 'ATTAR');
  const perfumeVariants = variants.filter(v => v.productType === 'PERFUME');
  // Non-fragrance variants (BAKHOOR, GENERAL, etc.)
  const otherVariants = variants.filter(v => v.productType !== 'ATTAR' && v.productType !== 'PERFUME');
  const slugPrefix = formData.slug || formData.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');

  const handleAddAttar = () => {
    setShowAttar(true);
    if (attarVariants.length === 0) {
      setVariants(prev => [
        ...prev,
        { sku: '', size: '3ml', price: 0, stock: 0, active: true, productType: 'ATTAR' },
        { sku: '', size: '6ml', price: 0, stock: 0, active: true, productType: 'ATTAR' },
        { sku: '', size: '12ml', price: 0, stock: 0, active: true, productType: 'ATTAR' },
      ]);
    }
  };

  const handleAddPerfume = () => {
    setShowPerfume(true);
    if (perfumeVariants.length === 0) {
      setVariants(prev => [
        ...prev,
        { sku: '', size: '30ml', price: 0, stock: 0, active: true, productType: 'PERFUME' },
        { sku: '', size: '60ml', price: 0, stock: 0, active: true, productType: 'PERFUME' },
        { sku: '', size: '100ml', price: 0, stock: 0, active: true, productType: 'PERFUME' },
      ]);
    }
  };

  const handleRemoveAttarSection = () => {
    setShowAttar(false);
    setVariants(prev => prev.filter(v => v.productType !== 'ATTAR'));
    setAttarImages([]);
  };

  const handleRemovePerfumeSection = () => {
    setShowPerfume(false);
    setVariants(prev => prev.filter(v => v.productType !== 'PERFUME'));
    setPerfumeImages([]);
  };

  return (
    <form onSubmit={handleSubmit} className="pb-32 space-y-8">
      {/* Basic Information */}
      <div className="card p-6 md:p-8">
        <h3 className="font-headline-sm text-headline-sm font-semibold text-on-surface mb-6">Basic Information</h3>
        <div className="space-y-6">
          <div>
            <label className="field-label">Product Name <span className="text-error">*</span></label>
            <input
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              required
              className="field-input font-body-lg text-body-lg"
              placeholder="e.g., Oud Majestique"
              type="text"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <label className="field-label">Category <span className="text-error">*</span></label>
              <select
                name="categoryId"
                value={formData.categoryId}
                onChange={handleInputChange}
                required
                className="field-input font-body-md text-body-md"
              >
                <option value="">Select Category</option>
                {categories.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            {selectedCategory?.name?.toLowerCase() === 'bakhoor' && (
              <div>
                <label className="field-label">Subcategory</label>
                <select
                  name="subcategory"
                  value={formData.subcategory}
                  onChange={handleInputChange}
                  className="field-input font-body-md text-body-md"
                >
                  <option value="">None / Bakhoor</option>
                  <option value="Incense Sticks">Incense Sticks</option>
                </select>
              </div>
            )}
            {selectedCategory?.name?.toLowerCase() === 'perfumes' && (
              <div>
                <label className="field-label">Subcategory</label>
                <select
                  name="subcategory"
                  value={formData.subcategory}
                  onChange={handleInputChange}
                  className="field-input font-body-md text-body-md"
                >
                  <option value="">None / Perfumes</option>
                  <option value="Car Perfumes">Car Perfumes</option>
                </select>
              </div>
            )}
          </div>

          <div>
            <label className="field-label">Description <span className="text-error">*</span></label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              required
              className="field-input font-body-md text-body-md resize-y min-h-[120px]"
              placeholder="Detailed product description..."
            />
          </div>
        </div>
      </div>

      {/* ── ATTAR SECTION (only for fragrance categories) ── */}
      {isFragranceCategory && showAttar && (
        <div className="card overflow-hidden border-l-4 border-l-accent/60">
          {/* Section Header */}
          <div className="flex items-center justify-between px-6 md:px-8 pt-6 pb-4 bg-accent-soft/20">
            <div className="flex items-center gap-3">
              <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-accent/10 border border-accent/20">
                <span className="text-xs font-bold text-accent">A</span>
              </span>
              <div>
                <h3 className="font-headline-sm text-headline-sm font-semibold text-on-surface">Attar</h3>
                <p className="text-xs text-on-surface-variant mt-0.5">Concentrated oil-based fragrance</p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleRemoveAttarSection}
              className="text-xs text-on-surface-variant hover:text-error transition-colors flex items-center gap-1 px-2 py-1 rounded border border-outline-variant hover:border-error/50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-error"
              title="Remove Attar section"
            >
              <Trash2 size={12} />
              Remove
            </button>
          </div>

          <div className="px-6 md:px-8 py-6 space-y-6 border-t border-outline-variant/40">
            {/* Attar Images */}
            <div>
              <h4 className="font-label-lg text-on-surface mb-3 flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px] text-accent">photo_library</span>
                Attar Images
              </h4>
              <TypedImageManager
                productId={productId}
                productType="ATTAR"
                images={attarImages}
                onImagesChange={setAttarImages}
              />
            </div>

            {/* Attar Variants */}
            <div>
              <h4 className="font-label-lg text-on-surface mb-3 flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px] text-accent">inventory_2</span>
                Attar Variants
              </h4>
              <VariantTable
                variants={attarVariants}
                allVariants={variants}
                productType="ATTAR"
                slugPrefix={slugPrefix}
                onChangeAll={setVariants}
              />
            </div>
          </div>
        </div>
      )}

      {/* Add Attar button (when section is hidden but category is fragrance) */}
      {isFragranceCategory && !showAttar && (
        <button
          type="button"
          onClick={handleAddAttar}
          className="w-full flex items-center justify-center gap-2 py-4 border-2 border-dashed border-outline-variant rounded-xl text-on-surface-variant hover:text-accent hover:border-accent/50 transition-colors font-label-md"
        >
          <Plus size={18} />
          Add Attar (Concentrated Oil)
        </button>
      )}

      {/* ── PERFUME SECTION (only for fragrance categories) ── */}
      {isFragranceCategory && showPerfume && (
        <div className="card overflow-hidden border-l-4 border-l-primary/40">
          {/* Section Header */}
          <div className="flex items-center justify-between px-6 md:px-8 pt-6 pb-4 bg-primary/[0.04]">
            <div className="flex items-center gap-3">
              <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 border border-primary/20">
                <span className="text-xs font-bold text-primary">P</span>
              </span>
              <div>
                <h3 className="font-headline-sm text-headline-sm font-semibold text-on-surface">Perfume</h3>
                <p className="text-xs text-on-surface-variant mt-0.5">Alcohol-based spray fragrance</p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleRemovePerfumeSection}
              className="text-xs text-on-surface-variant hover:text-error transition-colors flex items-center gap-1 px-2 py-1 rounded border border-outline-variant hover:border-error/50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-error"
              title="Remove Perfume section"
            >
              <Trash2 size={12} />
              Remove
            </button>
          </div>

          <div className="px-6 md:px-8 py-6 space-y-6 border-t border-outline-variant/40">
            {/* Perfume Images */}
            <div>
              <h4 className="font-label-lg text-on-surface mb-3 flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px] text-primary">photo_library</span>
                Perfume Images
              </h4>
              <TypedImageManager
                productId={productId}
                productType="PERFUME"
                images={perfumeImages}
                onImagesChange={setPerfumeImages}
              />
            </div>

            {/* Perfume Variants */}
            <div>
              <h4 className="font-label-lg text-on-surface mb-3 flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px] text-primary">inventory_2</span>
                Perfume Variants
              </h4>
              <VariantTable
                variants={perfumeVariants}
                allVariants={variants}
                productType="PERFUME"
                slugPrefix={slugPrefix}
                onChangeAll={setVariants}
              />
            </div>
          </div>
        </div>
      )}

      {/* Add Perfume button (when section is hidden but category is fragrance) */}
      {isFragranceCategory && !showPerfume && (
        <button
          type="button"
          onClick={handleAddPerfume}
          className="w-full flex items-center justify-center gap-2 py-4 border-2 border-dashed border-outline-variant rounded-xl text-on-surface-variant hover:text-primary hover:border-primary/50 transition-colors font-label-md"
        >
          <Plus size={18} />
          Add Perfume (Spray)
        </button>
      )}

      {/* ── SHARED IMAGES (for existing products with untyped images, backward compat) ── */}
      {sharedImages.length > 0 && (
        <div className="card p-6 md:p-8">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h3 className="font-headline-sm text-headline-sm font-semibold text-on-surface">Shared Images</h3>
              <p className="text-xs text-on-surface-variant mt-1">
                These images have no Attar/Perfume tag. They show as fallback when no type-specific image is available.
                You can upload new images to the Attar or Perfume sections above.
              </p>
            </div>
            <span className="badge badge-neutral">{sharedImages.length}</span>
          </div>
          <ImageManager
            productId={productId}
            images={sharedImages}
            onImagesChange={setSharedImages}
            isFragranceCategory={isFragranceCategory}
          />
        </div>
      )}

      {/* ── NON-FRAGRANCE VARIANTS (BAKHOOR, GENERAL etc.) ── */}
      {!isFragranceCategory && (
        <div className="card p-6 md:p-8">
          <h3 className="font-headline-sm text-headline-sm font-semibold text-on-surface mb-6">Product Media & Variants</h3>

          {/* Non-fragrance single image manager */}
          <div className="mb-6">
            <ImageManager
              productId={productId}
              images={sharedImages}
              onImagesChange={setSharedImages}
              isFragranceCategory={false}
            />
          </div>

          <h4 className="font-label-lg text-on-surface mb-3">Variants</h4>
          <div className="grid grid-cols-1 gap-4">
            {otherVariants.map((v, idx) => {
              const globalIdx = variants.indexOf(v);
              return (
                <div key={v.id ?? `other-${idx}`} className="bg-surface-container border border-outline-variant rounded-lg p-5 flex flex-col md:flex-row md:items-center gap-5 hover:border-accent/40 transition-colors relative">
                  <button
                    type="button"
                    onClick={() => setVariants(prev => prev.filter((_, i) => i !== globalIdx))}
                    className="absolute top-2 right-2 p-2 text-on-surface-variant hover:text-error transition-colors"
                    title="Remove Variant"
                  >
                    <Trash2 size={18} />
                  </button>
                  <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 pt-4 md:pt-0">
                    <div>
                      <label className="field-label mb-1">Size / Weight <span className="text-error">*</span></label>
                      <input
                        className="field-input font-body-lg text-body-lg text-accent"
                        type="text"
                        required
                        value={v.size}
                        onChange={e => {
                          const newVariants = [...variants];
                          newVariants[globalIdx] = { ...newVariants[globalIdx], size: e.target.value };
                          setVariants(newVariants);
                        }}
                      />
                    </div>
                    <div>
                      <label className="field-label">Price (₹) <span className="text-error">*</span></label>
                      <input
                        className="field-input font-body-lg text-body-lg"
                        type="number"
                        min="0"
                        required
                        value={v.price}
                        onChange={e => {
                          const newVariants = [...variants];
                          newVariants[globalIdx] = { ...newVariants[globalIdx], price: Number(e.target.value) };
                          setVariants(newVariants);
                        }}
                      />
                    </div>
                    <div>
                      <label className="field-label">Stock <span className="text-error">*</span></label>
                      <input
                        className="field-input font-body-lg text-body-lg"
                        type="number"
                        min="0"
                        required
                        value={v.stock}
                        onChange={e => {
                          const newVariants = [...variants];
                          newVariants[globalIdx] = { ...newVariants[globalIdx], stock: Number(e.target.value) };
                          setVariants(newVariants);
                        }}
                      />
                    </div>
                    <div>
                      <label className="field-label">SKU (Optional)</label>
                      <input
                        className="field-input font-body-md text-body-md"
                        type="text"
                        value={v.sku}
                        onChange={e => {
                          const newVariants = [...variants];
                          newVariants[globalIdx] = { ...newVariants[globalIdx], sku: e.target.value };
                          setVariants(newVariants);
                        }}
                        placeholder={`${slugPrefix}-${v.size.replace(/\s+/g, '')}`}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
            {otherVariants.length === 0 && (
              <div className="text-on-surface-variant text-center py-4 font-body-sm">
                Select a category to populate variant options.
              </div>
            )}
            <button
              type="button"
              onClick={() => setVariants(prev => [...prev, { sku: '', size: '', price: 0, stock: 0, active: true, productType: selectedCategory?.type === 'BAKHOOR' ? 'BAKHOOR' : 'GENERAL' }])}
              className="flex items-center justify-center gap-2 py-3 border-2 border-dashed border-outline-variant rounded-lg text-on-surface-variant hover:text-accent hover:border-accent/50 transition-colors font-label-lg"
            >
              <Plus size={20} />
              Add Variant
            </button>
          </div>
        </div>
      )}

      {/* Visibility Settings */}
      <div className="card p-6 md:p-8">
        <h3 className="font-headline-sm text-headline-sm font-semibold text-on-surface mb-6">Visibility Settings</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <label className="flex items-center justify-between gap-4 p-4 border border-outline-variant rounded-lg cursor-pointer transition-colors hover:border-accent/50 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-accent has-[:focus-visible]:border-accent group">
            <div>
              <div className="font-label-lg text-on-surface group-hover:text-accent-hover transition-colors">Published</div>
              <div className="text-body-sm text-on-surface-variant mt-1">Make visible to customers</div>
            </div>
            <div className={`shrink-0 w-11 h-6 rounded-full transition-colors relative ${formData.active ? 'bg-accent' : 'bg-surface-variant'}`}>
              <div className={`absolute top-1 left-1 bg-surface-container-lowest w-4 h-4 rounded-full transition-transform ${formData.active ? 'translate-x-5' : ''}`} />
            </div>
            <input type="checkbox" className="sr-only" name="active" checked={formData.active} onChange={handleInputChange} />
          </label>

          <label className="flex items-center justify-between gap-4 p-4 border border-outline-variant rounded-lg cursor-pointer transition-colors hover:border-accent/50 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-accent has-[:focus-visible]:border-accent group">
            <div>
              <div className="font-label-lg text-on-surface group-hover:text-accent-hover transition-colors">Featured</div>
              <div className="text-body-sm text-on-surface-variant mt-1">Show in featured sections</div>
            </div>
            <div className={`shrink-0 w-11 h-6 rounded-full transition-colors relative ${formData.featured ? 'bg-accent' : 'bg-surface-variant'}`}>
              <div className={`absolute top-1 left-1 bg-surface-container-lowest w-4 h-4 rounded-full transition-transform ${formData.featured ? 'translate-x-5' : ''}`} />
            </div>
            <input type="checkbox" className="sr-only" name="featured" checked={formData.featured} onChange={handleInputChange} />
          </label>

          <label className="flex items-center justify-between gap-4 p-4 border border-outline-variant rounded-lg cursor-pointer transition-colors hover:border-accent/50 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-accent has-[:focus-visible]:border-accent group">
            <div>
              <div className="font-label-lg text-on-surface group-hover:text-accent-hover transition-colors">In Collections</div>
              <div className="text-body-sm text-on-surface-variant mt-1">Show on Collections page</div>
            </div>
            <div className={`shrink-0 w-11 h-6 rounded-full transition-colors relative ${formData.featuredInCollection ? 'bg-accent' : 'bg-surface-variant'}`}>
              <div className={`absolute top-1 left-1 bg-surface-container-lowest w-4 h-4 rounded-full transition-transform ${formData.featuredInCollection ? 'translate-x-5' : ''}`} />
            </div>
            <input type="checkbox" className="sr-only" name="featuredInCollection" checked={formData.featuredInCollection} onChange={handleInputChange} />
          </label>
        </div>
      </div>

      {/* Advanced Details Accordion */}
      <div className="card overflow-hidden">
        <button
          type="button"
          onClick={() => setAdvancedOpen(!advancedOpen)}
          className="w-full flex items-center justify-between p-6 md:p-8 text-left transition-colors hover:bg-surface-container focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:-outline-offset-2"
          aria-expanded={advancedOpen}
        >
          <div>
            <h3 className="font-headline-sm text-headline-sm font-semibold text-on-surface">Advanced Details</h3>
            <p className="font-body-sm text-on-surface-variant mt-1">Brand, Fragrance Pyramid, SEO Slug</p>
          </div>
          <div className="p-2 rounded-full bg-surface-variant/40 text-on-surface-variant shrink-0">
            {advancedOpen ? <ChevronUp size={22} /> : <ChevronDown size={22} />}
          </div>
        </button>

        {advancedOpen && (
          <div className="p-6 md:p-8 pt-0 border-t border-outline-variant space-y-6 mt-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-6">
              <div>
                <label className="field-label">Brand</label>
                <input name="brand" value={formData.brand} onChange={handleInputChange} className="field-input font-body-md text-body-md" type="text" />
              </div>
              <div>
                <label className="field-label">URL Slug</label>
                <input name="slug" value={formData.slug} onChange={handleInputChange} className="field-input font-body-md text-body-md text-on-surface-variant" type="text" />
              </div>
              <div>
                <label className="field-label">Gender</label>
                <select name="gender" value={formData.gender} onChange={handleInputChange} className="field-input font-body-md text-body-md">
                  <option value="UNISEX">Unisex</option>
                  <option value="MALE">Male</option>
                  <option value="FEMALE">Female</option>
                </select>
              </div>
              <div>
                <label className="field-label">Fragrance Family</label>
                <input name="fragranceFamily" value={formData.fragranceFamily} onChange={handleInputChange} className="field-input font-body-md text-body-md" type="text" />
              </div>
              <div>
                <label className="field-label">Top Notes</label>
                <input name="topNotes" value={formData.topNotes} onChange={handleInputChange} className="field-input font-body-md text-body-md" type="text" />
              </div>
              <div>
                <label className="field-label">Heart Notes</label>
                <input name="middleNotes" value={formData.middleNotes} onChange={handleInputChange} className="field-input font-body-md text-body-md" type="text" />
              </div>
              <div>
                <label className="field-label">Base Notes</label>
                <input name="baseNotes" value={formData.baseNotes} onChange={handleInputChange} className="field-input font-body-md text-body-md" type="text" />
              </div>
              <div>
                <label className="field-label">Longevity</label>
                <input name="longevity" value={formData.longevity} onChange={handleInputChange} className="field-input font-body-md text-body-md" type="text" placeholder="e.g., 12+ Hours" />
              </div>
              <div>
                <label className="field-label">Projection</label>
                <input name="projection" value={formData.projection} onChange={handleInputChange} className="field-input font-body-md text-body-md" type="text" placeholder="e.g., Strong" />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Sticky Footer */}
      <div className="fixed bottom-0 left-0 w-full md:w-[calc(100%-16rem)] md:ml-64 bg-surface-container-lowest border-t border-outline-variant p-4 z-40 shadow-[0_-10px_30px_rgba(18,28,42,.06)] flex justify-end gap-4 px-gutter">
        <button type="button" onClick={onCancel} className="btn btn-outline">
          Cancel
        </button>
        <button type="submit" disabled={isSubmitting} className="btn btn-primary">
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>Save Product</>
          )}
        </button>
      </div>
    </form>
  );
};
