import React, { useState, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { productService } from '../../services/productService';
import { categoryService } from '../../services/categoryService';
import { apiClient } from '../../api/axios';
import type { Category } from '../../types';
import { ProductForm, type ProductFormData, type VariantData } from '../../components/admin/ProductForm';
import type { ManagedImage } from '../../components/admin/TypedImageManager';
import { Loader } from '../../components/ui/Loader';

export const EditProduct: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [categories, setCategories] = useState<Category[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const [initialData, setInitialData] = useState<ProductFormData>({
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
    longevity: '',
    projection: '',
    gender: 'UNISEX',
    featured: false,
    featuredInCollection: false,
    active: true,
    categoryId: ''
  });

  const [initialVariants, setInitialVariants] = useState<VariantData[]>([]);
  const [initialImages, setInitialImages] = useState<ManagedImage[]>([]);

  useEffect(() => {
    fetchCategories();
    if (id) {
      fetchProduct(id);
    }
  }, [id]);

  const fetchCategories = async () => {
    try {
      const response = await categoryService.getCategories({ size: 100 });
      setCategories(response.content || []);
    } catch (err) {
      console.error("Failed to load categories", err);
    }
  };

  const fetchProduct = async (productId: string) => {
    try {
      setIsLoading(true);
      const res = await productService.getProduct(productId);
      const product = res.data;
      
      setInitialData({
        name: product.name || '',
        slug: product.slug || '',
        shortDescription: product.shortDescription || '',
        description: product.description || '',
        brand: product.brand || 'Al Ahad',
        subcategory: product.subCategory?.name || product.subCategory?.id?.toString() || '',
        fragranceFamily: product.fragranceFamily || '',
        topNotes: product.topNotes || '',
        middleNotes: product.middleNotes || '',
        baseNotes: product.baseNotes || '',
        longevity: product.longevity || '',
        projection: product.projection || '',
        gender: product.gender || 'UNISEX',
        featured: product.featured || false,
        featuredInCollection: product.featuredInCollection || false,
        active: product.active !== undefined ? product.active : true,
        categoryId: product.category?.id?.toString() || ''
      });

      setInitialImages(product.images || []);

      if (product.variants && product.variants.length > 0) {
        setInitialVariants(res.data.variants.map((pv: any) => ({
          id: pv.id,
          productType: pv.productType,
          sku: pv.sku,
          size: pv.size,
          price: pv.price,
          stock: pv.stock,
          active: pv.active
        })));
      }
    } catch (err) {
      console.error("Failed to load product", err);
      setError("Failed to load product details");
    } finally {
      setIsLoading(false);
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
      
      const productPayload = {
        ...formData,
        slug: formData.slug || formData.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, ''),
        categoryId: Number(formData.categoryId)
      };
      
      await productService.updateProduct(id as string, productPayload);

      const createVariants: any[] = [];
      const updateVariants: any[] = [];
      const deleteVariantIds: number[] = [];

      for (const variant of variants) {
        if (variant.id) {
          updateVariants.push({
            id: variant.id,
            productType: variant.productType,
            sku: variant.sku || `${formData.slug}-${variant.size.replace(/\s+/g, '')}`,
            size: variant.size,
            price: Number(variant.price),
            stock: Number(variant.stock),
            active: variant.active
          });
        } else if (variant.price > 0 || variant.stock > 0) {
          createVariants.push({
            productType: variant.productType,
            sku: variant.sku || `${formData.slug}-${variant.size.replace(/\s+/g, '')}`,
            size: variant.size,
            price: Number(variant.price),
            stock: Number(variant.stock),
            active: variant.active
          });
        }
      }

      const currentVariantIds = variants.map(v => v.id).filter(id => id !== undefined);
      initialVariants.forEach(v => {
        if (v.id && !currentVariantIds.includes(v.id)) {
          deleteVariantIds.push(v.id);
        }
      });

      if (createVariants.length > 0 || updateVariants.length > 0 || deleteVariantIds.length > 0) {
        await apiClient.put(`/products/${id}/variants/bulk`, {
          createVariants,
          updateVariants,
          deleteVariantIds
        });
      }

      // Reorder images per-type bucket so Attar and Perfume orders stay independent.
      // Group remote (number-id) images by their type tag and reorder each group separately.
      const remoteImages = images.filter(img => typeof img.id === 'number');
      const typeGroups: Record<string, number[]> = {};
      for (const img of remoteImages) {
        const tag = (img.altText?.toUpperCase()) || 'SHARED';
        if (!typeGroups[tag]) typeGroups[tag] = [];
        typeGroups[tag].push(img.id as number);
      }
      // Always send a reorder call if there are any remote images (preserves sort order across all types)
      const allRemoteIds = remoteImages.map(img => img.id as number);
      if (allRemoteIds.length > 0) {
        await apiClient.patch(`/products/${id}/images/reorder`, allRemoteIds);
      }

      toast.success('Product updated successfully!');
      await fetchProduct(id as string);
    } catch (err: any) {
      console.error("Failed to update product", err);
      setError(err.response?.data?.message || 'Failed to update product');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setIsSubmitting(false);
    }
  };


  if (isLoading) return <Loader />;

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
          <h2 className="font-headline-lg text-headline-lg font-semibold text-primary">Edit Fragrance</h2>
          <p className="font-body-md text-body-md text-on-surface-variant mt-2">Update product details and inventory.</p>
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-3 bg-error-container text-on-error-container p-4 rounded-lg mb-8 shadow-sm border border-error/20">
          <span className="material-symbols-outlined text-[20px] shrink-0" aria-hidden="true">error</span>
          <span className="font-body-sm">{error}</span>
        </div>
      )}

      <ProductForm 
        productId={Number(id)}
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
