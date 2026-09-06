export const VALID_CONTACT_CATEGORIES = [
  'Account & Profile',
  'Subscription',
  'Payment',
  'Jobs',
  'Resume',
  'Interview Preparation',
  'Notes & Learning',
  'Store & Purchases',
  'Technical Issue',
  'Other'
] as const;

export type ContactCategory = (typeof VALID_CONTACT_CATEGORIES)[number];

export const VALID_PRIORITIES = ['low', 'normal', 'high', 'urgent'] as const;
export type ContactPriority = (typeof VALID_PRIORITIES)[number];

export const VALID_STATUSES = ['new', 'in_progress', 'resolved', 'closed'] as const;
export type ContactStatus = (typeof VALID_STATUSES)[number];

export interface ContactInquiry {
  id: string;
  created_at: string;
  updated_at: string;
  source_type: 'external' | 'student';
  status: ContactStatus;
  priority: ContactPriority;
  category: string;
  subject: string;
  message: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  student_id: string | null;
  subscription_plan: string | null;
  reference_code: string;
  admin_notes: string | null;
  assigned_admin_id: string | null;
  resolved_at: string | null;
  last_contacted_at: string | null;
  deleted_at?: string | null;
  deleted_by?: string | null;
}
