export interface Announcement {
    id: string;
    title: string;
    content: string;
    created_at: string;
    is_public: boolean;
    // Changed from single ID to array
    committee_ids?: string[] | null; 
    target_user_ids?: string[] | null;
    author?: {
        full_name: string;
    };
    // Helper arrays for display (Backend needs to populate these if needed, 
    // strictly speaking Supabase join on arrays is complex, often handled in app logic or view)
    committees_list?: { name: string }[]; 
    target_user_count?: number; 
}