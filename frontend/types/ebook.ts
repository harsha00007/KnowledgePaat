export type EBookLifecycleStatus = 'draft' | 'published' | 'archived';
export type EBookEditionStatus = 'draft' | 'published' | 'archived';
export type EBookChapterStatus = 'draft' | 'ready';
export type EBookAssetKind = 'cover' | 'sample_pdf' | 'publication_pdf' | 'companion_resource';
export type EBookAssetVisibility = 'public' | 'private' | 'entitled_only';

export interface EBook {
  id: string;
  slug: string;
  title: string;
  subtitle: string | null;
  author: string;
  description: string;
  category: string;
  reader_role: string | null;
  language: string;
  cover_image_url: string | null;
  status: EBookLifecycleStatus;
  created_at: string;
  updated_at: string;
}

export interface EBookEdition {
  id: string;
  ebook_id: string;
  edition_number: number;
  version_name: string;
  status: EBookEditionStatus;
  is_current_edition: boolean;
  pdf_storage_path: string | null;
  pdf_file_size_bytes: number | null;
  pdf_checksum: string | null;
  pdf_original_filename: string | null;
  pdf_uploaded_at: string | null;
  page_count: number | null;
  // Prices stored in integer minor units (paise)
  price_read_online_paise: number;     // e.g. 4900 = ₹49
  price_read_download_paise: number;   // e.g. 9900 = ₹99
  price_upgrade_pdf_paise: number;     // e.g. 5000 = ₹50
  currency: string;
  published_at: string | null;
  created_at: string;
  updated_at: string;
  chapters?: EBookChapter[];
}

export interface EBookChapter {
  id: string;
  ebook_id: string;
  edition_id: string;
  chapter_index: number;
  title: string;
  slug: string;
  content_body: string;
  word_count: number;
  status: EBookChapterStatus;
  is_free_sample: boolean;
  created_at: string;
  updated_at: string;
}

export interface EBookAsset {
  id: string;
  ebook_id: string;
  edition_id: string | null;
  asset_kind: EBookAssetKind;
  visibility: EBookAssetVisibility;
  storage_bucket: string;
  storage_path: string;
  original_filename: string;
  verified_mime_type: string;
  byte_size: number;
  checksum_sha256: string | null;
  uploaded_by: string | null;
  created_at: string;
}

export interface EBookAuditLog {
  id: string;
  actor_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface EBookPublicationChecklist {
  hasRequiredMetadata: boolean;
  hasCoverImage: boolean;
  hasValidPrices: boolean;
  hasAtLeastOneReadyChapter: boolean;
  allChaptersReady: boolean;
  hasIntentionalFreeSample: boolean;
  hasPrivatePdfForDownload: boolean;
  isEligibleForPublication: boolean;
  blockingReasons: string[];
}

export interface EBookAdminDetail extends EBook {
  editions: (EBookEdition & {
    chapters: EBookChapter[];
    assets?: EBookAsset[];
  })[];
  current_edition?: EBookEdition;
}

export type EBookAccessPlan = 'read_online' | 'read_download';
export type EBookGrantType = 'purchase' | 'upgrade' | 'complimentary' | 'admin_override';

export interface EBookEntitlement {
  id: string;
  customer_id: string;
  ebook_id: string;
  edition_id: string;
  plan: EBookAccessPlan;
  can_read_online: boolean;
  can_download_pdf: boolean;
  order_id: string | null;
  grant_type: EBookGrantType;
  granted_by: string | null;
  grant_reason: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface EBookReadingProgress {
  id: string;
  customer_id: string;
  ebook_id: string;
  edition_id: string;
  last_chapter_id: string | null;
  scroll_percent: number;
  completed_at: string | null;
  updated_at: string;
}

export interface CustomerOwnedBook {
  entitlementId: string;
  bookId: string;
  slug: string;
  title: string;
  subtitle: string | null;
  author: string;
  description: string;
  category: string;
  coverImageUrl: string | null;
  editionId: string;
  editionNumber: number;
  versionName: string;
  editionStatus: EBookEditionStatus;
  isCurrentEdition: boolean;
  plan: EBookAccessPlan;
  canReadOnline: boolean;
  canDownloadPdf: boolean;
  grantType: EBookGrantType;
  isActive: boolean;
  purchasedAt: string;
  readingProgress?: {
    scrollPercent: number;
    lastChapterId: string | null;
    completedAt: string | null;
    updatedAt: string;
  } | null;
}

export type EBookPurchaseIntentStatus =
  | 'eligible_new_purchase'
  | 'eligible_upgrade'
  | 'already_owned_online'
  | 'already_owned_complete'
  | 'new_edition_available';

export interface EBookPurchaseIntent {
  status: EBookPurchaseIntentStatus;
  canPurchase: boolean;
  isUpgrade: boolean;
  bookId: string;
  targetEditionId: string;
  targetEditionNumber: number;
  targetVersionName: string;
  plan: EBookAccessPlan;
  pricePaise: number;
  priceRupees: number;
  message: string;
  ownedEditionNumber?: number;
  currentEditionNumber?: number;
}

export type EBookOrderStatus = 'pending' | 'completed' | 'cancelled';
export type EBookPaymentStatus = 'pending' | 'paid' | 'failed' | 'refunded' | 'partially_refunded';
export type EBookRefundStatus = 'none' | 'pending' | 'partial' | 'full' | 'failed';
export type EBookRefundType = 'full' | 'partial' | 'goodwill';
export type EBookRefundStatusState = 'pending' | 'processed' | 'failed';
export type EBookRefundAccessAction = 'revoke' | 'downgrade_to_online' | 'retain' | 'custom';

export interface EBookRefund {
  id: string;
  order_id: string;
  customer_id: string;
  amount_paise: number;
  currency: string;
  reason: string;
  refund_type: EBookRefundType;
  status: EBookRefundStatusState;
  gateway: string;
  gateway_refund_id: string | null;
  gateway_payment_id: string;
  idempotency_key: string;
  allocated_items: { item_id: string; amount_paise: number }[];
  access_action: EBookRefundAccessAction;
  admin_id: string | null;
  error_message: string | null;
  created_at: string;
  processed_at: string | null;
  updated_at: string;
}

export interface EBookOrder {
  id: string;
  order_number: string;
  order_type?: 'purchase' | 'upgrade';
  original_order_id?: string | null;
  original_entitlement_id?: string | null;
  customer_id: string;
  total_amount_paise: number;
  currency: string;
  payment_gateway: string;
  gateway_order_id: string | null;
  gateway_payment_id: string | null;
  gateway_signature: string | null;
  payment_status: EBookPaymentStatus;
  order_status: EBookOrderStatus;
  refund_status?: EBookRefundStatus;
  refunded_amount_paise?: number;
  customer_email: string | null;
  customer_name: string | null;
  notes: Record<string, unknown>;
  paid_at: string | null;
  created_at: string;
  updated_at: string;
  items?: EBookOrderItem[];
  refunds?: EBookRefund[];
}

export interface EBookOrderItem {
  id: string;
  order_id: string;
  ebook_id: string;
  edition_id: string;
  plan: EBookAccessPlan | 'upgrade_pdf';
  price_paise: number;
  refunded_paise?: number;
  refund_status?: EBookRefundStatus;
  title: string;
  edition_label: string | null;
  created_at: string;
}

export interface EBookDownloadLog {
  id: string;
  customer_id: string;
  ebook_id: string;
  edition_id: string;
  delivery_type: 'signed_url' | 'direct_stream';
  status: 'url_issued' | 'download_completed' | 'download_failed';
  ip_address?: string | null;
  user_agent?: string | null;
  created_at: string;
}

export interface EBookUpgradeQuote {
  eligible: boolean;
  bookId: string;
  bookTitle: string;
  editionId: string;
  editionNumber: number;
  versionName: string;
  currentPlan: EBookAccessPlan;
  targetPlan: EBookAccessPlan;
  upgradePricePaise: number;
  upgradePriceRupees: number;
  currency: string;
  originalEntitlementId: string;
  originalOrderId?: string | null;
  message: string;
}

export interface EBookDownloadResponse {
  success: boolean;
  downloadUrl: string;
  expiresInSeconds: number;
  filename: string;
  editionNumber: number;
  versionName: string;
}

export interface EBookReceiptOutboxItem {
  id: string;
  order_id: string;
  customer_id: string;
  recipient_email: string;
  recipient_name: string | null;
  status: 'pending' | 'processing' | 'sent' | 'failed';
  retry_count: number;
  last_error: string | null;
  payload: Record<string, unknown>;
  sent_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface EBookWebhookEvent {
  id: string;
  event_id: string;
  event_type: string;
  gateway: string;
  payload: Record<string, unknown>;
  status: 'pending' | 'processed' | 'failed' | 'ignored';
  processed_at: string | null;
  error_message: string | null;
  created_at: string;
}

export interface ChapterTocItem {
  id: string;
  chapterIndex: number;
  title: string;
  slug: string;
  isFreeSample: boolean;
}

export interface ResolvedEdition {
  id: string;
  editionNumber: number;
  versionName: string;
  status: string;
  isCurrentEdition: boolean;
  isHistorical: boolean;
}

export interface BookmarkItem {
  id: string;
  customerId: string;
  ebookId: string;
  editionId: string;
  chapterId: string;
  chapterIndex?: number;
  chapterTitle?: string;
  scrollPercent: number;
  title?: string;
  createdAt: string;
}

export interface ReadingPreferences {
  theme: 'light' | 'sepia' | 'dark';
  fontSize: 'small' | 'normal' | 'large' | 'xl';
  fontFamily: 'sans' | 'serif' | 'mono';
  lineWidth: 'narrow' | 'medium' | 'wide';
}

export const DEFAULT_READING_PREFERENCES: ReadingPreferences = {
  theme: 'light',
  fontSize: 'normal',
  fontFamily: 'sans',
  lineWidth: 'medium',
};

export interface SearchMatch {
  chapterId: string;
  chapterIndex: number;
  chapterTitle: string;
  snippet: string;
  matchCount: number;
}

export interface EBookAdminReport {
  capturedSalesPaise: number;
  capturedSalesCount: number;
  netSalesPaise: number;
  pendingOrdersCount: number;
  failedOrdersCount: number;
  originalPurchasesCount: number;
  originalPurchasesPaise: number;
  pdfUpgradesCount: number;
  pdfUpgradesPaise: number;
  refunds: {
    pendingCount: number;
    pendingPaise: number;
    processedCount: number;
    processedPaise: number;
    failedCount: number;
    failedPaise: number;
  };
  entitlements: {
    onlineOnlyCount: number;
    downloadEnabledCount: number;
    totalActive: number;
    complimentaryCount: number;
    revokedCount: number;
  };
  bestSellers: {
    ebook_id: string;
    title: string;
    author: string;
    unitsSold: number;
    grossSalesPaise: number;
  }[];
  downloadUrlIssuances: number;
  settlementSummary: {
    settledPaise: number | null;
    unsettledPaise: number | null;
    status: string;
  };
}

export interface EBookReconciliationItem {
  id: string;
  type: 'order' | 'refund';
  referenceId: string;
  orderNumber?: string;
  customerEmail?: string;
  localStatus: string;
  localAmountPaise: number;
  gatewayPaymentId?: string | null;
  gatewayRefundId?: string | null;
  providerStatus?: string | null;
  providerAmountPaise?: number | null;
  discrepancyType?: 'captured_pending_local' | 'local_paid_missing_provider' | 'provider_refund_missing_local' | 'amount_mismatch' | 'none';
  discrepancyDescription?: string;
  actionRequired?: string;
}

export interface EBookReconciliationReport {
  timestamp: string;
  totalOrdersInspected: number;
  discrepanciesCount: number;
  discrepancies: EBookReconciliationItem[];
  providerReachable: boolean;
  settlementDetails: Record<string, unknown>;
}



