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

type DelegationMemberData = {
    accepted: boolean | null;
    delegation: {
        id: number;
        name: string;
        leader: {
            full_name: string;
            application?: { id: string; status: string }[] | { id: string; status: string };
        } | {
            full_name: string;
            application?: { id: string; status: string }[] | { id: string; status: string };
        }[];
    };
};

export interface Application {
    id: string;
    status: "pending" | "approved" | "rejected";
    submitted_at: string;
    review_notes?: string;
    form_data?: Record<string, any>;
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
                options?: any[];
            }[];
        }[];
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
                options?: any[];
            }[];
        }[];
    }[];
    user: {
        id: string;
        full_name: string;
        email: string;
        role: string;
        user_details: {
            phone_number: string;
            school_name: string;
            birth_date: string;
            city: string;
            grade: string;
            profile_picture_url?: string | null;
            additional_info: any;
            high_schools?: { school_name: string };
        } | {
            phone_number: string;
            school_name: string;
            birth_date: string;
            city: string;
            grade: string;
            profile_picture_url?: string | null;
            additional_info: any;
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
        owned_delegation?: { id: number; name: string }[] | { id: number; name: string } | null;
    };
}