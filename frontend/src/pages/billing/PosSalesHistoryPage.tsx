import { useCallback, useEffect, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  Download,
  Eye,
  FileText,
  LoaderCircle,
  Printer,
  RefreshCw,
  Search,
  X,
} from 'lucide-react';
import { billingService, type PosSaleFilters } from '../../services/billingService';
import type { PosSaleDetail, PosSaleHistoryItem } from '../../types/billing';
import { storage } from '../../utils/storage';
import { BillingSectionNav } from './BillingSectionNav';

const size = 25;
const PENDING_SALE_STORAGE_KEY = 'al_ahad_pos_pending_sale_v1';

const money = (value?: number | null) => {
  const num = typeof value === 'number' && Number.isFinite(value) ? value : 0;
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(num);
};

const formatDate = (dateStr?: string | null) => {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? '—' : d.toLocaleString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '—';
  }
};

export function PosSalesHistoryPage() {
  const [rows, setRows] = useState<PosSaleHistoryItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [searchDraft, setSearchDraft] = useState('');
  const [filters, setFilters] = useState<PosSaleFilters>({});
  const [tender, setTender] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [offset, setOffset] = useState(0);

  // Active pending / uncertain sale in storage
  const [pendingKey, setPendingKey] = useState<string | null>(null);

  // Sale detail drawer/modal state
  const [selectedSaleId, setSelectedSaleId] = useState<number | null>(null);
  const [saleDetail, setSaleDetail] = useState<PosSaleDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState('');
  const [printingFormat, setPrintingFormat] = useState<'A4' | 'THERMAL_80' | null>(null);

  useEffect(() => {
    const saved = storage.get<{ key?: string } | null>(PENDING_SALE_STORAGE_KEY, null);
    if (saved && saved.key) {
      setPendingKey(saved.key);
    } else {
      setPendingKey(null);
    }
  }, []);

  const reload = useCallback(async () => {
    setLoading(true);
    setMessage('');
    try {
      const page = await billingService.getPosSales({ ...filters, limit: size, offset });
      setRows(page?.content || []);
      setTotal(page?.totalElements || 0);
    } catch {
      setMessage('POS sales are unavailable. Confirm the Billing database migration and Admin authorization.');
    } finally {
      setLoading(false);
    }
  }, [filters, offset]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const apply = () => {
    setOffset(0);
    setFilters({
      search: searchDraft.trim() || undefined,
      tenderMethod: tender ? (tender as PosSaleFilters['tenderMethod']) : undefined,
      from: from || undefined,
      to: to || undefined,
    });
  };

  const clearFilters = () => {
    setSearchDraft('');
    setTender('');
    setFrom('');
    setTo('');
    setOffset(0);
    setFilters({});
  };

  const openSaleDetail = async (saleId: number) => {
    setSelectedSaleId(saleId);
    setSaleDetail(null);
    setDetailLoading(true);
    setDetailError('');
    try {
      const detail = await billingService.getPosSaleDetail(saleId);
      setSaleDetail(detail);
    } catch (err) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || (err as Error).message;
      setDetailError(`Could not load details for sale #${saleId}: ${msg}`);
    } finally {
      setDetailLoading(false);
    }
  };

  const closeSaleDetail = () => {
    setSelectedSaleId(null);
    setSaleDetail(null);
    setDetailError('');
  };

  const printInvoice = async (invoiceId: number, format: 'A4' | 'THERMAL_80') => {
    setPrintingFormat(format);
    const tab = window.open('about:blank', '_blank');
    try {
      const pdf = await billingService.downloadInvoice(invoiceId, format);
      const url = URL.createObjectURL(pdf);
      if (tab) {
        tab.location.href = url;
      } else {
        const link = document.createElement('a');
        link.href = url;
        link.target = '_blank';
        link.rel = 'noopener';
        link.click();
      }
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch {
      tab?.close();
      alert('The invoice PDF could not be loaded. Check that the invoice exists in invoice history.');
    } finally {
      setPrintingFormat(null);
    }
  };

  const discardPendingFromStorage = () => {
    storage.remove(PENDING_SALE_STORAGE_KEY);
    setPendingKey(null);
  };

  return (
    <div className="mx-auto max-w-7xl space-y-5 pb-12">
      <BillingSectionNav />

      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[.18em] text-amber-800">Point of sale tracking</p>
          <h2 className="mt-1 text-3xl font-semibold text-slate-900">POS Sales History & Audit</h2>
          <p className="mt-1 text-sm text-slate-500">
            Immutable offline sales, atomic tender records, legal invoices and stock verification.
          </p>
        </div>
        <button
          onClick={() => void reload()}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-50"
        >
          <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {/* Pending Sale Terminal Banner */}
      {pendingKey && (
        <div className="flex flex-col gap-3 rounded-2xl border border-amber-300 bg-amber-50 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-amber-900">Active Sale Pending Server Confirmation</p>
              <p className="text-xs text-amber-700">
                A previous sale confirmation is pending reconciliation from this browser (Idempotency Key: <code className="font-mono">{pendingKey.slice(0, 18)}…</code>).
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <a
              href="/admin/billing"
              className="inline-flex items-center gap-1.5 rounded-lg bg-amber-800 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-900"
            >
              Resolve in Terminal
              <ChevronRight size={13} />
            </a>
            <button
              type="button"
              onClick={discardPendingFromStorage}
              className="rounded-lg border border-amber-300 bg-white px-3 py-1.5 text-xs font-medium text-amber-900 hover:bg-amber-100"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {message && (
        <p role="alert" className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          {message}
        </p>
      )}

      {/* Filter and Search Bar */}
      <form
        onSubmit={(event) => {
          event.preventDefault();
          apply();
        }}
        className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 sm:grid-cols-2 lg:grid-cols-6 shadow-sm"
      >
        <div className="relative sm:col-span-2 lg:col-span-2">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={searchDraft}
            onChange={(event) => setSearchDraft(event.target.value)}
            placeholder="Sale #, invoice #, customer, phone, ref"
            className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-sm focus:border-amber-600 focus:outline-none"
          />
        </div>

        <select
          value={tender}
          onChange={(event) => setTender(event.target.value)}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-amber-600 focus:outline-none"
        >
          <option value="">All tenders</option>
          <option value="CASH">Cash</option>
          <option value="UPI">UPI</option>
          <option value="CARD">Card</option>
        </select>

        <input
          aria-label="From date"
          type="date"
          value={from}
          onChange={(event) => setFrom(event.target.value)}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-amber-600 focus:outline-none"
        />

        <input
          aria-label="To date"
          type="date"
          value={to}
          onChange={(event) => setTo(event.target.value)}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-amber-600 focus:outline-none"
        />

        <div className="flex gap-2">
          <button
            type="submit"
            className="flex-1 rounded-lg bg-amber-800 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-amber-900"
          >
            Filter
          </button>
          {(searchDraft || tender || from || to) && (
            <button
              type="button"
              onClick={clearFilters}
              title="Clear all filters"
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
            >
              Clear
            </button>
          )}
        </div>
      </form>

      {/* Sales Table */}
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3.5 text-sm">
          <span className="font-medium text-slate-700">
            <strong>{total.toLocaleString()}</strong> completed POS sales
          </span>
          <span className="text-xs text-slate-400">All prices authoritative server-calculated</span>
        </div>

        {loading ? (
          <div className="flex items-center justify-center p-12 text-slate-500">
            <LoaderCircle className="h-6 w-6 animate-spin text-amber-700 mr-2" />
            <span className="text-sm">Loading POS sales…</span>
          </div>
        ) : rows.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            <FileText className="mx-auto h-8 w-8 text-slate-400 mb-2" />
            <p className="text-sm font-medium text-slate-600">No completed sales match these filters.</p>
            <p className="mt-1 text-xs text-slate-400">Try adjusting your search query, tender selection, or date range.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[960px] text-left text-sm">
              <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-4 py-3">Sale # / Status</th>
                  <th className="px-4 py-3">Invoice</th>
                  <th className="px-4 py-3">Customer</th>
                  <th className="px-4 py-3">Tender</th>
                  <th className="px-4 py-3 text-right">Discounts</th>
                  <th className="px-4 py-3 text-right">Payable</th>
                  <th className="px-4 py-3 text-right">Received</th>
                  <th className="px-4 py-3">Completed At</th>
                  <th className="px-4 py-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((row) => (
                  <tr key={row.saleId} className="align-top hover:bg-slate-50/70 transition-colors">
                    {/* Sale # & Status */}
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-slate-900">Sale #{row.saleId}</span>
                        <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                          {row.saleStatus || 'COMPLETED'}
                        </span>
                      </div>
                      <span className="block font-mono text-[11px] text-slate-400 truncate max-w-[140px]" title={row.saleKey}>
                        {row.saleKey ? `${row.saleKey.slice(0, 8)}…` : '—'}
                      </span>
                    </td>

                    {/* Invoice */}
                    <td className="px-4 py-3.5">
                      {row.invoiceNumber ? (
                        <div>
                          <span className="font-medium text-amber-900">{row.invoiceNumber}</span>
                          <span className="block text-[11px] text-emerald-600 font-medium">FINAL · Legal</span>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400">No invoice</span>
                      )}
                    </td>

                    {/* Customer */}
                    <td className="px-4 py-3.5">
                      <span className="block font-medium text-slate-800">{row.customerName || 'Walk-in customer'}</span>
                      <span className="block text-xs text-slate-500">{row.customerMobile || row.customerEmail || '—'}</span>
                    </td>

                    {/* Tender */}
                    <td className="px-4 py-3.5">
                      <span className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-semibold ${
                        row.tenderMethod === 'CASH'
                          ? 'bg-amber-100 text-amber-900'
                          : row.tenderMethod === 'UPI'
                          ? 'bg-blue-100 text-blue-900'
                          : 'bg-purple-100 text-purple-900'
                      }`}>
                        {row.tenderMethod}
                      </span>
                      {row.transactionReference && (
                        <span className="block font-mono text-[11px] text-slate-500 mt-0.5 truncate max-w-[120px]" title={row.transactionReference}>
                          Ref: {row.transactionReference}
                        </span>
                      )}
                      {row.changeReturned > 0 && (
                        <span className="block text-xs text-slate-500 mt-0.5">Change: {money(row.changeReturned)}</span>
                      )}
                    </td>

                    {/* Discounts */}
                    <td className="px-4 py-3.5 text-right">
                      <span className="text-slate-700">
                        {money((row.promotionDiscount ?? 0) + (row.manualDiscount ?? 0))}
                      </span>
                      {(row.promotionDiscount > 0 || row.manualDiscount > 0) && (
                        <span className="block text-[11px] text-slate-400">
                          P: {money(row.promotionDiscount)} · M: {money(row.manualDiscount)}
                        </span>
                      )}
                    </td>

                    {/* Payable */}
                    <td className="px-4 py-3.5 text-right">
                      <span className="font-semibold text-slate-900">{money(row.payable)}</span>
                    </td>

                    {/* Received */}
                    <td className="px-4 py-3.5 text-right text-slate-700">
                      {money(row.amountReceived)}
                    </td>

                    {/* Completed At */}
                    <td className="px-4 py-3.5 whitespace-nowrap text-xs text-slate-500">
                      {formatDate(row.completedAt)}
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3.5 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          type="button"
                          onClick={() => void openSaleDetail(row.saleId)}
                          title="View sale details & timeline"
                          className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 shadow-sm"
                        >
                          <Eye size={13} />
                          Details
                        </button>
                        {row.invoiceId && (
                          <>
                            <button
                              type="button"
                              onClick={() => void printInvoice(row.invoiceId!, 'THERMAL_80')}
                              title="Print thermal receipt (80mm)"
                              className="rounded-lg border border-slate-300 bg-white p-1 text-slate-600 hover:bg-slate-50 hover:text-amber-800 shadow-sm"
                            >
                              <Printer size={14} />
                            </button>
                            <button
                              type="button"
                              onClick={() => void printInvoice(row.invoiceId!, 'A4')}
                              title="Download A4 invoice PDF"
                              className="rounded-lg border border-slate-300 bg-white p-1 text-slate-600 hover:bg-slate-50 hover:text-amber-800 shadow-sm"
                            >
                              <Download size={14} />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Bar */}
        <div className="flex items-center justify-between border-t border-slate-200 p-4 text-sm">
          <span className="text-slate-500">
            Showing {total === 0 ? 0 : offset + 1}–{Math.min(offset + size, total)} of {total}
          </span>
          <div className="flex gap-2">
            <button
              disabled={offset === 0 || loading}
              onClick={() => setOffset(Math.max(0, offset - size))}
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40"
            >
              Previous
            </button>
            <button
              disabled={offset + size >= total || loading}
              onClick={() => setOffset(offset + size)}
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      </section>

      {/* Sale Details Modal / Drawer */}
      {selectedSaleId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 overflow-y-auto" role="dialog" aria-modal="true" aria-labelledby="sale-detail-title">
          <div className="w-full max-w-3xl my-8 space-y-6 rounded-2xl bg-white p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-slate-200 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <h3 id="sale-detail-title" className="text-2xl font-bold text-slate-900">
                    Sale #{selectedSaleId}
                  </h3>
                  {saleDetail && (
                    <span className="inline-flex items-center rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-800">
                      {saleDetail.saleStatus}
                    </span>
                  )}
                </div>
                {saleDetail && (
                  <p className="mt-1 font-mono text-xs text-slate-400">
                    UUID: {saleDetail.saleKey} · Cashier: {saleDetail.createdByEmail || 'Administrator'}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={closeSaleDetail}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                <X size={20} />
              </button>
            </div>

            {detailLoading ? (
              <div className="flex items-center justify-center py-16 text-slate-500">
                <LoaderCircle className="h-8 w-8 animate-spin text-amber-700 mr-2" />
                <span>Loading sale details and timeline…</span>
              </div>
            ) : detailError ? (
              <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                {detailError}
              </div>
            ) : saleDetail ? (
              <div className="space-y-6">
                {/* Lifecycle Timeline */}
                <div>
                  <h4 className="text-sm font-semibold uppercase tracking-wider text-slate-500 mb-3">
                    Sale Lifecycle & Status History
                  </h4>
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <ol className="relative border-l border-amber-300 ml-3 space-y-4">
                      {saleDetail.timeline.map((event, idx) => (
                        <li key={idx} className="ml-5">
                          <span className="absolute -left-2 flex h-4 w-4 items-center justify-center rounded-full bg-amber-700 ring-4 ring-amber-100">
                            <CheckCircle2 size={10} className="text-white" />
                          </span>
                          <div className="flex items-baseline justify-between gap-2">
                            <div className="flex items-center gap-1.5">
                              <h5 className="text-xs font-semibold text-slate-900">{event.title}</h5>
                              {event.derived && (
                                <span className="rounded bg-slate-200/80 px-1 py-0.2 text-[9px] font-semibold text-slate-600 uppercase tracking-wide">
                                  Derived
                                </span>
                              )}
                            </div>
                            <span className="text-[11px] text-slate-400">
                              {event.derived ? `Atomic commit (${formatDate(event.timestamp)})` : formatDate(event.timestamp)}
                            </span>
                          </div>
                          <p className="text-xs text-slate-600 mt-0.5">{event.description}</p>
                        </li>
                      ))}
                    </ol>
                  </div>
                </div>

                {/* Customer Information */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs">
                  <div>
                    <span className="text-slate-400 font-medium">Customer Name</span>
                    <p className="font-semibold text-slate-800 mt-0.5">{saleDetail.customerName || 'Walk-in Customer'}</p>
                  </div>
                  <div>
                    <span className="text-slate-400 font-medium">Mobile Number</span>
                    <p className="font-semibold text-slate-800 mt-0.5">{saleDetail.customerMobile || 'Not provided'}</p>
                  </div>
                  <div>
                    <span className="text-slate-400 font-medium">Email Address</span>
                    <p className="font-semibold text-slate-800 mt-0.5">{saleDetail.customerEmail || 'Not provided'}</p>
                  </div>
                </div>

                {/* Products & Line Items */}
                <div>
                  <h4 className="text-sm font-semibold uppercase tracking-wider text-slate-500 mb-2">
                    Line Items & Selections ({saleDetail.lines.length})
                  </h4>
                  <div className="overflow-hidden rounded-xl border border-slate-200">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-100 text-slate-600 font-semibold uppercase">
                        <tr>
                          <th className="px-3 py-2.5">Item & Variant</th>
                          <th className="px-3 py-2.5">Bottle</th>
                          <th className="px-3 py-2.5 text-center">Qty</th>
                          <th className="px-3 py-2.5 text-right">Unit Price</th>
                          <th className="px-3 py-2.5 text-right">Discounts</th>
                          <th className="px-3 py-2.5 text-right">Line Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {saleDetail.lines.map((line) => (
                          <tr key={line.lineId}>
                            <td className="px-3 py-2.5">
                              <span className="font-semibold text-slate-800">{line.productName}</span>
                              {line.variantSize && (
                                <span className="block text-slate-500 text-[11px]">{line.variantSize}</span>
                              )}
                              {line.freeItem && (
                                <span className="inline-block mt-0.5 rounded bg-amber-100 px-1.5 py-0.2 text-[10px] font-semibold text-amber-900">
                                  FREE REWARD
                                </span>
                              )}
                            </td>
                            <td className="px-3 py-2.5 text-slate-600">
                              {line.bottleName ? (
                                <span>{line.bottleName} {line.bottlePrice > 0 && `(+${money(line.bottlePrice)})`}</span>
                              ) : (
                                <span className="text-slate-400">—</span>
                              )}
                            </td>
                            <td className="px-3 py-2.5 text-center font-medium">{line.quantity}</td>
                            <td className="px-3 py-2.5 text-right">{money(line.unitPrice)}</td>
                            <td className="px-3 py-2.5 text-right text-slate-500">
                              {line.promotionDiscount > 0 || line.manualDiscount > 0 ? (
                                <span>-{money(line.promotionDiscount + line.manualDiscount)}</span>
                              ) : (
                                '—'
                              )}
                            </td>
                            <td className="px-3 py-2.5 text-right font-semibold text-slate-900">
                              {money(line.lineTotal)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Financial & Tender Summary */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Financial Totals */}
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-1.5 text-xs">
                    <div className="flex justify-between text-slate-600">
                      <span>Subtotal</span>
                      <span>{money(saleDetail.subtotalAmount)}</span>
                    </div>
                    {saleDetail.promotionDiscountAmount > 0 && (
                      <div className="flex justify-between text-emerald-700">
                        <span>Promotion Discounts</span>
                        <span>-{money(saleDetail.promotionDiscountAmount)}</span>
                      </div>
                    )}
                    {saleDetail.manualDiscountAmount > 0 && (
                      <div className="flex justify-between text-amber-700">
                        <span>Manual Staff Discounts</span>
                        <span>-{money(saleDetail.manualDiscountAmount)}</span>
                      </div>
                    )}
                    <div className="flex justify-between border-t border-slate-200 pt-1.5 text-sm font-bold text-slate-900">
                      <span>Net Payable Amount</span>
                      <span>{money(saleDetail.payableAmount)}</span>
                    </div>
                  </div>

                  {/* Payment Tender */}
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-1.5 text-xs">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Payment Tender</span>
                      <span className="font-semibold text-slate-900">{saleDetail.tender?.tenderMethod || 'CASH'}</span>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>Amount Received</span>
                      <span>{money(saleDetail.tender?.amountReceived)}</span>
                    </div>
                    {saleDetail.tender && saleDetail.tender.changeReturned > 0 && (
                      <div className="flex justify-between text-slate-600">
                        <span>Change Returned</span>
                        <span>{money(saleDetail.tender.changeReturned)}</span>
                      </div>
                    )}
                    {saleDetail.tender?.transactionReference && (
                      <div className="flex justify-between text-slate-600 pt-1 border-t border-slate-200 font-mono text-[11px]">
                        <span>Tx Reference</span>
                        <span>{saleDetail.tender.transactionReference}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Invoice Section & Action Buttons */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-t border-slate-200 pt-4">
                  <div>
                    {saleDetail.invoice ? (
                      <div>
                        <span className="text-xs text-slate-500">Official Legal Invoice:</span>
                        <p className="font-semibold text-sm text-slate-900">{saleDetail.invoice.invoiceNumber}</p>
                      </div>
                    ) : (
                      <span className="text-xs text-slate-400">No invoice attached</span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {saleDetail.invoice?.invoiceId && (
                      <>
                        <button
                          type="button"
                          onClick={() => void printInvoice(saleDetail.invoice!.invoiceId, 'THERMAL_80')}
                          disabled={printingFormat !== null}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-50"
                        >
                          <Printer size={14} />
                          {printingFormat === 'THERMAL_80' ? 'Printing…' : 'Print Thermal (80mm)'}
                        </button>
                        <button
                          type="button"
                          onClick={() => void printInvoice(saleDetail.invoice!.invoiceId, 'A4')}
                          disabled={printingFormat !== null}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-amber-800 px-3 py-2 text-xs font-semibold text-white shadow-sm hover:bg-amber-900 disabled:opacity-50"
                        >
                          <Download size={14} />
                          {printingFormat === 'A4' ? 'Downloading…' : 'Download A4 PDF'}
                        </button>
                      </>
                    )}
                    <button
                      type="button"
                      onClick={closeSaleDetail}
                      className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
                    >
                      Close
                    </button>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
