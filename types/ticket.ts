export type TicketStatus = 'submitted' | 'reviewing' | 'answered' | 'closed';
export type TicketCategory = 'general' | 'person_report' | 'dashboard' | 'other';

export interface Ticket {
    id: string;
    user_id?: string | null;
    is_anonymous: boolean;
    access_token?: string;
    category: TicketCategory;
    subject: string;
    status: TicketStatus;
    created_at: string;
    updated_at: string;
    user?: {
        full_name: string;
        email: string;
    } | null;
    messages?: TicketMessage[];
}

export interface TicketMessage {
    id: string;
    ticket_id: string;
    sender_id?: string | null;
    is_staff_reply: boolean;
    message: string;
    attachments: string[] | null;
    created_at: string;
    sender?: {
        full_name: string;
        role: string;
    } | null;
}

export const TICKET_CATEGORIES: { value: TicketCategory; label: string }[] = [
    { value: 'general', label: 'Genel' },
    { value: 'person_report', label: 'Kişi Bildirimi' },
    { value: 'dashboard', label: 'Panel / Sistem' },
    { value: 'other', label: 'Diğer' },
];

export const TICKET_STATUSES: { value: TicketStatus; label: string; color: string }[] = [
    { value: 'submitted', label: 'Gönderildi', color: 'bg-blue-500/10 text-blue-600 border-blue-500/20' },
    { value: 'reviewing', label: 'İnceleniyor', color: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20' },
    { value: 'answered', label: 'Yanıtlandı', color: 'bg-green-500/10 text-green-600 border-green-500/20' },
    { value: 'closed', label: 'Kapatıldı', color: 'bg-secondary text-muted-foreground border-border' },
];
