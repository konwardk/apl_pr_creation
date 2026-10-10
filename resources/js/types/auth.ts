export type Role = {
    id: number;
    name: 'superadmin' | 'admin' | 'employee' | string;
    display_name: string;
    description?: string | null;
};

export type Department = {
    id: number;
    code: string;
    name: string;
    description?: string | null;
    head_of_department?: string | null;
    is_active: boolean;
    users_count?: number;
    created_at?: string;
    updated_at?: string;
};

export type User = {
    id: number;
    name: string;
    email: string;
    role_id?: number | null;
    department_id?: number | null;
    employee_id?: string | null;
    designation?: string | null;
    phone?: string | null;
    plant?: string | null;
    is_active?: boolean;
    role?: Role | null;
    department?: Department | null;
    is_superadmin?: boolean;
    is_admin?: boolean;
    is_employee?: boolean;
    avatar?: string;
    email_verified_at: string | null;
    two_factor_enabled?: boolean;
    created_at: string;
    updated_at: string;
    [key: string]: unknown;
};

export type Auth = {
    user: User;
};

export type Passkey = {
    id: number;
    name: string;
    authenticator: string | null;
    created_at_diff: string;
    last_used_at_diff: string | null;
};

export type TwoFactorSetupData = {
    svg: string;
    url: string;
};

export type TwoFactorSecretKey = {
    secretKey: string;
};
