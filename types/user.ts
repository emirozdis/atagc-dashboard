import { PaymentStatus } from "./payment";
import { ApplicationStatus } from "./application";

export type GradeEnum = 'prep' | '9' | '10' | '11' | '12' | 'university';

export interface UserDetail {
    high_school_id: number | null; 
    phone_number: string;
    birth_date: string;
    profile_picture_url?: string | null;
    is_profile_picture_hidden: boolean;
    city: string;
    grade: GradeEnum;
    high_schools?: { school_name: string } | null;
    
    additional_info: {
        manual_school_name?: string;
        [key: string]: unknown;
    };
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
    id: string; 
    full_name: string;
    email: string;
    role: string;
    is_suspended: boolean;
    created_at: string;

    user_details: UserDetail | UserDetail[] | null;

    committee_members?: {
        committee: {
            id: string;
            name: string;
        };
    }[] | null;

    managed_committees?: {
        id: string;
        name: string;
    }[];

    application?: {
        id: string;
        status: ApplicationStatus;
        payment_status?: PaymentStatus;
        submitted_at: string;
        review_notes?: string;
        form_data?: Record<string, unknown>;
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
        form_data?: Record<string, unknown>;
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
