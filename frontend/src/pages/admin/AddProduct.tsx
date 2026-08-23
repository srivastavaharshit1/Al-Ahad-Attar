import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { productService } from '../../services/productService';
import { categoryService } from '../../services/categoryService';
import { apiClient } from '../../api/axios';
import type { Category } from '../../types';
import { ProductForm, type ProductFormData, type VariantData } from '../../components/admin/ProductForm';
import type { ManagedImage } from '../../components/admin/ImageManager';

export const AddProduct: React.FC = () => {
  const navigate = useNavigate();
  const [categories, setCategories] = useState<Category[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const initialData: ProductFormData = {
    name: '',
    slug: '',
    shortDescription: '',
    description: '',
    brand: 'Al Ahad',
    subcategory: '',
    fragranceFamily: '',
    topNotes: '',
    middleNotes: '',
    baseNotes: '',
    longevity: '12+ Hours',
    projection: 'Strong',
    gender: 'UNISEX',
    featured: false,
    featuredInCollection: false,
    active: true,
    categoryId: ''
  };

  const initialVariants: VariantData[] = [];
  const initialImages: ManagedImage[] = [];

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const response = await categoryService.getCategories({ size: 100 });
      setCategories(response.content || []);
    } catch (err) {
      console.error("Failed to load categories", err);
    }
  };

  const handleSubmit = async (formData: ProductFormData, variants: VariantData[], images: ManagedImage[]) => {
    setError('');
    
    if (!formData.categoryId) {
      setError('Please select a category');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    try {
      setIsSubmitting(true);
      
      // 1. Create Product
      const productPayload = {
        ...formData,
        slug: formData.slug || formData.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, ''),
        categoryId: Number(formData.categoryId)
      };
      
      const productRes = await productService.createProduct(productPayload);
      const productId = productRes.data.id;

      // 2. Create Variants Concurrently
      const variantPromises = variants
        .filter(variant => variant.price > 0 || variant.stock > 0)
        .map(variant => {
          const variantPayload = {
            productType: variant.productType,
            sku: variant.sku || `${formData.slug}-${variant.size.replace(/\s+/g, '')}`,
            size: variant.size,
            price: Number(variant.price),
            stock: Number(variant.stock),
            active: variant.active
          };
          return apiClient.post(`/products/${productId}/variants`, variantPayload);
        });
      await Promise.all(variantPromises);

      // 3. Upload Images Concurrently
      const imagePromises = images
        .filter(image => image.file)
        .map(async (image) => {
          const formPayload = new FormData();
          formPayload.append('file', image.file as File, (image.file as File).name);
          const uploadRes = await apiClient.post(`/products/${productId}/images`, formPayload, {
            timeout: 60000 // Increase timeout for large file uploads
          });
          
          if (image.isPrimary) {
            const uploadedImageId = uploadRes.data.data.id;
            await apiClient.patch(`/images/${uploadedImageId}/primary`, {});
          }
        });
      await Promise.all(imagePromises);

      navigate('/admin/products');
    } catch (err: any) {
      console.error("Failed to save product", err);
      setError(err.response?.data?.message || 'Failed to save product');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <div className="flex items-center gap-2 mb-6">
        <Link
          to="/admin/products"
          className="text-on-surface-variant hover:text-accent-hover transition-colors flex items-center gap-1 rounded-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2"
        >
          <span className="material-symbols-outlined text-sm">arrow_back</span>
          <span className="font-label-md text-label-md">Back to Products</span>
        </Link>
      </div>

      <div className="flex justify-between items-end mb-8">
        <div>
          <h2 className="font-headline-lg text-headline-lg font-semibold text-primary">Add New Fragrance</h2>
          <p className="font-body-md text-body-md text-on-surface-variant mt-2">Create a new olfactory experience in the catalog.</p>
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-3 bg-error-container text-on-error-container p-4 rounded-lg mb-8 shadow-sm border border-error/20">
          <span className="material-symbols-outlined text-[20px] shrink-0" aria-hidden="true">error</span>
          <span className="font-body-sm">{error}</span>
        </div>
      )}

      <ProductForm 
        initialData={initialData}
        initialVariants={initialVariants}
        initialImages={initialImages}
        categories={categories}
        onSubmit={handleSubmit}
        isSubmitting={isSubmitting}
        onCancel={() => navigate('/admin/products')}
      />
    </>
  );
};
