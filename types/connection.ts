export interface ConnectionRequest {
  id: string;
  requester: {
    id: string;
    full_name: string;
    email: string;
    role: string;
    user_details?: {
      profile_picture_url?: string | null;
      additional_info?: any;
    } | null;
  };
  created_at: string;
}

export interface SentRequest {
  id: string;
  recipient: {
    id: string;
    full_name: string;
    email: string;
    role: string;
    user_details?: {
      profile_picture_url?: string | null;
      additional_info?: any;
    } | null;
  };
  created_at: string;
}

export interface ConnectedUser {
  id: string; // Connection ID
  friend: {
    id: string;
    full_name: string;
    email: string;
    role: string;
    user_details?: {
      profile_picture_url?: string | null;
      school_name?: string;
      additional_info?: any;
    } | null;
  };
  created_at: string; // When connection was requested
  updated_at: string; // When connected
}

export interface ConnectionState {
  pending: ConnectionRequest[]; // Received
  sent: SentRequest[];          // Sent
  connected: ConnectedUser[];   // Established
}

// Change Log:
// - Added `SentRequest` interface.
// - Updated `ConnectionState` to include `sent`.