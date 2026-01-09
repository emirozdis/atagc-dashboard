export interface CommitteeMember {
    id: string;
    userId: string;
    full_name: string;
    email: string;
    role: string;
    can_edit: boolean;
}

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
    // Added missing fields to match API response
    committeeMembers?: CommitteeMember[];
    recentRollCalls?: {
        id: string;
        session_name: string;
        created_at: string;
    }[];
}

export interface PaginatedRollCallHistory {
    data: {
        id: string;
        session_name: string;
        created_at: string;
        attendance_count: number;
        total_members: number;
        attendance_rate: number;
    }[];
    meta: {
        page: number;
        limit: number;
        totalCount: number;
        totalPages: number;
    };
}

export interface CommitteeAdmin {
    id: string;
    full_name: string;
    email: string;
}
// Change Log:
// - Added `committeeMembers` and `recentRollCalls` to `CommitteeData` interface to match the API response from `/api/participant/me`.
// - Defined explicit `CommitteeMember` type for better type safety.