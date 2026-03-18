export interface PhotoArea {
    id: string;
    name: string;
    created_at: string;
}

export interface PressPhoto {
    id: string;
    area_id: string;
    storage_path: string;
    file_type: string;
    uploaded_by: string;
    caption: string | null;
    created_at: string;
    area?: PhotoArea | null;
    uploader?: { id: string; full_name: string } | null;
    signed_url?: string | null;
}
