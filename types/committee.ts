export interface CommitteeData {
    committee: {
        id: string; // UUID
        name: string;
        description: string;
    };
    topic: {
        title: string;
        description: string;
    } | null;
    can_write: boolean;
}

export interface CommitteeMember {
    id: string;
    userId: string;
    full_name: string;
    email: string;
    role: string;
    can_edit: boolean;
}

export interface CommitteeAdmin {
    id: string;
    full_name: string;
    email: string;
}
