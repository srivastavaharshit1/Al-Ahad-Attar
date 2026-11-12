import { useCallback, useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { billingService } from '../../services/billingService';
import type { BillingSalesSummary, OnlineInvoiceJob } from '../../types/billing';
import { BillingSectionNav } from './BillingSectionNav';

const money = (value?: number | null) => {
  const num = typeof value === 'number' && Number.isFinite(value) ? value : 0;
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(num);
};
const todayUtc = () => new Date().toISOString().slice(0, 10);
const monthStartUtc = () => `${todayUtc().slice(0, 7)}-01`;

export function BillingReportsPage() {
  const [from, setFrom] = useState(monthStartUtc());
  const [to, setTo] = useState(todayUtc());
  const [summary, setSummary] = useState<BillingSalesSummary | null>(null);
  const [jobs, setJobs] = useState<OnlineInvoiceJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyJob, setBusyJob] = useState<number | null>(null);
  const [message, setMessage] = useState('');

  const reload = useCallback(async () => {
    setLoading(true);
    setMessage('');
    try {
      const [totals, failedJobs, blockedJobs] = await Promise.all([
        billingService.getSalesSummary(from, to),
        billingService.getOnlineInvoiceJobs('FAILED'),
        billingService.getOnlineInvoiceJobs('BLOCKED_CONFIGURATION'),
      ]);
      setSummary(totals);
      const failed = failedJobs?.content || [];
      const blocked = blockedJobs?.content || [];
      setJobs([...failed, ...blocked]
        .sort((a, b) => (Date.parse(b.updatedAt) || 0) - (Date.parse(a.updatedAt) || 0)));
    } catch {
      setMessage('Billing reports are unavailable. Confirm the Billing migrations and the selected date range.');
    } finally { setLoading(false); }
  }, [from, to]);
  useEffect(() => { void reload(); }, [reload]);

  const retry = async (jobId: number) => {
    setBusyJob(jobId);
    try {
      await billingService.retryOnlineInvoiceJob(jobId);
      setMessage(`Invoice job ${jobId} queued for retry.`);
      await reload();
    } catch { setMessage(`Invoice job ${jobId} could not be retried. It may no longer be in a retryable state.`); }
    finally { setBusyJob(null); }
  };

  const showRows = (title: string, rows?: BillingSalesSummary['daily']) => {
    const list = rows || [];
    return (
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <h3 className="border-b px-4 py-3 font-semibold">{title}</h3>
        {list.length === 0 ? <p className="p-4 text-sm text-slate-500">No sales in this period.</p> : <div className="overflow-x-auto"><table className="w-full min-w-[500px] text-sm"><thead className="bg-slate-50 text-left text-xs uppercase text-slate-500"><tr><th className="px-4 py-2">Period (UTC)</th><th className="px-4 py-2 text-right">Sales</th><th className="px-4 py-2 text-right">Transactions</th><th className="px-4 py-2 text-right">Discounts</th></tr></thead><tbody className="divide-y">{list.map(row => <tr key={row.period}><td className="px-4 py-2">{row.period}</td><td className="px-4 py-2 text-right">{money(row.sales)}</td><td className="px-4 py-2 text-right">{row.count}</td><td className="px-4 py-2 text-right">{money(row.discounts)}</td></tr>)}</tbody></table></div>}
      </section>
    );
  };

  return <div className="mx-auto max-w-7xl space-y-5">
    <BillingSectionNav />
    <div className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-[.18em] text-amber-800">Online + POS</p><h2 className="mt-1 text-3xl font-semibold">Billing reports</h2><p className="mt-1 text-sm text-slate-500">Sales and discounts are aggregated in PostgreSQL. Date buckets use UTC.</p></div><button onClick={() => void reload()} disabled={loading} className="inline-flex items-center gap-2 rounded-lg border bg-white px-3 py-2 text-sm"><RefreshCw size={15} />Refresh</button></div>
    {message && <p role="status" className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">{message}</p>}
    <form onSubmit={event => { event.preventDefault(); void reload(); }} className="flex flex-wrap items-end gap-3 rounded-2xl border bg-white p-4"><label className="text-xs font-medium text-slate-600">From (UTC)<input type="date" value={from} onChange={event => setFrom(event.target.value)} className="mt-1 block rounded-lg border px-3 py-2 text-sm" /></label><label className="text-xs font-medium text-slate-600">To (UTC)<input type="date" value={to} onChange={event => setTo(event.target.value)} className="mt-1 block rounded-lg border px-3 py-2 text-sm" /></label><button className="rounded-lg bg-amber-800 px-4 py-2 text-sm font-semibold text-white">Apply</button><span className="text-xs text-slate-500">Maximum report window: 366 days.</span></form>
    {loading && !summary ? <p className="rounded-xl bg-white p-6 text-sm text-slate-500">Loading sales…</p> : summary && <>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{[
        ['Combined sales', summary.combinedSales, `${summary.combinedCount} transactions`],
        ['Online sales', summary.onlineSales, `${summary.onlineCount} transactions`],
        ['POS sales', summary.posSales, `${summary.posCount} transactions`],
        ['Discounts', summary.combinedDiscounts, 'Promotion + manual discounts'],
      ].map(([label, value, detail]) => <section key={String(label)} className="rounded-2xl border border-slate-200 bg-white p-4"><p className="text-sm text-slate-500">{label}</p><p className="mt-1 text-2xl font-semibold">{money(Number(value))}</p><p className="mt-1 text-xs text-slate-500">{detail}</p></section>)}</div>
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white"><h3 className="border-b px-4 py-3 font-semibold">Payment method breakdown</h3>{(summary.paymentBreakdown || []).length === 0 ? <p className="p-4 text-sm text-slate-500">No sales in this period.</p> : <table className="w-full text-sm"><thead className="bg-slate-50 text-left text-xs uppercase text-slate-500"><tr><th className="px-4 py-2">Method</th><th className="px-4 py-2 text-right">Transactions</th><th className="px-4 py-2 text-right">Sales</th><th className="px-4 py-2 text-right">Discounts</th></tr></thead><tbody className="divide-y">{(summary.paymentBreakdown || []).map(row => <tr key={row.method}><td className="px-4 py-2">{row.method}</td><td className="px-4 py-2 text-right">{row.count}</td><td className="px-4 py-2 text-right">{money(row.sales)}</td><td className="px-4 py-2 text-right">{money(row.discounts)}</td></tr>)}</tbody></table>}</section>
      <div className="grid gap-5 xl:grid-cols-2">{showRows('Daily sales', summary.daily)}{showRows('Monthly sales', summary.monthly)}</div>
    </>}
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white"><div className="flex items-center justify-between border-b px-4 py-3"><h3 className="font-semibold">Online invoice jobs needing attention</h3><span className="text-xs text-slate-500">{jobs.length} shown</span></div>{jobs.length === 0 ? <p className="p-4 text-sm text-slate-500">No failed or configuration-blocked invoice-generation jobs in the current page.</p> : <ul className="divide-y">{jobs.map(job => <li key={job.id} className="flex flex-wrap items-center justify-between gap-3 p-4"><div><p className="font-medium">Order #{job.orderId} · job {job.id} · {job.status} · {job.attemptCount} attempts</p><p className="text-xs text-amber-800">{job.lastErrorCode || job.status} · {job.lastErrorSummary || 'No summary recorded'}</p></div><button disabled={busyJob === job.id} onClick={() => void retry(job.id)} className="rounded-lg border px-3 py-2 text-sm disabled:opacity-50">{busyJob === job.id ? 'Queueing…' : 'Retry invoice generation'}</button></li>)}</ul>}</section>
  </div>;
}
