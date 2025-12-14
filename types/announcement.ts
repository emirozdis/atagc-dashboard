export interface Announcement {
    id: string; // UUID
    title: string;
    content: string;
    created_at: string;
    author?: {
        full_name: string;
    };
}
