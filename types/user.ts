export interface UserDetail {
    school_name?: string;
    phone_number?: string;
    birth_date?: string;
    profile_picture_url?: string | null;
    is_profile_picture_hidden?: boolean;
    additional_info?: any;
    allow_connections?: boolean;
    notification_preferences?: {
        application: boolean;
        committee: boolean;
        social: boolean;
        system: boolean;
    };
}

export interface Warning {
    id: string;
    reason: string;
    created_at: string;
    issuer: {
        id: string;
        full_name: string;
        role: string;
    };
}

export interface User {
    id: string; // UUID
    full_name: string;
    email: string;
    role: string;
    is_suspended: boolean;
    created_at: string;

    // Relations
    user_details?: UserDetail | UserDetail[] | null;
    
    committee_members?: {
        committee: {
            id: string;
            name: string;
        };
    }[] | null;

    // For Committee Chairmen
    managed_committees?: {
        id: string;
        name: string;
    }[];

    application?: {
        id: string;
        status: string;
        payment_status?: "unpaid" | "processing" | "paid" | "rejected";
        submitted_at: string;
        review_notes?: string;
    } | {
        id: string;
        status: string;
        payment_status?: "unpaid" | "processing" | "paid" | "rejected";
        submitted_at: string;
        review_notes?: string;
    }[] | null;

    // Latest payment receipt ID for quick access
    payment_receipts?: {
        id: string;
    }[];

    // Warnings
    user_warnings?: Warning[]; 
    warnings_count?: number;   
}

// Change Log:
// - Added `payment_receipts` array to `User` interface to hold the ID of the latest receipt.