import { PaymentStatus } from "./payment";
import { ApplicationStatus } from "./application";

export type GradeEnum = 'prep' | '9' | '10' | '11' | '12' | 'university';

export interface UserDetail {
    school_name: string;
    phone_number: string;
    birth_date: string;
    profile_picture_url?: string | null;
    is_profile_picture_hidden: boolean;
    city: string;
    grade: GradeEnum;
    
    additional_info: any;
    allow_connections: boolean;
    notification_preferences: {
        application: boolean;
        committee: boolean;
        social: boolean;
        system: boolean;
    };
}

export type WarningCategory = 'behavior' | 'attendance' | 'dress_code' | 'academic' | 'other';

export interface Warning {
    id: string;
    category: WarningCategory;
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
    user_details: UserDetail | UserDetail[] | null;

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

    // Updated Application Structure
    application?: {
        id: string;
        status: ApplicationStatus;
        payment_status?: PaymentStatus;
        submitted_at: string;
        review_notes?: string;
        form_data?: Record<string, any>;
        form?: {
            slug: string;
            title: string;
            steps?: {
                id: string;
                title: string;
                description?: string;
                fields: {
                    id: string;
                    label: string;
                    type: string;
                    required?: boolean;
                    placeholder?: string;
                    options?: { value: string; label: string; }[];
                    system_map?: string;
                }[];
            }[];
        };
    } | {
        id: string;
        status: ApplicationStatus;
        payment_status?: PaymentStatus;
        submitted_at: string;
        review_notes?: string;
        form_data?: Record<string, any>;
        form?: {
            slug: string;
            title: string;
            steps?: {
                id: string;
                title: string;
                description?: string;
                fields: {
                    id: string;
                    label: string;
                    type: string;
                    required?: boolean;
                    placeholder?: string;
                    options?: { value: string; label: string; }[];
                    system_map?: string;
                }[];
            }[];
        };
    }[] | null;

    payment_receipts?: {
        id: string;
    }[];

    user_warnings: Warning[];
    warnings_count: number;
}