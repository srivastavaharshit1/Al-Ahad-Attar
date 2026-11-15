import { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  LoaderCircle,
  Minus,
  Plus,
  Printer,
  RefreshCw,
  Search,
  Share2,
  Trash2,
  Store,
  User,
  ShoppingBag,
  CreditCard,
  Banknote,
  QrCode
} from 'lucide-react';
import { bottleService } from '../../services/bottleService';
import type { Bottle } from '../../services/bottleService';
import { billingService } from '../../services/billingService';
import type { PosQuoteRequest, PosQuoteResponse, PosSaleFinalizeRequest, PosSaleFinalizeResponse } from '../../types/billing';
import { productService } from '../../services/productService';
import type { Product } from '../../types/product';
import type { Variant } from '../../types/variant';
import { storage } from '../../utils/storage';
import { BillingSectionNav } from './BillingSectionNav';

interface PendingFinalizeState {
  key: string;
  request: PosSaleFinalizeRequest;
  timestamp: number;
}

const PENDING_SHOP_SALE_KEY = 'al_ahad_shop_counter_pending_sale_v1';

interface ShopDraftLine {
  key: string;
  product: Product;
  variant: Variant;
  quantity: number;
  productPrice: string;
  bottle: Bottle | null;
  bottleCharge: string;
  giftBoxCharge: string;
  manualDiscount: string;
}

function safeUUID(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function quoteCurrency(value?: string | number | null): string {
  if (value === undefined || value === null || String(value).trim() === '') return '₹0.00';
  const str = String(value).trim();
  const match = /^(-?)(\d+)(?:\.(\d+))?$/.exec(str);
  if (!match) return `₹${str}`;
  const [, sign, integerPart, fractionPart = ''] = match;
  try {
    const groupedInteger = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 })
      .format(BigInt(integerPart));
    return `₹${sign}${groupedInteger}.${fractionPart.padEnd(2, '0').slice(0, 2)}`;
  } catch {
    return `₹${str}`;
  }
}

function isBakhoor(product?: Product | null): boolean {
  if (!product) return false;
  const catType = product.category?.type || (product as any)?.categoryType;
  const catName = product.category?.name || product.categoryName;
  return catType === 'BAKHOOR' || catName?.toLowerCase() === 'bakhoor';
}

function amountInPaise(value?: string | null): bigint | null {
  if (value === undefined || value === null) return null;
  const str = String(value).trim();
  const match = /^(?:0|[1-9]\d*)(?:\.(\d{1,2}))?$/.exec(str);
  if (!match) return null;
  const [whole, fraction = ''] = str.split('.');
  try {
    return BigInt(whole) * 100n + BigInt(fraction.padEnd(2, '0'));
  } catch {
    return null;
  }
}

function paiseAsMoney(value: bigint): string {
  return `${value / 100n}.${String(value % 100n).padStart(2, '0')}`;
}

export function ShopCounterPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [bottles, setBottles] = useState<Bottle[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [search, setSearch] = useState('');

  // Selected item inputs
  const [selectedProductId, setSelectedProductId] = useState<number | ''>('');
  const [selectedVariantId, setSelectedVariantId] = useState<number | ''>('');
  const [selectedBottleId, setSelectedBottleId] = useState<number | ''>('');
  const [quantity, setQuantity] = useState(1);
  const [productPrice, setProductPrice] = useState('');
  const [bottleCharge, setBottleCharge] = useState('');
  const [giftBoxCharge, setGiftBoxCharge] = useState('');
  const [manualDiscount, setManualDiscount] = useState('');

  // Draft cart & customer details
  const [lines, setLines] = useState<ShopDraftLine[]>([]);
  const [customerName, setCustomerName] = useState('');
  const [customerMobile, setCustomerMobile] = useState('');
  const [tender, setTender] = useState<'CASH' | 'UPI' | 'CARD'>('CASH');
  const [cashReceived, setCashReceived] = useState('');
  const [transactionReference, setTransactionReference] = useState('');

  // Quote & finalization state
  const [quote, setQuote] = useState<PosQuoteResponse | null>(null);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [quoteError, setQuoteError] = useState('');
  const [variantLoading, setVariantLoading] = useState(false);
  const [variantError, setVariantError] = useState('');
  const latestProductRequestId = useRef(0);

  const [finalizing, setFinalizing] = useState(false);
  const [reconciling, setReconciling] = useState(false);
  const [finalizationUncertain, setFinalizationUncertain] = useState(false);
  const [uncommittedConfirmed, setUncommittedConfirmed] = useState(false);
  const [finalizeError, setFinalizeError] = useState('');
  const [finalSale, setFinalSale] = useState<PosSaleFinalizeResponse | null>(null);

  const quoteRequestSequence = useRef(0);
  const idempotencyKey = useRef<string | null>(null);
  const pendingFinalize = useRef<{ key: string; request: PosSaleFinalizeRequest } | null>(null);

  const invalidateQuote = () => {
    quoteRequestSequence.current += 1;
    if (!finalizationUncertain) {
      idempotencyKey.current = null;
      pendingFinalize.current = null;
      storage.remove(PENDING_SHOP_SALE_KEY);
    }
    setQuote(null);
    setQuoteError('');
    setQuoteLoading(false);
  };

  const discardUncertainDraft = () => {
    storage.remove(PENDING_SHOP_SALE_KEY);
    pendingFinalize.current = null;
    idempotencyKey.current = null;
    setFinalizationUncertain(false);
    setUncommittedConfirmed(false);
    setFinalizeError('');
  };

  // Restore and reconcile any pending/uncertain sale on load
  useEffect(() => {
    const saved = storage.get<PendingFinalizeState | null>(PENDING_SHOP_SALE_KEY, null);
    if (!saved || !saved.key || !saved.request) return;

    idempotencyKey.current = saved.key;
    pendingFinalize.current = { key: saved.key, request: saved.request };
    setFinalizationUncertain(true);
    setReconciling(true);
    setFinalizeError('A previous sale confirmation was in progress. Checking its status with the server…');

    billingService.reconcilePosSale(saved.key)
      .then((recon) => {
        if (recon.status === 'COMMITTED' && recon.sale) {
          storage.remove(PENDING_SHOP_SALE_KEY);
          pendingFinalize.current = null;
          setFinalizationUncertain(false);
          setFinalSale(recon.sale);
        } else {
          setUncommittedConfirmed(true);
          setFinalizeError('The previous sale was not committed to the database. You can safely retry confirmation or discard this draft.');
        }
      })
      .catch((err) => {
        const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || (err as Error).message;
        setFinalizeError(`Could not reach the server to verify sale status: ${msg}. You can click retry to check again.`);
      })
      .finally(() => {
        setReconciling(false);
      });
  }, []);

  // Fetch product catalog & active bottles
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

  const handleSelectProduct = async (product: Product) => {
    const requestId = ++latestProductRequestId.current;
    setSelectedProductId(product.id);
    setSelectedBottleId('');
    setProductPrice('');
    setBottleCharge('');
    setGiftBoxCharge('');
    setManualDiscount('');
    setVariantError('');

    if (product.variants && product.variants.length > 0) {
      setVariantLoading(false);
      const activeVariant = product.variants.find(variant => variant.active);
      setSelectedVariantId(activeVariant?.id ?? '');
      return;
    }

    setSelectedVariantId('');
    setVariantLoading(true);

    try {
      const full = await productService.getProduct(product.id.toString());
      const fullProduct = full?.data;
      if (fullProduct) {
        setProducts(current => current.map(p => p.id === product.id ? fullProduct : p));
      }
      if (latestProductRequestId.current !== requestId) return;
      const variants = fullProduct?.variants || [];
      const activeVariant = variants.find(variant => variant.active);
      setSelectedVariantId(activeVariant?.id ?? '');
    } catch {
      if (latestProductRequestId.current === requestId) {
        setVariantError('Unable to load product variants. Please try again.');
        setSelectedVariantId('');
      }
    } finally {
      if (latestProductRequestId.current === requestId) {
        setVariantLoading(false);
      }
    }
  };

  const addDraftLine = () => {
    if (!selectedProduct || !selectedVariant || !Number.isInteger(quantity) || quantity < 1 || quantity > 999) return;
    const priceNum = Number(productPrice);
    if (!productPrice || !Number.isFinite(priceNum) || priceNum <= 0) return;

    const bottle = availableBottles.find(item => item.id === selectedBottleId) || null;
    if (bottleRequired && !bottle) return;

    const bChargeNum = bottleCharge.trim() ? Number(bottleCharge) : 0;
    const gChargeNum = giftBoxCharge.trim() ? Number(giftBoxCharge) : 0;
    const mDiscountNum = manualDiscount.trim() ? Number(manualDiscount) : 0;

    if (!Number.isFinite(bChargeNum) || bChargeNum < 0) return;
    if (!Number.isFinite(gChargeNum) || gChargeNum < 0) return;
    if (!Number.isFinite(mDiscountNum) || mDiscountNum < 0) return;

    invalidateQuote();
    setLines(current => [...current, {
      key: safeUUID(),
      product: selectedProduct,
      variant: selectedVariant,
      quantity,
      productPrice: priceNum.toFixed(2),
      bottle,
      bottleCharge: bChargeNum.toFixed(2),
      giftBoxCharge: gChargeNum.toFixed(2),
      manualDiscount: mDiscountNum.toFixed(2),
    }]);

    setSelectedBottleId('');
    setProductPrice('');
    setBottleCharge('');
    setGiftBoxCharge('');
    setManualDiscount('');
    setQuantity(1);
  };

  const updateLineQuantity = (lineKey: string, nextQuantity: number) => {
    if (nextQuantity < 1 || nextQuantity > 999) return;
    invalidateQuote();
    setLines(current => current.map(line => line.key === lineKey ? { ...line, quantity: nextQuantity } : line));
  };

  const removeDraftLine = (lineKey: string) => {
    invalidateQuote();
    setLines(current => current.filter(item => item.key !== lineKey));
  };

  const buildQuoteRequest = (): PosQuoteRequest => ({
    lines: lines.map(line => ({
      lineKey: line.key,
      productId: line.product.id,
      variantId: line.variant.id,
      bottleId: line.bottle?.id ?? null,
      quantity: line.quantity,
      productPrice: line.productPrice,
      bottleCharge: line.bottleCharge,
      giftBoxCharge: line.giftBoxCharge,
      manualDiscount: line.manualDiscount,
    })),
    couponCode: null,
    manualDiscounts: [],
    freeRewards: [],
    customerName: customerName.trim() || null,
    customerMobile: customerMobile.trim() || null,
    customerEmail: null,
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
      if (quoteRequestSequence.current === requestId) {
        const msg = (error as { response?: { data?: { message?: string } } })?.response?.data?.message
          || 'The server could not calculate this shop bill. Review draft lines and try again.';
        setQuoteError(msg);
      }
    } finally {
      if (quoteRequestSequence.current === requestId) setQuoteLoading(false);
    }
  };

  // Estimated total in client (strictly for live counter preview before/during quote)
  const clientEstimatedTotal = useMemo(() => {
    let subtotal = 0;
    let totalDiscount = 0;
    for (const l of lines) {
      const p = (Number(l.productPrice) || 0) * l.quantity;
      const b = Number(l.bottleCharge) || 0;
      const g = Number(l.giftBoxCharge) || 0;
      const d = Number(l.manualDiscount) || 0;
      subtotal += (p + b + g);
      totalDiscount += d;
    }
    const payable = Math.max(0, subtotal - totalDiscount);
    return { subtotal, totalDiscount, payable };
  }, [lines]);

  const submitFinalization = async (retry: boolean) => {
    if (finalizing || reconciling || finalSale) return;
    if (!retry && (!quote || !quote.allLinesAvailable)) return;

    const pending = retry
      ? (pendingFinalize.current || storage.get<PendingFinalizeState | null>(PENDING_SHOP_SALE_KEY, null))
      : null;

    if (retry && !pending) {
      setFinalizeError('No pending sale was found to retry. Please start a new sale.');
      setFinalizationUncertain(false);
      setUncommittedConfirmed(false);
      return;
    }

    const key = pending?.key || idempotencyKey.current || safeUUID();
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
    storage.set(PENDING_SHOP_SALE_KEY, { key, request, timestamp: Date.now() });

    setFinalizing(true);
    setFinalizeError('');

    try {
      if (retry) {
        setReconciling(true);
        try {
          const recon = await billingService.reconcilePosSale(key);
          if (recon.status === 'COMMITTED' && recon.sale) {
            storage.remove(PENDING_SHOP_SALE_KEY);
            pendingFinalize.current = null;
            setFinalizationUncertain(false);
            setUncommittedConfirmed(false);
            setFinalSale(recon.sale);
            return;
          }
          setUncommittedConfirmed(true);
        } catch (reconError) {
          console.warn('Reconcile check error before retry:', reconError);
        } finally {
          setReconciling(false);
        }
      }

      const result = await billingService.finalizePosSale(request, key);
      storage.remove(PENDING_SHOP_SALE_KEY);
      pendingFinalize.current = null;
      setFinalizationUncertain(false);
      setUncommittedConfirmed(false);
      setFinalSale(result);
    } catch (error) {
      const axiosErr = error as { code?: string; message?: string; response?: { status?: number; data?: { code?: string; message?: string; updatedQuote?: PosQuoteResponse } } };
      const response = axiosErr?.response;
      const changedQuote = response?.data?.code === 'QUOTE_CHANGED' ? response.data.updatedQuote : undefined;

      if (changedQuote) {
        storage.remove(PENDING_SHOP_SALE_KEY);
        pendingFinalize.current = null;
        setQuote(changedQuote);
        setFinalizationUncertain(false);
        setUncommittedConfirmed(false);
        setFinalizeError('The shop bill changed. Review the updated items and payable amount, then confirm again.');
      } else if (!response || axiosErr.code === 'ECONNABORTED' || (response.status && response.status >= 500)) {
        setFinalizationUncertain(true);
        setReconciling(true);
        const serverStatusMsg = response?.data?.message || (response?.status ? `HTTP ${response.status}` : 'network timeout');
        setFinalizeError(`The server response was inconclusive (${serverStatusMsg}). Checking whether the shop sale was committed to the database…`);

        billingService.reconcilePosSale(key)
          .then((recon) => {
            if (recon.status === 'COMMITTED' && recon.sale) {
              storage.remove(PENDING_SHOP_SALE_KEY);
              pendingFinalize.current = null;
              setFinalizationUncertain(false);
              setUncommittedConfirmed(false);
              setFinalSale(recon.sale);
            } else {
              setUncommittedConfirmed(true);
              setFinalizeError(`The server returned an error (${serverStatusMsg}), but the sale was NOT committed. You can safely retry or discard this draft.`);
            }
          })
          .catch((reconErr) => {
            console.warn('Reconcile check failed after inconclusive response:', reconErr);
            setFinalizeError(`The server response was inconclusive (${serverStatusMsg}). The transaction may be processing. Click retry to check status and safely finalize.`);
          })
          .finally(() => {
            setReconciling(false);
          });
      } else {
        storage.remove(PENDING_SHOP_SALE_KEY);
        pendingFinalize.current = null;
        idempotencyKey.current = null;
        setFinalizationUncertain(false);
        setUncommittedConfirmed(false);
        const serverMsg = response.data?.message || axiosErr.message || 'The shop sale could not be finalized. Review the error and try again.';
        setFinalizeError(serverMsg);
      }
    } finally {
      setFinalizing(false);
      setReconciling(false);
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

  const shareViaWhatsApp = () => {
    const phone = customerMobile.replace(/\D/g, '');
    const invoiceNum = finalSale?.invoiceNumber || '';
    const amount = quoteCurrency(finalSale?.payableAmount);
    const msg = `Dear Customer, thank you for shopping at Al Ahad Attars! Your store invoice #${invoiceNum} for ${amount} has been issued. Have a blessed day!`;

    if (phone && phone.length >= 10) {
      const formatted = phone.startsWith('91') && phone.length === 12 ? phone : (phone.length === 10 ? `91${phone}` : phone);
      window.open(`https://api.whatsapp.com/send?phone=${formatted}&text=${encodeURIComponent(msg)}`, '_blank');
    } else {
      const manualPhone = window.prompt('Enter customer WhatsApp mobile number (10 digits):');
      if (manualPhone) {
        const clean = manualPhone.replace(/\D/g, '');
        const formatted = clean.startsWith('91') && clean.length === 12 ? clean : (clean.length === 10 ? `91${clean}` : clean);
        window.open(`https://api.whatsapp.com/send?phone=${formatted}&text=${encodeURIComponent(msg)}`, '_blank');
      }
    }
  };

  const resetForNewSale = () => {
    setLines([]);
    setQuote(null);
    setFinalSale(null);
    setCustomerName('');
    setCustomerMobile('');
    setCashReceived('');
    setTransactionReference('');
    setTender('CASH');
    setSelectedProductId('');
    setSelectedVariantId('');
    setSelectedBottleId('');
    setProductPrice('');
    setBottleCharge('');
    setGiftBoxCharge('');
    setManualDiscount('');
    setQuantity(1);
    setFinalizeError('');
    idempotencyKey.current = null;
    pendingFinalize.current = null;
    storage.remove(PENDING_SHOP_SALE_KEY);
  };

  const cashReceivedPaise = amountInPaise(cashReceived);
  const payablePaise = quote ? amountInPaise(quote.payableAmount) : amountInPaise(clientEstimatedTotal.payable.toFixed(2));
  const cashTenderReady = cashReceivedPaise !== null && payablePaise !== null && cashReceivedPaise >= payablePaise;

  // =========================================================================
  // COMPLETED SALE VIEW (Single screen, immediate print & WhatsApp actions)
  // =========================================================================
  if (finalSale) {
    return (
      <div className="flex flex-col h-[calc(100vh-80px)] p-4 max-w-4xl mx-auto justify-center">
        <div className="rounded-2xl border border-emerald-300 bg-white p-6 shadow-lg space-y-5">
          <div className="flex items-center justify-between border-b border-emerald-100 pb-4">
            <div className="flex items-center gap-3 text-emerald-800">
              <CheckCircle2 className="h-8 w-8 text-emerald-600 shrink-0" />
              <div>
                <h2 className="text-2xl font-bold text-slate-900">Physical Store Sale Completed</h2>
                <p className="text-xs text-slate-500">Inventory deducted atomically · Immutable invoice generated</p>
              </div>
            </div>
            <span className="rounded-full bg-emerald-100 px-3 py-1 font-mono text-xs font-semibold text-emerald-800">
              {finalSale.invoiceNumber}
            </span>
          </div>

          <dl className="grid grid-cols-2 sm:grid-cols-4 gap-3 rounded-xl bg-slate-50 p-4 text-xs">
            <div><dt className="text-slate-500">Total Payable</dt><dd className="text-base font-bold text-slate-900">{quoteCurrency(finalSale.payableAmount)}</dd></div>
            <div><dt className="text-slate-500">Tender Method</dt><dd className="font-semibold text-slate-800">{finalSale.tenderMethod}</dd></div>
            <div><dt className="text-slate-500">Amount Received</dt><dd className="font-semibold text-slate-800">{quoteCurrency(finalSale.amountReceived)}</dd></div>
            <div><dt className="text-slate-500">Change Returned</dt><dd className="font-semibold text-slate-800">{quoteCurrency(finalSale.changeReturned)}</dd></div>
            <div><dt className="text-slate-500">Customer</dt><dd className="text-slate-800">{customerName || 'Walk-in'}</dd></div>
            <div><dt className="text-slate-500">Mobile</dt><dd className="text-slate-800">{customerMobile || '—'}</dd></div>
            <div><dt className="text-slate-500">Result</dt><dd className="text-emerald-700 font-medium">{finalSale.replayed ? 'Recovered sale' : 'New confirmed sale'}</dd></div>
            <div><dt className="text-slate-500">Reference</dt><dd className="font-mono text-[11px] truncate">{finalSale.saleKey}</dd></div>
          </dl>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100">
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => void openInvoiceForPrinting(finalSale.invoiceId, 'THERMAL_80')}
                className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2.5 text-xs font-semibold text-white hover:bg-slate-800 shadow-sm"
              >
                <Printer className="h-4 w-4" /> Print 80mm Slip
              </button>
              <button
                type="button"
                onClick={() => void openInvoiceForPrinting(finalSale.invoiceId, 'A4')}
                className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-sm"
              >
                <Printer className="h-4 w-4" /> Open A4 Invoice
              </button>
              <button
                type="button"
                onClick={shareViaWhatsApp}
                className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-xs font-semibold text-white hover:bg-emerald-700 shadow-sm"
              >
                <Share2 className="h-4 w-4" /> WhatsApp Invoice
              </button>
            </div>
            <button
              type="button"
              onClick={resetForNewSale}
              className="inline-flex items-center gap-2 rounded-lg bg-amber-700 px-5 py-2.5 text-xs font-semibold text-white hover:bg-amber-800 shadow-sm"
            >
              <Plus className="h-4 w-4" /> Start New Sale
            </button>
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // SINGLE-SCREEN POS TERMINAL (1366×768 Optimized)
  // =========================================================================
  return (
    <div className="flex flex-col h-[calc(100vh-70px)] min-h-[580px] max-w-[1550px] mx-auto px-3 py-2 space-y-2 select-none overflow-hidden">
      {/* Top Bar: Compact title & Navigation */}
      <div className="flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-amber-700 text-white shadow-sm">
            <Store className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-base font-bold text-slate-900 leading-tight">Shop Counter POS</h1>
            <p className="text-[11px] text-slate-500">Independent Physical Billing · Shared Inventory</p>
          </div>
          <span className="ml-2 inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-800">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" /> Live Inventory Sync
          </span>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <BillingSectionNav />
        </div>
      </div>

      {loadError && <p role="alert" className="shrink-0 rounded border border-red-200 bg-red-50 px-3 py-1 text-xs text-red-700">{loadError}</p>}
      {quoteError && <p role="alert" className="shrink-0 rounded border border-red-200 bg-red-50 px-3 py-1 text-xs text-red-700">{quoteError}</p>}
      {finalizeError && !finalizationUncertain && <p role="alert" className="shrink-0 rounded border border-amber-200 bg-amber-50 px-3 py-1 text-xs text-amber-900">{finalizeError}</p>}

      {/* 3-Column Terminal Grid: Fits exactly within viewport without vertical scrolling */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-2.5 flex-1 min-h-0">
        
        {/* PANEL 1: Catalogue & Search (Col 1-3) */}
        <section className="lg:col-span-3 flex flex-col h-full rounded-xl border border-slate-200 bg-white p-2.5 shadow-sm min-h-0">
          <div className="relative shrink-0 mb-2">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search attars & perfumes…"
              className="w-full rounded-lg border border-slate-300 py-1.5 pl-8 pr-2.5 text-xs focus:border-amber-600 focus:outline-none"
            />
          </div>

          <div className="flex-1 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
            {loading && <p className="py-8 text-center text-xs text-slate-400">Loading catalog…</p>}
            {!loading && visibleProducts.map(product => {
              const activeCount = product.variants ? product.variants.filter(v => v.active).length : 0;
              const isSelected = selectedProductId === product.id;
              return (
                <button
                  key={product.id}
                  type="button"
                  onClick={() => void handleSelectProduct(product)}
                  className={`flex w-full items-center justify-between gap-2 rounded-lg p-2 text-left transition text-xs ${
                    isSelected ? 'border border-amber-600 bg-amber-50 text-amber-950 font-semibold' : 'border border-slate-100 hover:border-slate-300 hover:bg-slate-50 text-slate-800'
                  }`}
                >
                  <div className="min-w-0">
                    <p className="truncate">{product.name}</p>
                    <p className="text-[10px] text-slate-400 font-normal">{product.brand || product.categoryName || 'Product'}</p>
                  </div>
                  <span className="shrink-0 text-[10px] text-slate-400 font-mono">{activeCount} sizes</span>
                </button>
              );
            })}
            {!loading && visibleProducts.length === 0 && (
              <p className="py-8 text-center text-xs text-slate-400">No products found.</p>
            )}
          </div>
        </section>

        {/* PANEL 2: Item Entry & Draft Items (Col 4-8) */}
        <section className="lg:col-span-5 flex flex-col h-full gap-2 min-h-0">
          {/* Top Half: Selected Product Price & Charge Inputs */}
          <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm shrink-0">
            <div className="flex items-center justify-between pb-1.5 border-b border-slate-100">
              <span className="text-xs font-bold text-slate-900 truncate">
                {selectedProduct ? selectedProduct.name : 'Select a product to price'}
              </span>
              {selectedProduct && isBakhoor(selectedProduct) && (
                <span className="text-[10px] bg-amber-100 text-amber-900 px-2 py-0.5 rounded font-medium">Bakhoor (No bottle)</span>
              )}
            </div>

            {variantLoading && (
              <div className="flex items-center justify-center gap-2 py-4 text-xs text-slate-500">
                <LoaderCircle className="h-3.5 w-3.5 animate-spin text-amber-600" />
                <span>Loading active variants…</span>
              </div>
            )}

            {!variantLoading && variantError && (
              <p className="py-2 text-xs text-red-600">{variantError}</p>
            )}

            {!variantLoading && !variantError && !selectedProduct && (
              <p className="py-4 text-center text-xs text-slate-400">Click a product from the left catalogue to enter shop prices.</p>
            )}

            {!variantLoading && !variantError && selectedProduct && availableVariants.length > 0 && (
              <div className="mt-2 space-y-2">
                {/* Variant & Bottle selects */}
                <div className="grid grid-cols-2 gap-2">
                  <label className="block text-[11px] font-medium text-slate-600">
                    Variant Size
                    <select
                      value={selectedVariantId}
                      onChange={e => { setSelectedVariantId(Number(e.target.value)); setSelectedBottleId(''); }}
                      className="mt-0.5 w-full rounded border border-slate-300 bg-white px-2 py-1 text-xs"
                    >
                      {availableVariants.map(v => (
                        <option key={v.id} value={v.id}>
                          {v.size} · Stock: {v.stock ?? 0}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="block text-[11px] font-medium text-slate-600">
                    Bottle {bottleRequired ? '(Required)' : '(Optional)'}
                    <select
                      value={selectedBottleId}
                      onChange={e => setSelectedBottleId(e.target.value ? Number(e.target.value) : '')}
                      disabled={isBakhoor(selectedProduct)}
                      className="mt-0.5 w-full rounded border border-slate-300 bg-white px-2 py-1 text-xs disabled:bg-slate-100"
                    >
                      <option value="">No bottle selected</option>
                      {availableBottles.map(b => (
                        <option key={b.id} value={b.id}>
                          {b.name} · Stock: {b.stockQuantity ?? 0}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                {/* Selling Price & Qty */}
                <div className="grid grid-cols-12 gap-2 items-end">
                  <label className="col-span-5 block text-[11px] font-bold text-amber-950">
                    Selling Price (₹) <span className="text-red-600">*</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      value={productPrice}
                      onChange={e => setProductPrice(e.target.value)}
                      placeholder="e.g. 450.00"
                      className="mt-0.5 w-full rounded border-2 border-amber-500 bg-white px-2 py-1 text-xs font-bold text-slate-900 focus:outline-none focus:ring-1 focus:ring-amber-500"
                    />
                  </label>

                  <div className="col-span-4 block text-[11px] font-medium text-slate-600">
                    Quantity
                    <div className="mt-0.5 inline-flex w-full items-center justify-between rounded border border-slate-300 bg-white px-1 py-0.5">
                      <button type="button" onClick={() => setQuantity(q => Math.max(1, q - 1))} className="rounded p-1 text-slate-600 hover:bg-slate-100"><Minus className="h-3 w-3" /></button>
                      <span className="font-mono text-xs font-semibold">{quantity}</span>
                      <button type="button" onClick={() => setQuantity(q => Math.min(999, q + 1))} className="rounded p-1 text-slate-600 hover:bg-slate-100"><Plus className="h-3 w-3" /></button>
                    </div>
                  </div>

                  <div className="col-span-3">
                    <button
                      type="button"
                      disabled={!selectedVariant || (bottleRequired && !selectedBottleId) || !productPrice || Number(productPrice) <= 0 || lines.length >= 50}
                      onClick={addDraftLine}
                      className="w-full rounded bg-slate-900 py-1.5 text-xs font-bold text-white hover:bg-slate-800 disabled:opacity-40 transition shadow-sm"
                    >
                      + Add Item
                    </button>
                  </div>
                </div>

                {/* Optional Charges & Discount */}
                <div className="grid grid-cols-3 gap-2 pt-1 border-t border-slate-100">
                  <label className="block text-[10px] font-medium text-slate-500">
                    Bottle Charge (₹)
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={bottleCharge}
                      onChange={e => setBottleCharge(e.target.value)}
                      placeholder="0.00"
                      disabled={!selectedBottleId}
                      className="mt-0.5 w-full rounded border border-slate-200 px-2 py-0.5 text-xs disabled:bg-slate-50"
                    />
                  </label>
                  <label className="block text-[10px] font-medium text-slate-500">
                    Gift Box (₹)
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={giftBoxCharge}
                      onChange={e => setGiftBoxCharge(e.target.value)}
                      placeholder="0.00"
                      className="mt-0.5 w-full rounded border border-slate-200 px-2 py-0.5 text-xs"
                    />
                  </label>
                  <label className="block text-[10px] font-medium text-slate-500">
                    Item Discount (₹)
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={manualDiscount}
                      onChange={e => setManualDiscount(e.target.value)}
                      placeholder="0.00"
                      className="mt-0.5 w-full rounded border border-slate-200 px-2 py-0.5 text-xs text-emerald-800"
                    />
                  </label>
                </div>
              </div>
            )}
          </div>

          {/* Bottom Half: Draft Items List */}
          <div className="flex-1 flex flex-col rounded-xl border border-slate-200 bg-white p-3 shadow-sm min-h-0">
            <div className="flex items-center justify-between pb-1.5 border-b border-slate-100 shrink-0">
              <span className="text-xs font-bold text-slate-900">
                Shop Bill Items ({lines.length})
              </span>
              <span className="text-[10px] font-mono text-slate-500">
                Formula: (Price × Qty) + Bottle + Box − Discount
              </span>
            </div>

            <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 mt-1.5 custom-scrollbar">
              {lines.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-slate-400 text-xs">
                  <ShoppingBag className="h-6 w-6 mb-1 opacity-50" />
                  <p>Bill draft is empty.</p>
                  <p className="text-[10px]">Add products with shop selling prices.</p>
                </div>
              ) : (
                lines.map((line) => {
                  const pTotal = (Number(line.productPrice) || 0) * line.quantity;
                  const bCharge = Number(line.bottleCharge) || 0;
                  const gCharge = Number(line.giftBoxCharge) || 0;
                  const mDisc = Number(line.manualDiscount) || 0;
                  const estLineTotal = Math.max(0, pTotal + bCharge + gCharge - mDisc);

                  return (
                    <div key={line.key} className="flex items-center justify-between gap-2 rounded-lg border border-slate-100 bg-slate-50/50 p-2 text-xs">
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-slate-900 truncate">
                          {line.product.name} · {line.variant.size}
                        </p>
                        <p className="text-[10px] text-slate-500 truncate">
                          ₹{line.productPrice} × {line.quantity}
                          {line.bottle ? ` · ${line.bottle.name} (+₹${line.bottleCharge})` : ''}
                          {gCharge > 0 ? ` · Box (+₹${line.giftBoxCharge})` : ''}
                          {mDisc > 0 ? ` · Disc (−₹${line.manualDiscount})` : ''}
                        </p>
                      </div>

                      {/* Qty Controls */}
                      <div className="inline-flex items-center gap-1 rounded border border-slate-200 bg-white px-1">
                        <button type="button" onClick={() => updateLineQuantity(line.key, line.quantity - 1)} disabled={line.quantity <= 1} className="p-0.5 text-slate-500 hover:text-slate-900 disabled:opacity-30"><Minus className="h-2.5 w-2.5" /></button>
                        <span className="font-mono text-xs w-4 text-center">{line.quantity}</span>
                        <button type="button" onClick={() => updateLineQuantity(line.key, line.quantity + 1)} disabled={line.quantity >= 999} className="p-0.5 text-slate-500 hover:text-slate-900 disabled:opacity-30"><Plus className="h-2.5 w-2.5" /></button>
                      </div>

                      {/* Line Total */}
                      <span className="font-mono font-bold text-slate-900 text-xs w-16 text-right">
                        {quoteCurrency(estLineTotal.toFixed(2))}
                      </span>

                      {/* Remove Button */}
                      <button
                        type="button"
                        onClick={() => removeDraftLine(line.key)}
                        className="rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-700 transition"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </section>

        {/* PANEL 3: Customer, Tender & Finalize (Col 9-12) */}
        <section className="lg:col-span-4 flex flex-col h-full rounded-xl border border-slate-200 bg-white p-3 shadow-sm min-h-0 justify-between">
          <div className="space-y-2.5 min-h-0 overflow-y-auto pr-0.5 custom-scrollbar">
            {/* Customer Details */}
            <div className="space-y-1.5">
              <span className="text-[11px] font-bold text-slate-700 flex items-center gap-1">
                <User className="h-3.5 w-3.5 text-slate-400" /> Walk-in Customer
              </span>
              <div className="grid grid-cols-2 gap-1.5">
                <input
                  value={customerName}
                  onChange={e => { setCustomerName(e.target.value); invalidateQuote(); }}
                  placeholder="Name (optional)"
                  maxLength={160}
                  className="rounded border border-slate-300 px-2 py-1 text-xs focus:border-amber-600 focus:outline-none"
                />
                <input
                  value={customerMobile}
                  onChange={e => { setCustomerMobile(e.target.value); invalidateQuote(); }}
                  placeholder="Mobile for WhatsApp"
                  inputMode="tel"
                  maxLength={25}
                  className="rounded border border-slate-300 px-2 py-1 text-xs focus:border-amber-600 focus:outline-none"
                />
              </div>
            </div>

            {/* Bill Summary */}
            <div className="rounded-lg bg-amber-50/70 border border-amber-200/80 p-2.5 space-y-1 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>Items Subtotal</span>
                <span className="font-mono">{quote ? quoteCurrency(quote.subtotal) : quoteCurrency(clientEstimatedTotal.subtotal.toFixed(2))}</span>
              </div>
              <div className="flex justify-between text-emerald-800">
                <span>Shop Discounts</span>
                <span className="font-mono">−{quote ? quoteCurrency(quote.manualDiscount) : quoteCurrency(clientEstimatedTotal.totalDiscount.toFixed(2))}</span>
              </div>
              <div className="flex justify-between pt-1 border-t border-amber-200/60 text-sm font-bold text-slate-900">
                <span>Payable Amount</span>
                <span className="font-mono text-base text-amber-950">
                  {quote ? quoteCurrency(quote.payableAmount) : quoteCurrency(clientEstimatedTotal.payable.toFixed(2))}
                </span>
              </div>
            </div>

            {/* Server Check & Live Stock Status */}
            {quote && (
              <div className="text-[10px] space-y-1">
                {!quote.allLinesAvailable ? (
                  <p className="rounded bg-red-50 border border-red-200 p-1.5 text-red-700 font-semibold">
                    One or more items exceed current stock. Sale blocked until replenished.
                  </p>
                ) : (
                  <p className="rounded bg-emerald-50 border border-emerald-200 p-1.5 text-emerald-800 font-medium flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3 text-emerald-600" /> All items verified in shared stock
                  </p>
                )}
              </div>
            )}

            {/* Tender Selection */}
            <div className="space-y-1.5">
              <span className="text-[11px] font-bold text-slate-700">Payment Tender</span>
              <div className="grid grid-cols-3 gap-1">
                <button
                  type="button"
                  onClick={() => { setTender('CASH'); invalidateQuote(); }}
                  className={`flex items-center justify-center gap-1.5 rounded-lg py-1.5 text-xs font-semibold transition ${
                    tender === 'CASH' ? 'bg-amber-800 text-white shadow-sm' : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <Banknote className="h-3.5 w-3.5" /> Cash
                </button>
                <button
                  type="button"
                  onClick={() => { setTender('UPI'); invalidateQuote(); }}
                  className={`flex items-center justify-center gap-1.5 rounded-lg py-1.5 text-xs font-semibold transition ${
                    tender === 'UPI' ? 'bg-amber-800 text-white shadow-sm' : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <QrCode className="h-3.5 w-3.5" /> UPI
                </button>
                <button
                  type="button"
                  onClick={() => { setTender('CARD'); invalidateQuote(); }}
                  className={`flex items-center justify-center gap-1.5 rounded-lg py-1.5 text-xs font-semibold transition ${
                    tender === 'CARD' ? 'bg-amber-800 text-white shadow-sm' : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <CreditCard className="h-3.5 w-3.5" /> Card
                </button>
              </div>

              {tender === 'CASH' ? (
                <div className="space-y-1">
                  <input
                    inputMode="decimal"
                    value={cashReceived}
                    onChange={e => { setCashReceived(e.target.value); invalidateQuote(); }}
                    placeholder="Enter cash received (₹)"
                    className="w-full rounded border border-slate-300 px-2 py-1 text-xs focus:border-amber-600 focus:outline-none font-mono"
                  />
                  <div className="flex justify-between text-[11px] px-1 font-medium">
                    <span className="text-slate-500">Change Return:</span>
                    <span className={`font-mono font-bold ${cashTenderReady ? 'text-emerald-700' : 'text-slate-400'}`}>
                      {cashReceivedPaise !== null && payablePaise !== null && cashReceivedPaise >= payablePaise
                        ? quoteCurrency(paiseAsMoney(cashReceivedPaise - payablePaise))
                        : '—'}
                    </span>
                  </div>
                </div>
              ) : (
                <input
                  value={transactionReference}
                  onChange={e => { setTransactionReference(e.target.value); invalidateQuote(); }}
                  placeholder="Txn reference (optional)"
                  maxLength={200}
                  className="w-full rounded border border-slate-300 px-2 py-1 text-xs focus:border-amber-600 focus:outline-none"
                />
              )}
            </div>
          </div>

          {/* Action Buttons: Calculate Bill & Finalize Sale */}
          <div className="space-y-1.5 pt-2 border-t border-slate-100 shrink-0">
            {!quote ? (
              <button
                type="button"
                disabled={lines.length === 0 || quoteLoading}
                onClick={calculateQuote}
                className="w-full rounded-lg bg-amber-700 py-2.5 text-xs font-bold text-white hover:bg-amber-800 disabled:opacity-40 shadow-sm flex items-center justify-center gap-2 transition"
              >
                {quoteLoading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                <span>{quoteLoading ? 'Verifying inventory…' : '1. Verify Inventory & Prepare Bill'}</span>
              </button>
            ) : (
              <button
                type="button"
                disabled={!quote.allLinesAvailable || quoteLoading || finalizing || (tender === 'CASH' && !cashTenderReady)}
                onClick={() => void submitFinalization(false)}
                className="w-full rounded-lg bg-emerald-700 py-3 text-sm font-bold text-white hover:bg-emerald-800 disabled:bg-slate-300 disabled:text-slate-500 shadow-md flex items-center justify-center gap-2 transition"
              >
                {finalizing ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                <span>{finalizing ? 'Finalizing sale…' : '2. Complete Sale & Issue Invoice'}</span>
              </button>
            )}

            {quote && (
              <button
                type="button"
                onClick={calculateQuote}
                disabled={quoteLoading || finalizing}
                className="w-full text-center text-[10px] text-slate-500 hover:text-slate-800 underline"
              >
                Refresh bill details
              </button>
            )}
          </div>
        </section>
      </div>

      {/* RECONCILIATION & UNCERTAIN STATE MODAL */}
      {(finalizing || finalizationUncertain) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4" role="dialog" aria-modal="true" aria-labelledby="shop-finalization-status">
          <div className="w-full max-w-md space-y-4 rounded-2xl bg-white p-6 shadow-xl">
            <div className="flex items-center gap-3">
              {(finalizing || reconciling) ? (
                <LoaderCircle className="h-6 w-6 animate-spin text-amber-600 shrink-0" />
              ) : (
                <AlertTriangle className="h-6 w-6 text-amber-600 shrink-0" />
              )}
              <h2 id="shop-finalization-status" className="text-lg font-bold text-slate-900">
                {reconciling ? 'Verifying sale status…' : (finalizationUncertain ? 'Sale status needs confirmation' : 'Finalizing sale')}
              </h2>
            </div>
            <p className="text-xs text-slate-600">
              {finalizeError || (reconciling ? 'Checking whether the sale was already recorded on the server…' : 'Keep this page open while the database confirms the sale.')}
            </p>
            {finalizationUncertain && (
              <div className="space-y-2 pt-2">
                <button
                  type="button"
                  onClick={() => void submitFinalization(true)}
                  disabled={finalizing || reconciling}
                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-amber-700 px-4 py-2.5 text-xs font-semibold text-white hover:bg-amber-800 disabled:opacity-50"
                >
                  {(finalizing || reconciling) && <LoaderCircle className="h-3.5 w-3.5 animate-spin" />}
                  <span>{reconciling ? 'Verifying status…' : (finalizing ? 'Retrying confirmation…' : 'Retry the same request safely')}</span>
                </button>
                {uncommittedConfirmed && (
                  <button
                    type="button"
                    onClick={discardUncertainDraft}
                    disabled={finalizing || reconciling}
                    className="w-full rounded-lg border border-slate-300 px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                  >
                    Discard uncommitted draft & edit sale
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

