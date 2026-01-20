// Matching PostgreSQL ENUM: payment_status_enum
export enum PaymentStatusEnum {
  UNPAID = 'unpaid',
  PROCESSING = 'processing',
  PAID = 'paid',
  REJECTED = 'rejected',
  EXEMPT = 'exempt'
}

// Matching PostgreSQL ENUM: receipt_status_enum
export enum ReceiptStatusEnum {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected'
}

export type PaymentStatus = 'unpaid' | 'processing' | 'paid' | 'rejected' | 'exempt';

export interface PaymentReceipt {
  id: string;
  user_id: string;
  application_id: string;
  storage_path: string;
  file_url?: string;
  file_type: string;
  status: 'pending' | 'approved' | 'rejected';
  admin_note?: string;
  created_at: string;
  reviewed_at?: string;
  user?: {
    full_name: string;
    email: string;
  };
}

export interface PaymentStats {
  pending: number;
  approved: number;
  rejected: number;
}

// Change Log:
// - Added `PaymentStatusEnum` including `EXEMPT`.
// - Added `ReceiptStatusEnum`.