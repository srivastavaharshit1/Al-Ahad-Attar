import React, { useState, useEffect } from 'react';
import type { Category } from '../../types';
import { ImageManager, type ManagedImage } from './ImageManager';
import { ChevronDown, ChevronUp } from 'lucide-react';

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

    if (name === 'name' && !formData.slug && !productId) {
      setFormData(prev => ({
        ...prev,
        slug: value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '')
      }));
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
          setVariants([
            { sku: '', size: '40 g', price: 0, stock: 0, active: true }
          ]);
        } else if (cat.type === 'PERFUMES') {
          setVariants([
            { sku: '', size: '30 ml', price: 0, stock: 0, active: true },
            { sku: '', size: '60 ml', price: 0, stock: 0, active: true },
            { sku: '', size: '100 ml', price: 0, stock: 0, active: true }
          ]);
        }
      }
    }
  }, [formData.categoryId, categories, productId]);


  return (
    <form onSubmit={handleSubmit} className="pb-32 space-y-8">
      {/* Basic Information */}
      <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-8 shadow-sm">
        <h3 className="font-headline-md text-headline-md font-semibold text-on-surface mb-6">Basic Information</h3>
        <div className="space-y-8">
          <div>
            <label className="block font-label-sm text-label-sm text-on-surface-variant uppercase mb-2">Product Name <span className="text-error">*</span></label>
            <input 
              name="name" 
              value={formData.name} 
              onChange={handleInputChange} 
              required 
              className="w-full border-b border-outline-variant bg-transparent p-0 pb-1 focus:border-primary focus:ring-0 font-body-lg text-body-lg text-on-surface" 
              placeholder="e.g., Oud Majestique" 
              type="text" 
            />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <label className="block font-label-sm text-label-sm text-on-surface-variant uppercase mb-2">Category <span className="text-error">*</span></label>
              <select 
                name="categoryId" 
                value={formData.categoryId} 
                onChange={handleInputChange} 
                required 
                className="w-full border-b border-outline-variant bg-transparent p-0 pb-1 focus:border-primary focus:ring-0 font-body-md text-body-md text-on-surface"
              >
                <option value="">Select Category</option>
                {categories.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            {selectedCategory?.type === 'BAKHOOR' && (
              <div>
                <label className="block font-label-sm text-label-sm text-on-surface-variant uppercase mb-2">Subcategory</label>
                <select 
                  name="subcategory" 
                  value={formData.subcategory} 
                  onChange={handleInputChange} 
                  required 
                  className="w-full border-b border-outline-variant bg-transparent p-0 pb-1 focus:border-primary focus:ring-0 font-body-md text-body-md text-on-surface"
                >
                  <option value="">Select Subcategory</option>
                  <option value="BAKHOOR">Bakhoor</option>
                  <option value="FRESHENERS">Fresheners</option>
                </select>
              </div>
            )}
          </div>

          <div>
            <label className="block font-label-sm text-label-sm text-on-surface-variant uppercase mb-2">Short Description</label>
            <input 
              name="shortDescription" 
              value={formData.shortDescription} 
              onChange={handleInputChange} 
              className="w-full border-b border-outline-variant bg-transparent p-0 pb-1 focus:border-primary focus:ring-0 font-body-md text-body-md text-on-surface" 
              type="text" 
              placeholder="Brief summary for product cards..."
            />
          </div>
          <div>
            <label className="block font-label-sm text-label-sm text-on-surface-variant uppercase mb-2">Description <span className="text-error">*</span></label>
            <textarea 
              name="description" 
              value={formData.description} 
              onChange={handleInputChange} 
              required 
              className="w-full border border-outline-variant rounded-lg bg-surface-container-lowest p-4 focus:border-primary focus:ring-1 focus:ring-primary font-body-md text-body-md text-on-surface resize-y min-h-[120px]" 
              placeholder="Detailed product description..."
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
      <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-8 shadow-sm">
        <h3 className="font-headline-md text-headline-md font-semibold text-on-surface mb-6">Pricing & Inventory</h3>
        <div className="grid grid-cols-1 gap-6">
          {variants.map((v, idx) => (
            <div key={idx} className="bg-surface-container-lowest border border-outline-variant rounded-lg p-6 flex flex-col md:flex-row md:items-center gap-6 hover:border-primary/30 transition-colors">
              <div className="md:w-1/4">
                <label className="block font-label-sm text-label-sm text-on-surface-variant uppercase mb-1">Variant Size</label>
                <div className="font-headline-sm text-primary">{v.size}</div>
              </div>
              <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <label className="block font-label-sm text-label-sm text-on-surface-variant uppercase mb-2">Price (₹) <span className="text-error">*</span></label>
                  <input 
                    className="w-full border-b border-outline-variant bg-transparent p-0 pb-1 focus:border-primary focus:ring-0 font-body-lg" 
                    type="number" 
                    min="0" 
                    required
                    value={v.price} 
                    onChange={e => handleVariantChange(idx, 'price', e.target.value)} 
                  />
                </div>
                <div>
                  <label className="block font-label-sm text-label-sm text-on-surface-variant uppercase mb-2">Stock <span className="text-error">*</span></label>
                  <input 
                    className="w-full border-b border-outline-variant bg-transparent p-0 pb-1 focus:border-primary focus:ring-0 font-body-lg" 
                    type="number" 
                    min="0" 
                    required
                    value={v.stock} 
                    onChange={e => handleVariantChange(idx, 'stock', e.target.value)} 
                  />
                </div>
                <div className="col-span-2">
                  <label className="block font-label-sm text-label-sm text-on-surface-variant uppercase mb-2">SKU (Optional)</label>
                  <input 
                    className="w-full border-b border-outline-variant bg-transparent p-0 pb-1 focus:border-primary focus:ring-0 font-body-md" 
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
            <div className="text-on-surface-variant text-center py-4">
              Select a category to populate variant options.
            </div>
          )}
        </div>
      </div>

      {/* Visibility */}
      <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-8 shadow-sm">
        <h3 className="font-headline-md text-headline-md font-semibold text-on-surface mb-6">Visibility Settings</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <label className="flex items-center justify-between p-4 border border-outline-variant rounded-lg cursor-pointer hover:bg-surface-container-lowest transition-colors group">
            <div>
              <div className="font-label-lg text-on-surface group-hover:text-primary transition-colors">Published</div>
              <div className="text-body-sm text-on-surface-variant mt-1">Make visible to customers</div>
            </div>
            <div className={`w-11 h-6 rounded-full transition-colors relative ${formData.active ? 'bg-primary' : 'bg-surface-variant'}`}>
              <div className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform ${formData.active ? 'translate-x-5' : ''}`} />
            </div>
            <input type="checkbox" className="hidden" name="active" checked={formData.active} onChange={handleInputChange} />
          </label>
          
          <label className="flex items-center justify-between p-4 border border-outline-variant rounded-lg cursor-pointer hover:bg-surface-container-lowest transition-colors group">
            <div>
              <div className="font-label-lg text-on-surface group-hover:text-primary transition-colors">Featured</div>
              <div className="text-body-sm text-on-surface-variant mt-1">Show in featured sections</div>
            </div>
            <div className={`w-11 h-6 rounded-full transition-colors relative ${formData.featured ? 'bg-primary' : 'bg-surface-variant'}`}>
              <div className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform ${formData.featured ? 'translate-x-5' : ''}`} />
            </div>
            <input type="checkbox" className="hidden" name="featured" checked={formData.featured} onChange={handleInputChange} />
          </label>

          <label className="flex items-center justify-between p-4 border border-outline-variant rounded-lg cursor-pointer hover:bg-surface-container-lowest transition-colors group">
            <div>
              <div className="font-label-lg text-on-surface group-hover:text-primary transition-colors">In Collections</div>
              <div className="text-body-sm text-on-surface-variant mt-1">Show on Collections page</div>
            </div>
            <div className={`w-11 h-6 rounded-full transition-colors relative ${formData.featuredInCollection ? 'bg-primary' : 'bg-surface-variant'}`}>
              <div className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform ${formData.featuredInCollection ? 'translate-x-5' : ''}`} />
            </div>
            <input type="checkbox" className="hidden" name="featuredInCollection" checked={formData.featuredInCollection} onChange={handleInputChange} />
          </label>
        </div>
      </div>

      {/* Advanced Details Accordion */}
      <div className="bg-surface-container-lowest border border-outline-variant rounded-xl shadow-sm overflow-hidden">
        <button 
          type="button"
          onClick={() => setAdvancedOpen(!advancedOpen)}
          className="w-full flex items-center justify-between p-8 text-left focus:outline-none hover:bg-surface-container-lowest transition-colors"
        >
          <div>
            <h3 className="font-headline-md text-headline-md font-semibold text-on-surface">Advanced Details</h3>
            <p className="font-body-sm text-on-surface-variant mt-1">Brand, Fragrance Pyramid, SEO Slug</p>
          </div>
          <div className="p-2 rounded-full bg-surface-variant/20 text-on-surface-variant">
            {advancedOpen ? <ChevronUp size={24} /> : <ChevronDown size={24} />}
          </div>
        </button>
        
        {advancedOpen && (
          <div className="p-8 pt-0 border-t border-outline-variant space-y-8 mt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div>
                <label className="block font-label-sm text-label-sm text-on-surface-variant uppercase mb-2">Brand</label>
                <input 
                  name="brand" 
                  value={formData.brand} 
                  onChange={handleInputChange} 
                  className="w-full border-b border-outline-variant bg-transparent p-0 pb-1 focus:border-primary focus:ring-0 font-body-md" 
                  type="text" 
                />
              </div>
              <div>
                <label className="block font-label-sm text-label-sm text-on-surface-variant uppercase mb-2">URL Slug</label>
                <input 
                  name="slug" 
                  value={formData.slug} 
                  onChange={handleInputChange} 
                  className="w-full border-b border-outline-variant bg-transparent p-0 pb-1 focus:border-primary focus:ring-0 font-body-md text-on-surface-variant" 
                  type="text" 
                />
              </div>
              <div>
                <label className="block font-label-sm text-label-sm text-on-surface-variant uppercase mb-2">Gender</label>
                <select 
                  name="gender" 
                  value={formData.gender} 
                  onChange={handleInputChange} 
                  className="w-full border-b border-outline-variant bg-transparent p-0 pb-1 focus:border-primary focus:ring-0 font-body-md"
                >
                  <option value="UNISEX">Unisex</option>
                  <option value="MALE">Male</option>
                  <option value="FEMALE">Female</option>
                </select>
              </div>
              <div>
                <label className="block font-label-sm text-label-sm text-on-surface-variant uppercase mb-2">Fragrance Family</label>
                <input 
                  name="fragranceFamily" 
                  value={formData.fragranceFamily} 
                  onChange={handleInputChange} 
                  className="w-full border-b border-outline-variant bg-transparent p-0 pb-1 focus:border-primary focus:ring-0 font-body-md" 
                  type="text" 
                />
              </div>
              <div>
                <label className="block font-label-sm text-label-sm text-on-surface-variant uppercase mb-2">Top Notes</label>
                <input 
                  name="topNotes" 
                  value={formData.topNotes} 
                  onChange={handleInputChange} 
                  className="w-full border-b border-outline-variant bg-transparent p-0 pb-1 focus:border-primary focus:ring-0 font-body-md" 
                  type="text" 
                />
              </div>
              <div>
                <label className="block font-label-sm text-label-sm text-on-surface-variant uppercase mb-2">Heart Notes</label>
                <input 
                  name="middleNotes" 
                  value={formData.middleNotes} 
                  onChange={handleInputChange} 
                  className="w-full border-b border-outline-variant bg-transparent p-0 pb-1 focus:border-primary focus:ring-0 font-body-md" 
                  type="text" 
                />
              </div>
              <div>
                <label className="block font-label-sm text-label-sm text-on-surface-variant uppercase mb-2">Base Notes</label>
                <input 
                  name="baseNotes" 
                  value={formData.baseNotes} 
                  onChange={handleInputChange} 
                  className="w-full border-b border-outline-variant bg-transparent p-0 pb-1 focus:border-primary focus:ring-0 font-body-md" 
                  type="text" 
                />
              </div>
              <div>
                <label className="block font-label-sm text-label-sm text-on-surface-variant uppercase mb-2">Longevity</label>
                <input 
                  name="longevity" 
                  value={formData.longevity} 
                  onChange={handleInputChange} 
                  className="w-full border-b border-outline-variant bg-transparent p-0 pb-1 focus:border-primary focus:ring-0 font-body-md" 
                  type="text" 
                  placeholder="e.g., 12+ Hours"
                />
              </div>
              <div>
                <label className="block font-label-sm text-label-sm text-on-surface-variant uppercase mb-2">Projection</label>
                <input 
                  name="projection" 
                  value={formData.projection} 
                  onChange={handleInputChange} 
                  className="w-full border-b border-outline-variant bg-transparent p-0 pb-1 focus:border-primary focus:ring-0 font-body-md" 
                  type="text" 
                  placeholder="e.g., Strong"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Sticky Footer */}
      <div className="fixed bottom-0 left-0 w-full md:w-[calc(100%-16rem)] md:ml-64 bg-surface-container-lowest border-t border-outline-variant p-4 z-40 shadow-[0_-10px_30px_rgba(31,41,55,0.04)] flex justify-end gap-4 px-gutter">
        <button 
          type="button"
          onClick={onCancel} 
          className="px-6 py-2.5 rounded-lg border border-secondary text-secondary font-label-md text-label-md hover:bg-surface-variant transition-colors"
        >
          Cancel
        </button>
        <button 
          type="submit" 
          disabled={isSubmitting} 
          className="px-8 py-2.5 rounded-lg bg-primary text-on-primary font-label-md text-label-md hover:bg-primary-container hover:text-on-primary-container transition-colors shadow-sm disabled:opacity-50 flex items-center gap-2"
        >
          {isSubmitting ? (
            <>Saving...</>
          ) : (
            <>Save Product</>
          )}
        </button>
      </div>
    </form>
  );
};
