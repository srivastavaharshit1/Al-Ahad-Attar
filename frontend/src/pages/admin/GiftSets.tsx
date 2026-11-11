import React, { useState, useEffect, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { 
  Plus, 
  Search, 
  Edit3, 
  Trash2, 
  Eye, 
  EyeOff, 
  Star, 
  Package, 
  AlertTriangle, 
  CheckCircle2, 
  Boxes,
  Download
} from 'lucide-react';
import toast from 'react-hot-toast';
import { giftSetService } from '../../services/giftSetService';
import type { GiftSet } from '../../types/giftSet';
import { formatPrice } from '../../utils/formatPrice';
import { getImageUrl } from '../../utils/getImageUrl';
import { Pagination } from '../../components/ui/Pagination';
import { Loader } from '../../components/ui/Loader';
import { ConfirmationDialog } from '../../components/ui/ConfirmationDialog';
import { downloadCSV } from '../../utils/exportUtils';

export const GiftSets: React.FC = () => {
  const [giftSets, setGiftSets] = useState<GiftSet[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [searchParams, setSearchParams] = useSearchParams();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL'); // ALL, ACTIVE, INACTIVE
  const [stockFilter, setStockFilter] = useState<string>('ALL'); // ALL, IN_STOCK, LOW_STOCK, OUT_OF_STOCK

  const [archiveTargetId, setArchiveTargetId] = useState<number | null>(null);
  const [isArchiving, setIsArchiving] = useState(false);

  const currentPage = parseInt(searchParams.get('page') || '0', 10);

  const fetchGiftSets = async () => {
    try {
      setIsLoading(true);
      const res = await giftSetService.getAdminGiftSets({
        page: currentPage,
        size: 15,
        sort: 'displayOrder,asc',
      });
      setGiftSets(res.content || []);
      setTotalPages(res.totalPages || 0);
      setTotalElements(res.totalElements || 0);
    } catch (err) {
      console.error('Failed to load gift sets', err);
      toast.error('Failed to load gift sets');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchGiftSets();
  }, [currentPage]);

  // Status toggle handler
  const handleToggleStatus = async (set: GiftSet) => {
    const newActive = !set.active;
    try {
      await giftSetService.toggleStatus(set.id, newActive);
      setGiftSets(prev =>
        prev.map(g => (g.id === set.id ? { ...g, active: newActive } : g))
      );
      toast.success(newActive ? `Published "${set.name}"` : `Unpublished "${set.name}"`);
    } catch (err: any) {
      console.error('Failed to toggle status', err);
      toast.error(err?.response?.data?.message || 'Failed to update status');
    }
  };

  // Archive / Delete handler
  const handleArchiveConfirm = async () => {
    if (!archiveTargetId) return;
    setIsArchiving(true);
    try {
      await giftSetService.deleteGiftSet(archiveTargetId);
      toast.success('Gift Set archived successfully');
      setArchiveTargetId(null);
      fetchGiftSets();
    } catch (err: any) {
      console.error('Failed to archive gift set', err);
      toast.error(err?.response?.data?.message || 'Failed to archive gift set');
    } finally {
      setIsArchiving(false);
    }
  };

  const handlePageChange = (page: number) => {
    searchParams.set('page', page.toString());
    setSearchParams(searchParams);
  };

  // Filtered Gift Sets (client-side search & filtering)
  const filteredSets = useMemo(() => {
    return giftSets.filter((set) => {
      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesName = set.name.toLowerCase().includes(q);
        const matchesSlug = set.slug.toLowerCase().includes(q);
        const matchesComponents = set.items?.some(i => i.productName.toLowerCase().includes(q) || i.sku.toLowerCase().includes(q));
        if (!matchesName && !matchesSlug && !matchesComponents) return false;
      }

      // Status filter
      if (statusFilter === 'ACTIVE' && !set.active) return false;
      if (statusFilter === 'INACTIVE' && set.active) return false;

      // Stock filter
      if (stockFilter === 'IN_STOCK' && (!set.inStock || set.availableStock <= 5)) return false;
      if (stockFilter === 'LOW_STOCK' && (!set.inStock || set.availableStock > 5 || set.availableStock === 0)) return false;
      if (stockFilter === 'OUT_OF_STOCK' && set.inStock && set.availableStock > 0) return false;

      return true;
    });
  }, [giftSets, searchQuery, statusFilter, stockFilter]);

  // Export CSV summary
  const handleExportCSV = () => {
    const csvData = filteredSets.map(s => ({
      ID: s.id,
      Name: s.name,
      Slug: s.slug,
      Price: s.price,
      SalePrice: s.salePrice || '',
      Active: s.active ? 'Yes' : 'No',
      Featured: s.featured ? 'Yes' : 'No',
      AvailableUnits: s.availableStock,
      ComponentsCount: s.items?.length || 0,
      ComponentDetails: (s.items || []).map(i => `${i.productName} (${i.variantSize}) x${i.quantity}`).join(' | '),
    }));
    downloadCSV(csvData, `gift-sets-export-${new Date().toISOString().slice(0, 10)}.csv`);
    toast.success('Gift Sets exported to CSV');
  };

  return (
    <>
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-10">
        <div>
          <h1 className="font-headline-lg text-headline-lg text-on-surface">Gift Sets Masterlist</h1>
          <p className="font-body-md text-body-md text-on-surface-variant mt-1">
            Curate boutique fragrance gift sets, review component availability, and manage merchandising.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleExportCSV}
            disabled={filteredSets.length === 0}
            className="btn btn-outline px-4 py-2.5 rounded-lg inline-flex items-center gap-2 text-sm"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>

          <Link
            to="/admin/gift-sets/new"
            className="btn btn-primary px-5 py-2.5 rounded-lg inline-flex items-center gap-2 text-sm"
          >
            <Plus className="w-4 h-4" />
            Add Gift Set
          </Link>
        </div>
      </div>

      {/* Table Shell with Filters */}
      <div className="table-shell">
        <div className="p-4 sm:p-6 border-b border-outline-variant flex flex-wrap gap-4 items-center justify-between bg-surface-bright">
          <div className="flex flex-wrap items-center gap-3">
            {/* Search input */}
            <div className="relative min-w-[220px]">
              <input
                type="text"
                placeholder="Search by name, component..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="field-input py-2 pl-9 pr-3 text-sm w-full"
              />
              <Search className="w-4 h-4 text-on-surface-variant absolute left-3 top-1/2 -translate-y-1/2" />
            </div>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="field-input py-2 px-3 text-xs uppercase tracking-wider font-label-sm min-w-[140px]"
            >
              <option value="ALL">All Statuses</option>
              <option value="ACTIVE">Published (Active)</option>
              <option value="INACTIVE">Archived (Inactive)</option>
            </select>

            {/* Stock Filter */}
            <select
              value={stockFilter}
              onChange={(e) => setStockFilter(e.target.value)}
              className="field-input py-2 px-3 text-xs uppercase tracking-wider font-label-sm min-w-[140px]"
            >
              <option value="ALL">All Availability</option>
              <option value="IN_STOCK">In Stock (&gt; 5)</option>
              <option value="LOW_STOCK">Low Stock (1 - 5)</option>
              <option value="OUT_OF_STOCK">Out of Stock (0)</option>
            </select>
          </div>

          <div className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">
            Showing {filteredSets.length} of {totalElements} Gift Sets
          </div>
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="py-20 flex justify-center">
              <Loader />
            </div>
          ) : filteredSets.length === 0 ? (
            <div className="py-16 text-center text-on-surface-variant space-y-3">
              <Package className="w-10 h-10 mx-auto text-on-surface-variant/40" />
              <p className="font-label-lg text-label-lg font-medium">No Gift Sets found</p>
              <p className="text-xs text-on-surface-variant/80 max-w-sm mx-auto">
                {searchQuery || statusFilter !== 'ALL' || stockFilter !== 'ALL'
                  ? 'Try adjusting your search query or filter criteria.'
                  : 'Start by creating your first curated fragrance gift set.'}
              </p>
              {!searchQuery && statusFilter === 'ALL' && (
                <div className="pt-2">
                  <Link to="/admin/gift-sets/new" className="btn btn-secondary px-4 py-2 text-xs">
                    Create First Gift Set
                  </Link>
                </div>
              )}
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr>
                  <th className="py-3 px-4">Gift Set</th>
                  <th className="py-3 px-4">Components</th>
                  <th className="py-3 px-4">Price</th>
                  <th className="py-3 px-4">Calculated Stock</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/30">
                {filteredSets.map((set) => {
                  const primaryImg = set.primaryImageUrl || set.images?.[0]?.imageUrl;

                  // Find bottleneck component
                  let bottleneck = null;
                  let minQty = Infinity;
                  if (set.items) {
                    for (const item of set.items) {
                      const avail = Math.floor((item.currentVariantStock ?? 0) / item.quantity);
                      if (avail < minQty) {
                        minQty = avail;
                        bottleneck = item;
                      }
                    }
                  }

                  return (
                    <tr key={set.id} className="hover:bg-surface-container/40 transition-colors group">
                      {/* Name & Image */}
                      <td className="py-3.5 px-4" data-label="Gift Set">
                        <div className="flex items-center gap-3">
                          <div className="w-14 h-14 rounded-lg overflow-hidden bg-surface-variant border border-outline-variant shrink-0 flex items-center justify-center">
                            {primaryImg ? (
                              <img
                                src={getImageUrl(primaryImg)}
                                alt={set.name}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                              />
                            ) : (
                              <Package className="w-6 h-6 text-on-surface-variant/50" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="font-semibold text-on-surface truncate">
                                {set.name}
                              </span>
                              {set.featured && (
                                <span title="Featured Gift Set">
                                  <Star className="w-3.5 h-3.5 text-accent fill-accent shrink-0" />
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-on-surface-variant font-mono truncate">
                              /gift-sets/{set.slug}
                            </p>
                            <span className="inline-block mt-1 text-[11px] font-mono text-accent bg-accent-soft px-1.5 py-0.2 rounded">
                              Order: #{set.displayOrder ?? 0}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Included Components */}
                      <td className="py-3.5 px-4" data-label="Components">
                        <div className="space-y-1 max-w-xs">
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-on-surface">
                            <Boxes className="w-3 h-3 text-accent" />
                            {set.items?.length || 0} Fragrance {set.items?.length === 1 ? 'Item' : 'Items'}
                          </span>
                          <div className="flex flex-wrap gap-1">
                            {set.items?.map((item) => (
                              <span
                                key={item.id}
                                className="text-[11px] px-1.5 py-0.5 rounded bg-surface-container border border-outline-variant/40 text-on-surface-variant font-mono truncate max-w-[150px]"
                                title={`${item.productName} (${item.variantSize}) x${item.quantity}`}
                              >
                                {item.productName.slice(0, 12)}… ({item.variantSize}) x{item.quantity}
                              </span>
                            ))}
                          </div>
                        </div>
                      </td>

                      {/* Price */}
                      <td className="py-3.5 px-4 font-mono text-sm" data-label="Price">
                        {set.salePrice ? (
                          <div className="space-y-0.5">
                            <span className="text-accent font-bold block">{formatPrice(set.salePrice)}</span>
                            <span className="text-on-surface-variant line-through text-xs block">
                              {formatPrice(set.price)}
                            </span>
                          </div>
                        ) : (
                          <span className="font-semibold text-on-surface">{formatPrice(set.price)}</span>
                        )}
                      </td>

                      {/* Calculated Stock & Bottleneck */}
                      <td className="py-3.5 px-4" data-label="Calculated Stock">
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5">
                            {set.availableStock > 5 ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
                                <CheckCircle2 className="w-3 h-3" />
                                {set.availableStock} in stock
                              </span>
                            ) : set.availableStock > 0 ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800">
                                <AlertTriangle className="w-3 h-3" />
                                {set.availableStock} left
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-800">
                                <AlertTriangle className="w-3 h-3" />
                                Out of stock
                              </span>
                            )}
                          </div>

                          {bottleneck && (
                            <p className="text-[11px] text-on-surface-variant font-mono truncate max-w-[180px]" title={`Limiting: ${bottleneck.productName} (${bottleneck.variantSize})`}>
                              Limited by: {bottleneck.productName.slice(0, 14)}…
                            </p>
                          )}
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4 text-center" data-label="Status">
                        <span
                          className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${
                            set.active
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-surface-variant text-on-surface-variant border border-outline-variant/60'
                          }`}
                        >
                          {set.active ? 'Published' : 'Archived'}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right" data-label="Actions">
                        <div className="inline-flex items-center gap-1">
                          {/* Toggle Active Status */}
                          <button
                            type="button"
                            onClick={() => handleToggleStatus(set)}
                            className="p-1.5 rounded text-on-surface-variant hover:text-accent hover:bg-surface-container transition-colors"
                            title={set.active ? 'Unpublish Gift Set' : 'Publish Gift Set'}
                          >
                            {set.active ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>

                          {/* Edit */}
                          <Link
                            to={`/admin/gift-sets/${set.id}/edit`}
                            className="p-1.5 rounded text-on-surface-variant hover:text-accent hover:bg-surface-container transition-colors"
                            title="Edit Gift Set"
                          >
                            <Edit3 className="w-4 h-4" />
                          </Link>

                          {/* Deactivate/Archive */}
                          <button
                            type="button"
                            onClick={() => setArchiveTargetId(set.id)}
                            className="p-1.5 rounded text-on-surface-variant hover:text-error hover:bg-error-container/30 transition-colors"
                            title="Deactivate Gift Set"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination footer */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-outline-variant flex justify-center bg-surface-bright">
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={handlePageChange}
            />
          </div>
        )}
      </div>

      {/* Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={archiveTargetId !== null}
        onClose={() => setArchiveTargetId(null)}
        onConfirm={handleArchiveConfirm}
        title="Archive Gift Set"
        description="Are you sure you want to archive this Gift Set? It will be unpublished from the storefront and customers will no longer be able to purchase it."
        confirmText="Archive"
        dangerMode={true}
        isLoading={isArchiving}
      />
    </>
  );
};

