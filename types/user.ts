export interface User {
    id: string; // UUID
    full_name: string;
    email: string;
    role: string;
    created_at: string;
    user_details?: {
        school_name?: string;
        phone_number?: string;
        birth_date?: string;
    } | null;
}
