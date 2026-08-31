import React, { useState, useEffect } from 'react';
import { bulkPricingService } from '../../services/bulkPricingService';
import type { BulkPricingScope, BulkPricingOperation, BulkPricingType, BulkPricingPreviewResponse } from '../../services/bulkPricingService';
import { categoryService } from '../../services/categoryService';
import type { Category } from '../../types';
import { formatPrice } from '../../utils/formatPrice';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import toast from 'react-hot-toast';
import { ConfirmationDialog } from '../../components/ui/ConfirmationDialog';
import { Loader } from '../../components/ui/Loader';

export const BulkPricing: React.FC = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [scope, setScope] = useState<BulkPricingScope>('UNIVERSAL');
  const [categoryId, setCategoryId] = useState<string>('');
  const [operation, setOperation] = useState<BulkPricingOperation>('INCREASE');
  const [type, setType] = useState<BulkPricingType>('PERCENTAGE');
  const [size, setSize] = useState<string>('');
  const [productTypeFilter, setProductTypeFilter] = useState<string>('');
  const [subcategory, setSubcategory] = useState<string>('');
  const [value, setValue] = useState<string>('');
  
  const [previewData, setPreviewData] = useState<BulkPricingPreviewResponse | null>(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [showApplyConfirm, setShowApplyConfirm] = useState(false);
  const [idempotencyKey, setIdempotencyKey] = useState<string>(crypto.randomUUID());

  useEffect(() => {
    setIdempotencyKey(crypto.randomUUID());
  }, [scope, categoryId, subcategory, productTypeFilter, operation, type, size, value]);

  useEffect(() => {
    categoryService.getActiveCategories().then(res => setCategories(res.data || [])).catch(console.error);
  }, []);

  const handlePreview = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsedValue = parseFloat(value);
    if (isNaN(parsedValue) || parsedValue <= 0) {
      toast.error('Please enter a valid positive number');
      return;
    }
    if (type === 'PERCENTAGE' && operation !== 'SET' && parsedValue > 99) {
      toast.error('Percentage cannot exceed 99');
      return;
    }
    if (scope === 'CATEGORY' && !categoryId) {
      toast.error('Please select a category');
      return;
    }

    try {
      setIsLoadingPreview(true);
      const res = await bulkPricingService.preview({
        scope,
        categoryId: scope === 'CATEGORY' ? parseInt(categoryId) : undefined,
        subcategory: scope === 'CATEGORY' && subcategory ? subcategory : undefined,
        productTypeFilter: scope === 'CATEGORY' && productTypeFilter ? productTypeFilter : undefined,
        operation,
        size: size || undefined,
        type,
        value: parsedValue
      });
      setPreviewData(res.data || null);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to generate preview');
      setPreviewData(null);
    } finally {
      setIsLoadingPreview(false);
    }
  };

  const handleApply = async () => {
    setShowApplyConfirm(false);
    const parsedValue = parseFloat(value);
    try {
      setIsApplying(true);
      const res = await bulkPricingService.apply({
        scope,
        categoryId: scope === 'CATEGORY' ? parseInt(categoryId) : undefined,
        subcategory: scope === 'CATEGORY' && subcategory ? subcategory : undefined,
        productTypeFilter: scope === 'CATEGORY' && productTypeFilter ? productTypeFilter : undefined,
        operation,
        size: size || undefined,
        type,
        value: parsedValue,
        idempotencyKey
      });
      toast.success(res.message || 'Prices successfully updated');
      setPreviewData(null);
      setShowApplyConfirm(false);
      setIdempotencyKey(crypto.randomUUID()); // Reset for next operation
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to apply bulk pricing');
    } finally {
      setIsApplying(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-display font-semibold">Bulk Pricing</h1>
          <p className="text-on-surface-variant mt-1">Safely increase or decrease prices across products.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Form Section */}
        <div className="bg-surface-container-lowest p-6 rounded-2xl border border-outline-variant shadow-sm h-fit">
          <h2 className="text-lg font-medium mb-4">Configuration</h2>
          <form onSubmit={handlePreview} className="space-y-5">
            <div>
              <label className="block text-sm font-medium mb-1">Scope</label>
              <select
                value={scope}
                onChange={(e) => {
                  setScope(e.target.value as BulkPricingScope);
                  setPreviewData(null);
                }}
                className="w-full h-11 px-4 rounded-xl border border-outline-variant bg-surface-container-lowest focus:ring-2 focus:ring-primary focus:border-primary transition-colors"
              >
                <option value="UNIVERSAL">All Products</option>
                <option value="CATEGORY">Specific Category</option>
              </select>
            </div>

            {scope === 'CATEGORY' && (
              <div>
                <label className="block text-sm font-medium mb-1">Category</label>
                <select
                  value={categoryId}
                  onChange={(e) => {
                    setCategoryId(e.target.value);
                    setSubcategory('');
                    setPreviewData(null);
                  }}
                  className="w-full h-11 px-4 rounded-xl border border-outline-variant bg-surface-container-lowest focus:ring-2 focus:ring-primary focus:border-primary transition-colors"
                  required
                >
                  <option value="">Select a category</option>
                  {categories.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
            )}

            {scope === 'CATEGORY' && categories.find(c => c.id.toString() === categoryId)?.name?.toLowerCase() === 'bakhoor' && (
              <div>
                <label className="block text-sm font-medium mb-1">Subcategory (Optional)</label>
                <select
                  value={subcategory}
                  onChange={(e) => {
                    setSubcategory(e.target.value);
                    setPreviewData(null);
                  }}
                  className="w-full h-11 px-4 rounded-xl border border-outline-variant bg-surface-container-lowest focus:ring-2 focus:ring-primary focus:border-primary transition-colors"
                >
                  <option value="">All Bakhoor</option>
                  <option value="Incense Sticks">Incense Sticks</option>
                </select>
              </div>
            )}

            {scope === 'CATEGORY' && categories.find(c => c.id.toString() === categoryId)?.name?.toLowerCase() === 'perfumes' && (
              <div>
                <label className="block text-sm font-medium mb-1">Subcategory (Optional)</label>
                <select
                  value={subcategory}
                  onChange={(e) => {
                    setSubcategory(e.target.value);
                    setPreviewData(null);
                  }}
                  className="w-full h-11 px-4 rounded-xl border border-outline-variant bg-surface-container-lowest focus:ring-2 focus:ring-primary focus:border-primary transition-colors"
                >
                  <option value="">All Perfumes</option>
                  <option value="Car Perfumes">Car Perfumes</option>
                </select>
              </div>
            )}

            {scope === 'CATEGORY' && (
              <div>
                <label className="block text-sm font-medium mb-1">Product Type (Optional)</label>
                <select
                  value={productTypeFilter}
                  onChange={(e) => {
                    setProductTypeFilter(e.target.value);
                    setPreviewData(null);
                  }}
                  className="w-full h-11 px-4 rounded-xl border border-outline-variant bg-surface-container-lowest focus:ring-2 focus:ring-primary focus:border-primary transition-colors"
                >
                  <option value="">All Types</option>
                  <option value="ATTAR">Only Attars</option>
                  <option value="PERFUME">Only Perfumes</option>
                </select>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium mb-1">Operation</label>
              <select
                value={operation}
                onChange={(e) => {
                  setOperation(e.target.value as BulkPricingOperation);
                  setPreviewData(null);
                }}
                className="w-full h-11 px-4 rounded-xl border border-outline-variant bg-surface-container-lowest focus:ring-2 focus:ring-primary focus:border-primary transition-colors"
              >
                <option value="INCREASE">Increase Price</option>
                <option value="DECREASE">Decrease Price</option>
                <option value="SET">Set Exact Price</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Variant Size (Optional)</label>
              <select
                value={size}
                onChange={(e) => {
                  setSize(e.target.value);
                  setPreviewData(null);
                }}
                className="w-full h-11 px-4 rounded-xl border border-outline-variant bg-surface-container-lowest focus:ring-2 focus:ring-primary focus:border-primary transition-colors"
              >
                <option value="">All Sizes</option>
                <optgroup label="Attars">
                  <option value="3ml">3ml</option>
                  <option value="6ml">6ml</option>
                  <option value="12ml">12ml</option>
                </optgroup>
                <optgroup label="Perfumes">
                  <option value="30ml">30ml</option>
                  <option value="60ml">60ml</option>
                  <option value="100ml">100ml</option>
                </optgroup>
                <optgroup label="Bakhoor & Incense">
                  <option value="40g">40g</option>
                  <option value="50gm">50gm</option>
                  <option value="250gm">250gm</option>
                </optgroup>
                <optgroup label="Car Perfumes & Others">
                  <option value="1pc">1 pc</option>
                </optgroup>
              </select>
            </div>

            {operation !== 'SET' && (
              <div>
                <label className="block text-sm font-medium mb-1">Adjustment Type</label>
                <select
                  value={type}
                  onChange={(e) => {
                    setType(e.target.value as BulkPricingType);
                    setPreviewData(null);
                  }}
                  className="w-full h-11 px-4 rounded-xl border border-outline-variant bg-surface-container-lowest focus:ring-2 focus:ring-primary focus:border-primary transition-colors"
                >
                  <option value="PERCENTAGE">Percentage (%)</option>
                  <option value="FIXED">Add/Subtract Fixed Amount (₹)</option>
                </select>
                <p className="text-xs text-on-surface-variant mt-1">
                  Note: This will {operation === 'INCREASE' ? 'add to' : 'subtract from'} the existing price. To set an exact final price, change Operation to "Set Exact Price".
                </p>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium mb-1">
                {operation === 'SET' ? 'New Exact Price (₹)' : (type === 'PERCENTAGE' ? 'Percentage (%)' : 'Amount (₹)')}
              </label>
              <Input
                type="number"
                step="0.01"
                min="0.01"
                max={type === 'PERCENTAGE' && operation !== 'SET' ? "99" : undefined}
                value={value}
                onChange={(e) => {
                  setValue(e.target.value);
                  setPreviewData(null);
                }}
                placeholder={operation === 'SET' ? 'e.g. 599' : (type === 'PERCENTAGE' ? 'e.g. 10' : 'e.g. 50')}
                required
              />
            </div>

            <Button type="submit" className="w-full" disabled={isLoadingPreview}>
              {isLoadingPreview ? (
                <div className="w-5 h-5 flex justify-center items-center scale-50">
                  <Loader />
                </div>
              ) : 'Generate Preview'}
            </Button>
          </form>
        </div>

        {/* Preview Section */}
        <div className="bg-surface-container-lowest p-6 rounded-2xl border border-outline-variant shadow-sm h-fit">
          <h2 className="text-lg font-medium mb-4">Preview</h2>
          
          {!previewData && !isLoadingPreview && (
            <div className="text-center py-8 text-on-surface-variant">
              Generate a preview to see how prices will be affected.
            </div>
          )}

          {isLoadingPreview && (
            <div className="flex justify-center py-8">
              <Loader />
            </div>
          )}

          {previewData && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-surface-container p-4 rounded-xl">
                  <div className="text-sm text-on-surface-variant">Products Affected</div>
                  <div className="text-2xl font-medium mt-1">{previewData.productsAffected}</div>
                </div>
                <div className="bg-surface-container p-4 rounded-xl">
                  <div className="text-sm text-on-surface-variant">Net Value Change</div>
                  <div className={`text-xl font-medium mt-1 ${operation === 'DECREASE' ? 'text-red-600' : 'text-green-600'}`}>
                    {previewData.newTotalValue < previewData.currentTotalValue ? '-' : '+'} {formatPrice(Math.abs(previewData.newTotalValue - previewData.currentTotalValue))}
                  </div>
                </div>
              </div>

              <div>
                <h3 className="font-medium mb-3">Sample Changes</h3>
                <div className="space-y-3">
                  {previewData.examples.map((ex, i) => (
                    <div key={i} className="flex justify-between items-center p-3 bg-surface-container rounded-lg text-sm">
                      <div className="font-medium truncate max-w-[50%]">
                        {ex.productName} ({ex.variantSize})
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-on-surface-variant line-through">{formatPrice(ex.oldPrice)}</span>
                        <span className="material-symbols-outlined text-sm">arrow_forward</span>
                        <span className="font-bold">{formatPrice(ex.newPrice)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-4 border-t border-outline-variant">
                <Button 
                  onClick={() => setShowApplyConfirm(true)} 
                  className="w-full"
                  disabled={previewData.productsAffected === 0 || isApplying}
                >
                  Apply {operation === 'SET' ? `New Price ₹${value}` : (type === 'PERCENTAGE' ? `${value}%` : `₹${value}`)} {operation !== 'SET' ? operation.toLowerCase() : ''}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      <ConfirmationDialog
        isOpen={showApplyConfirm}
        title="Confirm Bulk Pricing"
        description={`Are you absolutely sure you want to apply ${operation === 'SET' ? 'a new price of ₹' + value : (type === 'PERCENTAGE' ? value + '%' : '₹' + value) + ' ' + operation.toLowerCase()} to ${previewData?.productsAffected} product variants? This action will immediately affect live prices.`}
        confirmText="Yes, Apply Changes"
        cancelText="Cancel"
        onConfirm={handleApply}
        onClose={() => setShowApplyConfirm(false)}
        dangerMode={true}
      />
    </div>
  );
};
