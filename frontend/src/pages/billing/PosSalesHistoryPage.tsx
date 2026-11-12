import { useCallback, useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { billingService, type PosSaleFilters } from '../../services/billingService';
import type { PosSaleHistoryItem } from '../../types/billing';
import { BillingSectionNav } from './BillingSectionNav';

const size = 25;
const money = (value: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(value);

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

  const reload = useCallback(async () => {
    setLoading(true);
    setMessage('');
    try {
      const page = await billingService.getPosSales({ ...filters, limit: size, offset });
      setRows(page.content);
      setTotal(page.totalElements);
    } catch {
      setMessage('POS sales are unavailable. Confirm the Billing database migration and Admin authorization.');
    } finally { setLoading(false); }
  }, [filters, offset]);
  useEffect(() => { void reload(); }, [reload]);

  const apply = () => {
    setOffset(0);
    setFilters({ search: searchDraft.trim() || undefined,
      tenderMethod: tender ? tender as PosSaleFilters['tenderMethod'] : undefined,
      from: from || undefined, to: to || undefined });
  };

  return <div className="mx-auto max-w-7xl space-y-5">
    <BillingSectionNav />
    <div className="flex items-end justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-[.18em] text-amber-800">Offline sales</p><h2 className="mt-1 text-3xl font-semibold">POS sales history</h2><p className="mt-1 text-sm text-slate-500">Completed connected-POS sales, one tender per sale.</p></div><button onClick={() => void reload()} disabled={loading} className="inline-flex items-center gap-2 rounded-lg border bg-white px-3 py-2 text-sm"><RefreshCw size={15} />Refresh</button></div>
    {message && <p role="alert" className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">{message}</p>}
    <form onSubmit={event => { event.preventDefault(); apply(); }} className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 sm:grid-cols-2 lg:grid-cols-5">
      <input value={searchDraft} onChange={event => setSearchDraft(event.target.value)} placeholder="Sale, invoice, customer or mobile" className="rounded-lg border px-3 py-2 text-sm lg:col-span-2" />
      <select value={tender} onChange={event => setTender(event.target.value)} className="rounded-lg border px-3 py-2 text-sm"><option value="">All tenders</option><option value="CASH">Cash</option><option value="UPI">UPI</option><option value="CARD">Card</option></select>
      <input aria-label="From date" type="date" value={from} onChange={event => setFrom(event.target.value)} className="rounded-lg border px-3 py-2 text-sm" />
      <div className="flex gap-2"><input aria-label="To date" type="date" value={to} onChange={event => setTo(event.target.value)} className="min-w-0 flex-1 rounded-lg border px-3 py-2 text-sm" /><button className="rounded-lg bg-amber-800 px-4 py-2 text-sm font-semibold text-white">Apply</button></div>
    </form>
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
      <div className="border-b px-4 py-3 text-sm"><strong>{total.toLocaleString()}</strong> completed POS sales</div>
      {loading ? <p className="p-6 text-sm text-slate-500">Loading POS sales…</p> : rows.length === 0 ? <p className="p-6 text-sm text-slate-500">No completed sales match these filters.</p> : <div className="overflow-x-auto"><table className="w-full min-w-[900px] text-left text-sm"><thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="px-4 py-3">Sale / invoice</th><th className="px-4 py-3">Customer</th><th className="px-4 py-3">Tender</th><th className="px-4 py-3 text-right">Discounts</th><th className="px-4 py-3 text-right">Payable</th><th className="px-4 py-3 text-right">Received</th><th className="px-4 py-3">Completed</th></tr></thead><tbody className="divide-y divide-slate-100">
        {rows.map(row => <tr key={row.saleId} className="align-top"><td className="px-4 py-3"><span className="block font-semibold">Sale #{row.saleId}</span><span className="text-xs text-slate-500">{row.invoiceNumber || 'Invoice unavailable'}</span></td><td className="px-4 py-3"><span className="block">{row.customerName || 'Walk-in'}</span><span className="text-xs text-slate-500">{row.customerMobile || row.customerEmail || ''}</span></td><td className="px-4 py-3">{row.tenderMethod}{row.changeReturned > 0 && <span className="block text-xs text-slate-500">Change {money(row.changeReturned)}</span>}</td><td className="px-4 py-3 text-right">{money(row.promotionDiscount + row.manualDiscount)}<span className="block text-xs text-slate-500">Promo {money(row.promotionDiscount)} · Manual {money(row.manualDiscount)}</span></td><td className="px-4 py-3 text-right font-semibold">{money(row.payable)}</td><td className="px-4 py-3 text-right">{money(row.amountReceived)}</td><td className="px-4 py-3 whitespace-nowrap text-xs text-slate-500">{new Date(row.completedAt).toLocaleString('en-IN')}</td></tr>)}
      </tbody></table></div>}
      <div className="flex items-center justify-between border-t p-3 text-sm"><span className="text-slate-500">Showing {total === 0 ? 0 : offset + 1}–{Math.min(offset + size, total)} of {total}</span><div className="flex gap-2"><button disabled={offset === 0 || loading} onClick={() => setOffset(Math.max(0, offset - size))} className="rounded-lg border px-3 py-1.5 disabled:opacity-40">Previous</button><button disabled={offset + size >= total || loading} onClick={() => setOffset(offset + size)} className="rounded-lg border px-3 py-1.5 disabled:opacity-40">Next</button></div></div>
    </section>
  </div>;
}
