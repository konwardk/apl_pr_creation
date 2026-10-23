import type { User } from './index';

export interface PurchasingGroup {
    id: number;
    code: string;
    name: string;
    description?: string | null;
    email?: string | null;
    phone_number?: string | null;
    is_active: boolean;
    sap_source?: string | null;
    is_synced?: boolean;
    synced_at?: string | null;
    raw_data?: any;
    created_by?: number | null;
    creator?: Partial<User> | null;
    created_at?: string;
    updated_at?: string;
}

export interface StagedSapPurchasingGroup {
    code: string;
    name: string;
    description?: string;
    PurchasingGroup?: string;
    PurchasingGroupName?: string;
    extra?: string;
    sap_source: string;
    raw_data?: any;
    is_in_database: boolean;
    db_id?: number;
    is_active?: boolean;
    sync_status: string;
}

export interface SapPurchasingGroupFetchResponse {
    success: boolean;
    is_live: boolean;
    status: number;
    source: string;
    endpoint: string;
    count: number;
    items: StagedSapPurchasingGroup[];
    message: string;
    latency_ms?: number;
    error_details?: string;
}
