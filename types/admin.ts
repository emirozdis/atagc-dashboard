export interface Committee {
    id: string; // UUID
    name: string;
    description: string;
    admin_id?: string | null;
    topic?: {
        id: string;
        title: string;
        description: string;
    } | {
        id: string;
        title: string;
        description: string;
    }[];
}

type DelegationLeaderData = {
    full_name?: string;
    application?: { id: string; status: string }[] | { id: string; status: string } | null;
};

type DelegationLike = {
    id: number;
    name: string;
    /** Authoritative link to the leader's application (new backend field). */
    application_id?: string | null;
    leader?: DelegationLeaderData | DelegationLeaderData[] | null;
};

type DelegationMemberData = {
    accepted: boolean | null;
    delegation: DelegationLike | DelegationLike[] | null;
};

type AdminAdditionalInfo = {
    manual_school_name?: string;
    [key: string]: unknown;
};

export interface Application {
    id: string;
    status: "pending" | "under_review" | "accepted" | "approved" | "rejected" | "withdrawn";
    submitted_at: string;
    review_notes?: string;
    application_type?: string;
    form_snapshot?: { title?: string; description?: string; fee?: number; questions?: { id: string; label: string }[] };
    form_data?: Record<string, unknown>;
    form?: {
        id: string;
        title: string;
        slug: string;
        steps: {
            id: string;
            title: string;
            fields: {
                id: string;
                label: string;
                type: string;
                required?: boolean;
                options?: unknown[];
            }[];
        }[];
        questions?: { id: string; label: string }[];
    } | {
        id: string;
        title: string;
        slug: string;
        steps: {
            id: string;
            title: string;
            fields: {
                id: string;
                label: string;
                type: string;
                required?: boolean;
                options?: unknown[];
            }[];
        }[];
        questions?: { id: string; label: string }[];
    }[];
    user: {
        id: string;
        full_name: string;
        email: string;
        role: string;
        user_details: {
            phone_number: string;
            school?: string;
            school_name: string;
            birth_date: string;
            city: string;
            grade: string;
            profile_picture_url?: string | null;
            additional_info: AdminAdditionalInfo;
            high_schools?: { school_name: string };
        } | {
            phone_number: string;
            school?: string;
            school_name: string;
            birth_date: string;
            city: string;
            grade: string;
            profile_picture_url?: string | null;
            additional_info: AdminAdditionalInfo;
            high_schools?: { school_name: string };
        }[];
        committee_members?: {
            id: string;
            committee: {
                id: string;
                name: string;
            }
        }[] | {
            id: string;
            committee: {
                id: string;
                name: string;
            }
        } | null;
        delegation_members?: DelegationMemberData[] | DelegationMemberData | null;
        owned_delegation?: DelegationLike[] | DelegationLike | null;
        /** Newest-first array of delegations owned by the applicant. */
        owned_delegations?: DelegationLike[] | null;
    };
}
