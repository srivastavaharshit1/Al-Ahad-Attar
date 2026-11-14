import { useCallback, useEffect, useRef, useState } from 'react';
import { Download, Mail, MessageCircle, Printer, RefreshCw } from 'lucide-react';
import { billingService, type BillingHistoryFilters } from '../../services/billingService';
import type { InvoiceConsent, InvoiceConsentPolicy, InvoiceDelivery, InvoiceDeliveryChannel, InvoiceHistoryItem, InvoicePaperFormat } from '../../types/billing';
import { BillingSectionNav } from './BillingSectionNav';

const money = (value?: number | null) => {
  const num = typeof value === 'number' && Number.isFinite(value) ? value : 0;
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(num);
};

const formatDate = (dateStr?: string | null) => {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? '—' : d.toLocaleString('en-IN');
  } catch {
    return '—';
  }
};

const pageSize = 25;

export function InvoiceHistoryPage() {
  const [invoices, setInvoices] = useState<InvoiceHistoryItem[]>([]);
  const [total, setTotal] = useState(0);
  const [policies, setPolicies] = useState<InvoiceConsentPolicy[]>([]);
  const [selected, setSelected] = useState<InvoiceHistoryItem | null>(null);
  const selectedIdRef = useRef<number | null>(null);
  const [consents, setConsents] = useState<InvoiceConsent[]>([]);
  const [deliveries, setDeliveries] = useState<InvoiceDelivery[]>([]);
  const [destinations, setDestinations] = useState<Record<InvoiceDeliveryChannel, string>>({ EMAIL: '', WHATSAPP: '' });
  const [confirmed, setConfirmed] = useState<Record<InvoiceDeliveryChannel, boolean>>({ EMAIL: false, WHATSAPP: false });
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [searchDraft, setSearchDraft] = useState('');
  const [filters, setFilters] = useState<BillingHistoryFilters>({});
  const [channel, setChannel] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [offset, setOffset] = useState(0);

  const selectInvoice = useCallback(async (invoice: InvoiceHistoryItem | null) => {
    setSelected(invoice);
    selectedIdRef.current = invoice?.id ?? null;
    setMessage('');
    if (!invoice) {
      setConsents([]);
      setDeliveries([]);
      return;
    }
    try {
      const [currentConsents, history] = await Promise.all([
        billingService.getConsents(invoice.id), billingService.getDeliveries(invoice.id),
      ]);
      setConsents(currentConsents || []);
      setDeliveries(history || []);
      setDestinations({
        EMAIL: (currentConsents || []).find(item => item.channel === 'EMAIL')?.destination || invoice.customerEmail || '',
        WHATSAPP: (currentConsents || []).find(item => item.channel === 'WHATSAPP')?.destination || invoice.customerMobile || '',
      });
      setConfirmed({ EMAIL: false, WHATSAPP: false });
    } catch {
      setMessage('Invoice delivery details could not be loaded.');
    }
  }, []);

  const reload = useCallback(async () => {
    setLoading(true);
    setMessage('');
    try {
      const [page, consentPolicies] = await Promise.all([
        billingService.getInvoices({ ...filters, limit: pageSize, offset }),
        billingService.getConsentPolicies(),
      ]);
      const list = page?.content || [];
      setInvoices(list);
      setTotal(page?.totalElements || 0);
      setPolicies(consentPolicies || []);
      if (selectedIdRef.current) {
        const found = list.find(row => row.id === selectedIdRef.current);
        if (found) {
          setSelected(found);
        }
      }
    } catch {
      setMessage('Invoice history is unavailable. Check that Billing migrations are installed and the Admin account has access.');
    } finally {
      setLoading(false);
    }
  }, [filters, offset]);

  useEffect(() => { void reload(); }, [reload]);

  const policyFor = (target: InvoiceDeliveryChannel) => policies.find(item => item.channel === target);
  const consentFor = (target: InvoiceDeliveryChannel) => consents.find(item => item.channel === target);
  const latestDelivery = (target: InvoiceDeliveryChannel) => deliveries.find(item => item.channel === target);

  const saveConsent = async (target: InvoiceDeliveryChannel) => {
    const policy = policyFor(target);
    if (!confirmed[target] || !policy?.configured || !destinations[target].trim() || !selected) return;
    setBusy(true);
    setMessage('');
    try {
      await billingService.saveConsent(selected.id, target, destinations[target].trim(), 'GRANTED', policy.wordingVersion);
      await selectInvoice(selected);
      setMessage(`${target === 'EMAIL' ? 'Email' : 'WhatsApp'} consent saved.`);
    } catch {
      setMessage('Consent could not be saved. Verify approved wording configuration and destination.');
    } finally { setBusy(false); }
  };

  const revokeConsent = async (target: InvoiceDeliveryChannel) => {
    const current = consentFor(target);
    if (!current || !selected) return;
    setBusy(true);
    try {
      await billingService.saveConsent(selected.id, target, current.destination, 'REVOKED', current.wordingVersion || 'UNAPPROVED');
      await selectInvoice(selected);
      setMessage(`${target === 'EMAIL' ? 'Email' : 'WhatsApp'} consent revoked.`);
    } catch { setMessage('Consent revocation could not be saved.'); }
    finally { setBusy(false); }
  };

  const sendInvoice = async (target: InvoiceDeliveryChannel) => {
    if (!selected || consentFor(target)?.status !== 'GRANTED') return;
    const previous = latestDelivery(target);
    setBusy(true);
    setMessage('');
    try {
      const delivery = previous && ['FAILED', 'BLOCKED_CONFIGURATION'].includes(previous.status)
        ? await billingService.retryDelivery(selected.id, previous.id)
        : await billingService.queueDelivery(selected.id, target);
      await selectInvoice(selected);
      setMessage(delivery.status === 'SKIPPED_NO_CONSENT'
        ? 'Delivery was skipped because channel consent is not active.'
        : `Delivery request recorded as ${delivery.status}. Provider acceptance and customer delivery are tracked separately.`);
    } catch { setMessage('Delivery could not be queued or retried. Check the current consent and delivery state.'); }
    finally { setBusy(false); }
  };

  const openPdf = async (invoice: InvoiceHistoryItem, format: InvoicePaperFormat, print: boolean) => {
    setBusy(true);
    try {
      const blob = await billingService.downloadInvoice(invoice.id, format);
      const url = URL.createObjectURL(blob);
      if (print) {
        const frame = document.createElement('iframe');
        frame.title = `Print invoice ${invoice.invoiceNumber}`;
        frame.style.position = 'fixed'; frame.style.width = '1px'; frame.style.height = '1px'; frame.style.opacity = '0';
        frame.onload = () => frame.contentWindow?.print();
        frame.src = url; document.body.appendChild(frame);
        window.setTimeout(() => { frame.remove(); URL.revokeObjectURL(url); }, 60_000);
      } else {
        const anchor = document.createElement('a');
        anchor.href = url; anchor.target = '_blank'; anchor.rel = 'noopener';
        anchor.download = `${invoice.invoiceNumber}-${format}.pdf`; anchor.click();
        window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
      }
    } catch { setMessage('The stored invoice PDF could not be opened.'); }
    finally { setBusy(false); }
  };

  const applyFilters = () => {
    setOffset(0);
    setFilters({ search: searchDraft.trim() || undefined, channel: (channel || undefined) as BillingHistoryFilters['channel'],
      paymentMethod: (paymentMethod || undefined) as BillingHistoryFilters['paymentMethod'], from: from || undefined, to: to || undefined });
  };

  const renderConsentChannel = (target: InvoiceDeliveryChannel) => {
    const current = consentFor(target);
    const policy = policyFor(target);
    const delivery = latestDelivery(target);
    const label = target === 'EMAIL' ? 'Email' : 'WhatsApp';
    const canAttempt = current?.status === 'GRANTED' && (!delivery || ['FAILED', 'BLOCKED_CONFIGURATION', 'SKIPPED_NO_CONSENT'].includes(delivery.status));
    return <section key={target} className="rounded-xl border border-slate-200 p-4">
      <div className="flex items-center justify-between gap-3"><h4 className="font-semibold">{label} delivery</h4><span className={`rounded-full px-2 py-1 text-xs ${current?.status === 'GRANTED' ? 'bg-emerald-50 text-emerald-800' : 'bg-slate-100 text-slate-600'}`}>{current?.status || 'NO CONSENT'}</span></div>
      {policy?.configured ? <p className="mt-3 rounded-lg bg-slate-50 p-3 text-sm text-slate-600">{policy.wording}</p>
        : <p className="mt-3 rounded-lg bg-amber-50 p-3 text-xs text-amber-900">Approved {label} consent wording is not configured. Delivery cannot be enabled.</p>}
      <label className="mt-3 block text-xs font-medium text-slate-600">{target === 'EMAIL' ? 'Email address' : 'Mobile in international format'}
        <input value={destinations[target]} onChange={event => setDestinations(value => ({ ...value, [target]: event.target.value }))}
          placeholder={target === 'EMAIL' ? 'name@example.com' : '+919876543210'} inputMode={target === 'EMAIL' ? 'email' : 'tel'}
          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
      </label>
      {delivery && <p className="mt-2 text-xs text-slate-600">Latest status: <strong>{delivery.status}</strong> · attempts {delivery.attemptCount}</p>}
      {current?.status === 'GRANTED' ? <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" disabled={busy || !canAttempt} onClick={() => void sendInvoice(target)} className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-50">
          {target === 'EMAIL' ? <Mail size={15} /> : <MessageCircle size={15} />}{delivery && ['FAILED', 'BLOCKED_CONFIGURATION'].includes(delivery.status) ? 'Retry failed delivery' : delivery ? 'Queue again' : 'Send invoice'}
        </button>
        <button type="button" disabled={busy} onClick={() => void revokeConsent(target)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm">Revoke consent</button>
      </div> : <div className="mt-3 space-y-2">
        <label className="flex items-start gap-2 text-sm"><input type="checkbox" checked={confirmed[target]} onChange={event => setConfirmed(value => ({ ...value, [target]: event.target.checked }))} className="mt-1 rounded border-slate-300 text-amber-700" /> <span>Customer explicitly agreed to receive this invoice by {label}.</span></label>
        <button type="button" disabled={busy || !confirmed[target] || !policy?.configured || !destinations[target].trim()} onClick={() => void saveConsent(target)} className="rounded-lg bg-amber-800 px-3 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-40">Record explicit consent</button>
      </div>}
    </section>;
  };

  return <div className="mx-auto max-w-7xl space-y-5">
    <BillingSectionNav />
    <div className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-[.18em] text-amber-800">Billing records</p><h2 className="mt-1 text-3xl font-semibold">Invoice history</h2><p className="mt-1 text-sm text-slate-500">PDFs and customer delivery details are ADMIN-only. Consent is recorded independently for each channel.</p></div>
      <button onClick={() => void reload()} disabled={loading} className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"><RefreshCw size={15} /> Refresh</button></div>
    {message && <p role="status" className="rounded-lg border border-slate-200 bg-white p-3 text-sm text-slate-700">{message}</p>}
    <form onSubmit={event => { event.preventDefault(); applyFilters(); }} className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 sm:grid-cols-2 lg:grid-cols-6">
      <input value={searchDraft} onChange={event => setSearchDraft(event.target.value)} placeholder="Invoice, sale, order, customer" className="rounded-lg border border-slate-300 px-3 py-2 text-sm lg:col-span-2" />
      <select value={channel} onChange={event => setChannel(event.target.value)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm"><option value="">All channels</option><option value="ONLINE">Online</option><option value="POS">POS</option></select>
      <select value={paymentMethod} onChange={event => setPaymentMethod(event.target.value)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm"><option value="">All tenders</option><option value="ONLINE">Online</option><option value="CASH">Cash</option><option value="UPI">UPI</option><option value="CARD">Card</option></select>
      <input aria-label="From date" type="date" value={from} onChange={event => setFrom(event.target.value)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
      <div className="flex gap-2"><input aria-label="To date" type="date" value={to} onChange={event => setTo(event.target.value)} className="min-w-0 flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm" /><button className="rounded-lg bg-amber-800 px-4 py-2 text-sm font-semibold text-white">Apply</button></div>
    </form>
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(340px,.8fr)]">
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3 text-sm"><span className="font-semibold">Invoices</span><span className="text-slate-500">{total.toLocaleString()} records</span></div>
        {loading ? <p className="p-6 text-sm text-slate-500">Loading invoice history…</p> : invoices.length === 0 ? <div className="p-6"><p className="font-medium">No invoices match these filters.</p><p className="mt-1 text-sm text-slate-500">Paid online orders are generated asynchronously; POS invoices are created with the sale.</p></div> : <div className="divide-y divide-slate-100">
          {invoices.map(invoice => <button key={invoice.id} onClick={() => void selectInvoice(invoice)} className={`grid w-full grid-cols-[minmax(0,1fr)_auto] gap-2 p-4 text-left hover:bg-slate-50 ${selected?.id === invoice.id ? 'bg-amber-50/60' : ''}`}>
            <span className="min-w-0"><span className="block truncate font-medium">{invoice.invoiceNumber} <span className="ml-1 text-xs font-normal text-slate-500">{invoice.channel}</span></span><span className="block truncate text-xs text-slate-500">{invoice.customerName || 'Customer'}{invoice.saleId ? ` · Sale #${invoice.saleId}` : invoice.orderNumber ? ` · ${invoice.orderNumber}` : ''} · {formatDate(invoice.issuedAt)}</span><span className="mt-1 block text-[11px] text-slate-500">Email: {invoice.emailStatus || '—'} · WhatsApp: {invoice.whatsappStatus || '—'}</span></span><span className="text-sm font-semibold">{money(invoice.total)}</span>
          </button>)}
        </div>}
        <div className="flex items-center justify-between border-t border-slate-100 p-3 text-sm"><span className="text-slate-500">Showing {total === 0 ? 0 : offset + 1}–{Math.min(offset + pageSize, total)} of {total}</span><div className="flex gap-2"><button disabled={offset === 0 || loading} onClick={() => setOffset(Math.max(0, offset - pageSize))} className="rounded-lg border px-3 py-1.5 disabled:opacity-40">Previous</button><button disabled={offset + pageSize >= total || loading} onClick={() => setOffset(offset + pageSize)} className="rounded-lg border px-3 py-1.5 disabled:opacity-40">Next</button></div></div>
      </section>
      <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 md:p-5">
        {!selected ? <div className="grid min-h-64 place-items-center text-center text-sm text-slate-500">Select an invoice to reprint or manage its delivery.</div> : <>
          <div><h3 className="text-lg font-semibold">{selected.invoiceNumber}</h3><p className="text-sm text-slate-500">{selected.channel} · {selected.saleId ? `Sale #${selected.saleId}` : selected.orderNumber || ''} · {money(selected.total)}</p><p className="mt-1 text-xs text-slate-500">Discounts: promotion {money(selected.promotionDiscount)} · manual {money(selected.manualDiscount)} · tender {selected.tenderMethod}</p></div>
          <div className="flex flex-wrap gap-2">{(['A4', 'THERMAL_80'] as const).map(format => <div key={format} className="flex gap-1 rounded-lg border border-slate-200 p-1"><button disabled={busy} onClick={() => void openPdf(selected, format, false)} className="inline-flex items-center gap-1 rounded-md px-2 py-1.5 text-xs hover:bg-slate-100"><Download size={14} />{format === 'A4' ? 'A4 PDF' : '80mm PDF'}</button><button disabled={busy} onClick={() => void openPdf(selected, format, true)} aria-label={`Open ${format} invoice for printing`} className="rounded-md p-1.5 hover:bg-slate-100"><Printer size={14} /></button></div>)}</div>
          <div className="space-y-3"><h4 className="font-semibold">Delivery consent and history</h4>{renderConsentChannel('EMAIL')}{renderConsentChannel('WHATSAPP')}</div>
          <div className="border-t border-slate-100 pt-3"><h4 className="font-semibold">Delivery attempts</h4>{deliveries.length === 0 ? <p className="mt-2 text-sm text-slate-500">No delivery attempts.</p> : <ul className="mt-2 space-y-2">{deliveries.map(item => <li key={item.id} className="rounded-lg bg-slate-50 p-3 text-xs"><div className="flex justify-between gap-2"><span className="font-semibold">{item.channel}</span><span>{item.status}</span></div><p className="mt-1 text-slate-500">Attempts: {item.attemptCount} · {formatDate(item.updatedAt)}</p>{item.lastErrorSummary && <p className="mt-1 text-amber-800">{item.lastErrorSummary}</p>}</li>)}</ul>}</div>
        </>}
      </section>
    </div>
  </div>;
}
