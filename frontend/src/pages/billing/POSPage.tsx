import { useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, CheckCircle2, LoaderCircle, Minus, Plus, Printer, RefreshCw, Search, Trash2 } from 'lucide-react';
import { bottleService } from '../../services/bottleService';
import type { Bottle } from '../../services/bottleService';
import { billingService } from '../../services/billingService';
import type { PosQuoteRequest, PosQuoteResponse, PosSaleFinalizeRequest, PosSaleFinalizeResponse } from '../../types/billing';
import { productService } from '../../services/productService';
import type { Product } from '../../types/product';
import type { Variant } from '../../types/variant';
import { BillingSectionNav } from './BillingSectionNav';

interface DraftLine {
  key: string;
  product: Product;
  variant: Variant;
  quantity: number;
  bottle: Bottle | null;
}

interface DraftDiscount {
  key: string;
  scope: 'ITEM' | 'SALE';
  type: 'FIXED' | 'PERCENT';
  lineKey: string;
  value: string;
  reason: string;
}

const catalogCurrency = new Intl.NumberFormat('en-IN', {
  style: 'currency', currency: 'INR', minimumFractionDigits: 2, maximumFractionDigits: 2,
});

function quoteCurrency(value: string): string {
  const match = /^(-?)(\d+)(?:\.(\d+))?$/.exec(value.trim());
  if (!match) return `₹${value}`;
  const [, sign, integerPart, fractionPart = ''] = match;
  const groupedInteger = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 })
    .format(BigInt(integerPart));
  return `₹${sign}${groupedInteger}.${fractionPart.padEnd(2, '0').slice(0, 2)}`;
}

function isBakhoor(product: Product): boolean {
  return product.category?.type === 'BAKHOOR' || product.category?.name?.toLowerCase() === 'bakhoor';
}

function requestErrorMessage(error: unknown): string {
  const response = (error as { response?: { data?: { message?: string } } })?.response;
  return response?.data?.message || 'The server could not calculate this quote. Review the draft and try again.';
}

function amountInPaise(value: string): bigint | null {
  const match = /^(?:0|[1-9]\d*)(?:\.(\d{1,2}))?$/.exec(value.trim());
  if (!match) return null;
  const [whole, fraction = ''] = value.trim().split('.');
  return BigInt(whole) * 100n + BigInt(fraction.padEnd(2, '0'));
}

function paiseAsMoney(value: bigint): string {
  return `${value / 100n}.${String(value % 100n).padStart(2, '0')}`;
}

export function POSPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [bottles, setBottles] = useState<Bottle[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [search, setSearch] = useState('');
  const [selectedProductId, setSelectedProductId] = useState<number | ''>('');
  const [selectedVariantId, setSelectedVariantId] = useState<number | ''>('');
  const [selectedBottleId, setSelectedBottleId] = useState<number | ''>('');
  const [quantity, setQuantity] = useState(1);
  const [lines, setLines] = useState<DraftLine[]>([]);
  const [discounts, setDiscounts] = useState<DraftDiscount[]>([]);
  const [discountScope, setDiscountScope] = useState<'ITEM' | 'SALE'>('SALE');
  const [discountType, setDiscountType] = useState<'FIXED' | 'PERCENT'>('FIXED');
  const [discountLine, setDiscountLine] = useState('');
  const [discountValue, setDiscountValue] = useState('');
  const [discountReason, setDiscountReason] = useState('');
  const [couponCode, setCouponCode] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerMobile, setCustomerMobile] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [selectedFreeRewards, setSelectedFreeRewards] = useState<{ promotionId: number; variantId: number }[]>([]);
  const [tender, setTender] = useState<'CASH' | 'UPI' | 'CARD'>('CASH');
  const [cashReceived, setCashReceived] = useState('');
  const [transactionReference, setTransactionReference] = useState('');
  const [quote, setQuote] = useState<PosQuoteResponse | null>(null);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [quoteError, setQuoteError] = useState('');
  const [finalizing, setFinalizing] = useState(false);
  const [finalizationUncertain, setFinalizationUncertain] = useState(false);
  const [finalizeError, setFinalizeError] = useState('');
  const [finalSale, setFinalSale] = useState<PosSaleFinalizeResponse | null>(null);
  const quoteRequestSequence = useRef(0);
  const idempotencyKey = useRef<string | null>(null);
  const pendingFinalize = useRef<{ key: string; request: PosSaleFinalizeRequest } | null>(null);

  const resetIdempotency = () => {
    if (!finalizationUncertain) {
      idempotencyKey.current = null;
      pendingFinalize.current = null;
    }
  };

  const invalidateQuote = () => {
    quoteRequestSequence.current += 1;
    resetIdempotency();
    setQuote(null);
    setQuoteError('');
    setQuoteLoading(false);
  };

  useEffect(() => {
    let active = true;
    Promise.all([
      productService.getProducts({ page: 0, size: 100 }),
      bottleService.getActive(),
    ]).then(([productPage, activeBottles]) => {
      if (!active) return;
      setProducts(productPage.content.filter(product => product.active));
      setBottles(activeBottles.filter(bottle => bottle.active));
    }).catch(() => {
      if (active) setLoadError('The catalog could not be loaded. Please refresh and try again.');
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const visibleProducts = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) return products;
    return products.filter(product => `${product.name} ${product.brand} ${product.categoryName || ''}`
      .toLowerCase().includes(needle));
  }, [products, search]);

  const selectedProduct = products.find(product => product.id === selectedProductId);
  const availableVariants = (selectedProduct?.variants || []).filter(variant => variant.active);
  const selectedVariant = availableVariants.find(variant => variant.id === selectedVariantId);
  const availableBottles = bottles.filter(bottle => !bottle.applicability || bottle.applicability === 'BOTH'
    || (selectedVariant?.productType === 'ATTAR' && bottle.applicability === 'ATTAR')
    || (selectedVariant?.productType === 'PERFUME' && bottle.applicability === 'PERFUME'));
  const bottleRequired = Boolean(selectedProduct && selectedVariant
    && !isBakhoor(selectedProduct)
    && (selectedVariant.productType === 'ATTAR' || selectedVariant.productType === 'PERFUME'));

  const addDraftLine = () => {
    if (!selectedProduct || !selectedVariant || !Number.isInteger(quantity) || quantity < 1 || quantity > 999) return;
    const bottle = availableBottles.find(item => item.id === selectedBottleId) || null;
    if (bottleRequired && !bottle) return;
    invalidateQuote();
    setLines(current => [...current, {
      key: crypto.randomUUID(), product: selectedProduct, variant: selectedVariant, quantity, bottle,
    }]);
    setSelectedBottleId('');
    setQuantity(1);
  };

  const updateLineQuantity = (lineKey: string, nextQuantity: number) => {
    if (nextQuantity < 1 || nextQuantity > 999) return;
    invalidateQuote();
    setLines(current => current.map(line => line.key === lineKey ? { ...line, quantity: nextQuantity } : line));
  };

  const removeDraftLine = (line: DraftLine) => {
    invalidateQuote();
    setLines(current => current.filter(item => item.key !== line.key));
    setDiscounts(current => current.filter(discount => discount.scope !== 'ITEM' || discount.lineKey !== line.key));
    if (discountLine === line.key) setDiscountLine('');
  };

  const addDraftDiscount = () => {
    const parsed = Number(discountValue);
    const decimalInput = /^(?:0|[1-9]\d*)(?:\.\d{1,2})?$/.test(discountValue);
    if (!decimalInput || !Number.isFinite(parsed) || parsed <= 0 || (discountType === 'PERCENT' && parsed > 100)
      || !discountReason.trim() || (discountScope === 'ITEM' && !discountLine)) return;
    invalidateQuote();
    setDiscounts(current => [...current, {
      key: crypto.randomUUID(), scope: discountScope, type: discountType,
      lineKey: discountLine, value: discountValue, reason: discountReason.trim(),
    }]);
    setDiscountValue('');
    setDiscountReason('');
  };

  const removeDraftDiscount = (key: string) => {
    invalidateQuote();
    setDiscounts(current => current.filter(item => item.key !== key));
  };

  const buildQuoteRequest = (): PosQuoteRequest => ({
    lines: lines.map(line => ({
      lineKey: line.key,
      productId: line.product.id,
      variantId: line.variant.id,
      bottleId: line.bottle?.id ?? null,
      quantity: line.quantity,
    })),
    couponCode: couponCode.trim() || null,
    manualDiscounts: discounts.map(discount => ({
      scope: discount.scope,
      type: discount.type,
      value: discount.value,
      lineKey: discount.scope === 'ITEM' ? discount.lineKey : null,
      reason: discount.reason,
    })),
    freeRewards: selectedFreeRewards,
    customerName: customerName.trim() || null,
    customerMobile: customerMobile.trim() || null,
    customerEmail: customerEmail.trim() || null,
  });

  const calculateQuote = async () => {
    if (lines.length === 0) return;
    const requestId = ++quoteRequestSequence.current;
    setQuote(null);
    setQuoteError('');
    setQuoteLoading(true);
    try {
      const result = await billingService.createPosQuote(buildQuoteRequest());
      if (quoteRequestSequence.current === requestId) setQuote(result);
    } catch (error) {
      if (quoteRequestSequence.current === requestId) setQuoteError(requestErrorMessage(error));
    } finally {
      if (quoteRequestSequence.current === requestId) setQuoteLoading(false);
    }
  };

  const submitFinalization = async (retry: boolean) => {
    if (finalizing || finalSale) return;
    if (!retry && (!quote || !quote.allLinesAvailable)) return;
    const pending = retry ? pendingFinalize.current : null;
    if (retry && !pending) return;
    const key = pending?.key || idempotencyKey.current || crypto.randomUUID();
    const request = pending?.request || {
      quote: buildQuoteRequest(),
      tender: {
        method: tender,
        amountReceived: tender === 'CASH' ? cashReceived : quote!.payableAmount,
        transactionReference: tender === 'CASH' ? null : transactionReference.trim() || null,
      },
      confirmedQuoteFingerprint: quote!.quoteFingerprint,
    } satisfies PosSaleFinalizeRequest;
    idempotencyKey.current = key;
    pendingFinalize.current = { key, request };
    setFinalizing(true);
    setFinalizeError('');
    try {
      const result = await billingService.finalizePosSale(request, key);
      pendingFinalize.current = null;
      setFinalizationUncertain(false);
      setFinalSale(result);
    } catch (error) {
      const response = (error as { response?: { status?: number; data?: { code?: string; message?: string; updatedQuote?: PosQuoteResponse } } })?.response;
      const changedQuote = response?.data?.code === 'QUOTE_CHANGED' ? response.data.updatedQuote : undefined;
      if (changedQuote) {
        setQuote(changedQuote);
        pendingFinalize.current = null;
        setFinalizeError('The quote changed. Review the updated lines and payable amount, then confirm again.');
      } else if (!response || (response.status ?? 0) >= 500) {
        setFinalizationUncertain(true);
        setFinalizeError('The server response was not conclusive. Retry the exact same request to safely resolve the sale status.');
      } else {
        pendingFinalize.current = null;
        idempotencyKey.current = null;
        setFinalizeError(response.data?.message || 'The sale could not be finalized. Review the error and refresh the quote.');
      }
    } finally {
      setFinalizing(false);
    }
  };

  const openInvoiceForPrinting = async (invoiceId: number, format: 'A4' | 'THERMAL_80') => {
    const tab = window.open('about:blank', '_blank');
    try {
      const pdf = await billingService.downloadInvoice(invoiceId, format);
      const url = URL.createObjectURL(pdf);
      if (tab) tab.location.href = url;
      else {
        const link = document.createElement('a');
        link.href = url;
        link.target = '_blank';
        link.rel = 'noopener';
        link.click();
      }
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch {
      tab?.close();
      setFinalizeError('The sale completed, but the invoice PDF could not be opened. Use invoice history to retry.');
    }
  };

  const cashReceivedPaise = amountInPaise(cashReceived);
  const payablePaise = quote ? amountInPaise(quote.payableAmount) : null;
  const cashTenderReady = cashReceivedPaise !== null && payablePaise !== null
    && cashReceivedPaise >= payablePaise;

  if (finalSale) {
    return (
      <div className="mx-auto max-w-3xl space-y-5">
        <BillingSectionNav />
        <section className="space-y-5 rounded-2xl border border-emerald-200 bg-white p-6 shadow-sm md:p-8">
        <div className="flex items-center gap-3 text-emerald-800"><CheckCircle2 className="h-7 w-7" /><div><h2 className="text-2xl font-semibold">Sale completed</h2><p className="text-sm">The sale, stock, payment record and invoice were saved together.</p></div></div>
        <dl className="grid gap-3 rounded-xl bg-slate-50 p-4 text-sm sm:grid-cols-2">
          <div><dt className="text-slate-500">Invoice</dt><dd className="font-semibold">{finalSale.invoiceNumber}</dd></div>
          <div><dt className="text-slate-500">Sale reference</dt><dd className="break-all font-mono text-xs">{finalSale.saleKey}</dd></div>
          <div><dt className="text-slate-500">Payable</dt><dd className="font-semibold">{quoteCurrency(finalSale.payableAmount)}</dd></div>
          <div><dt className="text-slate-500">Tender</dt><dd>{finalSale.tenderMethod}</dd></div>
          <div><dt className="text-slate-500">Amount received</dt><dd>{quoteCurrency(finalSale.amountReceived)}</dd></div>
          <div><dt className="text-slate-500">Change returned</dt><dd>{quoteCurrency(finalSale.changeReturned)}</dd></div>
          <div><dt className="text-slate-500">Amount applied</dt><dd>{quoteCurrency(finalSale.amountApplied)}</dd></div>
          <div><dt className="text-slate-500">Request result</dt><dd>{finalSale.replayed ? 'Recovered original completed sale' : 'New completed sale'}</dd></div>
        </dl>
        <div className="flex flex-wrap gap-3">
          <button type="button" onClick={() => void openInvoiceForPrinting(finalSale.invoiceId, 'THERMAL_80')} className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white"><Printer className="h-4 w-4" /> Open 80mm invoice to print</button>
          <button type="button" onClick={() => void openInvoiceForPrinting(finalSale.invoiceId, 'A4')} className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700">Open A4 invoice</button>
          <a href="/admin/billing/invoices" className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700">Invoice history</a>
        </div>
        {finalizeError && <p role="alert" className="text-sm text-amber-800">{finalizeError}</p>}
        </section>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1500px] space-y-6">
      <BillingSectionNav />
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[.18em] text-amber-800">Connected point of sale</p>
          <h2 className="mt-1 text-3xl font-semibold tracking-tight">New POS sale</h2>
          <p className="mt-1 text-sm text-slate-500">Review a server-priced quote, then confirm a single-tender sale.</p>
        </div>
        <span className="inline-flex w-fit items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-900">
          <span className="h-2 w-2 rounded-full bg-emerald-500" /> Connected POS · Admin only
        </span>
      </div>

      <div role="status" className="flex gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
        <p>Prices and discounts are recalculated on the server at confirmation. Confirmation records an offline cash, UPI or card tender; it does not capture a payment gateway transaction.</p>
      </div>

      {loadError && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{loadError}</p>}
      {quoteError && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{quoteError}</p>}
      {finalizeError && !finalizationUncertain && <p role="alert" className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">{finalizeError}</p>}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.5fr)_minmax(360px,1fr)]">
        <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:p-6" aria-labelledby="catalog-heading">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div><h3 id="catalog-heading" className="text-lg font-semibold">Standalone products</h3><p className="text-sm text-slate-500">Gift sets are excluded in Phase 1.</p></div>
            <label className="relative block sm:w-64">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input value={search} onChange={event => setSearch(event.target.value)} placeholder="Search products"
                className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-sm focus:border-amber-600 focus:outline-none focus:ring-2 focus:ring-amber-100" />
            </label>
          </div>

          <div className="grid gap-5 lg:grid-cols-[minmax(0,1.2fr)_minmax(270px,.8fr)]">
            <div className="max-h-[520px] space-y-2 overflow-auto pr-1">
              {loading && <p className="py-8 text-center text-sm text-slate-500">Loading catalog…</p>}
              {!loading && visibleProducts.map(product => (
                <button key={product.id} type="button" onClick={() => {
                  setSelectedProductId(product.id);
                  setSelectedVariantId(product.variants.find(variant => variant.active)?.id || '');
                  setSelectedBottleId('');
                }}
                  className={`flex w-full items-center justify-between gap-4 rounded-xl border p-3 text-left transition ${selectedProductId === product.id ? 'border-amber-500 bg-amber-50' : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'}`}>
                  <span className="min-w-0"><span className="block truncate font-medium">{product.name}</span><span className="text-xs text-slate-500">{product.brand || product.categoryName || 'Product'}</span></span>
                  <span className="shrink-0 text-xs text-slate-500">{product.variants.filter(variant => variant.active).length} sizes</span>
                </button>
              ))}
              {!loading && visibleProducts.length === 0 && <p className="py-8 text-center text-sm text-slate-500">No standalone products found.</p>}
            </div>

            <div className="rounded-xl bg-slate-50 p-4">
              <h4 className="font-medium">Add selected item</h4>
              {!selectedProduct && <p className="mt-3 text-sm text-slate-500">Choose a product to view its active variants.</p>}
              {selectedProduct && <div className="mt-3 space-y-3">
                <p className="font-medium">{selectedProduct.name}</p>
                <label className="block text-xs font-medium text-slate-600">Variant
                  <select value={selectedVariantId} onChange={event => { setSelectedVariantId(Number(event.target.value)); setSelectedBottleId(''); }}
                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm">
                    {availableVariants.map(variant => <option key={variant.id} value={variant.id}>{variant.size} · {catalogCurrency.format(variant.price)}</option>)}
                  </select>
                </label>
                <label className="block text-xs font-medium text-slate-600">Bottle {bottleRequired ? '(required)' : '(optional)'}
                  <select value={selectedBottleId} onChange={event => setSelectedBottleId(event.target.value ? Number(event.target.value) : '')}
                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm">
                    <option value="">No bottle selected</option>
                    {availableBottles.map(bottle => <option key={bottle.id} value={bottle.id}>{bottle.name} · {catalogCurrency.format(bottle.price)}</option>)}
                  </select>
                </label>
                <label className="block text-xs font-medium text-slate-600">Quantity
                  <input type="number" min={1} max={999} value={quantity} onChange={event => setQuantity(event.target.valueAsNumber)}
                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm" />
                </label>
                <button type="button" disabled={!selectedVariant || (bottleRequired && !selectedBottleId) || !Number.isInteger(quantity) || quantity < 1 || quantity > 999 || lines.length >= 50} onClick={addDraftLine}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40">
                  <Plus className="h-4 w-4" /> Add to quote draft
                </button>
                <p className="text-xs leading-5 text-slate-500">Catalog prices are indicative. The quote endpoint resolves live ProductVariant.price and bottle price; discountedPrice is not used.</p>
              </div>}
            </div>
          </div>

          <div className="border-t border-slate-100 pt-4">
            <h4 className="font-medium">Draft items <span className="ml-1 text-sm font-normal text-slate-500">({lines.length})</span></h4>
            {lines.length === 0 ? <p className="mt-3 text-sm text-slate-500">No items added.</p> : <ul className="mt-3 divide-y divide-slate-100">
              {lines.map(line => <li key={line.key} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{line.product.name} · {line.variant.size}</p>
                  <p className="text-xs text-slate-500">Catalog unit {catalogCurrency.format(line.variant.price)}{line.bottle ? ` · ${line.bottle.name} ${catalogCurrency.format(line.bottle.price)}` : ''}</p>
                </div>
                <div className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-2 py-1">
                  <button type="button" aria-label={`Decrease ${line.product.name} quantity`} onClick={() => updateLineQuantity(line.key, line.quantity - 1)} disabled={line.quantity <= 1} className="rounded p-1 text-slate-600 hover:bg-slate-100 disabled:opacity-40"><Minus className="h-3.5 w-3.5" /></button>
                  <span className="min-w-6 text-center text-sm tabular-nums">{line.quantity}</span>
                  <button type="button" aria-label={`Increase ${line.product.name} quantity`} onClick={() => updateLineQuantity(line.key, line.quantity + 1)} disabled={line.quantity >= 999} className="rounded p-1 text-slate-600 hover:bg-slate-100 disabled:opacity-40"><Plus className="h-3.5 w-3.5" /></button>
                </div>
                <button type="button" aria-label={`Remove ${line.product.name}`} onClick={() => removeDraftLine(line)}
                  className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-700"><Trash2 className="h-4 w-4" /></button>
              </li>)}
            </ul>}
            <p className="mt-3 rounded-lg bg-slate-50 p-3 text-xs text-slate-600">No payable total is calculated in the browser. Calculate or refresh the quote to see the server's itemized amount.</p>
          </div>
        </section>

        <div className="space-y-6">
          <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:p-6">
            <h3 className="text-lg font-semibold">Customer details</h3>
            <p className="mb-4 mt-1 text-sm text-slate-500">Walk-in customers do not need an account.</p>
            <div className="space-y-3">
              <input value={customerName} onChange={event => { setCustomerName(event.target.value); invalidateQuote(); }} placeholder="Customer name (optional)" maxLength={160} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
              <input value={customerMobile} onChange={event => { setCustomerMobile(event.target.value); invalidateQuote(); }} placeholder="Mobile number (optional)" inputMode="tel" maxLength={25} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
              <input value={customerEmail} onChange={event => { setCustomerEmail(event.target.value); invalidateQuote(); }} placeholder="Email address (optional)" inputMode="email" maxLength={254} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
              <p className="rounded-lg bg-slate-50 p-3 text-xs text-slate-500">Contact details are saved as immutable sale and invoice snapshots when provided. Email and WhatsApp delivery are outside this phase.</p>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:p-6">
            <h3 className="text-lg font-semibold">Promotion and coupon</h3>
            <p className="mb-3 mt-1 text-sm text-slate-500">Eligible promotions are evaluated on the server. POS quotes exclude promotions with per-customer limits.</p>
            <input value={couponCode} onChange={event => { setCouponCode(event.target.value); invalidateQuote(); }} maxLength={100} placeholder="Coupon code (optional)" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:p-6">
            <h3 className="text-lg font-semibold">Manual discount</h3>
            <p className="mb-4 mt-1 text-sm text-slate-500">Any authorized Admin can request a fixed or percentage discount. A reason is required; the server enforces the eligible balance and 100% maximum.</p>
            <div className="grid grid-cols-2 gap-3">
              <select value={discountScope} onChange={event => setDiscountScope(event.target.value as 'ITEM' | 'SALE')} className="rounded-lg border border-slate-300 px-3 py-2 text-sm"><option value="SALE">Sale-level</option><option value="ITEM">Item-level</option></select>
              <select value={discountType} onChange={event => setDiscountType(event.target.value as 'FIXED' | 'PERCENT')} className="rounded-lg border border-slate-300 px-3 py-2 text-sm"><option value="FIXED">Fixed amount</option><option value="PERCENT">Percentage</option></select>
            </div>
            {discountScope === 'ITEM' && <select value={discountLine} onChange={event => setDiscountLine(event.target.value)} className="mt-3 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"><option value="">Select draft line</option>{lines.map(line => <option key={line.key} value={line.key}>{line.product.name} · {line.variant.size}</option>)}</select>}
            <input type="number" min="0.01" max={discountType === 'PERCENT' ? 100 : undefined} step="0.01" value={discountValue} onChange={event => setDiscountValue(event.target.value)} placeholder={discountType === 'PERCENT' ? 'Percent (maximum 100)' : 'INR amount'} className="mt-3 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
            <textarea value={discountReason} onChange={event => setDiscountReason(event.target.value)} maxLength={1000} rows={2} placeholder="Reason (required)" className="mt-3 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
            <button type="button" onClick={addDraftDiscount} disabled={!discountValue || !discountReason.trim() || (discountScope === 'ITEM' && !discountLine)} className="mt-3 rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium hover:bg-slate-50 disabled:opacity-40">Add discount to quote</button>
            {discounts.length > 0 && <ul className="mt-3 space-y-2">{discounts.map(discount => <li key={discount.key} className="flex justify-between gap-2 rounded-lg bg-slate-50 p-3 text-xs"><span>{discount.scope} · {discount.type} {discount.value} · {discount.reason}</span><button type="button" onClick={() => removeDraftDiscount(discount.key)} aria-label="Remove discount request" className="text-red-700">Remove</button></li>)}</ul>}
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:p-6">
            <div className="flex items-center justify-between gap-3"><h3 className="text-lg font-semibold">Quote preview</h3>{quote && <span className="text-xs text-slate-500">{new Date(quote.generatedAt).toLocaleTimeString()}</span>}</div>
            {!quote && <p className="mt-2 text-sm text-slate-500">Calculate a quote to get current server prices, promotion results and stock availability.</p>}
            {quote && <div className="mt-4 space-y-4">
              {!quote.allLinesAvailable && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">One or more items exceed current stock. This quote does not reserve inventory.</p>}
              <ul className="divide-y divide-slate-100">
                {quote.lines.map(line => <li key={line.lineKey} className="py-3 text-sm">
                  <div className="flex justify-between gap-3"><span className="font-medium">{line.productName} · {line.variantSize} × {line.quantity}</span><span className="font-medium tabular-nums">{quoteCurrency(line.finalLineTotal)}</span></div>
                  {line.bottleName && <p className="mt-1 text-xs text-slate-500">Bottle: {line.bottleName}</p>}
                  <p className="mt-1 text-xs text-slate-500">Line {quoteCurrency(line.lineSubtotal)} · promotion −{quoteCurrency(line.promotionDiscount)} · manual −{quoteCurrency(line.manualDiscount)}</p>
                  <p className={`mt-1 text-xs ${line.available ? 'text-emerald-700' : 'text-red-700'}`}>{line.available ? 'Available at quote time' : 'Insufficient stock at quote time'} · variant {line.variantStockAvailable} available{line.bottleStockAvailable !== null ? ` · bottle ${line.bottleStockAvailable} available` : ''}</p>
                </li>)}
              </ul>
              <dl className="space-y-2 border-t border-slate-100 pt-3 text-sm">
                <div className="flex justify-between"><dt className="text-slate-600">Subtotal</dt><dd className="tabular-nums">{quoteCurrency(quote.subtotal)}</dd></div>
                <div className="flex justify-between"><dt className="text-slate-600">Promotion discounts</dt><dd className="tabular-nums">−{quoteCurrency(quote.totalPromotionDiscount)}</dd></div>
                <div className="flex justify-between"><dt className="text-slate-600">Manual discounts</dt><dd className="tabular-nums">−{quoteCurrency(quote.manualDiscount)}</dd></div>
                <div className="flex justify-between border-t border-slate-100 pt-3 text-lg font-semibold"><dt>Payable</dt><dd className="tabular-nums">{quoteCurrency(quote.payableAmount)}</dd></div>
              </dl>
              {quote.appliedPromotions.length > 0 && <div><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Applied promotions</p><ul className="mt-1 space-y-1 text-sm">{quote.appliedPromotions.map(promotion => <li key={promotion.id}>{promotion.name}</li>)}</ul></div>}
              {quote.messages.map((message, index) => <p key={`${index}-${message}`} className="text-xs text-amber-800">{message}</p>)}
              {quote.freeRewardOptions.length > 0 && <div className="rounded-lg bg-emerald-50 p-3"><p className="text-xs font-semibold text-emerald-900">Eligible free item choices</p><div className="mt-2 space-y-2">{quote.freeRewardOptions.map(option => {
                const selected = selectedFreeRewards.some(reward => reward.promotionId === option.promotionId && reward.variantId === option.variantId);
                return <label key={`${option.promotionId}-${option.variantId}`} className="flex cursor-pointer items-start gap-2 text-sm text-emerald-900"><input type="checkbox" checked={selected} onChange={() => {
                  const next = selected
                    ? selectedFreeRewards.filter(reward => !(reward.promotionId === option.promotionId && reward.variantId === option.variantId))
                    : [...selectedFreeRewards, { promotionId: option.promotionId, variantId: option.variantId }];
                  if (!selected && next.some(reward => reward.promotionId !== option.promotionId)) {
                    setFinalizeError('Free rewards from different promotions cannot be combined in one sale.');
                    return;
                  }
                  setSelectedFreeRewards(next);
                  setFinalizeError('');
                  invalidateQuote();
                }} className="mt-1 rounded border-emerald-400 text-emerald-700" /><span>{option.productName} · {option.variant} — {option.promotion}</span></label>;
              })}</div><p className="mt-2 text-xs text-emerald-800">Select an eligible reward to add it to the server quote. Stock is deducted only after sale confirmation.</p></div>}
              {quote.lines.some(line => line.freeItem) && <p className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">Selected free promotional items appear as zero-payable invoice lines and will deduct variant stock when confirmed.</p>}
              <p className="text-xs text-slate-500">Quote calculated by Admin {quote.adminEmail}. Stock availability is observational only.</p>
            </div>}
            <button type="button" disabled={lines.length === 0 || quoteLoading} onClick={calculateQuote}
              className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-amber-700 px-4 py-3 text-sm font-semibold text-white hover:bg-amber-800 disabled:cursor-not-allowed disabled:opacity-50">
              {quoteLoading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : quote ? <RefreshCw className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
              {quoteLoading ? 'Calculating quote…' : quote ? 'Refresh quote' : 'Calculate quote'}
            </button>
            {quote && <p className="mt-2 text-center text-xs text-slate-500">Confirmation rechecks all prices, promotions, discounts and stock. Changed totals require review and a second confirmation.</p>}
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:p-6">
            <h3 className="text-lg font-semibold">Single tender</h3>
            <p className="mt-1 text-sm text-slate-500">One offline tender per sale. No payment gateway or card credentials are used.</p>
            <div className="mt-3 grid grid-cols-3 gap-2">{(['CASH', 'UPI', 'CARD'] as const).map(method => <button key={method} type="button" onClick={() => { setTender(method); idempotencyKey.current = null; pendingFinalize.current = null; }} className={`rounded-lg border px-2 py-2 text-sm ${tender === method ? 'border-amber-600 bg-amber-50 text-amber-900' : 'border-slate-200'}`}>{method}</button>)}</div>
            {tender === 'CASH' ? <>
              <input inputMode="decimal" value={cashReceived} onChange={event => { setCashReceived(event.target.value); idempotencyKey.current = null; pendingFinalize.current = null; }} placeholder="Cash received" className="mt-3 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
              {quote && <dl className="mt-3 space-y-1 rounded-lg bg-slate-50 p-3 text-sm"><div className="flex justify-between"><dt>Sale payable</dt><dd>{quoteCurrency(quote.payableAmount)}</dd></div><div className="flex justify-between"><dt>Cash received</dt><dd>{cashReceivedPaise === null ? 'Enter a valid amount' : quoteCurrency(paiseAsMoney(cashReceivedPaise))}</dd></div><div className="flex justify-between"><dt>Change returned</dt><dd>{cashReceivedPaise !== null && payablePaise !== null && cashReceivedPaise >= payablePaise ? quoteCurrency(paiseAsMoney(cashReceivedPaise - payablePaise)) : '—'}</dd></div><div className="flex justify-between font-medium"><dt>Tender applied</dt><dd>{quoteCurrency(quote.payableAmount)}</dd></div></dl>}
            </> : <>
              {quote && <p className="mt-3 rounded-lg bg-slate-50 p-3 text-sm">Amount received and applied: <strong>{quoteCurrency(quote.payableAmount)}</strong></p>}
              <input value={transactionReference} onChange={event => { setTransactionReference(event.target.value); idempotencyKey.current = null; pendingFinalize.current = null; }} maxLength={200} placeholder="Transaction reference (optional)" className="mt-3 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
              {tender === 'CARD' && <p className="mt-2 text-xs text-slate-500">Never enter or store card number, CVV, PIN, expiry or credentials. Reference only.</p>}
            </>}
            <button type="button" disabled={!quote || !quote.allLinesAvailable || quoteLoading || finalizing || (tender === 'CASH' && !cashTenderReady)} onClick={() => void submitFinalization(false)} className="mt-5 w-full rounded-lg bg-emerald-700 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-600">{finalizing ? 'Finalizing sale…' : 'Confirm sale and issue invoice'}</button>
            <p className="mt-2 text-center text-xs text-slate-500">Confirmation deducts stock and records the selected tender, promotion redemptions and immutable invoice in one database transaction.</p>
          </section>
        </div>
      </div>
      {(finalizing || finalizationUncertain) && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4" role="dialog" aria-modal="true" aria-labelledby="pos-finalization-status"><div className="w-full max-w-lg space-y-4 rounded-2xl bg-white p-6 shadow-xl"><h2 id="pos-finalization-status" className="text-xl font-semibold">{finalizationUncertain ? 'Sale status needs confirmation' : 'Finalizing sale'}</h2><p className="text-sm text-slate-600">{finalizeError || 'Keep this page open while the database confirms the sale.'}</p>{finalizationUncertain && <button type="button" onClick={() => void submitFinalization(true)} disabled={finalizing} className="w-full rounded-lg bg-amber-700 px-4 py-3 text-sm font-semibold text-white disabled:opacity-50">Retry the same request safely</button>}</div></div>}
    </div>
  );
}
