export interface ProfileData {
    user: {
        id: string;
        full_name: string;
        email: string;
        role: string;
        created_at: string;
        updated_at: string;
    };
    userDetails: {
        id: string;
        birth_date: string;
        phone_number: string;
        school_name: string;
        profile_picture_url?: string | null;
        is_profile_picture_hidden?: boolean; // Added
        additional_info: {
            grade?: string;
            city?: string;
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
        };
    } | null;
    application: {
        id: string;
        status: string;
        submitted_at: string;
        review_notes: string | null;
    } | null;
    committeeMember: {
        can_write: boolean;
        committee: {
            id: string;
            name: string;
            description: string;
            admin_id: string;
        };
    } | null;
    topic: {
        title: string;
        description: string;
    } | null;
    settings?: {
        term_name: string;
        location: string;
        event_start_date: string | null;
        event_end_date: string | null;
        contact_email: string;
    } | null;
}

export interface ParticipantDashboardProps {
    user: {
        name?: string | null;
        email?: string | null;
    };
}

export interface DashboardData {
    application: {
        id: string; // UUID
        status: "pending" | "approved" | "rejected";
        submitted_at: string;
        review_notes?: string;
    } | null;
    committeeMember: {
        committee: {
            name: string;
            description?: string;
        };
    } | null;
    topic: {
        title: string;
        description?: string;
    } | null;
    settings?: {
        term_name: string;
        location: string;
        event_start_date: string | null;
        event_end_date: string | null;
        contact_email: string;
    } | null;
}

export interface CommitteeInfo {
    id: string; // UUID
    name: string;
}

export interface EditorMember {
    id: string; // UUID
    userId: string; // UUID
    full_name: string;
    email: string;
    role: string;
    can_edit: boolean;
}