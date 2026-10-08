export interface HeaderOption {
    id: number;
    code: string;
    name: string;
    description?: string | null;
    is_active: boolean;
    created_by?: number | null;
    creator?: {
        id: number;
        name: string;
        email: string;
    } | null;
    created_at?: string;
    updated_at?: string;
}
