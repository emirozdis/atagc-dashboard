export interface UserDetail {
    school_name?: string;
    phone_number?: string;
    birth_date?: string;
    profile_picture_url?: string | null;
    is_profile_picture_hidden?: boolean; // Added
    additional_info?: any;
}

export interface User {
    id: string; // UUID
    full_name: string;
    email: string;
    role: string;
    is_suspended: boolean;
    created_at: string;

    // Supabase returns arrays for relations by default unless .single() is used
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
        submitted_at: string;
        review_notes?: string;
    } | {
        id: string;
        status: string;
        submitted_at: string;
        review_notes?: string;
    }[] | null;
}