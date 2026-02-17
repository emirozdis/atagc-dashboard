import { GradeEnum } from "./user";
import { FormStep } from "./application";

export interface ProfileData {
    profile: {
        id: string;
        full_name: string;
        email: string;
        role: string;
        created_at: string;
        user_warnings?: {
            id: string;
            reason: string;
            created_at: string;
            issuer?: {
                full_name: string;
                role: string;
            };
        }[];
        details: {
            id: string;
            birth_date: string;
            phone_number: string;
            school_name: string;
            city?: string;
            grade?: GradeEnum;
            profile_picture_url?: string | null;
            is_profile_picture_hidden?: boolean;
            allow_connections?: boolean;
            notification_preferences?: {
                application: boolean;
                committee: boolean;
                social: boolean;
                system: boolean;
            };
            additional_info: {
                mun_experience?: string;
                previous_conferences?: string;
                committee_pref_1?: string;
                committee_pref_2?: string;
                delegation_type?: string;
                english_level?: string;
                reason_for_joining?: string;
                expectations?: string;
                self_introduction?: string;
                kvkk_approved?: boolean;
                manual_school_name?: string; // Added to fix TS error
            };
        } | null;
    };
    application: {
        id: string;
        status: string;
        submitted_at: string;
        review_notes: string | null;
        form_data?: Record<string, any>;
        form?: {
            id: string;
            slug: string;
            title: string;
            steps: FormStep[];
        } | null;
    } | null;
    committee: {
        id: string;
        name: string;
        description: string;
        role: 'manager' | 'member';
        can_write: boolean;
        topic: {
            title: string;
            description: string;
        } | null;
        admin?: {
            full_name: string;
            profile_picture_url?: string | null;
        };
    } | null;
}

// Alias for backward compatibility and semantic usage in Dashboard components
export type DashboardData = ProfileData;

export interface ParticipantDashboardProps {
    user: {
        name?: string | null;
        email?: string | null;
    };
}

// System Settings Type
export interface SystemSettings {
    term_name: string;
    contact_email: string;
    location: string;
    event_start_date: string | null;
    event_end_date: string | null;
    bank_name: string;
    bank_account_holder: string;
    bank_iban: string;
}

export interface CommitteeInfo {
    id: string;
    name: string;
}

export interface EditorMember {
    id: string;
    userId: string;
    full_name: string;
    email: string;
    role: string;
    can_edit: boolean;
}