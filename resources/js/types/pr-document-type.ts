import type { User } from './index';

export interface PrDocumentType {
    id: number;
    code: string;
    name: string;
    description?: string | null;
    category?: string | null;
    is_active: boolean;
    sap_source: string;
    is_synced: boolean;
    synced_at?: string | null;
    raw_data?: any;
    created_by?: number | null;
    created_at?: string;
    updated_at?: string;
    creator?: Partial<User> | null;
}

export interface StagedSapPrDocumentType {
    code: string;
    name: string;
    description?: string;
    category?: string;
    sap_source: string;
    raw_data?: any;
    is_in_database: boolean;
    db_id?: number;
    is_active?: boolean;
    sync_status: string;
}

export interface SapCdsFetchResponse {
    success: boolean;
    is_live: boolean;
    status: number;
    source: string;
    endpoint: string;
    count: number;
    items: StagedSapPrDocumentType[];
    message: string;
    latency_ms?: number;
    error_details?: string;
}
