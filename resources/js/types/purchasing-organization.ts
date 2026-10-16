import type { User } from './index';

export interface PurchasingOrganization {
    id: number;
    code: string;
    name: string;
    company_code?: string | null;
    plants?: string[] | null;
    description?: string | null;
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

export interface StagedSapPurchasingOrganization {
    code: string;
    name: string;
    company_code?: string;
    plants?: string[];
    description?: string;
    sap_source: string;
    raw_data?: any;
    is_in_database: boolean;
    db_id?: number;
    is_active?: boolean;
    sync_status: string;
}

export interface SapPurchasingOrgFetchResponse {
    success: boolean;
    is_live: boolean;
    status: number;
    source: string;
    endpoint: string;
    count: number;
    items: StagedSapPurchasingOrganization[];
    message: string;
    latency_ms?: number;
    error_details?: string;
}
