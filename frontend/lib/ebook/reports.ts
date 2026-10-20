/**
 * KnowledgePaat — Phase 8: Operational Reporting & CSV Export Engine
 * 
 * Provides integer-paise financial calculations, orders breakdown,
 * refund summaries, download issuance counts, and formula-injection-safe CSV export.
 */

import { createClient } from '@supabase/supabase-js';
import { logger } from '@/lib/logger';
import { EBookAdminReport } from '@/types/ebook';
import { fetchRazorpaySettlements } from '@/lib/razorpay';

function getServiceSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(url, key);
}

/**
 * Sanitize a string against spreadsheet formula injection (CSV Injection / CWE-1236).
 * Prepends a single quote if string begins with =, +, -, @, tab, or carriage return.
 */
export function sanitizeCsvField(value: any): string {
  if (value === null || value === undefined) return '""';
  const str = String(value);
  if (/^[=+\-@\t\r]/.test(str)) {
    return `"'${str.replace(/"/g, '""')}"`;
  }
  return `"${str.replace(/"/g, '""')}"`;
}

/**
 * Generate full operational report for eBook platform.
 */
export async function getEBookAdminReport(): Promise<EBookAdminReport> {
  const supabase = getServiceSupabase();

  // 1. Fetch Orders overview
  const { data: orders, error: ordersErr } = await supabase
    .from('ebook_orders')
    .select(`
      id,
      order_type,
      total_amount_paise,
      refunded_amount_paise,
      payment_status,
      order_status,
      refund_status,
      items:ebook_order_items (
        id,
        ebook_id,
        plan,
        price_paise,
        title
      )
    `);

  if (ordersErr) {
    logger.error('Failed to query orders for admin report', ordersErr);
    throw new Error('Failed to load orders for reporting.');
  }

  const allOrders = orders || [];

  // Captured / Paid orders
  const paidOrders = allOrders.filter(o => ['paid', 'partially_refunded', 'refunded'].includes(o.payment_status));
  const pendingOrders = allOrders.filter(o => o.payment_status === 'pending');
  const failedOrders = allOrders.filter(o => o.payment_status === 'failed');

  let capturedSalesPaise = 0;
  let originalPurchasesCount = 0;
  let originalPurchasesPaise = 0;
  let pdfUpgradesCount = 0;
  let pdfUpgradesPaise = 0;

  for (const o of paidOrders) {
    capturedSalesPaise += o.total_amount_paise;
    if (o.order_type === 'upgrade') {
      pdfUpgradesCount++;
      pdfUpgradesPaise += o.total_amount_paise;
    } else {
      originalPurchasesCount++;
      originalPurchasesPaise += o.total_amount_paise;
    }
  }

  // 2. Fetch Refunds overview
  const { data: refunds, error: refundsErr } = await supabase
    .from('ebook_refunds')
    .select('id, amount_paise, status');

  const allRefunds = refunds || [];
  let pendingRefundsCount = 0;
  let pendingRefundsPaise = 0;
  let processedRefundsCount = 0;
  let processedRefundsPaise = 0;
  let failedRefundsCount = 0;
  let failedRefundsPaise = 0;

  for (const r of allRefunds) {
    if (r.status === 'processed') {
      processedRefundsCount++;
      processedRefundsPaise += r.amount_paise;
    } else if (r.status === 'pending') {
      pendingRefundsCount++;
      pendingRefundsPaise += r.amount_paise;
    } else if (r.status === 'failed') {
      failedRefundsCount++;
      failedRefundsPaise += r.amount_paise;
    }
  }

  // Net Sales = Captured Sales - Processed Refunds
  const netSalesPaise = Math.max(0, capturedSalesPaise - processedRefundsPaise);

  // 3. Fetch Entitlements overview
  const { data: entitlements, error: entErr } = await supabase
    .from('ebook_entitlements')
    .select('id, plan, is_active, grant_type');

  const allEntitlements = entitlements || [];
  let onlineOnlyCount = 0;
  let downloadEnabledCount = 0;
  let totalActive = 0;
  let complimentaryCount = 0;
  let revokedCount = 0;

  for (const e of allEntitlements) {
    if (e.is_active) {
      totalActive++;
      if (e.plan === 'read_download') {
        downloadEnabledCount++;
      } else {
        onlineOnlyCount++;
      }
      if (e.grant_type === 'complimentary') {
        complimentaryCount++;
      }
    } else {
      revokedCount++;
    }
  }

  // 4. Best Selling Books
  const bookSalesMap = new Map<string, { ebook_id: string; title: string; author: string; unitsSold: number; grossSalesPaise: number }>();

  for (const o of paidOrders) {
    for (const item of o.items || []) {
      const existing = bookSalesMap.get(item.ebook_id) || {
        ebook_id: item.ebook_id,
        title: item.title,
        author: '',
        unitsSold: 0,
        grossSalesPaise: 0,
      };
      existing.unitsSold += 1;
      existing.grossSalesPaise += item.price_paise;
      bookSalesMap.set(item.ebook_id, existing);
    }
  }

  const bestSellers = Array.from(bookSalesMap.values())
    .sort((a, b) => b.grossSalesPaise - a.grossSalesPaise)
    .slice(0, 5);

  // 5. Download URL Issuances (explicitly labelled as URL issuances, not completed saves)
  const { count: downloadIssuancesCount } = await supabase
    .from('ebook_download_logs')
    .select('id', { count: 'exact', head: true });

  // 6. Settlement Summary from Gateway (or N/A in Test Mode)
  let settlementSummary = {
    settledPaise: null as number | null,
    unsettledPaise: null as number | null,
    status: 'Test Mode / Pending Bank Settlement',
  };

  try {
    const settlementData = await fetchRazorpaySettlements();
    if (settlementData.total > 0 && settlementData.items[0]) {
      const latest = settlementData.items[0];
      settlementSummary = {
        settledPaise: latest.amount || null,
        unsettledPaise: null,
        status: latest.status || 'Active',
      };
    }
  } catch {
    // Expected in Test Mode sandbox
  }

  return {
    capturedSalesPaise,
    capturedSalesCount: paidOrders.length,
    netSalesPaise,
    pendingOrdersCount: pendingOrders.length,
    failedOrdersCount: failedOrders.length,
    originalPurchasesCount,
    originalPurchasesPaise,
    pdfUpgradesCount,
    pdfUpgradesPaise,
    refunds: {
      pendingCount: pendingRefundsCount,
      pendingPaise: pendingRefundsPaise,
      processedCount: processedRefundsCount,
      processedPaise: processedRefundsPaise,
      failedCount: failedRefundsCount,
      failedPaise: failedRefundsPaise,
    },
    entitlements: {
      onlineOnlyCount,
      downloadEnabledCount,
      totalActive,
      complimentaryCount,
      revokedCount,
    },
    bestSellers,
    downloadUrlIssuances: downloadIssuancesCount || 0,
    settlementSummary,
  };
}

/**
 * Generate CSV export for filtered orders.
 */
export async function generateOrdersCsv(orders: any[]): Promise<string> {
  const headers = [
    'Order Number',
    'Order Type',
    'Date (IST)',
    'Customer Name',
    'Customer Email',
    'Total Amount (INR)',
    'Payment Status',
    'Order Status',
    'Refund Status',
    'Refunded Amount (INR)',
    'Gateway Payment ID',
    'Gateway Order ID',
    'Purchased Items',
  ];

  const rows = orders.map((o) => {
    let istDate = '';
    try {
      istDate = new Date(o.created_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
    } catch {
      istDate = o.created_at;
    }

    const itemsSummary = (o.items || [])
      .map((i: any) => `${i.title} (${i.plan === 'upgrade_pdf' ? 'PDF Upgrade' : i.plan}) - ₹${(i.price_paise / 100).toFixed(2)}`)
      .join('; ');

    return [
      sanitizeCsvField(o.order_number),
      sanitizeCsvField(o.order_type || 'purchase'),
      sanitizeCsvField(istDate),
      sanitizeCsvField(o.customer_name || 'N/A'),
      sanitizeCsvField(o.customer_email || 'N/A'),
      sanitizeCsvField((o.total_amount_paise / 100).toFixed(2)),
      sanitizeCsvField(o.payment_status),
      sanitizeCsvField(o.order_status),
      sanitizeCsvField(o.refund_status || 'none'),
      sanitizeCsvField(((o.refunded_amount_paise || 0) / 100).toFixed(2)),
      sanitizeCsvField(o.gateway_payment_id || 'N/A'),
      sanitizeCsvField(o.gateway_order_id || 'N/A'),
      sanitizeCsvField(itemsSummary),
    ].join(',');
  });

  return [headers.join(','), ...rows].join('\r\n');
}
