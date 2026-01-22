export interface DocumentVersion {
  id: string;
  committee_id: string;
  created_at: string;
  created_by: string | null;
  version_name: string;
  is_auto_save: boolean;
  creator?: {
    full_name: string;
  };
}

export interface RestoreResponse {
  success: boolean;
  message: string;
}