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

export interface Application {
    id: string;
    status: "pending" | "approved" | "rejected";
    submitted_at: string;
    review_notes?: string;
    user: {
        id: string;
        full_name: string;
        email: string;
        user_details: {
            phone_number: string;
            school_name: string;
            birth_date: string;
            additional_info: any;
        } | {
            phone_number: string;
            school_name: string;
            birth_date: string;
            additional_info: any;
        }[];
        committee_members?: {
            id: string;
            committee: {
                id: string;
                name: string;
            }
        }[] | null;
    };
}
// Change Log:
// - Updated `Committee` interface to allow `topic` to be either an object or an array of objects, matching the actual API response.