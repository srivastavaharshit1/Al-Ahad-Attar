import React, { useState, useEffect } from 'react';
import type { Category } from '../../types';
import { ImageManager, type ManagedImage } from './ImageManager';
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
  const [images, setImages] = useState<ManagedImage[]>(initialImages);

  const [advancedOpen, setAdvancedOpen] = useState(false);

  useEffect(() => {
    setFormData(initialData);
  }, [initialData]);

  useEffect(() => {
    setVariants(initialVariants);
  }, [initialVariants]);

  useEffect(() => {
    setImages(initialImages);
  }, [initialImages]);



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

  const handleVariantChange = (index: number, field: string, value: string | number | boolean) => {
    setVariants(prev => {
      const newVariants = [...prev];
      newVariants[index] = { ...newVariants[index], [field]: value };
      return newVariants;
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData, variants, images);
  };

  const selectedCategory = categories.find(c => c.id.toString() === formData.categoryId.toString());

  // Automatically update variants when category changes and it's a new product
  useEffect(() => {
    if (formData.categoryId && !productId) {
      const cat = categories.find(c => c.id.toString() === formData.categoryId.toString());
      if (cat) {
        if (cat.type === 'ATTARS') {
          setVariants([
            { sku: '', size: '3 ml', price: 0, stock: 0, active: true },
            { sku: '', size: '6 ml', price: 0, stock: 0, active: true },
            { sku: '', size: '12 ml', price: 0, stock: 0, active: true }
          ]);
        } else if (cat.type === 'BAKHOOR') {
          if (formData.subcategory === 'Incense Sticks') {
            setVariants([
              { sku: '', size: '100 gm', price: 0, stock: 0, active: true },
              { sku: '', size: '250 gm', price: 0, stock: 0, active: true }
            ]);
          } else {
            setVariants([
              { sku: '', size: '40 g', price: 0, stock: 0, active: true }
            ]);
          }
        } else if (cat.type === 'PERFUMES') {
          if (formData.subcategory === 'Car Perfumes') {
            setVariants([
              { sku: '', size: '1 pc', price: 0, stock: 0, active: true }
            ]);
          } else {
            setVariants([
              { sku: '', size: '30 ml', price: 0, stock: 0, active: true },
              { sku: '', size: '60 ml', price: 0, stock: 0, active: true },
              { sku: '', size: '100 ml', price: 0, stock: 0, active: true }
            ]);
          }
        }
      }
    }
  }, [formData.categoryId, formData.subcategory, categories, productId]);


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
            <label className="field-label">Short Description <span className="text-error">*</span></label>
            <input
              name="shortDescription"
              value={formData.shortDescription}
              onChange={handleInputChange}
              required
              className="field-input font-body-md text-body-md"
              type="text"
              placeholder="Brief summary for product cards..."
            />
          </div>
        </div>
      </div>

      {/* Product Images */}
      <ImageManager
        productId={productId}
        images={images}
        onImagesChange={setImages}
      />

      {/* Pricing & Inventory */}
      <div className="card p-6 md:p-8">
        <h3 className="font-headline-sm text-headline-sm font-semibold text-on-surface mb-6">Pricing &amp; Inventory</h3>
        <div className="grid grid-cols-1 gap-4">
          {variants.map((v, idx) => (
            <div key={idx} className="bg-surface-container border border-outline-variant rounded-lg p-6 flex flex-col md:flex-row md:items-center gap-6 transition-colors hover:border-accent/40 relative">
              <button
                type="button"
                onClick={() => setVariants(prev => prev.filter((_, i) => i !== idx))}
                className="absolute top-2 right-2 p-2 text-on-surface-variant hover:text-error transition-colors"
                title="Remove Variant"
              >
                <Trash2 size={18} />
              </button>
              <div className="md:w-1/4 pt-4 md:pt-0">
                <label className="field-label mb-1">Variant Size <span className="text-error">*</span></label>
                <input
                  className="field-input font-body-lg text-body-lg text-accent"
                  type="text"
                  required
                  value={v.size}
                  onChange={e => handleVariantChange(idx, 'size', e.target.value)}
                />
              </div>
              <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <label className="field-label">Price (₹) <span className="text-error">*</span></label>
                  <input
                    className="field-input font-body-lg text-body-lg"
                    type="number"
                    min="0"
                    required
                    value={v.price}
                    onChange={e => handleVariantChange(idx, 'price', e.target.value)}
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
                    onChange={e => handleVariantChange(idx, 'stock', e.target.value)}
                  />
                </div>
                <div className="col-span-2">
                  <label className="field-label">SKU (Optional)</label>
                  <input
                    className="field-input font-body-md text-body-md"
                    type="text"
                    value={v.sku}
                    onChange={e => handleVariantChange(idx, 'sku', e.target.value)}
                    placeholder={`${formData.slug}-${v.size.replace(/\s+/g, '')}`}
                  />
                </div>
              </div>
            </div>
          ))}
          {variants.length === 0 && (
            <div className="text-on-surface-variant text-center py-4 font-body-sm">
              Select a category to populate variant options.
            </div>
          )}
          
          <button
            type="button"
            onClick={() => setVariants(prev => [...prev, { sku: '', size: '', price: 0, stock: 0, active: true }])}
            className="flex items-center justify-center gap-2 py-3 border-2 border-dashed border-outline-variant rounded-lg text-on-surface-variant hover:text-accent hover:border-accent/50 transition-colors font-label-lg"
          >
            <Plus size={20} />
            Add Variant
          </button>
        </div>
      </div>

      {/* Visibility */}
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
                <input
                  name="brand"
                  value={formData.brand}
                  onChange={handleInputChange}
                  className="field-input font-body-md text-body-md"
                  type="text"
                />
              </div>
              <div>
                <label className="field-label">URL Slug</label>
                <input
                  name="slug"
                  value={formData.slug}
                  onChange={handleInputChange}
                  className="field-input font-body-md text-body-md text-on-surface-variant"
                  type="text"
                />
              </div>
              <div>
                <label className="field-label">Gender</label>
                <select
                  name="gender"
                  value={formData.gender}
                  onChange={handleInputChange}
                  className="field-input font-body-md text-body-md"
                >
                  <option value="UNISEX">Unisex</option>
                  <option value="MALE">Male</option>
                  <option value="FEMALE">Female</option>
                </select>
              </div>
              <div>
                <label className="field-label">Fragrance Family</label>
                <input
                  name="fragranceFamily"
                  value={formData.fragranceFamily}
                  onChange={handleInputChange}
                  className="field-input font-body-md text-body-md"
                  type="text"
                />
              </div>
              <div>
                <label className="field-label">Top Notes</label>
                <input
                  name="topNotes"
                  value={formData.topNotes}
                  onChange={handleInputChange}
                  className="field-input font-body-md text-body-md"
                  type="text"
                />
              </div>
              <div>
                <label className="field-label">Heart Notes</label>
                <input
                  name="middleNotes"
                  value={formData.middleNotes}
                  onChange={handleInputChange}
                  className="field-input font-body-md text-body-md"
                  type="text"
                />
              </div>
              <div>
                <label className="field-label">Base Notes</label>
                <input
                  name="baseNotes"
                  value={formData.baseNotes}
                  onChange={handleInputChange}
                  className="field-input font-body-md text-body-md"
                  type="text"
                />
              </div>
              <div>
                <label className="field-label">Longevity</label>
                <input
                  name="longevity"
                  value={formData.longevity}
                  onChange={handleInputChange}
                  className="field-input font-body-md text-body-md"
                  type="text"
                  placeholder="e.g., 12+ Hours"
                />
              </div>
              <div>
                <label className="field-label">Projection</label>
                <input
                  name="projection"
                  value={formData.projection}
                  onChange={handleInputChange}
                  className="field-input font-body-md text-body-md"
                  type="text"
                  placeholder="e.g., Strong"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Sticky Footer */}
      <div className="fixed bottom-0 left-0 w-full md:w-[calc(100%-16rem)] md:ml-64 bg-surface-container-lowest border-t border-outline-variant p-4 z-40 shadow-[0_-10px_30px_rgba(18,28,42,.06)] flex justify-end gap-4 px-gutter">
        <button
          type="button"
          onClick={onCancel}
          className="btn btn-outline"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="btn btn-primary"
        >
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
