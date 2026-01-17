export type PaymentStatus = 'unpaid' | 'processing' | 'paid' | 'rejected';

export interface PaymentReceipt {
  id: string;
  user_id: string;
  application_id: string;
  storage_path: string;
  file_url?: string; // Signed URL for frontend display
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