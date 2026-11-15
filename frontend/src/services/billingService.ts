import { apiClient } from '../api/axios';
import type {
  InvoiceConsentPolicy, InvoiceConsentStatus, InvoiceDelivery, InvoiceConsent,
  InvoiceDeliveryChannel, InvoiceHistoryItem, InvoicePaperFormat,
  PosQuoteRequest, PosQuoteResponse, PosSaleFinalizeRequest, PosSaleFinalizeResponse,
  PosSaleReconciliationResponse,
  BillingPage, BillingSalesSummary, PosSaleHistoryItem, PosSaleDetail, OnlineInvoiceJob,
} from '../types/billing';

export interface BillingHistoryFilters {
  search?: string;
  channel?: 'ONLINE' | 'POS';
  paymentMethod?: 'ONLINE' | 'CASH' | 'UPI' | 'CARD';
  from?: string;
  to?: string;
  limit?: number;
  offset?: number;
}

export interface PosSaleFilters {
  search?: string;
  tenderMethod?: 'CASH' | 'UPI' | 'CARD';
  from?: string;
  to?: string;
  limit?: number;
  offset?: number;
}

export const billingService = {
  createPosQuote: async (request: PosQuoteRequest) =>
    (await apiClient.post<PosQuoteResponse>('/billing/pos/quotes', request, {
      headers: { 'Cache-Control': 'no-store' },
    })).data,
  finalizePosSale: async (request: PosSaleFinalizeRequest, idempotencyKey: string) =>
    (await apiClient.post<PosSaleFinalizeResponse>('/billing/pos/sales/finalize', request, {
      headers: { 'Idempotency-Key': idempotencyKey, 'Cache-Control': 'no-store' },
    })).data,
  reconcilePosSale: async (idempotencyKey: string) =>
    (await apiClient.get<PosSaleReconciliationResponse>(`/billing/pos/sales/reconcile/${idempotencyKey}`, {
      headers: { 'Cache-Control': 'no-store' },
    })).data,
  getInvoices: async (filters: BillingHistoryFilters = {}) =>
    (await apiClient.get<BillingPage<InvoiceHistoryItem>>('/billing/invoices/history', { params: { limit: 25, offset: 0, ...filters } })).data,
  getPosSales: async (filters: PosSaleFilters = {}) =>
    (await apiClient.get<BillingPage<PosSaleHistoryItem>>('/billing/pos/sales', { params: { limit: 25, offset: 0, ...filters } })).data,
  getPosSaleDetail: async (saleId: number) =>
    (await apiClient.get<PosSaleDetail>(`/billing/pos/sales/${saleId}`, {
      headers: { 'Cache-Control': 'no-store' },
    })).data,
  getSalesSummary: async (from: string, to: string) =>
    (await apiClient.get<BillingSalesSummary>('/billing/reports/summary', { params: { from, to } })).data,
  getOnlineInvoiceJobs: async (status?: string) =>
    (await apiClient.get<BillingPage<OnlineInvoiceJob>>('/billing/online-invoice-jobs', { params: { status, limit: 20, offset: 0 } })).data,
  retryOnlineInvoiceJob: async (jobId: number) =>
    apiClient.post(`/billing/online-invoice-jobs/${jobId}/retry`, undefined, {
      headers: { 'Idempotency-Key': crypto.randomUUID() },
    }),
  getDeliveries: async (invoiceId: number) =>
    (await apiClient.get<InvoiceDelivery[]>(`/billing/invoices/${invoiceId}/delivery`)).data,
  sendWhatsAppInvoice: async (invoiceId: number, phone?: string, idempotencyKey?: string) =>
    (await apiClient.post<InvoiceDelivery>(
      `/billing/invoices/${invoiceId}/delivery/whatsapp/send`,
      undefined,
      {
        params: phone ? { phone } : undefined,
        headers: {
          'Idempotency-Key': idempotencyKey || crypto.randomUUID(),
          'Cache-Control': 'no-store',
        },
      },
    )).data,
  getConsents: async (invoiceId: number) =>
    (await apiClient.get<InvoiceConsent[]>(`/billing/invoices/${invoiceId}/consent`)).data,
  getConsentPolicies: async () =>
    (await apiClient.get<InvoiceConsentPolicy[]>('/billing/invoices/consent-policy')).data,
  queueDelivery: async (invoiceId: number, channel: InvoiceDeliveryChannel) =>
    (await apiClient.post<InvoiceDelivery>(
      `/billing/invoices/${invoiceId}/delivery/${channel}`,
      undefined,
      { headers: { 'Idempotency-Key': crypto.randomUUID() } },
    )).data,
  retryDelivery: async (invoiceId: number, deliveryId: number) =>
    (await apiClient.post<InvoiceDelivery>(
      `/billing/invoices/${invoiceId}/delivery/${deliveryId}/retry`,
      undefined,
      { headers: { 'Idempotency-Key': crypto.randomUUID() } },
    )).data,
  saveConsent: async (invoiceId: number, channel: InvoiceDeliveryChannel, destination: string, status: InvoiceConsentStatus, wordingVersion: string) =>
    apiClient.post(`/billing/invoices/${invoiceId}/consent`, {
      channel,
      destination,
      status,
      wordingVersion,
    }),
  downloadInvoice: async (invoiceId: number, format: InvoicePaperFormat) =>
    (await apiClient.get<Blob>(`/billing/invoices/${invoiceId}/pdf`, { params: { format }, responseType: 'blob' })).data,
};
