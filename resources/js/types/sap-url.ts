import type { User } from './auth';

export interface SapUrl {
    id: number;
    environment_name: string;
    url: string;
    username?: string | null;
    password?: string | null;
    description: string | null;
    is_active: boolean;
    created_by: number | null;
    updated_by: number | null;
    creator?: User | null;
    updater?: User | null;
    created_at: string;
    updated_at: string;
}
